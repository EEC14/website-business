import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { onAuthChange, getUserSubscription } from "../services/firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      setUser(user);
      if (user) {
        const sub = await getUserSubscription(user.uid);
        setSubscription(sub);
      } else {
        setSubscription(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading, subscription };
}
