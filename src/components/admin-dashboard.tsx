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
    <div>
      <h1>Admin Dashboard - {organization.name}</h1>
      <div>
        <input
          type="email"
          placeholder={`Invite new member (must use @${organization.domain})`}
          value={newMemberEmail}
          onChange={(e) => setNewMemberEmail(e.target.value)}
        />
        <button onClick={inviteMember}>
          <UserPlus /> Invite
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
          </tr>
        </thead>
        <tbody>
          {organization.members.map((member) => (
            <tr key={member}>
              <td>{member}</td>
              <td>{organization.admins.includes(member) ? 'Admin' : 'Member'}</td>
              <td>
                {organization.admins.includes(member) ? (
                  'Admin'
                ) : (
                  <button onClick={() => console.log('Remove member', member)}>
                    <Trash2 /> Remove
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
