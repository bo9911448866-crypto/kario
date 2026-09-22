import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;
const SERVER_START_TIME = Date.now();

app.use(express.json({ limit: "50mb" }));

// Email sender configuration - securely stored server-side
const SENDER_EMAIL = "kaironotescompany@gmail.com";
// Google App Password provided by account owner: fpom tdfm lifm vfty
const SENDER_PASS = "fpomtdfmlifmvfty";

function createTransporter() {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: SENDER_EMAIL,
      pass: SENDER_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });

  return { transporter, senderEmail: SENDER_EMAIL };
}

function parseEmailError(err: any): { message: string; isBadCredentials: boolean } {
  const msg = String(err?.message || "");
  const code = String(err?.responseCode || err?.code || "");
  const isBadCredentials =
    msg.includes("535") ||
    msg.includes("BadCredentials") ||
    msg.includes("Username and Password not accepted") ||
    code === "535" ||
    msg.toLowerCase().includes("invalid login");

  if (isBadCredentials) {
    return {
      message:
        "Google SMTP rejected login (535 Bad Credentials). Gmail requires a 16-character Google App Password (not your normal account password) generated at myaccount.google.com/apppasswords. Please enter your 16-character App Password in Settings > Email Delivery, or use 'Open in Email Client'.",
      isBadCredentials: true,
    };
  }

  return {
    message: err?.message || "Failed to deliver email through SMTP server.",
    isBadCredentials: false,
  };
}

// Cloud Accounts Storage Layer
interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  notes: any[];
  classes: any[];
  settings?: any;
  role?: 'owner' | 'admin' | 'vip' | 'user';
  status?: 'active' | 'suspended';
}

const ACCOUNTS_FILE = path.join(process.cwd(), "cloud_accounts.json");
let usersDatabase: Record<string, StoredUser> = {};
const activeTokens = new Map<string, string>(); // token -> userId

function loadAccounts() {
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const raw = fs.readFileSync(ACCOUNTS_FILE, "utf-8");
      usersDatabase = JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Failed to load cloud accounts file, starting fresh:", err);
  }
}

function saveAccounts() {
  try {
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(usersDatabase, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist cloud accounts file:", err);
  }
}

loadAccounts();

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, s, 1000, 64, "sha512").toString("hex");
  return { hash, salt: s };
}

function getUserFromReq(req: express.Request): StoredUser | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  const userId = activeTokens.get(token);
  if (!userId) return null;
  return usersDatabase[userId] || null;
}

// Helper to get Gemini client
function getGeminiClient(customApiKey?: string) {
  const apiKey = customApiKey?.trim() || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Clean markdown fence blocks from JSON response
function cleanJsonResponse(text: string): string {
  let clean = text.trim();
  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return clean.trim();
}

// Extract human-readable error info from Gemini ApiError
function parseGeminiError(error: any): { statusCode: number; message: string; isHighDemand: boolean } {
  let message = error?.message || "Failed to generate AI response.";
  let statusCode = error?.status || 500;
  let isHighDemand = false;

  if (typeof message === "string") {
    const trimmed = message.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed?.error) {
          if (parsed.error.code) statusCode = parsed.error.code;
          if (parsed.error.message) message = parsed.error.message;
          if (parsed.error.status === "UNAVAILABLE" || parsed.error.code === 503) {
            isHighDemand = true;
          }
        }
      } catch {
        // ignore
      }
    }
  }

  const checkStr = `${message} ${error?.statusText || ""}`.toLowerCase();
  if (
    checkStr.includes("503") ||
    checkStr.includes("high demand") ||
    checkStr.includes("unavailable") ||
    checkStr.includes("resource_exhausted") ||
    checkStr.includes("429")
  ) {
    isHighDemand = true;
    message =
      "The AI model is currently experiencing high demand. Automatic retry across backup models was attempted. Please try again in a few moments.";
    statusCode = 503;
  }

  return {
    statusCode: typeof statusCode === "number" && statusCode >= 400 && statusCode < 600 ? statusCode : 500,
    message,
    isHighDemand,
  };
}

