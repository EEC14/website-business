import { useState } from "react";
import { Stethoscope } from "lucide-react";
import { Plans } from "../utils/Plans";

interface SubscriptionPageProps {
  userEmail: string;
}

export const SubscriptionPage = ({ userEmail }: SubscriptionPageProps) => {
  // State for managing selected seats for each plan
  const [seatsByPlan, setSeatsByPlan] = useState<Record<string, number>>(() => {
    // Initialize with 1 seat for each plan
    return Object.values(Plans).reduce((acc, plan) => ({
      ...acc,
      [plan.priceId]: 1
    }), {});
  });

  const updateSeats = (priceId: string, seats: number) => {
    setSeatsByPlan(prev => ({
      ...prev,
      [priceId]: Math.max(1, seats) // Ensure minimum of 1 seat
    }));
  };

  const calculatePlanPrice = (plan: typeof Plans[keyof typeof Plans], seats: number) => {
    return plan.price + (seats - 1) * (plan.additionalSeatPrice || plan.price);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Stethoscope className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900">HealthChat</h1>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Choose Your Plan
          </h2>
          <p className="mt-2 text-gray-600">
            Select the plan and number of seats that best suit your organization's needs.
          </p>
        </div>

        {/* Benefits Section */}
        <div className="p-6 bg-white rounded-lg shadow-lg">
          <div className="mb-6">
            <h3 className="mb-2 text-lg font-semibold">
              All Plans Include:
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-blue-500">✓</span>
                Access to advanced medical AI assistance
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">✓</span>
                Medical learning resources
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">✓</span>
                Dedicated support
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-500">✓</span>
                Team management features
              </li>
            </ul>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Object.values(Plans).map((plan) => (
            <div
              key={plan.priceId}
              className="flex flex-col justify-between p-6 transition-shadow duration-300 bg-white rounded-lg shadow-md hover:shadow-lg"
            >
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="mt-2 text-lg font-semibold text-blue-500">
                    ${plan.price}/month
                  </p>
                  {plan.additionalSeatPrice && (
                    <p className="text-sm text-gray-600">
                      ${plan.additionalSeatPrice}/month per additional seat
                    </p>
                  )}
                </div>

                <ul className="space-y-2 text-gray-600">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="text-blue-500">✓</span> {feature}
                    </li>
                  ))}
                </ul>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Number of Seats
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={seatsByPlan[plan.priceId]}
                    onChange={(e) => updateSeats(plan.priceId, parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-sm text-gray-600">
                    Total: ${calculatePlanPrice(plan, seatsByPlan[plan.priceId])}/month
                  </p>
                </div>
              </div>

              <a
                href={`${plan.link}?prefilled_email=${userEmail}&quantity=${seatsByPlan[plan.priceId]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2 mt-6 text-center text-white transition duration-300 bg-blue-500 rounded-md hover:bg-blue-600"
              >
                Subscribe
              </a>
            </div>
          ))}
        </div>

        {/* Additional Information */}
        <div className="p-6 mt-8 text-center text-gray-600">
          
          <p className="mt-2">
            Need more seats or have questions?{" "}
            <a href="mailto:support@healthchat.com" className="text-blue-500 hover:text-blue-600">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;