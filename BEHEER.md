# Beheer van Leerlingmemo

Wat je als beheerder moet weten om de app draaiend te houden. Kort, en alleen
dingen die je niet uit de code kunt aflezen.

Vervangt `BEVEILIGING.md`; de analyse die daarin stond is met de reparaties uit
PR 1 tot en met 4 achterhaald.

---

## De installatie

| | |
|---|---|
| Firebase-project | `gen-lang-client-0249509708` |
| Firestore-database | `ai-studio-leerlingmemo2-ab5a5fba-336c-4c85-adfe-1693e9d2d30c` |
| App | leerlingmemo2.ai.studio |
| Code | github.com/eaimodel5/LeerlingMemo2 |

**Let op: dit is niet de standaarddatabase.** Firestore heet hier niet
`(default)` maar heeft een eigen naam. Dat maakt twee dingen makkelijk fout te
doen, en beide zijn stil:

- In de Firebase-console staat bovenin een databasekiezer. Sta je op de
  verkeerde, dan bewerk je een lege database die er precies zo uitziet.
- Een `firebase deploy` zonder die naam publiceert naar `(default)` en meldt
  "success" terwijl er niets verandert. `firebase.json` heeft de naam daarom
  vast ingebouwd — gebruik `npm run deploy:rules`, niet het kale commando.

---

## Eenmalig ingesteld: anoniem aanmelden

Firebase-console → **Authentication** → **Sign-in method** → **Anonymous** →
Enabled.

Dit is geen inlog voor gebruikers. De app meldt elk tabblad anoniem aan bij
Firebase om een `uid` te krijgen; daar hangen de beveiligingsregels hun
controles aan op. De echte inlog blijft de toegangscode.

Staat het uit, dan lukt inloggen bij niemand, en meldt de inlogpagina dat met
zoveel woorden.

---

## Toegangscodes

Een code is een document in `/codes`, en **het document-ID is de code zelf**.
Dat is geen toeval: de app haalt hem op met een gerichte `get` op dat ID. Zoeken
door de collectie mag alleen de beheerder, dus een code met een ander document-ID
is onvindbaar bij het inloggen.

Velden:

| Veld | |
|---|---|
| `code` | dezelfde tekst als het document-ID |
| `role` | `Docent`, `Mentor`, `Coordinator` of `Superuser` |
| `ownerName`, `ownerEmail` | van wie de code is |
| `createdAt` | ISO-tijdstip |
| `active` | `true`. Ontbreekt het veld, dan telt de code als actief |
| `used` | overblijfsel; laat op `false` staan |

### Codes uitdelen

Vanuit de app: **Systeembeheer → Codes Beheren**. Los, of in bulk via CSV.

### Een code intrekken

Zelfde scherm, knop **Intrekken**. Dat zet `active: false` en is omkeerbaar met
**Activeren**.

Intrekken werkt meteen, ook bij wie op dat moment is ingelogd: de regels
controleren bij elke lees- of schrijfactie of de code achter de sessie nog
bestaat en nog actief is. De app volgt daarnaast het eigen codedocument en logt
zichzelf uit zodra dat verdwijnt of wordt ingetrokken.

Verwijderen kan ook, maar laat geen spoor na. Intrekken is bijna altijd wat je
wilt.

### De laatste beheerderscode

Een beheerderscode kan alleen worden ingetrokken zolang er minstens één **andere
actieve** beheerderscode overblijft. Anders kan niemand meer codes aanmaken, en
kom je er alleen uit met de hand in de console. Maak dus een tweede
beheerderscode aan voordat je met de eerste gaat schuiven.

### De allereerste beheerderscode, met de hand

Nodig bij een nieuwe installatie, of als je jezelf toch hebt buitengesloten.
Firebase-console → Firestore → juiste database → collectie `codes` →
**Add document**:

- Document-ID: de code zelf, bijvoorbeeld `XHRU-6JKC` (hoofdletters)
- Velden: `code` (dezelfde tekst), `role` = `Superuser`, `ownerName`,
  `ownerEmail`, `createdAt` (ISO-tekst), `active` = `true` (boolean),
  `used` = `false` (boolean)

---

## Wie mag wat

Deze tabel staat op drie plekken en die drie horen gelijk te zijn:
`firestore.rules` (wat de database afdwingt), `src/app/services/rechten.ts` (wat
de schermen tonen) en `rechten.spec.ts` (wat de tests bewaken).

| Handeling | Docent | Mentor | Coordinator | Superuser |
|---|:--:|:--:|:--:|:--:|
| Memo invullen en bijwerken | ✔ | ✔ | ✔ | ✔ |
| Memo van een vakdocent verwijderen | | ✔ | ✔ | ✔ |
| Voorbereiding en voortgangsplan | | ✔ | ✔ | ✔ |
| Mentoroverzicht en Magister-export | | ✔ | ✔ | ✔ |
| Klas op slot zetten | | ✔ | ✔ | ✔ |
| Leerlingen toevoegen, bewerken, importeren | | ✔ | ✔ | ✔ |
| Leerlingen verwijderen en de lijst wissen | | | ✔ | ✔ |
| Docent-vakkoppelingen beheren | | ✔ | ✔ | ✔ |
| De hele docentenlijst wissen | | | ✔ | ✔ |
| Beheerdersoverzicht, toegangscodes | | | | ✔ |

