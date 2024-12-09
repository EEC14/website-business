import React from 'react';
import { Stethoscope, Check } from 'lucide-react';

export const SubscriptionPage: React.FC = () => {
  React.useEffect(() => {
    // Load Stripe script
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/buy-button.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Stethoscope className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900">HealthChat</h1>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Subscribe to Access Premium Features
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Join our community of healthcare professionals and get access to advanced AI-powered medical assistance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-6">Premium Features Include:</h3>
            <ul className="space-y-4">
              {[
                'Advanced Medical AI Assistant',
                'Personalized Care Plan Generator',
                'Interactive Medical Learning Hub',
                'Real-time Clinical Decision Support',
                'Comprehensive Patient Data Analysis',
                'Priority Support'
              ].map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-6">Subscribe Now</h3>
            <stripe-buy-button
              buy-button-id="buy_btn_1QQAAlGuEHc4ZQvQfTs7SHgZ"
              publishable-key="pk_test_51QPS8zGuEHc4ZQvQrSAarmHxaqVYHAgf6D4Q5gqWCwen8Xzq5EQWU5na6LegaHt8sUgQycmzEOulCpCej4cgvKBz00sLVTfmOj"
            >
            </stripe-buy-button>
          </div>
        </div>
      </div>
    </div>
  );
};