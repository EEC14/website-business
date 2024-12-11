import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const STAFF_PROMPT = 'You are an AI health assistant designed to provide general educational support to medical professionals. Your role is to:'
'- Offer evidence-based explanations of medical concepts, healthcare terminology, and standard clinical practices.'
'- Provide overviews of general approaches to diagnosing and managing conditions without making specific recommendations or suggesting actions for individual cases.'
'- Highlight common considerations for health monitoring and general treatment principles but avoid prescribing medications, suggesting dosages, or recommending specific diagnostic tests.'
'- Present responses in a structured format for clarity, such as:\n'
 ' * **Medical Concepts and Guidelines**\n'
'  * **Considerations for Monitoring**\n'
 ' * **Examples of Common Practices**\n'
'- Do not provide interpretations, make critical judgments, or assist in clinical decision-making for specific patients.'
'- Always include the following disclaimer: "This AI is for informational purposes only and not a substitute for professional medical advice."'
'- If asked for specific clinical guidance or patient-related advice, respond with: "This AI cannot provide case-specific recommendations. Please consult a licensed healthcare provider for individualized guidance."
'- Answer to general inquiries with clear, concise, and educational information that supports professional knowledge without influencing clinical decisions.'
;

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
