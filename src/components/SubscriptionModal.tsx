import React from 'react';
import { X } from 'lucide-react';

interface SubscriptionModalProps {
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ onClose }) => {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Subscribe to Continue</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-gray-600 mb-6">
          Please subscribe to access the full features of HealthChat.
        </p>

        <stripe-buy-button
          buy-button-id="buy_btn_1QQAAlGuEHc4ZQvQfTs7SHgZ"
          publishable-key="pk_test_51QPS8zGuEHc4ZQvQrSAarmHxaqVYHAgf6D4Q5gqWCwen8Xzq5EQWU5na6LegaHt8sUgQycmzEOulCpCej4cgvKBz00sLVTfmOj"
        >
        </stripe-buy-button>
      </div>
    </div>
  );
};