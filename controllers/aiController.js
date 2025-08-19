import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @desc    Suggest a title for a post
// @route   POST /api/ai/suggest-title
// @access  Private
export const suggestTitle = async (req, res) => {
  const { description } = req.body;

  if (!description || description.trim().length < 10) {
    return res.status(400).json({ message: 'Description is too short.' });
  }

  try {
    // Use the Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Summarize the following help request into a concise title of 8 words or less. Do not add any extra text or quotation marks around the title. Here is the request: "${description}"`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const title = response.text().trim();

    res.json({ title });
  } catch (error) {
    console.error('Google Gemini API error:', error);
    res.status(500).json({ message: 'Failed to generate title from AI' });
  }
};