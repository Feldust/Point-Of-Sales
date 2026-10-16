import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { PaymentMethod, Order } from '../../types';
import { CreditCard, Banknote, QrCode, User, FileText, Check, AlertCircle, X, Loader2 } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { 
    cart, 
    cartGrandTotal, 
    cartSubtotal, 
    cartDiscountTotal, 
    cartTaxAmount, 
    cartTotalCOGS, 
    cartEstimatedProfit, 
    processCheckout, 
    formatMoney 
  } = usePOS();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [amountPaidInput, setAmountPaidInput] = useState<string>(cartGrandTotal.toString());
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update amount paid default when grand total changes
  React.useEffect(() => {
    setAmountPaidInput(cartGrandTotal.toFixed(2));
  }, [cartGrandTotal, paymentMethod]);

  const amountPaidNumber = parseFloat(amountPaidInput) || 0;
  const changeDue = Math.max(0, amountPaidNumber - cartGrandTotal);
  const isInsufficient = paymentMethod === 'CASH' && amountPaidNumber < cartGrandTotal;

  // Quick cash preset amounts
  const cashSuggestions = useMemo(() => {
    const total = cartGrandTotal;
    const suggestions: number[] = [Number(total.toFixed(2))]; // Exact
    const roundedUp5 = Math.ceil(total / 5) * 5;
    if (roundedUp5 > total && !suggestions.includes(roundedUp5)) suggestions.push(roundedUp5);
    const roundedUp10 = Math.ceil(total / 10) * 10;
    if (roundedUp10 > total && !suggestions.includes(roundedUp10)) suggestions.push(roundedUp10);
    const roundedUp20 = Math.ceil(total / 20) * 20;
    if (roundedUp20 > total && !suggestions.includes(roundedUp20)) suggestions.push(roundedUp20);
    const roundedUp50 = Math.ceil(total / 50) * 50;
    if (roundedUp50 > total && !suggestions.includes(roundedUp50)) suggestions.push(roundedUp50);
    const roundedUp100 = Math.ceil(total / 100) * 100;
    if (roundedUp100 > total && !suggestions.includes(roundedUp100)) suggestions.push(roundedUp100);
    return suggestions.slice(0, 5);
  }, [cartGrandTotal]);

  if (!isOpen) return null;

  const handleCompleteOrder = async () => {
    if (cart.length === 0) {
      setErrorMsg('Cart is empty.');
      return;
    }
    if (paymentMethod === 'CASH' && amountPaidNumber < cartGrandTotal) {
      setErrorMsg(`Amount paid must be at least ${formatMoney(cartGrandTotal)}.`);
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      const order = await processCheckout({
        customerName: customerName || 'Walk-in Customer',
        paymentMethod,
        amountPaid: paymentMethod === 'CASH' ? amountPaidNumber : cartGrandTotal,
        notes,
      });
      onSuccess(order);
    } catch (err: any) {
      setErrorMsg(err.message || 'Checkout failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const marginPercent = cartSubtotal > 0 
    ? ((cartEstimatedProfit / (cartSubtotal - cartDiscountTotal)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Finalize Payment</h2>
            <p className="text-xs text-slate-500">
              {cart.reduce((sum, i) => sum + i.quantity, 0)} items in transaction
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Total Due Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400 block">
                Total Due
              </span>
              <span className="text-3xl font-extrabold tabular-nums tracking-tight font-mono">
                {formatMoney(cartGrandTotal)}
              </span>
            </div>
            <div className="text-right text-xs text-slate-300 space-y-0.5">
              <div>Subtotal: <span className="tabular-nums font-mono">{formatMoney(cartSubtotal)}</span></div>
              {cartDiscountTotal > 0 && (
                <div className="text-amber-400">Discount: <span className="tabular-nums font-mono">-{formatMoney(cartDiscountTotal)}</span></div>
              )}
              {cartTaxAmount > 0 && (
                <div>Tax: <span className="tabular-nums font-mono">{formatMoney(cartTaxAmount)}</span></div>
              )}
              <div className="text-emerald-400 font-semibold pt-1 border-t border-slate-700">
                Profit: <span className="tabular-nums font-mono">+{formatMoney(cartEstimatedProfit)} ({marginPercent}%)</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block">
              Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  paymentMethod === 'CASH'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <Banknote className="w-5 h-5 mb-1" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CREDIT_CARD')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  paymentMethod === 'CREDIT_CARD'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1" />
                <span>Credit Card</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('QRIS_DIGITAL')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  paymentMethod === 'QRIS_DIGITAL'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <QrCode className="w-5 h-5 mb-1" />
                <span>QR / Digital</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('DEBIT_CARD')}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  paymentMethod === 'DEBIT_CARD'
                    ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1" />
                <span>Debit Card</span>
              </button>
            </div>
          </div>

          {/* Cash Inputs & Change Calculator */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">Cash Received</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {cashSuggestions.map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAmountPaidInput(amt.toFixed(2))}
                      className="px-2.5 py-1 text-xs font-mono font-medium rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors"
                    >
                      {formatMoney(amt)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">
                  {formatMoney(0)[0]}
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={amountPaidInput}
                  onChange={e => {
                    setAmountPaidInput(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full pl-8 pr-4 py-2.5 text-lg font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent tabular-nums"
                  placeholder="0.00"
                />
              </div>

              {/* Change Display */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-xs font-medium text-slate-600">Change to Return:</span>
                <span 
                  className={`text-lg font-bold font-mono tabular-nums ${
                    isInsufficient ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {isInsufficient ? 'Insufficient Cash' : formatMoney(changeDue)}
                </span>
              </div>
            </div>
          )}

          {/* Customer & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Customer Name</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Order Notes (Optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Table 4, extra hot, etc."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isInsufficient || isSubmitting}
            onClick={handleCompleteOrder}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white shadow-xs transition-all ${
              isInsufficient || isSubmitting
                ? 'bg-slate-400 cursor-not-allowed opacity-70'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99]'
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>Complete Sale ({formatMoney(cartGrandTotal)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
