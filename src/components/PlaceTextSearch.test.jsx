import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PlaceTextSearch, { TEXT_DEBOUNCE_MS } from './PlaceTextSearch';

// Como na página: o texto aplicado volta como `value`, sem espaços nas pontas.
function Harness({ onApply, initial = '' }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <PlaceTextSearch
        value={value}
        onChange={(text) => {
          onApply(text);
          setValue(text.trim());
        }}
      />
      <button type="button" onClick={() => setValue('')}>
        limpar por fora
      </button>
    </>
  );
}

const box = () => screen.getByRole('searchbox', { name: /nome, bairro ou região/ });
const type = (text) => fireEvent.change(box(), { target: { value: text } });
const wait = (ms) => act(() => vi.advanceTimersByTimeAsync(ms));

describe('PlaceTextSearch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('aplica o texto só quando a digitação pausa', async () => {
    const onApply = vi.fn();
    render(<Harness onApply={onApply} />);
    type('mu');
    await wait(TEXT_DEBOUNCE_MS - 50);
    type('museu');
    await wait(TEXT_DEBOUNCE_MS - 50);
    expect(onApply).not.toHaveBeenCalled();
    await wait(50);
    expect(onApply).toHaveBeenCalledExactlyOnceWith('museu');
  });

  it('Enter aplica na hora', () => {
    const onApply = vi.fn();
    render(<Harness onApply={onApply} />);
    type('teatro');
    fireEvent.submit(box().closest('form'));
    expect(onApply).toHaveBeenCalledWith('teatro');
  });

  it('não apaga o que foi digitado depois do último envio', async () => {
    const onApply = vi.fn();
    render(<Harness onApply={onApply} />);
    type('centr');
    await wait(TEXT_DEBOUNCE_MS);
    type('centro');
    expect(box()).toHaveValue('centro');
    await wait(TEXT_DEBOUNCE_MS);
    expect(onApply).toHaveBeenLastCalledWith('centro');
  });

  it('acompanha uma limpeza feita por fora sem reenviar o texto antigo', async () => {
    const onApply = vi.fn();
    render(<Harness onApply={onApply} initial="sé" />);
    expect(box()).toHaveValue('sé');
    fireEvent.click(screen.getByRole('button', { name: 'limpar por fora' }));
    expect(box()).toHaveValue('');
    await wait(TEXT_DEBOUNCE_MS * 2);
    expect(onApply).not.toHaveBeenCalled();
  });
});
