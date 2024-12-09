import React, { useState, useEffect } from 'react';
import { ClipboardList, AlertCircle, Activity, Calendar, Key, Pill } from 'lucide-react';
import { generateQuestions, generateCarePlan, Question, CarePlan } from '../services/carePlan';
import { LoadingDots } from './LoadingDots';
import { FileUpload } from './FileUpload';
import { HealthData } from '../services/fileParser';

export const CarePlanGenerator: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'questions' | 'plan'>('questions');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuestions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const questions = await generateQuestions();
        setQuestions(questions);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load questions. Please try again.';
        setError(message);
        console.error('Error loading questions:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadQuestions();
  }, []);

  const handleAnswerChange = (id: number, answer: string) => {
    setQuestions(prev =>
      prev.map(q => q.id === id ? { ...q, answer } : q)
    );
  };

  const handleHealthDataParsed = (data: HealthData) => {
    setQuestions(prev => prev.map(q => {
      let answer = '';
      const lowerQuestion = q.text.toLowerCase();
      
      if (lowerQuestion.includes('symptoms') && data.symptoms?.length) {
        answer = data.symptoms.join(', ');
      } else if (lowerQuestion.includes('medications') && data.medications?.length) {
        answer = data.medications.join(', ');
      } else if (lowerQuestion.includes('conditions') && data.conditions?.length) {
        answer = data.conditions.join(', ');
      } else if (lowerQuestion.includes('allergies') && data.allergies?.length) {
        answer = data.allergies.join(', ');
      } else if (lowerQuestion.includes('lifestyle') && data.lifestyle) {
        answer = Object.entries(data.lifestyle)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
      }
      
      return { ...q, answer: answer || q.answer };
    }));
  };

  const handleGenerateCarePlan = async () => {
    const hasAnyAnswer = questions.some(q => q.answer.trim() !== '');
    if (!hasAnyAnswer) {
      setError('Please answer at least one question to generate a care plan.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const plan = await generateCarePlan(questions);
      setCarePlan(plan);
      setStep('plan');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate care plan. Please try again.';
      setError(message);
      console.error('Error generating care plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCarePlan(null);
    setStep('questions');
    setError(null);
    setQuestions(prev => prev.map(q => ({ ...q, answer: '' })));
  };

  if (error?.includes('API key')) {
    return (
      <div className="p-8 bg-yellow-50 rounded-lg">
        <div className="flex items-start gap-3">
          <Key className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
          <div className="space-y-2">
            <p className="text-sm text-yellow-700">
              {error}
            </p>
            <p className="text-sm text-yellow-600">
              To use the care plan generator, you need to:
            </p>
            <ol className="list-decimal list-inside text-sm text-yellow-600 space-y-1">
              <li>Get an API key from OpenAI at <a href="https://platform.openai.com/account/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a></li>
              <li>Add the API key to your .env file as VITE_OPENAI_API_KEY</li>
              <li>Restart the development server</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && questions.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingDots />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 p-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {step === 'questions' ? (
        <>
          <FileUpload
            onDataParsed={handleHealthDataParsed}
            onError={setError}
          />

          <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
            <p className="text-sm text-blue-700">
              Answer the questions that are relevant to your case. The more information you provide, the more personalized your care plan will be.
            </p>
          </div>

          <div className="space-y-6">
            {questions.map((question) => (
              <div key={question.id} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {question.text}
                </label>
                <textarea
                  value={question.answer}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Optional - Leave blank if not applicable"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleGenerateCarePlan}
            disabled={isLoading}
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? <LoadingDots /> : (
              <>
                <ClipboardList className="w-5 h-5" />
                Generate Care Plan
              </>
            )}
          </button>
        </>
      ) : carePlan && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-lg">Recommendations</h3>
              </div>
              <ul className="list-disc pl-5 space-y-2">
                {carePlan.recommendations.map((rec, i) => (
                  <li key={i} className="text-gray-700">{rec}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-lg">Potential Risks</h3>
              </div>
              <ul className="list-disc pl-5 space-y-2">
                {carePlan.risks.map((risk, i) => (
                  <li key={i} className="text-gray-700">{risk}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-lg">Biomarkers to Monitor</h3>
              </div>
              <ul className="list-disc pl-5 space-y-2">
                {carePlan.biomarkers.map((marker, i) => (
                  <li key={i} className="text-gray-700">{marker}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-lg">Follow-up Schedule</h3>
              </div>
              <ul className="list-disc pl-5 space-y-2">
                {carePlan.followUpSchedule.map((schedule, i) => (
                  <li key={i} className="text-gray-700">{schedule}</li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Pill className="w-5 h-5 text-orange-500" />
                <h3 className="font-semibold text-lg">Potential Medications</h3>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-orange-700">
                  Note: These medication suggestions are for professional consideration only. 
                  Final medication decisions should be made by a licensed healthcare provider 
                  after proper evaluation.
                </p>
              </div>
              <ul className="list-disc pl-5 space-y-2">
                {carePlan.medications.map((medication, i) => (
                  <li key={i} className="text-gray-700">{medication}</li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200"
          >
            Create New Care Plan
          </button>
        </div>
      )}
    </div>
  );
};