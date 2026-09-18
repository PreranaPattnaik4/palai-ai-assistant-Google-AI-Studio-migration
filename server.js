import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Serve static assets and templates
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(express.static(path.join(__dirname, 'templates')));

// Root route serves index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

// Chat endpoint replacing Flask's @app.route('/chat', methods=['POST'])
app.post('/chat', async (req, res) => {
  const userMessage = req.body?.message;
  if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
    return res.status(400).json({ reply: 'Please provide a valid message.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({
      reply: 'Gemini API key is not configured. Please set the GEMINI_API_KEY in the environment settings.',
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
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`PalAI server running on http://0.0.0.0:${PORT}`);
});
