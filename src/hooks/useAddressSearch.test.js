import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { geocodeAddress } from '../services/geocoding';
import { RequestStatus } from './useApiRequest';
import useAddressSearch from './useAddressSearch';

vi.mock('../services/geocoding', () => ({ geocodeAddress: vi.fn() }));

const MASP = { label: 'MASP', neighborhood: 'Bela Vista', position: [-23.5614, -46.6559] };
const OTHER = { label: 'MASP Café', neighborhood: 'Jardins', position: [-23.57, -46.66] };

describe('useAddressSearch', () => {
  beforeEach(() => geocodeAddress.mockReset());

  it('escolhe sozinho quando há exatamente um lugar', async () => {
    geocodeAddress.mockResolvedValue([MASP]);
    const onFound = vi.fn();
    const { result } = renderHook(() => useAddressSearch(onFound));

    await act(() => result.current.search('  MASP '));

    expect(geocodeAddress).toHaveBeenCalledWith('MASP', expect.anything());
    expect(onFound).toHaveBeenCalledWith(MASP);
    expect(result.current.status).toBe(RequestStatus.SUCCESS);
  });

  it('deixa o usuário escolher quando há mais de um lugar', async () => {
    geocodeAddress.mockResolvedValue([MASP, OTHER]);
    const onFound = vi.fn();
    const { result } = renderHook(() => useAddressSearch(onFound));

    await act(() => result.current.search('masp'));

    expect(onFound).not.toHaveBeenCalled();
    expect(result.current.matches).toEqual([MASP, OTHER]);
  });

  it('não consulta textos curtos demais', async () => {
    const { result } = renderHook(() => useAddressSearch(vi.fn()));
    await act(() => result.current.search('ab'));
    expect(geocodeAddress).not.toHaveBeenCalled();
    expect(result.current.error).toBe('too-short');
  });

  it('guarda o erro e repete a mesma busca com retry', async () => {
    geocodeAddress.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
    const { result } = renderHook(() => useAddressSearch(vi.fn()));

    await act(() => result.current.search('masp'));
    expect(result.current.status).toBe(RequestStatus.ERROR);

    await act(() => result.current.retry());
    expect(geocodeAddress).toHaveBeenLastCalledWith('masp', expect.anything());
    expect(result.current.status).toBe(RequestStatus.SUCCESS);
    expect(result.current.matches).toEqual([]);
  });

  it('ignora a resposta de uma busca substituída por outra', async () => {
    let resolveFirst;
    geocodeAddress
      .mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
      .mockResolvedValueOnce([OTHER]);
    const onFound = vi.fn();
    const { result } = renderHook(() => useAddressSearch(onFound));

    act(() => {
      result.current.search('primeira');
    });
    await act(() => result.current.search('segunda'));
    await act(async () => resolveFirst([MASP]));

    expect(onFound).toHaveBeenCalledOnce();
    expect(onFound).toHaveBeenCalledWith(OTHER);
  });
});
