import { describe, it, expect, beforeEach } from 'vitest';
import {
  validatePasswordStrength,
  sanitizeEmail,
  sanitizeName,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  ADMIN_MASTER_EMAIL,
  isAdminMasterEmail,
  timingSafeEqual,
  sanitizeTextInput,
  checkRegistrationRateLimit,
  recordRegistrationAttempt,
} from '@/lib/auth/security';

describe('Módulo de Segurança e Autenticação (security.ts)', () => {
  describe('ADMIN_MASTER_EMAIL e isAdminMasterEmail', () => {
    it('deve ter o email do admin geral definido exatamente como ph44608@gmail.com', () => {
      expect(ADMIN_MASTER_EMAIL).toBe('ph44608@gmail.com');
    });

    it('deve validar corretamente o email do admin geral ignorando maiúsculas/minúsculas e espaços', () => {
      expect(isAdminMasterEmail('ph44608@gmail.com')).toBe(true);
      expect(isAdminMasterEmail('PH44608@GMAIL.COM')).toBe(true);
      expect(isAdminMasterEmail('  ph44608@gmail.com  ')).toBe(true);
      expect(isAdminMasterEmail('outro@gmail.com')).toBe(false);
      expect(isAdminMasterEmail('')).toBe(false);
    });
  });

  describe('sanitizeEmail', () => {
    it('deve limpar espaços e converter para minúsculas', () => {
      expect(sanitizeEmail('  Usuario.Teste@Email.COM  ')).toBe('usuario.teste@email.com');
    });

    it('deve validar formato de email válido', () => {
      expect(sanitizeEmail('usuario@empresa.com.br')).toBe('usuario@empresa.com.br');
    });

    it('deve rejeitar emails com formato inválido', () => {
      expect(() => sanitizeEmail('emailinvalido')).toThrow('Formato de e-mail inválido');
      expect(() => sanitizeEmail('user@')).toThrow('Formato de e-mail inválido');
      expect(() => sanitizeEmail('@dominio.com')).toThrow('Formato de e-mail inválido');
    });
  });

  describe('sanitizeName', () => {
    it('deve remover espaços extras nas pontas', () => {
      expect(sanitizeName('   João da Silva   ')).toBe('João da Silva');
    });

    it('deve neutralizar/remover tags HTML e scripts maliciosos (XSS)', () => {
      const malicious = '<script>alert("hacked")</script>Pedro Paulo';
      const sanitized = sanitizeName(malicious);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).toContain('Pedro Paulo');
    });

    it('deve rejeitar nomes vazios', () => {
      expect(() => sanitizeName('   ')).toThrow('Nome não pode ser vazio');
    });
  });

  describe('validatePasswordStrength', () => {
    it('deve reprovar senhas curtas com menos de 8 caracteres', () => {
      const result = validatePasswordStrength('Ab1@xyz');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('A senha deve ter no mínimo 8 caracteres.');
    });

    it('deve exigir letra maiúscula, minúscula, número e caractere especial', () => {
      const semMaiuscula = validatePasswordStrength('senha123@#');
      expect(semMaiuscula.isValid).toBe(false);
      expect(semMaiuscula.errors).toContain('A senha deve conter ao menos uma letra maiúscula.');

      const semNumero = validatePasswordStrength('SenhaForte@#');
      expect(semNumero.isValid).toBe(false);
      expect(semNumero.errors).toContain('A senha deve conter ao menos um número.');

      const semEspecial = validatePasswordStrength('SenhaForte123');
      expect(semEspecial.isValid).toBe(false);
      expect(semEspecial.errors).toContain('A senha deve conter ao menos um caractere especial (!@#$%^&* etc.).');
    });

    it('deve aprovar senha forte que cumpre todos os requisitos de segurança', () => {
      const result = validatePasswordStrength('Argolas@2026!');
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.score).toBe(4);
    });
  });

  describe('Rate Limiting de Tentativas de Login (Proteção contra Força Bruta)', () => {
    const testId = 'test-user@argolas.com';

    beforeEach(() => {
      resetRateLimit(testId);
    });

    it('deve permitir as 5 primeiras tentativas incorretas sem bloquear', () => {
      for (let i = 1; i <= 5; i++) {
        const attempt = recordFailedAttempt(testId);
        if (i < 5) {
          expect(attempt.isBlocked).toBe(false);
          const status = checkRateLimit(testId);
          expect(status.isBlocked).toBe(false);
          expect(status.attemptsLeft).toBe(5 - i);
        } else {
          // Na 5ª tentativa falha consecutiva, ativa bloqueio temporário
          expect(attempt.isBlocked).toBe(true);
          expect(attempt.waitSeconds).toBeGreaterThan(0);
        }
      }
    });

    it('deve bloquear a 6ª tentativa imediatamente com tempo de espera', () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(testId);
      }
      const check = checkRateLimit(testId);
      expect(check.isBlocked).toBe(true);
      expect(check.waitSeconds).toBeGreaterThan(0);
      expect(check.attemptsLeft).toBe(0);
    });

    it('deve resetar o bloqueio quando resetRateLimit for chamado após login bem-sucedido', () => {
      for (let i = 0; i < 4; i++) {
        recordFailedAttempt(testId);
      }
      resetRateLimit(testId);
      const check = checkRateLimit(testId);
      expect(check.isBlocked).toBe(false);
      expect(check.attemptsLeft).toBe(5);
    });
  });

  describe('timingSafeEqual (Mitigação de Timing Attacks - Cloudflare Standard)', () => {
    it('deve retornar true para strings idênticas em tempo constante', () => {
      expect(timingSafeEqual('hash123456789', 'hash123456789')).toBe(true);
      expect(timingSafeEqual('', '')).toBe(true);
    });

    it('deve retornar false para strings diferentes com mesmo comprimento', () => {
      expect(timingSafeEqual('hash123456789', 'hash123456780')).toBe(false);
    });

    it('deve retornar false para strings de comprimentos diferentes', () => {
      expect(timingSafeEqual('hash123', 'hash1234')).toBe(false);
    });

    it('deve retornar false se qualquer argumento não for string', () => {
      expect(timingSafeEqual(null as any, 'teste')).toBe(false);
      expect(timingSafeEqual('teste', undefined as any)).toBe(false);
    });
  });

  describe('sanitizeTextInput (Proteção contra XSS e Injeções em Entradas)', () => {
    it('deve remover tags HTML e scripts maliciosos', () => {
      const input = '<img src=x onerror=alert(1)>Rua das Flores, 123';
      expect(sanitizeTextInput(input)).toBe('Rua das Flores, 123');
    });

    it('deve remover caracteres de controle invisíveis', () => {
      const input = 'Texto\u0000Com\u001FControle';
      expect(sanitizeTextInput(input)).toBe('TextoComControle');
    });

    it('deve respeitar o limite máximo de caracteres (maxLength)', () => {
      const input = 'a'.repeat(600);
      expect(sanitizeTextInput(input, 100).length).toBe(100);
    });

    it('deve lidar com null e undefined graciosamente', () => {
      expect(sanitizeTextInput(null)).toBe('');
      expect(sanitizeTextInput(undefined)).toBe('');
    });
  });

  describe('Rate Limiting de Criação de Contas (Proteção contra DoS e Spam)', () => {
    const regId = 'novo-cadastro-bot@teste.com';

    it('deve bloquear após 3 tentativas de cadastro em curto período', () => {
      recordRegistrationAttempt(regId);
      recordRegistrationAttempt(regId);
      const third = recordRegistrationAttempt(regId);

      expect(third.isBlocked).toBe(true);
      expect(third.waitSeconds).toBeGreaterThan(0);

      const check = checkRegistrationRateLimit(regId);
      expect(check.isBlocked).toBe(true);
      expect(check.waitSeconds).toBeGreaterThan(0);
    });
  });
});
