import { describe, it, expect } from 'vitest';
import { doc } from 'firebase/firestore';
import { db } from './src/app/services/firebase';

describe('ref', () => {
  it('has path', () => {
    const ref = doc(db, 'docentTaken', '123');
    expect(ref.path).toBe('docentTaken/123');
  });
});
