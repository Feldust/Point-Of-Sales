import React, { useState, useEffect } from 'react';
import { Item, StockAdjustmentType } from '../../types';
import { usePOS } from '../../context/POSContext';
import { PlusCircle, MinusCircle, AlertTriangle, X, Loader2 } from 'lucide-react';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedItem?: Item | null;
  initialMode?: 'RESTOCK' | 'LOSS';
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  preselectedItem,
  initialMode = 'RESTOCK',
}) => {
  const { items, inputStock, adjustStockLoss, formatMoney } = usePOS();

  const [mode, setMode] = useState<'RESTOCK' | 'LOSS'>(initialMode);
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('10');
  const [unitCost, setUnitCost] = useState<string>('0');
  const [supplier, setSupplier] = useState<string>('');
  const [lossType, setLossType] = useState<Exclude<StockAdjustmentType, 'RESTOCK'>>('DAMAGE');
  const [reasonNote, setReasonNote] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedItem) {
      setSelectedItemId(preselectedItem.id);
      setUnitCost(preselectedItem.costPrice.toString());
    } else if (items.length > 0 && !selectedItemId) {
      setSelectedItemId(items[0].id);
      setUnitCost(items[0].costPrice.toString());
    }
    setMode(initialMode);
    setErrorMsg('');
  }, [preselectedItem, initialMode, isOpen, items]);

  const handleItemChange = (itemId: string) => {
    setSelectedItemId(itemId);
    const it = items.find(i => i.id === itemId);
    if (it) {
      setUnitCost(it.costPrice.toString());
    }
  };

  if (!isOpen) return null;

  const currentItem = items.find(i => i.id === selectedItemId);
  const qtyNum = parseInt(quantity, 10) || 0;
  const costNum = parseFloat(unitCost) || (currentItem ? currentItem.costPrice : 0);
  const lossValue = currentItem ? qtyNum * currentItem.costPrice : 0;
  const restockCostTotal = qtyNum * costNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem) {
      setErrorMsg('Please select an item.');
      return;
    }
    if (qtyNum <= 0) {
      setErrorMsg('Quantity must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'RESTOCK') {
        await inputStock(
          currentItem.id,
          qtyNum,
          costNum,
          supplier.trim(),
          reasonNote.trim() || `Inbound stock of ${qtyNum} ${currentItem.unit}`
        );
      } else {
        if (qtyNum > currentItem.stock) {
          setErrorMsg(`Cannot write off more than current stock (${currentItem.stock} ${currentItem.unit}).`);
          setIsSubmitting(false);
          return;
        }
        await adjustStockLoss(
          currentItem.id,
          qtyNum,
          lossType,
          reasonNote.trim() || `${lossType} write-off for ${qtyNum} ${currentItem.unit}`
        );
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Operation failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header with Mode Toggle */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {mode === 'RESTOCK' ? 'Input Stocks (Restock)' : 'Record Stock Loss / Write-Off'}
            </h2>
            <p className="text-xs text-slate-500">
              {mode === 'RESTOCK' 
                ? 'Replenish inventory and record supplier purchase'
                : 'Write off damaged, expired, or lost stock with real financial impact'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Type Segmented Bar */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setMode('RESTOCK')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-colors ${
                mode === 'RESTOCK'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>Input Stock (Inbound)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('LOSS')}
              className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-colors ${
                mode === 'LOSS'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MinusCircle className="w-4 h-4 text-rose-600" />
              <span>Stock Loss / Write-Off</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Select Product */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Product *
            </label>
            <select
              value={selectedItemId}
              onChange={e => handleItemChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
            >
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku}) | In Stock: {item.stock} {item.unit}
                </option>
              ))}
            </select>
          </div>

          {currentItem && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Current Stock:</span>{' '}
                <span className="font-mono font-bold text-slate-900">
                  {currentItem.stock} {currentItem.unit}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Cost Basis:</span>{' '}
                <span className="font-mono font-bold text-slate-900">
                  {formatMoney(currentItem.costPrice)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Retail Price:</span>{' '}
                <span className="font-mono font-bold text-slate-900">
                  {formatMoney(currentItem.sellingPrice)}
                </span>
              </div>
            </div>
          )}

          {/* Mode 1: Restock specific inputs */}
          {mode === 'RESTOCK' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Quantity to Add *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Unit Purchase Cost
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">
                      {formatMoney(0)[0]}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={unitCost}
                      onChange={e => setUnitCost(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Supplier / Vendor Name (Optional)
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                  placeholder="e.g. Roasters Wholesale, Bakery Depot"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                <span>Total Restock Purchase Value:</span>
                <span className="font-mono font-bold tabular-nums">
                  {formatMoney(restockCostTotal)}
                </span>
              </div>
            </div>
          ) : (
            /* Mode 2: Loss / Write-off specific inputs */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Quantity to Write Off *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={currentItem?.stock || 999}
                    required
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Loss Category *
                  </label>
                  <select
                    value={lossType}
                    onChange={e => setLossType(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="DAMAGE">Damaged / Broken</option>
                    <option value="EXPIRED">Expired / Stale</option>
                    <option value="SHRINKAGE">Theft / Shrinkage</option>
                    <option value="INTERNAL_USE">Internal Staff Use</option>
                    <option value="AUDIT_CORRECTION">Stock Recount Discrepancy</option>
                  </select>
                </div>
              </div>

              {/* Financial Impact Callout */}
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
                <span>Immediate Loss Impact on P&L:</span>
                <span className="font-mono font-bold tabular-nums">
                  -{formatMoney(lossValue)}
                </span>
              </div>
            </div>
          )}

          {/* Notes / Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reason / Memo Note
            </label>
            <input
              type="text"
              value={reasonNote}
              onChange={e => setReasonNote(e.target.value)}
              placeholder={
                mode === 'RESTOCK'
                  ? 'PO #4928 delivered via freight'
                  : 'e.g. Dropped during display setup, passed sell-by date'
              }
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors disabled:opacity-50 ${
                mode === 'RESTOCK'
                  ? 'bg-slate-900 hover:bg-slate-800'
                  : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{mode === 'RESTOCK' ? 'Confirm Stock In' : 'Confirm Loss Write-Off'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
