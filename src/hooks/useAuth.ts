import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc
} from 'firebase/firestore';
import { auth, db } from '../services/firebase';

interface Subscription {
  plan: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  subscriptionId: string | null;
  stripeCustomerId: string | null;
}

interface OrganizationSubscription extends Subscription {
  seats: number;
  usedSeats: number;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationSubscription, setOrganizationSubscription] = useState<OrganizationSubscription | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        try {
          // Check if user is an admin and get organization details
          const orgRef = collection(db, 'organizations');
          const orgQuery = query(orgRef, where('admins', 'array-contains', user.email));
          const orgSnapshot = await getDocs(orgQuery);
          const isUserAdmin = !orgSnapshot.empty;
          setIsAdmin(isUserAdmin);
          
          if (isUserAdmin) {
            const orgDoc = orgSnapshot.docs[0];
            const orgData = orgDoc.data();
            setOrganizationId(orgDoc.id);
            setOrganizationSubscription(orgData.subscription);
          }

          // Get user subscription (which might be inherited from organization)
          const userDoc = await getDoc(doc(db, 'User', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setSubscription(userData.subscription);
            
            // If user is not admin but belongs to an organization, get org details
            if (!isUserAdmin && userData.organizationId) {
              setOrganizationId(userData.organizationId);
              const orgDoc = await getDoc(doc(db, 'organizations', userData.organizationId));
              if (orgDoc.exists()) {
                setOrganizationSubscription(orgDoc.data().subscription);
              }
            }
          }
        } catch (error) {
          console.error("Error in auth state change:", error);
        }
      } else {
        setUser(null);
        setSubscription(null);
        setIsAdmin(false);
        setOrganizationId(null);
        setOrganizationSubscription(null);
      }
      setLoading(false);
    });
  }, []);

  return { 
    user, 
    loading, 
    subscription, 
    isAdmin, 
    organizationId,
    organizationSubscription, // Now includes seats info for admins
  };
};