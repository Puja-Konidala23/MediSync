import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // AI Recommendation Logic using Gemini
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

  app.post("/api/recommendations", async (req, res) => {
    const { condition, budget, location, hospitals } = req.body;

    try {
      const prompt = `
        As a healthcare assistant, recommend the best hospital from the following list based on:
        Patient Condition: ${condition}
        Budget: ${budget}
        Location: ${location}
        
        Available Hospitals:
        ${JSON.stringify(hospitals)}
        
        Return a JSON array of hospital IDs in order of recommendation (best first).
        Only return the JSON array, no other text.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      const text = response.text || "[]";
      // Basic cleaning in case of markdown
      const jsonStr = text.replace(/```json|```/g, "").trim();
      const recommendedIds = JSON.parse(jsonStr);
      
      res.json({ recommendedIds });
    } catch (error) {
      console.error("AI Error:", error);
      // Fallback to rule-based logic if AI fails
      const fallbackIds = hospitals
        .sort((a: any, b: any) => (a.beds > b.beds ? -1 : 1))
        .map((h: any) => h.id);
      res.json({ recommendedIds: fallbackIds });
    }
  });

  // Email Notification System
  app.post("/api/notify", async (req, res) => {
    const { to, subject, text } = req.body;

    // For demo purposes, we'll just log the email if no SMTP is configured
    // In production, you'd use process.env.SMTP_HOST, etc.
    console.log(`Sending email to: ${to}\nSubject: ${subject}\nBody: ${text}`);

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      try {
        await transporter.sendMail({ from: process.env.SMTP_USER, to, subject, text });
        res.json({ success: true });
      } catch (error) {
        console.error("Email Error:", error);
        res.status(500).json({ error: "Failed to send email" });
      }
    } else {
      res.json({ success: true, message: "Email logged to console (SMTP not configured)" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
