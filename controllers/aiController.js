import { GoogleGenerativeAI } from '@google/generative-ai';

const cleanTitle = (t) =>
  String(t || '')
    .replace(/["'“”]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8)
    .join(' ');

export const suggestTitle = async (req, res) => {
  const { description } = req.body;
  if (!description || description.trim().length < 10) {
    return res.status(400).json({ message: 'Description is too short.' });
  }

  // Fallback: trim to <= 8 words
  const fallback = cleanTitle(description);

  try {
    if (!process.env.GEMINI_API_KEY) return res.json({ title: fallback });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Summarize into a concise, useful title (<=8 words). No quotes.\n${description}`;

    const p = model.generateContent(prompt);
    const timeout = new Promise((_, r) => setTimeout(() => r(new Error('AI timeout')), 5000));
    const result = await Promise.race([p, timeout]);
    const title = cleanTitle(result.response.text().trim()) || fallback;

    res.json({ title });
  } catch {
    res.json({ title: fallback });
  }
};