// Helper to execute generation with automatic retry and model fallback
async function generateWithFallback(
  ai: GoogleGenAI,
  models: string[],
  requestParams: { contents: any; config?: any },
  retriesPerModel = 1
) {
  let lastError: any;

  for (const model of models) {
    for (let attempt = 0; attempt <= retriesPerModel; attempt++) {
      try {
        if (attempt > 0) {
          // Jittered backoff before re-trying same model
          await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
        }
        return await ai.models.generateContent({
          model,
          contents: requestParams.contents,
          config: requestParams.config,
        });
      } catch (err: any) {
        lastError = err;
        const errStr = String(err?.message || "");
        const isTransient =
          errStr.includes("503") ||
          errStr.includes("high demand") ||
          errStr.includes("UNAVAILABLE") ||
          errStr.includes("429");
        console.warn(`[Gemini] Model ${model} (attempt ${attempt + 1}) encountered error:`, err?.message || err);
        if (!isTransient && attempt === 0) {
          break; // Try next model immediately if it's not a transient capacity error
        }
      }
    }
  }

  throw lastError;
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Status check for Gemini API key
app.get("/api/gemini/status", (_req, res) => {
  const hasEnvKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  res.json({
    hasConfiguredKey: hasEnvKey,
    source: hasEnvKey ? "environment" : "none",
  });
});

// Summarize endpoint with fallback across models

// Note analysis endpoint (topic detection, grammar correction, class mapping)
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { text, classes } = req.body;
    const clientProvidedKey = req.headers["x-gemini-api-key"] as string | undefined;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "Note text content is required for analysis." });
    }

    const ai = getGeminiClient(clientProvidedKey);
    if (!ai) {
      return res.status(400).json({
        error: "Gemini API key is not configured.",
        missingKey: true,
      });
    }

    const classesList = Array.isArray(classes) && classes.length > 0 ? classes.map((c: any) => `ID: ${c.id} | Name: ${c.name}`).join("\n") : "None";

    const prompt = `Analyze this spoken voice note transcript.
1. Detect all key academic topics, subjects, and concepts covered.
2. Correct the grammar, punctuation, sentence structures, and formatting to make it clean, articulate, and highly readable without losing any meaning.
3. Identify what grammar, punctuation, or clarity improvements were made.
4. Generate a concise, descriptive, and accurately named academic title based on the topics.
5. Identify the best matching class ID from the provided list, or output null if it doesn't fit any existing class.

Existing Classes:
${classesList}

Transcript:
"""
${text}
"""`;

    const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"];

    const response = await generateWithFallback(ai, candidateModels, {
      contents: prompt,
      config: {
        systemInstruction: "You are an expert academic note processor. You analyze spoken notes, detect topics, fix grammar and punctuation, generate an accurate title, and assign notes to the right class.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A concise, descriptive, professional title for the note (max 6 words)." },
            cleanedTranscript: { type: Type.STRING, description: "The transcript with corrected grammar, punctuation, and clear paragraph formatting." },
            classId: { type: Type.STRING, description: "The exact ID of the best matching class from the provided list, or null if no match.", nullable: true },
            detectedTopics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 to 6 detected core topics or subject areas." },
            grammarNotes: { type: Type.STRING, description: "Brief summary of grammar, punctuation, and clarity improvements applied." }
          },
          required: ["title", "cleanedTranscript", "detectedTopics", "grammarNotes"]
        }
      }
    });

    const rawText = response.text?.trim();
    if (!rawText) return res.status(500).json({ error: "Received empty response from Gemini." });

    const cleanedJson = cleanJsonResponse(rawText);
    const parsedData = JSON.parse(cleanedJson);

    return res.json({
      success: true,
      title: parsedData.title,
      cleanedTranscript: parsedData.cleanedTranscript,
      classId: parsedData.classId || null,
      detectedTopics: Array.isArray(parsedData.detectedTopics) ? parsedData.detectedTopics : [],
      grammarNotes: parsedData.grammarNotes || "Grammar, capitalization, and punctuation polished."
    });

  } catch (err: any) {
    const errorInfo = parseGeminiError(err);
    console.error("Note Analysis API Error:", err.message || err);
    return res.status(errorInfo.statusCode).json({
      error: errorInfo.message,
      isHighDemand: errorInfo.isHighDemand,
    });
  }
});

app.post("/api/gemini/summarize", async (req, res) => {
  try {
    const { text, title, className, classes } = req.body;
    const clientProvidedKey = req.headers["x-gemini-api-key"] as string | undefined;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "Note text content is required for summarization." });
    }

    const ai = getGeminiClient(clientProvidedKey);
    if (!ai) {
      return res.status(400).json({
        error: "Gemini API key is not configured. Please provide an API key in the settings or configure GEMINI_API_KEY.",
        missingKey: true,
      });
    }

    const classesList = Array.isArray(classes) && classes.length > 0 ? classes.map((c: any) => `ID: ${c.id} | Name: ${c.name}`).join("\n") : "None";

    const prompt = `Analyze this lecture/class voice note transcript.
Note Title: ${title || "Untitled"}
Class/Category: ${className || "General"}

Transcript:
"""
${text}
"""

Available Classes (for mapping):
${classesList}

Please do the following:
1. Detect all key academic topics and concepts covered in the transcript.
2. Produce a concise, high-yield structured summary suitable for students and learners.
3. Correct the grammar, punctuation, and formatting of the transcript to make it highly readable without losing any original meaning.
4. Identify the grammar and readability improvements made.
5. Generate an accurate, descriptive title for the note based on the topics.
6. Suggest the most appropriate class ID from the provided list, or output null if it doesn't fit any existing class.`;

    const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"];

    const response = await generateWithFallback(ai, candidateModels, {
      contents: prompt,
      config: {
        systemInstruction:
          "You are an expert academic note summarizer. Create clear, factual, high-retention summaries with structured key bullet points, takeaways/action items, detected topics, and relevant subject tags. Additionally, polish grammar and punctuation, generate an accurate title, and assign to the correct class.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "A concise 2-4 sentence executive overview of the note's core ideas.",
            },
            keyPoints: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: "Essential bullet points, formulas, definitions, or main concepts covered.",
            },
            actionItems: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: "Recommended next steps, homework/exam topics to review, or questions to investigate.",
            },
            tags: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: "3 to 6 high-level academic keywords or topical tags.",
            },
            detectedTopics: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: "3 to 5 core topics identified in the material.",
            },
            grammarNotes: {
              type: Type.STRING,
              description: "Brief note explaining what grammar, spelling, or punctuation corrections were applied.",
            },
            title: {
              type: Type.STRING,
              description: "A concise, descriptive title for the note (max 6 words)."
            },
            cleanedTranscript: {
              type: Type.STRING,
              description: "The original transcript with corrected grammar, punctuation, and clear paragraph formatting."
            },
            classId: {
              type: Type.STRING,
              description: "The exact ID of the best matching class from the provided list, or null if no match.",
              nullable: true
            }
          },
          required: ["summary", "keyPoints", "actionItems", "tags", "title", "cleanedTranscript"],
        },
      },
    });

    const rawText = response.text?.trim();
    if (!rawText) {
      return res.status(500).json({ error: "Received empty response from Gemini." });
    }

    const cleanedJson = cleanJsonResponse(rawText);
    let parsedData;
    try {
      parsedData = JSON.parse(cleanedJson);
    } catch {
      parsedData = {
        summary: "Could not parse AI response. " + rawText,
        keyPoints: [],
        actionItems: [],
        tags: ["Error"],
        detectedTopics: [],
        grammarNotes: "",
        title: title || "Untitled Note",
        cleanedTranscript: text,
        classId: null
      };
    }

    return res.json({ data: parsedData });
  } catch (err: any) {
    const errorInfo = parseGeminiError(err);
    console.error("Summarize API Error:", err.message || err);
    return res.status(errorInfo.statusCode).json({
      error: errorInfo.message,
      isHighDemand: errorInfo.isHighDemand,
    });
  }
});

