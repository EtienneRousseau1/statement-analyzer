export interface Account {
  id: number;
  name: string;
  institution: string | null;
  account_type: string;
  last_four: string | null;
  created_at: string;
}

export interface Transaction {
  id: number;
  account_id: number;
  statement_id: number | null;
  date: string;
  description: string;
  amount: string;
  transaction_type: "debit" | "credit";
  category: string;
  confirmed: boolean;
  created_at: string;
}

export interface TransactionPreview {
  date: string;
  description: string;
  amount: string;
  transaction_type: "debit" | "credit";
  category: string;
}

export interface Statement {
  id: number;
  account_id: number;
  filename: string;
  file_type: string;
  statement_source: string | null;
  status: string;
  transaction_count: number | null;
  uploaded_at: string;
}

export interface UploadResponse {
  statement: Statement;
  preview: TransactionPreview[];
  message: string;
}

export interface Budget {
  id: number;
  category: string;
  monthly_limit: string;
  month: number;
  year: number;
}

export interface BudgetStatus {
  category: string;
  monthly_limit: string;
  spent: string;
  remaining: string;
  percentage: number;
}

export interface CategoryTotal {
  category: string;
  total: string;
}

export interface MonthlyTotal {
  year: number;
  month: number;
  total: string;
}

export interface DashboardSummary {
  total_spent_this_month: string;
  total_income_this_month: string;
  total_spent_all_time: string;
  total_income_all_time: string;
  by_category: CategoryTotal[];
  by_category_all_time: CategoryTotal[];
  monthly_trend: MonthlyTotal[];
  account_count: number;
  transaction_count_this_month: number;
  transaction_count_all_time: number;
}

export const CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Transport",
  "Entertainment",
  "Utilities",
  "Health",
  "Travel",
  "Subscriptions",
  "Income",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
