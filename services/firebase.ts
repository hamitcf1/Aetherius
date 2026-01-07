import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update,
  onValue,
  remove
} from 'firebase/database';

// Firebase konfigürasyonunuzu buraya yapıştırın
// https://console.firebase.google.com adresinden alın
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBizX0xLl7WP2ZVARs2U60ySTRJOQrkebo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rugged-timer-384206.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://rugged-timer-384206-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rugged-timer-384206",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rugged-timer-384206.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "597660147755",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:597660147755:web:697953d3a398b2cbbcca6e",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

// Kimlik Doğrulama Fonksiyonları
export const registerUser = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const loginUser = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = () => {
  return signOut(auth);
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Veri Tabanı Fonksiyonları
export const saveUserData = (userId: string, data: any) => {
  return set(ref(database, `users/${userId}`), data);
};

export const getUserData = (userId: string) => {
  return get(ref(database, `users/${userId}`));
};

export const updateUserData = async (userId: string, data: any) => {
  try {
    const sanitized = JSON.parse(JSON.stringify(data)); // strip undefined (Realtime DB disallows)
    await set(ref(database, `users/${userId}`), sanitized);
  } catch (e) {
    console.error('Failed to save user data', e);
  }
};

export const subscribeToUserData = (userId: string, callback: (data: any) => void) => {
  return onValue(ref(database, `users/${userId}`), (snapshot) => {
    callback(snapshot.val());
  });
};

export const deleteUserData = (userId: string) => {
  return remove(ref(database, `users/${userId}`));
};
