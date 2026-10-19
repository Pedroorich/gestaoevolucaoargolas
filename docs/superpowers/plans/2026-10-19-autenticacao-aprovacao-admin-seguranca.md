# Autenticação, Aprovação de Acesso por Admin e Segurança — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar sistema completo de cadastro, login com credenciais seguras, proteção contra ataques (rate limit, sanitização, força de senha), trava de acesso por aprovação pelo administrador geral (`ph44608@gmail.com`) e painel de aprovações.

**Architecture:** Autenticação via Firebase Authentication com persistência do documento de usuário no Firestore (`usuarios/{uid}`). Usuários cadastrados recebem status `pendente` e ficam retidos em uma tela de espera até que o admin geral aprove seu acesso e perfil. O email `ph44608@gmail.com` é automaticamente aprovado como Administrador Geral com perfil `gestao` e ganha acesso ao painel de aprovações e gerenciamento de equipe. Rate limiting em memória e no armazenamento local previne tentativas repetidas e ataques de força bruta.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React, Firebase Auth & Firestore, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-16-evolucao-argolas-gestao-design.md`

## Global Constraints

- O e-mail do Administrador Geral aprovador é estritamente `ph44608@gmail.com`.
- Nenhum usuário pode acessar telas ou dados de produção, vendas e gestão sem ter sido aprovado (`status === 'aprovado'` e `ativo === true`).
- A conta do admin `ph44608@gmail.com` é auto-aprovada como `gestao` e `isAdminMaster: true`.
- Senhas devem exigir no mínimo 8 caracteres com combinação de maiúsculas, minúsculas, números e caracteres especiais.
- Proteção de força bruta com rate limiting: máximo de 5 tentativas consecutivas de login por 15 minutos com bloqueio temporário.
- Sanitização rigorosa de inputs (email e nome) prevenindo injeções de script/HTML.
- Padrão de acessibilidade para usuários 50+ anos com botões grandes (>= 48px), textos legíveis e feedback visual em português claro.
- Não remover dados físicos do banco de dados (exclusões são lógicas, status inativo).

## Review Focus

1. **Tentativas repetidas de senha inválida (Brute-Force):** Garantir que após 5 tentativas incorretas o usuário seja temporariamente bloqueado com mensagem explicativa e contador regressivo.
2. **Usuário com cadastro pendente tentando navegar:** Garantir que rotas e contexto bloqueiem visualização de dados e exibam a tela de aguardo de aprovação.
3. **Email `ph44608@gmail.com`:** Garantir que o email do admin receba aprovação automática e permissões master de gerenciamento e aprovação.
4. **Sanitização de caracteres:** Garantir que nomes e emails com espaços extras ou caracteres HTML/scripts maliciosos sejam normalizados e neutralizados.
5. **Persistência de sessão e logout seguro:** Garantir que o logout limpe o estado local e redirecione imediatamente para a tela de login.

---

### Task 1: Módulo de Segurança, Validação e Rate Limiting

**Files:**
- Create: `src/lib/auth/security.ts`
- Create: `tests/lib/auth-security.test.ts`

- [ ] Criar teste unitário em `tests/lib/auth-security.test.ts` cobrindo:
  - Validação de força de senha (tamanho >= 8, maiúscula, minúscula, número, especial).
  - Sanitização de nome e email (trim, lowercase, remoção de tags HTML).
  - Rate limiting (registro de falhas, bloqueio após 5 tentativas, cálculo de tempo restante, reset após sucesso).
- [ ] Executar o teste e verificar que falha (`npm test tests/lib/auth-security.test.ts`).
- [ ] Implementar `src/lib/auth/security.ts` com funções:
  - `validatePasswordStrength(password: string): { isValid: boolean; score: number; errors: string[] }`
  - `sanitizeEmail(email: string): string`
  - `sanitizeName(name: string): string`
  - `checkRateLimit(identifier: string): { isBlocked: boolean; waitSeconds: number; attemptsLeft: number }`
  - `recordFailedAttempt(identifier: string): { isBlocked: boolean; waitSeconds: number }`
  - `resetRateLimit(identifier: string): void`
  - `ADMIN_MASTER_EMAIL = 'ph44608@gmail.com'`
  - `isAdminMasterEmail(email: string): boolean`
- [ ] Rodar os testes para confirmar que passam 100%.

---

### Task 2: Extensão dos Tipos de Domínio e Serviço de Usuários

**Files:**
- Modify: `src/types/domain.ts:5-15`
- Create: `src/lib/firebase/user-service.ts`
- Create: `tests/lib/user-service.test.ts`

- [ ] Atualizar `src/types/domain.ts` adicionando:
  - Status de usuário: `StatusUsuario = 'pendente' | 'aprovado' | 'rejeitado'`
  - Propriedades em `Usuario`: `status: StatusUsuario`, `aprovado: boolean`, `isAdminMaster?: boolean`, `aprovadoPor?: string | null`, `aprovadoEm?: string | null`, `motivoRejeicao?: string`
- [ ] Escrever teste unitário em `tests/lib/user-service.test.ts` para as operações de usuário:
  - Criar perfil inicial de usuário no Firestore (com status `pendente` ou `aprovado` caso seja `ph44608@gmail.com`).
  - Buscar lista de usuários pendentes.
  - Aprovar usuário com atribuição de perfil.
  - Rejeitar / bloquear usuário.
- [ ] Implementar `src/lib/firebase/user-service.ts` com integração ao Firestore.
- [ ] Rodar os testes para garantir funcionamento correto.

---

### Task 3: Atualização do AuthContext e AuthGuard

**Files:**
- Modify: `src/context/AuthContext.tsx`
- Create: `src/components/auth/AuthGuard.tsx`
- Modify: `src/hooks/useAuth.ts`
- Create: `tests/context/AuthContext.test.tsx`

- [ ] Remover o usuário padrão estático (`USUARIO_PADRAO_SISTEMA`) como login automático default para usuários não autenticados.
- [ ] No `AuthContext.tsx`, atualizar para:
  - Expor `statusAprovacao: StatusUsuario` e `isAdminMaster: boolean`.
  - Método `cadastrar(nome, email, senha, perfilDesejado)` com sanitização, validação de segurança e criação no Firebase Auth + Firestore.
  - Método `login(email, senha)` aplicando rate limiting pré-requisição e pós-falha.
  - Carregamento em tempo real do documento em `usuarios/{uid}` para refletir aprovação imediata sem precisar relogar.
- [ ] Criar `AuthGuard.tsx` que intercepta renderização de rotas:
  - Se deslogado: exibe tela de Autenticação (`AuthScreen`).
  - Se logado com `status === 'pendente'`: exibe tela de Aguardo de Aprovação (`PendingApprovalScreen`).
  - Se logado com `status === 'rejeitado'` ou `!ativo`: exibe tela de Acesso Negado (`BlockedAccountScreen`).
  - Se logado e aprovado: renderiza o sistema normalmente.
- [ ] Testar fluxo de autenticação e proteção no Vitest.

---

### Task 4: Telas e Componentes de Autenticação (Login, Cadastro e Espera)

**Files:**
- Create: `src/components/auth/AuthScreen.tsx`
- Create: `src/components/auth/PendingApprovalScreen.tsx`
- Create: `src/components/auth/BlockedAccountScreen.tsx`
- Create: `tests/components/auth/AuthScreen.test.tsx`

- [ ] Escrever testes de componentes em `tests/components/auth/AuthScreen.test.tsx`:
  - Alternância entre abas "Entrar" e "Criar Conta".
  - Feedback de erros (senha fraca, email inválido, bloqueio por rate limit).
  - Exibição da tela de aguardo com menção clara ao admin `ph44608@gmail.com`.
- [ ] Implementar `AuthScreen.tsx`:
  - Visual moderno, responsivo e de alto contraste (paleta da Evolução Argolas: preto, laranja, branco, cinza).
  - Aba Login: Email, Senha, Mostrar/Ocultar senha, Botão "Entrar", Alerta de Rate Limit com contador.
  - Aba Cadastro: Nome completo, Email, Senha com medidor de força (fraca, média, forte) e checklist de requisitos, confirmação de senha, seleção de setor desejado, botão "Criar Conta".
- [ ] Implementar `PendingApprovalScreen.tsx`:
  - Ícone de relógio/espera, mensagem amigável explicando que a conta foi criada e está sob análise do administrador geral (`ph44608@gmail.com`).
  - Botão "Verificar se já fui aprovado" e botão "Sair / Entrar com outra conta".
- [ ] Implementar `BlockedAccountScreen.tsx` para contas inativadas ou recusadas com botão de logout.
- [ ] Rodar testes e validar visualmente.

---

### Task 5: Painel de Aprovação e Gestão de Usuários para o Admin Master

**Files:**
- Create: `src/components/admin/PainelAprovacoes.tsx`
- Create: `src/app/gestao/usuarios/page.tsx`
- Modify: `src/components/navigation/BottomNav.tsx`
- Modify: `src/app/layout.tsx`
- Create: `tests/components/admin/PainelAprovacoes.test.tsx`

- [ ] Escrever teste para o painel em `tests/components/admin/PainelAprovacoes.test.tsx`:
  - Renderiza lista de solicitações pendentes.
  - Permite alterar o perfil desejado antes de aprovar.
  - Aciona aprovação e rejeição com sucesso.
  - Exibe selo especial de Administrador Geral (`ph44608@gmail.com`).
- [ ] Implementar `PainelAprovacoes.tsx`:
  - Lista de Usuários Pendentes com dados: Nome, E-mail, Data do pedido, Seletor de Perfil (`produção`, `logística`, `gestão`), Botão "Aprovar Acesso" e Botão "Recusar".
  - Lista de Usuários Aprovados com status ativo/inativo, opção de alterar perfil e desativar usuário.
- [ ] Criar a página `/gestao/usuarios/page.tsx` protegida exclusivamente para `ph44608@gmail.com` ou perfil gestão.
- [ ] Atualizar `src/app/layout.tsx`:
  - Adicionar cabeçalho com identificação do usuário logado, tag de cargo (`Admin Geral`, `Gestão`, `Produção`, `Logística`) e botão de `Sair` (Logout).
  - Se for `ph44608@gmail.com`, exibir botão/atalho destacado para "Aprovações".
- [ ] Rodar a suíte de testes completa do Vitest para verificar que tudo passa sem quebras.

---

### Task 6: Validação de Segurança Integrada e Build de Produção

**Files:**
- Run: `npm test`
- Run: `npm run build`
- Manual test: testar criação de conta, bloqueio por senha fraca, rate limit, aguardo de aprovação, login como `ph44608@gmail.com` e aprovação de usuário.

- [ ] Executar toda a suíte de testes com vitest (`npm test`).
- [ ] Executar `npm run build` para garantir que o Next.js constrói sem nenhum erro de tipo TypeScript ou empacotamento.
- [ ] Conferir que o servidor local `http://localhost:3000` roda perfeitamente com todas as proteções ativas.
