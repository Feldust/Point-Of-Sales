export type ProductCategory =
  | 'Coffee & Tea'
  | 'Bakery & Pastries'
  | 'Meals & Snacks'
  | 'Packaged Goods'
  | 'Merchandise'
  | 'Beverages'
  | 'Desserts'
  | 'Other'
  | (string & {});

export interface Item {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  costPrice: number;     // Purchase / COGS cost
  sellingPrice: number;  // Retail sales price
  stock: number;         // Current stock on hand
  minStockAlert: number; // Low stock alert threshold
  unit: string;          // 'pcs', 'cup', 'box', 'kg', etc.
  description?: string;
  barcode?: string;
  colorTag?: string;     // Color badge for visual differentiation in POS grid
  isTaxExempt?: boolean; // If item is tax-exempt
  createdAt: string;
}

export interface CartItem {
  item: Item;
  quantity: number;
  discount: number; // flat discount amount per unit
  notes?: string;
  customPrice?: number;
}

export interface OrderItem {
  itemId: string;
  itemName: string;
  category: string;
  unitCost: number;     // Snapshot of cost at sale
  unitPrice: number;    // Snapshot of selling price at sale
  quantity: number;
  discount: number;     // Total discount on line
  lineTotal: number;    // (unitPrice * qty) - discount
  lineCOGS: number;     // unitCost * qty
  lineProfit: number;   // lineTotal - lineCOGS
}

export type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'QRIS_DIGITAL' | 'STORE_CREDIT';

export interface Order {
  id: string;
  orderNumber: string;
  timestamp: string; // ISO format
  items: OrderItem[];
  customerName: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discountTotal: number;
  taxPercent: number;
  taxAmount: number;
  grandTotal: number;
  totalCOGS: number;
  grossProfit: number;
  amountPaid: number;
  changeDue: number;
  status: 'COMPLETED' | 'REFUNDED';
  refundReason?: string;
  refundDate?: string;
  cashierName: string;
  notes?: string;
}

export type StockAdjustmentType = 
  | 'RESTOCK'       // Added stock from supplier
  | 'DAMAGE'        // Broken / spilled / ruined
  | 'EXPIRED'       // Passed shelf life
  | 'SHRINKAGE'     // Unaccounted / theft
  | 'INTERNAL_USE'  // Staff consumption / sampling
  | 'AUDIT_CORRECTION'; // Recount discrepancy

export interface StockAdjustment {
  id: string;
  timestamp: string;
  itemId: string;
  itemName: string;
  type: StockAdjustmentType;
  quantityChange: number; // Positive for increase, negative for reduction
  unitCost: number;
  financialImpact: number; // For losses: quantity * unitCost (positive loss value)
  reasonNote: string;
  supplier?: string;
}

export type ExpenseCategory = 
  | 'RENT'
  | 'UTILITIES'
  | 'PAYROLL'
  | 'SUPPLIES'
  | 'MARKETING'
  | 'MAINTENANCE'
  | 'TAXES_LICENSES'
  | 'MISCELLANEOUS';

export interface Expense {
  id: string;
  timestamp: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  notes?: string;
}

export interface StoreSettings {
  storeName: string;
  storeTagline: string;
  address: string;
  phone: string;
  currency: string;
  taxRatePercent: number;
  enableTax: boolean;
  receiptHeader: string;
  receiptFooter: string;
  cashierName: string;
}

export interface POSData {
  items: Item[];
  orders: Order[];
  expenses: Expense[];
  stockAdjustments: StockAdjustment[];
  settings: StoreSettings;
}
