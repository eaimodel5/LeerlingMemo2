import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserRole, AccessCode } from '../models/data.models';
import { signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, sessieActief } from './firebase';
import { InlogFout, INLOG_MELDINGEN, herkenInlogFout, normaliseerCode } from '../utils/inlogfout';
import { Recht, mag } from './rechten';
import { DataService } from './data.service';
import { isActieveCode } from '../utils/toegangscode';
import { CodeBewaking } from '../utils/code-bewaking';

/** Sleutel waaronder de ingelogde gebruiker wordt bewaard. */
const SLEUTEL = 'leerlingmemo_auth';

export interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
  vak?: string;
  code?: string;
  /**
   * De schoolafkorting van de docent (/docenten/{afkorting}).
   * Overgenomen uit het AccessCode-document; nooit geraden uit naam of e-mail.
   */
  docentAfkorting?: string;
}

export type InlogResultaat = { ok: true } | { ok: false; reden: InlogFout; melding: string };

function fout(reden: InlogFout): InlogResultaat {
  return { ok: false, reden, melding: INLOG_MELDINGEN[reden] };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  private dataService = inject(DataService);

  currentUser = signal<AuthUser | null>(null);

  /** Loopt zolang een opgeslagen inlog opnieuw bij Firebase wordt aangemeld. */
  herstelBezig = signal(false);

  /** Volgt het eigen codedocument zolang er een sessie is. */
  private codeBewaking = new CodeBewaking();

  /** Voorkomt dat een uitlog die al loopt nog eens wordt gestart. */
  private uitloggen = false;

  constructor() {
    if (typeof window === 'undefined') return;

    // sessionStorage is per tabblad, localStorage per browser. Stond de
    // ingelogde gebruiker alleen in localStorage, dan deelden alle tabbladen
    // één identiteit: wie het laatst inlogde won, en de andere tabbladen
    // merkten daar niets van omdat ze hun eigen kopie in het geheugen hielden.
    // Op een gedeelde computer in de docentenkamer leverde dat memo's op naam
    // van de verkeerde persoon op.
    //
    // Dit tabblad werkt nu met zijn eigen sessie. localStorage blijft alleen in
    // gebruik als startwaarde, zodat een nieuw tabblad niet opnieuw hoeft in te
    // loggen.
    const uitTabblad = sessionStorage.getItem(SLEUTEL);
    const uitBrowser = localStorage.getItem(SLEUTEL);
    const opgeslagen = uitTabblad ?? uitBrowser;

    if (!opgeslagen) return;

    let gebruiker: AuthUser;
    try {
      gebruiker = JSON.parse(opgeslagen) as AuthUser;
    } catch {
      // Onleesbare inhoud: opruimen en uitgelogd starten.
      sessionStorage.removeItem(SLEUTEL);
      localStorage.removeItem(SLEUTEL);
      return;
    }

    this.currentUser.set(gebruiker);
    sessionStorage.setItem(SLEUTEL, opgeslagen);

    // De opgeslagen gebruiker zegt alleen wie er in dít tabblad was ingelogd.
    // Firestore weet daar niets van: de aanmelding staat in sessionStorage van
    // Firebase zelf en is bij een nieuw tabblad leeg. Zonder deze stap ziet het
    // scherm er ingelogd uit terwijl geen enkele lijst zich vult.
    void this.herstelSessie(gebruiker);
  }

  // Let op: hier stond een inlog met een vaste gebruikersnaam en wachtwoord.
  // Die waarden kwamen als platte tekst in de JavaScript-bundel terecht en waren
  // dus voor iedere bezoeker zichtbaar. De beheerder logt nu in met een
  // toegangscode met de rol 'Superuser'; zie BEVEILIGING.md voor het aanmaken
  // daarvan. Beschouw het oude wachtwoord als gelekt en gebruik het nergens meer.

  /**
   * Logt in met een toegangscode.
   *
   * Zocht de code eerder op met een query op het veld `code`. Dat is voor
   * Firestore een `list`-bewerking op de hele collectie, en die is sinds de
   * nieuwe regels voorbehouden aan de beheerder — dus kreeg iedereen
   * 'permission-denied', dat als "ongeldige code" in beeld kwam terwijl de code
   * gewoon bestond. De code ís het document-ID, dus één gerichte `get` volstaat
   * en dat mag wel.
   */
  async loginWithCode(code: string): Promise<InlogResultaat> {
    const schoon = normaliseerCode(code);
    if (!schoon) return fout('onbekende-code');

    try {
      const uid = await this.meldAanBijFirebase();

      const snap = await getDoc(doc(db, 'codes', schoon));
      if (!snap.exists()) return fout('onbekende-code');

      const data = snap.data() as AccessCode;
      if (!isActieveCode(data)) return fout('code-ingetrokken');

      const gebruiker: AuthUser = {
        name: data.ownerName,
        email: data.ownerEmail,
        role: data.role,
        vak: data.vak,
        code: snap.id,
        ...(data.docentAfkorting ? { docentAfkorting: data.docentAfkorting } : {}),
      };

      await this.schrijfSessie(uid, gebruiker);
      this.setUser(gebruiker);
      sessieActief.set(true);
      this.bewaakEigenCode(snap.id);
      return { ok: true };
    } catch (error) {
      console.error('Inloggen met code mislukt', error);
      return fout(herkenInlogFout(error));
    }
  }

  async logout() {
    if (this.uitloggen) return;
    this.uitloggen = true;

    // De bewaking op het eigen codedocument hoort als eerste weg: anders kan
    // die tijdens het uitloggen zelf nog een keer afgaan.
    this.codeBewaking.stop();

    const uid = auth.currentUser?.uid;

    // Eerst stoppen met luisteren, dan pas de sessie opruimen. Andersom
    // verwijder je je eigen leesrecht terwijl er nog acht luisteraars aanstaan:
    // die kregen dan prompt 'permission-denied' en zetten een rode foutbalk in
    // beeld over iets wat de gebruiker zelf had gevraagd. Via het effect zou
    // dat pas een tel later gebeuren; hier is de volgorde zeker.
    sessieActief.set(false);
    this.dataService.stopListeners();

    if (uid) {
      // Beste inspanning: lukt het opruimen niet, dan is de lokale sessie toch weg.
      try {
        await deleteDoc(doc(db, 'userSessions', uid));
      } catch (error) {
        console.warn('Sessie opruimen mislukt', error);
      }
    }

    this.currentUser.set(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SLEUTEL);
      localStorage.removeItem(SLEUTEL);
    }

    try {
      await this.router.navigate(['/login']);
    } finally {
      // Ook als het navigeren misgaat moet een volgende uitlogpoging kunnen.
      this.uitloggen = false;
    }
  }

  /**
   * Volgt het eigen codedocument en logt uit zodra dat verdwijnt of wordt
   * ingetrokken.
   *
   * Alleen dit ene document, niet de collectie: /codes doorzoeken mag volgens
   * de regels alleen de beheerder, terwijl een gerichte opvraag voor iedere
   * aangemelde gebruiker is toegestaan.
   */
  private bewaakEigenCode(codeId: string) {
    if (typeof window === 'undefined') return;

    this.codeBewaking.volg(
      melden =>
        onSnapshot(
          doc(db, 'codes', codeId),
          snap => melden(snap.exists(), snap.data() as AccessCode | undefined),
          error => {
            // Niet uitloggen op een netwerkstoring; alleen op een code die
            // aantoonbaar weg of ingetrokken is.
            console.warn('Bewaking van de eigen toegangscode gaf een fout:', error);
          },
        ),
      () => {
        console.info('De eigen toegangscode is ingetrokken of verwijderd; sessie wordt beëindigd.');
        void this.logout();
      },
    );
  }

  /**
   * Meldt dit tabblad aan bij Firebase en geeft de uid terug.
   *
   * De app deed dit nooit: er was wel een eigen inlog met toegangscodes, maar
   * voor Firestore bleef iedere bezoeker een onbekende. Zolang de regels op
   * `if true` stonden viel dat niet op.
   */
  private async meldAanBijFirebase(): Promise<string> {
    if (auth.currentUser) return auth.currentUser.uid;
    const resultaat = await signInAnonymously(auth);
    return resultaat.user.uid;
  }

  /**
   * Legt de rol en eventuele docentidentiteit vast in /userSessions/{uid}.
   *
   * Dit document is wat de beveiligingsregels lezen. De regel controleert zelf
   * dat `code` bestaat in /codes, dat `role` exact gelijk is aan de rol in dat
   * code-document, én dat `docentAfkorting` exact overeenkomt met de code.
   * Schrijft geen undefined-waarden naar Firestore.
   */
  private async schrijfSessie(uid: string, gebruiker: AuthUser) {
    const sessie: Record<string, unknown> = {
      code: gebruiker.code,
      role: gebruiker.role,
      ownerName: gebruiker.name,
      ownerEmail: gebruiker.email,
      startedAt: new Date().toISOString(),
    };
    if (gebruiker.docentAfkorting) {
      sessie['docentAfkorting'] = gebruiker.docentAfkorting;
    }
    await setDoc(doc(db, 'userSessions', uid), sessie);
  }

  /** Meldt een opgeslagen inlog opnieuw aan, bij een herlading of een nieuw tabblad. */
  private async herstelSessie(gebruiker: AuthUser) {
    if (!gebruiker.code) {
      // Van vóór deze wijziging opgeslagen: er valt niets te controleren.
      this.currentUser.set(null);
      sessionStorage.removeItem(SLEUTEL);
      localStorage.removeItem(SLEUTEL);
      return;
    }

    this.herstelBezig.set(true);
    try {
      const uid = await this.meldAanBijFirebase();
      const snap = await getDoc(doc(db, 'codes', gebruiker.code));
      // Is de code intussen ingetrokken, dan eindigt de sessie hier. De
      // beveiligingsregels weigeren hem dan toch al; dit zorgt ervoor dat het
      // scherm dat ook laat zien in plaats van overal lege lijsten te tonen.
      if (!snap.exists() || !isActieveCode(snap.data() as AccessCode)) {
        await this.logout();
        return;
      }

      // De rol en personeelsidentiteit komen uit het code-document, niet uit
      // de browseropslag: is de code gewijzigd of voorzien van een afkorting,
      // dan geldt de waarde uit Firestore.
      const data = snap.data() as AccessCode;
      const bijgewerkt: AuthUser = {
        name: data.ownerName,
        email: data.ownerEmail,
        role: data.role,
        vak: data.vak,
        code: snap.id,
        ...(data.docentAfkorting ? { docentAfkorting: data.docentAfkorting } : {}),
      };

      await this.schrijfSessie(uid, bijgewerkt);
      this.setUser(bijgewerkt);
      sessieActief.set(true);
      // Pas hier, niet in de constructor: nu pas staat vast welke code bij deze
      // sessie hoort.
      this.bewaakEigenCode(snap.id);
    } catch (error) {
      console.error('Sessie herstellen mislukt', error);
      // Niet uitloggen: bij een haperende verbinding is de gebruiker morgen
      // gewoon weer wie hij was. De schermen tonen dan de verbindingsmelding.
    } finally {
      this.herstelBezig.set(false);
    }
  }

  private setUser(user: AuthUser) {
    this.currentUser.set(user);
    if (typeof window === 'undefined') return;

    const opgeslagen = JSON.stringify(user);
    // Dit tabblad is leidend; de kopie in localStorage dient alleen als
    // startwaarde voor een volgend tabblad.
    sessionStorage.setItem(SLEUTEL, opgeslagen);
    localStorage.setItem(SLEUTEL, opgeslagen);
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  hasRole(role: UserRole): boolean {
    return this.currentUser()?.role === role;
  }

  /**
   * Mag de ingelogde gebruiker dit?
   *
   * Gebruik dit in plaats van `hasRole(...)` zodra het om een handeling gaat.
   * `hasRole` vergelijkt exact één rol en kent geen volgorde, dus een controle
   * op `'Mentor'` sloot een coördinator per ongeluk uit — en drie schermen
   * verderop stond dezelfde grens net even anders opgeschreven. Zie
   * `rechten.ts`; die lijst hoort gelijk te zijn aan `firestore.rules`.
   */
  mag(recht: Recht): boolean {
    return mag(this.currentUser()?.role, recht);
  }
}
