import { describe, it, expect, vi, afterEach } from 'vitest';
import { wachtOpOpslag, meldingBijFout, MELDING_WACHT } from './opslag';

describe('wachtOpOpslag', () => {
  afterEach(() => vi.useRealTimers());

  it('meldt bevestigd zodra de server antwoordt', async () => {
    await expect(wachtOpOpslag(Promise.resolve())).resolves.toBe('bevestigd');
  });

  it('geeft een fout van Firestore door aan de aanroeper', async () => {
    await expect(wachtOpOpslag(Promise.reject(new Error('permission-denied')))).rejects.toThrow('permission-denied');
  });

  it('meldt wacht-op-verbinding als de bevestiging uitblijft', async () => {
    // Zo gedraagt Firestore zich offline: de belofte blijft openstaan.
    const nooit = new Promise(() => { /* lost nooit op */ });
    await expect(wachtOpOpslag(nooit, 20)).resolves.toBe('wacht-op-verbinding');
  });

  it('wacht op een trage bevestiging binnen de tijdslimiet', async () => {
    const traag = new Promise(klaar => setTimeout(klaar, 10));
    await expect(wachtOpOpslag(traag, 200)).resolves.toBe('bevestigd');
  });

  it('laat een late fout geen onafgevangen belofte worden', async () => {
    const opgevangen: unknown[] = [];
    const luister = (e: PromiseRejectionEvent | { reason?: unknown }) => opgevangen.push(e);
    process.on('unhandledRejection', luister);

    const laatFout = new Promise((_, mislukt) => setTimeout(() => mislukt(new Error('te laat')), 15));
    await expect(wachtOpOpslag(laatFout, 5)).resolves.toBe('wacht-op-verbinding');
    await new Promise(klaar => setTimeout(klaar, 40));

    process.off('unhandledRejection', luister);
    expect(opgevangen).toEqual([]);
  });
});

describe('meldingen', () => {
  it('gebruikt de leesbare tekst uit de fout', () => {
    expect(meldingBijFout(new Error('Je hebt geen rechten om dit op te slaan.')))
      .toEqual({ soort: 'fout', tekst: 'Je hebt geen rechten om dit op te slaan.' });
  });

  it('valt terug op een begrijpelijke tekst bij iets onbekends', () => {
    const melding = meldingBijFout('kapot');
    expect(melding.soort).toBe('fout');
    expect(melding.tekst).toContain('staat nog in het formulier');
  });

  it('zegt bij het wachten niet dat het opgeslagen is', () => {
    expect(MELDING_WACHT.tekst.toLowerCase()).not.toContain('opgeslagen.');
    expect(MELDING_WACHT.soort).toBe('wacht');
  });
});
