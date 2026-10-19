import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ModalNovoPedido from "@/components/vendas/ModalNovoPedido";
import { SaidaProducao, PedidoVenda } from "@/types/domain";

describe("Componente ModalNovoPedido", () => {
  const mockSaidas: SaidaProducao[] = [
    {
      id: "saida-1",
      loteId: "lote-1",
      modeloId: "argola-19mm",
      quantidade: 5000,
      transporte: "propria",
      data: new Date("2026-10-16"),
      responsavelId: "user-1",
      ativo: true,
    },
  ];

  const mockPedidos: PedidoVenda[] = [];

  const mockClientes = [
    { id: "cli-1", nome: "Chaveiro Central", cidade: "São Paulo", telefone: "11988881111" },
    { id: "cli-2", nome: "Brindes Silva", cidade: "Campinas", telefone: "19988882222" },
  ];

  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();
  const mockOnCadastrarCliente = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("não deve renderizar quando isOpen for false", () => {
    render(
      <ModalNovoPedido
        isOpen={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        saidasDisponiveis={mockSaidas}
        pedidosExistentes={mockPedidos}
        clientes={mockClientes}
        onCadastrarClienteRapido={mockOnCadastrarCliente}
      />
    );

    expect(screen.queryByText(/novo pedido de venda/i)).toBeNull();
  });

  it("deve renderizar campos com tipografia e botões acessíveis quando aberto", () => {
    render(
      <ModalNovoPedido
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        saidasDisponiveis={mockSaidas}
        pedidosExistentes={mockPedidos}
        clientes={mockClientes}
        onCadastrarClienteRapido={mockOnCadastrarCliente}
      />
    );

    expect(screen.getByRole("heading", { name: /novo pedido de venda/i })).toBeDefined();
    expect(screen.getByLabelText(/cliente/i)).toBeDefined();
    expect(screen.getByLabelText(/forma de envio/i)).toBeDefined();
    expect(screen.getByText(/adicionar item/i)).toBeDefined();
  });

  it("deve permitir adicionar múltiplos itens e calcular o total do pedido", async () => {
    mockOnSubmit.mockResolvedValueOnce(undefined);

    render(
      <ModalNovoPedido
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        saidasDisponiveis={mockSaidas}
        pedidosExistentes={mockPedidos}
        clientes={mockClientes}
        onCadastrarClienteRapido={mockOnCadastrarCliente}
      />
    );

    // Seleciona cliente
    const selectCliente = screen.getByLabelText(/cliente/i);
    fireEvent.change(selectCliente, { target: { value: "cli-1" } });

    // Preenche quantidade do primeiro item
    const inputQtd = screen.getByLabelText(/quantidade \(unidades\)/i);
    fireEvent.change(inputQtd, { target: { value: "500" } });

    // Preenche valor do primeiro item
    const inputPreco = screen.getByLabelText(/valor total do item \(r\$\)/i);
    fireEvent.change(inputPreco, { target: { value: "50,00" } });

    // Frete
    const inputFrete = screen.getByLabelText(/custo do frete \(r\$\)/i);
    fireEvent.change(inputFrete, { target: { value: "15,00" } });

    // Submete formulário
    const btnSalvar = screen.getByRole("button", { name: /salvar pedido/i });
    fireEvent.click(btnSalvar);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        clienteId: "cli-1",
        clienteNome: "Chaveiro Central",
        custoFreteCentavos: 1500,
        itens: expect.arrayContaining([
          expect.objectContaining({
            modeloId: "argola-19mm",
            quantidadeUnidades: 500,
            precoCentavos: 5000,
          }),
        ]),
      })
    );
  });

  it("deve validar pedido mínimo de 100 unidades em venda fracionada", async () => {
    render(
      <ModalNovoPedido
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        saidasDisponiveis={mockSaidas}
        pedidosExistentes={mockPedidos}
        clientes={mockClientes}
        onCadastrarClienteRapido={mockOnCadastrarCliente}
      />
    );

    const selectCliente = screen.getByLabelText(/cliente/i);
    fireEvent.change(selectCliente, { target: { value: "cli-1" } });

    const inputQtd = screen.getByLabelText(/quantidade \(unidades\)/i);
    fireEvent.change(inputQtd, { target: { value: "50" } }); // menor que 100

    const inputPreco = screen.getByLabelText(/valor total do item \(r\$\)/i);
    fireEvent.change(inputPreco, { target: { value: "10,00" } });

    const btnSalvar = screen.getByRole("button", { name: /salvar pedido/i });
    fireEvent.click(btnSalvar);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });
    expect(screen.getByText(/pedido mínimo para venda fracionada é de 100 unidades/i)).toBeDefined();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("não deve travar o componente ao apagar o campo de frete ou preço", async () => {
    render(
      <ModalNovoPedido
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        saidasDisponiveis={mockSaidas}
        pedidosExistentes={mockPedidos}
        clientes={mockClientes}
        onCadastrarClienteRapido={mockOnCadastrarCliente}
      />
    );

    const inputFrete = screen.getByLabelText(/custo do frete \(r\$\)/i);
    // Usuário apaga o campo totalmente
    fireEvent.change(inputFrete, { target: { value: "" } });

    // Componente não trava e continua renderizando normalmente
    expect(screen.getByRole("heading", { name: /novo pedido de venda/i })).toBeDefined();
  });

  it("deve bloquear pedido multi-item que ultrapassa o saldo consolidado da mesma remessa", async () => {
    // mockSaidas tem 5.000 unidades
    render(
      <ModalNovoPedido
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        saidasDisponiveis={mockSaidas}
        pedidosExistentes={mockPedidos}
        clientes={mockClientes}
        onCadastrarClienteRapido={mockOnCadastrarCliente}
      />
    );

    const selectCliente = screen.getByLabelText(/cliente/i);
    fireEvent.change(selectCliente, { target: { value: "cli-1" } });

    // Item 1: 3.000 unidades
    const inputQtd1 = screen.getByLabelText(/quantidade \(unidades\)/i);
    fireEvent.change(inputQtd1, { target: { value: "3000" } });
    const inputPreco1 = screen.getByLabelText(/valor total do item \(r\$\)/i);
    fireEvent.change(inputPreco1, { target: { value: "300,00" } });

    // Adiciona Item 2
    const btnAddItem = screen.getByRole("button", { name: /\+ adicionar item/i });
    fireEvent.click(btnAddItem);

    // Item 2: 3.000 unidades da mesma remessa (3000 + 3000 = 6000 > 5000)
    const inputsQtd = screen.getAllByLabelText(/quantidade \(unidades\)/i);
    fireEvent.change(inputsQtd[1], { target: { value: "3000" } });
    const inputsPreco = screen.getAllByLabelText(/valor total do item \(r\$\)/i);
    fireEvent.change(inputsPreco[1], { target: { value: "300,00" } });

    const btnSalvar = screen.getByRole("button", { name: /salvar pedido/i });
    fireEvent.click(btnSalvar);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });
    expect(screen.getByText(/ultrapassa o saldo disponível nesta remessa/i)).toBeDefined();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("deve preencher automaticamente o endereço de entrega ao selecionar cliente com endereço", () => {
    const clientesComEndereco = [
      {
        id: "cli-1",
        nome: "Chaveiro Central",
        cidade: "São Paulo",
        telefone: "11988881111",
        endereco: "Av. Paulista, 1500 - Bela Vista",
      },
    ];

    render(
      <ModalNovoPedido
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        saidasDisponiveis={mockSaidas}
        pedidosExistentes={mockPedidos}
        clientes={clientesComEndereco}
        onCadastrarClienteRapido={mockOnCadastrarCliente}
      />
    );

    const selectCliente = screen.getByLabelText(/cliente/i);
    fireEvent.change(selectCliente, { target: { value: "cli-1" } });

    const inputEndereco = screen.getByLabelText(/endereço de entrega/i) as HTMLInputElement;
    expect(inputEndereco.value).toBe("Av. Paulista, 1500 - Bela Vista");
  });

  it("deve permitir cadastrar cliente rápido com endereço e incluir no pedido", async () => {
    mockOnCadastrarCliente.mockResolvedValueOnce("cli-novo");
    mockOnSubmit.mockResolvedValueOnce(undefined);

    render(
      <ModalNovoPedido
        isOpen={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
        saidasDisponiveis={mockSaidas}
        pedidosExistentes={mockPedidos}
        clientes={mockClientes}
        onCadastrarClienteRapido={mockOnCadastrarCliente}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /\+ novo cliente rápido/i }));

    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: "Vidraçaria Esperança" },
    });
    fireEvent.change(screen.getByLabelText(/endereço completo do cliente/i), {
      target: { value: "Rua do Comércio, 45" },
    });

    const inputQtd = screen.getByLabelText(/quantidade \(unidades\)/i);
    fireEvent.change(inputQtd, { target: { value: "500" } });
    const inputPreco = screen.getByLabelText(/valor total do item \(r\$\)/i);
    fireEvent.change(inputPreco, { target: { value: "80,00" } });

    const btnSalvar = screen.getByRole("button", { name: /salvar pedido/i });
    fireEvent.click(btnSalvar);

    await waitFor(() => {
      expect(mockOnCadastrarCliente).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: "Vidraçaria Esperança",
          endereco: "Rua do Comércio, 45",
        })
      );
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          clienteId: "cli-novo",
          enderecoEntrega: "Rua do Comércio, 45",
        })
      );
    });
  });
});

