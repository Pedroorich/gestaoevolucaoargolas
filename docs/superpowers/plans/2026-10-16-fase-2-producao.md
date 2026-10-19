# Módulo Produção — Implementation Plan (Fase 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete Production Module (Fase 2) of Evolução Argolas, enabling production operators to record batches (`lotes_producao`), track scrap/losses (`perdas`), register output shipments to the logistics center via the company van (`saidas_producao`), calculate real-time available inventory by model, and display accessible touchscreen UI for users +50.

**Architecture:** A domain-driven calculation module for stock math and business validations (strict integer non-negative invariants, scrap calculation, available inventory per batch and model), backed by Firebase Firestore repositories with offline cache support and logical deletion/audit logging. The UI provides large tactile cards, quick touch actions, and validation preventing shipping more rings than available.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Firebase Firestore (Web SDK v10 with offline persistence), Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-16-evolucao-argolas-gestao-design.md`

## Global Constraints

- Monetary amounts are strictly integer cents (imported from `@/lib/money`).
- No physical deletion (`DELETE` is prohibited); soft-deletes (`ativo: false`) with audit logging required for all batches and shipments.
- Quantities are strictly non-negative integers; ring shipments cannot exceed available quantity in the origin batch.
- Accessible interface for users +50: Touch targets $\ge 48\text{px}$, body text $\ge 18\text{px}$, high-contrast colors (Preto `#111111`, Laranja `#FF7A00`, Azul `#1565C0`, Branco `#FFFFFF`), maximum 3 primary actions on the initial production view.
- Offline resilience: Must read and write with Firestore multi-tab cache enabled; works seamlessly offline and syncs on reconnect.

## Review Focus

1. **Attempting to ship more rings than available in batch:** Function and UI must reject and display clear Portuguese error message: *"Quantidade informada é maior do que o saldo disponível neste lote"*.
2. **Batch with losses greater than produced quantity:** Domain validator must throw or reject before saving: *"Perdas não podem ser maiores do que a quantidade produzida"*.
3. **Negative quantities or non-integer inputs:** Validator strips/rejects floats, negatives, and non-numeric characters.
4. **Offline data creation:** Writing a batch or shipment while disconnected must succeed locally without crashing and return optimistic UI state.
5. **Soft delete integrity:** Deleting a batch must not alter previous sales or shipments, and must reflect immediately in available inventory totals.

---

### Task 1: Engine de Cálculo de Estoque e Validações de Produção

**Files:**
- Create: `src/lib/producao/estoque.ts`
- Test: `tests/producao/estoque.test.ts`

**Interfaces:**
- Consumes: `LoteProducao`, `SaidaProducao`, `CatalogoItem`, `CATALOGO_ARGOLAS` from `@/types/domain`
- Produces:
  - `calcularSaldoLote(lote: LoteProducao, saidasDoLote: SaidaProducao[]): number`
  - `calcularEstoquePorModelo(lotes: LoteProducao[], saidas: SaidaProducao[]): Record<string, { produzido: number; perdas: number; enviado: number; disponivel: number }>`
  - `calcularEstoqueTotal(lotes: LoteProducao[], saidas: SaidaProducao[]): { produzido: number; perdas: number; enviado: number; disponivel: number }`
  - `validarNovoLote(dados: { modeloId: string; quantidadeProduzida: number; perdas: number }): { valido: boolean; erro?: string }`
  - `validarNovaSaida(dados: { loteId: string; quantidade: number; saldoDisponivel: number }): { valido: boolean; erro?: string }`

- [ ] **Step 1: Write the failing unit tests for stock math and validation**
  - Test `calcularSaldoLote` with valid batch and multiple shipments.
  - Test `calcularSaldoLote` when batch is inactive (`ativo: false`).
  - Test `calcularEstoquePorModelo` aggregating 7 catalog models.
  - Test `validarNovoLote` rejecting negative values, perdas > produzida, and unknown models.
  - Test `validarNovaSaida` rejecting quantity > available balance.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/producao/estoque.test.ts`
  Expected: FAIL with module not found.

- [ ] **Step 3: Implement stock engine in `src/lib/producao/estoque.ts`**
  Implement pure calculation functions adhering to formula:
  $$\text{Disponível} = \text{Produzido} - \text{Perdas} - \text{Enviado}$$

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/producao/estoque.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  `git add tests/producao/estoque.test.ts src/lib/producao/estoque.ts`
  `git commit -m "feat(producao): implement stock calculation engine and production validators"`

---

### Task 2: Repositório Firestore de Lotes, Saídas e Auditoria

**Files:**
- Create: `src/lib/firebase/producao-service.ts`
- Test: `tests/producao/producao-service.test.ts`

**Interfaces:**
- Consumes: `getDb()` from `@/lib/firebase/client`, types from `@/types/domain`, validators from `@/lib/producao/estoque`
- Produces:
  - `criarLote(loteData: Omit<LoteProducao, "id" | "ativo" | "criadoEm" | "atualizadoEm">, usuarioId: string, usuarioNome: string): Promise<string>`
  - `listarLotesAtivos(): Promise<LoteProducao[]>`
  - `criarSaida(saidaData: Omit<SaidaProducao, "id" | "ativo" | "data">, usuarioId: string, usuarioNome: string): Promise<string>`
  - `listarSaidasAtivas(): Promise<SaidaProducao[]>`
  - `excluirLoteLogico(loteId: string, motivo: string, usuarioId: string, usuarioNome: string): Promise<void>`

- [ ] **Step 1: Write unit/mock tests for production service**
  - Test creating batch writes to collection `lotes_producao` and logs audit entry in `logs_auditoria`.
  - Test listing active batches filters out `ativo == false`.
  - Test creating shipment updates and writes audit entry.
  - Test soft delete sets `ativo: false` and writes audit log.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/producao/producao-service.test.ts`
  Expected: FAIL with module not found.

