import React, { useState } from 'react';
import { Book, GraduationCap, Brain, Trophy, ArrowRight, CheckCircle2, XCircle, Search, Loader2 } from 'lucide-react';
import { Tab } from '@headlessui/react';
import { clsx } from 'clsx';
import ReactConfetti from 'react-confetti';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useWindowSize } from '../hooks/useWindowSize';
import { StudyMaterial, QuizQuestion, generateStudyMaterial, generateQuizQuestions } from '../services/learning';

export const MedicalLearning: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMaterial, setCurrentMaterial] = useState<StudyMaterial | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const material = await generateStudyMaterial(searchTerm);
      setCurrentMaterial(material);
      setQuizQuestions([]);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setScore(0);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate study material');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!currentMaterial) return;

    setIsLoading(true);
    setError(null);
    try {
      const questions = await generateQuizQuestions(currentMaterial);
      setQuizQuestions(questions);
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setScore(0);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate quiz questions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (selectedAnswer !== null || showExplanation) return;
    setSelectedAnswer(answerIndex);
    setShowExplanation(true);

    if (answerIndex === quizQuestions[currentQuestionIndex].correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {showConfetti && <ReactConfetti width={width} height={height} recycle={false} />}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search medical topics..."
                className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading || !searchTerm.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />}
            Learn
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        {currentMaterial && !quizQuestions.length && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{currentMaterial.title}</h2>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Book className="w-4 h-4" />
                    {currentMaterial.readTime} min read
                  </span>
                  <span className={clsx(
                    "text-sm px-2 py-1 rounded-full",
                    currentMaterial.category === 'recent'
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  )}>
                    {currentMaterial.category === 'recent' ? 'Recent Development' : 'Fundamental'}
                  </span>
                </div>
              </div>
              <button
                onClick={handleStartQuiz}
                className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 flex items-center gap-2"
              >
                <GraduationCap className="w-5 h-5" />
                Take Quiz
              </button>
            </div>
            <div className="prose prose-blue max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {currentMaterial.content}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {quizQuestions.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Question {currentQuestionIndex + 1} of {quizQuestions.length}
              </h3>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">Score: {score}/{quizQuestions.length}</span>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-lg">{quizQuestions[currentQuestionIndex].question}</p>
              <div className="space-y-2">
                {quizQuestions[currentQuestionIndex].options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={selectedAnswer !== null}
                    className={clsx(
                      "w-full text-left p-4 rounded-lg border transition-colors",
                      selectedAnswer === null
                        ? "hover:bg-gray-50 border-gray-200"
                        : index === quizQuestions[currentQuestionIndex].correctAnswer
                        ? "bg-green-50 border-green-500"
                        : selectedAnswer === index
                        ? "bg-red-50 border-red-500"
                        : "border-gray-200",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {selectedAnswer !== null && (
                        index === quizQuestions[currentQuestionIndex].correctAnswer ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : selectedAnswer === index ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : null
                      )}
                      <span>{option}</span>
                    </div>
                  </button>
                ))}
              </div>

              {showExplanation && (
                <div className="bg-blue-50 p-4 rounded-lg mt-4">
                  <p className="text-blue-700">
                    {quizQuestions[currentQuestionIndex].explanation}
                  </p>
                </div>
              )}

              {selectedAnswer !== null && currentQuestionIndex < quizQuestions.length && (
                <button
                  onClick={handleNextQuestion}
                  className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 mt-4 flex items-center justify-center gap-2"
                >
                  {currentQuestionIndex === quizQuestions.length - 1 ? (
                    <>
                      <Trophy className="w-5 h-5" />
                      See Results
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-5 h-5" />
                      Next Question
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};