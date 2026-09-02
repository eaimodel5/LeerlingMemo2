import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../services/data.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-magister-export',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  template: `
    <div class="flex flex-col h-full bg-slate-50 relative">
      <header class="h-16 bg-white border-b border-slate-200 px-8 flex flex-none items-center justify-between sticky top-0 z-10 hidden sm:flex">
        <h2 class="text-lg font-semibold text-slate-700">Magister-export</h2>
      </header>

      <div class="flex-1 p-4 sm:p-8 space-y-6">
        <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Schooljaar</label>
            <select [ngModel]="schooljaar()" (ngModelChange)="schooljaar.set($event)" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="2026-2027">2026-2027</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Periode</label>
            <select [ngModel]="periode()" (ngModelChange)="periode.set($event)" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="TW1">TW1</option>
              <option value="TW2">TW2</option>
              <option value="TW3">TW3</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Klas</label>
            <select [ngModel]="klas()" (ngModelChange)="klas.set($event); onKlasChange()" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="">-- Kies --</option>
              @for (k of availableKlassen(); track k) {
                <option [value]="k">{{k}}</option>
              }
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Leerling</label>
            <select [ngModel]="leerlingnummer()" (ngModelChange)="leerlingnummer.set($event)" [disabled]="!klas()" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" [class.bg-slate-100]="!klas()">
              <option value="">-- Kies --</option>
              @for (l of filteredLeerlingen(); track l.id) {
                <option [value]="l.leerlingnummer">{{l.leerling}} ({{l.leerlingnummer}})</option>
              }
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Type export</label>
            <select [ngModel]="typeExport()" (ngModelChange)="typeExport.set($event)" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
              <option value="memos">Memo-overzicht</option>
              <option value="prep">Voorbereiding rapportvergadering</option>
              <option value="plan">Voortgangsplan</option>
              <option value="full">Volledig overzicht</option>
            </select>
          </div>
          
          @if (klas()) {
            <div class="col-span-1 sm:col-span-2 md:col-span-5 flex flex-wrap justify-end gap-2 mt-2">
               <button (click)="exportBlancoCSV()" class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors">
                  <mat-icon class="text-[16px] w-[16px] h-[16px]">article</mat-icon>
                  Download blanco invullijst
               </button>
               <button (click)="exportClassToCSV()" class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-md shadow-sm transition-colors">
                  <mat-icon class="text-[16px] w-[16px] h-[16px]">table_view</mat-icon>
                  Exporteer klasoverzicht naar Excel (CSV)
               </button>
            </div>
          }
        </div>

        @if (selectedLeerling() && leerlingnummer()) {
          <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between text-blue-900 shadow-sm flex-wrap gap-4">
            <div>
              <h3 class="text-lg font-bold">{{selectedLeerling()?.leerling}} ({{selectedLeerling()?.leerlingnummer}})</h3>
              <p class="text-sm text-blue-700/80">Klas: {{selectedLeerling()?.klas}} | Mentor: {{selectedLeerling()?.mentorNaam}}</p>
            </div>
            <div class="flex gap-3 items-center">
              <div class="px-3 py-1 bg-white rounded-full text-sm font-semibold border border-blue-200 shadow-sm hidden sm:block">
                {{periode()}}
              </div>
              <button (click)="copyText()" class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors">
                <mat-icon class="text-[16px] w-[16px] h-[16px]">content_copy</mat-icon>
                Kopieer voor Magister
              </button>
            </div>
          </div>
          
          @if (copied()) {
            <div class="p-4 bg-emerald-50 text-emerald-800 rounded-lg flex items-center gap-3 border border-emerald-200 animate-in fade-in zoom-in duration-200 shadow-sm">
              <mat-icon class="text-emerald-500">check_circle</mat-icon>
              <span class="font-medium text-sm">Tekst gekopieerd naar klembord!</span>
            </div>
          }

          <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
             <div class="bg-slate-50 border-b border-slate-200 px-4 py-3">
                 <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wide">Gegenereerde Tekst</h3>
             </div>
             
             @if (!generatedText()) {
               <div class="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
                 <mat-icon class="text-4xl text-slate-300 mb-4 opacity-50">description</mat-icon>
                 <p class="text-sm font-medium">Geen data gevonden om een export tekst te genereren.</p>
               </div>
             } @else {
               <textarea readonly [value]="generatedText()" class="w-full flex-1 p-6 font-mono text-xs bg-transparent text-slate-700 resize-none focus:outline-none focus:ring-inset focus:ring-blue-500 transition-shadow custom-scrollbar leading-relaxed"></textarea>
             }
          </div>
        }
      </div>
    </div>
  `
})
export class MagisterExportComponent {
  private dataService = inject(DataService);

  schooljaar = signal('2026-2027');
  periode = signal('TW1');
  klas = signal('');
  leerlingnummer = signal('');
  typeExport = signal('memos');
  copied = signal(false);

  availableKlassen = computed(() => {
    const lln = this.dataService.leerlingen().filter(l => l.actief && l.schooljaar === '2026-2027');
    return [...new Set(lln.map(l => l.klas))].sort();
  });

  filteredLeerlingen = computed(() => {
    if (!this.klas()) return [];
    return this.dataService.leerlingen().filter(l => l.actief && l.schooljaar === '2026-2027' && l.klas === this.klas());
  });

  selectedLeerling = computed(() => {
    return this.dataService.leerlingen().find(l => l.leerlingnummer === this.leerlingnummer());
  });

  onKlasChange() {
    this.leerlingnummer.set('');
  }

  generatedText = computed(() => {
    const ll = this.selectedLeerling();
    if (!ll) return '';

    let text = '';
    const isTW3 = this.periode() === 'TW3';

    if (this.typeExport() === 'memos' || this.typeExport() === 'full') {
      text += 'Leerling: ' + ll.leerling + '\\nKlas: ' + ll.klas + '\\nPeriode: ' + this.periode() + '\\n\\nMemo’s vakdocenten\\n=================\\n';
      
      let memos: any[] = [];
      if (isTW3) {
        memos = this.dataService.memoTW3().filter(m => m.leerlingnummer === this.leerlingnummer() && m.schooljaar === this.schooljaar());
      } else {
        memos = this.dataService.memoTW1TW2().filter(m => m.leerlingnummer === this.leerlingnummer() && m.toetsweek === this.periode() && m.schooljaar === this.schooljaar());
      }

      if (memos.length === 0) text += "Geen memo's gevonden voor deze periode.\\n";

      memos.forEach(m => {
        const aandachtspunten = [];
        if(m.aandachtInhoudelijkBegrip) aandachtspunten.push('Inhoudelijk begrip');
        if(m.aandachtPlanningOrganisatie) aandachtspunten.push('Planning / organisatie');
        if(m.aandachtToetsvoorbereidingLeerstrategie) aandachtspunten.push('Toetsvoorbereiding / leerstrategie');
        if(m.aandachtInzetWerkhouding) aandachtspunten.push('Inzet / werkhouding');
        if(m.aandachtWerkNietOpOrde) aandachtspunten.push('Werk niet op orde');
        if(m.aandachtAanwezigheidVerzuim) aandachtspunten.push('Aanwezigheid / verzuim');

        text += '\\n[' + m.vak + '] - ' + m.docentNaam + '\\n';
        text += 'Aandachtspunt(en): ' + (aandachtspunten.join(', ') || 'Geen') + '\\n';
        text += 'Waar zie je dit concreet aan:\\n' + m.waarZieJeDitAan + '\\n';
        
        if (m.watWerktWel) {
          text += 'Wat werkt wél:\\n' + m.watWerktWel + '\\n';
        }

        if (isTW3) {
          text += 'Doorstroomtoelichting:\\n' + m.doorstroomToelichting + '\\n';
        } else {
          text += 'Actie leerling:\\n' + m.leerlingActie + '\\n';
          text += 'EMC: ' + (m.emc || 'Nee') + '\\n';
          text += 'Actie docent:\\n' + m.docentActie + '\\n';
        }
      });
      text += '\\n';
    }

    if (this.typeExport() === 'prep' || this.typeExport() === 'full') {
      const prep = this.dataService.mentorVoorbereiding().find(p => p.leerlingnummer === this.leerlingnummer() && p.periode === this.periode() && p.schooljaar === this.schooljaar());
      if (this.typeExport() === 'full') text += '\\n--- VOORBEREIDING RAPPORTVERGADERING ---\\n\\n';
      else text += 'Leerling: ' + ll.leerling + '\\nKlas: ' + ll.klas + '\\nPeriode: ' + this.periode() + '\\n\\n';

      if (prep) {
        text += 'Overzicht resultaten:\\n' + (prep.overzichtResultaten || '-') + '\\n\\n';
        text += 'Belangrijkste signalen uit memo’s:\\n' + (prep.belangrijksteSignalenUitMemos || '-') + '\\n\\n';
        text += 'Aandachtspunten persoonlijke achtergrond:\\n' + (prep.aandachtspuntenPersoonlijkeAchtergrond || '-') + '\\n\\n';
        text += 'Centrale bespreekvraag of -vragen:\\n' + (prep.centraleBespreekvragen || '-') + '\\n';
      } else {
        text += "Geen voorbereiding gevonden.\\n";
      }
      text += '\\n';
    }

    if (this.typeExport() === 'plan' || this.typeExport() === 'full') {
      const plan = this.dataService.voortgangsplan().find(p => p.leerlingnummer === this.leerlingnummer() && p.periode === this.periode() && p.schooljaar === this.schooljaar());
      if (this.typeExport() === 'full') text += '\\n--- VOORTGANGSPLAN ---\\n\\n';
      else text += 'Leerling: ' + ll.leerling + '\\nKlas: ' + ll.klas + '\\nPeriode: ' + this.periode() + '\\n\\n';

      if (plan) {
        text += 'Gezamenlijke conclusie:\\n' + (plan.gezamenlijkeConclusie || '-') + '\\n\\n';
        text += 'Afspraken voor de leerling:\\n1. ' + (plan.afspraakLeerling1||'-') + '\\n2. ' + (plan.afspraakLeerling2||'-') + '\\n3. ' + (plan.afspraakLeerling3||'-') + '\\n\\n';
        text += 'Afspraken voor docenten:\\n1. ' + (plan.afspraakDocenten1||'-') + '\\n2. ' + (plan.afspraakDocenten2||'-') + '\\n3. ' + (plan.afspraakDocenten3||'-') + '\\n\\n';
        text += 'Evaluatie/controlemoment:\\nWanneer: ' + (plan.evaluatieWanneer||'-') + '\\nDoor wie: ' + (plan.evaluatieDoorWie||'-') + '\\n\\n';
        text += 'Terugkoppeling aan ouders:\\n' + (plan.terugkoppelingOuders || '-') + '\\n';
      } else {
        text += "Geen voortgangsplan gevonden.\\n";
      }
    }

    return text.trim();
  });

  async copyText() {
    try {
      await navigator.clipboard.writeText(this.generatedText());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  }

  exportBlancoCSV() {
    const leerlingen = this.filteredLeerlingen();
    if (leerlingen.length === 0) {
      alert('Geen leerlingen gevonden in deze klas.');
      return;
    }

    const headers = ['Leerlingnummer', 'Naam', 'Klas', 'Vak', 'Aandachtspunten', 'Waar zie je dit aan?', 'Wat werkt wel?', 'Actie Leerling (TW1/TW2) / Doorstroom (TW3)', 'Actie Docent'];
    let csvContent = headers.join(';') + '\\n';

    leerlingen.forEach(l => {
      const row = [
        l.leerlingnummer,
        `"${l.leerling}"`,
        l.klas,
        '', // Vak
        '', // Aandachtspunten
        '', // Waar zie je dit aan
        '', // Wat werkt wel
        '', // Actie leerling
        ''  // Actie docent
      ];
      csvContent += row.join(';') + '\\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Blanco_Invullijst_${this.klas()}_${this.periode()}.csv`;
    link.click();
  }

  exportClassToCSV() {
    const leerlingen = this.filteredLeerlingen();
    if (leerlingen.length === 0) {
      alert('Geen leerlingen gevonden in deze klas.');
      return;
    }

    const headers = ['Leerlingnummer', 'Naam', 'Klas', 'Mentor', 'Periode', 'Ingevulde Memos', 'Voorbereiding Mentor', 'Voortgangsplan'];
    let csvContent = headers.join(';') + '\\n';
    
    const isTW3 = this.periode() === 'TW3';

    leerlingen.forEach(l => {
      let memosCount = 0;
      if (isTW3) {
        memosCount = this.dataService.memoTW3().filter(m => m.leerlingnummer === l.leerlingnummer && m.schooljaar === this.schooljaar()).length;
      } else {
        memosCount = this.dataService.memoTW1TW2().filter(m => m.leerlingnummer === l.leerlingnummer && m.toetsweek === this.periode() && m.schooljaar === this.schooljaar()).length;
      }

      const prep = this.dataService.mentorVoorbereiding().find(p => p.leerlingnummer === l.leerlingnummer && p.periode === this.periode() && p.schooljaar === this.schooljaar());
      const plan = this.dataService.voortgangsplan().find(p => p.leerlingnummer === l.leerlingnummer && p.periode === this.periode() && p.schooljaar === this.schooljaar());

      const row = [
        l.leerlingnummer,
        `"${l.leerling}"`,
        l.klas,
        `"${l.mentorNaam}"`,
        this.periode(),
        memosCount.toString(),
        prep ? 'Ja' : 'Nee',
        plan ? 'Ja' : 'Nee'
      ];
      csvContent += row.join(';') + '\\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Overzicht_${this.klas()}_${this.periode()}.csv`;
    link.click();
  }
}
