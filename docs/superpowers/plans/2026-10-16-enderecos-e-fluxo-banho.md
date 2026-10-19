# Endereços de Clientes, Destino de Entrega e Fluxo de Banho — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement customer physical address tracking, order delivery destination with Google Maps navigation, and the complete industrial electroplating/dipping ("banho") workflow with multi-location stock separation (Fábrica vs. Em Banho vs. Centro de Logística).

**Architecture:** Domain model extensions with strict typing, pure stock engine math keeping items in electroplating outside sellable logistics inventory until return confirmation, Firestore persistence with audit trails, and accessible WCAG 2.2 AA touch UI with 1-click GPS route generation and 1-tap bath status transition.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Firebase Firestore (Web SDK v10 with offline persistence), Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-16-evolucao-argolas-gestao-design.md`

## Global Constraints

- Monetary amounts are strictly integer cents (imported from `@/lib/money`).
- No physical deletion (`DELETE` is prohibited); soft-deletes (`ativo: false`) with audit logging required for all operations.
- Quantities are strictly non-negative integers; bath transitions and shipment releases must preserve total conservation of units.
- Accessible interface for users +50: Touch targets $\ge 48\text{px}$, body text $\ge 18\text{px}$, high-contrast colors (Preto `#111111`, Laranja `#FF7A00`, Azul `#1565C0`, Branco `#FFFFFF`).
- Offline resilience: Must read and write with Firestore multi-tab cache enabled; works seamlessly offline and syncs on reconnect.

## Review Focus

1. **Rings sent to bath must NOT be sellable in logistics until returned:** Attempting to sell rings currently in `em_banho` status must be blocked by `calcularSaldoSaida` returning 0 available for orders.
2. **Bath completion transition restores stock directly into Logistics Center:** When `concluirBanhoRemessa` is triggered, the shipment's balance immediately counts as available stock in logistics for sales orders.
3. **Customer address auto-fills order delivery address:** Selecting an existing customer with an address must populate the delivery address, but allow custom overriding for specific jobsite/secondary deliveries.
4. **Invalid GPS query handling:** If an order has no delivery address or an empty string, the "Abrir no Maps" button must be gracefully hidden or disabled with a helpful tooltip.
5. **Audit logging integrity:** The transition of a shipment from `em_banho` to `concluido` must log an `EDITAR` action in `logs_auditoria` with user metadata and timestamp.

---

### Task 1: Domain Types Extension and Pure Stock Engines

**Files:**
- Modify: `src/types/domain.ts`
- Modify: `src/lib/vendas/vendas-engine.ts`
- Modify: `src/lib/producao/estoque.ts`
- Test: `tests/producao/estoque.test.ts`
- Test: `tests/vendas/vendas-engine.test.ts`

**Interfaces:**
- `Cliente`: add `endereco?: string`, `cep?: string`
- `PedidoVenda`: add `enderecoEntrega?: string`
- `SaidaProducao`: add `destino: 'centro_logistica' | 'banho'`, `statusBanho?: 'nao_aplicavel' | 'em_banho' | 'concluido'`, `dataRetornoBanho?: Date | null`
- `calcularSaldoSaida(saida: SaidaProducao, pedidos: PedidoVenda[]): number`: returns 0 if `saida.destino === 'banho' && saida.statusBanho === 'em_banho'`
- `calcularEstoqueBanho(saidas: SaidaProducao[]): { total: number; porModelo: Record<string, number> }`

- [ ] **Step 1: Write failing unit tests for bath stock isolation and address domain types**
  - Test `calcularSaldoSaida` returning 0 when `destino === 'banho'` and `statusBanho === 'em_banho'`.
  - Test `calcularSaldoSaida` returning full quantity when `destino === 'banho'` and `statusBanho === 'concluido'`.
  - Test `calcularEstoqueBanho` aggregating only active shipments with `statusBanho === 'em_banho'`.
- [ ] **Step 2: Run tests to verify failure**
  Run: `npm test tests/producao/estoque.test.ts tests/vendas/vendas-engine.test.ts`
- [ ] **Step 3: Update domain types and stock calculation functions**
  Implement changes in `src/types/domain.ts`, `src/lib/vendas/vendas-engine.ts`, and `src/lib/producao/estoque.ts`.
- [ ] **Step 4: Run tests to confirm pass**
  Run: `npm test tests/producao/estoque.test.ts tests/vendas/vendas-engine.test.ts`
- [ ] **Step 5: Commit changes**
  Run: `git commit -m "feat(domain): adicionar suporte a enderecos, destino de saida e isolamento de estoque em banho"`

---

### Task 2: Firestore Services (Produção & Vendas)

**Files:**
- Modify: `src/lib/firebase/producao-service.ts`
- Modify: `src/lib/firebase/vendas-service.ts`
- Test: `tests/firebase-services-banho-endereco.test.ts`

**Interfaces:**
- `criarSaida(dados: { loteId: string; modeloId: string; quantidade: number; transporte: TipoEnvio; destino: 'centro_logistica' | 'banho'; responsavelId: string }, usuarioNome?: string)`
- `concluirBanhoRemessa(saidaId: string, responsavel: { id: string; nome: string }): Promise<void>`
- `cadastrarClienteRapido(dados: { nome: string; telefone: string; cidade?: string; endereco?: string }, usuario: { id: string; nome: string }): Promise<string>`
- `criarPedidoVenda(dados: { ..., enderecoEntrega?: string }, usuarioNome?: string): Promise<string>`

