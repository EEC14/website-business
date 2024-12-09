import React from 'react';
import { Stethoscope, User, ShieldAlert, MessageSquare, ClipboardList, GraduationCap, LogOut } from 'lucide-react';
import { Tab } from '@headlessui/react';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { LoadingDots } from './components/LoadingDots';
import { CarePlanGenerator } from './components/CarePlanGenerator';
import { MedicalLearning } from './components/MedicalLearning';
import { AuthPage } from './components/AuthPage';
import { SubscriptionPage } from './components/SubscriptionPage';
import { generateResponse } from './services/openai';
import { useAuth } from './hooks/useAuth';
import { signOut } from './services/firebase';
import { clsx } from 'clsx';

type Message = {
  text: string;
  isBot: boolean;
  isStaff?: boolean;
  isUrgent?: boolean;
};

export default function App() {
  const { user, loading } = useAuth();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasSubscription, setHasSubscription] = React.useState(false);

  React.useEffect(() => {
    // Check if the user came from a successful Stripe payment
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment_status') === 'success') {
      setHasSubscription(true);
      // Remove the query parameters
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSendMessage = async (message: string) => {
    setMessages(prev => [...prev, { 
      text: message, 
      isBot: false,
      isStaff: true
    }]);

    setIsLoading(true);
    try {
      const response = await generateResponse(message, true);
      
      setMessages(prev => [...prev, {
        text: response.content,
        isBot: true,
        isUrgent: response.requiresDoctor
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        text: "I apologize, but I'm having trouble connecting to my knowledge base. Please try again later.",
        isBot: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <LoadingDots />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (!hasSubscription) {
    return <SubscriptionPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-blue-500" />
            <h1 className="text-xl font-bold text-gray-900">HealthChat</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm bg-blue-50 px-3 py-1 rounded-full">
              <User className="w-4 h-4 text-blue-500" />
              {user.email}
            </div>
            <button
              onClick={() => signOut()}
              className="text-gray-600 hover:text-gray-900"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-lg">
          <Tab.Group>
            <Tab.List className="flex space-x-1 rounded-t-2xl bg-blue-50 p-1">
              <Tab
                className={({ selected }) =>
                  clsx(
                    'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                    'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                    selected
                      ? 'bg-white shadow text-blue-700'
                      : 'text-blue-500 hover:bg-white/[0.12] hover:text-blue-600'
                  )
                }
              >
                <div className="flex items-center justify-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Chat Assistant
                </div>
              </Tab>
              <Tab
                className={({ selected }) =>
                  clsx(
                    'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                    'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                    selected
                      ? 'bg-white shadow text-blue-700'
                      : 'text-blue-500 hover:bg-white/[0.12] hover:text-blue-600'
                  )
                }
              >
                <div className="flex items-center justify-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Care Plan Generator
                </div>
              </Tab>
              <Tab
                className={({ selected }) =>
                  clsx(
                    'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                    'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                    selected
                      ? 'bg-white shadow text-blue-700'
                      : 'text-blue-500 hover:bg-white/[0.12] hover:text-blue-600'
                  )
                }
              >
                <div className="flex items-center justify-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Learning Hub
                </div>
              </Tab>
            </Tab.List>
            <Tab.Panels className="p-4">
              <Tab.Panel>
                <div className="mb-4 p-4 bg-yellow-50 rounded-lg flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-1" />
                  <p className="text-sm text-yellow-700">
                    This AI chatbot is for informational purposes only. Always use your professional judgment.
                  </p>
                </div>

                <div className="space-y-4 mb-4 max-h-[60vh] overflow-y-auto">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      Start a conversation by typing your medical question below
                    </div>
                  ) : (
                    messages.map((message, index) => (
                      <ChatMessage
                        key={index}
                        message={message.text}
                        isBot={message.isBot}
                        isStaff={message.isStaff}
                        isUrgent={message.isUrgent}
                      />
                    ))
                  )}
                  {isLoading && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <LoadingDots />
                    </div>
                  )}
                </div>

                <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
              </Tab.Panel>
              <Tab.Panel>
                <CarePlanGenerator />
              </Tab.Panel>
              <Tab.Panel>
                <MedicalLearning />
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </main>
    </div>
  );
}