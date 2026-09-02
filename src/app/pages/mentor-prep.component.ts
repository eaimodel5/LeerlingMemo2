import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DataService } from '../services/data.service';
import { AuthService } from '../services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mentor-prep',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, CommonModule],
  template: `
    <div class="flex flex-col h-full bg-slate-50 relative print:bg-white">
      <header class="h-16 bg-white border-b border-slate-200 px-8 flex flex-none items-center justify-between sticky top-0 z-10 print:hidden hidden sm:flex">
        <h2 class="text-lg font-semibold text-slate-700">Voorbereiding Rapportvergadering</h2>
        <div class="flex gap-2">
          <button type="button" (click)="printPage()" class="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 rounded-md border border-slate-300 transition-all flex items-center gap-1.5 shadow-sm">
            <mat-icon class="text-[16px] w-[16px] h-[16px]">print</mat-icon>
            <span class="hidden md:inline">Print</span>
          </button>
          <button type="button" (click)="submitDraft()" class="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md shadow-sm transition-colors ml-2 flex items-center gap-1.5">
             <mat-icon class="text-[16px] w-[16px] h-[16px]">save</mat-icon> <span class="hidden md:inline">Concept</span>
          </button>
          <button type="button" (click)="submitFinal()" class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors flex items-center gap-1.5">
             <mat-icon class="text-[16px] w-[16px] h-[16px]">check_circle</mat-icon> Definitief
          </button>
        </div>
      </header>

      <!-- Print View Header -->
      <div class="hidden print:block p-8 border-b-2 border-slate-800 mb-8">
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-3xl font-black text-slate-900 uppercase tracking-tighter">Emmauscollege Rotterdam</h1>
            <p class="text-lg font-bold text-slate-600">Voorbereiding Rapportvergadering - {{ form.value.periode }}</p>
            <p class="text-md font-bold text-slate-500">{{ selectedLeerling()?.leerling }} ({{ selectedLeerling()?.leerlingnummer }})</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold">{{ form.value.schooljaar }}</p>
            <p class="text-xs text-slate-500">{{ today | date:'dd-MM-yyyy' }}</p>
          </div>
        </div>
      </div>

      @if (showSuccess()) {
        <div class="m-8 mb-0 p-4 bg-emerald-50 text-emerald-800 rounded-lg flex items-center gap-3 border border-emerald-200 animate-in fade-in zoom-in duration-300 print:hidden">
          <mat-icon>check_circle</mat-icon>
          <span>Voorbereiding is succesvol opgeslagen!</span>
        </div>
      }

      <div class="flex-1 p-4 sm:p-8 print:p-0">
        <form [formGroup]="form" class="flex flex-col lg:flex-row gap-6 print:block">
          
          <div class="flex-1 flex flex-col gap-6">
            <section class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-slate-300 print:mb-6">
              <h3 class="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wide print:text-slate-800">Leerling Selectie</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-2">
                <div class="print:mb-4">
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Schooljaar</label>
                  <input type="text" formControlName="schooljaar" readonly class="w-full p-2 text-sm border border-slate-300 bg-slate-100 text-slate-500 rounded cursor-not-allowed outline-none print:bg-white">
                </div>
                <div class="print:mb-4">
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Periode *</label>
                  <select formControlName="periode" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                    <option value="TW1">TW1</option>
                    <option value="TW2">TW2</option>
                    <option value="TW3">TW3</option>
                  </select>
                </div>
                <div class="print:mb-4">
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Klas *</label>
                  <select formControlName="klas" (change)="onKlasChange()" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none">
                    <option value="">-- Kies --</option>
                    @for (k of availableKlassen(); track k) {
                      <option [value]="k">{{k}}</option>
                    }
                  </select>
                </div>
                <div class="print:mb-4">
                  <label class="block text-xs font-semibold text-slate-600 mb-1">Leerling *</label>
                  <select formControlName="leerlingnummer" class="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" [attr.disabled]="!form.value.klas ? true : null" [class.bg-slate-100]="!form.value.klas">
                    <option value="">-- Kies --</option>
                    @for (l of filteredLeerlingen(); track l.id) {
                      <option [value]="l.leerlingnummer">{{l.leerling}} ({{l.leerlingnummer}})</option>
                    }
                  </select>
                </div>
              </div>
            </section>

            <section class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 print:shadow-none print:border-slate-300 print:mb-6" [class.opacity-50]="!form.value.leerlingnummer" [class.pointer-events-none]="!form.value.leerlingnummer">
              <h3 class="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wide print:text-slate-800">Inhoud Voorbereiding</h3>
              
              <div class="print:mb-4">
                <label class="block text-xs font-bold text-slate-400 uppercase mb-2 print:text-slate-800">Overzicht resultaten</label>
                <textarea formControlName="overzichtResultaten" class="w-full h-20 p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y min-h-[4rem] print:h-auto print:border-0 print:p-0"></textarea>
              </div>
              <div class="print:mb-4">
                <label class="block text-xs font-bold text-slate-400 uppercase mb-2 print:text-slate-800">Belangrijkste signalen uit memo's</label>
                <textarea formControlName="belangrijksteSignalenUitMemos" class="w-full h-24 p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y min-h-[4rem] print:h-auto print:border-0 print:p-0"></textarea>
              </div>
              <div class="print:mb-4">
                <label class="block text-xs font-bold text-slate-400 uppercase mb-2 print:text-slate-800">Aandachtspunten persoonlijke achtergrond</label>
                <textarea formControlName="aandachtspuntenPersoonlijkeAchtergrond" class="w-full h-20 p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y min-h-[4rem] print:h-auto print:border-0 print:p-0"></textarea>
              </div>
              <div class="print:mb-4">
                <label class="block text-xs font-bold text-slate-400 uppercase mb-2 print:text-slate-800">Centrale bespreekvraag of -vragen</label>
                <textarea formControlName="centraleBespreekvragen" class="w-full h-20 p-3 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y min-h-[4rem] print:h-auto print:border-0 print:p-0"></textarea>
              </div>
              
              <div class="bg-slate-100 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between border border-slate-200 gap-4 mt-4 print:bg-white print:border-slate-300 print:mt-4">
               <div class="flex items-center gap-4 w-full justify-between">
                 <div class="flex items-center">
                   <span class="text-xs font-bold text-slate-500 uppercase mr-3 print:text-slate-800">Status:</span>
                   <select formControlName="status" class="px-3 py-1 bg-yellow-100/50 text-slate-800 text-xs font-bold rounded-full border-0 focus:ring-0 cursor-pointer uppercase print:appearance-none print:bg-transparent print:p-0">
                     <option value="Concept">Concept</option>
                     <option value="Definitief">Definitief</option>
                   </select>
                 </div>
                 
                 <div class="sm:hidden flex gap-2 print:hidden">
                   <button type="button" (click)="submitFinal()" class="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md shadow-sm transition-colors">Opslaan</button>
                 </div>
               </div>
              </div>
            </section>
          </div>

          <!-- Zijpaneel Info -->
          <div class="w-full lg:w-80 flex flex-col gap-6 print:hidden">
            @if(form.value.leerlingnummer) {
              <div class="bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-sm h-full flex flex-col">
                <h4 class="font-bold text-blue-900 mb-4 pb-2 border-b border-blue-200 flex items-center gap-2">
                  <mat-icon class="text-blue-600 text-[20px] w-[20px] h-[20px]">info</mat-icon>
                  Memo's ({{form.value.periode}})
                </h4>
                <div class="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  @for(m of loadedMemos(); track m.id) {
                    <div class="bg-white p-3 rounded-lg shadow-sm border border-blue-100 hover:border-blue-300 transition-colors">
                      <div class="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{{m.vak}} - {{m.docentNaam}}</div>
                      <p class="text-slate-700 text-sm line-clamp-4 leading-relaxed" title="{{m.waarZieJeDitAan}}">{{m.waarZieJeDitAan}}</p>
                    </div>
                  }
                  @if(loadedMemos().length === 0) {
                    <div class="text-center p-4">
                       <mat-icon class="text-slate-300 text-4xl mb-2">inbox</mat-icon>
                       <p class="text-sm text-slate-500 font-medium">Geen memo's beschikbaar voor deze periode.</p>
                    </div>
                  }
                </div>
              </div>
            } @else {
              <div class="bg-slate-100 border border-slate-200 rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center h-[200px] lg:h-[300px]">
                <div class="h-12 w-12 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm border border-slate-200">
                  <mat-icon class="text-slate-400">arrow_back</mat-icon>
                </div>
                <p class="text-sm text-slate-500 font-medium max-w-[200px]">Selecteer eerst een leerling om de memo's te bekijken.</p>
              </div>
            }
          </div>
        </form>
      </div>
    </div>
  `
})
export class MentorPrepComponent {
  private fb = inject(FormBuilder);
  private dataService = inject(DataService);
  private authService = inject(AuthService);

