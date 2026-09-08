import os
import re

file_path = "src/app/pages/teacher-dashboard.component.spec.ts"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace(
"""  it('toont legacy taken via e-mailfallback voor een docent met afkorting en e-mail', () => {
    // Hans Visser is inmiddels gemigreerd en heeft afkorting én e-mail
    authService.setFakeUser({ role: 'Docent', docentAfkorting: 'vis', email: 'visser@school.nl' });
    dataService.mockDocentTaken([
      { id: 'legacy-taak', periode: 'tw1', leerlingnummer: '1001', docentEmail: 'visser@school.nl' }
    ]);
    const fixture = TestBed.createComponent(TeacherDashboardComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();
    TestBed.flushEffects();

    expect(component.myTaken().map(t => t.id)).toEqual(['legacy-taak']);
  });""",
"""  it('weigert in PR9 nog legacy taken via e-mailfallback voor een docent', () => {
    // Hans Visser is inmiddels gemigreerd en heeft afkorting én e-mail
    authService.setFakeUser({ role: 'Docent', docentAfkorting: 'vis', email: 'visser@school.nl' });
    dataService.mockDocentTaken([
      { id: 'legacy-taak', periode: 'tw1', leerlingnummer: '1001', docentEmail: 'visser@school.nl' }
    ]);
    const fixture = TestBed.createComponent(TeacherDashboardComponent);
    const component = fixture.componentInstance;
    component.ngOnInit();
    TestBed.flushEffects();

    expect(component.myTaken().map(t => t.id)).toEqual([]); // Geen fallback meer
  });"""
)

# Fix tests relying on legacy email mapping for modern tasks
content = content.replace(
"""    dataService.mockDocentTaken([
      { id: 'mijn', periode: 'tw1', leerlingnummer: '1001', docentEmail: 'visser@school.nl' },
      { id: 'ander', periode: 'tw1', leerlingnummer: '1001', docentEmail: 'jansen@school.nl' }
    ]);""",
"""    dataService.mockDocentTaken([
      { id: 'mijn', periode: 'tw1', leerlingnummer: '1001', docentAfkorting: 'vis', docentEmail: 'visser@school.nl' },
      { id: 'ander', periode: 'tw1', leerlingnummer: '1001', docentAfkorting: 'jan', docentEmail: 'jansen@school.nl' }
    ]);"""
)

content = content.replace(
"""    dataService.mockDocentTaken([
      { id: 'mijn', periode: 'tw1', leerlingnummer: '1001', docentEmail: 'VISSER@school.nl' }
    ]);""",
"""    dataService.mockDocentTaken([
      { id: 'mijn', periode: 'tw1', leerlingnummer: '1001', docentAfkorting: 'vis', docentEmail: 'VISSER@school.nl' }
    ]);"""
)

content = content.replace(
"""    dataService.mockDocentTaken([
      { id: 'taak', periode: 'tw1', leerlingnummer: '1001', docentEmail: 'visser@school.nl' }
    ]);""",
"""    dataService.mockDocentTaken([
      { id: 'taak', periode: 'tw1', leerlingnummer: '1001', docentAfkorting: 'vis', docentEmail: 'visser@school.nl' }
    ]);"""
)

content = content.replace(
"""    dataService.mockDocentTaken([
      { id: 'tw1', periode: 'tw1', leerlingnummer: '1001', docentEmail: 'visser@school.nl' },
      { id: 'tw2', periode: 'tw2', leerlingnummer: '1001', docentEmail: 'visser@school.nl' }
    ]);""",
"""    dataService.mockDocentTaken([
      { id: 'tw1', periode: 'tw1', leerlingnummer: '1001', docentAfkorting: 'vis', docentEmail: 'visser@school.nl' },
      { id: 'tw2', periode: 'tw2', leerlingnummer: '1001', docentAfkorting: 'vis', docentEmail: 'visser@school.nl' }
    ]);"""
)

with open(file_path, "w") as f:
    f.write(content)
