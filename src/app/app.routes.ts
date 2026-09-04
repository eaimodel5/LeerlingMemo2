import { Routes } from '@angular/router';
import { LayoutComponent } from './pages/layout.component';
import { authGuard, superuserGuard, mentorOrHigherGuard, rechtGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    component: LayoutComponent,
    children: [
      // Bewust zonder guard. De startpagina wordt als enige samen met /login
      // vooraf gerenderd (zie app.routes.server.ts), en tijdens het bouwen
      // bestaat er geen browseropslag: een guard concludeert daar "niet
      // ingelogd" en schrijft de doorverwijzing naar /login als statische
      // index.html weg -- die vervolgens ook de terugvalpagina van elke andere
      // route is. Er staan hier geen gegevens; de tegels tonen zich per rol en
      // elke echte route heeft zijn eigen guard.
      { path: '', loadComponent: () => import('./pages/start.component').then(m => m.StartComponent) },
      { path: 'teacher-dashboard', loadComponent: () => import('./pages/teacher-dashboard.component').then(m => m.TeacherDashboardComponent), canActivate: [authGuard] },
      { path: 'memo-1', loadComponent: () => import('./pages/memo-1.component').then(m => m.Memo1Component), canActivate: [authGuard] },
      { path: 'memo-2', loadComponent: () => import('./pages/memo-2.component').then(m => m.Memo2Component), canActivate: [authGuard] },
      { path: 'memo-3', loadComponent: () => import('./pages/memo-3.component').then(m => m.Memo3Component), canActivate: [authGuard] },
      { path: 'power-fx', loadComponent: () => import('./pages/power-fx.component').then(m => m.PowerFxComponent), canActivate: [superuserGuard] },
      { path: 'mentor-overview', loadComponent: () => import('./pages/mentor-overview.component').then(m => m.MentorOverviewComponent), canActivate: [mentorOrHigherGuard] },
      { path: 'mentor-prep', loadComponent: () => import('./pages/mentor-prep.component').then(m => m.MentorPrepComponent), canActivate: [mentorOrHigherGuard] },
      { path: 'progress-plan', loadComponent: () => import('./pages/progress-plan.component').then(m => m.ProgressPlanComponent), canActivate: [mentorOrHigherGuard] },
      { path: 'magister-export', loadComponent: () => import('./pages/magister-export.component').then(m => m.MagisterExportComponent), canActivate: [mentorOrHigherGuard] },
      { path: 'manage-students', loadComponent: () => import('./pages/manage-students.component').then(m => m.ManageStudentsComponent), canActivate: [rechtGuard('leerlingenBewerken')] },
      { path: 'manage-teachers', loadComponent: () => import('./pages/manage-teachers.component').then(m => m.ManageTeachersComponent), canActivate: [rechtGuard('docentkoppelingBewerken')] },
      { path: 'beheer', loadComponent: () => import('./pages/beheer-dashboard.component').then(m => m.BeheerDashboardComponent), canActivate: [superuserGuard] },
      { path: 'superuser', loadComponent: () => import('./pages/superuser.component').then(m => m.SuperuserComponent), canActivate: [superuserGuard] },
      { path: 'handleiding', loadComponent: () => import('./pages/manual.component').then(m => m.ManualComponent), canActivate: [authGuard] },
    ]
  }
];
