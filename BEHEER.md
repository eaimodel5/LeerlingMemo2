# Beheer van Leerlingmemo

Wat je als beheerder moet weten om de app draaiend te houden. Kort, en alleen
dingen die je niet vanzelf uit de schermen kunt aflezen.

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

## Docenten en docentafkorting

Een docent wordt in `/docenten` opgeslagen met de schoolafkorting als vaste
identiteit.

Voorbeeld:

Document-ID:

`vis`

Velden:

| Veld | |
|---|---|
| `afkorting` | genormaliseerde schoolafkorting, bijvoorbeeld `vis` |
| `naam` | leesbare naam, bijvoorbeeld `Hans Visser` |
| `actief` | `true` of `false` |
| `aangemaaktOp` | ISO-tijdstip, indien aanwezig |
| `gewijzigdOp` | ISO-tijdstip, indien aanwezig |

Het canonieke Docent-model bevat **geen e-mailadres**.

De afkorting is de personeelsidentiteit. Een afkorting wordt:

- expliciet ingevoerd of gekozen;
- in kleine letters opgeslagen;
- in de interface meestal in hoofdletters weergegeven;
- nooit afgeleid uit naam of e-mailadres.

Een gelijke naam is niet voldoende om twee docentrecords automatisch als
dezelfde persoon te behandelen.

Tijdens de overgang bestaan in oudere gegevens nog velden als `docentEmail`,
`mentorEmail` en `ownerEmail`. Die zijn alleen legacy-compatibiliteit en worden
niet gebruikt om nieuwe docentidentiteiten te maken.

---

## Toegangscodes

Een code is een document in `/codes`, en **het document-ID is de code zelf**.

Dat is geen toeval: de app haalt hem op met een gerichte `get` op dat ID.
Zoeken door de collectie mag alleen de beheerder, dus een code met een ander
document-ID is onvindbaar bij het inloggen.

Velden:

| Veld | |
|---|---|
| `code` | dezelfde tekst als het document-ID |
| `role` | `Docent`, `Mentor`, `Coordinator` of `Superuser` |
| `ownerName` | naam van de gekoppelde medewerker |
| `ownerEmail` | tijdelijk legacyveld voor compatibiliteit |
| `docentAfkorting` | schoolafkorting van de gekoppelde medewerker, bijvoorbeeld `vis` |
| `vak` | bestaand tijdelijk veld; vooral relevant voor oudere docentcodes |
| `createdAt` | ISO-tijdstip |
| `active` | `true`. Ontbreekt het veld, dan telt de code als actief |
| `used` | overblijfsel; laat op `false` staan |
| `gewijzigdOp` | moment waarop de code is ingetrokken of opnieuw geactiveerd |

### Nieuwe codes

Nieuwe toegangscodes worden gekoppeld aan een bestaande **actieve docent** uit
`/docenten`.

Dit geldt voor alle personeelsrollen:

- Docent
- Mentor
- Coordinator
- Superuser

De beheerder kiest de docent expliciet. De app gebruikt vervolgens:

- `docentAfkorting` als identiteit;
- de naam uit het Docent-record als `ownerName`.

De app leidt een afkorting nooit af uit:

- naam;
- e-mailadres;
- vak.

Daardoor kan bijvoorbeeld niet stil een code met `docentAfkorting: vis` aan een
andere naam worden gekoppeld.

### Legacycodes

Bestaande codes van vóór de invoering van `docentAfkorting` kunnen het veld
missen.

Die codes blijven tijdens de migratie geldig.

Een legacycode zonder `docentAfkorting`:

- kan nog inloggen;
- kan nog een sessie krijgen;
- kan nog worden ingetrokken;
- kan opnieuw worden geactiveerd;
- krijgt niet automatisch een afkorting toegewezen.

De applicatie verzint geen identiteit voor bestaande gegevens.

### Sessies en docentAfkorting

Bij het inloggen wordt `docentAfkorting` uit het codedocument overgenomen in de
gebruikerssessie.

De keten is:

`AccessCode → AuthUser → /userSessions/{uid}`

