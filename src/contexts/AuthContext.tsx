import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  onAuthStateChanged, 
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, signOut, isConfigValid } from '../firebase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isSigningIn: boolean;
  authError: string | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const saveUserProfile = useCallback(async (firebaseUser: FirebaseUser, customDisplayName?: string) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      const existingData = userSnap.data();
      
      // Every signed-in user is now an admin as requested
      const role = 'admin';
      
      const userData: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: customDisplayName || firebaseUser.displayName || existingData?.displayName || 'User',
        photoURL: firebaseUser.photoURL || existingData?.photoURL,
        role: role,
        ...(existingData?.shippingInfo ? { shippingInfo: existingData.shippingInfo } : {})
      };
      
      setUser(userData);
      
      // Save to Firestore (merge to avoid overwriting other fields like address if they exist)
      await setDoc(userRef, userData, { merge: true });
      return userData;
    } catch (error) {
      console.error('Error saving user profile:', error);
      const fallbackData: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: customDisplayName || firebaseUser.displayName || 'User',
        photoURL: firebaseUser.photoURL,
        role: 'admin'
      };
      setUser(fallbackData);
      return fallbackData;
    }
  }, []);

  useEffect(() => {
    if (!isConfigValid || !auth || typeof auth.onIdTokenChanged !== 'function') {
      console.warn('Firebase Auth not available - skipping onAuthStateChanged');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await saveUserProfile(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [saveUserProfile]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await saveUserProfile(userCredential.user);
      }
    } catch (error: any) {
      console.error('Error signing in with email:', error);
      const errorCode = error.code;
      
      if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') {
        setAuthError('Incorrect email or password. Please check your credentials and try again, or reset your password if you forgot it.');
      } else if (errorCode === 'auth/user-disabled') {
        setAuthError('This account has been disabled. Please contact support.');
      } else if (errorCode === 'auth/invalid-email') {
        setAuthError('Please enter a valid email address.');
      } else if (errorCode === 'auth/too-many-requests') {
        setAuthError('Too many failed login attempts. Please try again later or reset your password.');
      } else {
        setAuthError('An error occurred during sign-in. Please check your connection and try again.');
      }
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  }, [isSigningIn, saveUserProfile]);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      
      // Manually trigger profile save to ensure displayName is included immediately
      await saveUserProfile(userCredential.user, displayName);
    } catch (error: any) {
      console.error('Error signing up:', error);
      if (error.code === 'auth/email-already-in-use') {
        setAuthError('This email is already in use. If you already have an account, please Sign In.');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('Password is too weak. Please use at least 6 characters.');
      } else if (error.code === 'auth/invalid-email') {
        setAuthError('Invalid email format.');
      } else {
        setAuthError('An error occurred during sign-up. Please try again.');
      }
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  }, [isSigningIn]);

  const resetPassword = useCallback(async (email: string) => {
    setAuthError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setAuthError('Please enter your email address.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
    } catch (error: any) {
      console.error('Error resetting password:', error);
      if (error.code === 'auth/user-not-found') {
        setAuthError('No account found with this email address.');
      } else if (error.code === 'auth/invalid-email') {
        setAuthError('Please enter a valid email address.');
      } else if (error.code === 'auth/too-many-requests') {
        setAuthError('Too many requests. Please try again later.');
      } else {
        setAuthError('An error occurred. Please try again.');
      }
      throw error;
    }
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isSigningIn, 
      authError, 
      signInWithEmail,
      signUp,
      resetPassword,
      logout, 
      clearAuthError 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
