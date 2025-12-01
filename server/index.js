import express from 'express';
import cors from 'cors';
import fetch from 'cross-fetch';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.SERVER_PORT) || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';

if (!GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY is not set. AI prioritization will fail until you add it to your .env file.');
}

app.use(cors());
app.use(express.json());

const buildPrompt = (todos) => {
  const todoLines = todos.map((todo, index) => `${index + 1}. ${todo.text}`).join('\n');
  return `You are a task prioritization assistant. Here are the tasks to evaluate:\n\n${todoLines}\n\nReturn ONLY a JSON array with two keys per entry: "index" (the original task number) and "priority" (1 is highest priority). Respond strictly in JSON.`;
};

app.post('/api/prioritize', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ message: 'Server is missing GEMINI_API_KEY. Add it to your .env file.' });
    }

    const { todos } = req.body;

    if (!Array.isArray(todos) || todos.length === 0) {
      return res.status(400).json({ message: 'Please provide at least one todo item.' });
    }

    const prompt = buildPrompt(todos);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return res.status(response.status).json({
        message: 'Gemini API error',
        detail: errorText
      });
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const aiResponse = parts.map(part => part.text ?? '').join('').trim();

    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Could not parse AI response:', aiResponse);
      return res.status(500).json({ message: 'Could not parse AI response.' });
    }

    const priorities = JSON.parse(jsonMatch[0]);

    const prioritizedTodos = todos.map((todo, idx) => {
      const match = priorities.find(entry => entry.index === idx + 1);
      return {
        ...todo,
        priority: match?.priority ?? idx + 1
      };
    }).sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));

    return res.json({ todos: prioritizedTodos });
  } catch (error) {
    console.error('Server error while prioritizing todos:', error);
    return res.status(500).json({ message: error.message || 'Failed to prioritize tasks.' });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath));
  app.get('*', (_, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
