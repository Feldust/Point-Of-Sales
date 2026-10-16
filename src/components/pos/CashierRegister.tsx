import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { Item, Order } from '../../types';
import { OrderCart } from './OrderCart';
import { CheckoutModal } from './CheckoutModal';
import { ReceiptModal } from './ReceiptModal';
import { AddItemModal } from '../inventory/AddItemModal';
import { Search, Barcode, Plus, AlertCircle, ShoppingCart } from 'lucide-react';

export const CashierRegister: React.FC = () => {
  const { items, addToCart, cart, formatMoney } = usePOS();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [barcodeFeedback, setBarcodeFeedback] = useState<{ message: string; notFoundBarcode?: string } | null>(null);

  // Modals state
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Quick Add Item from Register
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItemPrefill, setNewItemPrefill] = useState<{ name?: string; barcode?: string; category?: string }>({});

  // Dynamic Categories from catalog
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.category) set.add(i.category);
    });
    return ['All', ...Array.from(set)];
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        (item.barcode && item.barcode.includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  // Handle barcode / fast SKU entry
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const query = barcodeInput.trim().toLowerCase();
    const matched = items.find(
      i => i.barcode?.toLowerCase() === query || i.sku.toLowerCase() === query
    );

    if (matched) {
      if (matched.stock <= 0) {
        setBarcodeFeedback({ message: `"${matched.name}" is out of stock.` });
      } else {
        addToCart(matched);
        setBarcodeFeedback({ message: `Added "${matched.name}" to cart` });
        setBarcodeInput('');
      }
    } else {
      setBarcodeFeedback({ 
        message: `No item found with barcode/SKU "${barcodeInput}".`,
        notFoundBarcode: barcodeInput.trim() 
      });
    }
  };

  const handleQuickAddFromSearch = () => {
    setNewItemPrefill({ name: searchQuery.trim(), barcode: '' });
    setIsAddItemOpen(true);
  };

  const handleQuickAddFromBarcode = (scannedCode: string) => {
    setNewItemPrefill({ name: '', barcode: scannedCode });
    setIsAddItemOpen(true);
    setBarcodeFeedback(null);
  };

  const totalCartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 min-w-0">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[620px]">
        {/* Left Column: Catalog & Item Selection */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {/* Top Controls: Search, Barcode Scan, and Quick Add Item */}
          <div className="p-4 border-b border-slate-200 bg-white space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              {/* Search text */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search item name, SKU, or category..."
                  className="w-full pl-9 pr-14 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Barcode / SKU Scan Input */}
              <form onSubmit={handleBarcodeSubmit} className="relative sm:w-60">
                <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  placeholder="Scan SKU / Barcode"
                  className="w-full pl-9 pr-14 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 px-2 py-1 text-[11px] font-medium bg-slate-200 hover:bg-slate-300 text-slate-700 rounded transition-colors"
                >
                  Enter
                </button>
              </form>

              {/* Primary "+ Add Item" Button right from Cashier Screen */}
              <button
                type="button"
                onClick={() => {
                  setNewItemPrefill({});
                  setIsAddItemOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-all whitespace-nowrap active:scale-[0.98]"
                title="Add a new product item directly from cashier register"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Barcode feedback banner with interactive prompt */}
            {barcodeFeedback && (
              <div className="text-xs px-3.5 py-2 bg-slate-100 text-slate-800 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 animate-in fade-in">
                <span>{barcodeFeedback.message}</span>
                {barcodeFeedback.notFoundBarcode ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickAddFromBarcode(barcodeFeedback.notFoundBarcode!)}
                      className="px-2.5 py-1 text-xs font-bold bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add this barcode as new item</span>
                    </button>
                    <button 
                      onClick={() => setBarcodeFeedback(null)} 
                      className="text-slate-400 hover:text-slate-600 text-xs px-1"
                    >
                      Dismiss
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setBarcodeFeedback(null)} 
                    className="text-slate-400 hover:text-slate-600 text-xs px-1"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            )}

            {/* Category Segmented Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    selectedCategory === category
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid View */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  {searchQuery ? `No item named "${searchQuery}"` : 'No items match your filter'}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  {searchQuery 
                    ? 'Would you like to create this item right now and add it to your catalog?'
                    : 'Try selecting a different category or click Add Item.'}
                </p>
                {/* Instant "Add this item" CTA */}
                <button
                  type="button"
                  onClick={handleQuickAddFromSearch}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>{searchQuery ? `Add "${searchQuery}" as New Item` : 'Add New Item to Catalog'}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredItems.map(item => {
                  const isOutOfStock = item.stock <= 0;
                  const isLowStock = item.stock > 0 && item.stock <= item.minStockAlert;
                  const marginPercent = item.sellingPrice > 0 ? ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100 : 0;
                  const inCartQty = cart.find(ci => ci.item.id === item.id)?.quantity || 0;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => addToCart(item)}
                      className={`relative flex flex-col justify-between text-left p-3.5 rounded-xl border transition-all ${
                        isOutOfStock
                          ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                          : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-xs active:scale-[0.98]'
                      }`}
                    >
                      {/* In-cart indicator badge */}
                      {inCartQty > 0 && (
                        <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded-md tabular-nums shadow-xs">
                          {inCartQty} in cart
                        </span>
                      )}

                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                          {item.colorTag && (
                            <span 
                              className="w-2 h-2 rounded-full shrink-0" 
                              style={{ backgroundColor: item.colorTag }} 
                            />
                          )}
                          <span className="font-mono">{item.sku}</span>
                          <span aria-hidden="true">|</span>
                          <span className="truncate">{item.category}</span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight">
                          {item.name}
                        </h3>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-end justify-between">
                        <div>
                          <span className="text-sm font-extrabold text-slate-900 tabular-nums font-mono block">
                            {formatMoney(item.sellingPrice)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Cost: {formatMoney(item.costPrice)} ({marginPercent.toFixed(0)}%)
                          </span>
                        </div>

                        {/* Stock status indicator */}
                        <div className="text-right">
                          <span
                            className={`text-[11px] font-semibold tabular-nums font-mono block ${
                              isOutOfStock
                                ? 'text-rose-600'
                                : isLowStock
                                ? 'text-amber-600'
                                : 'text-slate-600'
                            }`}
                          >
                            {isOutOfStock ? '0 in stock' : `${item.stock} ${item.unit}`}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Cart Summary (desktop) */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 h-full">
          <OrderCart onCheckout={() => setIsCheckoutOpen(true)} />
        </div>
      </div>

      {/* Floating Bottom Bar for Mobile Viewports */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-30">
        <button
          onClick={() => setShowMobileCart(true)}
          className="w-full flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-xl shadow-xl font-medium text-sm"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
            <span>Order Cart</span>
            <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-xs font-bold rounded-full tabular-nums">
              {totalCartUnits}
            </span>
          </div>
          <span className="font-mono font-bold">
            View Cart
          </span>
        </button>
      </div>

      {/* Mobile Cart Sheet/Modal */}
      {showMobileCart && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end p-2">
          <div className="bg-white rounded-t-2xl max-h-[85vh] h-full flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3 bg-slate-100 flex justify-end">
              <button
                onClick={() => setShowMobileCart(false)}
                className="px-3 py-1 text-xs font-semibold text-slate-600 bg-white rounded-md border"
              >
                Close Cart
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <OrderCart
                onCheckout={() => {
                  setShowMobileCart(false);
                  setIsCheckoutOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Item Modal from Register */}
      <AddItemModal
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        initialName={newItemPrefill.name}
        initialBarcode={newItemPrefill.barcode}
        initialCategory={newItemPrefill.category}
        allowAddToCart={true}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={order => {
          setIsCheckoutOpen(false);
          setCompletedOrder(order);
        }}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        order={completedOrder}
        onClose={() => setCompletedOrder(null)}
      />
    </div>
  );
};
