const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API endpoint to generate questions
app.post('/api/generate-questions', async (req, res) => {
  try {
    const { persona, totalQuestions } = req.body;

    if (!persona || !totalQuestions) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Enforce maximum questions limit
    const MAX_QUESTIONS = 500;
    const cappedQuestions = Math.min(totalQuestions, MAX_QUESTIONS);

    if (totalQuestions > MAX_QUESTIONS) {
      console.log(`Requested ${totalQuestions} questions, capping at ${MAX_QUESTIONS}`);
    }

    // Get API key from environment variable
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate exactly ${cappedQuestions} trivia questions with answers for a group that describes themselves as: "${persona}".

CONTENT DISTRIBUTION & TONE:
* 80% of questions must be directly related to their stated interests, background, and current trends within their persona.
* 20% of questions should be general knowledge/common trivia.
* The tone should be witty, engaging, and slightly competitive. Avoid questions that are purely dry or academic.

DIFFICULTY RANGES:
* Aim for this difficulty distribution: 20% Easy, 60% Medium, 20% Hard/Very Hard (requiring niche knowledge or complex recall).

CRITICAL FORMATTING RULES:
1. Return ONLY a single, valid JSON array string.
2. NO markdown, NO code blocks, and NO introductory or explanatory text.
3. Questions and answers must not contain unescaped quotes.
4. Use simple apostrophes.
5. Keep question text between 8 and 25 words. Keep answer text between 1 and 5 words.
6. Each question and its answer must be contained on a single line within the array.

JSON Schema: The output must conform strictly to: [{"question": String, "answer": String}]

Generate the ${cappedQuestions} questions now:`
            }]
          }],
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to generate questions from Gemini API');
    }

    const data = await response.json();
    const generatedText = data.candidates[0].content.parts[0].text;
    
    // Try to extract JSON from the response
    let questionsArray;
    try {
      // Remove markdown code blocks if present
      const cleanedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      questionsArray = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse questions:', parseError);
      throw new Error('Failed to parse generated questions');
    }

    if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
      throw new Error('Invalid question format received');
    }

    // Ensure we have enough questions (but respect the cap)
    while (questionsArray.length < cappedQuestions) {
      questionsArray.push(...questionsArray.slice(0, cappedQuestions - questionsArray.length));
    }

    res.json({ questions: questionsArray });
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({ error: error.message || 'Failed to generate questions' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});