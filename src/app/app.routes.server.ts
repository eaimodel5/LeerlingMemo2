import {RenderMode, ServerRoute} from '@angular/ssr';

/**
 * Welke pagina's vooraf worden gerenderd.
 *
 * Stond op `**` met Prerender: álle routes werden tijdens de build als
 * statische pagina weggeschreven. Bij een route met een guard gaat dat mis.
 * Tijdens het bouwen bestaat er geen browseropslag, dus de guard concludeert
 * "niet ingelogd" en stuurt door naar /login — en precies díe doorverwijzing
 * belandt in het statische bestand. Het resultaat: wie /mentor-prep opent of
 * ververst krijgt de inlogpagina te zien, ook als hij gewoon is ingelogd.
 *
 * Alleen de twee pagina's zonder guard worden nog vooraf gerenderd. De rest
 * wordt in de browser opgebouwd; die schermen halen hun inhoud toch pas
 * daar op.
 */
export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client }
];
