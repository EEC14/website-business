import React from 'react';
import { Stethoscope } from 'lucide-react';

export const SubscriptionPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Stethoscope className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900">HealthChat</h1>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Medical Staff Subscription
          </h2>
          <p className="mt-2 text-gray-600">
            Subscribe to access the medical staff portal
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Subscription Benefits:</h3>
            <ul className="space-y-2 text-gray-600">
              <li>✓ Access to advanced medical AI assistance</li>
              <li>✓ Personalized care plan generation</li>
              <li>✓ Medical learning resources</li>
              <li>✓ Priority support</li>
            </ul>
          </div>
          
          <script async src="https://js.stripe.com/v3/buy-button.js"></script>
          <stripe-buy-button
            buy-button-id="buy_btn_1QQAAlGuEHc4ZQvQfTs7SHgZ"
            publishable-key="pk_test_51QPS8zGuEHc4ZQvQrSAarmHxaqVYHAgf6D4Q5gqWCwen8Xzq5EQWU5na6LegaHt8sUgQycmzEOulCpCej4cgvKBz00sLVTfmOj"
          ></stripe-buy-button>
        </div>
      </div>
    </div>
  );
};