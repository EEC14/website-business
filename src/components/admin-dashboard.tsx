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
interface OrganizationMember {
  email: string;
  role: 'admin' | 'member' | 'owner';
  status: 'active' | 'invited' | 'suspended';
}

interface Organization {
  id: string;
  name: string;
  domain: string;
  members: OrganizationMember[];
}

export const AdminDashboard: React.FC = () => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const auth = getAuth();
  const firestore = getFirestore();

  useEffect(() => {
    const fetchOrganization = async (user: any) => {
      try {
        setIsLoading(true);
        const userRef = doc(firestore, 'User', user.uid);
        const userDoc = await getDocs(query(collection(firestore, 'User'), where('uid', '==', user.uid)));

        if (!userDoc.empty) {
          const userData = userDoc.docs[0].data();
          const organizationRef = doc(firestore, 'organizations', userData.organizationId);

          // Fetch Organization Data
          const orgSnapshot = await getDocs(query(collection(firestore, 'organizations'), where('id', '==', userData.organizationId)));
          if (!orgSnapshot.empty) {
            const orgData = orgSnapshot.docs[0].data() as Organization;
            const currentUser = orgData.members.find((member) => member.email === user.email);

            if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'owner')) {
              setOrganization(orgData);
              setUserRole(currentUser.role);
            } else {
              throw new Error('You do not have permission to access this page.');
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch organization details');
      } finally {
        setIsLoading(false);
      }
    };

    onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchOrganization(user);
      } else {
        setError('You must be logged in to access this page.');
        setIsLoading(false);
      }
    });
  }, [auth, firestore]);

  const inviteMember = async () => {
    if (!organization) return;
    try {
      const orgRef = doc(firestore, 'organizations', organization.id);
      const updatedMembers = [
        ...organization.members,
        { email: newMemberEmail, role: 'member', status: 'invited' },
      ];
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
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {organization.members.map((member) => (
            <tr key={member.email}>
              <td>{member.email}</td>
              <td>{member.role}</td>
              <td>{member.status}</td>
              <td>
                {member.role !== 'owner' && (
                  <button onClick={() => console.log('Remove member', member.email)}>
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

