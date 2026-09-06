import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DataService } from './data.service';
import { DocentTaak } from '../models/data.models';
import { DocumentReference } from 'firebase/firestore';

describe('DataService', () => {
  let service: DataService;
  let mockSetDoc: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    service = TestBed.inject(DataService);
    
    mockSetDoc = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(service, '_firestoreSetDoc').mockImplementation(mockSetDoc as any);
  });

  describe('updateDocentTaak', () => {
    it('werkt uitsluitend op het opgegeven document-ID met merge-semantiek', async () => {
      const updates: Partial<DocentTaak> = {
        docentAfkorting: 'vis',
        status: 'Ingevuld'
      };

      await service.updateDocentTaak('taak-123', updates);

      expect(mockSetDoc).toHaveBeenCalledTimes(1);

      const [targetDoc, payload, options] = mockSetDoc.mock.calls[0] as [DocumentReference, unknown, unknown];
      
      expect(targetDoc.path).toBe('docentTaken/taak-123');
      expect(payload).toEqual({
        docentAfkorting: 'vis',
        status: 'Ingevuld'
      });
      expect(options).toEqual({ merge: true });
    });

    it('vult of raadt zelf geen docentAfkorting, naam of e-mail in', async () => {
      await service.updateDocentTaak('taak-456', { status: 'Open' });

      const [, payload] = mockSetDoc.mock.calls[0];
      
      expect(payload).toEqual({
        status: 'Open'
      });
      // Controleer expliciet dat het geen andere velden injecteert
      expect(payload).not.toHaveProperty('docentAfkorting');
      expect(payload).not.toHaveProperty('docentNaam');
      expect(payload).not.toHaveProperty('docentEmail');
    });

    it('vangt Firestore-fouten op via handleFirestoreError (zonder de test stuk te laten crashen)', async () => {
      const errorWithCode = Object.assign(new Error('Missing or insufficient permissions'), {
        code: 'permission-denied',
      });
      mockSetDoc.mockRejectedValueOnce(errorWithCode);

      // handleFirestoreError gooit een leesbare foutmelding
      await expect(
        service.updateDocentTaak('taak-fail', { docentAfkorting: 'vis' }),
      ).rejects.toThrow(/rechten/i);
    });
  });
});
