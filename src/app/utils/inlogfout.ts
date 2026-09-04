/**
 * Waarom een inlogpoging niet lukte.
 *
 * De inlogpagina liet tot nu toe altijd "Ongeldige of verlopen toegangscode"
 * zien — ook als de code prima was en alleen de aanmelding of de database
 * dwarslag. Precies dat verschil is wat je moet weten om het op te lossen.
 */
export type InlogFout =
  | 'onbekende-code'
  | 'code-ingetrokken'
  | 'anoniem-inloggen-uit'
  | 'geen-verbinding'
  | 'geen-rechten'
  | 'onbekend';

export const INLOG_MELDINGEN: Record<InlogFout, string> = {
  'onbekende-code': 'Deze toegangscode bestaat niet. Controleer of je hem precies hebt overgenomen.',
  'code-ingetrokken': 'Deze toegangscode is ingetrokken. Vraag de beheerder om een nieuwe.',
  'anoniem-inloggen-uit':
    'De app mag zich niet bij Firebase aanmelden. Zet in de Firebase-console onder Authentication → Sign-in method de methode "Anonymous" aan.',
  'geen-verbinding':
    'Geen verbinding met de database. Controleer je internetverbinding en probeer het opnieuw.',
  'geen-rechten':
    'De database weigert deze code te controleren. Controleer de beveiligingsregels van Firestore.',
  onbekend: 'Inloggen is niet gelukt. Probeer het opnieuw of neem contact op met de beheerder.',
};

/** Vertaalt een Firebase-foutcode naar een van de bekende oorzaken. */
export function herkenInlogFout(error: unknown): InlogFout {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      return 'anoniem-inloggen-uit';
    case 'auth/network-request-failed':
    case 'unavailable':
    case 'deadline-exceeded':
      return 'geen-verbinding';
    case 'permission-denied':
      return 'geen-rechten';
    default:
      return 'onbekend';
  }
}

/**
 * Maakt van getypte invoer de vorm waarin codes worden opgeslagen: hoofdletters,
 * zonder omringende spaties. Het document-ID ís de code, dus een kleine letter
 * of een geplakte spatie leverde eerder "code bestaat niet" op.
 */
export function normaliseerCode(invoer: string): string {
  return invoer.trim().toUpperCase();
}
