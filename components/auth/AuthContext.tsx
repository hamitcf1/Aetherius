import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged as onFirebaseAuthStateChanged,
  signOut as firebaseSignOut,
  sendEmailVerification as firebaseSendEmailVerification
} from 'firebase/auth';
import { auth } from '../../services/firebase';

type AuthContextType = {
  currentUser: User | null;
  loading: boolean;
  isEmailVerified: boolean;
  signOut: () => Promise<void>;
  sendVerificationEmail: () => Promise<{ success: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onFirebaseAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Function to refresh user data
  const refreshUser = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      setCurrentUser({ ...auth.currentUser });
    }
  };

  // Sign out function
  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  // Send verification email
  const sendVerificationEmail = async () => {
    if (!auth.currentUser) {
      return { success: false, error: 'No user is currently signed in' };
    }

    try {
      await firebaseSendEmailVerification(auth.currentUser, {
        url: `${window.location.origin}/verify-email`,
        handleCodeInApp: true,
      });
      return { success: true };
    } catch (error) {
      console.error('Error sending verification email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send verification email' 
      };
    }
  };

  const value = {
    currentUser,
    loading,
    isEmailVerified: currentUser?.emailVerified || false,
    signOut,
    sendVerificationEmail,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
