import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useApiRequest, { RequestStatus } from './useApiRequest';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useApiRequest', () => {
  it('começa carregando e expõe os dados quando a consulta termina', async () => {
    const request = vi.fn().mockResolvedValue({ id: 'a' });
    const { result } = renderHook(() => useApiRequest(request));
    expect(result.current.status).toBe(RequestStatus.LOADING);
    await waitFor(() => expect(result.current.status).toBe(RequestStatus.SUCCESS));
    expect(result.current.data).toEqual({ id: 'a' });
    expect(result.current.error).toBeNull();
  });

  it('passa um AbortSignal para a consulta', () => {
    const request = vi.fn().mockResolvedValue(null);
    renderHook(() => useApiRequest(request));
    expect(request.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
  });

  it('expõe o erro e refaz a consulta com retry', async () => {
    const failure = new Error('falhou');
    const request = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce('ok');
    const { result } = renderHook(() => useApiRequest(request));
    await waitFor(() => expect(result.current.status).toBe(RequestStatus.ERROR));
    expect(result.current.error).toBe(failure);

    act(() => result.current.retry());
    expect(result.current.status).toBe(RequestStatus.LOADING);
    await waitFor(() => expect(result.current.data).toBe('ok'));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('cancela a consulta anterior e ignora sua resposta quando a consulta muda', async () => {
    const first = deferred();
    const second = deferred();
    const requestA = vi.fn(() => first.promise);
    const requestB = vi.fn(() => second.promise);
    const { result, rerender } = renderHook(({ request }) => useApiRequest(request), {
      initialProps: { request: requestA },
    });

    rerender({ request: requestB });
    expect(requestA.mock.calls[0][0].aborted).toBe(true);
    expect(result.current.status).toBe(RequestStatus.LOADING);

    await act(async () => first.resolve('antigo'));
    expect(result.current.status).toBe(RequestStatus.LOADING);
    await act(async () => second.resolve('novo'));
    expect(result.current.data).toBe('novo');
  });

  it('cancela a consulta pendente ao desmontar', () => {
    const request = vi.fn(() => new Promise(() => {}));
    const { unmount } = renderHook(() => useApiRequest(request));
    unmount();
    expect(request.mock.calls[0][0].aborted).toBe(true);
  });
});
