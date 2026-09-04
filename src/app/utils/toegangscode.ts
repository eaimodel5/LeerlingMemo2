import { AccessCode, UserRole } from '../models/data.models';

/**
 * Wanneer een toegangscode geldig is, en wanneer je hem mag intrekken.
 *
 * Een code was tot nu toe onbeperkt geldig. Er stond wel een veld `used` in het
 * model, maar niets zette het ooit op `true` — een code die bij de verkeerde
 * persoon terechtkwam kon alleen worden weggegooid, en dan was ook niet meer te
 * zien dat hij ooit bestaan had. Intrekken hoort een omkeerbare handeling te
 * zijn met een spoor.
 */

/** Wat de app op nieuwe codes zet. Losse constante zodat de betekenis benoemd is. */
export const NIEUWE_CODE_ACTIEF = true;

/**
 * Is deze code nog te gebruiken?
 *
 * `active !== false` en niet `active === true`: codes van vóór deze wijziging
 * hebben het veld helemaal niet, en die horen gewoon te blijven werken. Anders
 * zou publiceren van de nieuwe regels iedereen in één klap buitensluiten.
 *
 * `used === true` telt ook als ingetrokken. Dat veld is nooit gezet, maar als
 * er ergens in de database toch zo'n document staat, is buitensluiten de
 * veilige uitkomst.
 */
export function isActieveCode(code: Pick<AccessCode, 'active' | 'used'> | null | undefined): boolean {
  if (!code) return false;
  return code.active !== false && code.used !== true;
}

/** Alle codes die nog gebruikt kunnen worden. */
export function actieveCodes<T extends Pick<AccessCode, 'active' | 'used'>>(codes: T[]): T[] {
  return codes.filter(isActieveCode);
}

/** Actieve codes met deze rol. */
export function actieveCodesMetRol<T extends Pick<AccessCode, 'active' | 'used' | 'role'>>(
  codes: T[],
  rol: UserRole,
): T[] {
  return actieveCodes(codes).filter(code => code.role === rol);
}

export type IntrekBezwaar = 'al-ingetrokken' | 'laatste-beheerder';

const BEZWAAR_TEKST: Record<IntrekBezwaar, string> = {
  'al-ingetrokken': 'Deze code is al ingetrokken.',
  'laatste-beheerder':
    'Dit is de laatste actieve beheerderscode. Maak eerst een tweede beheerderscode aan, anders kan niemand meer bij het beheer.',
};

/**
 * Waarom deze code niet ingetrokken kan worden, of `null` als het gewoon mag.
 *
 * De enige echte blokkade is de laatste beheerderscode. Trek je die in, dan kan
 * niemand meer toegangscodes aanmaken — en omdat het aanmaken van codes zelf
 * alleen aan een beheerder is voorbehouden, kom je daar niet meer uit zonder
 * met de hand in de Firebase-console te werken.
 */
export function bezwaarTegenIntrekken(
  code: Pick<AccessCode, 'id' | 'active' | 'used' | 'role'>,
  alleCodes: Pick<AccessCode, 'id' | 'active' | 'used' | 'role'>[],
): IntrekBezwaar | null {
  if (!isActieveCode(code)) return 'al-ingetrokken';
  if (code.role !== 'Superuser') return null;

  const andereActieveBeheerders = actieveCodesMetRol(alleCodes, 'Superuser').filter(
    andere => andere.id !== code.id,
  );
  return andereActieveBeheerders.length > 0 ? null : 'laatste-beheerder';
}

export function magIntrekken(
  code: Pick<AccessCode, 'id' | 'active' | 'used' | 'role'>,
  alleCodes: Pick<AccessCode, 'id' | 'active' | 'used' | 'role'>[],
): boolean {
  return bezwaarTegenIntrekken(code, alleCodes) === null;
}

/** De uitleg die de beheerder te zien krijgt als intrekken niet kan. */
export function uitlegBijBezwaar(bezwaar: IntrekBezwaar): string {
  return BEZWAAR_TEKST[bezwaar];
}

/** Kan deze code weer aangezet worden? */
export function magActiveren(code: Pick<AccessCode, 'active' | 'used'>): boolean {
  return !isActieveCode(code);
}
