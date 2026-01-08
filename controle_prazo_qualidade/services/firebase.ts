
import { initializeApp, getApps, getApp, deleteApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { User } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyB7AqlFFycTrOs3kJ2tzPBcgv2BzE5bW_U",
  authDomain: "studio-3578656535-45183.firebaseapp.com",
  projectId: "studio-3578656535-45183",
  storageBucket: "studio-3578656535-45183.firebasestorage.app",
  messagingSenderId: "338531110445",
  appId: "1:338531110445:web:c5e16ccaef93d2840672a4"
};

// Initialize Main App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

// Helper to create a user without logging out the current admin
// We use a secondary app instance for this operation
export const createNewUser = async (user: User) => {
  if (!user.email || !user.password) throw new Error("Email e senha são obrigatórios");

  const secondaryAppName = "secondaryApp";
  let secondaryApp;

  try {
    secondaryApp = getApps().find(a => a.name === secondaryAppName) || initializeApp(firebaseConfig, secondaryAppName);
    const secondaryAuth = getAuth(secondaryApp);

    // 1. Create Auth User
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, user.email, user.password);
    const firebaseUser = userCredential.user;

    // 2. Create Firestore Profile (using the UID from Auth)
    await setDoc(doc(db, "users", firebaseUser.uid), {
      name: user.name,
      email: user.email,
      permissions: user.permissions,
      isActive: true, // Default to active
      notificationSettings: {
        production: user.notificationSettings?.production || false,
        calls: user.notificationSettings?.calls || false
      },
      createdAt: new Date()
    });

    return firebaseUser.uid;
  } catch (error: any) {
    console.error("Erro ao criar usuário:", error);
    throw new Error(getFriendlyErrorMessage(error.code));
  } finally {
    // Cleanup secondary app
    if (secondaryApp) await deleteApp(secondaryApp);
  }
};

const getFriendlyErrorMessage = (errorCode: string) => {
  switch (errorCode) {
    case 'auth/email-already-in-use': return 'Este email já está cadastrado.';
    case 'auth/invalid-email': return 'Email inválido.';
    case 'auth/weak-password': return 'A senha deve ter pelo menos 6 caracteres.';
    default: return 'Erro ao criar usuário. Tente novamente.';
  }
};