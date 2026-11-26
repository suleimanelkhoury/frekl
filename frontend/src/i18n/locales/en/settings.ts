/** Settings page strings. */

const settings = {
  title: 'Settings',
  profile: {
    title: 'Profile',
    email: 'Email',
    memberSince: 'Member since',
    noDate: '—',
  },
  language: {
    title: 'Language',
    hint: 'Changes the interface language immediately.',
  },
  analysis: {
    title: 'Budget Analysis',
    hint: 'Scans all your budgets for one-time rows and rows with very similar names (likely the same row spelled differently).',
    open: 'Analyze Budgets',
    oneTime: {
      title: 'One-time rows',
      empty: 'No one-time rows found.',
    },
    similar: {
      title: 'Very similar names',
      empty: 'No similar row names found.',
      occurrences_one: '{{count}}× in {{budgets}} budget',
      occurrences_other: '{{count}}× in {{budgets}} budgets',
    },
    columns: {
      label: 'Label',
      category: 'Category',
      budget: 'Budget',
      ist: 'IST',
    },
  },
  subscriptions: {
    title: 'Subscriptions & Recurring',
    hint: 'Rows recurring at a regular interval (monthly, quarterly, yearly …), with their average actual cost and a price trend (earliest entries vs. latest entries). Click a row for its full history.',
    open: 'Open Subscriptions',
    empty: 'No recurring rows yet.',
    columns: {
      label: 'Item',
      category: 'Category',
      seen: 'Seen',
      period: 'Period',
      avg: 'Ø Actual',
      trend: 'Trend',
    },
    seen_one: '{{count}}× in {{budgets}} months',
    seen_other: '{{count}}× in {{budgets}} months',
    cadenceMonthly: 'monthly',
    cadenceEvery: 'every {{months}} months',
    trend: {
      hint: 'Average of the earliest entries vs. the latest entries',
    },
  },
  changePassword: {
    title: 'Change Password',
    placeholder:
      'Password change functionality will be available in a future update.',
  },
  backup: {
    title: 'Backup & Restore',
    hint: 'Download all your budgets as a JSON file, or restore from a backup. The backup contains everything (income, categories, items with SOLL/IST) but no password.',
    download: 'Download Backup',
    downloading: 'Downloading…',
    downloadError: 'Could not create the backup. Please try again.',
    restore: 'Restore Backup',
    modal: {
      title: 'Restore from Backup',
      fileLabel: 'Backup file (.json)',
      fileError: 'Not a valid frekl backup file.',
      summary:
        'Backup from {{date}} · {{email}} · {{budgets}} budgets',
      modeLabel: 'Restore mode',
      modeMerge: 'Merge (fills missing months, keeps existing)',
      modeReplace: 'Replace everything (deletes all current budgets!)',
      replaceWarning:
        'Replace mode permanently deletes ALL your current budgets. There is no undo — make sure you downloaded a backup first.',
      restore: 'Restore',
      restoring: 'Restoring…',
      result: 'Restored {{created}} budgets, skipped {{skipped}}.',
      close: 'Close',
      error: 'Restore failed. Please check the file and try again.',
    },
  },
  logout: {
    title: 'Logout',
    hint: 'Log out of your account on this device.',
  },
};

export default settings;
