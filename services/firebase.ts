import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  sendEmailVerification,
  sendPasswordResetEmail,
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update,
  onValue,
  remove,
  query,
  orderByChild,
  equalTo
} from 'firebase/database';
import { FirebaseError } from 'firebase/app';

// Firebase konfigürasyonunuzu buraya yapıştırın
// https://console.firebase.google.com adresinden alın
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
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

export const updateUserData = (userId: string, data: any) => {
  return update(ref(database, `users/${userId}`), data);
};

export const subscribeToUserData = (userId: string, callback: (data: any) => void) => {
  return onValue(ref(database, `users/${userId}`), (snapshot) => {
    callback(snapshot.val());
  });
};

export const deleteUserData = (userId: string) => {
  return remove(ref(database, `users/${userId}`));
};

// Email Verification Functions
export const sendVerificationEmail = async (user: User) => {
  if (!user.emailVerified) {
    try {
      await sendEmailVerification(user, {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: true,
      });
      return { success: true };
    } catch (error) {
      console.error("Error sending verification email:", error);
      return { success: false, error: (error as FirebaseError).message };
    }
  }
  return { success: false, error: "Email already verified" };
};

export const verifyEmail = async (oobCode: string) => {
  try {
    await applyActionCode(auth, oobCode);
    return { success: true };
  } catch (error) {
    console.error("Error verifying email:", error);
    return { success: false, error: (error as FirebaseError).message };
  }
};

// Password Reset Functions
export const sendPasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/login`,
      handleCodeInApp: false,
    });
    return { success: true };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { success: false, error: (error as FirebaseError).message };
  }
};

export const verifyPasswordResetCode = async (oobCode: string) => {
  try {
    const email = await verifyPasswordResetCode(auth, oobCode);
    return { success: true, email };
  } catch (error) {
    console.error("Error verifying password reset code:", error);
    return { success: false, error: (error as FirebaseError).message };
  }
};

export const confirmPasswordReset = async (oobCode: string, newPassword: string) => {
  try {
    await confirmPasswordReset(auth, oobCode, newPassword);
    return { success: true };
  } catch (error) {
    console.error("Error confirming password reset:", error);
    return { success: false, error: (error as FirebaseError).message };
  }
};

// User Profile Management
export const updateUserProfile = async (user: User, displayName: string, photoURL?: string) => {
  try {
    await updateProfile(user, { displayName, photoURL });
    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: (error as FirebaseError).message };
  }
};

export const updateUserEmail = async (user: User, newEmail: string, password: string) => {
  try {
    const credential = EmailAuthProvider.credential(user.email || '', password);
    await reauthenticateWithCredential(user, credential);
    await updateEmail(user, newEmail);
    return { success: true };
  } catch (error) {
    console.error("Error updating email:", error);
    return { success: false, error: (error as FirebaseError).message };
  }
};

export const updateUserPassword = async (user: User, currentPassword: string, newPassword: string) => {
  try {
    const credential = EmailAuthProvider.credential(user.email || '', currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
    return { success: true };
  } catch (error) {
    console.error("Error updating password:", error);
    return { success: false, error: (error as FirebaseError).message };
  }
};

// Security Rules Helper
export const getUserByEmail = async (email: string) => {
  try {
    const usersRef = query(ref(database, 'users'), orderByChild('email'), equalTo(email));
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      return { success: true, data: snapshot.val() };
    }
    return { success: false, error: "User not found" };
  } catch (error) {
    console.error("Error getting user by email:", error);
    return { success: false, error: (error as FirebaseError).message };
  }
};