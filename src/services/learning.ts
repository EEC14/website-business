import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export interface StudyMaterial {
  id: string;
  title: string;
  content: string;
  category: 'recent' | 'fundamental';
  readTime: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const STUDY_PROMPT = `You are a medical education expert. Generate a detailed study material about the given topic.
The content should be:
1. Comprehensive but concise
2. Well-structured with markdown headings
3. Include recent developments and practical applications
4. Be suitable for medical professionals

Format the response as a JSON object with:
- title: string
- content: markdown string
- category: "recent" or "fundamental"
- readTime: number (in minutes)`;

const QUIZ_PROMPT = `Based on the provided study material, generate ${5} multiple-choice questions.
Each question should:
1. Test understanding of key concepts
2. Have 4 options with only one correct answer
3. Include a clear explanation for the correct answer

Format the response as a JSON array of questions, each with:
- question: string
- options: array of 4 strings
- correctAnswer: number (0-3)
- explanation: string`;

export async function generateStudyMaterial(topic: string): Promise<StudyMaterial> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: STUDY_PROMPT },
        { role: "user", content: `Generate study material about: ${topic}` }
      ],
      functions: [{
        name: "formatStudyMaterial",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            category: { type: "string", enum: ["recent", "fundamental"] },
            readTime: { type: "number" }
          },
          required: ["title", "content", "category", "readTime"]
        }
      }],
      function_call: { name: "formatStudyMaterial" }
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (functionCall?.name === "formatStudyMaterial") {
      const material = JSON.parse(functionCall.arguments || "{}");
      return {
        ...material,
        id: Date.now().toString()
      };
    }
    throw new Error('Failed to generate study material');
  } catch (error) {
    console.error('Error generating study material:', error);
    throw error;
  }
}

export async function generateQuizQuestions(material: StudyMaterial): Promise<QuizQuestion[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: QUIZ_PROMPT },
        { 
          role: "user", 
          content: `Generate questions based on this material: ${material.content}` 
        }
      ],
      functions: [{
        name: "formatQuizQuestions",
        parameters: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: { 
                    type: "array", 
                    items: { type: "string" },
                    minItems: 4,
                    maxItems: 4
                  },
                  correctAnswer: { type: "number", minimum: 0, maximum: 3 },
                  explanation: { type: "string" }
                },
                required: ["question", "options", "correctAnswer", "explanation"]
              }
            }
          },
          required: ["questions"]
        }
      }],
      function_call: { name: "formatQuizQuestions" }
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (functionCall?.name === "formatQuizQuestions") {
      const { questions } = JSON.parse(functionCall.arguments || "{}");
      return questions.map((q: any, index: number) => ({
        ...q,
        id: `${material.id}-q${index}`
      }));
    }
    throw new Error('Failed to generate quiz questions');
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    throw error;
  }
}