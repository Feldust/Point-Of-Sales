import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { Item } from '../../types';
import { AddItemModal } from './AddItemModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { 
  Plus, 
  Search, 
  AlertTriangle, 
  PlusCircle, 
  MinusCircle, 
  Edit2, 
  Trash2, 
  Copy, 
  Check, 
  History,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const { items, stockAdjustments, deleteItem, duplicateItem, formatMoney } = usePOS();

  // Tab: 'catalog' | 'history'
  const [subTab, setSubTab] = useState<'catalog' | 'history'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockModalItem, setStockModalItem] = useState<Item | null>(null);
  const [stockModalMode, setStockModalMode] = useState<'RESTOCK' | 'LOSS'>('RESTOCK');
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  // KPI Calculations
  const { totalAssetValue, potentialRetailValue, lowStockCount, potentialProfit } = useMemo(() => {
    let assetVal = 0;
    let retailVal = 0;
    let lowCount = 0;
    items.forEach(i => {
      assetVal += i.costPrice * i.stock;
      retailVal += i.sellingPrice * i.stock;
      if (i.stock <= i.minStockAlert) lowCount++;
    });
    return {
      totalAssetValue: assetVal,
      potentialRetailValue: retailVal,
      lowStockCount: lowCount,
      potentialProfit: retailVal - assetVal,
    };
  }, [items]);

  // Filter Items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.includes(q));
      const matchesLowStock = !filterLowStockOnly || item.stock <= item.minStockAlert;
      return matchesCategory && matchesSearch && matchesLowStock;
    });
  }, [items, selectedCategory, searchQuery, filterLowStockOnly]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => set.add(i.category));
    return ['All', ...Array.from(set)];
  }, [items]);

  const handleOpenRestock = (item?: Item) => {
    setStockModalItem(item || null);
    setStockModalMode('RESTOCK');
    setIsStockModalOpen(true);
  };

  const handleOpenLoss = (item?: Item) => {
    setStockModalItem(item || null);
    setStockModalMode('LOSS');
    setIsStockModalOpen(true);
  };

  const handleDuplicate = async (item: Item) => {
    const duplicated = await duplicateItem(item.id);
    if (duplicated) {
      setFeedbackToast(`Duplicated "${item.name}" as "${duplicated.name}"`);
      setTimeout(() => setFeedbackToast(''), 3000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Top Banner & KPI Stat Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Catalog Items
          </span>
          <span className="text-2xl font-extrabold text-slate-900 tabular-nums font-mono mt-1 block">
            {items.length}
          </span>
          <span className="text-xs text-slate-400 mt-0.5 block">
            Across {Math.max(1, categories.length - 1)} categories
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Inventory Value (Cost)
          </span>
          <span className="text-2xl font-extrabold text-slate-900 tabular-nums font-mono mt-1 block">
            {formatMoney(totalAssetValue)}
          </span>
          <span className="text-xs text-slate-400 mt-0.5 block">
            Capital tied up in stock
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Potential Retail Value
          </span>
          <span className="text-2xl font-extrabold text-slate-900 tabular-nums font-mono mt-1 block">
            {formatMoney(potentialRetailValue)}
          </span>
          <span className="text-xs text-emerald-600 font-medium mt-0.5 block">
            +{formatMoney(potentialProfit)} potential profit
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Low Stock Alerts
          </span>
          <span className={`text-2xl font-extrabold tabular-nums font-mono mt-1 block ${
            lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'
          }`}>
            {lowStockCount}
          </span>
          <span className="text-xs text-slate-400 mt-0.5 block">
            {lowStockCount > 0 ? 'Requires restocking soon' : 'All items well stocked'}
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* Navigation Sub-Tabs & Action Buttons */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg w-fit">
            <button
              onClick={() => setSubTab('catalog')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                subTab === 'catalog'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Product Catalog & Stock ({items.length})
            </button>
            <button
              onClick={() => setSubTab('history')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                subTab === 'history'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Stock Movement Log ({stockAdjustments.length})</span>
            </button>
          </div>

          {/* Action Button Row */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => handleOpenRestock()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span>Input Stocks</span>
            </button>
            <button
              onClick={() => handleOpenLoss()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors shadow-xs"
            >
              <MinusCircle className="w-4 h-4 text-rose-600" />
              <span>Record Loss / Write-Off</span>
            </button>
            {/* Main Add New Item Button */}
            <button
              onClick={() => {
                setEditingItem(null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-sm active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Item</span>
            </button>
          </div>
        </div>

        {subTab === 'catalog' ? (
          <div>
            {/* Filter Toolbar */}
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter by item name, SKU, or barcode..."
                  className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
                />
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'All' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs text-slate-600 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterLowStockOnly}
                    onChange={e => setFilterLowStockOnly(e.target.checked)}
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span>Low Stock Only ({lowStockCount})</span>
                </label>
              </div>
            </div>

            {/* Catalog Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Item & SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Cost (COGS)</th>
                    <th className="py-3 px-4 text-right">Retail Price</th>
                    <th className="py-3 px-4 text-right">Margin %</th>
                    <th className="py-3 px-4 text-center">Stock Level</th>
                    <th className="py-3 px-4 text-right">Stock Valuation</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <AlertTriangle className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                        <span className="font-semibold text-slate-700 block mb-1">
                          No items match your criteria
                        </span>
                        <p className="text-xs text-slate-400 mb-3">
                          {searchQuery ? `No results for "${searchQuery}"` : 'Your catalog is empty.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(null);
                            setIsAddModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add New Item Now</span>
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => {
                      const isLow = item.stock <= item.minStockAlert;
                      const isOut = item.stock === 0;
                      const margin = item.sellingPrice > 0 ? ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100 : 0;
                      const valuation = item.costPrice * item.stock;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              {item.colorTag && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: item.colorTag }}
                                />
                              )}
                              <div>
                                <div className="font-semibold text-slate-900">{item.name}</div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {item.sku} {item.barcode ? `| ${item.barcode}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-[11px] text-slate-700">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                            {formatMoney(item.costPrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                            {formatMoney(item.sellingPrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">
                            <span className={margin >= 50 ? 'text-emerald-700 font-semibold' : 'text-slate-600'}>
                              {margin.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span
                                className={`font-mono font-bold tabular-nums ${
                                  isOut
                                    ? 'text-rose-600'
                                    : isLow
                                    ? 'text-amber-600'
                                    : 'text-slate-800'
                                }`}
                              >
                                {item.stock} {item.unit}
                              </span>
                              {isOut && <span className="text-[10px] text-rose-500 font-medium">Out of stock</span>}
                              {!isOut && isLow && (
                                <span className="text-[10px] text-amber-500 font-medium">
                                  Low Stock (Min: {item.minStockAlert})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-800">
                            {formatMoney(valuation)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                title="Duplicate / Clone Item"
                                onClick={() => handleDuplicate(item)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                title="Input stocks (Restock)"
                                onClick={() => handleOpenRestock(item)}
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                title="Record loss / write-off"
                                onClick={() => handleOpenLoss(item)}
                                className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              >
                                <MinusCircle className="w-3.5 h-3.5" />
                              </button>
                              <button
                                title="Edit Item Details"
                                onClick={() => {
                                  setEditingItem(item);
                                  setIsAddModalOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Delete Item"
                                aria-label={`Delete ${item.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setItemToDelete(item);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* SubTab: History & Losses Log */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Quantity</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Financial Loss / Impact</th>
                  <th className="py-3 px-4">Reason & Supplier Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockAdjustments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No stock movements recorded yet.
                    </td>
                  </tr>
                ) : (
                  stockAdjustments.map(adj => {
                    const isRestock = adj.type === 'RESTOCK';
                    return (
                      <tr key={adj.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {new Date(adj.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">{adj.itemName}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 font-semibold ${
                            isRestock ? 'text-emerald-700' : 'text-rose-700'
                          }`}>
                            {isRestock ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            <span>{adj.type.replace('_', ' ')}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono tabular-nums font-bold">
                          <span className={adj.quantityChange > 0 ? 'text-emerald-700' : 'text-rose-700'}>
                            {adj.quantityChange > 0 ? `+${adj.quantityChange}` : adj.quantityChange}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                          {formatMoney(adj.unitCost)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                          {adj.financialImpact > 0 ? (
                            <span className="text-rose-700">-{formatMoney(adj.financialImpact)} (Loss)</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>{adj.reasonNote || '-'}</div>
                          {adj.supplier && (
                            <div className="text-[10px] text-slate-400 font-medium">
                              Supplier: {adj.supplier}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        editItem={editingItem}
      />

      {/* Stock Adjustment / Restock / Loss Modal */}
      <StockAdjustmentModal
        isOpen={isStockModalOpen}
        onClose={() => {
          setIsStockModalOpen(false);
          setStockModalItem(null);
        }}
        preselectedItem={stockModalItem}
        initialMode={stockModalMode}
      />

      {/* Delete Item Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Delete Menu Item</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-900 font-semibold font-mono">"{itemToDelete.name}"</strong>? This will remove it from the catalog and register.
              </p>
              {itemToDelete.stock > 0 && (
                <div className="mt-3 text-[11px] text-amber-800 bg-amber-50 rounded-lg p-2.5 border border-amber-200 text-left">
                  Note: This item currently has <span className="font-semibold">{itemToDelete.stock} {itemToDelete.unit}</span> in stock.
                </div>
              )}
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteItem(itemToDelete.id);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors"
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
