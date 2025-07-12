import React, { useReducer, useCallback, useEffect, useMemo } from 'react';
import { Transaction, GeminiTransactionResponse, TransactionType, AppState, AppAction } from './types';
import { VoiceInput } from './components/VoiceInput';
import { TransactionTable } from './components/TransactionTable';
import { BalanceSetup } from './components/BalanceSetup';
import { Summary } from './components/Summary';
import { CategorySummary } from './components/CategorySummary';

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        isInitialized: true,
        balance: action.payload.balance,
        transactions: action.payload.transactions,
      };
    case 'SET_INITIAL_BALANCE':
      return {
        ...state,
        isInitialized: true,
        balance: action.payload,
        transactions: [],
      };
    case 'ADD_TRANSACTION': {
      const newTransaction = action.payload;
      let newBalance = state.balance;
      if (newTransaction.type === TransactionType.Income) {
        newBalance += newTransaction.amount;
      } else if (newTransaction.type === TransactionType.Expense) {
        newBalance -= newTransaction.amount;
      }
      return {
        ...state,
        balance: newBalance,
        transactions: [newTransaction, ...state.transactions],
      };
    }
    case 'DELETE_TRANSACTION': {
      const { id } = action.payload;
      const transactionToDelete = state.transactions.find((tx) => tx.id === id);

      if (!transactionToDelete) {
        // Diagnostic Alert: Make the failure visible
        console.error(
          "DELETE FAILED: Transaction not found.",
          "Attempted to delete ID:", id,
          "Available IDs:", state.transactions.map(t => t.id)
        );
        window.alert(`刪除失敗：在目前的紀錄中找不到 ID 為 "${id}" 的交易。這是一個罕見的錯誤，請回報此訊息。`);
        return state; // No change if transaction not found
      }

      let adjustedBalance = state.balance;
      if (transactionToDelete.type === TransactionType.Income) {
        adjustedBalance -= transactionToDelete.amount;
      } else if (transactionToDelete.type === TransactionType.Expense) {
        adjustedBalance += transactionToDelete.amount;
      }

      return {
        ...state,
        balance: adjustedBalance,
        transactions: state.transactions.filter((tx) => tx.id !== id),
      };
    }
    case 'SET_FILTER_MONTHS':
      return { ...state, filterMonths: action.payload };
    case 'RESET':
      return {
        isInitialized: false,
        balance: 0,
        transactions: [],
        filterMonths: 6,
      };
    default:
      return state;
  }
};

const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, {
    isInitialized: false,
    balance: 0,
    transactions: [],
    filterMonths: 6,
  });

  // Load state from localStorage on initial render
  useEffect(() => {
    try {
      const storedBalance = localStorage.getItem('accountBalance');
      const storedTransactions = localStorage.getItem('transactions');
      
      if (storedBalance !== null) {
        dispatch({
          type: 'INITIALIZE',
          payload: {
            balance: JSON.parse(storedBalance),
            transactions: storedTransactions ? JSON.parse(storedTransactions) : [],
          },
        });
      }
    } catch (error) {
      console.error("Failed to load state from localStorage", error);
      localStorage.clear();
      dispatch({ type: 'RESET' });
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (state.isInitialized) {
      localStorage.setItem('accountBalance', JSON.stringify(state.balance));
      localStorage.setItem('transactions', JSON.stringify(state.transactions));
    }
  }, [state.balance, state.transactions, state.isInitialized]);
  
  const handleSetInitialBalance = (initialBalance: number) => {
    dispatch({ type: 'SET_INITIAL_BALANCE', payload: initialBalance });
  };

  const handleNewTransaction = useCallback((result: GeminiTransactionResponse) => {
    if (result.status === 'success' && result.transaction) {
      const transactionData = { ...result.transaction };
      const now = new Date();

      if (transactionData.date === 'CURRENT_DATE') {
        transactionData.date = now.toISOString().split('T')[0];
      }

      if (transactionData.time === 'CURRENT_TIME') {
        transactionData.time = now.toTimeString().split(' ')[0];
      }
      
      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        ...transactionData,
      };
      
      dispatch({ type: 'ADD_TRANSACTION', payload: newTransaction });
    }
  }, []); // dispatch is stable and doesn't need to be in dependencies
  
  const handleReset = () => {
    // The native window.confirm blocks the event loop and can interfere with
    // React's state updates, causing the action to not be dispatched.
    // Removing it to ensure the reset functionality works reliably.
    localStorage.clear();
    dispatch({ type: 'RESET' });
  };
  
  const filteredTransactions = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - state.filterMonths);
    cutoffDate.setHours(0, 0, 0, 0); // Set to the beginning of the day

    return state.transactions.filter(tx => new Date(tx.date) >= cutoffDate);
  }, [state.transactions, state.filterMonths]);

  if (!state.isInitialized) {
    return <BalanceSetup onSetBalance={handleSetInitialBalance} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-center text-gray-900 dark:text-white">
            MARTY語音記帳
          </h1>
          <p className="text-center text-gray-500 dark:text-gray-400 mt-1">
            您的個人記帳助理，由語音驅動。
          </p>
        </div>
      </header>
      <main className="py-8">
        <div className="max-w-4xl mx-auto sm:px-6 lg:px-8 space-y-8">
          <Summary balance={state.balance} transactions={state.transactions} />
          <CategorySummary transactions={state.transactions} />
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <VoiceInput onNewTransaction={handleNewTransaction} />
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between flex-wrap sm:flex-nowrap gap-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                  交易明細
                </h3>
                <div className="flex-shrink-0">
                  <div className="flex items-center space-x-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
                    {[1, 3, 6].map(months => (
                      <button
                        key={months}
                        onClick={() => dispatch({ type: 'SET_FILTER_MONTHS', payload: months })}
                        type="button"
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors focus:outline-none ${
                          state.filterMonths === months
                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        最近{months}個月
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <TransactionTable 
              transactions={filteredTransactions} 
              totalTransactionCount={state.transactions.length}
              dispatch={dispatch}
            />
          </div>
        </div>
      </main>
      <footer className="text-center py-4 text-xs text-gray-500 dark:text-gray-400 space-y-2">
        <p>由 React, Tailwind CSS, 與 Google Gemini 驅動。</p>
        <button
          onClick={handleReset}
          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline text-sm"
        >
          清除資料並重新計算
        </button>
      </footer>
    </div>
  );
};

export default App;