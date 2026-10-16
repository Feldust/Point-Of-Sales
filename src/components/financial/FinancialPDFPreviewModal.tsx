import React from 'react';
import { StoreSettings } from '../../types';
import { Printer, Download, X, CheckCircle2 } from 'lucide-react';
import { generateFinancialPDF } from '../../utils/pdfExport';

interface FinancialPDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeframe: string;
  settings: StoreSettings;
  metrics: {
    grossSales: number;
    discountsGiven: number;
    netSalesRevenue: number;
    totalCOGS: number;
    grossProfit: number;
    grossMarginPercent: number;
    totalOPEX: number;
    totalInventoryLosses: number;
    netProfitOrLoss: number;
    netProfitMarginPercent: number;
    expenseByCategory: Record<string, number>;
    topProducts: Array<{
      name: string;
      category: string;
      unitsSold: number;
      revenue: number;
      cogs: number;
      profit: number;
    }>;
    lossDetails: Array<{
      id: string;
      itemName: string;
      type: string;
      quantityChange: number;
      financialImpact: number;
      timestamp: string;
      reasonNote?: string;
    }>;
  };
  formatMoney: (amount: number) => string;
}

export const FinancialPDFPreviewModal: React.FC<FinancialPDFPreviewModalProps> = ({
  isOpen,
  onClose,
  timeframe,
  settings,
  metrics,
  formatMoney,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    generateFinancialPDF({
      timeframe,
      generatedAt: new Date().toLocaleString(),
      settings,
      metrics,
    });
  };

  const pctOfRev = (amt: number) => {
    if (metrics.netSalesRevenue <= 0) return '0.0%';
    return `${((amt / metrics.netSalesRevenue) * 100).toFixed(1)}%`;
  };

  const isNetProfitable = metrics.netProfitOrLoss >= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">Official Financial Statement (PDF Preview)</span>
            <span className="text-xs text-slate-500 font-mono">({timeframe})</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .PDF File</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Paper View */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-slate-200/60">
          <div
            id="printable-financial-report"
            className="max-w-[800px] mx-auto bg-white p-8 sm:p-12 shadow-md border border-slate-300 rounded-sm text-slate-900 text-xs font-sans leading-relaxed"
          >
            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-5 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                    {settings.storeName}
                  </h1>
                  {settings.storeTagline && (
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{settings.storeTagline}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">{settings.address}</p>
                  <p className="text-xs text-slate-500">Tel: {settings.phone}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-slate-900 text-white font-mono text-[11px] font-bold tracking-wider uppercase mb-1">
                    Income Statement
                  </span>
                  <div className="text-xs text-slate-500 space-y-0.5 font-mono">
                    <div>Reporting Period: <strong>{timeframe}</strong></div>
                    <div>Generated: {new Date().toLocaleDateString()}</div>
                    <div>Currency: {settings.currency}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Executive KPI Grid */}
            <div className="grid grid-cols-4 gap-3 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Net Revenue</span>
                <span className="text-base font-extrabold font-mono text-slate-900 tabular-nums">
                  {formatMoney(metrics.netSalesRevenue)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gross Profit</span>
                <span className="text-base font-extrabold font-mono text-emerald-700 tabular-nums">
                  +{formatMoney(metrics.grossProfit)}
                </span>
                <span className="text-[10px] text-emerald-600 font-mono block">
                  {metrics.grossMarginPercent.toFixed(1)}% margin
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total OPEX & Loss</span>
                <span className="text-base font-extrabold font-mono text-rose-700 tabular-nums">
                  -{formatMoney(metrics.totalOPEX + metrics.totalInventoryLosses)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  {isNetProfitable ? 'Net Profit' : 'Net Loss'}
                </span>
                <span className={`text-base font-extrabold font-mono tabular-nums ${isNetProfitable ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isNetProfitable ? '+' : ''}{formatMoney(metrics.netProfitOrLoss)}
                </span>
                <span className="text-[10px] text-slate-500 font-mono block">
                  {metrics.netProfitMarginPercent.toFixed(1)}% ROS
                </span>
              </div>
            </div>

            {/* Formal Accounting Table */}
            <div className="mb-8">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 pb-1 border-b border-slate-300">
                Statement of Operations & Financial Performance
              </h2>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-800 text-slate-600 font-bold uppercase text-[10px]">
                    <th className="py-2 pr-4">Account Line Item</th>
                    <th className="py-2 px-3 text-right">Schedule</th>
                    <th className="py-2 px-3 text-right">% of Net Revenue</th>
                    <th className="py-2 pl-4 text-right">Amount ({settings.currency})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Revenue */}
                  <tr className="bg-slate-100/70 font-bold text-slate-900">
                    <td colSpan={4} className="py-1.5 px-2 text-[11px] uppercase tracking-wider">
                      1. Operating Revenue
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pl-4 pr-4 text-slate-700">Gross Sales Volume</td>
                    <td className="py-1.5 px-3 text-right text-slate-400 font-mono text-[11px]">Sch. A-1</td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-500">{pctOfRev(metrics.grossSales)}</td>
                    <td className="py-1.5 pl-4 text-right font-mono tabular-nums text-slate-900">{formatMoney(metrics.grossSales)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pl-4 pr-4 text-slate-700">Less: Promotional Discounts & Allowances</td>
                    <td className="py-1.5 px-3 text-right text-slate-400 font-mono text-[11px]">Sch. A-2</td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-amber-700">-{pctOfRev(metrics.discountsGiven)}</td>
                    <td className="py-1.5 pl-4 text-right font-mono tabular-nums text-amber-700">-{formatMoney(metrics.discountsGiven)}</td>
                  </tr>
                  <tr className="font-bold border-t border-slate-300 bg-slate-50/50">
                    <td className="py-2 pl-4 text-slate-900">Net Sales Revenue</td>
                    <td className="py-2 px-3 text-right text-slate-400"></td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-900">100.0%</td>
                    <td className="py-2 pl-4 text-right font-mono tabular-nums text-slate-900">{formatMoney(metrics.netSalesRevenue)}</td>
                  </tr>

                  {/* COGS */}
                  <tr className="bg-slate-100/70 font-bold text-slate-900">
                    <td colSpan={4} className="py-1.5 px-2 text-[11px] uppercase tracking-wider">
                      2. Cost of Goods Sold (COGS)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pl-4 pr-4 text-slate-700">Direct Inventory Purchase Cost of Sold Goods</td>
                    <td className="py-1.5 px-3 text-right text-slate-400 font-mono text-[11px]">Sch. B-1</td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-500">-{pctOfRev(metrics.totalCOGS)}</td>
                    <td className="py-1.5 pl-4 text-right font-mono tabular-nums text-slate-700">-{formatMoney(metrics.totalCOGS)}</td>
                  </tr>
                  <tr className="font-bold border-t border-slate-300 bg-emerald-50/60 text-emerald-900">
                    <td className="py-2 pl-4">GROSS OPERATING PROFIT</td>
                    <td className="py-2 px-3 text-right text-emerald-700 font-mono text-[11px]">Margin</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-800">{metrics.grossMarginPercent.toFixed(1)}%</td>
                    <td className="py-2 pl-4 text-right font-mono tabular-nums text-emerald-800">+{formatMoney(metrics.grossProfit)}</td>
                  </tr>

                  {/* OPEX */}
                  <tr className="bg-slate-100/70 font-bold text-slate-900">
                    <td colSpan={4} className="py-1.5 px-2 text-[11px] uppercase tracking-wider">
                      3. Operating Expenses (OPEX)
                    </td>
                  </tr>
                  {Object.entries(metrics.expenseByCategory).map(([cat, amt]) => (
                    <tr key={cat}>
                      <td className="py-1.5 pl-4 pr-4 text-slate-700">{cat.replace('_', ' ')}</td>
                      <td className="py-1.5 px-3 text-right text-slate-400 font-mono text-[11px]">OPEX</td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-500">-{pctOfRev(amt)}</td>
                      <td className="py-1.5 pl-4 text-right font-mono tabular-nums text-slate-700">-{formatMoney(amt)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t border-slate-300 bg-slate-50/50">
                    <td className="py-2 pl-4 text-slate-900">Total Operating Expenses</td>
                    <td className="py-2 px-3 text-right text-slate-400"></td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-rose-700">-{pctOfRev(metrics.totalOPEX)}</td>
                    <td className="py-2 pl-4 text-right font-mono tabular-nums text-rose-700">-{formatMoney(metrics.totalOPEX)}</td>
                  </tr>

                  {/* Stock Losses */}
                  <tr className="bg-slate-100/70 font-bold text-slate-900">
                    <td colSpan={4} className="py-1.5 px-2 text-[11px] uppercase tracking-wider">
                      4. Extraordinary Inventory Losses & Shrinkage
                    </td>
                  </tr>
                  {metrics.lossDetails.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-1.5 pl-4 text-slate-400 italic">None recorded in this period</td>
                    </tr>
                  ) : (
                    metrics.lossDetails.map(l => (
                      <tr key={l.id}>
                        <td className="py-1.5 pl-4 pr-4 text-slate-700">
                          {l.itemName} ({l.type.replace('_', ' ')} | {Math.abs(l.quantityChange)} units)
                        </td>
                        <td className="py-1.5 px-3 text-right text-slate-400 font-mono text-[11px]">Loss</td>
                        <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-500">-{pctOfRev(l.financialImpact)}</td>
                        <td className="py-1.5 pl-4 text-right font-mono tabular-nums text-rose-700">-{formatMoney(l.financialImpact)}</td>
                      </tr>
                    ))
                  )}
                  <tr className="font-bold border-t border-slate-300 bg-slate-50/50">
                    <td className="py-2 pl-4 text-slate-900">Total Inventory Losses</td>
                    <td className="py-2 px-3 text-right text-slate-400"></td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-rose-700">-{pctOfRev(metrics.totalInventoryLosses)}</td>
                    <td className="py-2 pl-4 text-right font-mono tabular-nums text-rose-700">-{formatMoney(metrics.totalInventoryLosses)}</td>
                  </tr>

                  {/* Net Operating Profit / Loss */}
                  <tr className={`font-black text-sm border-t-2 border-slate-900 border-b-4 border-double ${
                    isNetProfitable ? 'border-emerald-800 bg-emerald-100/70 text-emerald-950' : 'border-rose-800 bg-rose-100/70 text-rose-950'
                  }`}>
                    <td className="py-3 pl-4 uppercase tracking-wider">
                      {isNetProfitable ? '5. Net Operating Profit' : '5. Net Operating Loss'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-xs">
                      {isNetProfitable ? 'Profitable' : 'Deficit'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">
                      {metrics.netProfitMarginPercent.toFixed(1)}%
                    </td>
                    <td className="py-3 pl-4 text-right font-mono tabular-nums text-base">
                      {isNetProfitable ? '+' : ''}{formatMoney(metrics.netProfitOrLoss)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Product Performance Section */}
            <div className="mb-8">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 pb-1 border-b border-slate-200">
                Schedule of Product Profit Contribution (Top Performers)
              </h3>
              <table className="w-full text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600 font-semibold uppercase text-[10px]">
                    <th className="py-1.5 pr-2"># Product Item</th>
                    <th className="py-1.5 px-2">Category</th>
                    <th className="py-1.5 px-2 text-center">Units</th>
                    <th className="py-1.5 px-2 text-right">Revenue</th>
                    <th className="py-1.5 px-2 text-right">COGS</th>
                    <th className="py-1.5 px-2 text-right">Gross Profit</th>
                    <th className="py-1.5 pl-2 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.topProducts.slice(0, 7).map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-1.5 pr-2 font-medium text-slate-900">{idx + 1}. {p.name}</td>
                      <td className="py-1.5 px-2 text-slate-500">{p.category}</td>
                      <td className="py-1.5 px-2 text-center font-mono tabular-nums">{p.unitsSold}</td>
                      <td className="py-1.5 px-2 text-right font-mono tabular-nums">{formatMoney(p.revenue)}</td>
                      <td className="py-1.5 px-2 text-right font-mono tabular-nums text-slate-500">{formatMoney(p.cogs)}</td>
                      <td className="py-1.5 px-2 text-right font-mono tabular-nums font-semibold text-emerald-800">+{formatMoney(p.profit)}</td>
                      <td className="py-1.5 pl-2 text-right font-mono tabular-nums">{p.revenue > 0 ? `${((p.profit / p.revenue) * 100).toFixed(1)}%` : '0%'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Certification / Sign-off Footer */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-[11px] text-slate-500">
              <div>
                <p className="font-semibold text-slate-800 mb-1">Prepared By:</p>
                <p className="font-mono">{settings.cashierName || 'Management'} (Lead Operator)</p>
                <div className="mt-6 border-b border-slate-400 w-48"></div>
                <p className="text-[10px] text-slate-400 mt-1">Authorized Signature</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-800 mb-1">Audit Status:</p>
                <p className="text-emerald-700 font-semibold flex items-center justify-end gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Balanced & Reconciled</span>
                </p>
                <p className="text-[10px] text-slate-400 mt-7">OmniPOS Certified Ledger v1.0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
