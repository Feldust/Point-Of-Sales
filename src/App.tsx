/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { POSProvider, usePOS } from './context/POSContext';
import { Navbar, ActiveTab } from './components/Navbar';
import { CashierRegister } from './components/pos/CashierRegister';
import { InventoryView } from './components/inventory/InventoryView';
import { OrdersView } from './components/orders/OrdersView';
import { FinancialView } from './components/financial/FinancialView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { SettingsView } from './components/settings/SettingsView';

const POSAppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const { settings, isBackendConnected } = usePOS();

  return (
    <div className="min-h-screen bg-slate-100/60 flex flex-col text-slate-900 w-full overflow-x-hidden">
      {/* Top Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'pos' && <CashierRegister />}
        {activeTab === 'inventory' && <InventoryView />}
        {activeTab === 'orders' && <OrdersView />}
        {activeTab === 'financials' && <FinancialView />}
        {activeTab === 'expenses' && <ExpensesView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">{settings.storeName}</span>
            <span aria-hidden="true">•</span>
            <span>Point of Sale, Inventory & Financial Ledger</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{isBackendConnected ? 'Server Disk Persistence' : 'Local Storage Cache'}</span>
            </span>
            <span>v2.1</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <POSProvider>
      <POSAppContent />
    </POSProvider>
  );
}
