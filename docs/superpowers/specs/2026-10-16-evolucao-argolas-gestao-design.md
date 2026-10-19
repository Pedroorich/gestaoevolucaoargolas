# Documento de Design — Sistema de Gestão Evolução Argolas

**Data:** 16 de outubro de 2026  
**Versão:** 1.1 (Revisada com Validação Técnica e Comercial)  
**Status:** Pronto para Aprovação do Usuário e Planejamento  

---

## 1. Intenção e Visão Geral (O "Porquê")

A **Evolução Argolas** é uma pequena indústria fabricante de argolas para chaveiro, operando em dois centros integrados:
1. **Centro de Produção:** Onde o arame é transformado em lotes de argolas acabadas, controlando estoques e perdas.
2. **Centro de Logística:** Onde os pedidos dos clientes são separados, embalados e entregues (via van própria ou fretes terceirizados), registrando as vendas e recebimentos.

### O Problema
Atualmente, o controle manual gera incertezas sobre o estoque real disponível, a margem de lucro exata por venda (considerando matéria-prima, embalagem e frete) e o acompanhamento de clientes inativos que deixaram de comprar.

### A Solução
Um sistema web moderno, responsivo (com foco em celular/tablet) e com suporte offline (PWA + Firebase), desenhado especialmente para usuários com mais de 50 anos e pouca familiaridade com tecnologia (botões grandes, linguagem direta e sem jargões).

---

## 2. Metas, Não-Metas e Anti-Metas

### Metas (Goals)
- **Rastreabilidade Ponta a Ponta:** Toda venda da logística está vinculada a uma saída física da produção (carregamento da van), que por sua vez está vinculada a um lote de fabricação.
- **Vendas Multi-item Descomplicadas:** Um cliente pode comprar múltiplos modelos no mesmo pedido (ex: 10 kg de 19mm + 5 kg de 22mm), contando como 1 compra unificada no relacionamento do cliente.
- **Lucro Real em Centavos:** Cálculo do lucro bruto (preço cobrado menos matéria-prima) e lucro líquido (descontando embalagem, combustível da van ou frete terceirizado Lalamove/Correios), sem nunca usar ponto flutuante para dinheiro.
- **Gestão Ativa de Clientes:** Identificação automática de clientes fiéis (>= 3 compras) e alerta destacado para clientes há mais de 30 dias (1 mês) sem comprar.
- **Operação Desconectada:** Resiliência offline para que o chão de fábrica ou o entregador na rua continuem lançando lotes e entregas mesmo sem sinal de internet, sincronizando tudo assim que a conexão retornar.
- **Acessibilidade para +50 anos:** Telas com no máximo uma tarefa principal, textos grandes (>= 18px), botões com altura mínima de 48px e contraste rigoroso WCAG 2.2 AA.

### Não-Metas (Non-Goals)
- E-commerce ou portal de autoatendimento para clientes finais comprarem sozinhos na internet.
- Emissão de notas fiscais eletrônicas (NF-e) ou integração direta com SEFAZ nesta primeira fase.
- Rateios contábeis complexos de depreciação de maquinário industrial.

### Anti-Metas (Anti-Goals)
- Interfaces com tabelas densas, letrinhas pequenas ou menus escondidos atrás de ícones sem texto.
- Exclusão física de qualquer dado financeiro ou operacional (proibido `DELETE` físico; tudo usa exclusão lógica + log de auditoria).
- Mensagens de erro com termos técnicos como "404", "NullPointerException" ou "Falha de schema".
- Dependência estrita de internet que trave a rotina da fábrica se a conexão cair.

---

## 3. Decisões do Negócio Alinhadas (Fase 0)

1. **Catálogo de Modelos (7 Tipos):**
   - Argola 16mm
   - Argola 19mm
   - Argola 19mm c/ Corrente
   - Argola 22mm
   - Argola 22mm Batida
   - Argola 22mm c/ Corrente
   - Argola 25mm

2. **Unidade de Venda e Embalagem:**
   - Envio prioritário em **pacotes fechados por Quilo (kg)**.
   - Atendimento a pedidos fracionados com **pedido mínimo de 100 unidades**.
   - Cada modelo possui uma taxa padrão de conversão (unidades por kg) para baixa precisa no estoque do lote.
   - **Vendas Multi-item:** O pedido permite adicionar uma ou mais linhas de modelos diferentes antes de fechar a entrega.