app.post("/api/gemini/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/webm" } = req.body;
    const clientProvidedKey = req.headers["x-gemini-api-key"] as string | undefined;

    if (!audioBase64 || typeof audioBase64 !== "string") {
      return res.status(400).json({ error: "audioBase64 string is required." });
    }

    const ai = getGeminiClient(clientProvidedKey);
    if (!ai) {
      return res.status(400).json({
        error: "Gemini API key is not configured.",
        missingKey: true,
      });
    }

    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "");
    const candidateTranscribeModels = [
      "gemini-3.5-transcribe",
      "gemini-3.8-flash",
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash",
    ];

    const response = await generateWithFallback(ai, candidateTranscribeModels, {
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          {
            text: "Please accurately transcribe this audio recording into clean, punctuation-complete spoken text. Do not add intro or outro commentary.",
          },
        ],
      },
    });

    const transcript = response.text?.trim() || "";
    return res.json({
      success: true,
      transcript,
    });
  } catch (error: any) {
    console.error("Gemini transcribe error:", error);
    const parsed = parseGeminiError(error);
    return res.status(parsed.statusCode).json({
      error: parsed.message,
      isHighDemand: parsed.isHighDemand,
    });
  }
});

// Test custom Gemini API Key
app.post("/api/gemini/test-key", async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 5) {
      return res.status(400).json({ error: "Please provide a valid Gemini API key to test." });
    }

    const testAi = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const testResp = await testAi.models.generateContent({
      model: "gemini-3.8-flash",
      contents: "Reply with 'ok'",
    });

    if (testResp && testResp.text) {
      return res.json({ success: true, message: "Gemini API key is verified and operational!" });
    } else {
      return res.status(500).json({ error: "Empty test response from Gemini." });
    }
  } catch (err: any) {
    console.error("Test Gemini key error:", err);
    return res.status(400).json({
      error: err?.message || "Invalid API key or network authorization failure.",
    });
  }
});

// ==========================================
// Cloud Authentication & Sync Endpoints
// ==========================================

// Register a new cloud account
app.post("/api/auth/register", (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "A valid email address is required." });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = Object.values(usersDatabase).find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email address already exists. Please sign in." });
    }

    const userId = "user_" + crypto.randomBytes(8).toString("hex");
    const { hash, salt } = hashPassword(password);
    const displayName = (name && typeof name === "string" && name.trim()) || normalizedEmail.split("@")[0];

    const newUser: StoredUser = {
      id: userId,
      email: normalizedEmail,
      name: displayName,
      passwordHash: hash,
      salt,
      createdAt: new Date().toISOString(),
      notes: [],
      classes: [],
      settings: {},
    };

    usersDatabase[userId] = newUser;
    saveAccounts();

    const token = "kairo_tok_" + crypto.randomBytes(24).toString("hex");
    activeTokens.set(token, userId);

    return res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        createdAt: newUser.createdAt,
      },
      message: "Account created successfully! Cloud sync is now active.",
    });
  } catch (err: any) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Failed to create account. Please try again." });
  }
});

