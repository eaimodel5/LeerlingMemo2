import { Type, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UserRole } from '../app/models/data.models';
import { AuthService, AuthUser } from '../app/services/auth.service';
import { DataService } from '../app/services/data.service';
import { Recht, mag } from '../app/services/rechten';
import { NepDataService } from './nep-dataservice';
import { maakGebruiker } from './factories';

/**
 * AuthService zonder Firebase, met een instelbare rol.
 *
 * `mag()` is niet nagebouwd maar leent de echte functie uit `rechten.ts`: een
 * test die controleert of een knop verschijnt, moet dezelfde grens gebruiken
 * als de app. Zou dit een eigen kopie zijn, dan blijft de test groen terwijl de
 * app iets anders doet — precies het probleem dat rechten.ts moest oplossen.
 */
export class NepAuthService {
  currentUser = signal<AuthUser | null>(null);
  herstelBezig = signal(false);

  uitgelogd = false;

  logIn(rol: UserRole, over: Partial<AuthUser> = {}) {
    this.currentUser.set({ ...maakGebruiker(rol), ...over } as AuthUser);
  }

  async loginWithCode(): Promise<{ ok: true }> {
    return { ok: true };
  }

  async logout() {
    this.uitgelogd = true;
    this.currentUser.set(null);
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  hasRole(rol: UserRole): boolean {
    return this.currentUser()?.role === rol;
  }

  mag(recht: Recht): boolean {
    return mag(this.currentUser()?.role, recht);
  }
}

export interface Omgeving<T> {
  fixture: ComponentFixture<T>;
  component: T;
  data: NepDataService;
  auth: NepAuthService;
  /** Rendert opnieuw en wacht tot alle openstaande beloftes zijn afgehandeld. */
  ververs: () => Promise<void>;
  /** De gerenderde tekst, met witruimte samengetrokken zodat matchen leesbaar blijft. */
  tekst: () => string;
  /** Zoekt knoppen op hun zichtbare tekst. */
  knop: (tekst: string) => HTMLButtonElement | null;
}

/**
 * Zet een component klaar met neppe services en een ingelogde rol.
 *
 * Zonder deze helper begint elke componenttest met twintig regels TestBed-
 * configuratie, en verschilt die configuratie per bestand net genoeg om
 * verschillen in uitkomst te verklaren met "het testbestand deed het anders".
 */
export async function maakOmgeving<T>(
  component: Type<T>,
  opties: { rol?: UserRole; vul?: (data: NepDataService) => void; gebruiker?: Partial<AuthUser> } = {},
): Promise<Omgeving<T>> {
  const data = new NepDataService();
  const auth = new NepAuthService();

  if (opties.rol) auth.logIn(opties.rol, opties.gebruiker);
  opties.vul?.(data);

  await TestBed.configureTestingModule({
    imports: [component],
    providers: [
      provideRouter([]),
      { provide: DataService, useValue: data as unknown as DataService },
      { provide: AuthService, useValue: auth as unknown as AuthService },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();

  const ververs = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const tekst = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ').trim() ?? '';

  const knop = (zoek: string) => {
    const knoppen = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ) as HTMLButtonElement[];
    return knoppen.find(b => (b.textContent ?? '').replace(/\s+/g, ' ').trim().includes(zoek)) ?? null;
  };

  return { fixture, component: fixture.componentInstance, data, auth, ververs, tekst, knop };
}

/** Vult een formulierveld en laat Angular het horen. */
export function vulVeld(fixture: ComponentFixture<unknown>, selector: string, waarde: string) {
  const veld = (fixture.nativeElement as HTMLElement).querySelector(selector) as
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement
    | null;
  if (!veld) throw new Error(`Veld niet gevonden: ${selector}`);
  veld.value = waarde;
  veld.dispatchEvent(new Event('input'));
  veld.dispatchEvent(new Event('change'));
  fixture.detectChanges();
  return veld;
}

/**
 * Vervangt `confirm()` en `alert()` zolang een test loopt.
 *
 * De app vraagt op een paar plekken om bevestiging met een browserdialoog. In
 * de testomgeving bestaat die niet: `confirm()` geeft daar niets terug, en
 * omdat dat als "nee" telt deed de knop niets en leek de test te bewijzen dat
 * de functie kapot was.
 *
 * Roep dit aan in een `beforeEach` en zet `antwoord` op wat de gebruiker zou
 * klikken. Alle gestelde vragen komen in `vragen` terecht, zodat een test ook
 * kan controleren dat er om bevestiging is gevraagd.
 */
export function nepDialogen(antwoord = true) {
  const echt = { confirm: window.confirm, alert: window.alert };
  const vragen: string[] = [];
  const meldingen: string[] = [];

  window.confirm = (tekst?: string) => {
    vragen.push(tekst ?? '');
    return antwoord;
  };
  window.alert = (tekst?: string) => {
    meldingen.push(String(tekst ?? ''));
  };

  return {
    vragen,
    meldingen,
    herstel: () => {
      window.confirm = echt.confirm;
      window.alert = echt.alert;
    },
  };
}
