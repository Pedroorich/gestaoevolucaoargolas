import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Button } from '@/components/ui/Button';

describe('Componente Button (Acessibilidade +50)', () => {
  it('aplica altura mínima de 48px por padrão', () => {
    render(<Button>Lançar Produção</Button>);
    const btn = screen.getByRole('button', { name: /lançar produção/i });
    expect(btn.className).toContain('min-h-[48px]');
  });

  it('aplica estilo de cor primária (Laranja #FF7A00) com alto contraste', () => {
    render(<Button variant="primary">Continuar</Button>);
    const btn = screen.getByRole('button', { name: /continuar/i });
    expect(btn.className).toContain('bg-brand-orange');
  });

  it('aplica estilo secundário (Azul #1565C0) com texto branco', () => {
    render(<Button variant="secondary">Voltar</Button>);
    const btn = screen.getByRole('button', { name: /voltar/i });
    expect(btn.className).toContain('bg-brand-blue');
    expect(btn.className).toContain('text-white');
  });
});
