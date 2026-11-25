/**
 * Dashboard-Texte — Seitenüberschrift, Erstellen-Formular, Archiv-Sektionen,
 * Budget-Karte und die Jahresübersichtsleisten.
 *
 * Die App duzt (informelle Anrede). Die Fachbegriffe SOLL, IST, Gehalt,
 * Extra und Investitionen bleiben unverändert.
 */

const dashboard = {
  title: 'Deine Budgets',
  actions: {
    importExcel: 'Excel importieren',
    newBudget: '+ Neues Budget',
  },
  create: {
    heading: 'Neues Budget erstellen',
    titleLabel: 'Titel',
    titlePlaceholder: 'z. B. Juli 2026',
    monthLabel: 'Monat',
    yearLabel: 'Jahr',
    submit: 'Erstellen',
    submitting: 'Wird erstellt…',
  },
  archive: {
    empty:
      'Noch keine Budgets. Erstelle ein neues Budget oder importiere eine Excel-Datei, um loszulegen.',
  },
  card: {
    current: 'Aktuell',
    cloneTitle:
      'Dieses Budget nach {{month}} klonen — geplante Beträge werden übernommen, tatsächliche Beträge starten bei null',
    exportTitle: 'Budget als Excel exportieren',
    exportAriaLabel: 'Budget {{title}} als Excel exportieren',
    deleteTitle: 'Budget löschen',
    deleteAriaLabel: 'Budget {{title}} löschen',
    labels: {
      gehalt: 'Gehalt',
      extra: 'Extra',
      expenses: 'Ausgaben',
      balance: 'Guthaben',
    },
    deleteConfirm: {
      title: 'Budget löschen',
      message:
        'Möchtest du <bold>{{title}}</bold> wirklich löschen? Damit werden alle Kategorien, Ausgabenpositionen und Einkünfte endgültig entfernt. Diese Aktion kann nicht rückgängig gemacht werden.',
      confirmLabel: 'Budget löschen',
      error: 'Budget konnte nicht gelöscht werden. Bitte versuche es erneut.',
    },
  },
  summary: {
    categorySpending: 'Kategorie-Ausgaben',
    categorySpendingTitle: 'Tatsächliche Ausgaben pro Kategorie in {{year}}',
    overallIncome: 'Gesamteinkommen',
    overallIncomeTitle:
      'Neues Geld in {{year}}, ohne Übertrag:\nGesamtausgaben + Endjahresguthaben − Januar-Übertrag ({{carryover}})',
    overallExpenses: 'Gesamtausgaben (ohne Investitionen)',
    overallExpensesTitle:
      'Nur Verbrauch — ohne {{amount}}, die in Investitionen geflossen sind (siehe Zeile Investieren)',
    avgMonthlyExpenses: 'Ø Monatsausgaben (ohne Investitionen)',
    avgExpensesTitle_one:
      'Durchschnittlicher Verbrauch über {{count}} Budget in {{year}} — ohne Investitionen',
    avgExpensesTitle_other:
      'Durchschnittlicher Verbrauch über {{count}} Budgets in {{year}} — ohne Investitionen',
    earned: 'Verdient (Netto)',
    earnedTitle_one:
      'Summe des IST-Nettos über {{count}} Budget in {{year}}',
    earnedTitle_other:
      'Summe des IST-Nettos über {{count}} Budgets in {{year}}',
    bar: {
      consumption: 'Verbrauch',
      invested: 'Investiert',
    },
    overallInvested: 'Insgesamt investiert',
    overallInvestedTitle:
      'Insgesamt in Investitionen überwiesen (Kategorie Investitionen) in {{year}}',
  },
};

export default dashboard;
