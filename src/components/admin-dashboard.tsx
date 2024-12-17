import React, { useState, useEffect } from 'react';
import { 
  getFirestore, 
  doc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { UserPlus, Trash2, Lock, Shield } from 'lucide-react';

// Organization Member Interface
interface OrganizationMember {
  email: string;
  role: 'admin' | 'member' | 'owner';
  status: 'active' | 'invited' | 'suspended';
}

// Organization Interface
interface Organization {
  id: string;
  name: string;
  domain: string;
  members: OrganizationMember[];
}

export const AdminDashboard: React.FC = () => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const auth = getAuth();
  const firestore = getFirestore();

  useEffect(() => {
    const fetchOrganization = async () => {
      setIsLoading(true);
      try {
        if (!auth.currentUser) throw new Error('No authenticated user');

        const orgsRef = collection(firestore, 'organizations');
        const q = query(
          orgsRef, 
          where('members', 'array-contains-any', [
            { email: auth.currentUser.email, role: 'admin' },
            { email: auth.currentUser.email, role: 'owner' }
          ])
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const orgData = querySnapshot.docs[0].data() as Organization;
          setOrganization(orgData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganization();
  }, []);

  const inviteMember = async () => {
    if (!organization) return;

    try {
      const orgRef = doc(firestore, 'organizations', organization.id);
      if (!newMemberEmail.endsWith(`@${organization.domain}`)) {
        throw new Error('Email must match organization domain');
      }

      const updatedMembers = [
        ...organization.members,
        { email: newMemberEmail, role: 'member', status: 'invited' }
      ];

      await updateDoc(orgRef, { members: updatedMembers });
      setNewMemberEmail('');
      setOrganization({ ...organization, members: updatedMembers });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invitation failed');
    }
  };

  if (isLoading) return <div>Loading organization details...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!organization) return <div>No organization found or insufficient permissions.</div>;

  return (
    <div className="container mx-auto p-4">
      <h1>Admin Dashboard - {organization.name}</h1>
      <div>
        <input 
          type="email" 
          placeholder={`Invite new member (must use @${organization.domain})`} 
          value={newMemberEmail}
          onChange={(e) => setNewMemberEmail(e.target.value)}
          className="border p-2 mr-2"
        />
        <button onClick={inviteMember} className="bg-blue-500 text-white p-2">
          <UserPlus /> Invite
        </button>
      </div>

      <table className="table-auto w-full mt-4">
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {organization.members.map(member => (
            <tr key={member.email}>
              <td>{member.email}</td>
              <td>
                <select 
                  value={member.role}
                  onChange={(e) => console.log('Change role', e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td>{member.status}</td>
              <td>
                <button className="text-red-500" onClick={() => console.log('Remove', member.email)}>
                  <Trash2 /> Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

