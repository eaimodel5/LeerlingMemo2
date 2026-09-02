// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { naarKlembord } from './download';

describe('naarKlembord', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('gebruikt de klembord-API op een beveiligde verbinding', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('isSecureContext', true);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    expect(await naarKlembord('hallo')).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hallo');
  });

  it('valt terug op de oude methode als de klembord-API ontbreekt', async () => {
    // Zo gedraagt de browser zich op http: navigator.clipboard bestaat niet.
    vi.stubGlobal('isSecureContext', false);
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true });

    expect(await naarKlembord('hallo')).toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
  });

  it('valt terug als de klembord-API een fout geeft', async () => {
    vi.stubGlobal('isSecureContext', true);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('geweigerd')) },
      configurable: true
    });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', { value: execCommand, configurable: true });

    expect(await naarKlembord('hallo')).toBe(true);
  });

  it('meldt onwaar als ook de terugval niet lukt, zodat het scherm dat kan tonen', async () => {
    vi.stubGlobal('isSecureContext', false);
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    Object.defineProperty(document, 'execCommand', { value: vi.fn().mockReturnValue(false), configurable: true });

    expect(await naarKlembord('hallo')).toBe(false);
  });

  it('laat geen hulpveld achter in de pagina', async () => {
    vi.stubGlobal('isSecureContext', false);
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    Object.defineProperty(document, 'execCommand', { value: vi.fn().mockReturnValue(true), configurable: true });

    await naarKlembord('hallo');
    expect(document.querySelectorAll('textarea').length).toBe(0);
  });
});
