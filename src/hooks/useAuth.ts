export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        // Check if user is an admin
        const orgRef = collection(db, 'organizations');
        const orgQuery = query(orgRef, where('admins', 'array-contains', user.email));
        const orgSnapshot = await getDocs(orgQuery);
        setIsAdmin(!orgSnapshot.empty);

        // Get user subscription
        const userDoc = await getDoc(doc(db, 'User', user.uid));
        if (userDoc.exists()) {
          setSubscription(userDoc.data().subscription);
        }
      } else {
        setUser(null);
        setSubscription(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
  }, []);

  return { user, loading, subscription, isAdmin };
};