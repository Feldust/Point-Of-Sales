import React from 'react';
import { Order } from '../../types';
import { usePOS } from '../../context/POSContext';
import { Printer, CheckCircle2, X } from 'lucide-react';

interface ReceiptModalProps {
  order: Order | null;
  onClose: () => void;
  onNewSale?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose, onNewSale }) => {
  const { settings, formatMoney } = usePOS();

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const marginPercent = order.subtotal > 0 
    ? ((order.grossProfit / (order.subtotal - order.discountTotal)) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-semibold text-sm">Sale Completed</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thermal Receipt Paper Card */}
        <div className="p-6 bg-slate-100/60 max-h-[70vh] overflow-y-auto">
          <div 
            id="printable-receipt"
            className="bg-white p-6 shadow-sm border border-slate-200 rounded-lg text-slate-800 text-xs font-mono leading-relaxed"
          >
            {/* Header */}
            <div className="text-center pb-4 border-b border-dashed border-slate-300">
              <h2 className="text-base font-bold tracking-tight text-slate-900 uppercase">
                {settings.storeName}
              </h2>
              {settings.storeTagline && (
                <p className="text-[11px] text-slate-500 mt-0.5">{settings.storeTagline}</p>
              )}
              <p className="text-[11px] text-slate-500 mt-1">{settings.address}</p>
              <p className="text-[11px] text-slate-500">Tel: {settings.phone}</p>
              {settings.receiptHeader && (
                <p className="text-[11px] text-slate-600 mt-2 italic font-sans">
                  {settings.receiptHeader}
                </p>
              )}
            </div>

            {/* Meta */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-semibold text-slate-900">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span>{new Date(order.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier:</span>
                <span>{order.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span>{order.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment:</span>
                <span className="font-semibold">{order.paymentMethod.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-2">
              <div className="grid grid-cols-12 text-slate-500 font-semibold border-b border-slate-200 pb-1">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-4 text-right">Total</span>
              </div>
              {order.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 items-start py-0.5">
                  <div className="col-span-6 pr-1">
                    <span className="font-medium text-slate-900 block truncate">{item.itemName}</span>
                    <span className="text-[10px] text-slate-400">@ {formatMoney(item.unitPrice)}</span>
                  </div>
                  <span className="col-span-2 text-center tabular-nums">{item.quantity}</span>
                  <span className="col-span-4 text-right font-medium tabular-nums text-slate-900">
                    {formatMoney(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal:</span>
                <span className="tabular-nums font-medium">{formatMoney(order.subtotal)}</span>
              </div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Discount:</span>
                  <span className="tabular-nums">-{formatMoney(order.discountTotal)}</span>
                </div>
              )}
              {order.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Tax ({order.taxPercent}%):</span>
                  <span className="tabular-nums">{formatMoney(order.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>TOTAL:</span>
                <span className="tabular-nums">{formatMoney(order.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600 pt-1">
                <span>Amount Paid:</span>
                <span className="tabular-nums">{formatMoney(order.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Change:</span>
                <span className="tabular-nums font-semibold">{formatMoney(order.changeDue)}</span>
              </div>
            </div>

            {/* Internal Financial Snapshot for Cashier */}
            <div className="my-2 p-2 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-600 space-y-0.5">
              <div className="flex justify-between font-sans">
                <span className="text-slate-500">Order COGS:</span>
                <span className="tabular-nums font-mono">{formatMoney(order.totalCOGS)}</span>
              </div>
              <div className="flex justify-between font-sans">
                <span className="text-emerald-700 font-semibold">Gross Profit:</span>
                <span className="tabular-nums font-mono text-emerald-700 font-bold">
                  +{formatMoney(order.grossProfit)} ({marginPercent}%)
                </span>
              </div>
            </div>

            {/* Footer */}
            {settings.receiptFooter && (
              <div className="text-center pt-3 text-[11px] text-slate-500 font-sans">
                <p>{settings.receiptFooter}</p>
                <p className="mt-2 text-[10px] text-slate-400">Powered by OmniPOS</p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={() => {
              onClose();
              if (onNewSale) onNewSale();
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
          >
            <span>Next Sale</span>
          </button>
        </div>
      </div>
    </div>
  );
};
