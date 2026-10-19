# Módulo Logística e Vendas — Implementation Plan (Fase 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete Logistics and Sales Module (Fase 3) of Evolução Argolas, enabling the logistics team to receive ring shipments delivered by the van, register multi-item sales and deliveries tied to real origin shipments, support sales in closed kg packages or units (minimum 100 units), record freight/shipping types, manage delivery statuses (pendente, entregue, cancelada), and provide an accessible touchscreen UI for users +50.

**Architecture:** A domain engine for sales calculation and balance validation (tracking available rings per received shipment, multi-item totalization in integer cents, kg-to-unit conversions), backed by Firestore services with offline cache, customer linkage, and audit logging. The UI features large tactile forms, easy multi-item builders, and instant status updates.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Firebase Firestore (with IndexedDB offline cache), Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-16-evolucao-argolas-gestao-design.md`

## Global Constraints

- Monetary amounts are strictly integer cents (imported from `@/lib/money`).
- No physical deletion (`DELETE` is prohibited); soft-deletes (`ativo: false`) with audit logging for all orders and status transitions.
- Every sale item MUST be linked to an active `saida_producao` with sufficient available balance; selling more rings than available in the shipment is strictly blocked.
- Minimum order: 100 units for unit-based sales, or by package in kg (converted via `unidadesPorKgAprox`).
- Accessible interface for users +50: Touch targets $\ge 48\text{px}$, body text $\ge 18\text{px}$, high-contrast palette (Preto, Laranja `#FF7A00`, Azul `#1565C0`, Branco), simple Portuguese terminology.
- Offline resilience: Must read and write seamlessly with Firestore multi-tab cache enabled.

## Review Focus

1. **Attempting to sell more rings than available in origin shipment:** Validator must reject: *"Quantidade informada é maior do que o saldo disponível nesta remessa da van"*.
2. **Order with less than 100 units for unit-based sale:** Validator must reject: *"Pedido mínimo para venda fracionada é de 100 unidades"*.
3. **Multi-item order calculation in integer cents:** Totals must exactly equal sum of items plus freight in cents, with zero floating-point math.
4. **Changing order status (pendente -> entregue / cancelada):** Must update status, maintain audit trail in `logs_auditoria`, and if cancelled, restore the available balance of the origin shipments.
5. **Customer linkage:** Every order records customer name and ID, and increments customer purchase count when delivered.

---

### Task 1: Engine de Cálculos de Vendas, Itens e Saldo de Remessas

**Files:**
- Create: `src/lib/vendas/vendas-engine.ts`
- Test: `tests/vendas/vendas-engine.test.ts`

**Interfaces:**
- Consumes: `SaidaProducao`, `CatalogoItem`, `CATALOGO_ARGOLAS` from `@/types/domain`, `toCents` from `@/lib/money`
- Produces:
  - `calcularSaldoSaida(saida: SaidaProducao, pedidos: PedidoVenda[]): number`
  - `converterKgParaUnidades(modeloId: string, pesoKg: number): number`
  - `validarItemPedido(item: ItemPedidoVendaInput, saldoDisponivelNaSaida: number): { valido: boolean; erro?: string }`
  - `calcularTotaisPedido(itens: ItemPedidoVenda[], freteCentavos: number): { totalItensCentavos: number; totalGeralCentavos: number; totalUnidades: number }`
  - `validarPedidoCompleto(pedido: PedidoVendaInput, saldoPorSaida: Record<string, number>): { valido: boolean; erro?: string }`

- [ ] **Step 1: Write failing unit tests for sales engine**
  - Test `calcularSaldoSaida` deducts quantities from delivered and pending orders, but restores cancelled orders.
  - Test `converterKgParaUnidades` calculates approximate units based on catalog `unidadesPorKgAprox`.
  - Test `validarItemPedido` enforces minimum 100 units and blocks exceeding shipment balance.
  - Test `calcularTotaisPedido` correctly sums integer cents without floating point errors.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/vendas/vendas-engine.test.ts`
  Expected: FAIL with module not found.

- [ ] **Step 3: Implement sales calculation engine in `src/lib/vendas/vendas-engine.ts`**
  Implement pure calculation functions and domain validations.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/vendas/vendas-engine.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  `git add tests/vendas/vendas-engine.test.ts src/lib/vendas/vendas-engine.ts`
  `git commit -m "feat(vendas): implement sales calculation engine and shipment balance validations"`

---

### Task 2: Repositório Firestore de Vendas, Clientes e Auditoria

**Files:**
- Create: `src/lib/firebase/vendas-service.ts`
- Test: `tests/vendas/vendas-service.test.ts`

**Interfaces:**
- Consumes: `db` from `@/lib/firebase/client`, types from `@/types/domain`, `vendas-engine`
- Produces:
  - `criarPedidoVenda(dadosPedido: NovoPedidoInput, usuarioId: string, usuarioNome: string): Promise<string>`
  - `listarPedidosVendas(): Promise<PedidoVenda[]>`
  - `atualizarSituacaoPedido(pedidoId: string, novaSituacao: SituacaoPedido, usuarioId: string, usuarioNome: string): Promise<void>`
  - `listarClientesParaVenda(): Promise<Array<{ id: string; nome: string; cidade: string; telefone: string }>>`
  - `cadastrarClienteRapido(dados: { nome: string; telefone: string; cidade: string }, usuarioId: string, usuarioNome: string): Promise<string>`

- [ ] **Step 1: Write failing unit/mock tests for vendas service**
  - Test `criarPedidoVenda` validates items, writes to `pedidos_vendas` with sequential number, and registers audit entry.
  - Test `atualizarSituacaoPedido` transitions state (e.g. to "entregue") and logs audit.
  - Test `cadastrarClienteRapido` creates customer in `clientes` with `totalCompras: 0`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/vendas/vendas-service.test.ts`
  Expected: FAIL with module not found.

