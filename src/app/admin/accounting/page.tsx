'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  FileText,
  User,
  Plus,
  AlertTriangle,
  CheckCircle,
  Package,
  Layers,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface Purchase {
  id: string;
  itemName: string;
  category: string;
  quantity: number;
  totalCostPaise: number;
  notes: string | null;
  purchasedBy: string;
  createdAt: string;
}

interface AdminStat {
  displayName: string;
  ordersAccepted: number;
  ordersCompleted: number;
  pagesPrinted: number;
  revenuePaise: number;
  expensesPaise: number;
}

interface ChartPoint {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
  pages: number;
}

const PRESET_CONSUMABLES = [
  { name: 'Printer Ink', category: 'Ink', icon: '🖨️' },
  { name: 'Paper (A4 Rim)', category: 'Paper', icon: '📄' },
  { name: 'Stapler Pin', category: 'Hardware', icon: '📌' },
  { name: 'Photo Sheet', category: 'Paper', icon: '🖼️' },
  { name: 'Glass Sheet', category: 'Hardware', icon: '🔍' },
  { name: 'Chart Paper', category: 'Paper', icon: '📊' },
  { name: 'Spiral Binding Coils', category: 'Binding', icon: '🌀' },
];

export default function AdminAccountingPage() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [summary, setSummary] = useState({
    totalRevenueRupees: '0.00',
    totalExpensesRupees: '0.00',
    netProfitRupees: '0.00',
    totalPagesPrinted: 0,
    costPerPageRupees: '0.00',
  });

  const [adminStats, setAdminStats] = useState<AdminStat[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('Consumable');
  const [quantity, setQuantity] = useState(1);
  const [totalCostRupees, setTotalCostRupees] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  const checkAdminAndFetch = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/admin/me');
      if (!meRes.ok) {
        router.push('/admin/login');
        return;
      }
      const meData = await meRes.json();
      setAdminName(meData.admin?.displayName || meData.admin?.username || 'Admin');

      await fetchAccountingData();
    } catch (err) {
      console.error('Accounting load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountingData = async () => {
    try {
      const res = await fetch('/api/admin/accounting');
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary);
        setAdminStats(data.adminStats || []);
        setChartData(data.chartData || []);
        setPurchases(data.purchases || []);
      }
    } catch (err) {
      console.error('Fetch accounting error:', err);
    }
  };

  const handleSelectPreset = (preset: { name: string; category: string }) => {
    setItemName(preset.name);
    setCategory(preset.category);
  };

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!itemName.trim()) {
      setErrorMessage('Please enter or select a consumable item name.');
      return;
    }

    const cost = parseFloat(totalCostRupees);
    if (isNaN(cost) || cost < 0) {
      setErrorMessage('Please enter a valid total cost amount in ₹.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: itemName.trim(),
          category,
          quantity,
          totalCostRupees: cost,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to log purchase');
      }

      setSuccessMessage(`Logged purchase: ${itemName} (₹${cost.toFixed(2)}) by ${adminName}`);
      setItemName('');
      setCategory('Consumable');
      setQuantity(1);
      setTotalCostRupees('');
      setNotes('');

      await fetchAccountingData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error logging purchase.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm animate-pulse">Loading Financial & Control Analytics...</p>
      </div>
    );
  }

  // Calculate max values for bar chart scaling
  const maxVal = Math.max(
    10,
    ...chartData.map((d) => Math.max(d.revenue, d.expenses))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminNavbar displayName={adminName} />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
              <span>Financial Control & Accounting Log</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Real-time revenue, material expense tracking, profit margin control, and admin breakdown.
            </p>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Permanent Expense Ledger Active</span>
          </div>
        </div>

        {/* Top Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
              <span>Amount Received (Revenue)</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-emerald-400">
              ₹{summary.totalRevenueRupees}
            </div>
            <p className="text-[11px] text-slate-500">From paid & completed customer orders</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
              <span>Materials Purchased (Expenses)</span>
              <ShoppingCart className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-rose-400">
              ₹{summary.totalExpensesRupees}
            </div>
            <p className="text-[11px] text-slate-500">Ink, Paper, Pins, Photo/Glass Sheets, etc.</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
              <span>Profit Gained</span>
              <DollarSign className="w-4 h-4 text-indigo-400" />
            </div>
            <div
              className={`text-2xl font-mono font-bold ${
                parseFloat(summary.netProfitRupees) >= 0
                  ? 'text-indigo-400'
                  : 'text-rose-500'
              }`}
            >
              ₹{summary.netProfitRupees}
            </div>
            <p className="text-[11px] text-slate-500">Revenue minus material expenses</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
            <div className="flex justify-between items-center text-slate-400 text-xs font-semibold">
              <span>Cost Per Page (Est.)</span>
              <FileText className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-mono font-bold text-amber-400">
              ₹{summary.costPerPageRupees}
            </div>
            <p className="text-[11px] text-slate-500">
              {summary.totalPagesPrinted} total pages printed
            </p>
          </div>
        </div>

        {/* VISUAL CONTROL CHART */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                <span>CONTROL CHART — Revenue vs Expenses vs Profit</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Visual timeline showing daily business performance and profit control.
              </p>
            </div>

            <div className="flex items-center space-x-4 text-xs font-mono">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-300">Revenue</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-slate-300">Expenses</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-slate-300">Profit</span>
              </div>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
              No daily transaction records yet. Once orders are completed or expenses are logged, your visual control chart will display here.
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 px-2 overflow-x-auto">
                {chartData.map((pt, idx) => {
                  const revHeight = Math.max(6, Math.round((pt.revenue / maxVal) * 160));
                  const expHeight = Math.max(6, Math.round((pt.expenses / maxVal) * 160));

                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center flex-1 min-w-[50px] group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-12 bg-slate-900 border border-slate-700 text-white text-[10px] p-1.5 rounded shadow-xl opacity-0 group-hover:opacity-100 transition z-10 pointer-events-none whitespace-nowrap font-mono">
                        <div>Rev: ₹{pt.revenue.toFixed(2)}</div>
                        <div>Exp: ₹{pt.expenses.toFixed(2)}</div>
                        <div>Profit: ₹{pt.profit.toFixed(2)}</div>
                      </div>

                      <div className="w-full flex justify-center items-end gap-1 h-40">
                        {/* Revenue Bar */}
                        <div
                          style={{ height: `${revHeight}px` }}
                          className="w-3.5 bg-emerald-500 rounded-t transition-all hover:bg-emerald-400"
                          title={`Revenue: ₹${pt.revenue}`}
                        />
                        {/* Expense Bar */}
                        <div
                          style={{ height: `${expHeight}px` }}
                          className="w-3.5 bg-rose-500 rounded-t transition-all hover:bg-rose-400"
                          title={`Expenses: ₹${pt.expenses}`}
                        />
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono mt-2 truncate w-full text-center">
                        {pt.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* ADMIN PERFORMANCE BREAKDOWN */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <User className="w-5 h-5 text-indigo-400" />
            <span>Admin Performance Breakdown (Barathwaj vs Thamizaruvi)</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminStats.map((st, idx) => (
              <div
                key={idx}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-indigo-300 flex items-center space-x-1.5">
                    <User className="w-4 h-4 text-indigo-400" />
                    <span>Admin: {st.displayName}</span>
                  </span>
                  <span className="text-xs font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded">
                    {st.ordersAccepted} Orders Accepted
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                  <div className="bg-slate-900 p-2 rounded-lg text-center">
                    <div className="text-[10px] text-slate-400">Pages Printed</div>
                    <div className="font-bold text-white mt-0.5">{st.pagesPrinted}</div>
                  </div>

                  <div className="bg-slate-900 p-2 rounded-lg text-center">
                    <div className="text-[10px] text-slate-400">Revenue Generated</div>
                    <div className="font-bold text-emerald-400 mt-0.5">
                      ₹{(st.revenuePaise / 100).toFixed(2)}
                    </div>
                  </div>

                  <div className="bg-slate-900 p-2 rounded-lg text-center">
                    <div className="text-[10px] text-slate-400">Consumables Logged</div>
                    <div className="font-bold text-rose-400 mt-0.5">
                      ₹{(st.expensesPaise / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* LOG NEW CONSUMABLE PURCHASE FORM */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Package className="w-5 h-5 text-indigo-400" />
              <span>Log Consumables & Material Expenses</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select or type a consumable purchase (Ink, Paper, Stapler Pins, Photo Sheet, Glass Sheet, Chart Paper). Entries are permanently saved.
            </p>
          </div>

          {/* Quick Preset Selector Chips */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Quick Select Consumable Preset:</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_CONSUMABLES.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center space-x-1.5 transition ${
                    itemName === preset.name
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {errorMessage && (
            <div className="bg-rose-950 border border-rose-800 text-rose-200 rounded-xl p-3 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-950 border border-emerald-800 text-emerald-200 rounded-xl p-3 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleAddPurchase} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Item Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Printer Ink / A4 Paper Rim"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="Ink">Ink / Cartridge</option>
                <option value="Paper">Paper / Sheets</option>
                <option value="Hardware">Hardware / Staples / Glass</option>
                <option value="Binding">Binding Supplies</option>
                <option value="Other">Other Consumable</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                max={999}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">
                Total Cost (₹) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="e.g. 450.00"
                value={totalCostRupees}
                onChange={(e) => setTotalCostRupees(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Notes / Supplier</label>
              <input
                type="text"
                placeholder="e.g. Bought from Store A"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{saving ? 'Logging...' : 'Save Purchase Entry'}</span>
              </button>
            </div>
          </form>
        </section>

        {/* PERMANENT PURCHASE HISTORY LOG TABLE */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span>Permanent Expense & Consumable Log ({purchases.length})</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">Never auto-deleted</span>
          </div>

          {purchases.length === 0 ? (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
              No consumable purchases logged yet. Use the form above to log printer ink, paper, stapler pins, etc.
            </div>
          ) : (
            <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Qty</th>
                    <th className="py-3 px-4">Total Cost</th>
                    <th className="py-3 px-4">Purchased By</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-900/50 transition">
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">{p.itemName}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{p.quantity}</td>
                      <td className="py-3 px-4 font-mono font-bold text-rose-400">
                        ₹{(p.totalCostPaise / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-medium text-sky-400">{p.purchasedBy}</td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">{p.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
