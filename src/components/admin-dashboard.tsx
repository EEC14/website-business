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
} from 'firebase/auth';
import { UserPlus, Trash2 } from 'lucide-react';

// Interfaces
interface UserProfile {
  email: string;
  role: string;
  plan: string;
}

interface Organization {
  id: string;
  name: string;
  domain: string;
  admins: string[];
  members: string[];
}

export const AdminDashboard: React.FC = () => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'member' | 'admin'>('member');
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
          const orgData = querySnapshot.docs[0].data() as Organization;
          setOrganization(orgData);

          // Fetch user profiles for members
          const userQuery = query(
            collection(firestore, 'User'),
            where('email', 'in', orgData.members)
          );
          const userSnapshot = await getDocs(userQuery);

          const profiles: UserProfile[] = userSnapshot.docs.map((doc) => ({
            email: doc.data().email,
            role: doc.data().role,
            plan: doc.data().subscription?.plan || 'Free',
          }));
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

  // Function to invite a new member
  const inviteMember = async () => {
    if (!organization) return;

    try {
      setError('');
      const orgRef = doc(firestore, 'organizations', organization.id);

      if (!newMemberEmail.endsWith(`@${organization.domain}`)) {
        throw new Error(`Email must match organization domain: ${organization.domain}`);
      }

      // Step 1: Create the user in Firebase Authentication
      const tempPassword = 'TempPassword123!';
      const userCredential = await createUserWithEmailAndPassword(auth, newMemberEmail, tempPassword);
      await sendEmailVerification(userCredential.user);

      // Step 2: Add user to Firestore User collection
      const userProfile = {
        uid: userCredential.user.uid,
        email: newMemberEmail,
        createdAt: new Date().toISOString(),
        organizationId: organization.id,
        role: selectedRole,
        subscription: { plan: 'Free', status: 'Active' },
        status: 'invited',
      };
      const userRef = doc(firestore, 'User', userCredential.user.uid);
      await setDoc(userRef, userProfile);

      // Step 3: Update organization members and admins
      await updateDoc(orgRef, {
        members: arrayUnion(newMemberEmail),
        ...(selectedRole === 'admin' && { admins: arrayUnion(newMemberEmail) }),
      });

      // Update local state
      setUserProfiles([...userProfiles, { email: newMemberEmail, role: selectedRole, plan: 'Free' }]);
      setOrganization((prev) =>
        prev
          ? {
              ...prev,
              members: [...prev.members, newMemberEmail],
              ...(selectedRole === 'admin' && { admins: [...prev.admins, newMemberEmail] }),
            }
          : null
      );

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

      {/* Invite Member Section */}
      <div className="flex items-center gap-2 mb-6">
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

      {/* Members Table */}
      <table className="w-full border-collapse border text-left">
        <thead>
          <tr>
            <th className="border-b p-2">Email</th>
            <th className="border-b p-2">Role</th>
            <th className="border-b p-2">Plan</th>
            <th className="border-b p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {userProfiles.map((profile) => (
            <tr key={profile.email} className="hover:bg-gray-50">
              <td className="p-2">{profile.email}</td>
              <td className="p-2">{profile.role}</td>
              <td className="p-2">{profile.plan}</td>
              <td className="p-2">
                {organization.admins.includes(profile.email) ? (
                  <span className="text-gray-400">Cannot Remove Admin</span>
                ) : (
                  <button
                    onClick={() => console.log('Remove member:', profile.email)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="inline-block mr-1" /> Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


