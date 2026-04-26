import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore } from 'firebase/firestore';

// Safely attempt to load the config file if it exists
const configFiles = import.meta.glob('../firebase-applet-config.json', { eager: true, import: 'default' });
const firebaseConfigFromFile: any = configFiles['../firebase-applet-config.json'] || {};

if (Object.keys(firebaseConfigFromFile).length > 0) {
  console.log('Firebase: Found configuration in firebase-applet-config.json');
} else {
  console.log('Firebase: No configuration file found. Using environment variables or placeholders.');
}

const getConfigValue = (envKey: string, fileValue: string | undefined): string => {
  // Prioritize the automatically generated config file if it's not a placeholder
  if (fileValue && fileValue !== '' && !fileValue.startsWith('REPLACE_WITH')) {
    return fileValue.trim();
  }
  
  // Fallback to environment secrets
  const envValue = import.meta.env[envKey];
  if (envValue && envValue !== '') {
    return envValue.trim();
  }
  
  return '';
};

const firebaseConfig = {
  projectId: getConfigValue('VITE_FIREBASE_PROJECT_ID', firebaseConfigFromFile.projectId),
  appId: getConfigValue('VITE_FIREBASE_APP_ID', firebaseConfigFromFile.appId),
  apiKey: getConfigValue('VITE_FIREBASE_API_KEY', firebaseConfigFromFile.apiKey),
  authDomain: getConfigValue('VITE_FIREBASE_AUTH_DOMAIN', firebaseConfigFromFile.authDomain),
  firestoreDatabaseId: getConfigValue('VITE_FIREBASE_FIRESTORE_DATABASE_ID', (firebaseConfigFromFile as any).firestoreDatabaseId),
  storageBucket: getConfigValue('VITE_FIREBASE_STORAGE_BUCKET', firebaseConfigFromFile.storageBucket),
  messagingSenderId: getConfigValue('VITE_FIREBASE_MESSAGING_SENDER_ID', firebaseConfigFromFile.messagingSenderId),
};

export const isConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== '' && !firebaseConfig.apiKey.startsWith('REPLACE_WITH');

// Debug table (safe)
console.table({
  'Project ID': firebaseConfig.projectId || '(Missing)',
  'App ID': firebaseConfig.appId || '(Missing)',
  'API Key': isConfigValid ? '*** PRESENT ***' : '(Missing)',
  'Database ID': firebaseConfig.firestoreDatabaseId || '(default)'
});

// Check for missing or invalid API key before initialization
if (!isConfigValid) {
  console.error('%c🔴 CRITICAL: FIREBASE API KEY MISSING', 'font-size: 20px; font-weight: bold; color: white; background: #be123c; padding: 20px; border-radius: 10px; border: 4px solid #9f1239;');
  console.error(
    `Your Firebase configuration is missing. The app cannot connect to the database.\n\n` +
    `Please ensure the 'firebase-applet-config.json' file exists in the root folder with your project details.`
  );
}

const app = isConfigValid ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : ({} as any);

// Explicitly ensure local persistence is used so sessions survive tab closures
if (app && isConfigValid) {
  setPersistence(auth, browserLocalPersistence).catch(console.error);
}

// Use specific database ID if provided, otherwise default
let firestore: any = null;
if (app && isConfigValid) {
  try {
    const dbId = firebaseConfig.firestoreDatabaseId;
    if (dbId && dbId !== '(default)') {
      firestore = initializeFirestore(app, {
        experimentalForceLongPolling: true,
      }, dbId);
    } else {
      firestore = initializeFirestore(app, {
        experimentalForceLongPolling: true,
      });
    }
  } catch (e) {
    console.warn('Failed to initialize Firestore with specific ID, falling back to default:', e);
    firestore = getFirestore(app);
  }
}
export const db = firestore;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || 'anonymous',
      email: auth.currentUser?.email || 'none',
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: (auth.currentUser as any)?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider?.providerId || 'unknown',
        displayName: provider?.displayName || null,
        email: provider?.email || null,
        photoUrl: provider?.photoURL || null
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (!db || !isConfigValid) {
    console.log("Firebase Connection: SKIPPED (Missing configuration)");
    return;
  }
  
  // Wait a moment for initial connection logic to stabilize
  setTimeout(async () => {
    try {
      // Attempt to read a doc to verify connection (bypassing cache)
      await getDocFromServer(doc(db, 'test', 'connection'));
      console.log("Firebase Connection: SUCCESS (Database Link Verified)");
    } catch (error: any) {
      // "the client is offline" usually means Firestore couldn't reach its servers
      // This often happens if the database is not yet created in the project,
      // or if Firestore is not enabled in Native Mode.
      if (error.message.includes('the client is offline')) {
        console.warn('%c⚠️ FIREBASE IS OFFLINE', 'font-size: 14px; font-weight: bold; color: #854d0e; background: #fefce8; padding: 8px; border-radius: 4px; border: 1px solid #fef08a;');
        console.warn(
          "Firebase is unable to reach the server. Please check:\n" +
          "1. Is Firestore enabled in your Firebase Console?\n" +
          "2. Is the database created in '(default)' location?\n" +
          "3. Are you behind a strict proxy/VPN?"
        );
      } else if (error.code === 'permission-denied') {
        // Permission denied means it DID reach the server, but rules blocked it.
        // This is actually a GOOD sign that the connection is working.
        console.log("Firebase Connection: SUCCESS (Server reached, Permissions verified)");
      } else {
        console.log("Firebase Connection Check:", error.code || error.message);
      }
    }
  }, 2000);
}
testConnection();

export { 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile
};