  showSuccess = signal(false);
  today = new Date();

  form = this.fb.group({
    schooljaar: ['2026-2027'],
    periode: ['TW1', Validators.required],
    klas: ['', Validators.required],
    leerlingnummer: ['', Validators.required],
    overzichtResultaten: [''],
    belangrijksteSignalenUitMemos: [''],
    aandachtspuntenPersoonlijkeAchtergrond: [''],
    centraleBespreekvragen: [''],
    status: ['Concept', Validators.required]
  });

  availableKlassen = computed(() => {
    const lln = this.dataService.leerlingen().filter(l => l.actief && l.schooljaar === '2026-2027');
    return [...new Set(lln.map(l => l.klas))].sort();
  });

  formValues = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  filteredLeerlingen = computed(() => {
    const klas = this.formValues().klas;
    if (!klas) return [];
    return this.dataService.leerlingen().filter(l => l.actief && l.schooljaar === '2026-2027' && l.klas === klas);
  });

  selectedLeerling = computed(() => {
    return this.dataService.leerlingen().find(l => l.leerlingnummer === this.formValues().leerlingnummer);
  });

  loadedMemos = computed(() => {
    const leerlingnummer = this.formValues().leerlingnummer;
    const periode = this.formValues().periode;
    if(!leerlingnummer) return [];

    if (periode === 'TW3') {
      return this.dataService.memoTW3().filter(m => m.leerlingnummer === leerlingnummer && m.schooljaar === '2026-2027');
    } else {
      return this.dataService.memoTW1TW2().filter(m => m.leerlingnummer === leerlingnummer && m.toetsweek === periode && m.schooljaar === '2026-2027');
    }
  });

