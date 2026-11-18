import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, ApiErrorKind } from '../services/api';
import { geocodeAddress } from '../services/geocoding';
import LocationSearchControl from './LocationSearchControl';

vi.mock('../services/geocoding', () => ({ geocodeAddress: vi.fn() }));

const MASP = { label: 'MASP', neighborhood: 'Bela Vista', position: [-23.5614, -46.6559] };
const PINHEIROS = [
  { label: 'Rua dos Pinheiros', neighborhood: 'Jardim Europa', position: [-23.565, -46.682] },
  { label: 'Rua dos Pinheiros', neighborhood: 'Jardim Fontalis', position: [-23.44, -46.57] },
];

function renderControl(props = {}) {
  const handlers = { onSelect: vi.fn(), onLocate: vi.fn(), onRadiusChange: vi.fn() };
  render(<LocationSearchControl origin={null} radiusKm={2} {...handlers} {...props} />);
  return handlers;
}

async function searchFor(text) {
  await userEvent.type(screen.getByRole('searchbox', { name: /endereço/i }), text);
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }));
}

describe('LocationSearchControl', () => {
  beforeEach(() => geocodeAddress.mockReset());

  it('usa direto o único lugar encontrado', async () => {
    geocodeAddress.mockResolvedValue([MASP]);
    const { onSelect } = renderControl();
    await searchFor('MASP');
    expect(onSelect).toHaveBeenCalledWith(MASP);
    expect(screen.queryByRole('list', { name: 'Lugares encontrados' })).not.toBeInTheDocument();
  });

  it('pede para escolher quando há mais de um lugar, mostrando o bairro', async () => {
    geocodeAddress.mockResolvedValue(PINHEIROS);
    const { onSelect } = renderControl();
    await searchFor('Rua dos Pinheiros');

    expect(screen.getByRole('status')).toHaveTextContent('Encontramos mais de um lugar');
    const option = screen.getByRole('button', { name: /Jardim Fontalis/ });
    await userEvent.click(option);
    expect(onSelect).toHaveBeenCalledWith(PINHEIROS[1]);
  });

  it('marca a opção escolhida', async () => {
    geocodeAddress.mockResolvedValue(PINHEIROS);
    renderControl({ origin: PINHEIROS[0] });
    await searchFor('Rua dos Pinheiros');
    expect(screen.getByRole('button', { name: /Jardim Europa/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Jardim Fontalis/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('avisa quando nada é encontrado ou o texto é curto demais', async () => {
    geocodeAddress.mockResolvedValue([]);
    renderControl();
    await searchFor('ab');
    expect(screen.getByRole('status')).toHaveTextContent('Digite pelo menos 3 letras.');
    expect(geocodeAddress).not.toHaveBeenCalled();

    await searchFor('cdefg');
    expect(await screen.findByText(/Não encontramos esse endereço/)).toBeInTheDocument();
  });

  it('mostra a falha do serviço e permite tentar de novo', async () => {
    geocodeAddress.mockRejectedValueOnce(
      new ApiError('O serviço de busca de endereços está temporariamente indisponível.', {
        kind: ApiErrorKind.EXTERNAL_SERVICE,
      }),
    );
    geocodeAddress.mockResolvedValue([MASP]);
    const { onSelect } = renderControl();
    await searchFor('MASP');

    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }));
    expect(onSelect).toHaveBeenCalledWith(MASP);
  });

  it('pede a localização e mostra o erro dela', async () => {
    const { onLocate } = renderControl({ locateError: 'Sem permissão para usar sua localização.' });
    await userEvent.click(screen.getByRole('button', { name: 'Usar minha localização' }));
    expect(onLocate).toHaveBeenCalledOnce();
    expect(screen.getByRole('alert')).toHaveTextContent('Sem permissão');
  });

  it('desativa o botão enquanto localiza', () => {
    renderControl({ locating: true });
    expect(screen.getByRole('button', { name: 'Localizando…' })).toBeDisabled();
  });

  it('ajusta o raio pelo controle deslizante, com o valor por extenso', () => {
    const { onRadiusChange } = renderControl({ radiusKm: 2.5 });
    const slider = screen.getByRole('slider', { name: 'Raio da busca' });
    expect(slider).toHaveAttribute('aria-valuetext', '2,5 quilômetros');
    expect(screen.getByText('2,5 km')).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: '4' } });
    expect(onRadiusChange).toHaveBeenCalledWith(4);
  });
});