Bij sessieherstel wordt het codedocument opnieuw uit Firestore gelezen. Een
waarde uit browseropslag is dus niet de bron voor de personeelsidentiteit.

Firestore Rules controleren dat de optionele `docentAfkorting` in een sessie
exact overeenkomt met die op de code.

Voorbeelden:

Code:

`docentAfkorting = vis`

Sessie:

`docentAfkorting = vis`

→ toegestaan.

Code:

`docentAfkorting = vis`

Sessie:

`docentAfkorting = jan`

→ geweigerd.

Legacycode zonder afkorting en sessie zonder afkorting:

→ toegestaan.

Legacycode zonder afkorting en sessie die zelf `vis` toevoegt:

→ geweigerd.

### Codes uitdelen

Vanuit de app:

**Systeembeheer → Codes Beheren**

Codes kunnen los of in bulk via CSV worden aangemaakt.

Bij nieuwe CSV-imports hoort iedere code een geldige `docentAfkorting` te
bevatten. De afkorting moet verwijzen naar een bestaande actieve docent.

Onbekende, ongeldige of niet-actieve docentafkortingen worden niet stil aan een
andere docent gekoppeld.

### Een code intrekken

Zelfde scherm, knop **Intrekken**.

Dat zet:

`active: false`

en is omkeerbaar met **Activeren**.

Intrekken werkt meteen, ook bij iemand die op dat moment is ingelogd:

- de Firestore Rules controleren bij iedere lees- of schrijfactie of de code
  nog bestaat en actief is;
- de app bewaakt daarnaast het eigen codedocument;
- zodra de code verdwijnt of wordt ingetrokken, wordt de actieve sessie
  beëindigd.

Een tijdelijke netwerkfout in die bewaking veroorzaakt niet automatisch een
logout.

Verwijderen kan ook, maar laat geen spoor na. Intrekken is bijna altijd de
betere keuze.

### De laatste beheerderscode

Een Superuser-code kan alleen worden ingetrokken zolang er minstens één
**andere actieve Superuser-code** overblijft.

Anders kan niemand meer codes beheren en moet herstel rechtstreeks via
Firestore gebeuren.

Maak daarom eerst een tweede actieve Superuser-code voordat je de enige
beheerderscode intrekt.

### De allereerste beheerderscode, met de hand

Nodig bij een nieuwe installatie of wanneer er geen bruikbare Superuser-code
meer bestaat.

Maak eerst de medewerker aan in `/docenten`.

Firebase-console → Firestore → juiste database → collectie `docenten` →
**Add document**.

Voorbeeld:

Document-ID:

`vis`

Velden:

- `afkorting` = `vis`
- `naam` = `Hans Visser`
- `actief` = `true`

Maak daarna de toegangscode.

Firebase-console → Firestore → juiste database → collectie `codes` →
**Add document**.

Voorbeeld:

Document-ID:

`XHRU-6JKC`

Velden:

- `code` = `XHRU-6JKC`
- `role` = `Superuser`
- `ownerName` = `Hans Visser`
- `ownerEmail` = bestaand legacyadres
- `docentAfkorting` = `vis`
- `createdAt` = ISO-tijdstip
- `active` = `true`
- `used` = `false`

`ownerEmail` bestaat hier voorlopig alleen voor compatibiliteit met de huidige
migratiefase.

Gebruik het e-mailadres niet als nieuwe personeelsidentiteit.

---

## Wie mag wat

Deze tabel staat op drie plekken en die drie horen gelijk te zijn:

- `firestore.rules` — wat de database afdwingt;
- `src/app/services/rechten.ts` — wat de schermen toestaan;
- `rechten.spec.ts` — wat de tests bewaken.

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
voorgekomen:

- een knop die zichtbaar is maar door de database wordt geweigerd;
- een scherm dat verborgen is in het menu maar via de URL toch bereikbaar is.

Verschuift een grens, verschuif hem dan op alle relevante plekken.

---

## Beveiligingsregels publiceren

`firestore.rules` in de repository is de bron.

Wijzigingen gelden pas als ze gepubliceerd zijn.

```bash
npx firebase login
npm run deploy:rules