  /** De al opgeslagen voorbereiding voor de gekozen leerling en periode, of null. */
  bestaandeVoorbereiding = computed(() => {
    const v = this.formValues();
    if (!v.leerlingnummer || !v.periode) return null;
    return this.dataService.mentorVoorbereiding().find(item =>
      item.leerlingnummer === v.leerlingnummer &&
      item.periode === v.periode &&
      item.schooljaar === (v.schooljaar || '2026-2027')
    ) ?? null;
  });

  /** Waarvoor het formulier het laatst is gevuld, zodat typen niet overschreven wordt. */
  private laatstGeladen: string | null = null;

  constructor() {
    // Laadt een eerder opgeslagen voorbereiding in zodra de mentor een leerling of
    // periode kiest. Leest bewust uit formValues() en niet uit form.value: dat laatste
    // is geen signal, waardoor dit effect nooit opnieuw zou draaien.
    effect(() => {
      const v = this.formValues();
      const existing = this.bestaandeVoorbereiding();
      if (!v.leerlingnummer || !v.periode) return;

      // Alleen (her)vullen als de selectie wijzigt of het record voor het eerst binnenkomt.
      // Zonder deze controle zou elke toetsaanslag het formulier terugzetten.
      const sleutel = `${v.leerlingnummer}|${v.periode}|${existing?.id ?? 'nieuw'}`;
      if (sleutel === this.laatstGeladen) return;
      this.laatstGeladen = sleutel;

      this.form.patchValue({
        overzichtResultaten: existing?.overzichtResultaten || '',
        belangrijksteSignalenUitMemos: existing?.belangrijksteSignalenUitMemos || '',
        aandachtspuntenPersoonlijkeAchtergrond: existing?.aandachtspuntenPersoonlijkeAchtergrond || '',
        centraleBespreekvragen: existing?.centraleBespreekvragen || '',
        status: existing?.status || 'Concept'
      }, { emitEvent: false });
    });

    this.form.get('leerlingnummer')?.valueChanges.subscribe(() => this.form.updateValueAndValidity());
    this.form.get('periode')?.valueChanges.subscribe(() => this.form.updateValueAndValidity());
  }

  onKlasChange() {
    this.form.patchValue({ leerlingnummer: '' });
  }

  printPage() {
    window.print();
  }

  submitDraft() {
    this.form.patchValue({ status: 'Concept' });
    this.onSubmit();
  }

  submitFinal() {
    this.form.patchValue({ status: 'Definitief' });
    this.onSubmit();
  }

  private onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    const leerling = this.filteredLeerlingen().find(l => l.leerlingnummer === val.leerlingnummer);
    if (!leerling) return;

    this.dataService.saveMentorVoorbereiding({
      schooljaar: val.schooljaar!,
      periode: val.periode! as any,
      leerlingnummer: leerling.leerlingnummer,
      leerling: leerling.leerling,
      klas: leerling.klas,
      mentorNaam: leerling.mentorNaam,
      mentorEmail: leerling.mentorEmail,
      overzichtResultaten: val.overzichtResultaten || '',
      belangrijksteSignalenUitMemos: val.belangrijksteSignalenUitMemos || '',
      aandachtspuntenPersoonlijkeAchtergrond: val.aandachtspuntenPersoonlijkeAchtergrond || '',
      centraleBespreekvragen: val.centraleBespreekvragen || '',
      status: val.status as any,
      aangemaaktDoor: this.authService.currentUser()?.email || 'mentor@school.nl',
      aangemaaktOp: new Date().toISOString(),
      gewijzigdOp: new Date().toISOString()
    });

    this.showSuccess.set(true);
    setTimeout(() => this.showSuccess.set(false), 3000);
  }
}
