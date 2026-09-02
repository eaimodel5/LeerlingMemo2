import { Injectable, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { UserRole, AccessCode } from '../models/data.models';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig as any) : getApp();
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
  vak?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  
  currentUser = signal<AuthUser | null>(null);

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('leerlingmemo_auth');
      if (saved) {
        this.currentUser.set(JSON.parse(saved));
      }
    }
  }

  // Let op: hier stond een inlog met een vaste gebruikersnaam en wachtwoord.
  // Die waarden kwamen als platte tekst in de JavaScript-bundel terecht en waren
  // dus voor iedere bezoeker zichtbaar. De beheerder logt nu in met een
  // toegangscode met de rol 'Superuser'; zie BEVEILIGING.md voor het aanmaken
  // daarvan. Beschouw het oude wachtwoord als gelekt en gebruik het nergens meer.

  async loginWithCode(code: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, 'codes'),
        where('code', '==', code),
        where('used', '==', false),
        limit(1)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data() as AccessCode;
        
        // Mark code as used (optional, user might want to keep it valid for a session)
        // For now, let's just log them in. 
        // If the user wants reusable codes, we don't update 'used'.
        // But the prompt implies "uitdelen", maybe single use?
        // Let's keep it simple: if code exists, log in.
        
        const user: AuthUser = {
          name: data.ownerName,
          email: data.ownerEmail,
          role: data.role,
          vak: data.vak
        };
        this.setUser(user);
        return true;
      }
    } catch (error) {
      console.error('Login with code failed', error);
    }
    return false;
  }

  logout() {
    this.currentUser.set(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('leerlingmemo_auth');
    }
    this.router.navigate(['/login']);
  }

  private setUser(user: AuthUser) {
    this.currentUser.set(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('leerlingmemo_auth', JSON.stringify(user));
    }
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  hasRole(role: UserRole): boolean {
    return this.currentUser()?.role === role;
  }
}
