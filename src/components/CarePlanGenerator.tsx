import React, { useState } from "react";
import { AlertTriangle, Dumbbell, Utensils, ArrowRight } from "lucide-react";
import { generatePlanQuestions, generatePlan } from "../services/carePlan";

export type PlanType = 'workout' | 'diet';

interface PlanQuestionnaireProps {
  type: PlanType;
  onPlanGenerated: (plan: string) => void;
}

export const PlanQuestionnaire: React.FC<PlanQuestionnaireProps> = ({
  type,
  onPlanGenerated,
}) => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [goals, setGoals] = useState('');

  const handleGoalsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goals.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const generatedQuestions = await generatePlanQuestions(type, goals);
      setQuestions(generatedQuestions);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate questions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswersSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    try {
      const plan = await generatePlan(type, goals, answers);
      onPlanGenerated(plan);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (questions.length === 0) {
    return (
      <form onSubmit={handleGoalsSubmit} className="space-y-4">
        <div>
          <label htmlFor="goals" className="block text-sm font-medium text-gray-700 mb-2">
            What are your {type === 'workout' ? 'fitness' : 'dietary'} goals?
          </label>
          <textarea
            id="goals"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            className="w-full h-32 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`Please describe your ${type === 'workout' ? 'fitness' : 'dietary'} goals and preferences...`}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !goals.trim()}
          className="w-full bg-blue-900 text-white py-3 px-6 rounded-xl hover:bg-blue-800 
                   transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating questions...</span>
            </>
          ) : (
            <span>Continue</span>
          )}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleAnswersSubmit} className="space-y-6">
      {questions.map((question, index) => (
        <div key={index}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {question}
          </label>
          <textarea
            value={answers[question] || ''}
            onChange={(e) => setAnswers(prev => ({
              ...prev,
              [question]: e.target.value
            }))}
            className="w-full h-24 px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Your answer..."
          />
        </div>
      ))}
      <button
        type="submit"
        disabled={isLoading || questions.some(q => !answers[q]?.trim())}
        className="w-full bg-blue-900 text-white py-3 px-6 rounded-xl hover:bg-blue-800 
                 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center justify-center space-x-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Generating {type} plan...</span>
          </>
        ) : (
          <span>Generate {type === 'workout' ? 'Workout' : 'Diet'} Plan</span>
        )}
      </button>
    </form>
  );
};

interface PlanResultProps {
  plan: string;
  type: PlanType;
  onReset: () => void;
}

const PlanResult: React.FC<PlanResultProps> = ({ plan, type, onReset }) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const blob = new Blob([plan], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-plan.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Your {type === 'workout' ? 'Workout' : 'Diet'} Plan
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
          >
            <Printer className="w-5 h-5" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-6 whitespace-pre-wrap text-gray-700">
        {plan}
      </div>

      <button
        onClick={onReset}
        className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Generate Another Plan</span>
      </button>
    </div>
  );
};

export const CarePlanGenerator: React.FC = () => {
  const [planType, setPlanType] = useState<PlanType | null>(null);
  const [step, setStep] = useState<"select" | "questionnaire" | "plan">(
    "select"
  );
  const [generatedPlan, setGeneratedPlan] = useState<string>("");

  const handlePlanGenerated = (plan: string) => {
    setGeneratedPlan(plan);
    setStep("plan");
  };

  const resetPlan = () => {
    setPlanType(null);
    setGeneratedPlan("");
    setStep("select");
  };

  return (
    <main className="max-w-4xl px-4 py-8 mx-auto">
      <div className="overflow-hidden bg-white border border-gray-200 shadow-lg rounded-2xl">
        <div className="p-6">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Personalized Plan Generator
          </h1>

          {step === "select" && (
            <div className="space-y-6">
              <p className="text-gray-600">
                Choose the type of plan you'd like to generate:
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <button
                  onClick={() => {
                    setPlanType("workout");
                    setStep("questionnaire");
                  }}
                  className="flex items-center p-6 transition-colors duration-200 border-2 border-gray-200 rounded-xl hover:border-blue-500 group"
                >
                  <div className="p-3 transition-colors duration-200 bg-blue-100 rounded-lg group-hover:bg-blue-200">
                    <Dumbbell className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4 text-left">
                    <h3 className="font-semibold text-gray-900">
                      Workout Plan
                    </h3>
                    <p className="text-sm text-gray-600">
                      Get a customized exercise routine
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 ml-auto text-gray-400 group-hover:text-blue-500" />
                </button>

                <button
                  onClick={() => {
                    setPlanType("diet");
                    setStep("questionnaire");
                  }}
                  className="flex items-center p-6 transition-colors duration-200 border-2 border-gray-200 rounded-xl hover:border-blue-500 group"
                >
                  <div className="p-3 transition-colors duration-200 bg-green-100 rounded-lg group-hover:bg-green-200">
                    <Utensils className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4 text-left">
                    <h3 className="font-semibold text-gray-900">Diet Plan</h3>
                    <p className="text-sm text-gray-600">
                      Get a personalized meal plan
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 ml-auto text-gray-400 group-hover:text-green-500" />
                </button>
              </div>
            </div>
          )}

          {step === "questionnaire" && planType && (
            <PlanQuestionnaire
              type={planType}
              onPlanGenerated={handlePlanGenerated}
            />
          )}

          {step === "plan" && (
            <PlanResult
              plan={generatedPlan}
              type={planType!}
              onReset={resetPlan}
            />
          )}

          <div className="mt-6">
            <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-xl">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-yellow-700">
                  This plan is for informational purposes only. Consult with
                  healthcare professionals before starting any new workout or
                  diet program.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};


export { PlanType };
