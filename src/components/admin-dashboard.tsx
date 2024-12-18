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
import { UserPlus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Plans } from '../utils/Plans';

// Generate a random password
const generateRandomPassword = () => {
  return Math.random().toString(36).slice(2, 10) + 'A1!';
};

export const AdminDashboard: React.FC<{ onSetupComplete?: () => void }> = ({ onSetupComplete }) => {
  const [organization, setOrganization] = useState<any>(null);
  const [userProfiles, setUserProfiles] = useState<any[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'member' | 'admin'>('member');
  const [selectedPlan, setSelectedPlan] = useState<string>('Basic');
  const [seats, setSeats] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importedEmails, setImportedEmails] = useState<string[]>([]);

  const auth = getAuth();
  const firestore = getFirestore();

  useEffect(() => {
    const fetchOrganizationAndUsers = async (userEmail: string) => {
      try {
        setIsLoading(true);

        const orgRef = collection(firestore, 'organizations');
        const orgQuery = query(orgRef, where('admins', 'array-contains', userEmail));
        const querySnapshot = await getDocs(orgQuery);

        if (!querySnapshot.empty) {
          const orgDoc = querySnapshot.docs[0];
          const orgData = orgDoc.data();
          setOrganization({...orgData, id: orgDoc.id});

          const currentPlan = orgData.subscription?.plan || 'Free';
          const currentSeats = orgData.subscription?.seats || 1;
          setSelectedPlan(currentPlan);
          setSeats(currentSeats);

          const userQuery = query(
            collection(firestore, 'User'),
            where('email', 'in', orgData.members || [])
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

  const inviteMember = async (email: string, adminPassword: string) => {
    try {
      if (userProfiles.length >= seats) {
        throw new Error('No remaining seats. Please purchase more seats.');
      }

      const adminEmail = auth.currentUser?.email;
      if (!adminEmail || !adminPassword) {
        throw new Error('Admin email and password are required to proceed.');
      }

      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);

      const tempPassword = generateRandomPassword();
      const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
      await sendEmailVerification(userCredential.user);

      const userProfile = {
        uid: userCredential.user.uid,
        email,
        role: selectedRole,
        organizationId: organization.id,
        createdAt: new Date().toISOString(),
        status: 'invited',
        subscription: {
          plan: selectedPlan,
          status: 'Active',
          startedAt: new Date().toISOString(),
          expiresAt: null,
          subscriptionId: null,
          stripeCustomerId: null,
        },
        temporaryPassword: tempPassword,
      };

      const userRef = doc(firestore, 'User', userCredential.user.uid);
      await setDoc(userRef, userProfile);

      const orgRef = doc(firestore, 'organizations', organization.id);
      await updateDoc(orgRef, {
        members: arrayUnion(email),
        ...(selectedRole === 'admin' && { admins: arrayUnion(email) }),
      });

      // Refresh user profiles
      setUserProfiles([...userProfiles, userProfile]);

      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    } catch (err) {
      console.error(`Failed to invite ${email}`, err);
      throw err;
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
        .filter((cell: any) => typeof cell === 'string' && cell.includes('@'));

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
      setError("No emails found in the uploaded file.");
      return;
    }

    const adminPassword = prompt("Please enter your admin password to confirm:");
    if (!adminPassword) {
      setError("Admin password is required for bulk invite.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      for (const email of importedEmails) {
        if (email.endsWith(`@${organization.domain}`)) {
          await inviteMember(email, adminPassword);
        } else {
          console.warn(`Skipping email ${email}: does not match organization domain.`);
        }
      }
      alert("Bulk invite completed successfully!");
      setImportedEmails([]);
    } catch (err) {
      console.error("Error during bulk invite:", err);
      setError("An error occurred while inviting users. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSubscription = async () => {
    try {
      const adminPassword = prompt("Please enter your admin password to update:");
      if (!adminPassword) return;

      const orgRef = doc(firestore, 'organizations', organization.id);
      await updateDoc(orgRef, {
        'subscription.seats': seats,
        'subscription.plan': selectedPlan,
      });

      if (onSetupComplete) {
        onSetupComplete();
      }
      
      alert("Subscription updated successfully!");
    } catch (err) {
      console.error("Failed to update subscription", err);
      alert("Failed to update subscription");
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-600">{error}</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard - {organization?.name}</h1>

      {/* Plan and Seat Selection */}
      <div className="mb-4 space-y-4">
        <div>
          <label className="block mb-2 font-medium">
            Select Organization Plan:
          </label>
          <select
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            className="w-full p-2 border rounded-lg"
          >
            {Object.values(Plans).map((plan) => (
              <option key={plan.name} value={plan.name}>
                {plan.name} (${plan.price}/month + ${plan.additionalSeatPrice}/seat)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-2 font-medium">
            Number of Seats:
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="1"
              max="100"
              value={seats}
              onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value)))}
              className="w-24 p-2 border rounded-lg"
            />
            <span className="text-sm text-gray-600">
              Seats Used: {userProfiles.length} / {seats}
            </span>
          </div>
        </div>

        <button
          onClick={handleUpdateSubscription}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Update Subscription
        </button>
      </div>

      {/* File Import */}
      <div className="mb-6">
        <label className="block mb-2 font-medium">Import Emails (.csv, .xls, .xlsx):</label>
        <input
          type="file"
          accept=".csv,.xls,.xlsx"
          onChange={handleFileUpload}
          className="border p-2 rounded-lg"
        />
        {importedEmails.length > 0 && (
          <div className="mt-2">
            <p className="text-sm">Imported {importedEmails.length} emails.</p>
            <button
              onClick={handleBulkInvite}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg mt-2"
            >
              Bulk Invite
            </button>
          </div>
        )}
      </div>

      {/* User List */}
      <table className="w-full border-collapse border text-left">
        <thead>
          <tr>
            <th className="border-b p-2">Email</th>
            <th className="border-b p-2">Role</th>
            <th className="border-b p-2">Plan</th>
            <th className="border-b p-2">Temporary Password</th>
          </tr>
        </thead>
        <tbody>
          {userProfiles.map((user) => (
            <tr key={user.email}>
              <td className="p-2">{user.email}</td>
              <td className="p-2">{user.role}</td>
              <td className="p-2">{user.subscription.plan}</td>
              <td className="p-2">{user.temporaryPassword || 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};