// Sign in to an existing cloud account
app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = Object.values(usersDatabase).find(
      (u) => u.email.toLowerCase() === normalizedEmail
    );

    if (!user) {
      return res.status(401).json({ error: "No account found with this email. Please check your credentials or create an account." });
    }

    const checkHash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, "sha512").toString("hex");
    if (checkHash !== user.passwordHash) {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

    const token = "kairo_tok_" + crypto.randomBytes(24).toString("hex");
    activeTokens.set(token, user.id);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      data: {
        notes: user.notes || [],
        classes: user.classes || [],
        settings: user.settings || {},
      },
      message: "Welcome back! Synced with cloud account.",
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Sign in failed. Please try again." });
  }
});

// Get current authenticated user profile
app.get("/api/auth/me", (req, res) => {
  const user = getUserFromReq(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated or session expired." });
  }

  return res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
    cloudStats: {
      notesCount: (user.notes || []).length,
      classesCount: (user.classes || []).length,
    },
  });
});

// Logout endpoint
app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    activeTokens.delete(token);
  }
  return res.json({ success: true, message: "Signed out successfully." });
});

// Synchronize notes, classes, and settings with the cloud
app.post("/api/cloud/sync", (req, res) => {
  try {
    const user = getUserFromReq(req);
    if (!user) {
      return res.status(401).json({ error: "Sign in to synchronize your notes with the cloud." });
    }

    const { notes, classes, settings } = req.body;

    if (Array.isArray(notes)) {
      user.notes = notes;
    }
    if (Array.isArray(classes)) {
      user.classes = classes;
    }
    if (settings && typeof settings === "object") {
      user.settings = { ...(user.settings || {}), ...settings };
    }

    saveAccounts();

    return res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      notesCount: (user.notes || []).length,
      classesCount: (user.classes || []).length,
      message: "All notes and classes synchronized to the cloud.",
    });
  } catch (err: any) {
    console.error("Sync error:", err);
    return res.status(500).json({ error: "Cloud sync failed." });
  }
});

// ==========================================
// Email Delivery Endpoints (nodemailer)
// ==========================================

function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Send test email to verify delivery
app.post("/api/email/test", async (req, res) => {
  try {
    const { toEmail } = req.body;
    if (!toEmail || typeof toEmail !== "string" || !toEmail.includes("@")) {
      return res.status(400).json({ error: "Please provide a valid recipient email address." });
    }

    const { transporter, senderEmail: activeSender } = createTransporter();

    const mailOptions = {
      from: `"Kairo Voice Notes" <${activeSender}>`,
      to: toEmail.trim(),
      subject: "✨ Kairo AI Study Notes - Test Connection Successful",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #3b0764 0%, #7e22ce 50%, #9333ea 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
            <div style="display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.15); border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #f3e8ff; margin-bottom: 12px;">
              Email Delivery Connected
            </div>
            <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">Kairo AI Lecture Notes</h1>
            <p style="margin: 0; font-size: 14px; color: #f3e8ff; opacity: 0.9;">Automated academic lecture transcription & study summaries</p>
          </div>
          <div style="padding: 28px 24px;">
            <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Your email delivery is working!</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px;">
              This test confirms that your notes, study summaries, and transcripts will be delivered directly from <strong>${activeSender}</strong> to <strong>${toEmail.trim()}</strong>.
            </p>
            <div style="background: #f8fafc; border-left: 4px solid #9333ea; padding: 14px 16px; border-radius: 8px; margin-bottom: 20px;">
              <div style="font-size: 13px; font-weight: 600; color: #1e293b; margin-bottom: 4px;">Delivery Settings:</div>
              <div style="font-size: 13px; color: #64748b;">
                &bull; Sender: <strong>${activeSender}</strong><br />
                &bull; Recipient: <strong>${toEmail.trim()}</strong><br />
                &bull; Timestamp: <strong>${new Date().toLocaleString()}</strong>
              </div>
            </div>
            <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0;">
              Whenever you record lectures or click &ldquo;Email Note&rdquo; in Kairo, full academic summaries, key points, action items, and transcripts will arrive directly in your inbox.
            </p>
          </div>
          <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
            Sent by Kairo AI Voice Notes &bull; <a href="mailto:${activeSender}" style="color: #9333ea; text-decoration: none;">${activeSender}</a>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      message: `Test email sent successfully to ${toEmail.trim()} from ${activeSender}!`,
    });
  } catch (err: any) {
    console.error("Send test email error:", err);
    const parsed = parseEmailError(err);
    return res.status(parsed.isBadCredentials ? 401 : 500).json({
      success: false,
      error: parsed.message,
      isBadCredentials: parsed.isBadCredentials,
      details: err?.message,
    });
  }
});

