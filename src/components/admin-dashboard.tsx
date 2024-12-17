import React, { useState, useEffect } from 'react';
import { 
  getFirestore, 
  doc, 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const AdminDashboard: React.FC = () => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const auth = getAuth();
  const firestore = getFirestore();

  // Fetch organization details
  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        setIsLoading(true);
        if (!auth.currentUser) {
          throw new Error('No authenticated user');
        }

        // Query organizations where current user is an admin
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

  // Invite new member
  const inviteMember = async () => {
    if (!organization) return;

    try {
      const orgRef = doc(firestore, 'organizations', organization.id);
      
      // Validate email domain
      if (!newMemberEmail.endsWith(`@${organization.domain}`)) {
        throw new Error('Email must match organization domain');
      }

      // Add member with 'invited' status
      const updatedMembers = [
        ...organization.members,
        {
          email: newMemberEmail,
          role: 'member',
          status: 'invited'
        }
      ];

      await updateDoc(orgRef, { members: updatedMembers });
      
      // TODO: Implement actual email invitation logic
      // sendInvitationEmail(newMemberEmail);

      setNewMemberEmail('');
      // Refresh organization data
      setOrganization(prev => prev ? {...prev, members: updatedMembers} : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invitation failed');
    }
  };

  // Update member role
  const updateMemberRole = async (email: string, newRole: OrganizationMember['role']) => {
    if (!organization) return;

    try {
      const orgRef = doc(firestore, 'organizations', organization.id);
      const updatedMembers = organization.members.map(member => 
        member.email === email ? {...member, role: newRole} : member
      );

      await updateDoc(orgRef, { members: updatedMembers });
      setOrganization(prev => prev ? {...prev, members: updatedMembers} : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Role update failed');
    }
  };

  // Remove member
  const removeMember = async (email: string) => {
    if (!organization) return;

    try {
      const orgRef = doc(firestore, 'organizations', organization.id);
      const updatedMembers = organization.members.filter(member => member.email !== email);

      await updateDoc(orgRef, { members: updatedMembers });
      setOrganization(prev => prev ? {...prev, members: updatedMembers} : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Member removal failed');
    }
  };

  if (isLoading) {
    return <div>Loading organization details...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!organization) {
    return <div>No organization found or insufficient permissions.</div>;
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>
          Admin Dashboard - {organization.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="members">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="settings">Organization Settings</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members">
            <div className="flex mb-4">
              <Input 
                type="email"
                placeholder="Invite new member (must use @{organization.domain})"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="mr-2"
              />
              <Button onClick={inviteMember}>
                <UserPlus className="mr-2" /> Invite
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organization.members.map((member) => (
                  <TableRow key={member.email}>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <select 
                        value={member.role}
                        onChange={(e) => updateMemberRole(
                          member.email, 
                          e.target.value as OrganizationMember['role']
                        )}
                        disabled={member.role === 'owner'}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    </TableCell>
                    <TableCell>{member.status}</TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2" /> Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogTitle>Remove Member?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {member.email} from the organization?
                          </AlertDialogDescription>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeMember(member.email)}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Organization Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div>Name: {organization.name}</div>
                <div>Domain: {organization.domain}</div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Lock className="mr-2 inline" /> Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center mb-4">
                  <Shield className="mr-2" />
                  <span>Require Multi-Factor Authentication</span>
                  <Button variant="outline" className="ml-4">Configure</Button>
                </div>
                {/* Additional security settings can be added here */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminDashboard;
