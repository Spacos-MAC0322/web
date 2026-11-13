// src/setupTests.js
// Executado antes de cada arquivo de teste do Vitest (vite.config.js → test.setupFiles).
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sem `globals: true`, a Testing Library não desmonta os componentes sozinha.
afterEach(() => {
  cleanup();
});

// O jsdom não implementa ResizeObserver, usado pelo componente Map (Leaflet).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
