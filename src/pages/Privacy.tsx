import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Privacy: React.FC = () => {
  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to="/signup"
          className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign Up</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
        
        <div className="prose prose-blue max-w-none">
          <h2>1. Introduction</h2>
          <p>
            This Privacy Policy outlines the practices and principles regarding the collection, processing,
            and storage of data when interacting with HealthChat (the “Service”). By using the Service,
            users agree to the processing of their data as outlined in this policy.
          </p>

          <h2>2. Data Collection</h2>
          <p>
            We may collect the following types of data:
          </p>
          <ul>
            <li>User Data: Includes, but is not limited to, identifying information such as names, contact
                details, and other information submitted during use.
            </li>
            <li>Interaction Data: Includes all data entered into the chatbot, including sensitive or non-sensitive data.</li>
            <li>Technical Data: Device identifiers, IP addresses, browsing behaviors, cookies, and other metadata.</li>
          </ul>

          <h2>3. Purpose of Data Use</h2>
          <p>
            The data collected may be used for purposes including, but not limited to:
          </p>
          <ul>
            <li>Enhancing the Service’s functionality and user experience.</li>
            <li>Developing and commercializing insights derived from user interactions.</li>
            <li>Ensuring compliance with applicable laws and regulations.</li>
            <li>Marketing and advertising, subject to applicable permissions.</li>
          </ul>

          <h2>4. Legal Basis for Processing</h2>
          <p>
            The legal basis for processing data is determined on a case-by-case basis and may include
            user consent, performance of a contract, compliance with legal obligations, or legitimate
            interests pursued by the business.
          </p>

          <h2>5. Data Sharing and Transfers</h2>
          <p>
            We may share or transfer data to:
          </p>
          <ul>
            <li>Third-party service providers, vendors, or contractors for operational purposes.</li>
            <li>Affiliates, business partners, and advertisers.</li>
            <li>Governmental authorities as required by law</li>
            <li>Buyers or successors in the event of a business sale, merger, or acquisition.</li>
          </ul>
          <p>Where data is transferred outside the EEA, appropriate safeguards such as Standard Contractual Clauses may apply.</p>
          
          <h2>6. Retention of Data</h2>
          <p>
            Data will be retained for as long as necessary to fulfill the purposes for which it was
            collected or for longer periods where legally required or operationally advantageous.
          </p>

          <h2>7. Cookies and Tracking Technologies</h2>
          <p>
            We may use cookies, web beacons, and other tracking technologies to collect data about
            user behavior and preferences. Users can manage or restrict cookies via their browser
            settings.
          </p>

          <h2>8. User Rights</h2>
          <p>
            Users may have rights under applicable law, such as:
          </p>
          <ul>
            <li>Accessing their data.</li>
            <li>Requesting rectification or deletion of data (where feasible).</li>
            <li>Objecting to or restricting certain processing activities.</li>
          </ul>  
          <p>Requests must be submitted via e-mail, and we reserve the right to deny requests where
              legally permissible.
          </p>

          <h2>9. Data Security</h2>
          <p>
            While we implement standard security measures, no system is completely secure. Users
            acknowledge and accept that the provision of data is at their own risk.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We reserve the right to update or modify this policy at any time without prior notice. The
            latest version will be published on the website or Service. Continued use of the Service
            constitutes acceptance of the updated terms.
          </p>

          <h2>11. Contact Information</h2>
          <p>
            For inquiries regarding this Privacy Policy, contact:
          </p>
          <ul>
            <li>Email: compliance@esbhealthcare.com</li>
            <li>Address: 1 Maple Road, Stockport SK7 2DH, GB</li>
          </ul>         
        </div>
      </div>
    </main>
  );
};

export default Privacy;
