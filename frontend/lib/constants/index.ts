export const TRANSACTION_CATEGORIES = [
  'housing', 'utilities', 'groceries', 'dining', 'transport', 'fuel',
  'insurance', 'healthcare', 'subscriptions', 'entertainment', 'clothing',
  'education', 'childcare', 'pets', 'travel', 'gifts', 'savings',
  'investments', 'debt_payment', 'salary', 'freelance', 'side_hustle',
  'rental_income', 'dividends', 'tax_refund', 'other',
] as const

export const IRS_LIMITS = {
    '401k_employee_2024': 23000,
    '401k_employee_2025': 23500,
    '401k_catchup_50_plus_2024': 30500,
    '401k_super_catchup_60_63': 34750,
    'ira_2024': 7000,
    'ira_2025': 7000,
    'ira_catchup_50_plus': 8000,
    'hsa_individual_2024': 4150,
    'hsa_family_2024': 8300,
    'hsa_individual_2025': 4300,
    'hsa_family_2025': 8550,
    'fsa_2024': 3200,
    'fsa_2025': 3300,
    'annual_gift_exclusion_2024': 18000,
    'annual_gift_exclusion_2025': 19000,
    'qcd_limit': 105000,
    'ss_wage_base_2024': 168600,
    'ss_wage_base_2025': 176100, 
}

export const ROTH_PHASEOUT_2024 = {
    single: { start: 146000, end: 161000 },
    married_filing_jointly: { start: 230000, end: 240000 },
    head_of_household: { start: 146000, end: 161000 },
    married_filing_seperately: { start: 0, end: 10000 },
}

export const STANDARD_DEDUCTIONS_2024 = {
    single: 14600,
    married_filing_jointly: 29200,
    married_filing_seperately: 14600,
    head_of_household: 21900,
}

export const LIFE_STAGE_PRIORITIES: Record<string, string[]> = {
  foundations: [
    'Open a savings account and automate small deposits',
    'Learn how a paycheck and taxes work',
    'Understand compound interest — time is your biggest asset',
  ],
  launch: [
    'Build a 3-month emergency fund before investing',
    'Contribute enough to your 401k to capture the full employer match',
    'Pay more than the minimum on all high-interest debt',
    'Open a Roth IRA — starting early is the biggest advantage',
  ],
  build: [
    'Maximize your 401k and Roth IRA contributions',
    'Aggressively pay off any debt above 6% interest',
    'Build toward 20% down payment if considering homeownership',
    'Diversify investments across asset classes',
  ],
  accelerate: [
    'Max out all tax-advantaged accounts including HSA',
    'Start 529 plans for children if applicable',
    'Review and rebalance asset allocation annually',
    'Consider term life insurance if you have dependents',
  ],
  preserve: [
    'Take advantage of catch-up contributions (50+) and super catch-up (60-63)',
    'Optimize Social Security claiming strategy',
    'Enroll in Medicare at 65 — missing the window = permanent penalty',
    'Complete estate planning documents',
  ],
  retire: [
    'Follow the 4% withdrawal rule as a starting guideline',
    'Optimize RMD timing to minimize tax impact',
    'Use QCDs for charitable giving instead of cash',
    'Draw taxable accounts first, tax-deferred second, Roth last',
  ],
}

export const NAV_SECTIONS = [
  { href: '/dashboard',  label: 'Dashboard',    description: 'Your financial overview' },
  { href: '/finances',   label: 'My Finances',  description: 'Assets, debts, goals, transactions' },
  { href: '/simulate',   label: 'Simulate',     description: 'Model financial decisions' },
  { href: '/invest',     label: 'Invest',        description: 'Stocks, ETFs, paper trading, macro' },
  { href: '/learn',      label: 'Learn',         description: 'Curriculum and glossary' },
  { href: '/advisor',    label: 'AI Advisor',   description: 'RAG-powered financial guidance' },
  { href: '/tax',        label: 'Tax',           description: '2024 tax calculator' },
  { href: '/documents',  label: 'Documents',    description: 'AI document intelligence' },
  { href: '/journal',    label: 'Journal',      description: 'Decision tracking' },
  { href: '/community',  label: 'Community',    description: 'Peer benchmarks and templates' },
]