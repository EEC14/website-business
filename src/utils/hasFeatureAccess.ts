export function hasFeatureAccess(
  subscriptionPlan:
    | "Basic"
    | "Basic+ Learning Hub Add-on"
    | "Basic+ Plan Generators Add-on"
    | "Pro",
  feature: string
): boolean {
  const planFeatures = {
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
