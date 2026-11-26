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
  subscriptions: {
    title: 'Abos & Wiederkehrendes',
    hint: 'Zeilen in regelmäßigen Abständen (monatlich, quartalsweise, jährlich …), mit ihren durchschnittlichen Ist-Kosten und einem Preistrend (früheste Einträge vs. letzte Einträge). Klicke auf eine Zeile für den kompletten Verlauf.',
    open: 'Abos öffnen',
    empty: 'Noch keine wiederkehrenden Zeilen.',
    columns: {
      label: 'Zeile',
      category: 'Kategorie',
      seen: 'Vorkommen',
      period: 'Zeitraum',
      avg: 'Ø Ist',
      trend: 'Trend',
    },
    seen_one: '{{count}}× in {{budgets}} Monat',
    seen_other: '{{count}}× in {{budgets}} Monaten',
    cadenceMonthly: 'monatlich',
    cadenceEvery: 'alle {{months}} Monate',
    trend: {
      hint: 'Durchschnitt der frühesten Einträge vs. der letzten Einträge',
    },
  },
  changePassword: {
    title: 'Passwort ändern',
    placeholder:
      'Die Passwort-Änderung wird in einem zukünftigen Update verfügbar sein.',
  },
  backup: {
    title: 'Backup & Wiederherstellung',
    hint: 'Lade alle deine Budgets als JSON-Datei herunter oder stelle ein Backup wieder her. Das Backup enthält alles (Einkommen, Kategorien, Posten mit SOLL/IST), aber kein Passwort.',
    download: 'Backup herunterladen',
    downloading: 'Wird heruntergeladen…',
    downloadError: 'Backup konnte nicht erstellt werden. Bitte versuche es erneut.',
    restore: 'Backup wiederherstellen',
    modal: {
      title: 'Aus Backup wiederherstellen',
      fileLabel: 'Backup-Datei (.json)',
      fileError: 'Keine gültige frekl-Backup-Datei.',
      summary: 'Backup vom {{date}} · {{email}} · {{budgets}} Budgets',
      modeLabel: 'Wiederherstellungs-Modus',
      modeMerge: 'Zusammenführen (füllt fehlende Monate, behält vorhandene)',
      modeReplace: 'Alles ersetzen (löscht alle aktuellen Budgets!)',
      replaceWarning:
        'Der Ersetzen-Modus löscht dauerhaft ALLE deine aktuellen Budgets. Es gibt kein Zurück — lade vorher sicherheitshalber ein Backup herunter.',
      restore: 'Wiederherstellen',
      restoring: 'Wird wiederhergestellt…',
      result: '{{created}} Budgets wiederhergestellt, {{skipped}} übersprungen.',
      close: 'Schließen',
      error: 'Wiederherstellung fehlgeschlagen. Bitte prüfe die Datei und versuche es erneut.',
    },
  },
  logout: {
    title: 'Abmelden',
    hint: 'Melde dich auf diesem Gerät von deinem Konto ab.',
  },
};

export default settings;
