import React, { useState, useEffect } from 'react';
import {
  getFirestore,
  doc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  arrayUnion,
  setDoc,
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { UserPlus, Trash2 } from 'lucide-react';

// Generate a random password
const generateRandomPassword = () => {
  return Math.random().toString(36).slice(2, 10) + 'A1!';
};

export const AdminDashboard: React.FC = () => {
  const [organization, setOrganization] = useState<any>(null);
  const [userProfiles, setUserProfiles] = useState<any[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'member' | 'admin'>('member');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const auth = getAuth();
  const firestore = getFirestore();

  // Fetch organization and user profiles
  useEffect(() => {
    const fetchOrganizationAndUsers = async (userEmail: string) => {
      try {
        setIsLoading(true);

        // Fetch the organization
        const orgRef = collection(firestore, 'organizations');
        const orgQuery = query(orgRef, where('admins', 'array-contains', userEmail));
        const querySnapshot = await getDocs(orgQuery);

        if (!querySnapshot.empty) {
          const orgData = querySnapshot.docs[0].data();
          setOrganization(orgData);

          // Fetch user profiles for members
          const userQuery = query(
            collection(firestore, 'User'),
            where('email', 'in', orgData.members)
          );
          const userSnapshot = await getDocs(userQuery);

          const profiles = userSnapshot.docs.map((doc) => doc.data());
          setUserProfiles(profiles);
        } else {
          throw new Error('You are not authorized to access this dashboard.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load organization data.');
      } finally {
        setIsLoading(false);
      }
    };

    const user = auth.currentUser;
    if (user?.email) fetchOrganizationAndUsers(user.email);
    else setError('You must be logged in to access this page.');
  }, [auth, firestore]);

  // Invite a new member and display the password
  const inviteMember = async () => {
    if (!organization) return;

    try {
      setError('');
      const orgRef = doc(firestore, 'organizations', organization.id);

      // Check if email matches organization domain
      if (!newMemberEmail.endsWith(`@${organization.domain}`)) {
        throw new Error(`Email must match organization domain: ${organization.domain}`);
      }

      // Step 1: Generate temporary password
      const tempPassword = generateRandomPassword();

      // Step 2: Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, newMemberEmail, tempPassword);
      await sendEmailVerification(userCredential.user);

      // Step 3: Add user to Firestore
      const userProfile = {
        uid: userCredential.user.uid,
        email: newMemberEmail,
        role: selectedRole,
        organizationId: organization.id,
        subscription: { plan: 'Free', status: 'Active' },
        status: 'invited',
        createdAt: new Date().toISOString(),
      };
      const userRef = doc(firestore, 'User', userCredential.user.uid);
      await setDoc(userRef, userProfile);

      // Step 4: Update organization members and admins
      await updateDoc(orgRef, {
        members: arrayUnion(newMemberEmail),
        ...(selectedRole === 'admin' && { admins: arrayUnion(newMemberEmail) }),
      });

      // Step 5: Log in as the new user temporarily
      const authInstance = getAuth();
      await signInWithEmailAndPassword(authInstance, newMemberEmail, tempPassword);

      // Step 6: Open the new user page in another tab
      const userPageURL = `/user-dashboard`; // Replace with the actual route
      window.open(userPageURL, '_blank');

      // Step 7: Re-authenticate the admin
      const currentUser = auth.currentUser;
      if (currentUser) {
        await authInstance.signOut();
        await signInWithEmailAndPassword(authInstance, currentUser.email!, 'admin-password');
      }

      // Show success message and temporary password
      setGeneratedPassword(tempPassword);
      setNewMemberEmail('');
      setSelectedRole('member');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite member.');
    }
  };

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;
  if (!organization) return <div>No organization found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard - {organization.name}</h1>

      {/* Invite Section */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="email"
          placeholder={`Invite new member (must use @${organization.domain})`}
          value={newMemberEmail}
          onChange={(e) => setNewMemberEmail(e.target.value)}
          className="flex-1 border p-2 rounded-lg"
        />
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as 'member' | 'admin')}
          className="border p-2 rounded-lg"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <button
          onClick={inviteMember}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-1"
        >
          <UserPlus /> Invite
        </button>
      </div>

      {/* Show Generated Password */}
      {generatedPassword && (
        <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-4">
          User invited successfully! Temporary Password: <strong>{generatedPassword}</strong>
        </div>
      )}

      {/* Organization Members Table */}
      <table className="w-full border-collapse border text-left">
        <thead>
          <tr>
            <th className="border-b p-2">Email</th>
            <th className="border-b p-2">Role</th>
          </tr>
        </thead>
        <tbody>
          {userProfiles.map((user) => (
            <tr key={user.email}>
              <td className="p-2">{user.email}</td>
              <td className="p-2">{user.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


