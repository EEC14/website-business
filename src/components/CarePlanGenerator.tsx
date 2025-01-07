import React, { useState } from "react";
import { Loader2, Printer, Download, ArrowLeft, AlertTriangle, Dumbbell, Utensils, ArrowRight, User } from 'lucide-react';
import { generatePlanQuestions, generatePlan } from "../services/carePlan";

export type PlanType = 'workout' | 'diet';

interface PatientData {
  id?: string;
  name: string;
  age: number;
  height: string;
  weight: string;
  medicalConditions: string;
  medications: string;
  allergies: string;
  previousTreatments: string;
}

const initialPatientData: PatientData = {
  name: '',
  age: 0,
  height: '',
  weight: '',
  medicalConditions: '',
  medications: '',
  allergies: '',
  previousTreatments: ''
};

interface PatientFormProps {
  patientData: PatientData;
  onPatientDataChange: (data: PatientData) => void;
}

const PatientForm: React.FC<PatientFormProps> = ({ patientData, onPatientDataChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onPatientDataChange({
      ...patientData,
      [name]: value
    });
  };

  return (
    <div className="space-y-4 mb-6">
      <h3 className="text-lg font-semibold text-gray-900">Patient Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Patient Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={patientData.name}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
            Age
          </label>
          <input
            type="number"
            id="age"
            name="age"
            value={patientData.age}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-1">
            Height
          </label>
          <input
            type="text"
            id="height"
            name="height"
            value={patientData.height}
            onChange={handleChange}
            placeholder="e.g., 5'10''"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
            Weight
          </label>
          <input
            type="text"
            id="weight"
            name="weight"
            value={patientData.weight}
            onChange={handleChange}
            placeholder="e.g., 160 lbs"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <label htmlFor="medicalConditions" className="block text-sm font-medium text-gray-700 mb-1">
            Medical Conditions
          </label>
          <textarea
            id="medicalConditions"
            name="medicalConditions"
            value={patientData.medicalConditions}
            onChange={handleChange}
            className="w-full h-24 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="medications" className="block text-sm font-medium text-gray-700 mb-1">
            Current Medications
          </label>
          <textarea
            id="medications"
            name="medications"
            value={patientData.medications}
            onChange={handleChange}
            className="w-full h-24 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 mb-1">
            Allergies
          </label>
          <textarea
            id="allergies"
            name="allergies"
            value={patientData.allergies}
            onChange={handleChange}
            className="w-full h-24 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="previousTreatments" className="block text-sm font-medium text-gray-700 mb-1">
            Previous Treatments
          </label>
          <textarea
            id="previousTreatments"
            name="previousTreatments"
            value={patientData.previousTreatments}
            onChange={handleChange}
            className="w-full h-24 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};


interface PlanQuestionnaireProps {
  type: PlanType;
  onPlanGenerated: (plan: string) => void;
  patientData: PatientData;
}

export const PlanQuestionnaire: React.FC<PlanQuestionnaireProps> = ({
  type,
  onPlanGenerated,
  patientData,
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
      const generatedQuestions = await generatePlanQuestions(type, goals, patientData);
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
      const plan = await generatePlan(type, goals, answers, patientData);
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
  const [step, setStep] = useState<"select" | "patient" | "questionnaire" | "plan">("select");
  const [generatedPlan, setGeneratedPlan] = useState<string>("");
  const [patientData, setPatientData] = useState<PatientData>(initialPatientData);

  const handlePlanGenerated = (plan: string) => {
    setGeneratedPlan(plan);
    setStep("plan");
  };

  const resetPlan = () => {
    setPlanType(null);
    setGeneratedPlan("");
    setPatientData(initialPatientData);
    setStep("select");
  };

  return (
    <main className="max-w-4xl px-4 py-8 mx-auto">
      <div className="overflow-hidden bg-white border border-gray-200 shadow-lg rounded-2xl">
        <div className="p-6">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Medical Staff Care Plan Generator
          </h1>

          {step === "select" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <button
                  onClick={() => {
                    setPlanType("workout");
                    setStep("patient");
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
                    setStep("patient");
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

          {step === "patient" && (
            <div className="space-y-6">
              <PatientForm
                patientData={patientData}
                onPatientDataChange={setPatientData}
              />
              <button
                onClick={() => setStep("questionnaire")}
                disabled={!patientData.name || !patientData.age}
                className="w-full bg-blue-900 text-white py-3 px-6 rounded-xl hover:bg-blue-800 
                         transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Plan Questions
              </button>
            </div>
          )}

          {step === "questionnaire" && planType && (
            <PlanQuestionnaire
              type={planType}
              onPlanGenerated={handlePlanGenerated}
              patientData={patientData}
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
                  This plan is for informational purposes only and should be reviewed by appropriate medical professionals before implementation.
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
