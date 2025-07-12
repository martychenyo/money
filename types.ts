export enum TransactionType {
  Income = "Income",
  Expense = "Expense",
  Transfer = "Transfer",
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: string;
  category: string;
  memo: string;
  date: string;
  time: string;
}

export interface GeminiTransactionResponse {
  status: "success" | "error";
  message: string;
  transaction?: {
    type: TransactionType;
    amount: number;
    currency: string;
    category: string;
    memo: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:MM:SS
  };
}

// --- App State Management Types ---

export interface AppState {
  isInitialized: boolean;
  balance: number;
  transactions: Transaction[];
  filterMonths: number;
}

export type AppAction =
  | { type: 'INITIALIZE'; payload: { balance: number; transactions: Transaction[] } }
  | { type: 'SET_INITIAL_BALANCE'; payload: number }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: { id: string } }
  | { type: 'SET_FILTER_MONTHS'; payload: number }
  | { type: 'RESET' };
