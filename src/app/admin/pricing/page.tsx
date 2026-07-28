'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import { Tag, Save, CheckCircle, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';

interface ServicePrice {
  id: string;
  serviceKey: string;
  name: string;
  unit: string;
  pricePaise: number;
  isEnabled: boolean;
}

export default function AdminPricingPage() {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState<{ displayName: string } | null>(null);
  const [prices, setPrices] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPricingData();
  }, []);

  const loadPricingData = async () => {
    try {
      setLoading(true);
      const authRes = await fetch('/api/admin/me');
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push('/admin/login');
        return;
      }
      setCurrentAdmin(authData.admin);

      const pricingRes = await fetch('/api/admin/pricing');
      const pricingData = await pricingRes.json();
      if (pricingRes.ok) {
        setPrices(pricingData.prices || []);
        const initialMap: Record<string, string> = {};
        pricingData.prices.forEach((p: ServicePrice) => {
          initialMap[p.serviceKey] = (p.pricePaise / 100).toFixed(2);
        });
        setEditValues(initialMap);
      }
    } catch (err) {
      console.error('Error loading pricing page:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (serviceKey: string, val: string) => {
    setEditValues((prev) => ({ ...prev, [serviceKey]: val }));
  };

  const handleSavePrice = async (serviceKey: string) => {
    setMessage(null);
    setSavingKey(serviceKey);
    try {
      const priceRupees = editValues[serviceKey];
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceKey, priceRupees }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save price.');
      }

      setMessage(`Saved price for ${serviceKey} successfully.`);
      loadPricingData();
    } catch (err: any) {
      alert(err.message || 'Error saving price.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggleEnabled = async (serviceKey: string, currentEnabled: boolean) => {
    setMessage(null);
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceKey, isEnabled: !currentEnabled }),
      });

      if (!res.ok) {
        throw new Error('Failed to toggle service.');
      }

      loadPricingData();
    } catch (err: any) {
      alert(err.message || 'Error toggling service.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminNavbar displayName={currentAdmin?.displayName} />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Pricing Management</h1>
              <p className="text-xs text-slate-400">
                Edit service prices. New prices apply immediately to new customer orders.
              </p>
            </div>
          </div>

          {message && (
            <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 rounded-xl p-3 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Loading service prices...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {prices.map((srv) => (
                <div
                  key={srv.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-slate-100">{srv.name}</h3>
                      <p className="text-[11px] font-mono text-slate-500">{srv.unit}</p>
                    </div>
                    <button
                      onClick={() => handleToggleEnabled(srv.serviceKey, srv.isEnabled)}
                      className="text-slate-400 hover:text-slate-200 transition"
                      title={srv.isEnabled ? 'Disable Service' : 'Enable Service'}
                    >
                      {srv.isEnabled ? (
                        <ToggleRight className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-600" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">
                        ₹
                      </span>
                      <input
                        type="number"
                        step="0.50"
                        min="0"
                        value={editValues[srv.serviceKey] ?? ''}
                        onChange={(e) => handlePriceChange(srv.serviceKey, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      onClick={() => handleSavePrice(srv.serviceKey)}
                      disabled={savingKey === srv.serviceKey}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center space-x-1.5 transition"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingKey === srv.serviceKey ? 'Saving...' : 'Save'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
