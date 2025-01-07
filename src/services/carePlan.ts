import OpenAI from "openai";

export type PlanType = 'workout' | 'diet';

interface PatientData {
  name: string;
  age: number;
  height: string;
  weight: string;
  medicalConditions: string;
  medications: string;
  allergies: string;
  previousTreatments: string;
}

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function generatePlanQuestions(
  type: PlanType,
  goals: string,
  patientData: PatientData
): Promise<string[]> {
  if (!import.meta.env.VITE_OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  const patientContext = `
Patient Information:
- Name: ${patientData.name}
- Age: ${patientData.age}
- Height: ${patientData.height}
- Weight: ${patientData.weight}
- Medical Conditions: ${patientData.medicalConditions}
- Current Medications: ${patientData.medications}
- Allergies: ${patientData.allergies}
- Previous Treatments: ${patientData.previousTreatments}
`;

  const systemPrompt =
    type === "workout"
      ? `You are a certified fitness trainer with medical expertise. Generate 5 relevant questions to create a personalized workout plan, taking into account the patient's medical history and current condition. Questions should cover:
         - Current physical capabilities and limitations
         - Exercise history and preferences
         - Pain points or areas of concern
         - Schedule and facility access
         - Recovery and monitoring preferences
         
         Consider the following patient context:
         ${patientContext}`
      : `You are a certified nutritionist with medical expertise. Generate 5 relevant questions to create a personalized diet plan, taking into account the patient's medical history and current condition. Questions should cover:
         - Current eating habits and preferences
         - Food allergies and sensitivities
         - Dietary restrictions from medical conditions
         - Meal preparation capabilities
         - Nutritional goals and concerns
         
         Consider the following patient context:
         ${patientContext}`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate specific questions for a patient with these goals: ${goals}`,
        },
      ],
      model: "gpt-4",
      temperature: 0.7,
    });

    const questions =
      completion.choices[0]?.message?.content
        ?.split("\n")
        .filter((q) => q.trim())
        .slice(0, 5) || [];

    return questions;
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error("Failed to generate questions");
  }
}

export async function generatePlan(
  type: PlanType,
  goals: string,
  answers: Record<string, string>,
  patientData: PatientData
): Promise<string> {
  if (!import.meta.env.VITE_OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  const questionsAndAnswers = Object.entries(answers)
    .map(([q, a]) => `Q: ${q}\nA: ${a}`)
    .join("\n\n");

  const patientContext = `
Patient Information:
- Name: ${patientData.name}
- Age: ${patientData.age}
- Height: ${patientData.height}
- Weight: ${patientData.weight}
- Medical Conditions: ${patientData.medicalConditions}
- Current Medications: ${patientData.medications}
- Allergies: ${patientData.allergies}
- Previous Treatments: ${patientData.previousTreatments}
`;

  const systemPrompt =
    type === "workout"
      ? `You are a certified fitness trainer with medical expertise. Create a detailed, medically-appropriate workout plan based on the patient's information, goals, and answers. Include:

         1. Safety precautions and contraindications based on medical history
         2. Detailed exercise descriptions with modifications if needed
         3. Sets, reps, and progression guidelines
         4. Weekly schedule with rest periods
         5. Warning signs to watch for
         6. Monitoring recommendations
         7. Specific adaptations based on medical conditions
         
         Patient Context:
         ${patientContext}`
      : `You are a certified nutritionist with medical expertise. Create a detailed, medically-appropriate meal plan based on the patient's information, goals, and answers. Include:

         1. Safety precautions and contraindications based on medical history
         2. Detailed meal suggestions with portions
         3. Nutritional rationale for recommendations
         4. Weekly meal schedule
         5. Foods to avoid based on medical conditions and allergies
         6. Monitoring recommendations
         7. Specific adaptations based on medications and conditions
         
         Patient Context:
         ${patientContext}`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Create a medically-appropriate ${type} plan with the following information:

Goals: ${goals}

Assessment Responses:
${questionsAndAnswers}`,
        },
      ],
      model: "gpt-4",
      temperature: 0.7,
      max_tokens: 2000,
    });

    const plan = completion.choices[0]?.message?.content || "Unable to generate plan";

    // Add a medical disclaimer to the plan
    const disclaimer = `
MEDICAL DISCLAIMER:
This plan was generated based on provided patient information and should be reviewed by appropriate medical professionals before implementation. Any changes to medication or treatment plans should be discussed with the patient's healthcare provider.

Generated for: ${patientData.name}
Date: ${new Date().toLocaleDateString()}
`;

    return `${disclaimer}\n\n${plan}`;
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error(`Failed to generate ${type} plan`);
  }
}