3. **Custos e Lucro:**
   - **Matéria-prima (Arame):** Lançamento de compras com data, peso/quantidade e valor total em centavos. O lote consome o material e gera o custo unitário base absorvendo perdas (`custo_arame / quantidade_boa_produzida`).
   - **Custos Operacionais Logísticos:** Registro de gastos com embalagens e combustível da van lançados no painel de despesas operacionais da logística.
   - **Fretes Terceirizados (Lalamove / Correios):** Lançamento direto do valor do frete na tela do pedido.
   - **Transparência:** O painel de lucro exibe a conta por extenso ("Preço cobrado - Custo das argolas - Custos de entrega = Lucro") e conta com o botão *"Como calculamos?"*.

4. **Regras de Clientes e Prospecção:**
   - **Cliente Fiel:** Cliente com 3 ou mais compras realizadas.
   - **Alerta de Inatividade:** Cliente com mais de 30 dias sem comprar entra em lista prioritária para contato da equipe.

5. **Usuários e Perfis Iniciais:**
   - 4 usuários iniciais: Dono, Sócio, Responsável pela Logística e Administrador Geral.
   - Todos os 4 usuários têm acesso total a telas e configurações neste início, com infraestrutura de papéis (Produção, Logística, Gestão) já preparada para segregação futura.

---

## 4. Decisões Técnicas do Construtor (Decisões de Engenharia)

Para garantir máxima simplicidade no uso diário por pessoas sem familiaridade com tecnologia, definimos as seguintes decisões técnicas de arquitetura:

1. **Estrutura Pedido x Itens:**
   - A venda é registrada como um documento de **Pedido/Entrega** contendo o cliente, data, forma de envio (van ou terceirizado), frete, embalagem e um array de itens (`modeloId`, `quantidadeUnidades`, `pesoKg`, `precoCentavos`, `loteId`).
   - Isso evita multiplicar compras no histórico do cliente e simplifica a conferência do valor total recebido.

2. **Custo de Combustível da Van Própria:**
   - As despesas de abastecimento da van são lançadas como despesas operacionais mensais da logística.
   - No momento de registrar a entrega de van, o operador não precisa calcular rateio de combustível na rua. O painel financeiro da gestão consolida:
     $$\text{Lucro Líquido do Período} = \text{Receita Total} - \text{Custo de Matéria-Prima} - \text{Fretes Terceirizados} - \text{Despesas de Combustível e Embalagem}$$

3. **Sugestão Automática de Lote (FIFO com Override):**
   - Ao adicionar um modelo na venda, o sistema sugere automaticamente o lote disponível mais antigo (FIFO), evitando que o operador precise navegar em listas complexas de lotes. Se necessário, ele pode alterar o lote com um toque.

---

## 5. Arquitetura Técnica e Integração

### Stack Tecnológica
- **Framework Web:** Next.js (App Router) com TypeScript e Tailwind CSS.
- **Banco de Dados & Autenticação:** Firebase (Google Cloud):
  - **Firebase Authentication:** Login seguro com e-mail/senha e suporte a 2FA para perfil de gestão.
  - **Cloud Firestore:** Armazenamento NoSQL em tempo real com **persistência offline local ativada** (`enableIndexedDbPersistence`).
  - **Firebase Storage:** Armazenamento de comprovantes e documentos (se necessário).
- **Design System Acessível:** Componentes Tailwind customizados com foco visível, contraste validado e botões touch-friendly (>= 48px).

### Credenciais do Projeto Firebase
- `apiKey`: Configurado de forma segura via variável de ambiente (`process.env.NEXT_PUBLIC_FIREBASE_API_KEY` / `.env.local`)
- `authDomain`: `evolucao-argolas.firebaseapp.com`
- `projectId`: `evolucao-argolas`
- `storageBucket`: `evolucao-argolas.firebasestorage.app`
- `messagingSenderId`: `511096317920`
- `appId`: `1:511096317920:web:267889aeca1e964030ed85`
- `measurementId`: `G-RHZBHS74K2`

### Modelo de Dados no Firestore

