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
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const auth = getAuth();
  const firestore = getFirestore();

  const GLOBAL_ACCESS_CODE = 'HEALTH2024';

  const validateAccessCode = (code: string): boolean => code === GLOBAL_ACCESS_CODE;

  const findOrCreateOrganization = async (organizationName: string, organizationDomain: string) => {
    const orgsRef = collection(firestore, 'organizations');
    const orgQuery = query(orgsRef, where('domain', '==', organizationDomain));
    const orgSnapshot = await getDocs(orgQuery);

    if (orgSnapshot.empty) {
      const newOrgRef = doc(orgsRef);
      return { id: newOrgRef.id, isNew: true, ref: newOrgRef };
    } else {
      const existingOrg = orgSnapshot.docs[0];
      return { id: existingOrg.id, isNew: false, ref: existingOrg.ref };
    }
  };

  const createUserInFirestore = async (user: firebase.User, organizationName: string, organizationDomain: string) => {
    const orgResult = await findOrCreateOrganization(organizationName, organizationDomain);

    if (orgResult.isNew) {
      await setDoc(orgResult.ref, {
        name: organizationName,
        domain: organizationDomain,
        members: [user.email],
        admins: [user.email],
        createdAt: Date.now()
      });
    } else {
      await updateDoc(orgResult.ref, { members: arrayUnion(user.email) });
    }

    const userProfile = {
      uid: user.uid,
      email: user.email || '',
      createdAt: new Date().toISOString(),
      organizationId: orgResult.id,
      role: 'member',
      subscription: {
        plan: "Free",
        status: "Active",
        startedAt: new Date().toISOString(),
        expiresAt: null,
        subscriptionId: null,
        stripeCustomerId: null,
      },
      accessCodeVerified: true,
    };

    const userRef = doc(firestore, 'User', user.uid);
    await setDoc(userRef, userProfile);
    return userProfile;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential.user.emailVerified) {
          await sendEmailVerification(userCredential.user);
          throw new Error('Please verify your email. A verification link has been sent.');
        }
      } else {
        if (!termsAccepted) throw new Error('Please accept the Terms of Service and Privacy Policy');
        if (!validateAccessCode(accessCode)) throw new Error('Invalid access code');

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);

        await createUserInFirestore(userCredential.user, organizationName, organizationDomain);
      }
    } catch (error: any) {
      setError(error.message);
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Stethoscope className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-900">HealthChat</h1>
          <p className="mt-2 text-gray-600">
            {isLogin ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {error && <div className="bg-red-50 p-4 rounded-lg text-red-700">{error}</div>}
        {resetEmailSent && <div className="bg-green-50 p-4 rounded-lg text-green-700">Password reset email sent! Please check your inbox.</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded-lg">
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>

          {isLogin && (
            <div className="text-center mt-2">
              <button type="button" onClick={sendPasswordReset} className="text-sm text-blue-600">
                Forgot Password?
              </button>
            </div>
          )}

          <div className="text-center">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-blue-600">
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
