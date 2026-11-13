import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlacesStatus } from '../hooks/usePlacesInBounds';
import { ApiError, ApiErrorKind } from '../services/api';
import MapStatus from './MapStatus';

function renderStatus(props) {
  const onRetry = vi.fn();
  render(<MapStatus count={0} status={PlacesStatus.SUCCESS} onRetry={onRetry} {...props} />);
  return { onRetry, status: screen.getByRole('status') };
}

describe('MapStatus', () => {
  it('mostra "Carregando" antes da primeira consulta e enquanto não há pinos', () => {
    expect(renderStatus({ status: PlacesStatus.IDLE }).status).toHaveTextContent(
      'Carregando espaços…',
    );
  });

  it('mostra "Atualizando" ao recarregar com pinos já na tela', () => {
    expect(renderStatus({ status: PlacesStatus.LOADING, count: 3 }).status).toHaveTextContent(
      'Atualizando…',
    );
  });

  it('avisa quando a área não tem espaços', () => {
    expect(renderStatus({ count: 0 }).status).toHaveTextContent('Nenhum espaço nesta área');
  });

  it('com pinos na tela, informa a contagem apenas para leitores de tela', () => {
    renderStatus({ count: 1 });
    expect(screen.getByText('1 espaço nesta área')).toHaveClass('visually-hidden');
  });

  it('mostra a mensagem do ApiError e permite tentar de novo', async () => {
    const error = new ApiError('O Spaços está temporariamente indisponível.', {
      kind: ApiErrorKind.SERVER,
      status: 503,
    });
    const { onRetry, status } = renderStatus({ status: PlacesStatus.ERROR, error });
    expect(status).toHaveTextContent('O Spaços está temporariamente indisponível.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('não oferece "Tentar de novo" para erros que não se resolvem repetindo', () => {
    const error = new ApiError('Informe sw_lat, sw_lng, ne_lat e ne_lng juntos', {
      kind: ApiErrorKind.CLIENT,
      status: 422,
    });
    renderStatus({ status: PlacesStatus.ERROR, error });
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
  });

  it('usa uma mensagem genérica para erros internos, sem expor detalhes técnicos', () => {
    const { status } = renderStatus({
      status: PlacesStatus.ERROR,
      error: new TypeError("Cannot read properties of undefined (reading 'map')"),
    });
    expect(status).toHaveTextContent('Não foi possível carregar os espaços.');
    expect(status).not.toHaveTextContent('Cannot read');
  });
});
