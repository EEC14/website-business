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
  getDoc
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth';
import { UserPlus } from 'lucide-react';
import * as XLSX from 'xlsx';

// Generate a random password
const generateRandomPassword = () => {
  return Math.random().toString(36).slice(2, 10) + 'A1!';
};

interface UserProfile {
  uid: string;
  email: string;
  role: string;
  createdAt: string;
  subscription: {
    plan: string;
    status: string;
    startedAt: string;
    expiresAt: string | null;
    subscriptionId: string | null;
    stripeCustomerId: string | null;
  };
  temporaryPassword?: string;
}

export const AdminDashboard: React.FC = () => {
  const [organization, setOrganization] = useState<any>(null);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'member' | 'admin'>('member');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importedEmails, setImportedEmails] = useState<string[]>([]);
  const [availableSeats, setAvailableSeats] = useState(0);

  const auth = getAuth();
  const firestore = getFirestore();

  useEffect(() => {
    const fetchOrganizationAndUsers = async () => {
      try {
        setIsLoading(true);
        const currentUser = auth.currentUser;
        if (!currentUser?.email) {
          throw new Error('No authenticated user');
        }

        // Get organization data
        const orgRef = collection(firestore, 'organizations');
        const orgQuery = query(orgRef, where('admins', 'array-contains', currentUser.email));
        const orgSnapshot = await getDocs(orgQuery);

        if (!orgSnapshot.empty) {
          const orgDoc = orgSnapshot.docs[0];
          const orgData = orgDoc.data();
          setOrganization({ ...orgData, id: orgDoc.id });

          // Calculate available seats
          const totalSeats = orgData.subscription?.seats || 0;
          const usedSeats = orgData.members?.length || 0;
          setAvailableSeats(totalSeats - usedSeats);

          // Get user profiles
          if (orgData.members && orgData.members.length > 0) {
            const userQuery = query(
              collection(firestore, 'User'),
              where('email', 'in', orgData.members)
            );
            const userSnapshot = await getDocs(userQuery);
            const profiles = userSnapshot.docs.map(doc => ({
              ...doc.data() as UserProfile
            }));
            setUserProfiles(profiles);
          }
        } else {
          throw new Error('Organization not found');
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load organization data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizationAndUsers();
  }, [auth, firestore]);

  const inviteMember = async (email: string) => {
    try {
      if (availableSeats <= 0) {
        throw new Error('No available seats. Please upgrade your subscription to add more users.');
      }

      setIsLoading(true);
      
      // Create temporary password
      const tempPassword = generateRandomPassword();
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
      await sendEmailVerification(userCredential.user);

      const userProfile = {
        uid: userCredential.user.uid,
        email,
        role: selectedRole,
        organizationId: organization.id,
        createdAt: new Date().toISOString(),
        subscription: {
          plan: organization.subscription.plan,
          status: "Active",
          startedAt: new Date().toISOString(),
          expiresAt: null,
          subscriptionId: null,
          stripeCustomerId: null,
        },
        temporaryPassword: tempPassword,
      };

      // Create user document
      const userRef = doc(firestore, 'User', userCredential.user.uid);
      await setDoc(userRef, userProfile);

      // Update organization
      const orgRef = doc(firestore, 'organizations', organization.id);
      await updateDoc(orgRef, {
        members: arrayUnion(email),
        ...(selectedRole === 'admin' && { admins: arrayUnion(email) }),
      });

      // Update local state
      setUserProfiles([...userProfiles, userProfile]);
      setAvailableSeats(prev => prev - 1);
      setNewMemberEmail('');

      return true;
    } catch (err) {
      console.error('Error inviting member:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsedData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const emails = parsedData
        .flat()
        .filter((cell: any) => 
          typeof cell === 'string' && 
          cell.includes('@') && 
          cell.endsWith(`@${organization.domain}`)
        );

      setImportedEmails(emails);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkInvite = async () => {
    if (!organization) {
      setError("No organization found. Cannot invite users.");
      return;
    }

    if (importedEmails.length === 0) {
      setError("No valid emails found in the uploaded file.");
      return;
    }

    if (importedEmails.length > availableSeats) {
      setError(`Not enough seats available. You have ${availableSeats} seats available but are trying to invite ${importedEmails.length} users.`);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      for (const email of importedEmails) {
        await inviteMember(email);
      }
      setImportedEmails([]);
    } catch (err) {
      console.error("Error during bulk invite:", err);
      setError("An error occurred while inviting users. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Subscription Info */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-4">Subscription Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Current Plan</p>
            <p className="font-medium">{organization?.subscription?.plan || 'Free'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Available Seats</p>
            <p className="font-medium">{availableSeats} of {organization?.subscription?.seats || 0}</p>
          </div>
        </div>
      </div>

      {/* Invite Form */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-4">Invite New Member</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as 'member' | 'admin')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            onClick={() => inviteMember(newMemberEmail)}
            disabled={isLoading || availableSeats <= 0}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
          >
            {isLoading ? 'Inviting...' : 'Invite Member'}
          </button>
        </div>
      </div>

      {/* Bulk Import */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-4">Bulk Import</h2>
        <div className="space-y-4">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {importedEmails.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Found {importedEmails.length} valid email(s)</p>
              <button
                onClick={handleBulkInvite}
                disabled={isLoading}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
              >
                {isLoading ? 'Processing...' : 'Import Users'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User List */}
      <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
        <h2 className="text-lg font-bold mb-4">Organization Members</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Temporary Password
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {userProfiles.map((user) => (
              <tr key={user.email}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.role}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.subscription.status}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.temporaryPassword || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;