import { describe, it, expect } from 'vitest';
import { firebaseConfig } from '@/lib/firebase/config';

describe('Configuração do Firebase', () => {
  it('contém as credenciais corretas do projeto evolucao-argolas', () => {
    expect(firebaseConfig.projectId).toBe('evolucao-argolas');
    expect(firebaseConfig.authDomain).toBe('evolucao-argolas.firebaseapp.com');
    expect(typeof firebaseConfig.apiKey).toBe('string');
    expect(firebaseConfig.storageBucket).toBe('evolucao-argolas.firebasestorage.app');
    expect(firebaseConfig.messagingSenderId).toBe('511096317920');
    expect(firebaseConfig.appId).toBe('1:511096317920:web:267889aeca1e964030ed85');
    expect(firebaseConfig.measurementId).toBe('G-RHZBHS74K2');
  });
});