// Send complete study note via email
app.post("/api/email/send-note", async (req, res) => {
  try {
    const { toEmail, note, className } = req.body;
    if (!toEmail || typeof toEmail !== "string" || !toEmail.includes("@")) {
      return res.status(400).json({ error: "A valid recipient email address is required." });
    }
    if (!note || !note.title || !note.transcript) {
      return res.status(400).json({ error: "Note data with title and transcript is required." });
    }

    const { transporter, senderEmail: activeSender } = createTransporter();

    // Format AI summary sections into clean HTML
    let summaryHtml = "";
    if (note.summary) {
      const { summary, keyPoints = [], actionItems = [], tags = [] } = note.summary;

      const keyPointsHtml = keyPoints.length > 0
        ? `<div style="margin-top: 18px;">
            <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #4338ca; margin-bottom: 8px;">Key Takeaways & Core Concepts</div>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #1e293b;">
              ${keyPoints.map((p: string) => `<li style="margin-bottom: 6px;">${escapeHtml(p)}</li>`).join("")}
            </ul>
          </div>`
        : "";

      const actionItemsHtml = actionItems.length > 0
        ? `<div style="margin-top: 18px;">
            <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #059669; margin-bottom: 8px;">Action Items & Study Follow-Ups</div>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #1e293b;">
              ${actionItems.map((a: string) => `<li style="margin-bottom: 6px;">${escapeHtml(a)}</li>`).join("")}
            </ul>
          </div>`
        : "";

      const tagsHtml = tags.length > 0
        ? `<div style="margin-top: 16px; display: flex; flex-wrap: wrap; gap: 6px;">
            ${tags.map((t: string) => `<span style="display: inline-block; background: #ede9fe; color: #6d28d9; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; margin-right: 6px; margin-bottom: 6px;">#${escapeHtml(t)}</span>`).join("")}
          </div>`
        : "";

      summaryHtml = `
        <div style="background: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #7e22ce; margin-bottom: 8px;">
            ✨ AI Executive Summary
          </div>
          <p style="font-size: 14px; line-height: 1.6; color: #1e1b4b; margin: 0 0 12px 0;">
            ${escapeHtml(summary)}
          </p>
          ${keyPointsHtml}
          ${actionItemsHtml}
          ${tagsHtml}
        </div>
      `;
    }

    const mailOptions = {
      from: `"Kairo Voice Notes" <${activeSender}>`,
      to: toEmail.trim(),
      subject: `📝 [Kairo Note] ${note.title} (${className || "General"})`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <!-- Header Banner -->
          <div style="background: linear-gradient(135deg, #3b0764 0%, #6b21a8 50%, #7e22ce 100%); padding: 28px 24px; color: #ffffff;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #f3e8ff;">
                ${escapeHtml(className || "General")}
              </span>
              <span style="font-size: 12px; color: #e9d5ff; opacity: 0.85;">
                ${new Date(note.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.3;">
              ${escapeHtml(note.title)}
            </h1>
          </div>

          <!-- Body -->
          <div style="padding: 24px;">
            ${summaryHtml}

            <!-- Spoken Transcript -->
            <div>
              <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 8px;">
                Full Audio Transcript
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-size: 13px; line-height: 1.6; color: #334155; white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">${escapeHtml(note.transcript)}</div>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
            Sent by <strong>Kairo AI Voice Notes</strong> &bull; From: <a href="mailto:${activeSender}" style="color: #7e22ce; text-decoration: none;">${activeSender}</a>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.json({
      success: true,
      message: `Note "${note.title}" sent successfully to ${toEmail.trim()}!`,
    });
  } catch (err: any) {
    console.error("Send note email error:", err);
    const parsed = parseEmailError(err);
    return res.status(parsed.isBadCredentials ? 401 : 500).json({
      success: false,
      error: parsed.message,
      isBadCredentials: parsed.isBadCredentials,
      details: err?.message,
    });
  }
});

// ==========================================
// Platform State: Announcements & Maintenance
// ==========================================

let platformAnnouncement = {
  id: "announcement_1",
  message: "Welcome to Kairo Voice Notes OS! High-fidelity AI transcription and live soundscapes are active.",
  type: "info" as "info" | "warning" | "alert" | "success",
  active: false,
  updatedAt: new Date().toISOString(),
  createdBy: "admin",
};

let maintenanceMode = {
  enabled: false,
  message: "Kairo OS is temporarily undergoing scheduled cloud maintenance. Notes will resume momentarily!",
};

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  actor: string;
}

const auditLogs: AuditEntry[] = [
  {
    id: "boot",
    timestamp: new Date().toISOString(),
    action: "SERVER_INITIALIZED",
    details: "Kairo OS Server and Cloud Accounts engine booted on port 3000.",
    actor: "System",
  },
];

function logAuditEvent(action: string, details: string, actor: string = "Admin") {
  auditLogs.unshift({
    id: "log_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toISOString(),
    action,
    details,
    actor,
  });
  if (auditLogs.length > 200) auditLogs.pop();
}

// Public Platform Status (Announcements & Maintenance)
app.get("/api/platform/status", (_req, res) => {
  res.json({
    announcement: platformAnnouncement,
    maintenance: maintenanceMode,
  });
});

// ==========================================
// Secret Admin & Owner Dashboard Endpoints
// ==========================================

// Primary Admin password: Kairo820
const VALID_ADMIN_KEYS = new Set([
  "kairo820",
  "kairo-admin-2026",
  "kaironotescompany",
  "kairo2026",
  "kairo-master-key",
  (process.env.ADMIN_KEY || "Kairo820").trim().toLowerCase(),
]);

// Secret Owner code: Gizmo820
const VALID_OWNER_KEYS = new Set([
  "gizmo820",
  (process.env.OWNER_KEY || "Gizmo820").trim().toLowerCase(),
]);

function extractKey(req: express.Request, names: string[]): string {
  for (const name of names) {
    const headerVal = req.headers[name.toLowerCase()];
    if (typeof headerVal === "string" && headerVal.trim()) return headerVal.trim().toLowerCase();
    const queryVal = req.query[name];
    if (typeof queryVal === "string" && queryVal.trim()) return queryVal.trim().toLowerCase();
    const bodyVal = req.body?.[name];
    if (typeof bodyVal === "string" && bodyVal.trim()) return bodyVal.trim().toLowerCase();
  }
  return "";
}

function isAuthorizedOwner(req: express.Request): boolean {
  const provided = extractKey(req, ["x-owner-key", "x-owner-code", "ownerKey", "ownerCode", "x-admin-key", "key"]);
  return Boolean(provided && VALID_OWNER_KEYS.has(provided));
}

function isAuthorizedAdmin(req: express.Request): boolean {
  if (isAuthorizedOwner(req)) return true;
  const provided = extractKey(req, ["x-admin-key", "x-owner-key", "x-owner-code", "key", "adminKey"]);
  return Boolean(provided && (VALID_ADMIN_KEYS.has(provided) || VALID_OWNER_KEYS.has(provided)));
}

// Verify Admin / Owner Passkey
app.post("/api/admin/verify", (req, res) => {
  if (isAuthorizedOwner(req)) {
    logAuditEvent("OWNER_AUTH", "Owner authorized directly via passcode verification.", "Owner");
    return res.json({
      success: true,
      isOwner: true,
      role: "owner",
      message: "👑 Welcome Supreme Owner! Master root privileges granted.",
    });
  }

  if (isAuthorizedAdmin(req)) {
    logAuditEvent("ADMIN_AUTH", "Administrator authorized via passkey verification.", "Admin");
    return res.json({
      success: true,
      isOwner: false,
      role: "admin",
      message: "Admin credentials verified successfully.",
    });
  }

  logAuditEvent("AUTH_FAILED", "Invalid passkey attempt rejected.", "Unknown");
  return res.status(401).json({
    success: false,
    error: "Invalid Admin Passkey. Access denied.",
  });
});

// Elevate existing admin session to Owner using code Gizmo820
app.post("/api/admin/elevate-owner", (req, res) => {
  const { ownerCode } = req.body || {};
  const code = (typeof ownerCode === "string" ? ownerCode : "").trim().toLowerCase();

  if (VALID_OWNER_KEYS.has(code)) {
    logAuditEvent("OWNER_ELEVATION", "Administrator successfully elevated to Owner Mode.", "Owner");
    return res.json({
      success: true,
      isOwner: true,
      role: "owner",
      message: "👑 Access Elevated: Welcome to the Supreme Owner Console!",
    });
  }

  logAuditEvent("ELEVATION_FAILED", `Failed elevation attempt with code: ${String(ownerCode).slice(0, 10)}`, "Admin");
  return res.status(403).json({
    success: false,
    error: "Incorrect Owner Code. Hint: Secret code required.",
  });
});

// Fetch full platform data (accounts, emails, notes, classes, settings, metrics, audit logs)
app.get("/api/admin/data", (req, res) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing Admin Key." });
  }

  const isOwner = isAuthorizedOwner(req);
  loadAccounts();

  const userList = Object.values(usersDatabase);
  
  let totalNotes = 0;
  let totalClasses = 0;
  let totalWords = 0;
  let lastActive: string | undefined = undefined;

  const flattenedRecentNotes: any[] = [];

  const safeAccounts = userList.map((u) => {
    const userNotes = Array.isArray(u.notes) ? u.notes : [];
    const userClasses = Array.isArray(u.classes) ? u.classes : [];

    totalNotes += userNotes.length;
    totalClasses += userClasses.length;

    userNotes.forEach((note) => {
      if (note.transcript && typeof note.transcript === "string") {
        totalWords += note.transcript.trim().split(/\s+/).filter(Boolean).length;
      }
      flattenedRecentNotes.push({
        ...note,
        userEmail: u.email,
        userName: u.name,
        userId: u.id,
      });
    });

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      role: u.role || "user",
      status: u.status || "active",
      notesCount: userNotes.length,
      classesCount: userClasses.length,
      notes: userNotes,
      classes: userClasses,
      settings: u.settings || {},
    };
  });

  flattenedRecentNotes.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  if (flattenedRecentNotes[0]?.createdAt) {
    lastActive = flattenedRecentNotes[0].createdAt;
  }

  const uptimeSec = Math.floor((Date.now() - SERVER_START_TIME) / 1000);
  const uptimeStr = `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m ${uptimeSec % 60}s`;

  let dbSize = 0;
  try {
    if (fs.existsSync(ACCOUNTS_FILE)) {
      dbSize = fs.statSync(ACCOUNTS_FILE).size;
    }
  } catch {
    // ignore
  }

  return res.json({
    success: true,
    isOwner,
    currentRole: isOwner ? "owner" : "admin",
    stats: {
      totalAccounts: safeAccounts.length,
      totalNotes,
      totalClasses,
      totalWords,
      lastActive,
      activeSessions: activeTokens.size,
      estimatedStorageBytes: dbSize,
    },
    metrics: {
      uptime: uptimeStr,
      uptimeSeconds: uptimeSec,
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      nodeVersion: process.version,
      activeSessions: activeTokens.size,
      geminiReady: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
      smtpReady: Boolean(SENDER_EMAIL && SENDER_PASS),
      dbSizeBytes: dbSize,
    },
    accounts: safeAccounts,
    recentNotes: flattenedRecentNotes.slice(0, 150),
    announcement: platformAnnouncement,
    maintenance: maintenanceMode,
    auditLogs: auditLogs.slice(0, 60),
  });
});

// Update or toggle Global Announcement
app.post("/api/admin/announcement", (req, res) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { message, type, active } = req.body || {};
  if (typeof message === "string") platformAnnouncement.message = message;
  if (type && ["info", "warning", "alert", "success"].includes(type)) {
    platformAnnouncement.type = type;
  }
  if (typeof active === "boolean") {
    platformAnnouncement.active = active;
  }
  platformAnnouncement.updatedAt = new Date().toISOString();
  platformAnnouncement.createdBy = isAuthorizedOwner(req) ? "Owner" : "Admin";

  logAuditEvent(
    platformAnnouncement.active ? "ANNOUNCEMENT_PUBLISHED" : "ANNOUNCEMENT_DISABLED",
    `Announcement: "${platformAnnouncement.message.slice(0, 40)}..." (${platformAnnouncement.type})`,
    isAuthorizedOwner(req) ? "Owner" : "Admin"
  );

  return res.json({
    success: true,
    announcement: platformAnnouncement,
    message: platformAnnouncement.active ? "Announcement published to all users." : "Announcement deactivated.",
  });
});

// Reset user password (Admin & Owner)
app.post("/api/admin/user/reset-password", (req, res) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { userId, newPassword } = req.body || {};
  if (!userId || !usersDatabase[userId]) {
    return res.status(404).json({ error: "User account not found." });
  }

  const generated = "KairoPass" + Math.floor(1000 + Math.random() * 9000);
  const passToUse = (typeof newPassword === "string" && newPassword.trim().length >= 4) ? newPassword.trim() : generated;

  const { hash, salt } = hashPassword(passToUse);
  usersDatabase[userId].passwordHash = hash;
  usersDatabase[userId].salt = salt;
  saveAccounts();

  logAuditEvent(
    "USER_PASSWORD_RESET",
    `Password reset for user ${usersDatabase[userId].email} (${usersDatabase[userId].name}).`,
    isAuthorizedOwner(req) ? "Owner" : "Admin"
  );

  return res.json({
    success: true,
    message: `Password updated successfully! Temporary password: ${passToUse}`,
    temporaryPassword: passToUse,
  });
});

// Delete user account by ID (admin privilege)
app.delete("/api/admin/account/:id", (req, res) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing Admin Key." });
  }

  const { id } = req.params;
  if (!usersDatabase[id]) {
    return res.status(404).json({ error: "Account not found." });
  }

  const userEmail = usersDatabase[id].email;
  delete usersDatabase[id];
  saveAccounts();

  logAuditEvent("ACCOUNT_DELETED", `Permanently removed account: ${userEmail}`, isAuthorizedOwner(req) ? "Owner" : "Admin");

  return res.json({
    success: true,
    message: `Account ${userEmail} deleted permanently from cloud storage.`,
  });
});

// ==========================================
// Exclusive Owner Endpoints
// ==========================================

// Change user role and status (Owner privilege)
app.post("/api/admin/user/role", (req, res) => {
  if (!isAuthorizedOwner(req)) {
    return res.status(403).json({ error: "Owner privilege required." });
  }

  const { userId, role, status } = req.body || {};
  if (!userId || !usersDatabase[userId]) {
    return res.status(404).json({ error: "User account not found." });
  }

  const target = usersDatabase[userId];
  if (role && ["owner", "admin", "vip", "user"].includes(role)) {
    target.role = role;
  }
  if (status && ["active", "suspended"].includes(status)) {
    target.status = status;
  }
  saveAccounts();

  logAuditEvent(
    "USER_ROLE_UPDATED",
    `Updated ${target.email} to Role: ${target.role || 'user'}, Status: ${target.status || 'active'}`,
    "Owner"
  );

  return res.json({
    success: true,
    message: `Account updated to role ${target.role || 'user'} (${target.status || 'active'}).`,
    user: {
      id: target.id,
      email: target.email,
      name: target.name,
      role: target.role,
      status: target.status,
    },
  });
});

// Toggle Platform Maintenance Mode (Owner privilege)
app.post("/api/admin/maintenance", (req, res) => {
  if (!isAuthorizedOwner(req)) {
    return res.status(403).json({ error: "Owner privilege required." });
  }

  const { enabled, message } = req.body || {};
  if (typeof enabled === "boolean") maintenanceMode.enabled = enabled;
  if (typeof message === "string" && message.trim()) maintenanceMode.message = message.trim();

  logAuditEvent(
    maintenanceMode.enabled ? "MAINTENANCE_ENABLED" : "MAINTENANCE_DISABLED",
    `Maintenance Mode set to: ${maintenanceMode.enabled ? "ACTIVE (" + maintenanceMode.message + ")" : "DISABLED"}`,
    "Owner"
  );

  return res.json({
    success: true,
    maintenance: maintenanceMode,
    message: maintenanceMode.enabled ? "Emergency maintenance mode engaged." : "Platform maintenance mode disabled.",
  });
});

// Purge empty accounts with 0 notes and 0 classes (Owner privilege)
app.post("/api/admin/purge-empty", (req, res) => {
  if (!isAuthorizedOwner(req)) {
    return res.status(403).json({ error: "Owner privilege required." });
  }

  loadAccounts();
  const keys = Object.keys(usersDatabase);
  let purgedCount = 0;

  for (const key of keys) {
    const user = usersDatabase[key];
    const notesCount = (user.notes || []).length;
    const classesCount = (user.classes || []).length;
    if (notesCount === 0 && classesCount === 0) {
      delete usersDatabase[key];
      purgedCount++;
    }
  }

  if (purgedCount > 0) {
    saveAccounts();
  }

  logAuditEvent("PURGE_EMPTY_ACCOUNTS", `Cleaned ${purgedCount} unused/empty accounts.`, "Owner");

  return res.json({
    success: true,
    purgedCount,
    message: `Cleaned ${purgedCount} empty account(s) with 0 notes and 0 classes.`,
  });
});

// Inject note / study guide into any user account (Owner privilege)
app.post("/api/admin/inject-note", (req, res) => {
  if (!isAuthorizedOwner(req)) {
    return res.status(403).json({ error: "Owner privilege required." });
  }

  const { userId, title, transcript, className } = req.body || {};
  if (!userId || !usersDatabase[userId]) {
    return res.status(404).json({ error: "Target user account not found." });
  }

  const user = usersDatabase[userId];
  const newNote = {
    id: "injected_" + Date.now(),
    title: (title || "Master System Study Guide").trim(),
    transcript: (transcript || "Audio transcribed and verified by Supreme Owner.").trim(),
    classId: user.classes?.[0]?.id || "general",
    createdAt: new Date().toISOString(),
    duration: 120,
    tags: ["Owner Injected", className || "General"],
    summary: {
      summary: "This note was directly injected into your cloud account by the System Administrator.",
      keyPoints: ["System-verified transcript", "Instant cloud synchronization"],
      actionItems: ["Review injected study material"],
      suggestedQuestions: ["How can I best review this topic?"],
    },
  };

  user.notes = [newNote, ...(user.notes || [])];
  saveAccounts();

  logAuditEvent(
    "NOTE_INJECTED",
    `Injected note "${newNote.title}" into account ${user.email}`,
    "Owner"
  );

  return res.json({
    success: true,
    message: `Note "${newNote.title}" successfully injected into ${user.name}'s account!`,
    note: newNote,
  });
});

