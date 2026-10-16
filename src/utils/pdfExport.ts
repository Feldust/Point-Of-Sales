import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StoreSettings } from '../types';

interface FinancialReportData {
  timeframe: string;
  generatedAt: string;
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
}

export const generateFinancialPDF = (data: FinancialReportData) => {
  const { settings, metrics, timeframe, generatedAt } = data;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const currency = settings.currency || '$';
  const formatCur = (val: number) => {
    const formatted = Math.abs(val).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return val < 0 ? `-${currency}${formatted}` : `${currency}${formatted}`;
  };

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 80, 'F');

  // Store Name
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(settings.storeName || 'OmniPOS Store', 40, 36);

  // Subtitle / Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(
    `${settings.address ? settings.address + ' | ' : ''}Tel: ${settings.phone || 'N/A'}`,
    40,
    52
  );
  doc.text('OFFICIAL PROFIT & LOSS STATEMENT', 40, 66);

  // Right-aligned report metadata in header
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(`Timeframe: ${timeframe}`, pageWidth - 40, 36, { align: 'right' });
  doc.text(`Generated: ${generatedAt}`, pageWidth - 40, 50, { align: 'right' });
  doc.text(`Operator: ${settings.cashierName || 'Manager'}`, pageWidth - 40, 64, { align: 'right' });

  // Key Performance Indicator Summary Boxes
  const startY = 100;
  const cardWidth = (pageWidth - 80 - 30) / 4;
  const cardHeight = 50;

  const kpis = [
    { label: 'NET SALES', value: formatCur(metrics.netSalesRevenue), color: [241, 245, 249], textColor: [15, 23, 42] },
    { label: 'GROSS PROFIT', value: formatCur(metrics.grossProfit), sub: `${metrics.grossMarginPercent.toFixed(1)}% Margin`, color: [236, 253, 245], textColor: [4, 120, 87] },
    { label: 'OPEX & LOSSES', value: formatCur(metrics.totalOPEX + metrics.totalInventoryLosses), color: [254, 242, 242], textColor: [185, 28, 28] },
    { 
      label: metrics.netProfitOrLoss >= 0 ? 'NET PROFIT' : 'NET LOSS', 
      value: (metrics.netProfitOrLoss >= 0 ? '+' : '') + formatCur(metrics.netProfitOrLoss),
      sub: `${metrics.netProfitMarginPercent.toFixed(1)}% ROS`,
      color: metrics.netProfitOrLoss >= 0 ? [15, 23, 42] : [159, 18, 57],
      textColor: [255, 255, 255],
      labelColor: [226, 232, 240]
    },
  ];

  kpis.forEach((k, i) => {
    const x = 40 + i * (cardWidth + 10);
    doc.setFillColor(k.color[0], k.color[1], k.color[2]);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 4, 4, 'F');
    
    // Label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    if (k.labelColor) {
      doc.setTextColor(k.labelColor[0], k.labelColor[1], k.labelColor[2]);
    } else {
      doc.setTextColor(100, 116, 139);
    }
    doc.text(k.label, x + 8, startY + 14);

    // Value
    doc.setFontSize(12);
    doc.setTextColor(k.textColor[0], k.textColor[1], k.textColor[2]);
    doc.text(k.value, x + 8, startY + 32);

    if (k.sub) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(k.sub, x + 8, startY + 44);
    }
  });

  // Table 1: Detailed Income Statement
  const pctOfRev = (amt: number) => {
    if (metrics.netSalesRevenue <= 0) return '0.0%';
    return `${((amt / metrics.netSalesRevenue) * 100).toFixed(1)}%`;
  };

  const incomeStatementRows = [
    // Revenue
    [{ content: '1. OPERATING REVENUE', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [15, 23, 42] } }],
    ['  Gross Sales Volume', pctOfRev(metrics.grossSales), formatCur(metrics.grossSales)],
    ['  Less: Promotional Discounts & Allowances', `-${pctOfRev(metrics.discountsGiven)}`, `-${formatCur(metrics.discountsGiven)}`],
    [{ content: 'Net Sales Revenue', styles: { fontStyle: 'bold' } }, { content: '100.0%', styles: { fontStyle: 'bold' } }, { content: formatCur(metrics.netSalesRevenue), styles: { fontStyle: 'bold' } }],
    
    // COGS
    [{ content: '2. COST OF GOODS SOLD (COGS)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [15, 23, 42] } }],
    ['  Direct Inventory Costs of Sold Goods', `-${pctOfRev(metrics.totalCOGS)}`, `-${formatCur(metrics.totalCOGS)}`],
    [{ content: 'GROSS PROFIT', styles: { fontStyle: 'bold', textColor: [4, 120, 87] } }, { content: `${metrics.grossMarginPercent.toFixed(1)}%`, styles: { fontStyle: 'bold', textColor: [4, 120, 87] } }, { content: `+${formatCur(metrics.grossProfit)}`, styles: { fontStyle: 'bold', textColor: [4, 120, 87] } }],
    
    // OPEX
    [{ content: '3. OPERATING EXPENSES (OPEX)', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [15, 23, 42] } }],
    ...Object.entries(metrics.expenseByCategory).map(([cat, amt]) => [
      `  ${cat.replace('_', ' ')}`,
      `-${pctOfRev(amt)}`,
      `-${formatCur(amt)}`
    ]),
    [{ content: 'Total Operating Expenses', styles: { fontStyle: 'bold' } }, { content: `-${pctOfRev(metrics.totalOPEX)}`, styles: { fontStyle: 'bold' } }, { content: `-${formatCur(metrics.totalOPEX)}`, styles: { fontStyle: 'bold', textColor: [185, 28, 28] } }],
    
    // Losses
    [{ content: '4. EXTRAORDINARY INVENTORY LOSSES & SHRINKAGE', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [15, 23, 42] } }],
    ...metrics.lossDetails.slice(0, 5).map(l => [
      `  ${l.itemName} (${l.type.replace('_', ' ')}: ${Math.abs(l.quantityChange)})`,
      `-${pctOfRev(l.financialImpact)}`,
      `-${formatCur(l.financialImpact)}`
    ]),
    [{ content: 'Total Stock Losses & Waste', styles: { fontStyle: 'bold' } }, { content: `-${pctOfRev(metrics.totalInventoryLosses)}`, styles: { fontStyle: 'bold' } }, { content: `-${formatCur(metrics.totalInventoryLosses)}`, styles: { fontStyle: 'bold', textColor: [185, 28, 28] } }],
    
    // Net
    [{ 
      content: metrics.netProfitOrLoss >= 0 ? '5. NET OPERATING PROFIT' : '5. NET OPERATING LOSS', 
      styles: { fontStyle: 'bold', fontSize: 10, fillColor: metrics.netProfitOrLoss >= 0 ? [236, 253, 245] : [254, 242, 242], textColor: metrics.netProfitOrLoss >= 0 ? [4, 120, 87] : [185, 28, 28] } 
    }, { 
      content: `${metrics.netProfitMarginPercent.toFixed(1)}%`, 
      styles: { fontStyle: 'bold', fontSize: 10, fillColor: metrics.netProfitOrLoss >= 0 ? [236, 253, 245] : [254, 242, 242], textColor: metrics.netProfitOrLoss >= 0 ? [4, 120, 87] : [185, 28, 28] } 
    }, { 
      content: (metrics.netProfitOrLoss >= 0 ? '+' : '') + formatCur(metrics.netProfitOrLoss), 
      styles: { fontStyle: 'bold', fontSize: 10, fillColor: metrics.netProfitOrLoss >= 0 ? [236, 253, 245] : [254, 242, 242], textColor: metrics.netProfitOrLoss >= 0 ? [4, 120, 87] : [185, 28, 28] } 
    }],
  ];

  autoTable(doc, {
    startY: startY + cardHeight + 15,
    head: [['Financial Account / Line Item', '% of Revenue', 'Amount']],
    body: incomeStatementRows as any,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 80, halign: 'right' },
      2: { cellWidth: 90, halign: 'right', font: 'courier' },
    },
    margin: { left: 40, right: 40 },
  });

  // Table 2: Product Performance Ranking
  const lastTable = (doc as any).lastAutoTable;
  const nextY = lastTable ? lastTable.finalY + 15 : 450;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Product Profitability Ranking (Top Contributors)', 40, nextY);

  const productRows = metrics.topProducts.slice(0, 7).map((p, idx) => [
    `${idx + 1}. ${p.name}`,
    p.category,
    p.unitsSold.toString(),
    formatCur(p.revenue),
    formatCur(p.cogs),
    `+${formatCur(p.profit)}`,
    p.revenue > 0 ? `${((p.profit / p.revenue) * 100).toFixed(1)}%` : '0%',
  ]);

  autoTable(doc, {
    startY: nextY + 6,
    head: [['Product Item', 'Category', 'Qty', 'Revenue', 'COGS', 'Gross Profit', 'Margin']],
    body: productRows.length > 0 ? productRows : [['No sales recorded in this timeframe', '', '', '', '', '', '']],
    theme: 'striped',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 3.5,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 70 },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 55, halign: 'right' },
      4: { cellWidth: 50, halign: 'right' },
      5: { cellWidth: 60, halign: 'right', textColor: [4, 120, 87], fontStyle: 'bold' },
      6: { cellWidth: 45, halign: 'right' },
    },
    margin: { left: 40, right: 40 },
  });

  // Footer Sign-Off Section
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `OmniPOS Financial Report | ${settings.storeName} | Confidential & Internal Business Document`,
    40,
    pageHeight - 20
  );
  doc.text(
    `Page 1 of 1`,
    pageWidth - 40,
    pageHeight - 20,
    { align: 'right' }
  );

  // Trigger download
  doc.save(`financial_statement_${timeframe.toLowerCase()}_${Date.now()}.pdf`);
};
