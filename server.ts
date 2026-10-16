import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { INITIAL_DATA } from './src/data/initialData';
import type { POSData, Item, Order, Expense, StockAdjustment, StoreSettings } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'pos_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize database with clean simple sample data if not exists
function getDB(): POSData {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.items)) {
        return parsed as POSData;
      }
    }
  } catch (err) {
    console.error('Error reading pos_db.json, recreating with defaults:', err);
  }

  // Fallback to initial simple data
  saveDB(INITIAL_DATA);
  return INITIAL_DATA;
}

function saveDB(data: POSData): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing pos_db.json:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // --- POS REST API ROUTES ---

  // 1. Get entire POS database (items, orders, expenses, adjustments, settings)
  app.get('/api/pos/data', (req, res) => {
    const db = getDB();
    res.json(db);
  });

  // 2. Overwrite entire data (e.g. from JSON import / restore)
  app.put('/api/pos/data', (req, res) => {
    const data = req.body as POSData;
    if (!data || !Array.isArray(data.items)) {
      res.status(400).json({ error: 'Invalid data format' });
      return;
    }
    saveDB(data);
    res.json({ success: true, data });
  });

  // 3. Reset to clean sample defaults
  app.post('/api/pos/reset', (req, res) => {
    saveDB(INITIAL_DATA);
    res.json({ success: true, data: INITIAL_DATA });
  });

  // 4. Clear all transactional data
  app.post('/api/pos/clear', (req, res) => {
    const db = getDB();
    const cleared: POSData = {
      items: [],
      orders: [],
      expenses: [],
      stockAdjustments: [],
      settings: db.settings || INITIAL_DATA.settings,
    };
    saveDB(cleared);
    res.json({ success: true, data: cleared });
  });

  // 5. Add new Item
  app.post('/api/pos/items', (req, res) => {
    const db = getDB();
    const itemData = req.body;
    const newItem: Item = {
      ...itemData,
      id: itemData.id || `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: itemData.createdAt || new Date().toISOString(),
    };
    db.items.unshift(newItem);
    saveDB(db);
    res.json(newItem);
  });

  // 6. Update Item
  app.put('/api/pos/items/:id', (req, res) => {
    const { id } = req.params;
    const db = getDB();
    const index = db.items.findIndex(i => i.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    db.items[index] = { ...db.items[index], ...req.body, id };
    saveDB(db);
    res.json(db.items[index]);
  });

  // 7. Delete Item
  app.delete('/api/pos/items/:id', (req, res) => {
    const { id } = req.params;
    const db = getDB();
    db.items = db.items.filter(i => i.id !== id);
    saveDB(db);
    res.json({ success: true, id });
  });

  // 8. Create Order (and deduct inventory stocks automatically on server)
  app.post('/api/pos/orders', (req, res) => {
    const db = getDB();
    const order = req.body as Order;
    if (!order || !Array.isArray(order.items)) {
      res.status(400).json({ error: 'Invalid order structure' });
      return;
    }

    // Deduct stock for catalog items
    order.items.forEach(orderItem => {
      const match = db.items.find(i => i.id === orderItem.itemId);
      if (match) {
        match.stock = Math.max(0, match.stock - orderItem.quantity);
      }
    });

    db.orders.unshift(order);
    saveDB(db);
    res.json({ success: true, order, items: db.items });
  });

  // 9. Refund Order (and restore inventory stocks automatically on server)
  app.post('/api/pos/orders/:id/refund', (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const db = getDB();
    const order = db.orders.find(o => o.id === id);

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.status === 'REFUNDED') {
      res.json({ success: true, order, items: db.items });
      return;
    }

    // Restore stock
    order.items.forEach(orderItem => {
      const match = db.items.find(i => i.id === orderItem.itemId);
      if (match) {
        match.stock += orderItem.quantity;
      }
    });

    order.status = 'REFUNDED';
    order.refundReason = reason || 'Customer refund';
    order.refundDate = new Date().toISOString();

    saveDB(db);
    res.json({ success: true, order, items: db.items });
  });

  // 10. Stock Adjustment (Restock or Loss/Damage)
  app.post('/api/pos/adjustments', (req, res) => {
    const db = getDB();
    const adjustment = req.body as StockAdjustment;

    if (!adjustment || !adjustment.itemId) {
      res.status(400).json({ error: 'Invalid adjustment data' });
      return;
    }

    const item = db.items.find(i => i.id === adjustment.itemId);
    if (item) {
      item.stock = Math.max(0, item.stock + adjustment.quantityChange);
      if (adjustment.type === 'RESTOCK' && adjustment.unitCost > 0) {
        item.costPrice = adjustment.unitCost;
      }
    }

    db.stockAdjustments.unshift(adjustment);
    saveDB(db);
    res.json({ success: true, adjustment, item, items: db.items });
  });

  // 11. Add Operating Expense
  app.post('/api/pos/expenses', (req, res) => {
    const db = getDB();
    const expense = req.body as Expense;
    const newExp: Expense = {
      ...expense,
      id: expense.id || `exp-${Date.now()}`,
      timestamp: expense.timestamp || new Date().toISOString(),
    };
    db.expenses.unshift(newExp);
    saveDB(db);
    res.json(newExp);
  });

  // 12. Delete Expense
  app.delete('/api/pos/expenses/:id', (req, res) => {
    const { id } = req.params;
    const db = getDB();
    db.expenses = db.expenses.filter(e => e.id !== id);
    saveDB(db);
    res.json({ success: true, id });
  });

  // 13. Update Store Settings
  app.put('/api/pos/settings', (req, res) => {
    const db = getDB();
    db.settings = { ...db.settings, ...req.body };
    saveDB(db);
    res.json(db.settings);
  });

  // --- VITE MIDDLEWARE / STATIC FILES ---
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OmniPOS Backend Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
