import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  FileText, 
  Printer, 
  Search, 
  ShieldAlert, 
  Award,
  AlertTriangle
} from 'lucide-react';
import { generateFinancialPDF } from '../../utils/pdfExport';
import { FinancialPDFPreviewModal } from './FinancialPDFPreviewModal';

type ActiveTableView = 'STATEMENT' | 'PRODUCTS' | 'LOSSES';
type ProductSortField = 'profit' | 'revenue' | 'unitsSold' | 'margin';

export const FinancialView: React.FC = () => {
  const { orders, expenses, stockAdjustments, formatMoney, settings } = usePOS();
  const [timeframe, setTimeframe] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<ActiveTableView>('STATEMENT');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Product matrix search & sorting
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('All');
  const [productSortBy, setProductSortBy] = useState<ProductSortField>('profit');
  const [sortAsc, setSortAsc] = useState(false);

  // Timeframe filter logic
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - 7 * 86400000;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const isWithinTimeframe = (timestamp: string) => {
    const t = new Date(timestamp).getTime();
    if (timeframe === 'TODAY') return t >= startOfToday;
    if (timeframe === 'WEEK') return t >= startOfWeek;
    if (timeframe === 'MONTH') return t >= startOfMonth;
    return true;
  };

  const relevantOrders = useMemo(() => {
    return orders.filter(o => isWithinTimeframe(o.timestamp));
  }, [orders, timeframe]);

  const relevantExpenses = useMemo(() => {
    return expenses.filter(e => isWithinTimeframe(e.timestamp));
  }, [expenses, timeframe]);

  const relevantAdjustments = useMemo(() => {
    return stockAdjustments.filter(a => isWithinTimeframe(a.timestamp));
  }, [stockAdjustments, timeframe]);

  // Financial Metrics Calculation
  const metrics = useMemo(() => {
    let grossSales = 0;
    let discountsGiven = 0;
    let refundsTotal = 0;
    let totalCOGS = 0;

    relevantOrders.forEach(o => {
      if (o.status === 'COMPLETED') {
        grossSales += o.subtotal;
        discountsGiven += o.discountTotal;
        totalCOGS += o.totalCOGS;
      } else if (o.status === 'REFUNDED') {
        refundsTotal += o.grandTotal;
      }
    });

    const netSalesRevenue = Math.max(0, grossSales - discountsGiven);
    const grossProfit = netSalesRevenue - totalCOGS;
    const grossMarginPercent = netSalesRevenue > 0 ? (grossProfit / netSalesRevenue) * 100 : 0;
    const totalOPEX = relevantExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalInventoryLosses = relevantAdjustments.reduce(
      (sum, a) => sum + (a.type !== 'RESTOCK' ? a.financialImpact : 0),
      0
    );
    const netProfitOrLoss = grossProfit - totalOPEX - totalInventoryLosses;
    const netProfitMarginPercent = netSalesRevenue > 0 ? (netProfitOrLoss / netSalesRevenue) * 100 : 0;

    // Operating expenses grouped
    const expenseByCategory: Record<string, number> = {};
    relevantExpenses.forEach(e => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
    });

    // Product breakdown
    const productStats: Record<string, {
      name: string;
      category: string;
      unitsSold: number;
      revenue: number;
      cogs: number;
      profit: number;
    }> = {};

    relevantOrders.forEach(o => {
      if (o.status === 'COMPLETED') {
        o.items.forEach(item => {
          if (!productStats[item.itemId]) {
            productStats[item.itemId] = {
              name: item.itemName,
              category: item.category,
              unitsSold: 0,
              revenue: 0,
              cogs: 0,
              profit: 0,
            };
          }
          productStats[item.itemId].unitsSold += item.quantity;
          productStats[item.itemId].revenue += item.lineTotal;
          productStats[item.itemId].cogs += item.lineCOGS;
          productStats[item.itemId].profit += item.lineProfit;
        });
      }
    });

    const topProducts = Object.values(productStats).sort((a, b) => b.profit - a.profit);
    const lossDetails = relevantAdjustments.filter(a => a.type !== 'RESTOCK');

    return {
      grossSales,
      discountsGiven,
      refundsTotal,
      netSalesRevenue,
      totalCOGS,
      grossProfit,
      grossMarginPercent,
      totalOPEX,
      totalInventoryLosses,
      netProfitOrLoss,
      netProfitMarginPercent,
      expenseByCategory,
      topProducts,
      lossDetails,
    };
  }, [relevantOrders, relevantExpenses, relevantAdjustments]);

  // Filtered & sorted products for matrix table
  const filteredProducts = useMemo(() => {
    return metrics.topProducts
      .filter(p => {
        const matchesCategory = productCategoryFilter === 'All' || p.category === productCategoryFilter;
        const q = productSearch.toLowerCase().trim();
        const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        let diff = 0;
        if (productSortBy === 'profit') diff = b.profit - a.profit;
        else if (productSortBy === 'revenue') diff = b.revenue - a.revenue;
        else if (productSortBy === 'unitsSold') diff = b.unitsSold - a.unitsSold;
        else if (productSortBy === 'margin') {
          const marginA = a.revenue > 0 ? a.profit / a.revenue : 0;
          const marginB = b.revenue > 0 ? b.profit / b.revenue : 0;
          diff = marginB - marginA;
        }
        return sortAsc ? -diff : diff;
      });
  }, [metrics.topProducts, productSearch, productCategoryFilter, productSortBy, sortAsc]);

  const productCategories = useMemo(() => {
    const set = new Set<string>();
    metrics.topProducts.forEach(p => set.add(p.category));
    return ['All', ...Array.from(set)];
  }, [metrics.topProducts]);

  const handleExportPDF = () => {
    generateFinancialPDF({
      timeframe,
      generatedAt: new Date().toLocaleString(),
      settings,
      metrics,
    });
  };

  const isNetProfitable = metrics.netProfitOrLoss >= 0;

  const pctOfRev = (amount: number): string => {
    if (metrics.netSalesRevenue <= 0) return '0.0%';
    const pct = (amount / metrics.netSalesRevenue) * 100;
    return `${pct.toFixed(1)}%`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Financial Ledger & Profit/Loss Analysis
          </h1>
          <p className="text-xs text-slate-500">
            Certified double-entry income statement, operational expenses, inventory write-offs & net margin
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Timeframe selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg text-xs font-medium">
            <button
              onClick={() => setTimeframe('TODAY')}
              className={`px-3 py-1.5 rounded transition-colors ${
                timeframe === 'TODAY' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeframe('WEEK')}
              className={`px-3 py-1.5 rounded transition-colors ${
                timeframe === 'WEEK' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setTimeframe('MONTH')}
              className={`px-3 py-1.5 rounded transition-colors ${
                timeframe === 'MONTH' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeframe('ALL')}
              className={`px-3 py-1.5 rounded transition-colors ${
                timeframe === 'ALL' ? 'bg-white text-slate-900 font-semibold shadow-xs' : 'text-slate-600'
              }`}
            >
              All Time
            </button>
          </div>

          {/* Export PDF Statement */}
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
            title="Download Official PDF Statement"
          >
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span>Export PDF</span>
          </button>

          {/* Print / Preview PDF */}
          <button
            onClick={() => setIsPreviewModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            title="Preview and print official A4 statement"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Metric Scoreboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Profit / Loss Highlight Card */}
        <div className={`p-5 rounded-xl border shadow-xs transition-colors ${
          isNetProfitable 
            ? 'bg-emerald-950 text-white border-emerald-800' 
            : 'bg-rose-950 text-white border-rose-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {isNetProfitable ? 'Net Operating Profit' : 'Net Operating Loss'}
            </span>
            {isNetProfitable ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-rose-400" />
            )}
          </div>
          <div className="mt-2 text-3xl font-extrabold tabular-nums font-mono tracking-tight">
            {isNetProfitable ? '+' : ''}{formatMoney(metrics.netProfitOrLoss)}
          </div>
          <div className="mt-1 text-xs text-slate-300 flex items-center justify-between">
            <span>Net Return: {metrics.netProfitMarginPercent.toFixed(1)}%</span>
            <span className="text-[11px] text-slate-400">Bottom Line</span>
          </div>
        </div>

        {/* Net Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Net Sales Revenue
            </span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 tabular-nums font-mono">
            {formatMoney(metrics.netSalesRevenue)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Gross {formatMoney(metrics.grossSales)} | Discounts -{formatMoney(metrics.discountsGiven)}
          </div>
        </div>

        {/* Gross Profit & Margin */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Gross Profit
            </span>
            <span className="text-xs font-mono font-bold text-emerald-700">
              {metrics.grossMarginPercent.toFixed(1)}% Margin
            </span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-700 tabular-nums font-mono">
            +{formatMoney(metrics.grossProfit)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Inventory COGS: {formatMoney(metrics.totalCOGS)}
          </div>
        </div>

        {/* Total Deductions (OPEX + Losses) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Operating Outflows
            </span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-700 tabular-nums font-mono">
            -{formatMoney(metrics.totalOPEX + metrics.totalInventoryLosses)}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            OPEX: {formatMoney(metrics.totalOPEX)} | Waste: {formatMoney(metrics.totalInventoryLosses)}
          </div>
        </div>
      </div>

      {/* View Mode Segmented Controls */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('STATEMENT')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'STATEMENT'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Income Statement (P&L Ledger Table)</span>
        </button>
        <button
          onClick={() => setActiveTab('PRODUCTS')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'PRODUCTS'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Product Profit & Margin Matrix ({metrics.topProducts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('LOSSES')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors ${
            activeTab === 'LOSSES'
              ? 'bg-white text-rose-700 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Stock Losses & Waste Log ({metrics.lossDetails.length})</span>
        </button>
      </div>

      {/* Tab 1: Formal Income Statement Table */}
      {activeTab === 'STATEMENT' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Formal Statement of Operations</span>
                <span className="text-[11px] font-normal text-slate-500 font-mono">
                  — Standard Accounting Format
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Line-by-line financial reconciliation with percentage-of-revenue contribution
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded">
                Period: {timeframe}
              </span>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1 rounded hover:bg-slate-50 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
                  <th className="py-3 px-6">Account Classification / Schedule</th>
                  <th className="py-3 px-4 text-center">Ref</th>
                  <th className="py-3 px-4 text-right">% of Net Revenue</th>
                  <th className="py-3 px-6 text-right font-mono">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 1. OPERATING REVENUE */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan={4} className="py-2.5 px-6 text-[11px] uppercase tracking-wider text-slate-800">
                    1. Operating Revenue
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 pl-10 pr-6 text-slate-700">
                    Gross In-Store & Takeaway Sales Volume
                  </td>
                  <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[11px]">Sch. 1A</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-600">{pctOfRev(metrics.grossSales)}</td>
                  <td className="py-2.5 px-6 text-right font-mono tabular-nums text-slate-900 font-medium">{formatMoney(metrics.grossSales)}</td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors text-amber-700">
                  <td className="py-2.5 pl-10 pr-6">
                    Less: Customer Discounts, Promotional Vouchers & Allowances
                  </td>
                  <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[11px]">Sch. 1B</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">-{pctOfRev(metrics.discountsGiven)}</td>
                  <td className="py-2.5 px-6 text-right font-mono tabular-nums">-{formatMoney(metrics.discountsGiven)}</td>
                </tr>
                <tr className="font-bold border-t border-slate-300 bg-slate-50/60 text-slate-900">
                  <td className="py-3 pl-8 px-6">NET SALES REVENUE</td>
                  <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">Total</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">100.0%</td>
                  <td className="py-3 px-6 text-right font-mono tabular-nums text-sm">{formatMoney(metrics.netSalesRevenue)}</td>
                </tr>

                {/* 2. COST OF GOODS SOLD */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan={4} className="py-2.5 px-6 text-[11px] uppercase tracking-wider text-slate-800">
                    2. Cost of Goods Sold (COGS)
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 pl-10 pr-6 text-slate-700">
                    Direct Inventory Purchase Cost of Sold Coffee, Food & Goods
                  </td>
                  <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[11px]">Sch. 2</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">-{pctOfRev(metrics.totalCOGS)}</td>
                  <td className="py-2.5 px-6 text-right font-mono tabular-nums text-slate-700">-{formatMoney(metrics.totalCOGS)}</td>
                </tr>
                <tr className="font-bold border-t border-slate-300 bg-emerald-50 text-emerald-900">
                  <td className="py-3 pl-8 px-6">
                    GROSS OPERATING PROFIT
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-[11px] text-emerald-700 font-semibold">
                    Gross Margin
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-800">
                    {metrics.grossMarginPercent.toFixed(1)}%
                  </td>
                  <td className="py-3 px-6 text-right font-mono tabular-nums text-sm font-bold text-emerald-800">
                    +{formatMoney(metrics.grossProfit)}
                  </td>
                </tr>

                {/* 3. OPERATING EXPENSES */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan={4} className="py-2.5 px-6 text-[11px] uppercase tracking-wider text-slate-800">
                    3. Operating Expenses (OPEX)
                  </td>
                </tr>
                {Object.keys(metrics.expenseByCategory).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-2 pl-10 text-slate-400 italic">No operational expenses logged.</td>
                  </tr>
                ) : (
                  Object.entries(metrics.expenseByCategory).map(([cat, amt]) => (
                    <tr key={cat} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2 pl-10 pr-6 text-slate-700">
                        {cat.replace('_', ' ')}
                      </td>
                      <td className="py-2 px-4 text-center text-slate-400 font-mono text-[11px]">OPEX</td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-500">-{pctOfRev(amt)}</td>
                      <td className="py-2 px-6 text-right font-mono tabular-nums text-slate-700">-{formatMoney(amt)}</td>
                    </tr>
                  ))
                )}
                <tr className="font-bold border-t border-slate-300 bg-slate-50/60 text-slate-900">
                  <td className="py-3 pl-8 px-6">Total Operating Expenses</td>
                  <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">Subtotal</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-700">-{pctOfRev(metrics.totalOPEX)}</td>
                  <td className="py-3 px-6 text-right font-mono tabular-nums text-rose-700 font-bold">-{formatMoney(metrics.totalOPEX)}</td>
                </tr>

                {/* 4. EXTRAORDINARY INVENTORY LOSSES */}
                <tr className="bg-slate-50/80 font-bold text-slate-900">
                  <td colSpan={4} className="py-2.5 px-6 text-[11px] uppercase tracking-wider text-slate-800">
                    4. Extraordinary Stock Losses & Shrinkage
                  </td>
                </tr>
                {metrics.lossDetails.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-2 pl-10 text-slate-400 italic">Zero stock loss recorded for this period.</td>
                  </tr>
                ) : (
                  metrics.lossDetails.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2 pl-10 pr-6 text-slate-700">
                        {l.itemName} ({l.type.replace('_', ' ')}: {Math.abs(l.quantityChange)} units)
                      </td>
                      <td className="py-2 px-4 text-center text-slate-400 font-mono text-[11px]">Waste</td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-500">-{pctOfRev(l.financialImpact)}</td>
                      <td className="py-2 px-6 text-right font-mono tabular-nums text-rose-700">-{formatMoney(l.financialImpact)}</td>
                    </tr>
                  ))
                )}
                <tr className="font-bold border-t border-slate-300 bg-slate-50/60 text-slate-900">
                  <td className="py-3 pl-8 px-6">Total Inventory Losses</td>
                  <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">Subtotal</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-700">-{pctOfRev(metrics.totalInventoryLosses)}</td>
                  <td className="py-3 px-6 text-right font-mono tabular-nums text-rose-700 font-bold">-{formatMoney(metrics.totalInventoryLosses)}</td>
                </tr>

                {/* 5. NET OPERATING PROFIT / LOSS (DOUBLE UNDERLINE) */}
                <tr className={`font-black text-sm border-t-2 border-slate-900 border-b-4 border-double ${
                  isNetProfitable 
                    ? 'border-emerald-800 bg-emerald-100/80 text-emerald-950' 
                    : 'border-rose-800 bg-rose-100/80 text-rose-950'
                }`}>
                  <td className="py-4 pl-8 px-6 uppercase tracking-wider">
                    {isNetProfitable ? '5. NET OPERATING PROFIT (BOTTOM LINE)' : '5. NET OPERATING LOSS (BOTTOM LINE)'}
                  </td>
                  <td className="py-4 px-4 text-center font-mono text-xs">
                    {isNetProfitable ? 'Profitable' : 'Deficit'}
                  </td>
                  <td className="py-4 px-4 text-right font-mono tabular-nums text-sm">
                    {metrics.netProfitMarginPercent.toFixed(1)}% ROS
                  </td>
                  <td className="py-4 px-6 text-right font-mono tabular-nums text-lg font-black">
                    {isNetProfitable ? '+' : ''}{formatMoney(metrics.netProfitOrLoss)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Product Matrix */}
      {activeTab === 'PRODUCTS' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-4">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Product Profit & Margin Matrix</span>
                <span className="text-xs text-slate-500 font-mono">({filteredProducts.length} items)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Detailed profitability per product unit, revenue conversion & profit margins
              </p>
            </div>
            <div className="flex items-center flex-wrap gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder="Filter product..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <select
                value={productCategoryFilter}
                onChange={e => setProductCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {productCategories.map(c => (
                  <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
                ))}
              </select>
              <div className="flex items-center gap-1 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-1">
                <span className="text-[11px] text-slate-400 px-1">Sort:</span>
                <button
                  onClick={() => {
                    if (productSortBy === 'profit') setSortAsc(!sortAsc);
                    else { setProductSortBy('profit'); setSortAsc(false); }
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${productSortBy === 'profit' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'}`}
                >
                  Profit
                </button>
                <button
                  onClick={() => {
                    if (productSortBy === 'unitsSold') setSortAsc(!sortAsc);
                    else { setProductSortBy('unitsSold'); setSortAsc(false); }
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${productSortBy === 'unitsSold' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'}`}
                >
                  Units
                </button>
                <button
                  onClick={() => {
                    if (productSortBy === 'revenue') setSortAsc(!sortAsc);
                    else { setProductSortBy('revenue'); setSortAsc(false); }
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${productSortBy === 'revenue' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'}`}
                >
                  Revenue
                </button>
                <button
                  onClick={() => {
                    if (productSortBy === 'margin') setSortAsc(!sortAsc);
                    else { setProductSortBy('margin'); setSortAsc(false); }
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium ${productSortBy === 'margin' ? 'bg-slate-900 text-white font-bold' : 'text-slate-600'}`}
                >
                  Margin %
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4"># Rank & Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Units Sold</th>
                  <th className="py-3 px-4 text-right">Gross Revenue</th>
                  <th className="py-3 px-4 text-right">Inventory COGS</th>
                  <th className="py-3 px-4 text-right">Profit Generated</th>
                  <th className="py-3 px-4 text-center">Margin %</th>
                  <th className="py-3 px-4 text-right">Store Profit Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No products found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p, idx) => {
                    const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
                    const profitShare = metrics.grossProfit > 0 ? (p.profit / metrics.grossProfit) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold font-mono text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-slate-900">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-medium">{p.category}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold tabular-nums text-slate-800">
                          {p.unitsSold}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 font-medium">
                          {formatMoney(p.revenue)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                          {formatMoney(p.cogs)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700">
                          +{formatMoney(p.profit)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-emerald-600 h-full rounded-full" 
                                style={{ width: `${Math.min(100, Math.max(0, margin))}%` }} 
                              />
                            </div>
                            <span className="font-mono tabular-nums font-semibold text-emerald-800 text-[11px]">
                              {margin.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-700">
                          {profitShare.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Losses & Shrinkage Log Table */}
      {activeTab === 'LOSSES' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-4 h-4" />
                <span>Inventory Losses, Damaged & Expired Goods Log</span>
              </h2>
              <p className="text-xs text-slate-500">
                Itemized write-offs impacting financial statement gross margins
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500">Total Write-Off Loss: </span>
              <span className="text-sm font-bold font-mono text-rose-700 tabular-nums">
                -{formatMoney(metrics.totalInventoryLosses)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4 text-center">Units Lost</th>
                  <th className="py-3 px-4 text-right">Cost Impact</th>
                  <th className="py-3 px-4">Audit Reason & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.lossDetails.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Zero stock losses recorded in this timeframe.
                    </td>
                  </tr>
                ) : (
                  metrics.lossDetails.map(loss => (
                    <tr key={loss.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(loss.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{loss.itemName}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          {loss.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold tabular-nums text-rose-700">
                        {Math.abs(loss.quantityChange)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-rose-700">
                        -{formatMoney(loss.financialImpact)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-sm truncate">
                        {loss.reasonNote || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PDF Document Preview & Print Modal */}
      <FinancialPDFPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        timeframe={timeframe}
        settings={settings}
        metrics={metrics}
        formatMoney={formatMoney}
      />
    </div>
  );
};