- [ ] **Step 1: Write failing tests for service methods with bath status and address**
  - Test `criarSaida` setting `statusBanho: 'em_banho'` when `destino === 'banho'`.
  - Test `concluirBanhoRemessa` updating document and writing audit log.
  - Test `cadastrarClienteRapido` and `criarPedidoVenda` persisting addresses.
- [ ] **Step 2: Run tests to verify failure**
  Run: `npm test tests/firebase-services-banho-endereco.test.ts`
- [ ] **Step 3: Implement service methods in `producao-service.ts` and `vendas-service.ts`**
  Implement bath transition and address persistence with audit trail.
- [ ] **Step 4: Run tests to confirm pass**
  Run: `npm test tests/firebase-services-banho-endereco.test.ts`
- [ ] **Step 5: Commit changes**
  Run: `git commit -m "feat(services): implementar persistencia de endereco e transicao de remessa em banho com auditoria"`

---

### Task 3: Bath UI & Factory Output Management

**Files:**
- Modify: `src/components/producao/ModalNovaSaida.tsx`
- Create: `src/components/producao/CardCargasEmBanho.tsx`
- Modify: `src/app/producao/page.tsx`
- Test: `tests/components/producao/ModalNovaSaida.test.tsx`
- Test: `tests/components/producao/CardCargasEmBanho.test.tsx`

**Features:**
- `ModalNovaSaida`:
  - Radio/segmented buttons for Destination: "Centro de Logística (Pronto para Venda)" vs "Banho / Metalização (Tratamento Terceirizado)".
  - Clear explanation: *"Cargas enviadas para banho não ficam disponíveis para venda até retornarem do processo."*
- `CardCargasEmBanho`:
  - Displays all active shipments currently in bath (`statusBanho === 'em_banho'`).
  - Action button: **"Dar Baixa do Banho -> Enviar para Logística"** with immediate confirmation.
- [ ] **Step 1: Write failing component tests for `ModalNovaSaida` destination selection and `CardCargasEmBanho`**
- [ ] **Step 2: Run component tests to verify failure**
- [ ] **Step 3: Implement destination picker in `ModalNovaSaida` and create `CardCargasEmBanho`**
- [ ] **Step 4: Integrate into `src/app/producao/page.tsx`**
- [ ] **Step 5: Run tests to confirm pass**
- [ ] **Step 6: Commit changes**
  Run: `git commit -m "feat(producao): adicionar selecao de destino banho e painel de baixa de cargas em banho"`

---

### Task 4: Sales Orders & Customer Address UI with GPS Integration

**Files:**
- Modify: `src/components/vendas/ModalNovoPedido.tsx`
- Modify: `src/components/vendas/TabelaPedidosVendas.tsx`
- Modify: `src/components/vendas/CardSaldoRemessas.tsx`
- Modify: `src/app/vendas/page.tsx`
- Test: `tests/components/vendas/ModalNovoPedido.test.tsx`
- Test: `tests/components/vendas/TabelaPedidosVendas.test.tsx`

**Features:**
- `ModalNovoPedido`:
  - When creating a customer on the fly, include "Endereço (Rua, Número, Bairro)".
  - "Endereço de Entrega" field auto-fills with selected customer's address, editable if delivered to a different location.
- `TabelaPedidosVendas`:
  - Shows delivery address on each order row/card.
  - Includes a prominent button: **"Abrir no Google Maps / Waze"** linking to `https://www.google.com/maps/search/?api=1&query=...` with target `_blank`.
- `CardSaldoRemessas`:
  - Clear breakdown: Sellable stock in Logistics vs. Ring volume currently in electroplating bath.
- [ ] **Step 1: Write component tests for address auto-fill and Google Maps button**
- [ ] **Step 2: Run tests to verify failure**
- [ ] **Step 3: Update `ModalNovoPedido`, `TabelaPedidosVendas`, and `CardSaldoRemessas`**
- [ ] **Step 4: Run tests to confirm pass**
- [ ] **Step 5: Commit changes**
  Run: `git commit -m "feat(vendas): adicionar endereco no cliente, destino no pedido e navegacao GPS"`

---

### Task 5: End-to-End Integration & Final Verification

**Files:**
- Create: `tests/e2e-banho-endereco-integration.test.ts`
- Test: Full Vitest suite (`npm test`)
- Build: Next.js build verification (`npm run build`)

- [ ] **Step 1: Write E2E lifecycle test**
  - Create batch -> Ship portion to bath -> Verify 0 sellable in logistics -> Complete bath -> Verify now sellable in logistics -> Place order with delivery address -> Verify delivery address stored and stock decremented.
- [ ] **Step 2: Run all unit and integration tests**
  Run: `npm test`
- [ ] **Step 3: Run Next.js production build check**
  Run: `npm run build`
- [ ] **Step 4: Commit complete feature set**
  Run: `git commit -m "feat: conclusao do fluxo de banho com estoque segregado e enderecos com rota GPS"`
