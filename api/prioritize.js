const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const buildPrompt = (todos = []) => {
  const todoLines = todos.map((todo, index) => `${index + 1}. ${todo.text}`).join('\n');
  return `You are a task prioritization assistant. Here are the tasks to evaluate:\n\n${todoLines}\n\nReturn ONLY a JSON array with two keys per entry: "index" (the original task number) and "priority" (1 is highest priority). Respond strictly in JSON.`;
};

const normalizeTodos = (todos, priorities) => {
  return todos
    .map((todo, idx) => {
      const match = priorities.find(entry => entry.index === idx + 1);
      return {
        ...todo,
        priority: match?.priority ?? idx + 1,
      };
    })
    .sort((a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER));
};

const extractPriorities = (text) => {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Could not parse AI response.');
  }

  return JSON.parse(jsonMatch[0]);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ message: 'Server is missing GEMINI_API_KEY. Add it to your environment variables.' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
    const { todos } = payload;

    if (!Array.isArray(todos) || todos.length === 0) {
      return res.status(400).json({ message: 'Please provide at least one todo item.' });
    }

    const prompt = buildPrompt(todos);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(response.status).json({
        message: 'Gemini API error',
        detail,
      });
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const aiResponse = parts.map(part => part.text ?? '').join('').trim();
    const priorities = extractPriorities(aiResponse);
    const prioritizedTodos = normalizeTodos(todos, priorities);

    return res.status(200).json({ todos: prioritizedTodos });
  } catch (error) {
    console.error('Error prioritizing todos:', error);
    return res.status(500).json({ message: error?.message || 'Failed to prioritize tasks.' });
  }
}
