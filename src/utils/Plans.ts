export const Plans = {
  Basic: {
    link: "https://buy.stripe.com/test_7sIbJC8Vg4oAbq84gg", // Replace with your actual Stripe Checkout link
    priceId: "price_1QU6dgL8IScSUDMoy9A9qaUQ",
    name: "Basic",
    price: 10, // Replace with the actual price if available
    features: ["Chatbot access only"],
  },
  BasicPlusLearningHub: {
    link: "https://buy.stripe.com/test_fZe3d63AWaMYam4aEF", // Replace with your actual Stripe Checkout link
    priceId: "price_1QU6fPL8IScSUDMo2RUiGkD6",
    name: "Basic+ Learning Hub Add-on",
    price: 30, // Replace with the actual price if available
    features: ["Chatbot access", "Learning hub add-on"],
  },
  BasicPlusGenerators: {
    link: "https://buy.stripe.com/test_14kaFy8VgaMY79S6oq", // Replace with your actual Stripe Checkout link
    priceId: "price_1QU6f3L8IScSUDMor9nqsEvJ",
    name: "Basic+ Plan Generators Add-on",
    price: 40, // Replace with the actual price if available
    features: ["Chatbot access", "Plan generators add-on"],
  },

  Pro: {
    link: "https://buy.stripe.com/test_eVa00U1sO3kw1PyfZ1", // Replace with your actual Stripe Checkout link
    priceId: "price_1QU6dxL8IScSUDMo5HxtoaIM",
    name: "Pro",
    price: 50, // Replace with the actual price if available
    features: [
      "Chatbot access",
      "Plan generators add-on",
      "Learning hub add-on",
      "Priority response time",
    ],
  },
};