Twee soorten fouten die deze opzet moet voorkomen, en die allebei zijn
voorgekomen: een knop die zichtbaar is maar door de database wordt geweigerd, en
een scherm dat verborgen is in het menu maar via de URL gewoon opengaat.
Verschuift een grens, verschuif hem dan op alle drie de plekken.

---

## Beveiligingsregels publiceren

`firestore.rules` in de repository is de bron. Wijzigingen gelden pas als ze
gepubliceerd zijn.

```bash
npx firebase login    # eenmalig
npm run deploy:rules
```

Met de hand kan ook: Firebase-console → Firestore → **juiste database kiezen** →
tab **Security** → inhoud van `firestore.rules` plakken → Publish.

Na publiceren duurt het meestal een halve minuut. Controleer het daarna met een
handeling die de wijziging raakt — bijvoorbeeld als mentor een memo verwijderen.

**Gaat er iets mis**, dan is de weg terug: `firestore.rules` van de vorige commit
terugzetten en opnieuw publiceren. Sluit je jezelf buiten, dan kun je nog altijd
in de console rechtstreeks bij de gegevens.

### Eén valkuil bij het schrijven van regels

Rechtstreeks een ontbrekend veld uitlezen — `codeData.active` op een document
zonder dat veld — geeft in Firestore Rules geen `null` maar een *evaluation
error*, en die telt als weigering. Gebruik `codeData.get('active', true)` met een
standaardwaarde. Dat is precies waarom oude codes zonder `active` bleven werken
in de bedoeling, maar niet in de eerste versie van de regels.

---

## Tests

```bash
npm test              # unit- en componenttests in de browseromgeving
npm run test:rules    # de beveiligingsregels tegen de Firestore-emulator
npm run typecheck:rules
```

`test:rules` heeft **Java** nodig; de Firestore-emulator is een Java-programma.
De eerste keer downloadt hij een jar van een paar tientallen megabytes.

Iedere pull request draait dit alles ook in GitHub Actions
(`.github/workflows/ci.yml`). Dat is niet vrijblijvend: de regels zijn in veel
ontwikkelomgevingen niet lokaal te draaien, en de CI-run is dan het enige bewijs
dat ze doen wat ze zeggen.

Lint staat bewust niet in de workflow. Er staan nog tientallen bestaande
meldingen open; een CI die altijd rood is, leest niemand meer.

---

## Gegevens en back-up

**De app heeft geen exportfunctie voor zijn eigen gegevens.** Dat is een gat, en
het is groter dan het lijkt. Wat je in de beheerschermen vindt onder "Template"
is een *leeg* CSV-voorbeeld om mee te importeren, geen uitdraai van wat erin
staat. Dat geldt voor leerlingen, voor docent-vakkoppelingen en voor de
toegangscodes.

Wat er wél uit kan:

- **Magister-export** geeft memo's, voorbereiding en voortgangsplan als tekst,
  per leerling of per klas — te kopiëren of als `.txt` te downloaden. Bedoeld om
  in Magister te plakken, niet om terug te zetten.
- **Systeembeheer → Overzicht** exporteert de signaleringslijst als CSV.

Voor een echte back-up: Firebase-console → Firestore → **Import/Export**. Dat
vraagt een Cloud Storage-bucket en is een handeling in Google Cloud, niet in de
app. Doe dat in elk geval vóór een schooljaarwisseling of een grote import.

**Systeembeheer → Testdata Opschonen** wist leerlingen, taken en memo's, en alle
codes behalve die van beheerders. Onomkeerbaar, en er is geen export om op terug
te vallen — zie hierboven.

---

## Wanneer je iemand moet uitleggen wat er misgaat

- **"Ongeldige of verlopen toegangscode"** — de code bestaat niet, of is
  ingetrokken. De inlogpagina noemt het verschil.
- **"De app mag zich niet bij Firebase aanmelden"** — Anonymous staat uit in de
  console.
- **Schermen blijven leeg zonder melding** — bijna altijd een ontbrekende
  koppeling in de gegevens. Kijk in **Systeembeheer → Overzicht**; de
  signalering daar noemt leerlingen zonder klas of mentor, klassen zonder
  gekoppelde docenten en dubbele leerlingnummers, met voorbeelden erbij.
- **Een knop geeft "je hebt geen rechten"** — vergelijk de tabel hierboven, en
  controleer of de regels van de laatste commit ook echt gepubliceerd zijn.
