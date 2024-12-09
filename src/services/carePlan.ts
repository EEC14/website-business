import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true
});

export interface Question {
  id: number;
  text: string;
  answer: string;
}

export interface CarePlan {
  recommendations: string[];
  risks: string[];
  biomarkers: string[];
  followUpSchedule: string[];
  medications: string[]; // Added medications array
}

const DEFAULT_QUESTIONS: Question[] = [
  {
    id: 1,
    text: "What are your current symptoms and when did they start?",
    answer: ""
  },
  {
    id: 2,
    text: "Do you have any pre-existing medical conditions?",
    answer: ""
  },
  {
    id: 3,
    text: "What medications are you currently taking?",
    answer: ""
  },
  {
    id: 4,
    text: "Describe your typical daily routine and lifestyle habits.",
    answer: ""
  },
  {
    id: 5,
    text: "What are your treatment goals and preferences?",
    answer: ""
  },
  {
    id: 6,
    text: "Do you have any allergies or adverse reactions to medications?",
    answer: ""
  },
  {
    id: 7,
    text: "What is your current level of physical activity?",
    answer: ""
  },
  {
    id: 8,
    text: "Describe your diet and any dietary restrictions.",
    answer: ""
  },
  {
    id: 9,
    text: "What is your stress level and how do you manage stress?",
    answer: ""
  },
  {
    id: 10,
    text: "Do you have a support system to help with your care plan?",
    answer: ""
  }
];

const QUESTIONS_PROMPT = `You are a medical AI assistant. Generate up to 10 essential questions to create a personalized care plan. 
The questions should cover:
- Current symptoms and medical history
- Lifestyle factors
- Treatment preferences and constraints
- Environmental factors
- Social support system
Format each question as a JSON object with 'id' and 'text' fields.`;

const CARE_PLAN_PROMPT = `Based on the provided answers, create a comprehensive care plan that includes:
1. Specific recommendations and interventions
2. Potential health risks and contraindications
3. Key biomarkers to monitor
4. Follow-up schedule
5. Potential medications to consider (including typical dosages and usage guidelines)
Structure the response in clear sections and include appropriate medical disclaimers.`;

function validateApiKey(): void {
  if (!import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY === 'sk-your-api-key') {
    throw new Error('Please set a valid OpenAI API key in the .env file');
  }
}

export async function generateQuestions(): Promise<Question[]> {
  try {
    validateApiKey();
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: QUESTIONS_PROMPT },
        { role: "user", content: "Generate assessment questions for creating a care plan." }
      ],
      functions: [{
        name: "formatQuestions",
        parameters: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  text: { type: "string" }
                }
              }
            }
          }
        }
      }],
      function_call: { name: "formatQuestions" }
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (functionCall?.name === "formatQuestions") {
      const { questions } = JSON.parse(functionCall.arguments || "{}");
      return questions.map((q: any) => ({ ...q, answer: "" }));
    }
    throw new Error('Failed to generate questions');
  } catch (error) {
    console.warn('Error generating questions, using default questions:', error);
    if (error instanceof Error && error.message.includes('API key')) {
      throw error;
    }
    return DEFAULT_QUESTIONS;
  }
}

export async function generateCarePlan(questions: Question[]): Promise<CarePlan> {
  try {
    validateApiKey();
    const questionsWithAnswers = questions
      .map(q => `Q: ${q.text}\nA: ${q.answer}`)
      .join("\n\n");

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: CARE_PLAN_PROMPT },
        { role: "user", content: questionsWithAnswers }
      ],
      functions: [{
        name: "formatCarePlan",
        parameters: {
          type: "object",
          properties: {
            recommendations: { type: "array", items: { type: "string" } },
            risks: { type: "array", items: { type: "string" } },
            biomarkers: { type: "array", items: { type: "string" } },
            followUpSchedule: { type: "array", items: { type: "string" } },
            medications: { type: "array", items: { type: "string" } }
          }
        }
      }],
      function_call: { name: "formatCarePlan" }
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (functionCall?.name === "formatCarePlan") {
      return JSON.parse(functionCall.arguments || "{}");
    }
    throw new Error('Failed to generate care plan');
  } catch (error) {
    console.error('Error generating care plan:', error);
    if (error instanceof Error) {
      throw new Error(error.message.includes('API key') 
        ? 'Please set a valid OpenAI API key in the .env file'
        : 'Failed to generate care plan. Please try again.');
    }
    throw new Error('Failed to generate care plan. Please try again.');
  }
}