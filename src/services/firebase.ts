import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDl1CvwMfHDwn1aGT1WpSUN_oSzuyYyt-c",
  authDomain: "healthchat-a0113.firebaseapp.com",
  projectId: "healthchat-a0113",
  storageBucket: "healthchat-a0113.firebasestorage.app",
  messagingSenderId: "735055789877",
  appId: "1:735055789877:web:fe9bf150fab5ec5460967c",
  measurementId: "G-9J4GXSVRKK",
};

// Define the correct access code
const CORRECT_ACCESS_CODE = "HEALTHSTAFF2024";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);
export const createUser = async (email: string, password: string, accessCode: string) => {
  // Validate access code
  if (accessCode.toUpperCase().trim() !== CORRECT_ACCESS_CODE) {
    throw new Error("Invalid access code. Please contact support if you believe this is an error.");
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;
    // Initialize user document with subscription status
    await setDoc(doc(db, "User", user.uid), {
      uid: user.uid,
      email: user.email,
      createdAt: new Date().toISOString(),
      subscription: {
        plan: "Free",
        status: "Active",
        startedAt: new Date().toISOString(),
        expiresAt: null,
        subscriptionId: null,
        stripeCustomerId: null,
      },
      accessCodeVerified: true, // Add a flag to indicate access code verification
    });
    return user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Rest of the code remains the same as in the original file
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const getSubscriptionStatus = async (
  userId: string
): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, "User", userId));
    return userDoc.exists() ? userDoc.data()?.subscribed || false : false;
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return false;
  }
};

export async function getUserSubscription(uid: string) {
  const userDoc = doc(db, "User", uid);
  const userSnapshot = await getDoc(userDoc);

  if (userSnapshot.exists()) {
    return userSnapshot.data()?.subscription || null;
  }

  return null;
}

export async function updateUserSubscription(
  uid: string,
  subscription: string
) {
  const userDoc = doc(db, "User", uid);
  await setDoc(userDoc, { subscription }, { merge: true });
}

export async function getUserDetails(uid: string) {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    console.error("No such user document!");
    return null;
  }
}
