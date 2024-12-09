import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const STAFF_PROMPT = `You are an AI medical assistant helping medical professionals. Your role is to:
- Provide detailed clinical information and guidance
- Suggest relevant diagnostic tests and procedures when applicable
- List key clinical values and vital signs to monitor
- Recommend potential medications and treatment options, including dosage ranges
- Always include standard contraindications and warning notes
- Structure your responses clearly with sections for:
  * Recommended Tests/Diagnostics
  * Key Values to Monitor
  * Potential Medications/Treatments
  * Contraindications/Warnings
- Remember to note that final clinical decisions rest with the healthcare provider
- For each response, include a "requiresDoctor" boolean field indicating if immediate medical attention is needed`;

const PATIENT_PROMPT = `You are an AI medical assistant helping patients. Your role is to:
- Provide general health information and guidance in accessible language
- Help users understand medical terms and conditions
- Clearly indicate when professional medical attention is required
- Always include a disclaimer that you're not a replacement for professional medical advice
- Be extra careful and conservative with medical advice
- Never provide specific medication recommendations
- For each response, include a "requiresDoctor" boolean field indicating if the patient should seek medical attention`;

interface OpenAIResponse {
  content: string;
  requiresDoctor: boolean;
}

export async function generateResponse(message: string, isStaff: boolean): Promise<OpenAIResponse> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { 
          role: "system", 
          content: isStaff ? STAFF_PROMPT : PATIENT_PROMPT 
        },
        { 
          role: "user", 
          content: message 
        }
      ],
      functions: [
        {
          name: "formatMedicalResponse",
          parameters: {
            type: "object",
            properties: {
              content: {
                type: "string",
                description: "The medical response content"
              },
              requiresDoctor: {
                type: "boolean",
                description: "Indicates if immediate medical attention is needed"
              }
            },
            required: ["content", "requiresDoctor"]
          }
        }
      ],
      function_call: { name: "formatMedicalResponse" },
      temperature: isStaff ? 0.5 : 0.7,
      max_tokens: 800
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (functionCall?.name === "formatMedicalResponse") {
      const { content, requiresDoctor } = JSON.parse(functionCall.arguments || "{}");
      
      if (isStaff) {
        return {
          content: formatStaffResponse(content),
          requiresDoctor
        };
      }
      
      return { content, requiresDoctor };
    }

    return {
      content: "I apologize, but I couldn't generate a response. Please try again.",
      requiresDoctor: false
    };
  } catch (error) {
    console.error('Error generating response:', error);
    return {
      content: "I apologize, but I'm having trouble connecting to my knowledge base. Please try again later.",
      requiresDoctor: false
    };
  }
}

function formatStaffResponse(content: string): string {
  if (content.includes('##') || content.includes('*')) {
    return content;
  }

  const sections = [
    'Recommended Tests/Diagnostics',
    'Key Values to Monitor',
    'Potential Medications/Treatments',
    'Contraindications/Warnings'
  ];

  let formattedContent = content;
  sections.forEach(section => {
    if (!content.toLowerCase().includes(section.toLowerCase())) {
      formattedContent += `\n\n## ${section}\nNo specific ${section.toLowerCase()} indicated for this case.`;
    }
  });

  return formattedContent;
}