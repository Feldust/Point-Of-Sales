import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { Order } from '../../types';
import { ReceiptModal } from '../pos/ReceiptModal';
import { 
  Receipt, 
  Search, 
  RotateCcw, 
  Printer, 
  CheckCircle, 
  XCircle, 
  AlertTriangle 
} from 'lucide-react';

export const OrdersView: React.FC = () => {
  const { orders, refundOrder, formatMoney } = usePOS();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'REFUNDED'>('ALL');
  const [timeframe, setTimeframe] = useState<'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'ALL'>('ALL');

  // Modals
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);
  const [refundModalOrder, setRefundModalOrder] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState('Customer return / order cancelled');
  const [isRefunding, setIsRefunding] = useState(false);

  // Timeframe filter logic
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfWeek = startOfToday - 7 * 86400000;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const orderTime = new Date(order.timestamp).getTime();

      // Timeframe
      if (timeframe === 'TODAY' && orderTime < startOfToday) return false;
      if (timeframe === 'YESTERDAY' && (orderTime < startOfYesterday || orderTime >= startOfToday)) return false;
      if (timeframe === 'WEEK' && orderTime < startOfWeek) return false;
      if (timeframe === 'MONTH' && orderTime < startOfMonth) return false;

      // Status
      if (statusFilter !== 'ALL' && order.status !== statusFilter) return false;

      // Search
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const matchesNum = order.orderNumber.toLowerCase().includes(q);
      const matchesCustomer = order.customerName.toLowerCase().includes(q);
      const matchesItem = order.items.some(i => i.itemName.toLowerCase().includes(q));

      return matchesNum || matchesCustomer || matchesItem;
    });
  }, [orders, timeframe, statusFilter, searchQuery, startOfToday, startOfYesterday, startOfWeek, startOfMonth]);

  // Aggregate stats for current filter
  const { totalSales, totalGrossProfit, totalCOGS, completedCount, refundedCount } = useMemo(() => {
    let sales = 0;
    let profit = 0;
    let cogs = 0;
    let completed = 0;
    let refunded = 0;

    filteredOrders.forEach(o => {
      if (o.status === 'COMPLETED') {
        sales += o.grandTotal;
        profit += o.grossProfit;
        cogs += o.totalCOGS;
        completed++;
      } else {
        refunded++;
      }
    });

    return {
      totalSales: sales,
      totalGrossProfit: profit,
      totalCOGS: cogs,
      completedCount: completed,
      refundedCount: refunded,
    };
  }, [filteredOrders]);

  const handleConfirmRefund = async () => {
    if (!refundModalOrder) return;
    setIsRefunding(true);
    try {
      await refundOrder(refundModalOrder.id, refundReason);
      setRefundModalOrder(null);
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header and Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Orders Processed
          </span>
          <span className="text-2xl font-extrabold text-slate-900 tabular-nums font-mono mt-1 block">
            {filteredOrders.length}
          </span>
          <span className="text-xs text-slate-400 mt-0.5 block">
            {completedCount} completed | {refundedCount} refunded
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Gross Sales (Revenue)
          </span>
          <span className="text-2xl font-extrabold text-slate-900 tabular-nums font-mono mt-1 block">
            {formatMoney(totalSales)}
          </span>
          <span className="text-xs text-slate-400 mt-0.5 block">
            In selected timeframe
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Cost of Goods (COGS)
          </span>
          <span className="text-2xl font-extrabold text-slate-900 tabular-nums font-mono mt-1 block">
            {formatMoney(totalCOGS)}
          </span>
          <span className="text-xs text-slate-400 mt-0.5 block">
            Direct inventory cost
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Order Gross Profit
          </span>
          <span className="text-2xl font-extrabold text-emerald-700 tabular-nums font-mono mt-1 block">
            +{formatMoney(totalGrossProfit)}
          </span>
          <span className="text-xs text-emerald-600 font-medium mt-0.5 block">
            {totalSales > 0 ? `${((totalGrossProfit / totalSales) * 100).toFixed(1)}% margin` : '0% margin'}
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search order #, customer, or items..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Timeframe selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg text-xs font-medium">
              <button
                onClick={() => setTimeframe('TODAY')}
                className={`px-2.5 py-1 rounded transition-colors ${timeframe === 'TODAY' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'}`}
              >
                Today
              </button>
              <button
                onClick={() => setTimeframe('YESTERDAY')}
                className={`px-2.5 py-1 rounded transition-colors ${timeframe === 'YESTERDAY' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'}`}
              >
                Yesterday
              </button>
              <button
                onClick={() => setTimeframe('WEEK')}
                className={`px-2.5 py-1 rounded transition-colors ${timeframe === 'WEEK' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'}`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeframe('MONTH')}
                className={`px-2.5 py-1 rounded transition-colors ${timeframe === 'MONTH' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'}`}
              >
                30 Days
              </button>
              <button
                onClick={() => setTimeframe('ALL')}
                className={`px-2.5 py-1 rounded transition-colors ${timeframe === 'ALL' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'}`}
              >
                All Time
              </button>
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-3 px-4">Order # & Date</th>
                <th className="py-3 px-4">Customer & Cashier</th>
                <th className="py-3 px-4">Items Summary</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4 text-right">Revenue</th>
                <th className="py-3 px-4 text-right">COGS</th>
                <th className="py-3 px-4 text-right">Profit</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Receipt / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Receipt className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    <span className="font-medium">No sales orders found for this view.</span>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => {
                  const isRefunded = order.status === 'REFUNDED';
                  const itemsCount = order.items.reduce((s, i) => s + i.quantity, 0);

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div className="font-bold text-slate-900 font-mono">{order.orderNumber}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {new Date(order.timestamp).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        <div className="font-semibold">{order.customerName}</div>
                        <div className="text-[11px] text-slate-400">By {order.cashierName}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-slate-800 truncate">
                          {order.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {itemsCount} {itemsCount === 1 ? 'unit' : 'units'} total
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {order.paymentMethod.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-slate-900">
                        {formatMoney(order.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                        {formatMoney(order.totalCOGS)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                        {isRefunded ? (
                          <span className="text-slate-400 line-through">
                            +{formatMoney(order.grossProfit)}
                          </span>
                        ) : (
                          <span className="text-emerald-700">
                            +{formatMoney(order.grossProfit)}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          isRefunded
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {isRefunded ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          <span>{order.status}</span>
                        </span>
                        {isRefunded && order.refundReason && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px] mx-auto mt-0.5">
                            {order.refundReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="View / Print Receipt"
                            onClick={() => setSelectedReceiptOrder(order)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {!isRefunded && (
                            <button
                              title="Process Refund"
                              onClick={() => {
                                setRefundModalOrder(order);
                                setRefundReason('Customer requested return');
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Re-Print Receipt Modal */}
      <ReceiptModal
        order={selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
      />

      {/* Process Refund Confirmation Modal */}
      {refundModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm">Confirm Refund & Restock</h3>
              </div>
              <button
                onClick={() => setRefundModalOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Refunding order <strong className="font-mono text-slate-900">{refundModalOrder.orderNumber}</strong> will:
              </p>
              <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside bg-slate-50 p-3 rounded-lg border border-slate-200">
                <li>Return all sold items back into your inventory stocks.</li>
                <li>Deduct <strong>{formatMoney(refundModalOrder.grandTotal)}</strong> from sales revenue.</li>
                <li>Revert <strong>+{formatMoney(refundModalOrder.grossProfit)}</strong> in gross profit.</li>
              </ul>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for Refund
                </label>
                <input
                  type="text"
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  placeholder="e.g. Wrong item ordered, customer cancelled"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundModalOrder(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRefunding}
                onClick={handleConfirmRefund}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-xs"
              >
                {isRefunding ? 'Processing...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
