import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestStatus } from './useApiRequest';
import useGeolocation, {
  GeolocationMessages,
  GOOD_ACCURACY_M,
  SETTLE_MS,
  watchBestPosition,
} from './useGeolocation';

const SE = { latitude: -23.5503, longitude: -46.6339 };
const reading = (coords, accuracy) => ({ coords: { ...coords, accuracy } });

// Navegador simulado: o teste entrega leituras (`emit`) e erros (`fail`) quando quiser.
function stubGeolocation() {
  const watch = { success: null, failure: null, options: null };
  const geolocation = {
    watchPosition: vi.fn((success, failure, options) => {
      Object.assign(watch, { success, failure, options });
      return 7;
    }),
    clearWatch: vi.fn(),
  };
  vi.stubGlobal('navigator', { ...navigator, geolocation });
  return {
    geolocation,
    watch,
    emit: (r) => act(() => watch.success(r)),
    fail: (code) => act(() => watch.failure({ code })),
  };
}

async function startLocate() {
  const hook = renderHook(() => useGeolocation());
  let pending;
  act(() => {
    pending = hook.result.current.locate();
  });
  return { ...hook, pending };
}

describe('useGeolocation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('espera a leitura precisa em vez de usar a primeira, grosseira', async () => {
    const browser = stubGeolocation();
    const { result, pending } = await startLocate();
    expect(result.current.status).toBe(RequestStatus.LOADING);
    expect(browser.watch.options).toMatchObject({ enableHighAccuracy: true, maximumAge: 0 });

    browser.emit(reading({ latitude: -23.6, longitude: -46.7 }, 3000)); // estimativa pelo IP
    browser.emit(reading(SE, GOOD_ACCURACY_M - 20));

    await act(async () => expect(await pending).toEqual([-23.5503, -46.6339]));
    expect(result.current.status).toBe(RequestStatus.SUCCESS);
    expect(browser.geolocation.clearWatch).toHaveBeenCalledWith(7);
  });

  it('sem leitura precisa, usa a melhor obtida depois de alguns segundos', async () => {
    const browser = stubGeolocation();
    const { pending } = await startLocate();
    browser.emit(reading({ latitude: -23.6, longitude: -46.7 }, 3000));
    browser.emit(reading(SE, 400));
    browser.emit(reading({ latitude: -23.58, longitude: -46.68 }, 900));

    await act(() => vi.advanceTimersByTimeAsync(SETTLE_MS));
    await act(async () => expect(await pending).toEqual([-23.5503, -46.6339]));
    expect(browser.geolocation.clearWatch).toHaveBeenCalled();
  });

  it('um erro depois de alguma leitura mantém a melhor delas', async () => {
    const browser = stubGeolocation();
    const { pending } = await startLocate();
    browser.emit(reading(SE, 800));
    browser.fail(3);
    await act(async () => expect(await pending).toEqual([-23.5503, -46.6339]));
  });

  it.each([
    [1, GeolocationMessages.denied],
    [2, GeolocationMessages.unavailable],
    [3, GeolocationMessages.timeout],
  ])('explica a falha de código %i em português', async (code, message) => {
    const browser = stubGeolocation();
    const { result, pending } = await startLocate();
    browser.fail(code);

    await act(async () => expect(await pending).toBeNull());
    expect(result.current.status).toBe(RequestStatus.ERROR);
    expect(result.current.error).toBe(message);
  });

  it('recusa posições fora da Grande São Paulo', async () => {
    const browser = stubGeolocation();
    const { result, pending } = await startLocate();
    browser.emit(reading({ latitude: -22.9, longitude: -43.2 }, 10)); // Rio de Janeiro
    await act(async () => expect(await pending).toBeNull());
    expect(result.current.error).toBe(GeolocationMessages.outside);
  });

  it('avisa quando o navegador não oferece geolocalização', async () => {
    vi.stubGlobal('navigator', { ...navigator, geolocation: undefined });
    const { result } = renderHook(() => useGeolocation());
    await act(async () => expect(await result.current.locate()).toBeNull());
    expect(result.current.error).toBe(GeolocationMessages.unsupported);
  });

  it('um novo clique cancela o acompanhamento anterior', async () => {
    const browser = stubGeolocation();
    const { result, pending } = await startLocate();
    let second;
    act(() => {
      second = result.current.locate();
    });
    await act(async () => expect(await pending).toBeNull());
    expect(browser.geolocation.clearWatch).toHaveBeenCalledOnce();

    browser.emit(reading(SE, 10));
    await act(async () => expect(await second).toEqual([-23.5503, -46.6339]));
  });

  it('para de acompanhar quando a página é desmontada', async () => {
    const browser = stubGeolocation();
    const { unmount } = await startLocate();
    unmount();
    expect(browser.geolocation.clearWatch).toHaveBeenCalledWith(7);
  });
});

describe('watchBestPosition', () => {
  it('libera o acompanhamento mesmo se o navegador responder na hora', async () => {
    const geolocation = {
      watchPosition: vi.fn((success) => {
        success(reading(SE, 5));
        return 3;
      }),
      clearWatch: vi.fn(),
    };
    const { promise } = watchBestPosition(geolocation);
    expect((await promise).coords.accuracy).toBe(5);
    expect(geolocation.clearWatch).toHaveBeenCalledWith(3);
  });
});
