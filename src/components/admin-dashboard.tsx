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
  getDoc,
  DocumentData
} from 'firebase/firestore';
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth';
import { UserPlus, Upload, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { addDocument, removeDocument, listDocuments } from '../services/openai';

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

interface Organization extends DocumentData {
  id: string;
  name: string;
  domain: string;
  admins: string[];
  members: string[];
  subscription: {
    plan: string;
    status: string;
    seats: number;
  };
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
  const [contextFiles, setContextFiles] = useState<string[]>([]);
  const [isUploadingContext, setIsUploadingContext] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

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
            console.log("Getting user profiles:", profiles);
          }

          // Fetch context files
          console.log("Getting context files");
          const files = await listDocuments(orgDoc.id);
          setContextFiles(files);
          console.log("Fetched context files:", files);
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
      if (!organization) throw new Error('No organization found');
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
          organization?.domain && 
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

  const handleContextFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;

    setIsUploadingContext(true);
    setContextError(null);

    try {
      await addDocument(file, organization.id);
      const updatedFiles = await listDocuments(organization.id);
      setContextFiles(updatedFiles);
    } catch (err) {
      console.error('Error uploading context file:', err);
      setContextError('Failed to upload context file. Please try again.');
    } finally {
      setIsUploadingContext(false);
    }
  };

  const handleRemoveContextFile = async (fileName: string) => {
    if (!organization) return;

    try {
      await removeDocument(fileName, organization.id);
      setContextFiles(prev => prev.filter(f => f !== fileName));
    } catch (err) {
      console.error('Error removing context file:', err);
      setContextError('Failed to remove context file. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-400 text-red-700 rounded">
        {error}
      </div>
    );
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

      {/* Context Files Management */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-4">AI Context Management</h2>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            <input
              type="file"
              accept=".txt,.md,.csv,.json"
              onChange={handleContextFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-2 text-xs text-gray-500">
              Upload text files to enhance AI responses with custom context
            </p>
          </div>

          {contextError && (
            <div className="text-red-600 text-sm">{contextError}</div>
          )}

          {isUploadingContext && (
            <div className="text-blue-600 text-sm">Uploading file...</div>
          )}

          {contextFiles.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Uploaded Context Files</h3>
              <ul className="divide-y divide-gray-200">
                {contextFiles.map((fileName) => (
                  <li key={fileName} className="py-3 flex justify-between items-center">
                    <span className="text-sm text-gray-900">{fileName}</span>
                    <button
                      onClick={() => handleRemoveContextFile(fileName)}
                      className="text-red-600 hover:text-red-800"
                      title="Remove file"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
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