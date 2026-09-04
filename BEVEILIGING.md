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

---

## Verplichte instelling: anoniem aanmelden aanzetten

De Firestore-regels beslissen aan de hand van `/userSessions/{uid}` wie je bent. Die
`uid` komt van Firebase Authentication. De app meldt zich daarvoor **anoniem** aan —
dat is geen inlog voor de gebruiker, alleen een uniek kenmerk per tabblad waar de
regels iets aan kunnen ophangen. De echte inlog blijft de toegangscode.

Zet dit één keer aan, anders lukt inloggen bij niemand:

1. Ga naar de Firebase-console → **Authentication** → **Sign-in method**.
2. Kies **Anonymous** en zet hem op **Enabled**.
3. Opslaan.

Staat dit uit, dan meldt de inlogpagina dat met zoveel woorden ("Zet in de
Firebase-console onder Authentication → Sign-in method de methode Anonymous aan") in
plaats van met "ongeldige code".

### Wat er bij het inloggen gebeurt

1. Het tabblad meldt zich anoniem aan bij Firebase en krijgt een `uid`.
2. De ingetypte code wordt **op document-ID** opgehaald uit `/codes`. Dat is een `get`,
   geen `list` — zoeken door de hele codelijst mag alleen de beheerder.
3. De app schrijft `/userSessions/{uid}` met de code en de rol. De regel controleert
   zelf dat die code bestaat en dat de rol exact gelijk is aan die in het
   code-document, dus een rol vervalsen vanuit de browser levert niets op.
4. Pas daarna beginnen de luisteraars van de DataService te lezen.
5. Uitloggen verwijdert het sessiedocument.

De aanmelding staat in `sessionStorage`, dus elk tabblad krijgt een eigen `uid` en
daarmee een eigen rol. Op een gedeelde computer kan de ene collega als docent inloggen
terwijl de andere in een tweede tabblad als mentor werkt.


---

## Wie mag wat

Deze tabel staat op drie plekken en die drie horen gelijk te zijn:
`firestore.rules` (wat de database afdwingt), `src/app/services/rechten.ts` (wat
de schermen tonen) en `rechten.spec.ts` (wat de tests bewaken).

| Handeling | Docent | Mentor | Coordinator | Superuser |
|---|:--:|:--:|:--:|:--:|
| Memo invullen en bijwerken | * | * | * | * |
| Memo van een vakdocent verwijderen | | * | * | * |
| Voorbereiding en voortgangsplan | | * | * | * |
| Mentoroverzicht en Magister-export | | * | * | * |
| Klas op slot zetten | | * | * | * |
| Leerlingen toevoegen, bewerken, importeren | | * | * | * |
| Leerlingen verwijderen en de lijst wissen | | | * | * |
| Docent-vakkoppelingen beheren | | * | * | * |
| De hele docentenlijst wissen | | | * | * |
| Beheerdersoverzicht, toegangscodes | | | | * |

Twee soorten fouten die deze opzet moet voorkomen, en die allebei voorkwamen:

- **Een knop die zichtbaar is maar geweigerd wordt.** De prullenbak in het
  memopaneel stond zonder rolcontrole in het sjabloon, terwijl de regel op
  coordinator stond. De mentor kreeg dus een foutmelding bij iets wat hij hoort
  te mogen.
- **Een scherm dat verborgen is in het menu maar via de URL opengaat.**
  `/mentor-prep`, `/mentor-overview`, `/progress-plan` en `/magister-export`
  stonden op een guard die alleen controleerde of je bent ingelogd. Het menu
  verborg de links voor een vakdocent, maar wie de URL intypte kwam er gewoon
  in - en de leesregels laten elke rol alle memo's zien.

### De regels moeten opnieuw gepubliceerd worden

De aanpassingen in `firestore.rules` gelden pas als je ze publiceert:
Firebase-console -> Firestore Database -> **Rules** -> inhoud van
`firestore.rules` erin plakken -> **Publish**. Tot dat moment weigert de
database nog steeds het verwijderen van een memo door een mentor.


---

## Toegangscodes intrekken

Een code was tot nu toe onbeperkt geldig. Er stond wel een veld `used` in het
model, maar niets zette het ooit op `true`: een code die bij de verkeerde
persoon terechtkwam kon alleen worden weggegooid, en dan was ook niet meer te
zien dat hij ooit bestaan had.

Intrekken is nu een omkeerbare handeling met een spoor. In het beheerscherm
staat per code **Intrekken** en, bij een ingetrokken code, **Activeren**. De
statuskolom laat zien waar een code staat.

### Wat er gebeurt bij intrekken

`active` gaat op `false` en `gewijzigdOp` wordt gezet. Vanaf dat moment:

- lukt inloggen met die code niet meer -- de inlogpagina meldt "ingetrokken",
  niet "ongeldig";
- verliest **ook wie al is ingelogd** zijn toegang. De beveiligingsregels
  controleren bij elke lees- of schrijfactie of de code achter de sessie nog
  bestaat en nog actief is, en of de rol in de sessie nog klopt met de rol van
  die code. Zonder die controle bleef een lopende sessie gewoon doorwerken --
  het sessiedocument was immers al geschreven.

Dat kost twee documentleesacties per aanvraag (het sessiedocument en het
code-document). Firestore telt herhaalde toegang tot hetzelfde document binnen
een aanvraag een keer, dus het blijft ruim onder de limiet van tien.

### Codes van voor deze wijziging

Die hebben het veld `active` niet. Zowel de app als de regels lezen `active !=
false`, dus zulke codes blijven gewoon werken. Zou het `active == true` zijn,
dan sluit het publiceren van deze regels iedereen in een klap buiten.

### De laatste beheerderscode

Een beheerderscode kan alleen worden ingetrokken zolang er minstens een andere
**actieve** beheerderscode overblijft. Anders kan niemand nog codes aanmaken --
en dat aanmaken is zelf aan de beheerder voorbehouden, dus je komt er dan alleen
uit door met de hand in de Firebase-console te werken. Het scherm toont bij die
ene code "Laatste beheerderscode" in plaats van een knop.

### Regels publiceren

De repository bevat nu `firebase.json` en `.firebaserc`, met de naam van de
database erin -- deze installatie draait niet op `(default)` maar op
`ai-studio-leerlingmemo2-...`. Een `firebase deploy` zonder die naam publiceert
naar de standaarddatabase en meldt "success" terwijl er niets verandert.

```bash
npm i -g firebase-tools   # eenmalig
firebase login            # eenmalig
npm run deploy:rules
```

De CLI staat bewust niet als devDependency in dit project: hij sleept een paar
duizend regels in de lockfile mee voor iets wat je een paar keer per jaar doet.
Handmatig plakken in de console mag ook; kies dan bovenin wel dezelfde
database.
