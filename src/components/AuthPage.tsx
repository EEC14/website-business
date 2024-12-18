import React, { useState } from 'react';
import { 
  Stethoscope, 
  AlertCircle 
} from 'lucide-react';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection
} from 'firebase/firestore';

const ADMIN_ACCESS_CODE = "ADMIN2024";
const STAFF_ACCESS_CODE = "HEALTHSTAFF2024";

interface AuthComponentProps {
  isAdminSignup?: boolean;
  onComplete?: () => void;
}

export const AuthPage: React.FC<AuthComponentProps> = ({ 
  isAdminSignup = false, 
  onComplete 
}) => {
  const [isLogin, setIsLogin] = useState(!isAdminSignup);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationDomain, setOrganizationDomain] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const auth = getAuth();
  const firestore = getFirestore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        console.log('Attempting login');
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Login successful');
      } else {
        console.log('Starting signup process');
        if (!termsAccepted) {
          throw new Error('Please accept the Terms of Service and Privacy Policy');
        }

        if (isAdminSignup) {
          if (accessCode.toUpperCase().trim() !== ADMIN_ACCESS_CODE) {
            throw new Error('Invalid admin access code');
          }
          if (!organizationName || !organizationDomain) {
            throw new Error('Organization name and domain are required');
          }
        } else {
          const isAdmin = accessCode.toUpperCase().trim() === ADMIN_ACCESS_CODE;
          const isStaff = accessCode.toUpperCase().trim() === STAFF_ACCESS_CODE;
          
          if (!isAdmin && !isStaff) {
            throw new Error('Invalid access code');
          }
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        try {
          await sendEmailVerification(user);
          console.log('Verification email sent');
        } catch (error) {
          console.error('Error sending verification email:', error);
        }

        if (isAdminSignup || accessCode.toUpperCase().trim() === ADMIN_ACCESS_CODE) {
          const orgRef = doc(collection(firestore, 'organizations'));
          await setDoc(orgRef, {
            name: organizationName,
            domain: organizationDomain,
            members: [user.email],
            admins: [user.email],
            createdAt: new Date().toISOString(),
            subscription: {
              plan: "Free",
              status: "Active",
              seats: 1,
              startedAt: new Date().toISOString(),
              expiresAt: null,
              subscriptionId: null,
              stripeCustomerId: null,
            }
          });

          await setDoc(doc(firestore, 'User', user.uid), {
            uid: user.uid,
            email: user.email,
            role: 'admin',
            organizationId: orgRef.id,
            createdAt: new Date().toISOString(),
            subscription: {
              plan: "Free",
              status: "Active",
              startedAt: new Date().toISOString(),
              expiresAt: null,
              subscriptionId: null,
              stripeCustomerId: null,
            },
            accessCodeVerified: true,
          });
        } else {
          await setDoc(doc(firestore, 'User', user.uid), {
            uid: user.uid,
            email: user.email,
            role: 'member',
            createdAt: new Date().toISOString(),
            subscription: {
              plan: "Free",
              status: "Active",
              startedAt: new Date().toISOString(),
              expiresAt: null,
              subscriptionId: null,
              stripeCustomerId: null,
            },
            accessCodeVerified: true,
          });
        }

        if (onComplete) {
          onComplete();
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters long.');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!email) {
      setError('Please enter your email to reset the password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      setError('');
    } catch (error: any) {
      setError('Failed to send reset email. Please check the email address.');
    }
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 p-4 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {resetEmailSent && (
        <div className="bg-green-50 p-4 rounded-lg text-green-700">
          Password reset email sent! Please check your inbox.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            />
          </div>

          {(!isLogin || isAdminSignup) && (
            <>
              <div>
                <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700">
                  {isAdminSignup ? 'Admin Access Code' : 'Access Code'}
                </label>
                <input
                  id="accessCode"
                  type="text"
                  required
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>

              {(isAdminSignup || accessCode.toUpperCase().trim() === ADMIN_ACCESS_CODE) && (
                <>
                  <div>
                    <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                      Organization Name
                    </label>
                    <input
                      id="organizationName"
                      type="text"
                      required
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="organizationDomain" className="block text-sm font-medium text-gray-700">
                      Organization Domain
                    </label>
                    <input
                      id="organizationDomain"
                      type="text"
                      required
                      value={organizationDomain}
                      onChange={(e) => setOrganizationDomain(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      placeholder="example.com"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                  I accept the Terms of Service and Privacy Policy
                </label>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>

          {isLogin && !isAdminSignup && (
            <button
              type="button"
              onClick={sendPasswordReset}
              className="w-full text-sm text-blue-600 hover:text-blue-500"
            >
              Forgot Password?
            </button>
          )}

          {!isAdminSignup && (
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-sm text-blue-600 hover:text-blue-500"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AuthPage;