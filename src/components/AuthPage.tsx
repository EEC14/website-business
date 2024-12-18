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
  collection,
  getFirestore, 
  doc, 
  setDoc
} from 'firebase/firestore';
import privacy from '../assets/Privacy_Policy.pdf';
import terms from '../assets/Terms_Of_Service_Business.pdf';
const ADMIN_ACCESS_CODE = "ADMIN2024";
const STAFF_ACCESS_CODE = "HEALTHSTAFF2024";

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const auth = getAuth();
  const firestore = getFirestore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submit triggered');
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
  
        const isAdmin = accessCode.toUpperCase().trim() === ADMIN_ACCESS_CODE;
        const isStaff = accessCode.toUpperCase().trim() === STAFF_ACCESS_CODE;
        
        if (!isAdmin && !isStaff) {
          throw new Error('Invalid access code');
        }
  
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('User account created');
  
        try {
          await sendEmailVerification(userCredential.user);
          console.log('Verification email sent');
        } catch (verificationError) {
          console.error('Error sending verification:', verificationError);
        }
  
        const user = userCredential.user;
        
        if (isAdmin) {
          console.log('Setting up admin account and organization');
          
          // Create organization first
          const orgRef = doc(collection(firestore, 'organizations'));
          const orgDomain = email.split('@')[1];
          
          await setDoc(orgRef, {
            name: orgDomain.split('.')[0], // Use domain name as org name initially
            domain: orgDomain,
            members: [email],
            admins: [email],
            createdAt: new Date().toISOString(),
            subscription: {
              plan: "Free",
              status: "Active",
              seats: 1,
              usedSeats: 1,
              startedAt: new Date().toISOString(),
              expiresAt: null,
              subscriptionId: null,
              stripeCustomerId: null,
            }
          });
          
          console.log('Organization created, creating admin user document');
  
          // Create admin user with organization reference
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
          
          console.log('Admin setup completed');
        } else {
          // Regular user signup
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
            {isLogin ? 'Sign in to your account' : 'Create your account'}
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

            {!isLogin && (
              <>
                <div>
                  <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700">
                    Access Code
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

                <div className="flex items-center">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                    I accept the{" "}
                    <a 
                      href={terms}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href={privacy}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Privacy Policy
                    </a>
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

            {isLogin && (
              <button
                type="button"
                onClick={sendPasswordReset}
                className="w-full text-sm text-blue-600 hover:text-blue-500"
              >
                Forgot Password?
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-sm text-blue-600 hover:text-blue-500"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;