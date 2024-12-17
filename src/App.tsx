import React from "react";
import {
  Stethoscope,
  User,
  MessageSquare,
  ClipboardList,
  GraduationCap,
  LogOut,
} from "lucide-react";
import { Tab } from "@headlessui/react";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { LoadingDots } from "./components/LoadingDots";
import { CarePlanGenerator } from "./components/CarePlanGenerator";
import { MedicalLearning } from "./components/MedicalLearning";
import { AuthPage } from "./components/AuthPage";
import { SubscriptionPage } from "./components/SubscriptionPage";
import { generateResponse } from "./services/openai";
import { useAuth } from "./hooks/useAuth";
import { signOut } from "./services/firebase";
import { clsx } from "clsx";
import { hasFeatureAccess } from "./utils/hasFeatureAccess";
import { AccessDeniedPopup } from "./components/AccessDeniedPopup";
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import { AdminDashboard } from './components/admin-dashboard';

type Message = {
  text: string;
  isBot: boolean;
  isStaff?: boolean;
  isUrgent?: boolean;
};

export default function App() {
  const { user, loading, subscription } = useAuth();
  console.log(subscription);

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPopup, setShowPopup] = React.useState(false); // Track if the access denied popup should be shown

  const handleSendMessage = async (message: string) => {
    setMessages((prev) => [
      ...prev,
      {
        text: message,
        isBot: false,
        isStaff: true,
      },
    ]);

    setIsLoading(true);
    try {
      const response = await generateResponse(message, true);

      setMessages((prev) => [
        ...prev,
        {
          text: response.content,
          isBot: true,
          isUrgent: response.requiresDoctor,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          text: "I apologize, but I'm having trouble connecting to my knowledge base. Please try again later.",
          isBot: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <LoadingDots />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (!subscription || subscription.plan === "Free") {
    return <SubscriptionPage userEmail={user.email!} />;
  }

  console.log(user);
  console.log(subscription);
  const handleManageBilling = async () => {
    try {
      const response = await fetch("/.netlify/functions/billingportal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: subscription.stripeCustomerId,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log(data);
      window.location.href = data.url;
    } catch (error) {
      console.error("There was an error!", error);
      alert("Failed to redirect to the billing portal.");
    }
  };

  // Check feature access for each tab
  const canAccessChatbot = hasFeatureAccess(
    subscription.plan,
    "Chatbot access"
  );
  const canAccessCarePlan = hasFeatureAccess(
    subscription.plan,
    "Plan generators add-on"
  );
  const canAccessLearningHub = hasFeatureAccess(
    subscription.plan,
    "Learning hub add-on"
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="flex items-center justify-between max-w-4xl px-4 py-4 mx-auto">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-blue-500" />
            <h1 className="text-xl font-bold text-gray-900">HealthChat Business</h1>
          </div>
          <div className="flex items-center gap-4">
            {subscription && (
              <button className="" onClick={handleManageBilling}>
                Manage subscription
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1 text-sm rounded-full bg-blue-50">
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

      <main className="max-w-4xl p-4 mx-auto">
        <div className="bg-white shadow-lg rounded-2xl">
          <Tab.Group>
            <Tab.List className="flex p-1 space-x-1 rounded-t-2xl bg-blue-50">
              <Tab
                className={({ selected }) =>
                  clsx(
                    "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                    "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                    selected
                      ? "bg-white shadow text-blue-700"
                      : "text-blue-500 hover:bg-white/[0.12] hover:text-blue-600"
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
                    "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                    "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                    selected
                      ? "bg-white shadow text-blue-700"
                      : "text-blue-500 hover:bg-white/[0.12] hover:text-blue-600"
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
                    "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                    "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                    selected
                      ? "bg-white shadow text-blue-700"
                      : "text-blue-500 hover:bg-white/[0.12] hover:text-blue-600"
                  )
                }
              >
                <div className="flex items-center justify-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Learning Hub
                </div>
              </Tab>
              <Tab
                className={({ selected }) =>
                  clsx(
                    "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                    "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                    selected
                      ? "bg-white shadow text-blue-700"
                      : "text-blue-500 hover:bg-white/[0.12] hover:text-blue-600"
                  )
                }
              >
                <div className="flex items-center justify-center gap-2">
                  Admin dashboard
                </div>
              </Tab>
            </Tab.List>
            <Tab.Panels className="p-4">
              <Tab.Panel>
                {canAccessChatbot ? (
                  <div className="space-y-4 mb-4 max-h-[60vh] overflow-y-auto">
                    {messages.length === 0 ? (
                      <div className="py-8 text-center text-gray-500">
                        Start a conversation by typing your medical question
                        below
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
                      <div className="p-4 rounded-lg bg-blue-50">
                        <LoadingDots />
                      </div>
                    )}
                  </div>
                ) : (
                  <button onClick={() => setShowPopup(true)}>
                    Access Denied
                  </button>
                )}
                <ChatInput
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                />
              </Tab.Panel>
              <Tab.Panel>
                {canAccessCarePlan ? (
                  <CarePlanGenerator />
                ) : (
                  <button onClick={() => setShowPopup(true)}>
                    Access Denied
                  </button>
                )}
              </Tab.Panel>
              <Tab.Panel>
                {canAccessLearningHub ? (
                  <MedicalLearning />
                ) : (
                  <button onClick={() => setShowPopup(true)}>
                    Access Denied
                  </button>
                )}
              </Tab.Panel>
              <Tab.panel>
                <AdminDashboard />
              </Tab.panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </main>

      {showPopup && (
        <AccessDeniedPopup
          onClose={() => setShowPopup(false)}
          handleManageBilling={handleManageBilling}
        />
      )}
    </div>
  );
}
