import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { StoreSettings } from '../../types';
import { 
  Store, 
  Receipt, 
  Percent, 
  RotateCcw, 
  Trash2, 
  Download, 
  Upload, 
  Check, 
  AlertCircle,
  Database,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    resetToDefaults, 
    clearAllData,
    restoreFullBackup,
    items, 
    orders, 
    expenses, 
    stockAdjustments,
    isBackendConnected
  } = usePOS();

  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success?: string; error?: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleChange = (field: keyof StoreSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      await updateSettings(formData);
      setSaveFeedback(true);
      setTimeout(() => setSaveFeedback(false), 2500);
    } finally {
      setIsProcessing(false);
    }
  };

  // Export JSON backup
  const handleExportBackup = () => {
    const backupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      settings: formData,
      items,
      orders,
      expenses,
      stockAdjustments,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `omnipos_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON backup safely without window.alert
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async evt => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.items && Array.isArray(parsed.items)) {
          await restoreFullBackup({
            items: parsed.items,
            orders: parsed.orders || [],
            expenses: parsed.expenses || [],
            stockAdjustments: parsed.stockAdjustments || [],
            settings: parsed.settings || formData,
          });
          setImportStatus({ success: `Successfully restored ${parsed.items.length} items and orders from backup file!` });
          setTimeout(() => setImportStatus(null), 4000);
        } else {
          setImportStatus({ error: 'Invalid backup file format: missing items catalog.' });
        }
      } catch (err) {
        setImportStatus({ error: 'Could not parse JSON backup file.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Store & POS Settings
          </h1>
          <p className="text-xs text-slate-500">
            Configure business identity, currency, sales tax, receipts, and persistent server storage
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg text-xs font-mono text-slate-600 border border-slate-200">
          <Database className="w-3.5 h-3.5 text-slate-500" />
          <span>Storage: {isBackendConnected ? 'Backend Server (pos_db.json)' : 'Local Storage Cache'}</span>
        </div>
      </div>

      {importStatus?.success && (
        <div className="flex items-center gap-2 p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{importStatus.success}</span>
        </div>
      )}

      {importStatus?.error && (
        <div className="flex items-center gap-2 p-3 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{importStatus.error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Store Profile Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
            <Store className="w-4 h-4 text-slate-500" />
            <span>Store Profile & Identity</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Store Name
              </label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={e => handleChange('storeName', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Store Tagline
              </label>
              <input
                type="text"
                value={formData.storeTagline}
                onChange={e => handleChange('storeTagline', e.target.value)}
                placeholder="e.g. Specialty Coffee & Fresh Pastries"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Physical Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={e => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Default Cashier Name
              </label>
              <input
                type="text"
                value={formData.cashierName}
                onChange={e => handleChange('cashierName', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Financial & Tax Settings */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
            <Percent className="w-4 h-4 text-slate-500" />
            <span>Currency & Sales Tax</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={formData.currency}
                onChange={e => handleChange('currency', e.target.value)}
                placeholder="$, €, £, Rp"
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Sales Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.taxRatePercent}
                onChange={e => handleChange('taxRatePercent', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={formData.enableTax}
                  onChange={e => handleChange('enableTax', e.target.checked)}
                  className="rounded text-slate-900 focus:ring-slate-900"
                />
                <span>Enable Sales Tax calculation</span>
              </label>
            </div>
          </div>
        </div>

        {/* Thermal Receipt Notes */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-slate-900 font-bold text-sm">
            <Receipt className="w-4 h-4 text-slate-500" />
            <span>Thermal Receipt Customization</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Receipt Header Message
              </label>
              <input
                type="text"
                value={formData.receiptHeader}
                onChange={e => handleChange('receiptHeader', e.target.value)}
                placeholder="Thank you for visiting us!"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Receipt Footer / WiFi Notice
              </label>
              <input
                type="text"
                value={formData.receiptFooter}
                onChange={e => handleChange('receiptFooter', e.target.value)}
                placeholder="WiFi: StoreGuest | Pass: Coffee2026"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between">
          <div>
            {saveFeedback && (
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 animate-in fade-in">
                <Check className="w-4 h-4" />
                Settings saved successfully to server!
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save All Settings</span>
          </button>
        </div>
      </form>

      {/* Database & Backup Management */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Database className="w-4 h-4 text-slate-600" />
          <span>Server Database & Backup Management</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-900">Backup & Restore</h4>
            <p className="text-[11px] text-slate-500">
              Export your inventory, orders, expenses, and loss history as a JSON file, or restore from a previous backup.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <label className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer shadow-xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <h4 className="text-xs font-bold text-slate-900">Data Reset</h4>
            <p className="text-[11px] text-slate-500">
              Restore clean, simple 5-item sample catalog with realistic orders, or wipe everything.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2">
              {confirmReset ? (
                <div className="flex items-center gap-1.5 p-1 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-xs text-amber-800 font-medium px-1">Reset to simple sample data?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await resetToDefaults();
                      setConfirmReset(false);
                      setImportStatus({ success: 'Reset to simplified sample data successfully!' });
                      setTimeout(() => setImportStatus(null), 3000);
                    }}
                    className="px-2 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded"
                  >
                    Yes, Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Sample Data</span>
                </button>
              )}

              {confirmClear ? (
                <div className="flex items-center gap-1.5 p-1 bg-rose-50 border border-rose-200 rounded-lg">
                  <span className="text-xs text-rose-800 font-medium px-1">Wipe everything?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await clearAllData();
                      setConfirmClear(false);
                      setImportStatus({ success: 'All records cleared.' });
                      setTimeout(() => setImportStatus(null), 3000);
                    }}
                    className="px-2 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded"
                  >
                    Yes, Wipe
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClear(false)}
                    className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-200 rounded-md hover:bg-rose-50 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Data</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
