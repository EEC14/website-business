import React, { useState, useEffect } from "react";
import {
  Stethoscope,
  User,
  MessageSquare,
  ClipboardList,
  GraduationCap,
  LogOut,
  Building
} from "lucide-react";
import { Tab } from "@headlessui/react";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { LoadingDots } from "./components/LoadingDots";
import { CarePlanGenerator } from "./components/CarePlanGenerator";
import { MedicalLearning } from "./components/MedicalLearning";
import { AuthPage } from "./components/AuthPage";
import { SubscriptionPage } from "./components/SubscriptionPage";
import { AdminDashboard } from './components/admin-dashboard';
import { generateResponse, getUserOrganizationId } from "./services/openai";
import { useAuth } from "./hooks/useAuth";
import { signOut } from "./services/firebase";
import { clsx } from "clsx";
import { hasFeatureAccess } from "./utils/hasFeatureAccess";
import { AccessDeniedPopup } from "./components/AccessDeniedPopup";
import { collection } from "firebase/firestore";
import { firestore } from "firebase-admin";
import { getAuth } from "firebase/auth";
type Message = {
  text: string;
  isBot: boolean;
  isStaff?: boolean;
  isUrgent?: boolean;
};

export default function App() {
  const { user, loading, subscription, isAdmin } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    if (auth.currentUser) {
      getUserOrganizationId(auth.currentUser.uid)
        .then(id => setOrgId(id));
    }
  }, []);

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
      const response = await generateResponse(message, true, orgId);
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
          text: "I apologize, but I'm having trouble connecting. Please try again later.",
          isBot: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

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
      //console.log("Response:", response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      //console.log("Portal URL:", data.url);
      window.location.href = data.url;
    } catch (error) {
      console.error("There was an error!", error);
      alert("Failed to redirect to the billing portal.");
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-white shadow-sm">
        <div className="flex items-center justify-between max-w-6xl px-4 py-4 mx-auto">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-blue-500" />
            <h1 className="text-xl font-bold text-gray-900">HealthChat Business</h1>
          </div>
          <div className="flex items-center gap-4">
            {subscription && (
              <button 
                onClick={handleManageBilling}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Manage subscription
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1 text-sm rounded-full bg-blue-50">
              <User className="w-4 h-4 text-blue-500" />
              <span className="hidden sm:inline">{user.email}</span>
            </div>
            <button
              onClick={() => signOut()}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl p-4 mx-auto">
        <div className="bg-white shadow-lg rounded-2xl">
          <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
            <Tab.List className="flex p-1 space-x-1 rounded-t-2xl bg-blue-50">
              <Tab
                className={({ selected }) =>
                  clsx(
                    "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                    "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                    "transition-all duration-200",
                    selected
                      ? "bg-white shadow text-blue-700"
                      : "text-blue-500 hover:bg-white/[0.12] hover:text-blue-600"
                  )
                }
              >
                <div className="flex items-center justify-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  <span className="hidden sm:inline">Chat Assistant</span>
                </div>
              </Tab>
              <Tab
                className={({ selected }) =>
                  clsx(
                    "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                    "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                    "transition-all duration-200",
                    selected
                      ? "bg-white shadow text-blue-700"
                      : "text-blue-500 hover:bg-white/[0.12] hover:text-blue-600"
                  )
                }
              >
                <div className="flex items-center justify-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  <span className="hidden sm:inline">Care Plan Generator</span>
                </div>
              </Tab>
              <Tab
                className={({ selected }) =>
                  clsx(
                    "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                    "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                    "transition-all duration-200",
                    selected
                      ? "bg-white shadow text-blue-700"
                      : "text-blue-500 hover:bg-white/[0.12] hover:text-blue-600"
                  )
                }
              >
                <div className="flex items-center justify-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  <span className="hidden sm:inline">Learning Hub</span>
                </div>
              </Tab>
              {isAdmin && (
                <Tab
                  className={({ selected }) =>
                    clsx(
                      "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                      "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                      "transition-all duration-200",
                      selected
                        ? "bg-white shadow text-blue-700"
                        : "text-blue-500 hover:bg-white/[0.12] hover:text-blue-600"
                    )
                  }
                >
                  <div className="flex items-center justify-center gap-2">
                    <Building className="w-5 h-5" />
                    <span className="hidden sm:inline">Admin Dashboard</span>
                  </div>
                </Tab>
              )}
            </Tab.List>
            <Tab.Panels className="p-4">
  <Tab.Panel>
    {hasFeatureAccess(subscription.plan, "Chatbot access", false) ? (
      <>
        {/* Disclaimer Banner */}
        <div className="bg-blue-50 p-4 mb-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Medical Disclaimer:</strong> The information provided by this chat assistant is for general informational and educational purposes only. 
            It is not intended to be a substitute for professional medical advice, diagnosis, or treatment. 
            Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
          </p>
        </div>
        <div className="space-y-4 mb-4 max-h-[60vh] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
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
            <div className="p-4 rounded-lg bg-blue-50">
              <LoadingDots />
            </div>
          )}
        </div>
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </>
    ) : (
      <button onClick={() => setShowPopup(true)} className="w-full p-4 text-center text-gray-500">
        Access Denied
      </button>
    )}
  </Tab.Panel>
              
              <Tab.Panel>
                {hasFeatureAccess(subscription.plan, "Plan generators add-on", false) ? (
                  <CarePlanGenerator />
                ) : (
                  <button onClick={() => setShowPopup(true)} className="w-full p-4 text-center text-gray-500">
                    Access Denied
                  </button>
                )}
              </Tab.Panel>
              
              <Tab.Panel>
                {hasFeatureAccess(subscription.plan, "Learning hub add-on", false) ? (
                  <MedicalLearning />
                ) : (
                  <button onClick={() => setShowPopup(true)} className="w-full p-4 text-center text-gray-500">
                    Access Denied
                  </button>
                )}
              </Tab.Panel>
              
              {isAdmin && (
                <Tab.Panel>
                  <AdminDashboard />
                </Tab.Panel>
              )}
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