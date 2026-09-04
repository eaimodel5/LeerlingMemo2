import { defineConfig } from 'vitest/config';

/**
 * Aparte opzet voor de tests op de beveiligingsregels.
 *
 * Die draaien in Node tegen de Firestore-emulator, niet in de browseromgeving
 * die `ng test` opzet. Ze staan daarom buiten `src/`: anders zou `ng test` ze
 * meecompileren en meteen struikelen over `node:fs`.
 *
 * Eén bestand tegelijk en ruime tijdslimieten: de emulator start langzaam, en
 * de tests delen dezelfde database die tussen de gevallen wordt leeggemaakt.
 */
export default defineConfig({
  test: {
    include: ['test/rules/**/*.spec.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
