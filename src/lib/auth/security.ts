/**
 * Módulo de Segurança, Validação e Proteção contra Força Bruta (Rate Limiting)
 * Sistema de Gestão — Evolução Argolas
 */

export const ADMIN_MASTER_EMAIL = 'ph44608@gmail.com';

/**
 * Verifica se um determinado e-mail pertence ao Administrador Geral Master.
 */
export function isAdminMasterEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_MASTER_EMAIL.toLowerCase();
}

/**
 * Sanitiza e valida o formato de um endereço de e-mail.
 * Previne injeções e caracteres perigosos.
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Formato de e-mail inválido');
  }

  const cleaned = email.trim().toLowerCase();

  // Expressão regular segura para validação RFC 5322 simplificada
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  if (!emailRegex.test(cleaned)) {
    throw new Error('Formato de e-mail inválido');
  }

  return cleaned;
}

/**
 * Sanitiza nome de usuário removendo tags HTML, scripts e espaços excessivos (Prevenção XSS).
 */
export function sanitizeName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Nome não pode ser vazio');
  }

  // Remove tags HTML/scripts
  const stripped = name.replace(/<[^>]*>?/gm, '').trim();

  // Remove caracteres de controle invisíveis mantendo letras, acentos, números e pontuações comuns
  const sanitized = stripped.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();

  if (!sanitized) {
    throw new Error('Nome não pode ser vazio');
  }

  return sanitized;
}

export interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0 a 4
  errors: string[];
}

/**
 * Avalia rigorosamente a robustez de uma senha.
 * Exige no mínimo 8 caracteres, maiúscula, minúscula, número e caractere especial.
 */
export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push('A senha deve ter no mínimo 8 caracteres.');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('A senha deve conter ao menos uma letra maiúscula.');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('A senha deve conter ao menos uma letra minúscula.');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('A senha deve conter ao menos um número.');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push('A senha deve conter ao menos um caractere especial (!@#$%^&* etc.).');
  }

  let score = 0;
  if (password && password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) score++;

  return {
    isValid: errors.length === 0,
    score,
    errors,
  };
}

/**
 * Rate Limiter Local / Memória para proteção contra ataques de Força Bruta e Credential Stuffing.
 */
interface RateLimitEntry {
  attempts: number;
  lockedUntil?: number;
  lastAttemptAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutos de bloqueio temporário
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // Janela de contagem de 15 minutos

function getStorageKey(id: string): string {
  return `ea_ratelimit_${id.toLowerCase().trim()}`;
}

function loadEntry(id: string): RateLimitEntry {
  const cleanId = id.toLowerCase().trim();
  const now = Date.now();

  let entry = rateLimitStore.get(cleanId);

  // Tenta ler do localStorage se disponível no navegador
  if (!entry && typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(getStorageKey(cleanId));
      if (stored) {
        entry = JSON.parse(stored);
      }
    } catch {
      // Ignora falhas de parse
    }
  }

  if (!entry) {
    entry = { attempts: 0, lastAttemptAt: now };
  }

  // Se a janela de 15 minutos expirou e não está bloqueado, reinicia a contagem
  if (!entry.lockedUntil && now - entry.lastAttemptAt > ATTEMPT_WINDOW_MS) {
    entry = { attempts: 0, lastAttemptAt: now };
  }

  // Se estava bloqueado e o tempo de bloqueio expirou, desbloqueia
  if (entry.lockedUntil && now > entry.lockedUntil) {
    entry = { attempts: 0, lastAttemptAt: now };
  }

  return entry;
}

function saveEntry(id: string, entry: RateLimitEntry): void {
  const cleanId = id.toLowerCase().trim();
  rateLimitStore.set(cleanId, entry);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(getStorageKey(cleanId), JSON.stringify(entry));
    } catch {
      // Ignora falhas de storage
    }
  }
}

/**
 * Verifica se um identificador (e-mail ou IP) está atualmente bloqueado por tentativas excessivas.
 */
export function checkRateLimit(identifier: string): {
  isBlocked: boolean;
  waitSeconds: number;
  attemptsLeft: number;
} {
  const cleanId = identifier.toLowerCase().trim();
  const entry = loadEntry(cleanId);
  const now = Date.now();

  if (entry.lockedUntil && entry.lockedUntil > now) {
    const waitSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return {
      isBlocked: true,
      waitSeconds,
      attemptsLeft: 0,
    };
  }

  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - entry.attempts);
  return {
    isBlocked: false,
    waitSeconds: 0,
    attemptsLeft,
  };
}

/**
 * Registra uma tentativa de login falha e aciona bloqueio caso alcance o limite.
 */
export function recordFailedAttempt(identifier: string): {
  isBlocked: boolean;
  waitSeconds: number;
} {
  const cleanId = identifier.toLowerCase().trim();
  const entry = loadEntry(cleanId);
  const now = Date.now();

  entry.attempts += 1;
  entry.lastAttemptAt = now;

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    saveEntry(cleanId, entry);
    const waitSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000);
    return {
      isBlocked: true,
      waitSeconds,
    };
  }

  saveEntry(cleanId, entry);
  return {
    isBlocked: false,
    waitSeconds: 0,
  };
}

/**
 * Reseta o contador de tentativas após uma autenticação bem-sucedida.
 */
export function resetRateLimit(identifier: string): void {
  const cleanId = identifier.toLowerCase().trim();
  rateLimitStore.delete(cleanId);

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(getStorageKey(cleanId));
    } catch {
      // Ignora falhas
    }
  }
}

export const ADMIN_MASTER_DEFAULT_HASH =
  '15b5eb4c0958d5f3aa4518cfb5e30ebf91dec7caee544c7fd46a8dfb57a2155c';

/**
 * Gera hash SHA-256 seguro para verificação de credenciais.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Valida a senha fornecida contra a credencial master do Administrador Geral usando hash seguro SHA-256.
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const hash = await hashPassword(password);
    return hash === ADMIN_MASTER_DEFAULT_HASH;
  } catch {
    return false;
  }
}

