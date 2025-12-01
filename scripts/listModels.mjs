import dotenv from 'dotenv';
import fetch from 'cross-fetch';

dotenv.config();

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error('Missing GEMINI_API_KEY');
  process.exit(1);
}

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
console.log('Status:', res.status);
const data = await res.json();
console.log(JSON.stringify(data, null, 2));
