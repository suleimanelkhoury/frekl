/** Texte der Einstellungs-Seite. */

const settings = {
  title: 'Einstellungen',
  profile: {
    title: 'Profil',
    email: 'E-Mail',
    memberSince: 'Mitglied seit',
    noDate: '—',
  },
  language: {
    title: 'Sprache',
    hint: 'Ändert die Sprache der Oberfläche sofort.',
  },
  analysis: {
    title: 'Budget-Analyse',
    hint: 'Durchsucht alle deine Budgets nach einmaligen Zeilen und Zeilen mit sehr ähnlichen Namen (vermutlich dieselbe Zeile anders geschrieben).',
    open: 'Budgets analysieren',
    oneTime: {
      title: 'Einmalige Zeilen',
      empty: 'Keine einmaligen Zeilen gefunden.',
    },
    similar: {
      title: 'Sehr ähnliche Namen',
      empty: 'Keine ähnlichen Zeilennamen gefunden.',
      occurrences_one: '{{count}}× in {{budgets}} Budget',
      occurrences_other: '{{count}}× in {{budgets}} Budgets',
    },
    columns: {
      label: 'Zeile',
      category: 'Kategorie',
      budget: 'Budget',
      ist: 'IST',
    },
  },
  changePassword: {
    title: 'Passwort ändern',
    placeholder:
      'Die Passwort-Änderung wird in einem zukünftigen Update verfügbar sein.',
  },
  logout: {
    title: 'Abmelden',
    hint: 'Melde dich auf diesem Gerät von deinem Konto ab.',
  },
};

export default settings;
