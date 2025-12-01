import dotenv from 'dotenv';
import fetch from 'cross-fetch';

dotenv.config();

const key = process.env.GEMINI_API_KEY;

if (!key) {
  console.error('Missing GEMINI_API_KEY');
  process.exit(1);
}

const model = 'gemini-2.5-flash';
const prompt = 'Say hello';

try {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ]
      })
    }
  );

  const text = await response.text();
  console.log('Status:', response.status);
  console.log(text);
} catch (error) {
  console.error('Request failed:', error);
  process.exit(1);
}
