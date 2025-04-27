import { neon } from '@neondatabase/serverless';

// Function to format a price value to a currency string
export const formatCurrency = (amount: number, locale = 'en-US', currency = 'USD') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Function to format a date string to a readable format
export const formatDate = (dateString: string) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

// Function to format a time string from a date
export const formatTime = (dateString: string) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(date);
};

// Get category color for visualizations
export const getCategoryColor = (category: string): string => {
  const colorMap: Record<string, string> = {
    'Food': '#3b82f6', // blue
    'Petrol': '#f59e0b', // amber
    'Rent': '#ef4444', // red
    'Healthcare': '#10b981', // emerald
    'Entertainment': '#8b5cf6', // purple
    'Clothing': '#ec4899', // pink
    'Insurance': '#06b6d4', // cyan
    'Communication': '#6366f1', // indigo
    'Loans': '#f43f5e', // rose
    'Toll': '#14b8a6', // teal
    'Transportation': '#84cc16', // lime
    'Miscellaneous': '#64748b' // slate
  };
  
  return colorMap[category] || '#64748b';
};

// Get category badge color classes
export const getCategoryBadgeClasses = (category: string): string => {
  const classMap: Record<string, string> = {
    'Food': 'bg-blue-100 text-blue-800',
    'Petrol': 'bg-amber-100 text-amber-800',
    'Rent': 'bg-red-100 text-red-800',
    'Healthcare': 'bg-emerald-100 text-emerald-800',
    'Entertainment': 'bg-purple-100 text-purple-800',
    'Clothing': 'bg-pink-100 text-pink-800',
    'Insurance': 'bg-cyan-100 text-cyan-800',
    'Communication': 'bg-indigo-100 text-indigo-800',
    'Loans': 'bg-rose-100 text-rose-800',
    'Toll': 'bg-teal-100 text-teal-800',
    'Transportation': 'bg-lime-100 text-lime-800',
    'Miscellaneous': 'bg-slate-100 text-slate-800'
  };
  
  return classMap[category] || 'bg-slate-100 text-slate-800';
};

// Categories array for dropdowns and filters
export const CATEGORIES = [
  'Food',
  'Petrol',
  'Rent',
  'Healthcare',
  'Entertainment',
  'Clothing',
  'Insurance',
  'Communication',
  'Loans',
  'Toll',
  'Transportation',
  'Miscellaneous'
];

// Sort options for the transactions table
export const SORT_OPTIONS = [
  { value: 'date:desc', label: 'Newest First' },
  { value: 'date:asc', label: 'Oldest First' },
  { value: 'price:desc', label: 'Highest Amount' },
  { value: 'price:asc', label: 'Lowest Amount' }
];

// Date filter options for the transactions table
export const DATE_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' }
];
