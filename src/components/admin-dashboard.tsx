import React, { useState, useEffect } from 'react';
import {
  getFirestore,
  doc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { UserPlus, Trash2 } from 'lucide-react';

// Interfaces
interface Organization {
  id: string;
  name: string;
  domain: string;
  admins: string[];
  members: string[];
}

export const AdminDashboard: React.FC = () => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const auth = getAuth();
  const firestore = getFirestore();

  // Fetch organization where user is in the 'admins' array
  useEffect(() => {
    const fetchOrganization = async (userEmail: string) => {
      try {
        const orgRef = collection(firestore, 'organizations');
        const orgQuery = query(orgRef, where('admins', 'array-contains', userEmail));
        const querySnapshot = await getDocs(orgQuery);

        if (!querySnapshot.empty) {
          const orgData = querySnapshot.docs[0].data() as Organization;
          setOrganization(orgData);
        } else {
          throw new Error('You are not authorized to access this dashboard.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load organization data.');
      } finally {
        setIsLoading(false);
      }
    };

    onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        fetchOrganization(user.email);
      } else {
        setError('You must be logged in to access this page.');
        setIsLoading(false);
      }
    });
  }, [auth, firestore]);

  // Function to invite a new member
  const inviteMember = async () => {
    if (!organization) return;
    try {
      const orgRef = doc(firestore, 'organizations', organization.id);

      if (!newMemberEmail.endsWith(`@${organization.domain}`)) {
        throw new Error(`Email must match organization domain: ${organization.domain}`);
      }

      const updatedMembers = [...organization.members, newMemberEmail];
      await updateDoc(orgRef, { members: updatedMembers });

      setOrganization({ ...organization, members: updatedMembers });
      setNewMemberEmail('');
    } catch (err) {
      setError('Failed to invite member.');
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
            <th className="border-b p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {organization.members.map((memberEmail) => (
            <tr key={memberEmail} className="hover:bg-gray-50">
              <td className="p-2">{memberEmail}</td>
              <td className="p-2">
                {organization.admins.includes(memberEmail) ? (
                  <span className="font-semibold text-blue-500">Admin</span>
                ) : (
                  <span className="text-gray-600">Member</span>
                )}
              </td>
              <td className="p-2">
                {organization.admins.includes(memberEmail) ? (
                  <span className="text-gray-400">Cannot Remove Admin</span>
                ) : (
                  <button
                    onClick={() => console.log('Remove member:', memberEmail)}
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


