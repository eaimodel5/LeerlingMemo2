import { signal } from '@angular/core';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  Auth,
  browserSessionPersistence,
  inMemoryPersistence,
  initializeAuth,
} from 'firebase/auth';
import firebaseConfig from '../../../firebase-applet-config.json';

/**
 * Eén plek waar Firebase wordt opgestart.
 *
 * Stond eerder los in data.service, auth.service en superuser.component. Dat
 * ging goed zolang niemand instellingen meegaf, maar de aanmelding hieronder
 * moet vóór het eerste gebruik van Auth gebeuren — en dan is drie keer
 * opstarten in willekeurige volgorde vragen om problemen.
 */
export const app = !getApps().length ? initializeApp(firebaseConfig as never) : getApp();

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const inBrowser = typeof window !== 'undefined';

/**
 * Firebase bewaart een aanmelding standaard per browser (IndexedDB). Alle
 * tabbladen delen dan één identiteit, terwijl de app sinds blok 1 juist per
 * tabblad een eigen sessie bijhoudt: op een gedeelde computer in de
 * docentenkamer schreef anders het ene tabblad memo's op naam van het andere.
 *
 * `browserSessionPersistence` is sessionStorage: eigen aanmelding per tabblad,
 * die een herlading van dat tabblad wél overleeft. Tijdens het voorrenderen
 * bestaat er geen browseropslag; daar blijft het bij geheugen.
 */
export const auth: Auth = initializeAuth(app, {
  persistence: inBrowser ? [browserSessionPersistence, inMemoryPersistence] : inMemoryPersistence,
});

/**
 * Staat op `true` zodra er een geldige sessie in Firestore staat.
 *
 * De beveiligingsregels laten pas iets lezen als /userSessions/{uid} bestaat.
 * De luisteraars in DataService moeten daar dus op wachten; startten ze meteen
 * bij het opstarten van de app, dan kregen ze allemaal 'permission-denied' en
 * bleef elk scherm leeg — ook ná een geslaagde inlog, want een gestorven
 * luisteraar komt niet vanzelf terug.
 */
export const sessieActief = signal(false);