- [ ] **Step 3: Implement Firestore sales service in `src/lib/firebase/vendas-service.ts`**

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/vendas/vendas-service.test.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  `git add tests/vendas/vendas-service.test.ts src/lib/firebase/vendas-service.ts`
  `git commit -m "feat(vendas): implement firestore service for delivery orders, customers and audit"`

---

### Task 3: Componentes de Interface Acessível de Vendas e Logística

**Files:**
- Create: `src/components/vendas/CardSaldoRemessas.tsx`
- Create: `src/components/vendas/ModalNovoPedido.tsx`
- Create: `src/components/vendas/TabelaPedidosVendas.tsx`
- Test: `tests/components/vendas/ModalNovoPedido.test.tsx`
- Test: `tests/components/vendas/TabelaPedidosVendas.test.tsx`

**Interfaces:**
- Consumes: `Button`, `Card` from `@/components/ui`, types from `@/types/domain`
- Produces:
  - `CardSaldoRemessas`: shows available ring stock received in logistics from the van.
  - `ModalNovoPedido`: accessible multi-item order builder (customer select/create, item rows with kg or unit switch, freight, delivery method).
  - `TabelaPedidosVendas`: order list with status badges, item summary, and one-tap "Marcar como Entregue" button.

- [ ] **Step 1: Write failing component tests**
  - Test `ModalNovoPedido` allows adding item lines, switches between kg and units, and submits valid order.
  - Test `TabelaPedidosVendas` displays order details and triggers status update callback.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/components/vendas/`
  Expected: FAIL.

- [ ] **Step 3: Implement components in `src/components/vendas/`**

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/components/vendas/`
  Expected: PASS

- [ ] **Step 5: Commit**
  `git add tests/components/vendas/ src/components/vendas/`
  `git commit -m "feat(vendas): create accessible multi-item order modal and delivery order tables"`

---

### Task 4: Integração da Página de Logística e Dashboard de Vendas

**Files:**
- Create: `src/app/vendas/page.tsx`
- Modify: `src/components/dashboard/LogisticaHome.tsx`
- Test: `tests/pages/vendas-page.test.tsx`

**Interfaces:**
- Consumes: `useAuth`, `vendas-service`, `producao-service`, `ModalNovoPedido`, `TabelaPedidosVendas`, `CardSaldoRemessas`
- Produces:
  - Full logistics and sales workspace at `/vendas` with interactive modals and dashboard card links.

- [ ] **Step 1: Write failing page integration test**
  - Test page renders received van shipments, recent delivery orders, and opens order modal.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test tests/pages/vendas-page.test.tsx`
  Expected: FAIL.

- [ ] **Step 3: Implement `/vendas/page.tsx` and connect `LogisticaHome.tsx`**

- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test tests/pages/vendas-page.test.tsx`
  Expected: PASS

- [ ] **Step 5: Commit**
  `git add src/app/vendas/page.tsx src/components/dashboard/LogisticaHome.tsx tests/pages/vendas-page.test.tsx`
  `git commit -m "feat(vendas): integrate logistics page and connected action cards"`

---

### Task 5: Verificação de Aceite e Testes End-to-End da Fase 3

**Files:**
- Create: `tests/e2e-vendas-integration.test.ts`

**Interfaces:**
- Full acceptance scenario:
  1. Production produces 10,000 rings; van loads 4,000 rings to logistics.
  2. Logistics receives shipment of 4,000 rings.
  3. Client A orders 10 kg of 19mm (~9,500 units, exceeds shipment -> BLOCKED).
  4. Client A orders 2 kg of 19mm (~1,900 units) + 500 custom units. Total: 2,400 units. Price: R$ 350,00 + R$ 30,00 Lalamove freight.
  5. Order is saved as "pendente". Shipment available balance decreases from 4,000 to 1,600.
  6. Logistics marks order as "entregue". Status updates, audit log records transition.
  7. Client B tries to order 2,000 units against remaining 1,600 -> BLOCKED.
  8. Full test suite passes; production build passes with 0 errors.

- [ ] **Step 1: Write E2E acceptance test suite**
- [ ] **Step 2: Run full test suite (`npm test`)**
- [ ] **Step 3: Run production build verification (`npm run build`)**
- [ ] **Step 4: Commit and finalize Phase 3**
  `git add tests/e2e-vendas-integration.test.ts`
  `git commit -m "test(vendas): add comprehensive acceptance tests for Phase 3 Logistics and Sales"`
