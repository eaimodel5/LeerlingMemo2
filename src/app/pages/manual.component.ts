import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-manual',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="max-w-6xl mx-auto space-y-6">
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[700px]">
        
        <!-- Sidebar Navigation -->
        <div class="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-4 shrink-0">
          <h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-3">Handleiding</h2>
          
          <nav class="space-y-1">
            @for (section of sections; track section.id) {
              <button 
                (click)="activeSection.set(section.id)"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left"
                [ngClass]="activeSection() === section.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
              >
                <mat-icon class="text-[20px] w-[20px] h-[20px]" [ngClass]="activeSection() === section.id ? 'text-blue-600' : 'text-slate-400'">{{ section.icon }}</mat-icon>
                {{ section.title }}
              </button>
            }
          </nav>
        </div>

        <!-- Content Area -->
        <div class="flex-1 p-6 md:p-10 overflow-y-auto">
          @if (activeSection() === 'intro') {
            <div class="max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                <mat-icon>school</mat-icon>
              </div>
              <h1 class="text-3xl font-extrabold text-slate-900 mb-4">Welkom bij het LVS Systeem</h1>
              <p class="text-lg text-slate-600 mb-8 leading-relaxed">
                Dit systeem is ontworpen om het traditionele Excel-werk rondom leerlingbesprekingen en memo's te vervangen door een gestroomlijnde, gebruiksvriendelijke webapplicatie. 
                De functionaliteit blijft dichtbij wat je gewend bent van office tools, maar met een sterk verbeterde User Experience (UX) en User Interface (UI).
              </p>

              <div class="grid sm:grid-cols-2 gap-6">
                <div class="bg-slate-50 border border-slate-100 rounded-xl p-5">
                  <h3 class="font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <mat-icon class="text-emerald-500 text-[20px] w-[20px] h-[20px]">check_circle</mat-icon>
                    Geen AI / LLM nodig
                  </h3>
                  <p class="text-sm text-slate-600 leading-relaxed">
                    Dit systeem draait 100% lokaal en deterministisch via betrouwbare databaselogica. Er wordt geen AI (LLM) gebruikt voor het genereren van data, wat volledige controle en AVG-compliance garandeert.
                  </p>
                </div>
                <div class="bg-slate-50 border border-slate-100 rounded-xl p-5">
                  <h3 class="font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <mat-icon class="text-blue-500 text-[20px] w-[20px] h-[20px]">cloud_sync</mat-icon>
                    Real-time Opslag
                  </h3>
                  <p class="text-sm text-slate-600 leading-relaxed">
                    Alle wijzigingen worden direct en veilig opgeslagen in de cloud (Firestore). Je verliest geen werk en data is direct inzichtelijk voor bevoegde collega's.
                  </p>
                </div>
              </div>
            </div>
          }

          @if (activeSection() === 'docent') {
            <div class="max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h1 class="text-3xl font-extrabold text-slate-900 mb-6">Voor de Vakdocent</h1>
              <p class="text-slate-600 mb-8 text-lg">
                Als vakdocent ben je verantwoordelijk voor het signaleren van bijzonderheden bij leerlingen in jouw klassen.
              </p>

              <div class="space-y-8">
                <div class="flex gap-4">
                  <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 mt-1">1</div>
                  <div>
                    <h3 class="text-xl font-bold text-slate-900 mb-2">Kies de juiste Memo-ronde</h3>
                    <p class="text-slate-600 mb-3">Via het hoofdmenu heb je de keuze uit twee invoerschermen:</p>
                    <ul class="list-disc list-inside text-slate-600 space-y-1 ml-2">
                      <li><strong>Memo TW1 / TW2:</strong> Gebruik deze na de eerste en tweede toetsweek. Hier ligt de focus op vorderingen, aandachtspunten en gerichte acties.</li>
                      <li><strong>Memo TW3:</strong> Gebruik deze na de derde toetsweek. Hier ligt de focus meer op doorstroom en afronding van het schooljaar.</li>
                    </ul>
                  </div>
                </div>

                <div class="flex gap-4">
                  <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 mt-1">2</div>
                  <div>
                    <h3 class="text-xl font-bold text-slate-900 mb-2">Filters instellen</h3>
                    <p class="text-slate-600 mb-3">Zodra je de pagina opent, selecteer je jouw vak, de klas en de betreffende periode. De tabel toont direct alle leerlingen uit de geselecteerde klas.</p>
                  </div>
                </div>

                <div class="flex gap-4">
                  <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 mt-1">3</div>
                  <div>
                    <h3 class="text-xl font-bold text-slate-900 mb-2">Invoeren in de tabel</h3>
                    <p class="text-slate-600 mb-3">De invoer werkt vergelijkbaar met Excel. Klik op een tekstveld en begin met typen. Zodra je buiten het veld klikt of de focus verliest, wordt de data <strong class="text-emerald-600">automatisch opgeslagen</strong>. Je hoeft niet meer te zoeken naar een "Opslaan" knop.</p>
                  </div>
                </div>
              </div>
            </div>
          }

          @if (activeSection() === 'mentor') {
            <div class="max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h1 class="text-3xl font-extrabold text-slate-900 mb-6">Voor de Mentor</h1>
              <p class="text-slate-600 mb-8 text-lg">
                Als mentor heb je een coördinerende rol. Dit systeem biedt tools om overzicht te houden en voor te bereiden op besprekingen.
              </p>

              <div class="space-y-6">
                <div class="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="p-2 bg-indigo-100 text-indigo-700 rounded-lg"><mat-icon>dashboard</mat-icon></div>
                    <h3 class="text-lg font-bold text-slate-900">Mentor Overzicht</h3>
                  </div>
                  <p class="text-slate-600 text-sm leading-relaxed">
                    Op deze pagina zie je een samenvatting van jouw mentorklas. Je ziet in één oogopslag hoeveel memo's er per leerling zijn ingevuld door de vakdocenten. Door een leerling te selecteren klapt een detailvenster open met alle ingediende memo's van die specifieke leerling.
                  </p>
                </div>

                <div class="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="p-2 bg-amber-100 text-amber-700 rounded-lg"><mat-icon>edit_note</mat-icon></div>
                    <h3 class="text-lg font-bold text-slate-900">Mentor Voorbereiding</h3>
                  </div>
                  <p class="text-slate-600 text-sm leading-relaxed mb-3">
                    Voorafgaand aan de leerlingbespreking kun je hier per leerling jouw analyse invullen. Geef met een kleurcode aan hoe de leerling ervoor staat:
                  </p>
                  <div class="flex gap-3 text-sm font-medium">
                    <span class="px-3 py-1 bg-red-100 text-red-700 rounded-full">Rood (Zorg)</span>
                    <span class="px-3 py-1 bg-orange-100 text-orange-700 rounded-full">Oranje (Twijfel)</span>
                    <span class="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">Groen (Goed)</span>
                  </div>
                </div>

                <div class="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
                  <div class="flex items-center gap-3 mb-3">
                    <div class="p-2 bg-blue-100 text-blue-700 rounded-lg"><mat-icon>trending_up</mat-icon></div>
                    <h3 class="text-lg font-bold text-slate-900">Voortgangsplan</h3>
                  </div>
                  <p class="text-slate-600 text-sm leading-relaxed">
                    Na afloop van de bespreking of gedurende het jaar kun je hier concrete acties en doelen formuleren in een Voortgangsplan per leerling.
                  </p>
                </div>
              </div>
            </div>
          }

          @if (activeSection() === 'export') {
            <div class="max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h1 class="text-3xl font-extrabold text-slate-900 mb-6">Exporteren & Magister</h1>
              <p class="text-slate-600 mb-8 text-lg">
                Voor leerlingcoördinatoren en mentoren biedt het systeem exportfunctionaliteiten om data over te brengen naar andere systemen (zoals Magister) of om offline te werken.
              </p>

              <div class="grid gap-6">
                <div class="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <h3 class="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <mat-icon class="text-slate-500">content_copy</mat-icon> Magister Export (Tekst)
                  </h3>
                  <p class="text-slate-600 mb-4 leading-relaxed">
                    Op de "Magister Export" pagina wordt op basis van alle ingevulde memo's automatisch een compacte tekst samengesteld. Deze tekst is geoptimaliseerd voor het notitieveld in Magister. Je kunt met één klik op de knop <strong class="text-slate-800">Kopieer voor Magister</strong> de tekst op je klembord plaatsen.
                  </p>
                </div>

                <div class="bg-emerald-50 rounded-xl p-6 border border-emerald-100">
                  <h3 class="text-xl font-bold text-emerald-900 mb-3 flex items-center gap-2">
                    <mat-icon class="text-emerald-600">table_view</mat-icon> Excel / CSV Export
                  </h3>
                  <p class="text-emerald-800 mb-4 leading-relaxed">
                    Als je liever op papier werkt of data wilt archiveren in Excel, zijn er twee opties beschikbaar in de export sectie:
                  </p>
                  <ul class="space-y-3">
                    <li class="flex items-start gap-3">
                      <mat-icon class="text-emerald-500 mt-0.5">article</mat-icon>
                      <div>
                        <strong class="text-emerald-900 block">Blanco Invullijst</strong>
                        <span class="text-emerald-700 text-sm">Download een leeg stramien voor de gekozen klas met alle namen. Ideaal om uit te printen en handmatig in te vullen tijdens een vergadering.</span>
                      </div>
                    </li>
                    <li class="flex items-start gap-3">
                      <mat-icon class="text-emerald-500 mt-0.5">download_done</mat-icon>
                      <div>
                        <strong class="text-emerald-900 block">Klasoverzicht Exporteren</strong>
                        <span class="text-emerald-700 text-sm">Exporteer een matrix van de klas waarin je direct kunt zien hoeveel memo's er per leerling zijn ingevuld en of er een voortgangsplan klaarligt.</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          }

          @if (activeSection() === 'beheer') {
            <div class="max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h1 class="text-3xl font-extrabold text-slate-900 mb-6">Beheer & Superuser</h1>
              <p class="text-slate-600 mb-8 text-lg">
                Voor applicatiebeheerders zijn er drie hoofdsecties om de stambestanden en toegangsrechten te configureren.
              </p>

              <div class="space-y-6">
                <div class="group border border-slate-200 hover:border-blue-300 rounded-xl p-5 bg-white shadow-sm transition-colors">
                  <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                    <mat-icon class="text-blue-500">group</mat-icon> Beheer Leerlingen
                  </h3>
                  <p class="text-slate-600 text-sm mb-4">
                    Importeer nieuwe leerlingen via de CSV/Excel template, bewerk namen en koppelingen, of verwijder een volledige leerlinglijst (bijvoorbeeld bij aanvang van een nieuw schooljaar) via de rode 'Wis Lijst' knop.
                  </p>
                </div>

                <div class="group border border-slate-200 hover:border-blue-300 rounded-xl p-5 bg-white shadow-sm transition-colors">
                  <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                    <mat-icon class="text-blue-500">school</mat-icon> Beheer Vakdocenten
                  </h3>
                  <p class="text-slate-600 text-sm mb-4">
                    Koppel docenten (met hun afkortingen) aan specifieke klassen en vakken. Ook hier kun je de lijst bulk-importeren of volledig wissen. Deze lijst is cruciaal; docenten zien alleen de klassen waaraan ze hier gekoppeld zijn.
                  </p>
                </div>

                <div class="group border border-slate-200 hover:border-purple-300 rounded-xl p-5 bg-white shadow-sm transition-colors">
                  <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2">
                    <mat-icon class="text-purple-500">admin_panel_settings</mat-icon> Superuser & Toegang
                  </h3>
                  <p class="text-slate-600 text-sm mb-4">
                    Hier genereer je nieuwe unieke toegangscodes voor het personeel. Een gegenereerde code kopieer je eenvoudig via het klembord icoontje en stuur je door naar de betreffende collega. Er is geen traditioneel wachtwoordbeheer nodig.
                  </p>
                </div>
              </div>
            </div>
          }
        </div>

      </div>
    </div>
  `
})
export class ManualComponent {
  activeSection = signal('intro');

  sections = [
    { id: 'intro', title: 'Introductie', icon: 'info' },
    { id: 'docent', title: 'Voor de Vakdocent', icon: 'edit' },
    { id: 'mentor', title: 'Voor de Mentor', icon: 'supervisor_account' },
    { id: 'export', title: 'Exporteren & Magister', icon: 'import_export' },
    { id: 'beheer', title: 'Beheer & Superuser', icon: 'admin_panel_settings' },
  ];
}
