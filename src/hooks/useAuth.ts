import { useState, useEffect } from 'react';
import { getAuth, User } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getDoc,
  doc,
  getFirestore
} from 'firebase/firestore';

auth = getAuth();
db = getFirestore();

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        // Check if user is an admin
        const orgRef = collection(db, 'organizations');
        const orgQuery = query(orgRef, where('admins', 'array-contains', user.email));
        const orgSnapshot = await getDocs(orgQuery);
        const isUserAdmin = !orgSnapshot.empty;
        setIsAdmin(isUserAdmin);
        
        if (isUserAdmin) {
          setOrganizationId(orgSnapshot.docs[0].id);
        }

        // Get user subscription
        const userDoc = await getDoc(doc(db, 'User', user.uid));
        if (userDoc.exists()) {
          setSubscription(userDoc.data().subscription);
          if (!isUserAdmin && userDoc.data().organizationId) {
            setOrganizationId(userDoc.data().organizationId);
          }
        }
      } else {
        setUser(null);
        setSubscription(null);
        setIsAdmin(false);
        setOrganizationId(null);
      }
      setLoading(false);
    });
  }, []);

  return { user, loading, subscription, isAdmin, organizationId };
};