export function hasFeatureAccess(
  subscriptionPlan:
    | "Basic"
    | "Basic+ Learning Hub Add-on"
    | "Basic+ Plan Generators Add-on"
    | "Pro"
    | "Free",
  feature: string,
  isSettingUpOrg: boolean = false
): boolean {
  // During org setup, only allow access to admin dashboard
  if (isSettingUpOrg) {
    return feature === "Admin dashboard";
  }

  const planFeatures = {
    Free: [],
    Basic: ["Chatbot access"],
    "Basic+ Learning Hub Add-on": ["Chatbot access", "Learning hub add-on"],
    "Basic+ Plan Generators Add-on": [
      "Chatbot access",
      "Plan generators add-on",
    ],
    Pro: [
      "Chatbot access",
      "Plan generators add-on",
      "Learning hub add-on",
      "Priority response time",
    ],
  };

  return planFeatures[subscriptionPlan]?.includes(feature) || false;
}