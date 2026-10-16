import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { Trash2, Plus, Minus, Tag, ShoppingCart, X } from 'lucide-react';

interface OrderCartProps {
  onCheckout: () => void;
}

export const OrderCart: React.FC<OrderCartProps> = ({ onCheckout }) => {
  const { 
    cart, 
    updateCartQuantity, 
    setCartDiscount, 
    removeFromCart, 
    clearCart, 
    addCustomCartItem,
    cartSubtotal, 
    cartDiscountTotal, 
    cartTaxAmount, 
    cartGrandTotal, 
    cartEstimatedProfit, 
    formatMoney,
    settings 
  } = usePOS();

  const [activeDiscountItemId, setActiveDiscountItemId] = useState<string | null>(null);
  const [showCustomItemForm, setShowCustomItemForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customCost, setCustomCost] = useState('');

  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const profitMarginPercent = cartSubtotal > 0 
    ? ((cartEstimatedProfit / (cartSubtotal - cartDiscountTotal)) * 100).toFixed(1)
    : '0.0';

  const handleAddCustomLine = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(customPrice);
    if (!customName.trim() || isNaN(p) || p < 0) return;
    const c = parseFloat(customCost) || 0;
    addCustomCartItem(customName.trim(), p, c, 1);
    setCustomName('');
    setCustomPrice('');
    setCustomCost('');
    setShowCustomItemForm(false);
  };

  if (cart.length === 0 && !showCustomItemForm) {
    return (
      <div className="h-full flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-slate-500" />
            <span>Current Order</span>
          </h2>
          <button
            type="button"
            onClick={() => setShowCustomItemForm(true)}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Custom Item</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
          <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 text-slate-300">
            <ShoppingCart className="w-8 h-8" />
          </div>
          <p className="text-sm font-semibold text-slate-600">Cart is empty</p>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            Tap any item from the catalog to add it, or click "+ Custom Item" to ring up an unlisted item.
          </p>
          <button
            type="button"
            onClick={() => setShowCustomItemForm(true)}
            className="mt-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Open Item</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">Current Order</h2>
          <span className="text-xs font-mono text-slate-500">
            ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCustomItemForm(!showCustomItemForm)}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-3 h-3 text-slate-500" />
            <span>Custom</span>
          </button>
          <button
            onClick={clearCart}
            className="text-xs font-medium text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Quick Custom Item Entry Drawer */}
      {showCustomItemForm && (
        <form onSubmit={handleAddCustomLine} className="p-3 bg-amber-50/70 border-b border-amber-200 text-xs space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between font-semibold text-amber-900">
            <span>Ring Up Custom Item / Open Ring</span>
            <button
              type="button"
              onClick={() => setShowCustomItemForm(false)}
              className="text-amber-700 hover:text-amber-900"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-12 gap-2">
            <input
              type="text"
              required
              placeholder="Item name or service..."
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              className="col-span-6 px-2.5 py-1.5 bg-white border border-amber-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-700"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="Price $"
              value={customPrice}
              onChange={e => setCustomPrice(e.target.value)}
              className="col-span-3 px-2 py-1.5 bg-white border border-amber-300 rounded text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-700"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Cost $"
              value={customCost}
              onChange={e => setCustomCost(e.target.value)}
              className="col-span-3 px-2 py-1.5 bg-white border border-amber-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-700"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowCustomItemForm(false)}
              className="px-2 py-1 text-slate-500 hover:text-slate-800 text-[11px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-amber-700 text-white font-semibold rounded text-[11px] hover:bg-amber-800"
            >
              Add to Order
            </button>
          </div>
        </form>
      )}

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
        {cart.map(ci => {
          const price = ci.customPrice ?? ci.item.sellingPrice;
          const lineTotal = (price - ci.discount) * ci.quantity;
          const lineCOGS = ci.item.costPrice * ci.quantity;
          const lineProfit = lineTotal - lineCOGS;
          const isDiscounting = activeDiscountItemId === ci.item.id;

          return (
            <div key={ci.item.id} className="p-2.5 hover:bg-slate-50/60 rounded-lg transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {ci.item.colorTag && (
                      <span 
                        className="w-2 h-2 rounded-full shrink-0" 
                        style={{ backgroundColor: ci.item.colorTag }} 
                      />
                    )}
                    <h4 className="text-xs font-bold text-slate-900 truncate">
                      {ci.item.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="tabular-nums font-mono">{formatMoney(price)}</span>
                    <span aria-hidden="true">|</span>
                    <span className="text-[10px] text-slate-400">{ci.item.category}</span>
                  </div>
                </div>

                {/* Line Total & Profit */}
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-900 tabular-nums font-mono block">
                    {formatMoney(lineTotal)}
                  </span>
                  <span className="text-[10px] text-emerald-600 tabular-nums font-mono">
                    +{formatMoney(lineProfit)}
                  </span>
                </div>
              </div>

              {/* Quantity controls & item discount button */}
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateCartQuantity(ci.item.id, -1)}
                    className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 transition-transform"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-bold font-mono tabular-nums text-slate-800">
                    {ci.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCartQuantity(ci.item.id, 1)}
                    disabled={ci.quantity >= ci.item.stock && !ci.item.id.startsWith('custom-')}
                    className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveDiscountItemId(isDiscounting ? null : ci.item.id)}
                    className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors flex items-center gap-1 ${
                      ci.discount > 0
                        ? 'border-amber-300 bg-amber-50 text-amber-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    <span>{ci.discount > 0 ? `-${formatMoney(ci.discount)}` : 'Discount'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromCart(ci.item.id)}
                    className="p-1 text-slate-300 hover:text-rose-600 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* In-line discount adjustment drawer */}
              {isDiscounting && (
                <div className="mt-2 p-2 bg-slate-100/70 rounded-md border border-slate-200 text-xs flex items-center gap-2">
                  <span className="text-[11px] text-slate-600">Discount/item:</span>
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1.5 text-slate-400 font-mono text-xs">
                      {settings.currency}
                    </span>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      max={price}
                      value={ci.discount || ''}
                      onChange={e => setCartDiscount(ci.item.id, parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full pl-6 pr-2 py-1 text-xs font-mono bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveDiscountItemId(null)}
                    className="px-2 py-1 bg-slate-900 text-white text-[11px] rounded font-medium"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cart Financial Summary & Checkout Trigger */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
        <div className="space-y-1 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span className="tabular-nums font-mono">{formatMoney(cartSubtotal)}</span>
          </div>
          {cartDiscountTotal > 0 && (
            <div className="flex justify-between text-amber-700">
              <span>Item Discounts</span>
              <span className="tabular-nums font-mono">-{formatMoney(cartDiscountTotal)}</span>
            </div>
          )}
          {settings.enableTax && (
            <div className="flex justify-between text-slate-500">
              <span>Tax ({settings.taxRatePercent}%)</span>
              <span className="tabular-nums font-mono">{formatMoney(cartTaxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200/80">
            <span className="text-emerald-700 font-medium">Est. Gross Profit</span>
            <span className="tabular-nums font-mono text-emerald-700 font-semibold">
              +{formatMoney(cartEstimatedProfit)} ({profitMarginPercent}%)
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">Total</span>
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums font-mono">
              {formatMoney(cartGrandTotal)}
            </span>
          </div>
          <button
            onClick={onCheckout}
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98]"
          >
            Checkout ({formatMoney(cartGrandTotal)})
          </button>
        </div>
      </div>
    </div>
  );
};
