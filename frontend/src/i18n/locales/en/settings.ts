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
  logout: {
    title: 'Logout',
    hint: 'Log out of your account on this device.',
  },
};

export default settings;
