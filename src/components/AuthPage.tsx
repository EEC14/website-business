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

interface AuthPageProps {
  isAdminSignup?: boolean;
}

export const AuthPage: React.FC<AuthPageProps> = ({ isAdminSignup = false }) => {
  const [isLogin, setIsLogin] = useState(!isAdminSignup); // Force signup mode for admin signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationDomain, setOrganizationDomain] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isOrganizationAdmin, setIsOrganizationAdmin] = useState(isAdminSignup);

  const auth = getAuth();
  const firestore = getFirestore();

  const GLOBAL_ACCESS_CODE = 'HEALTH2024';
  const ADMIN_ACCESS_CODE = 'ADMIN2024'; // Special code for admin signup

  const validateAccessCode = (code: string): boolean => {
    if (isOrganizationAdmin) {
      return code === ADMIN_ACCESS_CODE;
    }
    return code === GLOBAL_ACCESS_CODE;
  };

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
      // Create new organization with subscription initialized
      await setDoc(orgResult.ref, {
        name: organizationName,
        domain: organizationDomain,
        members: [user.email],
        admins: [user.email],
        createdAt: Date.now(),
        subscription: {
          plan: "Free",
          status: "Active",
          seats: 1,
          startedAt: new Date().toISOString(),
          expiresAt: null,
          subscriptionId: null,
          stripeCustomerId: null,
        },
      });
    } else {
      await updateDoc(orgResult.ref, { 
        members: arrayUnion(user.email),
        ...(isOrganizationAdmin && { admins: arrayUnion(user.email) })
      });
    }

    const userProfile = {
      uid: user.uid,
      email: user.email || '',
      createdAt: new Date().toISOString(),
      organizationId: orgResult.id,
      role: isOrganizationAdmin ? 'admin' : 'member',
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
      if (isLogin && !isAdminSignup) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential.user.emailVerified) {
          await sendEmailVerification(userCredential.user);
          throw new Error('Please verify your email. A verification link has been sent.');
        }
      } else {
        if (!termsAccepted) throw new Error('Please accept the Terms of Service and Privacy Policy');
        if (!validateAccessCode(accessCode)) throw new Error('Invalid access code');
        if (isOrganizationAdmin && (!organizationName || !organizationDomain)) {
          throw new Error('Organization name and domain are required for admin signup');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);

        await createUserInFirestore(
          userCredential.user, 
          organizationName || email.split('@')[1], // Use email domain if no org name
          organizationDomain || email.split('@')[1] // Use email domain if no org domain
        );
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of the component (sendPasswordReset function)

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Stethoscope className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-900">HealthChat</h1>
          <p className="mt-2 text-gray-600">
            {isAdminSignup 
              ? 'Create your organization account' 
              : isLogin 
                ? 'Sign in to your account' 
                : 'Create your account'}
          </p>
        </div>

        {error && <div className="bg-red-50 p-4 rounded-lg text-red-700">{error}</div>}
        {resetEmailSent && <div className="bg-green-50 p-4 rounded-lg text-green-700">Password reset email sent!</div>}

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
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {isAdminSignup && (
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
                      className="w-full px-3 py-2 border rounded-lg"
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
                      className="w-full px-3 py-2 border rounded-lg"
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
                  className="h-4 w-4 text-blue-600"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                  I accept the Terms of Service and Privacy Policy
                </label>
              </div>
            </>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
          >
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>

          {!isAdminSignup && (
            <>
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
            </>
          )}
        </form>
      </div>
    </div>
  );
};