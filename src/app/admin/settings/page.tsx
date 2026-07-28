'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import { Settings, Save, CheckCircle, ToggleLeft, ToggleRight, MapPin, CreditCard } from 'lucide-react';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState<{ displayName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [upiId, setUpiId] = useState('barathwaj@upi');
  const [pickupInstructions, setPickupInstructions] = useState('CampusCopier Desk, Main Student Center');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    try {
      setLoading(true);
      const authRes = await fetch('/api/admin/me');
      const authData = await authRes.json();
      if (!authRes.ok || !authData.authenticated) {
        router.push('/admin/login');
        return;
      }
      setCurrentAdmin(authData.admin);

      const settingsRes = await fetch('/api/admin/settings');
      const settingsData = await settingsRes.json();
      if (settingsRes.ok) {
        setAcceptingOrders(settingsData.acceptingOrders);
        setUpiId(settingsData.upiId);
        setPickupInstructions(settingsData.pickupInstructions);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptingOrders,
          upiId,
          pickupInstructions,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save settings.');
      }

      setMessage('Store settings updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminNavbar displayName={currentAdmin?.displayName} />

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Store Settings</h1>
              <p className="text-xs text-slate-400">
                Manage business availability, payment details, and pickup notes.
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
              Loading settings...
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Accepting Orders Switch */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-100">
                    Accepting Orders
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {acceptingOrders
                      ? '🟢 Store is currently accepting new customer orders.'
                      : '🔴 Store is temporarily closed. Existing orders remain accessible.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAcceptingOrders(!acceptingOrders)}
                  className="transition"
                >
                  {acceptingOrders ? (
                    <ToggleRight className="w-8 h-8 text-emerald-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-600" />
                  )}
                </button>
              </div>

              {/* UPI ID Setting */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1.5">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>UPI Payment ID</span>
                </label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Pickup Instructions */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-sky-400" />
                  <span>Pickup Location Instructions</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={pickupInstructions}
                  onChange={(e) => setPickupInstructions(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition shadow-lg flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving Settings...' : 'Save Settings'}</span>
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
