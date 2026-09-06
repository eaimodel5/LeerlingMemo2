import { describe, it, expect, vi } from 'vitest';
import * as firestore from 'firebase/firestore';

describe('spy', () => {
  it('works', () => {
    const spy = vi.spyOn(firestore, 'setDoc').mockResolvedValue(undefined);
    expect(spy).toBeDefined();
  });
});
