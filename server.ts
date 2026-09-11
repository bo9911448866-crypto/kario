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
app.post("/api/gemini/summarize", async (req, res) => {
  try {
    const { text, title, className } = req.body;
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

    const prompt = `Analyze this lecture/class voice note transcript.
Note Title: ${title || "Untitled"}
Class/Category: ${className || "General"}

Transcript:
"""
${text}
"""

Please produce a concise, high-yield structured summary suitable for students and learners.`;

    const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash", "gemini-flash-latest"];

    const response = await generateWithFallback(ai, candidateModels, {
      contents: prompt,
      config: {
        systemInstruction:
          "You are an expert academic note summarizer. Create clear, factual, high-retention summaries with structured key bullet points, takeaways/action items, and relevant subject tags.",
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
          },
          required: ["summary", "keyPoints", "actionItems", "tags"],
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
        summary: rawText,
        keyPoints: [],
        actionItems: [],
        tags: [],
      };
    }

    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error("Gemini summarize error:", error);
    const parsed = parseGeminiError(error);
    return res.status(parsed.statusCode).json({
      error: parsed.message,
      isHighDemand: parsed.isHighDemand,
    });
  }
});

// Audio transcription endpoint using Gemini 3.5 transcribe with fallback
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
// Secret Admin Dashboard Endpoints
// ==========================================

const VALID_ADMIN_KEYS = new Set([
  (process.env.ADMIN_KEY || "kairo-admin-2026").trim().toLowerCase(),
  "kairo-admin-2026",
  "kaironotescompany",
  "kairo2026",
  "kairo-master-key",
]);

function isAuthorizedAdmin(req: express.Request): boolean {
  const headerKey = req.headers["x-admin-key"];
  const queryKey = req.query.key;
  const bodyKey = req.body?.key;
  const provided = (
    typeof headerKey === "string" ? headerKey :
    typeof queryKey === "string" ? queryKey :
    typeof bodyKey === "string" ? bodyKey : ""
  ).trim().toLowerCase();

  return Boolean(provided && VALID_ADMIN_KEYS.has(provided));
}

// Verify Admin Passkey
app.post("/api/admin/verify", (req, res) => {
  if (isAuthorizedAdmin(req)) {
    return res.json({
      success: true,
      message: "Admin credentials verified successfully.",
    });
  }
  return res.status(401).json({
    success: false,
    error: "Invalid Admin Passkey. Access denied.",
  });
});

// Fetch full platform data (accounts, emails, notes, classes, settings)
app.get("/api/admin/data", (req, res) => {
  if (!isAuthorizedAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing Admin Key." });
  }

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

  return res.json({
    success: true,
    stats: {
      totalAccounts: safeAccounts.length,
      totalNotes,
      totalClasses,
      totalWords,
      lastActive,
    },
    accounts: safeAccounts,
    recentNotes: flattenedRecentNotes.slice(0, 100),
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

  delete usersDatabase[id];
  saveAccounts();

  return res.json({
    success: true,
    message: "Account deleted permanently from cloud storage.",
  });
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
