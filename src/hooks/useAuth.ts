import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebase'; // Make sure this path matches your file structure

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        
        try {
          // Check if user is an admin
          const orgCollectionRef = collection(db, 'organizations');
          const orgQuery = query(orgCollectionRef, where('admins', 'array-contains', user.email));
          const orgSnapshot = await getDocs(orgQuery);
          const isUserAdmin = !orgSnapshot.empty;
          setIsAdmin(isUserAdmin);
          
          if (isUserAdmin && !orgSnapshot.empty) {
            setOrganizationId(orgSnapshot.docs[0].id);
          }

          // Get user subscription
          const userDocRef = doc(db, 'User', user.uid);
          const userDoc = await getDoc(userDocRef);
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