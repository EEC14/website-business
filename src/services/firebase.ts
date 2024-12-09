import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDl1CvwMfHDwn1aGT1WpSUN_oSzuyYyt-c",
  authDomain: "healthchat-a0113.firebaseapp.com",
  projectId: "healthchat-a0113",
  storageBucket: "healthchat-a0113.firebasestorage.app",
  messagingSenderId: "735055789877",
  appId: "1:735055789877:web:fe9bf150fab5ec5460967c",
  measurementId: "G-9J4GXSVRKK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export const createUser = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Initialize user document with subscription status
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      subscribed: false,
      createdAt: new Date().toISOString()
    });
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
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

export const getSubscriptionStatus = async (userId: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists() ? userDoc.data()?.subscribed || false : false;
  } catch (error) {
    console.error('Error getting subscription status:', error);
    return false;
  }
};