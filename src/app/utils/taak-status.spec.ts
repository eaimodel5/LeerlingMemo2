import { describe, it, expect } from 'vitest';
import { bepaalStatus, zelfdeEmail, vakSleutel, STATUS_LABEL } from './taak-status';

describe('bepaalStatus', () => {
  it('noemt het ingevuld als er een memo is na een uitgezette taak', () => {
    expect(bepaalStatus(true, true)).toBe('ingevuld');
  });

  it('noemt het spontaan als er een memo is zonder taak', () => {
    // Dit is het signaal dat de mentor wil zien: een docent heeft uit zichzelf
    // iets ingevuld.
    expect(bepaalStatus(true, false)).toBe('spontaan');
  });

  it('noemt het open als er wel een taak is maar nog geen memo', () => {
    expect(bepaalStatus(false, true)).toBe('open');
  });

  it('noemt het niet-gevraagd als er niets is', () => {
    expect(bepaalStatus(false, false)).toBe('niet-gevraagd');
  });

  it('kijkt naar de memo en niet naar het statusveld van de taak', () => {
    // De oude fout: een docent die de memo buiten zijn takenlijst om invulde,
    // liet de taak op Open staan. De memo is nu doorslaggevend.
    expect(bepaalStatus(true, true)).not.toBe('open');
  });

  it('heeft voor elke status een label', () => {
    for (const status of ['niet-gevraagd', 'open', 'ingevuld', 'spontaan'] as const) {
      expect(STATUS_LABEL[status]).toBeTruthy();
    }
  });
});

describe('zelfdeEmail', () => {
  it('negeert hoofdletters en spaties', () => {
    expect(zelfdeEmail('B.Houtman@emmauscollege.nl', ' b.houtman@emmauscollege.nl ')).toBe(true);
  });

  it('ziet echt verschillende adressen als verschillend', () => {
    expect(zelfdeEmail('a@school.nl', 'b@school.nl')).toBe(false);
  });

  it('geeft onwaar bij een leeg adres, zodat lege velden niet aan elkaar koppelen', () => {
    expect(zelfdeEmail('', '')).toBe(false);
    expect(zelfdeEmail(undefined, 'a@school.nl')).toBe(false);
  });
});

describe('vakSleutel', () => {
  it('maakt memo en taak vergelijkbaar ondanks hoofdletters en spaties', () => {
    expect(vakSleutel('114334', ' Wiskunde ')).toBe(vakSleutel('114334', 'wiskunde'));
  });

  it('houdt verschillende vakken uit elkaar', () => {
    expect(vakSleutel('114334', 'Wiskunde')).not.toBe(vakSleutel('114334', 'Nederlands'));
  });
});
