import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { getSubscriptionStatus } from '../services/firebase';

export function useSubscription(user: User | null) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSubscription() {
      if (!user) {
        setIsSubscribed(false);
        setLoading(false);
        return;
      }

      try {
        const status = await getSubscriptionStatus(user.uid);
        setIsSubscribed(status);
      } catch (error) {
        console.error('Error checking subscription:', error);
        setIsSubscribed(false);
      } finally {
        setLoading(false);
      }
    }

    checkSubscription();
  }, [user]);

  return { isSubscribed, loading };
}