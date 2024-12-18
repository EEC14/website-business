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
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';

const ADMIN_ACCESS_CODE = "ADMIN2024";
const STAFF_ACCESS_CODE = "HEALTHSTAFF2024";

interface AuthPageProps {
  isAdminSignup?: boolean;
  onComplete?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ isAdminSignup = false, onComplete }) => {
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

  console.log('AuthPage render state:', { isLogin, isAdminSignup, loading });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submit triggered');
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        console.log('Attempting sign in with:', { email });
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Sign in successful:', userCredential);
      } else {
        console.log('Starting signup process');
        if (!termsAccepted) {
          throw new Error('Please accept the Terms of Service and Privacy Policy');
        }

        const isAdmin = accessCode.toUpperCase().trim() === ADMIN_ACCESS_CODE;
        const isStaff = accessCode.toUpperCase().trim() === STAFF_ACCESS_CODE;

        if (!isAdmin && !isStaff) {
          throw new Error('Invalid access code');
        }

        if ((isAdmin || isAdminSignup) && (!organizationName || !organizationDomain)) {
          throw new Error('Organization name and domain are required for admin signup');
        }

        console.log('Creating user account');
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('User account created');

        try {
          await sendEmailVerification(userCredential.user);
          console.log('Verification email sent');
        } catch (verificationError) {
          console.error('Error sending verification:', verificationError);
        }

        const user = userCredential.user;
        
        if (isAdmin || isAdminSignup) {
          console.log('Creating organization');
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
          console.log('Organization created');

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
          console.log('Admin user document created');
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
          console.log('Regular user document created');
        }

        if (onComplete) {
          onComplete();
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
      console.log('Auth attempt completed');
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Stethoscope className="mx-auto h-12 w-12 text-blue-500" />
          <h1 className="mt-2 text-3xl font-bold text-gray-900">HealthChat</h1>
          <p className="mt-2 text-gray-600">
            {isAdminSignup 
              ? 'Complete your organization setup'
              : isLogin 
                ? 'Sign in to your account' 
                : 'Create your account'}
          </p>
        </div>

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

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>

          {isLogin && !isAdminSignup && (
            <div className="text-center">
              <button
                type="button"
                onClick={sendPasswordReset}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {!isAdminSignup && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};