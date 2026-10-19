/**
 * Configurações e Credenciais do Projeto Firebase Evolução Argolas
 * Carregadas de forma segura a partir de variáveis de ambiente
 */

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "evolucao-argolas.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "evolucao-argolas",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "evolucao-argolas.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "511096317920",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:511096317920:web:267889aeca1e964030ed85",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-RHZBHS74K2",
};
