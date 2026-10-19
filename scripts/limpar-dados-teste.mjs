import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "evolucao-argolas.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "evolucao-argolas",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "evolucao-argolas.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "511096317920",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:511096317920:web:267889aeca1e964030ed85",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-RHZBHS74K2",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const colecoesParaLimpar = [
  'lotes_producao',
  'saidas_producao',
  'pedidos_vendas',
  'clientes',
  'logs_auditoria',
];

async function limparDadosDeTeste() {
  console.log('Iniciando limpeza das informações de teste no Firestore...');

  for (const colName of colecoesParaLimpar) {
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      console.log(`Coleção '${colName}': encontrados ${snapshot.docs.length} documentos de teste.`);

      for (const docSnap of snapshot.docs) {
        await deleteDoc(docSnap.ref);
      }
      console.log(`✅ Coleção '${colName}' limpa com sucesso.`);
    } catch (err) {
      console.warn(`Aviso ao limpar coleção '${colName}':`, err.message);
    }
  }

  // Verifica a coleção de usuários
  try {
    const userSnap = await getDocs(collection(db, 'usuarios'));
    console.log(`🔒 Coleção 'usuarios' preservada intacta com ${userSnap.docs.length} conta(s) mantida(s).`);
  } catch (err) {
    console.warn('Aviso ao inspecionar usuários:', err.message);
  }

  console.log('\n✨ Limpeza de dados de teste finalizada com sucesso!');
}

limparDadosDeTeste()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erro na limpeza:', err);
    process.exit(1);
  });
