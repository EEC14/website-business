import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { auth, db, UserSubscription, checkIsAdmin } from '../services/firebase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        
        try {
          // Check if user is an admin
          const isUserAdmin = await checkIsAdmin(user.email || '');
          setIsAdmin(isUserAdmin);
          
          if (isUserAdmin) {
            const orgRef = collection(db as Firestore, 'organizations');
            const orgQuery = query(orgRef, where('admins', 'array-contains', user.email));
            const orgSnapshot = await getDocs(orgQuery);
            if (!orgSnapshot.empty) {
              setOrganizationId(orgSnapshot.docs[0].id);
            }
          }

          // Get user subscription
          const userDoc = await getDoc(doc(db, 'User', user.uid));
          if (userDoc.exists()) {
            setSubscription(userDoc.data().subscription);
            if (!isUserAdmin && userDoc.data().organizationId) {
              setOrganizationId(userDoc.data().organizationId);
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
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { 
    user, 
    loading, 
    subscription, 
    isAdmin, 
    organizationId 
  };
};