import React, { useState } from "react";
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
import { generateResponse } from "./services/openai";
import { useAuth } from "./hooks/useAuth";
import { signOut } from "./services/firebase";
import { clsx } from "clsx";
import { hasFeatureAccess } from "./utils/hasFeatureAccess";
import { AccessDeniedPopup } from "./components/AccessDeniedPopup";

type Message = {
  text: string;
  isBot: boolean;
  isStaff?: boolean;
  isUrgent?: boolean;
};

export default function App() {
  const { user, loading, subscription, isAdmin } = useAuth();
  const [isSettingUpOrg, setIsSettingUpOrg] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  console.log('App render state:', { user, loading, subscription, isAdmin });

  const handleSendMessage = async (message: string) => {
    // ... existing handleSendMessage code ...
  };

  if (loading) {
    console.log('App is loading');
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <LoadingDots />
      </div>
    );
  }

  if (!user) {
    console.log('No user, showing AuthPage');
    return <AuthPage />;
  }

  // Handle admin organization setup
  if (isAdmin && (!subscription || subscription.plan === "Free")) {
    console.log('Admin without subscription, showing setup');
    if (!isSettingUpOrg) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Organization Setup</h2>
            <p className="mb-4">Welcome! You need to set up your organization before proceeding.</p>
            <button
              onClick={() => setIsSettingUpOrg(true)}
              className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Set up organization now
            </button>
          </div>
        </div>
      );
    }
    return <AuthPage isAdminSignup={true} />;
  }

  // Regular user subscription check
  if (!subscription || subscription.plan === "Free") {
    console.log('No subscription, showing SubscriptionPage');
    return <SubscriptionPage userEmail={user.email!} />;
  }

  console.log('Showing main app');

  // Handle admin organization setup
  if (isAdmin && (!subscription || subscription.plan === "Free")) {
    if (!isSettingUpOrg) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-6">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Building className="w-8 h-8 text-blue-500" />
              <h2 className="text-2xl font-bold">Organization Setup</h2>
            </div>
            <p className="mb-6 text-center text-gray-600">
              Welcome! Please complete your organization setup to continue.
            </p>
            <button
              onClick={() => setIsSettingUpOrg(true)}
              className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Set up organization now
            </button>
          </div>
        </div>
      );
    }
    return <AuthPage isAdminSignup={true} />;
  }

  // Regular user subscription check
  if (!subscription || subscription.plan === "Free") {
    return <SubscriptionPage userEmail={user.email!} />;
  }

  // Check feature access for each tab
  const canAccessChatbot = hasFeatureAccess(subscription.plan, "Chatbot access", false);
  const canAccessCarePlan = hasFeatureAccess(subscription.plan, "Plan generators add-on", false);
  const canAccessLearningHub = hasFeatureAccess(subscription.plan, "Learning hub add-on", false);
  const canAccessAdminDashboard = isAdmin;

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
                {canAccessChatbot ? (
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
                ) : (
                  <button onClick={() => setShowPopup(true)} className="w-full p-4 text-center text-gray-500">
                    Access Denied
                  </button>
                )}
                <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
              </Tab.Panel>
              
              <Tab.Panel>
                {canAccessCarePlan ? (
                  <CarePlanGenerator />
                ) : (
                  <button onClick={() => setShowPopup(true)} className="w-full p-4 text-center text-gray-500">
                    Access Denied
                  </button>
                )}
              </Tab.Panel>
              
              <Tab.Panel>
                {canAccessLearningHub ? (
                  <MedicalLearning />
                ) : (
                  <button onClick={() => setShowPopup(true)} className="w-full p-4 text-center text-gray-500">
                    Access Denied
                  </button>
                )}
              </Tab.Panel>
              
              {isAdmin && (
                <Tab.Panel>
                  {canAccessAdminDashboard ? (
                    <AdminDashboard onSetupComplete={() => setIsSettingUpOrg(false)} />
                  ) : (
                    <button onClick={() => setShowPopup(true)} className="w-full p-4 text-center text-gray-500">
                      Access Denied
                    </button>
                  )}
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