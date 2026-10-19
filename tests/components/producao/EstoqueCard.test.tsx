import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EstoqueCard from "@/components/producao/EstoqueCard";
import { CATALOGO_ARGOLAS } from "@/types/domain";

describe("Componente EstoqueCard", () => {
  const resumoTotal = {
    produzido: 10000,
    perdas: 200,
    enviado: 3000,
    disponivel: 6800,
  };

  const resumoPorModelo: Record<string, any> = {};
  for (const modelo of CATALOGO_ARGOLAS) {
    resumoPorModelo[modelo.id] = {
      produzido: modelo.id === "argola-19mm" ? 10000 : 0,
      perdas: modelo.id === "argola-19mm" ? 200 : 0,
      enviado: modelo.id === "argola-19mm" ? 3000 : 0,
      disponivel: modelo.id === "argola-19mm" ? 6800 : 0,
    };
  }

  it("deve renderizar o total disponível em destaque e legível", () => {
    render(
      <EstoqueCard
        resumoTotal={resumoTotal}
        resumoPorModelo={resumoPorModelo}
      />
    );

    expect(screen.getAllByText(/6\.800/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/argolas prontas no estoque/i)).toBeDefined();
  });

  it("deve listar os modelos e suas respectivas quantidades disponíveis", () => {
    render(
      <EstoqueCard
        resumoTotal={resumoTotal}
        resumoPorModelo={resumoPorModelo}
      />
    );

    expect(screen.getByText("Argola 19mm")).toBeDefined();
    expect(screen.getByText("Argola 22mm")).toBeDefined();
  });
});
