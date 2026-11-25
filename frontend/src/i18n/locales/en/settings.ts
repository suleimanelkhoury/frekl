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
  changePassword: {
    title: 'Change Password',
    placeholder:
      'Password change functionality will be available in a future update.',
  },
  logout: {
    title: 'Logout',
    hint: 'Log out of your account on this device.',
  },
};

export default settings;
