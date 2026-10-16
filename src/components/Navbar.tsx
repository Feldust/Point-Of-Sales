import React from 'react';
import { usePOS } from '../context/POSContext';
import { 
  ShoppingBag, 
  Layers, 
  DollarSign, 
  Receipt, 
  Settings, 
  PieChart, 
  Server, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';

export type ActiveTab = 'pos' | 'inventory' | 'orders' | 'financials' | 'expenses' | 'settings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { cart, items, settings, isBackendConnected, isSyncing } = usePOS();
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = items.filter(i => i.stock <= i.minStockAlert).length;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 w-full overflow-hidden shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 w-full min-w-0">
        {/* Brand Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 min-w-0">
          <button 
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-2 sm:gap-2.5 text-left focus:outline-none min-w-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base sm:text-lg tracking-tight shrink-0 shadow-xs">
              O
            </div>
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 truncate max-w-[120px] sm:max-w-[180px] lg:max-w-[220px] block leading-tight">
                {settings.storeName || 'OmniPOS'}
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium block truncate">
                Cashier & Inventory Ledger
              </span>
            </div>
          </button>
        </div>

        {/* Navigation Desktop Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 shrink min-w-0">
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'pos'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Cashier Register</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors relative ${
              activeTab === 'inventory'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Stocks & Items</span>
            {lowStockCount > 0 && (
              <span 
                title={`${lowStockCount} items low on stock`}
                className="w-2 h-2 rounded-full bg-amber-500 ml-0.5" 
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'orders'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Sales & Orders</span>
          </button>

          <button
            onClick={() => setActiveTab('financials')}
            className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'financials'
                ? 'bg-emerald-50 text-emerald-800 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <PieChart className="w-4 h-4 text-emerald-600" />
            <span>Profit & Loss</span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'expenses'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Expenses</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'settings'
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </nav>

        {/* Right Action & Backend Sync Status */}
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          {/* Server Sync Status Badge */}
          <div 
            title={isBackendConnected ? "Backend server running & persistent across reloads" : "Offline mode / caching"}
            className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono border bg-slate-50 text-slate-600 border-slate-200"
          >
            {isSyncing ? (
              <RefreshCw className="w-3 h-3 text-indigo-500 animate-spin" />
            ) : isBackendConnected ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
            <span className="font-sans font-medium text-slate-700">
              {isSyncing ? 'Syncing...' : isBackendConnected ? 'Backend Connected' : 'Local Cache'}
            </span>
          </div>

          {activeTab !== 'pos' ? (
            <button
              onClick={() => setActiveTab('pos')}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shadow-xs"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Register</span>
              {totalCartCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-emerald-500 text-white text-[11px] font-bold rounded-full">
                  {totalCartCount}
                </span>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-700 font-semibold truncate max-w-[80px] sm:max-w-[120px]">
                {settings.cashierName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation bar */}
      <div className="lg:hidden flex items-center justify-around border-t border-slate-200 bg-white px-2 py-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pos')}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium whitespace-nowrap ${
            activeTab === 'pos' ? 'text-slate-900 font-bold' : 'text-slate-500'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Register</span>
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium whitespace-nowrap ${
            activeTab === 'inventory' ? 'text-slate-900 font-bold' : 'text-slate-500'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Stocks</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium whitespace-nowrap ${
            activeTab === 'orders' ? 'text-slate-900 font-bold' : 'text-slate-500'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Orders</span>
        </button>
        <button
          onClick={() => setActiveTab('financials')}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium whitespace-nowrap ${
            activeTab === 'financials' ? 'text-emerald-700 font-bold' : 'text-slate-500'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>Profit & Loss</span>
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium whitespace-nowrap ${
            activeTab === 'expenses' ? 'text-slate-900 font-bold' : 'text-slate-500'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Expenses</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium whitespace-nowrap ${
            activeTab === 'settings' ? 'text-slate-900 font-bold' : 'text-slate-500'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
};