- [ ] **Step 3: Implement Firestore production service in `src/lib/firebase/producao-service.ts`**
  Implement CRUD with offline compatibility, server timestamps, logical deletes, and audit records.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/producao/producao-service.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  `git add tests/producao/producao-service.test.ts src/lib/firebase/producao-service.ts`
  `git commit -m "feat(producao): implement firestore service for batches, shipments and audit logs"`

---

### Task 3: Componentes de Interface Acessível de Produção

**Files:**
- Create: `src/components/producao/EstoqueCard.tsx`
- Create: `src/components/producao/ModalNovoLote.tsx`
- Create: `src/components/producao/ModalNovaSaida.tsx`
- Create: `src/components/producao/TabelaLotesRecentes.tsx`
- Test: `tests/components/producao/EstoqueCard.test.tsx`
- Test: `tests/components/producao/ModaisProducao.test.tsx`

**Interfaces:**
- Consumes: `Button`, `Card` from `@/components/ui`, `CATALOGO_ARGOLAS` from `@/types/domain`
- Produces:
  - Accessible touch UI components with high-contrast text, large buttons ($\ge 48\text{px}$), and clear Portuguese instructions.

- [ ] **Step 1: Write failing component tests**
  - Test `EstoqueCard` renders total available rings and breakdown per model.
  - Test `ModalNovoLote` shows inputs (model select, produced qty, scrap qty, notes) and validates inputs before submitting.
  - Test `ModalNovaSaida` shows batch selector with available stock displayed, quantity input, and prevents exceeding available stock.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/components/producao/`
  Expected: FAIL with components not found.

- [ ] **Step 3: Implement components in `src/components/producao/`**
  Build components following WCAG 2.2 AA and UX guidelines for +50 age group:
  - Minimum touch targets 48px, minimum font 18px.
  - Model selection with descriptive names.
  - Instant calculation of available stock.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/components/producao/`
  Expected: PASS

- [ ] **Step 5: Commit**
  `git add tests/components/producao/ src/components/producao/`
  `git commit -m "feat(producao): create accessible stock cards and production modals"`

---

### Task 4: Integração da Página e Painel de Produção

**Files:**
- Create/Modify: `src/app/producao/page.tsx`
- Modify: `src/components/home/ProducaoHome.tsx`
- Test: `tests/pages/producao-page.test.tsx`

**Interfaces:**
- Consumes: `ModalNovoLote`, `ModalNovaSaida`, `EstoqueCard`, `TabelaLotesRecentes`, `useAuth`
- Produces:
  - Interactive production view where the 3 big action buttons ("Lançar Novo Lote", "Registrar Saída para Van", "Ver Estoque da Fábrica") trigger their corresponding workflows and update stock reactively.

- [ ] **Step 1: Write failing page integration test**
  - Test user can click "Lançar Novo Lote", fill form, and see updated batch list and inventory.
  - Test user can click "Registrar Saída para Van", select batch, and record shipment.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/pages/producao-page.test.tsx`
  Expected: FAIL.

- [ ] **Step 3: Implement page and home integration**
  Wire real state, Firestore listeners/service, and modal controls in `src/app/producao/page.tsx` and connect `ProducaoHome.tsx`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/pages/producao-page.test.tsx`
  Expected: PASS

- [ ] **Step 5: Commit**
  `git add tests/pages/producao-page.test.tsx src/app/producao/page.tsx src/components/home/ProducaoHome.tsx`
  `git commit -m "feat(producao): integrate production page and interactive dashboard actions"`

---

### Task 5: Verificação de Aceite e Testes End-to-End da Fase 2

**Files:**
- Create: `tests/e2e-producao-integration.test.ts`

**Interfaces:**
- Full system validation:
  1. Creating a batch of 5,000 units with 150 losses.
  2. Available stock becomes $5000 - 150 = 4850$.
  3. Shipping 2,000 units on the van decreases available stock to $2850$.
  4. Attempting to ship 3,000 units fails with validation error.
  5. Audit log correctly registers all operations.
  6. Production build passes cleanly.

- [ ] **Step 1: Write acceptance test suite**
- [ ] **Step 2: Run all tests in the project**
  Run: `npm test`
  Expected: All test suites PASS.
- [ ] **Step 3: Run production build verification**
  Run: `npm run build`
  Expected: Build succeeds with 0 errors.
- [ ] **Step 4: Commit and finalize Phase 2**
  `git add tests/e2e-producao-integration.test.ts`
  `git commit -m "test(producao): add comprehensive acceptance tests for Phase 2"`
