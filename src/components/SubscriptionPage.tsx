import { Stethoscope } from "lucide-react";
import { Plans } from "../utils/Plans";

export const SubscriptionPage = ({ userEmail }: { userEmail: string }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="w-full max-w-5xl space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Stethoscope className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900">HealthChat</h1>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Medical Staff Subscription
          </h2>
          <p className="mt-2 text-gray-600">
            Choose the plan that suits your needs and access the medical staff
            portal today.
          </p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow-lg">
          <div className="mb-6">
            <h3 className="mb-2 text-lg font-semibold">
              Subscription Benefits:
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li>✓ Access to advanced medical AI assistance</li>
              <li>✓ Personalized care plan generation</li>
              <li>✓ Medical learning resources</li>
              <li>✓ Priority support</li>
            </ul>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Object.values(Plans).map((plan) => (
            <div
              key={plan.priceId}
              className="flex flex-col justify-between p-6 transition-shadow duration-300 bg-white rounded-lg shadow-md hover:shadow-lg"
            >
              <div className="">
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-lg font-semibold text-blue-500">
                  ${plan.price}/month
                </p>
                <ul className="mt-4 space-y-2 text-gray-600">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="text-blue-500">✓</span> {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href={`${plan.link}?prefilled_email=${userEmail}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-2 mt-6 text-center text-white transition duration-300 bg-blue-500 rounded-md hover:bg-blue-600"
              >
                Subscribe
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