// Test Gemini AI Connectivity & Latency (Owner & Admin diagnostic tool)
app.post("/api/admin/test-ai", async (req, res) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const startTime = Date.now();
  const { model, prompt } = req.body || {};
  const selectedModel = model === "gemini-2.5-pro" ? "gemini-2.5-pro" : "gemini-2.5-flash";
  const testPrompt = prompt || "Reply with a one-sentence confirmation that the Kairo Gemini AI voice engine is healthy and operational.";

  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({
        success: false,
        error: "GEMINI_API_KEY is not configured on the server.",
      });
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: testPrompt,
    });

    const latencyMs = Date.now() - startTime;
    const replyText = response?.text || "No text returned.";

    logAuditEvent("AI_DIAGNOSTIC_TEST", `Model ${selectedModel} tested successfully (${latencyMs}ms)`, isAuthorizedOwner(req) ? "Owner" : "Admin");

    return res.json({
      success: true,
      model: selectedModel,
      latencyMs,
      reply: replyText,
    });
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    return res.status(500).json({
      success: false,
      model: selectedModel,
      latencyMs,
      error: err?.message || "AI diagnostic generation failed.",
    });
  }
});

// Export entire database backup
app.get("/api/admin/export", (req, res) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing Admin Key." });
  }

  loadAccounts();
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="kairo_backup_${new Date().toISOString().slice(0, 10)}.json"`
  );
  return res.send(JSON.stringify(usersDatabase, null, 2));
});

// Restore database from JSON backup (Owner privilege)
app.post("/api/admin/restore-database", (req, res) => {
  if (!isAuthorizedOwner(req)) {
    return res.status(403).json({ error: "Owner privilege required." });
  }

  const { backupData } = req.body || {};
  if (!backupData || typeof backupData !== "object") {
    return res.status(400).json({ error: "Invalid backup data format. Expected JSON object of accounts." });
  }

  usersDatabase = backupData;
  saveAccounts();

  logAuditEvent("DATABASE_RESTORED", `Cloud accounts restored with ${Object.keys(backupData).length} accounts.`, "Owner");

  return res.json({
    success: true,
    message: `Database successfully restored with ${Object.keys(backupData).length} user accounts.`,
    count: Object.keys(backupData).length,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
