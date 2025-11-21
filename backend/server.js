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

CONTENT DISTRIBUTION:
- 80% of questions should be directly related to their stated interests and background
- 20% of questions should be general knowledge/trivia

Ensure variety in difficulty and topics. Some questions should be very hard, some should be very easy. Overall questions should be fun.

CRITICAL FORMATTING RULES:
1. Return ONLY a valid JSON array
2. No markdown, no code blocks, no explanation
3. Questions and answers must not contain unescaped quotes
4. Use simple apostrophes, not smart quotes
5. Keep each question and answer on a single line

Format:
[{"question":"What is X?","answer":"Y"},{"question":"What is Z?","answer":"W"}]

Generate the ${cappedQuestions} questions now:`
            }]
          }],
          generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
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