import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccessCode, UserRole } from '../models/data.models';
import { MatIconModule } from '@angular/material/icon';
import { parseCsv, downloadCsv, headersMatch } from '../utils/csv';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig as any) : getApp();
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

@Component({
  selector: 'app-superuser',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="flex flex-col h-full bg-slate-50">
      <header class="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h2 class="text-xl font-bold text-slate-800">Superuser Omgeving</h2>
          <p class="text-xs text-slate-500">Toegangscodes genereren en beheren</p>
        </div>
        <div class="flex items-center gap-2">
           <button (click)="downloadTemplate()" class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white text-slate-700 border border-slate-300 rounded-md font-medium shadow-sm hover:bg-slate-50 transition-all">
             <mat-icon class="text-[16px] w-[16px] h-[16px]">download</mat-icon> Template
           </button>
           <input type="file" accept=".csv" #csvInput class="hidden" (change)="onFileSelected($event)">
           <button (click)="csvInput.click()" class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white text-slate-600 border border-slate-300 rounded-md font-medium shadow-sm hover:bg-slate-50 transition-all">
             <mat-icon class="text-[16px] w-[16px] h-[16px]">upload_file</mat-icon> Importeer
           </button>
           <button (click)="showCreate.set(true)" class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#e87700] text-white rounded-md font-medium shadow-sm hover:shadow-md transition-all active:scale-95">
             <mat-icon class="text-[16px] w-[16px] h-[16px]">add</mat-icon> Code maken
           </button>
        </div>
      </header>

      <div class="flex-1 p-8 overflow-y-auto">
        <div class="max-w-6xl mx-auto space-y-8">
          
          <!-- Quick stats -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Actieve Codes</div>
              <div class="text-3xl font-black text-[#1b2a47]">{{ codes().length }}</div>
            </div>
             <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Vakdocenten</div>
              <div class="text-3xl font-black text-blue-600">{{ filterByRole('Docent').length }}</div>
            </div>
             <div class="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Mentoren / Coörd.</div>
              <div class="text-3xl font-black text-emerald-600">{{ filterByRole('Mentor').length + filterByRole('Coordinator').length }}</div>
            </div>
          </div>

          <!-- Codes Table -->
          <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 class="font-bold text-slate-700">Gegenereerde Codes</h3>
              <div class="flex items-center gap-4">
                 <input 
                  [ngModel]="searchQuery()"
                  (ngModelChange)="searchQuery.set($event)"
                  placeholder="Zoeken op naam..." 
                  class="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e87700]/20">
              </div>
            </div>
            
            <div class="overflow-x-auto">
              <table class="w-full text-sm text-left">
                <thead class="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th class="px-6 py-4">Code</th>
                    <th class="px-6 py-4">Naam / Email</th>
                    <th class="px-6 py-4">Rol</th>
                    <th class="px-6 py-4">Vak</th>
                    <th class="px-6 py-4">Gemaakt op</th>
                    <th class="px-6 py-4 text-right">Acties</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (code of filteredCodes(); track code.id) {
                    <tr class="hover:bg-slate-50 transition-colors">
                      <td class="px-6 py-4">
                        <div class="flex items-center gap-2">
                          <span class="font-mono font-bold text-[#e87700] text-base">{{ code.code }}</span>
                          <button (click)="copyCode(code.code)" class="text-slate-400 hover:text-[#e87700] transition-colors" title="Kopiëren">
                            <mat-icon class="text-[16px] w-[16px] h-[16px]">content_copy</mat-icon>
                          </button>
                        </div>
                      </td>
                      <td class="px-6 py-4">
                        <div class="font-bold text-slate-800">{{ code.ownerName }}</div>
                        <div class="text-xs text-slate-500">{{ code.ownerEmail }}</div>
                      </td>
                      <td class="px-6 py-4">
                        <span [class]="getRoleClass(code.role)" class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide">
                          {{ code.role }}
                        </span>
                      </td>
                      <td class="px-6 py-4 text-slate-600 italic">{{ code.vak || '-' }}</td>
                      <td class="px-6 py-4 text-slate-400 text-xs">{{ code.createdAt | date:'dd-MM HH:mm' }}</td>
                      <td class="px-6 py-4 text-right">
                        <button (click)="deleteCode(code.id!)" class="text-red-400 hover:text-red-600 transition-colors">
                          <mat-icon class="text-[18px] w-[18px] h-[18px]">delete</mat-icon>
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="px-6 py-20 text-center text-slate-400 italic">Geen codes gevonden.</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Modal -->
      @if (showCreate()) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div class="p-8">
              <h3 class="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <mat-icon class="text-[#e87700]">add_circle</mat-icon>
                Nieuwe code maken
              </h3>

              <div class="space-y-4">
                <div>
                  <label for="role-select" class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rol</label>
                  <select id="role-select" [(ngModel)]="newCodeRole" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e87700]/20">
                    <option value="Docent">Vakdocent</option>
                    <option value="Mentor">Mentor</option>
                    <option value="Coordinator">Leerlingcoördinator</option>
                  </select>
                </div>

                <div>
                  <label for="name-input" class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Naam</label>
                  <input id="name-input" [(ngModel)]="newCodeName" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e87700]/20" placeholder="Bijv. Jan de Vries">
                </div>

                <div>
                  <label for="email-input" class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email</label>
                  <input id="email-input" [(ngModel)]="newCodeEmail" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e87700]/20" placeholder="E-mailadres">
                </div>

                @if (newCodeRole === 'Docent') {
                  <div>
                    <label for="vak-input" class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vak</label>
                    <input id="vak-input" [(ngModel)]="newCodeVak" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e87700]/20" placeholder="Bijv. Wiskunde">
                  </div>
                }

                <div class="pt-4 flex gap-3">
                  <button (click)="showCreate.set(false)" class="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors">Annuleren</button>
                  <button 
                    (click)="createCode()" 
                    [disabled]="!isValid()"
                    class="flex-2 py-3 bg-[#e87700] text-white rounded-xl font-bold shadow-lg shadow-[#e87700]/20 hover:bg-[#ff8a00] transition-all disabled:opacity-50">
                    Genereren
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- CSV Preview Modal -->
      @if (csvPreviewData()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div class="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 class="text-xl font-bold text-slate-900">Importeer Codes (CSV)</h3>
                <p class="text-sm text-slate-600 mt-1">Controleer de in te lezen medewerkers voordat je deze opslaat.</p>
              </div>
              <button (click)="cancelImport()" class="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 rounded-full transition-colors">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            
            <div class="flex-1 overflow-auto p-0">
              <table class="w-full text-left text-sm whitespace-nowrap">
                <thead class="bg-slate-100 text-slate-600 font-bold sticky top-0">
                  <tr>
                    <th class="px-4 py-3 border-b border-slate-200">Email</th>
                    <th class="px-4 py-3 border-b border-slate-200">Naam</th>
                    <th class="px-4 py-3 border-b border-slate-200">Rol</th>
                    <th class="px-4 py-3 border-b border-slate-200">Vak</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (row of csvPreviewData(); track row.ownerEmail) {
                    <tr class="hover:bg-slate-50">
                      <td class="px-4 py-3 text-slate-600">{{ row.ownerEmail }}</td>
                      <td class="px-4 py-3 font-medium text-slate-900">{{ row.ownerName }}</td>
                      <td class="px-4 py-3 text-blue-600 font-medium">{{ row.role }}</td>
                      <td class="px-4 py-3 text-slate-500">{{ row.vak || '-' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <div class="text-sm font-medium text-slate-600">
                Totaal te genereren: <span class="font-bold text-slate-900">{{ csvPreviewData()?.length }} codes</span>
              </div>
              <div class="flex gap-3">
                <button (click)="cancelImport()" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-300 rounded-md transition-colors">Annuleren</button>
                <button (click)="confirmImport()" class="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors flex items-center gap-2">
                  <mat-icon class="text-[18px]">save</mat-icon>
                  Bevestig & Genereer
                </button>
              </div>
            </div>
          </div>
        </div>
      }

    </div>
  `
})
export class SuperuserComponent {
  codes = signal<AccessCode[]>([]);
  searchQuery = signal('');
  showCreate = signal(false);
  csvPreviewData = signal<any[] | null>(null);

  newCodeRole: UserRole = 'Docent';
  newCodeName = '';
  newCodeEmail = '';
  newCodeVak = '';

  downloadTemplate() {
    downloadCsv('Template_AccessCodes.csv', [
      ['Email', 'Naam', 'Rol', 'Vak'],
      ['j.devries@school.nl', 'Jan de Vries', 'Docent', 'Wiskunde'],
      ['m.pietersen@school.nl', 'Marieke Pietersen', 'Mentor', ''],
      ['p.jansen@school.nl', 'Peter Jansen', 'Coordinator', '']
    ]);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length < 1) return;

      const expectedHeaders = ['Email', 'Naam', 'Rol', 'Vak'];

      if (!headersMatch(rows[0], expectedHeaders)) {
        alert('Fout: De kolomnamen komen niet overeen met het sjabloon (verwacht: Email, Naam, Rol, Vak). Pas de titels niet aan.');
        event.target.value = '';
        return;
      }

      const rowsToImport = [];
      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i];
        if (columns.length < 3) continue;

        const email = columns[0];
        const naam = columns[1];
        const rol = columns[2] as UserRole;
        const vak = columns[3] || '';

        if (!email || !naam || !['Docent', 'Mentor', 'Coordinator'].includes(rol)) {
            continue;
        }

        rowsToImport.push({
          ownerEmail: email,
          ownerName: naam,
          role: rol,
          vak: vak
        });
      }

      if (rowsToImport.length > 0) {
        this.csvPreviewData.set(rowsToImport);
      } else {
        alert('Geen geldige rijen gevonden in de CSV.');
      }
      
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  cancelImport() {
    this.csvPreviewData.set(null);
  }

  async confirmImport() {
    const data = this.csvPreviewData();
    if (!data) return;
    
    let successCount = 0;

    for (const row of data) {
      const code = this.generateCode();
      const newCode: any = {
        code,
        role: row.role,
        ownerName: row.ownerName,
        ownerEmail: row.ownerEmail,
        createdAt: new Date().toISOString(),
        used: false
      };

      if (row.role === 'Docent') {
        newCode.vak = row.vak;
      }

      try {
        await addDoc(collection(db, 'codes'), newCode);
        successCount++;
      } catch (e) {
        console.error('Failed to create code for row', row, e);
      }
    }

    alert(`${successCount} toegangscodes succesvol gegenereerd.`);
    this.csvPreviewData.set(null);
  }

  filteredCodes = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.codes()
      .filter(c => c.ownerName.toLowerCase().includes(q) || c.ownerEmail.toLowerCase().includes(q) || (c.vak && c.vak.toLowerCase().includes(q)))
      .sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  });

  constructor() {
    onSnapshot(query(collection(db, 'codes'), orderBy('createdAt', 'desc')), (snapshot) => {
      this.codes.set(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AccessCode)));
    });
  }

  copyCode(code: string) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        alert('Code gekopieerd!');
      });
    } else {
      alert('Kopiëren niet ondersteund in deze browser.');
    }
  }

  isValid() {
    return this.newCodeName && this.newCodeEmail && (this.newCodeRole !== 'Docent' || this.newCodeVak);
  }

  filterByRole(role: UserRole) {
    return this.codes().filter(c => c.role === role);
  }

  getRoleClass(role: UserRole) {
    switch(role) {
      case 'Superuser': return 'bg-purple-100 text-purple-700';
      case 'Docent': return 'bg-blue-100 text-blue-700';
      case 'Mentor': return 'bg-emerald-100 text-emerald-700';
      case 'Coordinator': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  }

  async createCode() {
    if (!this.isValid()) return;

    const code = this.generateCode();
    const newCode: any = {
      code,
      role: this.newCodeRole,
      ownerName: this.newCodeName,
      ownerEmail: this.newCodeEmail,
      createdAt: new Date().toISOString(),
      used: false
    };

    if (this.newCodeRole === 'Docent') {
      newCode.vak = this.newCodeVak;
    }

    try {
      await addDoc(collection(db, 'codes'), newCode);
      this.showCreate.set(false);
      this.resetForm();
      alert('Code is gegenereerd!');
    } catch (e: any) {
      console.error('Failed to create code', e);
      alert('Error: ' + (e.message || String(e)));
    }
  }

  async deleteCode(id: string) {
    if (confirm('Weet u zeker dat u deze code wilt verwijderen?')) {
      await deleteDoc(doc(db, 'codes', id));
    }
  }

  private generateCode(): string {
    // Generate code in format XXXX-XXXX
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars
    const part = () => Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${part()}-${part()}`;
  }

  private resetForm() {
    this.newCodeName = '';
    this.newCodeEmail = '';
    this.newCodeVak = '';
    this.newCodeRole = 'Docent';
  }
}