#### Coleções Principais:
1. `lotes_producao`:
   - `id`: string
   - `data`: timestamp
   - `modeloId`: string (um dos 7 modelos)
   - `quantidadeProduzida`: integer (unidades acabadas)
   - `perdas`: integer (unidades descartadas)
   - `custoMaterialCentavos`: integer (rateio do arame)
   - `custoUnitarioCentavos`: integer (custo arame / quantidade produzida)
   - `responsavelId`: string
   - `ativo`: boolean (soft delete)
   - `criadoEm`, `atualizadoEm`: timestamp

2. `saidas_producao`:
   - `id`: string
   - `loteId`: string (referência ao lote)
   - `modeloId`: string
   - `quantidade`: integer (unidades enviadas na van)
   - `transporte`: "van_propria" | "outro"
   - `data`: timestamp
   - `responsavelId`: string
   - `ativo`: boolean

3. `pedidos_vendas`:
   - `id`: string
   - `numeroPedido`: integer (sequencial simples, ex: #101)
   - `clienteId`: string
   - `data`: timestamp
   - `tipoEnvio`: "van_propria" | "lalamove" | "correios" | "outro"
   - `custoFreteCentavos`: integer
   - `custoEmbalagemCentavos`: integer
   - `itens`: array de objetos:
     - `modeloId`: string
     - `loteId`: string
     - `quantidadeUnidades`: integer
     - `pesoKg`: number | null
     - `precoCobradoCentavos`: integer
     - `custoMateriaPrimaCentavos`: integer
   - `totalPedidoCentavos`: integer
   - `lucroBrutoPedidoCentavos`: integer
   - `lucroLiquidoPedidoCentavos`: integer
   - `situacao`: "pendente" | "entregue" | "cancelada"
   - `responsavelId`: string
   - `ativo`: boolean

4. `clientes`:
   - `id`: string
   - `nome`: string
   - `telefone`: string
   - `email`: string
   - `cidade`: string
   - `origemContato`: string
   - `totalCompras`: integer (inicia em 0)
   - `dataUltimaCompra`: timestamp | null
   - `situacao`: "nunca_prospectado" | "prospectado" | "ja_comprou" | "cliente_fiel"
   - `diasSemComprar`: integer (calculado dinamicamente)
   - `ativo`: boolean

5. `despesas_operacionais`:
   - `id`: string
   - `data`: timestamp
   - `categoria`: "combustivel_van" | "embalagem" | "manutencao_van" | "arame" | "outros"
   - `descricao`: string
   - `valorCentavos`: integer
   - `responsavelId`: string
   - `ativo`: boolean

6. `logs_auditoria`:
   - `id`: string
   - `usuarioId`: string
   - `usuarioNome`: string
   - `acao`: "CRIAR" | "EDITAR" | "EXCLUIR_LOGICO" | "RESTAURAR" | "EXPORTAR"
   - `tabela`: string
   - `registroId`: string
   - `valoresAnteriores`: json | null
   - `valoresNovos`: json | null
   - `data`: timestamp

---

## 6. Regras de Interface e Cores (Seção 9)

- **Cores & Tokens de Design:**
  - Preto: `#111111` (Fundo de cabeçalhos e textos de alta legibilidade)
  - Laranja: `#FF7A00` (Botões de ação primária e destaques operacionais)
  - Azul: `#1565C0` (Ações secundárias, links e navegação)
  - Branco: `#FFFFFF` (Superfície limpa de leitura e cartões)
  - Cinza claro: `#F5F5F7` (Fundo da aplicação)
- **Acessibilidade e Usabilidade:**
  - Botões com altura mínima de 48px.
  - Tipografia de corpo de texto com no mínimo 18px.
  - Ícone + Texto em todas as indicações de status (não depender apenas de cor, respeitando pessoas com daltonismo).
  - Telas iniciais diretas por perfil com no máximo 3 botões grandes de ação.
  - Indicador de conectividade no topo: "🟢 Conectado" ou "🟡 Modo Offline (Salvando no aparelho)".

---

## 7. Próximos Passos (Transição para Plano de Implementação)
Com a aprovação deste documento de design pelo usuário:
1. Concluir formalmente a **Fase 0 (Decisões)**.
2. Invocar a skill `superpowers:writing-plans` para gerar o plano detalhado de tarefas (TDD red/green, arquivos, testes, passos de execução).
3. Iniciar a execução da **Fase 1: Base & Infraestrutura** (Next.js, Firebase, Auth e Design System).
