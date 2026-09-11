# Kairo - AI Voice Notes & Academic Summaries

A complete voice-to-text note-taking application for students and professionals, featuring lecture recording, audio playback, AI summarization, automated email delivery, and cloud synchronization.

---

## ⚠️ Why is `index.html` blank when uploaded directly?

If you opened `index.html` directly in your browser or uploaded the raw folder to a web host and see a blank page, this is because modern React/TypeScript apps **must be compiled first**.

The root `index.html` has this line:
```html
<script type="module" src="/src/main.tsx"></script>
```
Standard web browsers **cannot run `.tsx` (TypeScript) files directly**. You must run the build command to generate standard HTML, JavaScript (`.js`), and CSS (`.css`) in the **`dist/`** folder.

---

## 🚀 How to Build & Deploy

### Step 1: Install Dependencies
Make sure you have [Node.js](https://nodejs.org/) installed (version 18 or higher), then open your terminal in this project folder and run:
```bash
npm install
```

### Step 2: Build the Production Files
Run the build command:
```bash
npm run build
```
This compiles the application and creates a **`dist/`** directory containing:
- `dist/index.html` (the compiled HTML that links to valid JavaScript)
- `dist/assets/` (bundled JavaScript and CSS)
- `dist/server.cjs` (the backend server bundle)

---

## 🌐 Choosing How to Host Your Website

### Option A: Hosting on Render.com (Web Service)
When creating a **Web Service** connected to your GitHub repo on [Render](https://render.com):

| Setting | Value |
|---|---|
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

> ⚠️ **Important on Render:** The default Build Command on Render is often just `npm run build`. If you leave it as `npm run build`, Render skips installing packages, causing `vite: not found`. You must change the Build Command to **`npm install && npm run build`**.

#### Environment Variables on Render (Settings > Environment):
- `PORT`: `3000` (Optional: Render automatically detects port 3000)
- `GEMINI_API_KEY`: Your Google Gemini API Key

---

### Option B: Hosting with Other Node Hosts (Railway, Heroku, VPS)
If you only want to host the frontend interface on a static hosting provider:

1. Run `npm run build` on your computer.
2. Open the newly created **`dist/`** folder.
3. Upload **ONLY the contents of the `dist/` folder** (not the whole project) into your website's root directory (e.g., `public_html/`).

*Note for static-only hosting: The front-end recording, transcription, audio playback, and local notes work completely in the browser. The "Open in Mail App" 1-click fallback will work for emails. To use automated SMTP email sending, deploy using Option A.*

---

## 💻 Local Development
To run and edit the app locally on your machine:
```bash
npm run dev
```
Then open `http://localhost:3000` in your browser.

---

## 🛡️ Master Administrator Dashboard

A secret administrator dashboard is built into Kairo to inspect registered accounts, user emails, synchronized voice notes, full audio transcripts, classes, and cloud database state.

### How to Access the Secret Portal:
1. **Secret URL**: Add `#admin` to your website URL (e.g., `https://yoursite.com/#admin`)
2. **Keyboard Shortcut**: Press `Ctrl + Shift + A` (or `Cmd + Shift + A` on Mac) anywhere on the website
3. **Secret Click Trigger**: Click the version tag (`v2.5`) at the bottom of the page 5 times rapidly
4. **Settings Navigation**: Open **Settings** and click **Master Admin Portal** in the left sidebar

### Passkey Authentication:
- **Default Master Key**: `kairo-admin-2026`
- **Custom Key**: You can set a custom key on your server by setting the `ADMIN_KEY` environment variable in your host settings.
- **Save Once**: When you enter the key, check **"Save passkey on this device"** (enabled by default). Your browser remembers the key in local storage, so you **never have to enter it again on that device**!

