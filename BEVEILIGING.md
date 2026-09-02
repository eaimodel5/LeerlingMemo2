# Beveiliging en AVG

De app verwerkt namen, leerlingnummers en beoordelingen van gedrag en prestaties van
minderjarigen. Dit document beschrijft wat er is opgelost, wat er nog open staat, en
welke keuze er nodig is voordat er echte leerlinggegevens in de database gaan.

---

## Opgelost in deze wijziging

**Het vaste beheerderswachtwoord is uit de code gehaald.**

In `auth.service.ts` stond een inlog met een vaste gebruikersnaam en wachtwoord. Die
waarden kwamen als platte tekst in de gepubliceerde JavaScript terecht: iedereen die
"paginabron weergeven" deed, kon als beheerder inloggen. Ze staan bovendien nog in de
Git-geschiedenis, dus **behandel dat wachtwoord als gelekt en gebruik het nergens
anders meer**.

De inlog met gebruikersnaam en wachtwoord is verwijderd. De beheerder logt nu in met
een toegangscode met de rol `Superuser`, net als iedereen.

### Zo maak je die eerste beheerderscode aan

Eenmalig, via de Firebase-console (er is nog geen ingelogde beheerder die het in de app
kan doen):

1. Open de Firebase-console → Firestore Database → database
   `ai-studio-leerlingmemo2-ab5a5fba-336c-4c85-adfe-1693e9d2d30c`.
2. Ga naar de collectie `codes` en klik op "Add document" (auto-ID).
3. Voeg deze velden toe, allemaal van het type string, behalve `used`:

   | veld         | type    | waarde                              |
   |--------------|---------|-------------------------------------|
   | `code`       | string  | bijv. `HVQ7-2XKM` (zelf verzinnen)  |
   | `role`       | string  | `Superuser`                         |
   | `ownerName`  | string  | je eigen naam                       |
   | `ownerEmail` | string  | je schoolmailadres                  |
   | `createdAt`  | string  | bijv. `2026-09-02T12:00:00.000Z`    |
   | `used`       | boolean | `false`                             |

4. Log in de app in met die code. Vanaf dat moment kun je via het scherm
   "Codes Beheren" alle andere codes zelf aanmaken.

Bewaar de code als een wachtwoord: wie hem heeft, is beheerder.

---

## Nog open: dit vraagt eerst een keuze

De volgende punten zijn bewust **niet** in deze wijziging opgelost, omdat ze allemaal
afhangen van één beslissing: hoe mensen inloggen. Een halve oplossing zou hier
schijnveiligheid opleveren, en dat is erger dan een bekend gat.

### De kern van het probleem

`firestore.rules` bevat op dit moment:

```
allow read, write: if true;  // DEMO PURPOSES ONLY. Not for production!
```

De Firebase-configuratie zit — zoals bij elke webapp — gewoon in de JavaScript-bundel.
Met die gegevens kan iedereen de complete database uitlezen en overschrijven: alle
leerlingen, alle memo's, alle voortgangsplannen. Zonder in te loggen.

Dat is niet met een slimmere regel te repareren, want Firestore kent de app-rollen niet.
De rollen leven nu alleen in `localStorage` in de browser, en de route-guards in Angular
lezen die uit. Wie in de developer tools zijn rol op `Superuser` zet, ziet het hele
beheersmenu — en omdat de database niets controleert, werkt dat daar ook echt.
Guards zijn navigatiehulp, geen beveiliging.

Hetzelfde geldt voor de toegangscodes: die staan in dezelfde open collectie, dus wie de
lijst opvraagt kan zich als elke mentor of coördinator voordoen. Dat is niet op te
lossen zolang de client zelf de codes moet kunnen opzoeken.

**Gaat de app zo live met echte leerlingnamen, dan is dat een datalek dat gemeld moet
worden.**

### Optie A — toegangscodes houden, validatie naar de server

De vakdocent hoeft geen account te maken; hij vult een code in. Om dat veilig te maken
verhuist het controleren van de code naar een Cloud Function, die na goedkeuring een
Firebase-token met de juiste rol teruggeeft. De codes zelf worden dan onleesbaar voor
de browser.

- Werkwijze voor docenten verandert niet.
- Vereist wel Cloud Functions erbij: nieuwe infrastructuur om te onderhouden.
- Een code die rondslingert blijft toegang geven; er is geen persoon aan gekoppeld.

### Optie B — inloggen met het schoolaccount (aanbevolen)

Iedereen logt in met zijn `@emmauscollege.nl`-account via Google. De Firebase-config van
dit project bevat daar al een `oAuthClientId` voor. Rollen komen in een collectie
`gebruikers/{email}` te staan, die de beheerder onderhoudt.

- Geen wachtwoorden of codes meer om te beheren of te lekken.
- In de logboeken staat wie wat heeft ingevuld — precies wat je bij leerlinggegevens wilt.
- Vereist dat elke vakdocent inlogt. Bij een school met Google Workspace is dat één klik.
- De collectie `codes` en het scherm "Codes Beheren" kunnen vervallen.

Het bestand `firestore.rules.voorstel` in deze repository bevat kant-en-klare regels
voor optie B. Neem ze door, hernoem het bestand naar `firestore.rules` en publiceer het
zodra Firebase Authentication aanstaat.

---

## Kleinere punten die nog open staan

- **De memoschermen hebben geen guard.** `/memo-1`, `/memo-2` en `/memo-3` staan zonder
  `canActivate` in `app.routes.ts`. Uitgelogd zijn ze gewoon te openen, met "Publiek
  toegang" in de zijbalk, en de opslaanknoppen werken. Mogelijk bewust zo, zodat
  vakdocenten zonder code kunnen invullen — maar dat moet dan een expliciete keuze zijn.
- **Wie een klas op slot zette wordt niet vastgelegd.** `toggleLock()` leest
  `auth.currentUser` van Firebase Auth, terwijl de app daar nooit op inlogt. Er staat
  altijd "Onbekend". Dit lost zichzelf op zodra optie A of B is doorgevoerd.
- **Alle acht collecties worden bij elke paginalading opgehaald.** Iedere bezoeker
  downloadt daardoor alle gegevens van de hele school. Dat is duur, traag, en het maakt
  beperking per rol op de client zinloos.

---

## Voordat er echte gegevens in gaan

1. Kies optie A of B en voer die door.
2. Publiceer de bijbehorende Firestore-regels.
3. Test met verzonnen leerlingen: probeer als docent bewust de klas van een ander op te
   vragen, en controleer dat dat mislukt.
4. Stem af met wie binnen de school over verwerkersovereenkomsten gaat — er komt een
   Amerikaanse clouddienst bij in de keten.
