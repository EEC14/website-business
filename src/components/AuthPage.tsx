import React, { useState } from 'react';
import { 
  Stethoscope, 
  Mail, 
  Lock, 
  AlertCircle, 
  KeyRound, 
  Building 
} from 'lucide-react';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendEmailVerification
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import privacy from '../assets/Privacy_Policy.pdf';
import terms from '../assets/Terms_Of_Service_Business.pdf';

// User Profile Interface
interface UserProfile {
  id: string;
  email: string;
  organizationId: string;
  role: 'member' | 'admin' | 'owner';
  createdAt: number;
  lastLogin?: number;
  status: 'active' | 'invited' | 'suspended';
  currentPlan?: string;
}

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationDomain, setOrganizationDomain] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Firebase instances
  const auth = getAuth();
  const firestore = getFirestore();

  // Validate Access Code
  const validateAccessCode = (code: string): boolean => {
    // Replace with your specific access code validation logic
    const validCodes = ['HEALTH2024', 'MEDSTAFF123'];
    return validCodes.includes(code);
  };

  // Create User in Firestore
  const createUserInFirestore = async (
    user: firebase.User, 
    organizationName: string, 
    organizationDomain: string
  ): Promise<UserProfile> => {
    // Find or create organization
    let organizationId;
    const orgsRef = collection(firestore, 'organizations');
    const orgQuery = query(
      orgsRef, 
      where('domain', '==', organizationDomain)
    );

    const orgSnapshot = await getDocs(orgQuery);

    if (orgSnapshot.empty) {
      // Create new organization if not exists
      const newOrgRef = doc(orgsRef);
      organizationId = newOrgRef.id;

      await setDoc(newOrgRef, {
        name: organizationName,
        domain: organizationDomain,
        members: [user.email],
        admins: [user.email],
        createdAt: Date.now()
      });
    } else {
      // Use existing organization
      organizationId = orgSnapshot.docs[0].id;
    }

    // Prepare user profile
    const userProfile: UserProfile = {
      id: user.uid,
      email: user.email || '',
      organizationId: organizationId,
      role: 'member', // Default role
      createdAt: Date.now(),
      status: 'active',
      currentPlan: 'free_tier' // Default plan
    };

    // Store user profile in Firestore
    const userRef = doc(firestore, 'users', user.uid);
    await setDoc(userRef, userProfile);

    return userProfile;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login process
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Check email verification
        if (!userCredential.user.emailVerified) {
          await sendEmailVerification(userCredential.user);
          throw new Error('Please verify your email. A verification link has been sent.');
        }
      } else {
        // Signup process
        // Validate terms and access code
        if (!termsAccepted) {
          throw new Error('Please accept the Terms of Service and Privacy Policy');
        }

        if (!validateAccessCode(accessCode)) {
          throw new Error('Invalid access code');
        }

        // Validate email domain during signup
        if (!email.endsWith(`@${organizationDomain}`)) {
          throw new Error('Email must match the organization domain');
        }

        // Create user in Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Send email verification
        await sendEmailVerification(userCredential.user);

        // Create user in Firestore
        await createUserInFirestore(
          userCredential.user, 
          organizationName,
          organizationDomain
        );
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Stethoscope className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900">HealthChat</h1>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Medical Staff Portal
          </h2>
          <p className="mt-2 text-gray-600">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-1" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <div className="mt-1 relative">
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {!isLogin && (
            <>
              <div>
                <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700">
                  Organization Name
                </label>
                <div className="mt-1 relative">
                  <input
                    id="organizationName"
                    type="text"
                    required
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Building className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label htmlFor="organizationDomain" className="block text-sm font-medium text-gray-700">
                  Organization Domain
                </label>
                <div className="mt-1 relative">
                  <input
                    id="organizationDomain"
                    type="text"
                    required
                    value={organizationDomain}
                    onChange={(e) => setOrganizationDomain(e.target.value)}
                    placeholder="example.com"
                    className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <Building className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700">
                  Access Code
                </label>
                <div className="mt-1 relative">
                  <input
                    id="accessCode"
                    type="text"
                    required
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <KeyRound className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="terms"
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={() => setTermsAccepted(!termsAccepted)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                  I accept the{' '}
                  <a href={terms} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href={privacy} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                    Privacy Policy
                  </a>
                </label>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
