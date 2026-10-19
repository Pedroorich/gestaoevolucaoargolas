import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { firebaseConfig } from './config';

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
  } catch {
    app = getApp();
  }
} else {
  app = getApp();
}

try {
  auth = getAuth(app);
} catch {
  auth = {} as Auth;
}

// Inicialização do Firestore com suporte a persistência offline multi-abas no navegador
try {
  if (typeof window !== 'undefined') {
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch {
      // Caso já tenha sido inicializado ou esteja em ambiente com cache restrito
      db = getFirestore(app);
    }
  } else {
    // Em ambiente de servidor / SSR
    db = getFirestore(app);
  }
} catch {
  db = {} as Firestore;
}

export { app, auth, db };
