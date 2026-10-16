import React, { useState, useEffect, useMemo } from 'react';
import { Item, ProductCategory } from '../../types';
import { usePOS } from '../../context/POSContext';
import { 
  DollarSign, 
  Package, 
  AlertCircle, 
  Trash2, 
  X, 
  Sparkles, 
  Barcode, 
  RefreshCw, 
  Percent, 
  Plus, 
  Check, 
  ShoppingCart,
  Palette,
  Loader2
} from 'lucide-react';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: Item | null;
  initialName?: string;
  initialBarcode?: string;
  initialCategory?: ProductCategory;
  allowAddToCart?: boolean;
  onItemAdded?: (item: Item, andAddToCart?: boolean) => void;
}

const DEFAULT_CATEGORIES: ProductCategory[] = [
  'Coffee & Tea',
  'Bakery & Pastries',
  'Meals & Snacks',
  'Packaged Goods',
  'Merchandise',
  'Beverages',
  'Desserts',
  'Other',
];

const POPULAR_UNITS = ['pcs', 'cup', 'slice', 'plate', 'bag', 'box', 'bottle', 'can', 'loaf', 'kg'];

const COLOR_TAGS = [
  { label: 'Slate', value: '#475569' },
  { label: 'Amber', value: '#d97706' },
  { label: 'Emerald', value: '#059669' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Rose', value: '#e11d48' },
  { label: 'Coffee Brown', value: '#78350f' },
];

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  editItem,
  initialName = '',
  initialBarcode = '',
  initialCategory,
  allowAddToCart = false,
  onItemAdded,
}) => {
  const { items, addItem, updateItem, deleteItem, formatMoney, addToCart } = usePOS();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState<string>('Coffee & Tea');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [costPrice, setCostPrice] = useState<string>('2.00');
  const [sellingPrice, setSellingPrice] = useState<string>('5.00');
  const [stock, setStock] = useState<string>('20');
  const [minStockAlert, setMinStockAlert] = useState<string>('5');
  const [unit, setUnit] = useState('pcs');
  const [description, setDescription] = useState('');
  const [colorTag, setColorTag] = useState('#475569');
  const [isTaxExempt, setIsTaxExempt] = useState(false);

  // Quick options
  const [addToCartChecked, setAddToCartChecked] = useState(allowAddToCart);
  const [addAnother, setAddAnother] = useState(false);
  const [showTargetMarginCalculator, setShowTargetMarginCalculator] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Collect all unique categories from existing catalog
  const availableCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    items.forEach(i => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set);
  }, [items]);

  // Generate random SKU based on category
  const generateSKU = (catName: string = category) => {
    const prefix = catName
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 3)
      .toUpperCase() || 'ITM';
    const num = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${num}`;
  };

  // Generate random 12-digit barcode
  const generateBarcode = () => {
    const random11 = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
    return `89${random11.slice(0, 10)}`;
  };

  useEffect(() => {
    if (editItem) {
      setName(editItem.name);
      setSku(editItem.sku);
      setBarcode(editItem.barcode || '');
      setCategory(editItem.category);
      setIsCustomCategory(!DEFAULT_CATEGORIES.includes(editItem.category as any));
      setCustomCategoryInput(editItem.category);
      setCostPrice(editItem.costPrice.toString());
      setSellingPrice(editItem.sellingPrice.toString());
      setStock(editItem.stock.toString());
      setMinStockAlert(editItem.minStockAlert.toString());
      setUnit(editItem.unit);
      setDescription(editItem.description || '');
      setColorTag(editItem.colorTag || '#475569');
      setIsTaxExempt(!!editItem.isTaxExempt);
      setAddToCartChecked(false);
    } else {
      setName(initialName || '');
      const defaultCat = initialCategory || 'Coffee & Tea';
      setCategory(defaultCat);
      setIsCustomCategory(false);
      setCustomCategoryInput('');
      setSku(generateSKU(defaultCat));
      setBarcode(initialBarcode || '');
      setCostPrice('2.00');
      setSellingPrice('5.00');
      setStock('20');
      setMinStockAlert('5');
      setUnit('pcs');
      setDescription('');
      setColorTag(COLOR_TAGS[Math.floor(Math.random() * COLOR_TAGS.length)].value);
      setIsTaxExempt(false);
      setAddToCartChecked(allowAddToCart);
    }
    setErrorMsg('');
    setConfirmDelete(false);
    setShowTargetMarginCalculator(false);
  }, [editItem, isOpen, initialName, initialBarcode, initialCategory, allowAddToCart]);

  if (!isOpen) return null;

  const costNum = parseFloat(costPrice) || 0;
  const sellNum = parseFloat(sellingPrice) || 0;
  const stockNum = parseInt(stock, 10) || 0;
  const minStockNum = parseInt(minStockAlert, 10) || 0;

  const unitProfit = sellNum - costNum;
  const marginPercent = sellNum > 0 ? (unitProfit / sellNum) * 100 : 0;
  const markupPercent = costNum > 0 ? (unitProfit / costNum) * 100 : 0;
  const totalAssetValue = costNum * stockNum;

  const applyTargetMargin = (marginPct: number) => {
    if (costNum <= 0) {
      setErrorMsg('Enter a valid Cost Price first to calculate selling price.');
      return;
    }
    if (marginPct >= 100) return;
    const computedSell = costNum / (1 - marginPct / 100);
    setSellingPrice(computedSell.toFixed(2));
  };

  const handleCategorySelectChange = (val: string) => {
    if (val === '__NEW__') {
      setIsCustomCategory(true);
      setCustomCategoryInput('');
    } else {
      setIsCustomCategory(false);
      setCategory(val);
      if (!editItem && !sku.includes('-CUSTOM-')) {
        setSku(generateSKU(val));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Item name is required.');
      return;
    }
    if (!sku.trim()) {
      setErrorMsg('SKU is required.');
      return;
    }
    if (sellNum < 0 || costNum < 0) {
      setErrorMsg('Prices must be non-negative.');
      return;
    }

    const finalCategory = isCustomCategory 
      ? (customCategoryInput.trim() || 'Other') 
      : category;

    setIsSaving(true);
    try {
      if (editItem) {
        const updated: Item = {
          ...editItem,
          name: name.trim(),
          sku: sku.trim(),
          barcode: barcode.trim() || undefined,
          category: finalCategory,
          costPrice: Number(costNum.toFixed(2)),
          sellingPrice: Number(sellNum.toFixed(2)),
          stock: Math.max(0, stockNum),
          minStockAlert: Math.max(0, minStockNum),
          unit: unit.trim() || 'pcs',
          description: description.trim() || undefined,
          colorTag,
          isTaxExempt,
        };
        await updateItem(updated);
        onClose();
      } else {
        const createdItem = await addItem({
          name: name.trim(),
          sku: sku.trim(),
          barcode: barcode.trim() || undefined,
          category: finalCategory,
          costPrice: Number(costNum.toFixed(2)),
          sellingPrice: Number(sellNum.toFixed(2)),
          stock: Math.max(0, stockNum),
          minStockAlert: Math.max(0, minStockNum),
          unit: unit.trim() || 'pcs',
          description: description.trim() || undefined,
          colorTag,
          isTaxExempt,
        });

        if (addToCartChecked) {
          addToCart(createdItem, 1);
        }

        if (onItemAdded) {
          onItemAdded(createdItem, addToCartChecked);
        }

        if (addAnother) {
          setName('');
          setSku(generateSKU(finalCategory));
          setBarcode('');
          setDescription('');
          setSuccessToast(`"${createdItem.name}" added successfully! Add your next item below.`);
          setTimeout(() => setSuccessToast(''), 3000);
        } else {
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save item.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-4 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {editItem ? 'Edit Product Item' : 'Add New Product Item'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {editItem ? 'Update pricing, barcode & inventory stock' : 'Create a new item for your cashier catalog & stock ledger'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successToast && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successToast}</span>
            </div>
          )}

          {/* Section 1: Item Identity */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Item Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                autoFocus={!editItem}
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="e.g. Vanilla Bean Scone, Caramel Latte, Mug"
                className="w-full px-3.5 py-2.5 text-sm font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Category selection & Custom Category Creator */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={isCustomCategory ? '__NEW__' : category}
                  onChange={e => handleCategorySelectChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {availableCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__NEW__">+ Add Custom Category...</option>
                </select>
              </div>

              {isCustomCategory ? (
                <div>
                  <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
                    New Category Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customCategoryInput}
                    onChange={e => setCustomCategoryInput(e.target.value)}
                    placeholder="e.g. Seasonal Specials, Grab & Go"
                    className="w-full px-3 py-2 text-xs bg-emerald-50/50 border border-emerald-300 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>SKU / Item Code</span>
                    <button
                      type="button"
                      onClick={() => setSku(generateSKU())}
                      className="text-[10px] text-slate-500 hover:text-slate-900 flex items-center gap-1 font-sans capitalize"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      <span>Auto Gen</span>
                    </button>
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    placeholder="BEV-101"
                    className="w-full px-3 py-2 text-xs font-mono font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 uppercase"
                  />
                </div>
              )}
            </div>

            {/* Barcode / UPC Field with quick generator */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Barcode className="w-3.5 h-3.5 text-slate-400" />
                    <span>Barcode / UPC (Optional)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setBarcode(generateBarcode())}
                    className="text-[10px] text-slate-500 hover:text-slate-900 flex items-center gap-1"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                    <span>Generate</span>
                  </button>
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  placeholder="Scan or enter 12-digit UPC"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Color Tag Badge for visual identification */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5 text-slate-400" />
                  <span>Color Tag</span>
                </label>
                <div className="flex items-center gap-1.5 pt-1">
                  {COLOR_TAGS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() => setColorTag(c.value)}
                      style={{ backgroundColor: c.value }}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        colorTag === c.value ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Pricing, Cost Basis & Target Margin Assist */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                <span>Financial Pricing & Margin</span>
              </span>
              <button
                type="button"
                onClick={() => setShowTargetMarginCalculator(!showTargetMarginCalculator)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                <Percent className="w-3 h-3" />
                <span>{showTargetMarginCalculator ? 'Hide Margin Helper' : 'Set by Target Margin %'}</span>
              </button>
            </div>

            {/* Target Margin Helper Drawer */}
            {showTargetMarginCalculator && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo-900">Choose Desired Gross Margin:</span>
                  <div className="flex items-center gap-1">
                    {[35, 50, 60, 70, 75].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => applyTargetMargin(pct)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                          marginPercent.toFixed(0) === pct.toString()
                            ? 'bg-indigo-700 text-white'
                            : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-indigo-700">
                  Target margin automatically solves the selling price from your purchase cost price.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cost Price (Buy/COGS) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">
                    {formatMoney(0)[0]}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={costPrice}
                    onChange={e => {
                      setCostPrice(e.target.value);
                      setErrorMsg('');
                    }}
                    className="w-full pl-7 pr-3 py-1.5 text-sm font-mono font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 tabular-nums"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Supplier purchase cost</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Selling Price (Retail) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono text-slate-400">
                    {formatMoney(0)[0]}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={sellingPrice}
                    onChange={e => {
                      setSellingPrice(e.target.value);
                      setErrorMsg('');
                    }}
                    className="w-full pl-7 pr-3 py-1.5 text-sm font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 tabular-nums"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">Customer counter price</span>
              </div>
            </div>

            {/* Live Financial Margin Calculation */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600">Unit Gross Profit / Margin:</span>
              <div className="text-right">
                <span className={`font-mono font-bold tabular-nums ${unitProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {unitProfit >= 0 ? '+' : ''}{formatMoney(unitProfit)}
                </span>
                <span className="text-slate-400 font-mono text-[11px] ml-1.5">
                  ({marginPercent.toFixed(1)}% margin | {markupPercent.toFixed(0)}% markup)
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Stock Quantity, Alerts & Unit of Measure */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Initial Stock
                </label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono font-bold text-slate-800 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Low Stock Alert
                </label>
                <input
                  type="number"
                  min="0"
                  value={minStockAlert}
                  onChange={e => setMinStockAlert(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Unit Name
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="pcs, cup"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* Quick unit pills */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[10px] text-slate-400 mr-1">Quick Units:</span>
              {POPULAR_UNITS.map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    unit === u
                      ? 'bg-slate-900 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Description & Tax Status */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Description & Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Item notes, origin, dietary tags, recipe details"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600 select-none cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isTaxExempt}
                onChange={e => setIsTaxExempt(e.target.checked)}
                className="rounded text-slate-900 focus:ring-slate-900"
              />
              <span>Item is tax-exempt (no sales tax charged)</span>
            </label>
          </div>

          {/* Calculated Total Inventory Cost Asset Value */}
          <div className="p-3 bg-slate-100/80 rounded-lg flex items-center justify-between text-xs text-slate-600">
            <span>Total Inventory Value of Initial Stock:</span>
            <span className="font-mono font-bold text-slate-900 tabular-nums">
              {formatMoney(totalAssetValue)}
            </span>
          </div>

          {/* Add-To-Cart option (when opened from POS register) & Add-Another Checkbox */}
          {!editItem && (
            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700">
              {allowAddToCart && (
                <label className="flex items-center gap-2 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addToCartChecked}
                    onChange={e => setAddToCartChecked(e.target.checked)}
                    className="rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span className="flex items-center gap-1 text-slate-900">
                    <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Add to current sale immediately</span>
                  </span>
                </label>
              )}
              <label className="flex items-center gap-2 font-medium cursor-pointer ml-auto">
                <input
                  type="checkbox"
                  checked={addAnother}
                  onChange={e => setAddAnother(e.target.checked)}
                  className="rounded text-slate-900 focus:ring-slate-900"
                />
                <span>Add another item after saving</span>
              </label>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
            <div>
              {editItem && (
                confirmDelete ? (
                  <div className="flex items-center gap-1.5 animate-in fade-in">
                    <span className="text-xs text-rose-600 font-medium">Permanently delete?</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteItem(editItem.id);
                        onClose();
                      }}
                      className="px-2.5 py-1 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors shadow-xs"
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Item</span>
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>{editItem ? 'Save Item Changes' : 'Create & Save Item'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
