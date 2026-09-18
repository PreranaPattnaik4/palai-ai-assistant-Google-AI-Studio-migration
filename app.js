import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Parse JSON bodies
app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Normalize Netlify function path prefixes so both /chat and /.netlify/functions/api/chat match routes
app.use((req, res, next) => {
  if (req.url.startsWith('/.netlify/functions/api')) {
    req.url = req.url.replace('/.netlify/functions/api', '') || '/';
  } else if (req.url.startsWith('/api')) {
    req.url = req.url.replace('/api', '') || '/';
  }
  next();
});

// Serve static assets from /static and /public/static
app.use('/static', express.static(path.join(__dirname, 'static')));
if (fs.existsSync(path.join(__dirname, 'public', 'static'))) {
  app.use('/static', express.static(path.join(__dirname, 'public', 'static')));
}

// Serve templates and public folders
app.use('/templates', express.static(path.join(__dirname, 'templates')));
if (fs.existsSync(path.join(__dirname, 'public'))) {
  app.use(express.static(path.join(__dirname, 'public')));
}
app.use(express.static(path.join(__dirname, 'templates')));

// Root route serves index.html
app.get('/', (req, res) => {
  const templatesFile = path.join(__dirname, 'templates', 'index.html');
  const publicFile = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(templatesFile)) {
    return res.sendFile(templatesFile);
  }
  if (fs.existsSync(publicFile)) {
    return res.sendFile(publicFile);
  }
  return res.send('PalAI Assistant is running.');
});

// Chat handler
async function handleChat(req, res) {
  let userMessage = req.body?.message;
  if (!userMessage && typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      userMessage = parsed.message;
    } catch (e) {
      // ignore
    }
  }

  if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
    return res.status(400).json({ reply: 'Please provide a valid message.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({
      reply: 'Gemini API key is not configured. Please set the GEMINI_API_KEY environment variable in Netlify Site Configuration (Site configuration > Environment variables).',
    });
  }

  const candidateModels = [
    process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite'
  ];
  let lastError = null;

  for (const model of candidateModels) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model,
        contents: userMessage.trim(),
      });

      const botReply = response?.text || "I'm sorry, I couldn't generate a response.";
      return res.json({ reply: botReply });
    } catch (error) {
      console.warn(`Model ${model} failed, trying next candidate if available:`, error.message);
      lastError = error;
    }
  }

  console.error('All model attempts failed:', lastError);
  return res.json({ reply: `Error: ${lastError?.message || 'Failed to communicate with Gemini.'}` });
}

// Support multiple routing entrypoints
app.post('/chat', handleChat);
app.post('/.netlify/functions/api/chat', handleChat);
app.post('/.netlify/functions/api', handleChat);
app.post('/api/chat', handleChat);

export default app;
