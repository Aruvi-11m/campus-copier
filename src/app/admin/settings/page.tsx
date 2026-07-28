'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import {
  Settings,
  Save,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  MapPin,
  CreditCard,
  UserCheck,
} from 'lucide-react';

interface UpiAccount {
  id: string;
  displayName: string;
  upiId: string;
  isEnabled: boolean;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState<{ displayName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [activeUpiAccount, setActiveUpiAccount] = useState<'account_1' | 'account_2'>('account_1');

  const [account1, setAccount1] = useState<UpiAccount>({
    id: 'account_1',
    displayName: 'Barathwaj',
    upiId: 'barathwaj@upi',
    isEnabled: true,
  });

  const [account2, setAccount2] = useState<UpiAccount>({
    id: 'account_2',
    displayName: 'Thamizaruvi',
    upiId: 'thamizaruvi@upi',
    isEnabled: true,
  });

  const [pickupInstructions, setPickupInstructions] = useState(
    'CampusCopier Desk, Main Student Center'
  );
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
        setActiveUpiAccount(settingsData.activeUpiAccount || 'account_1');
        if (settingsData.account1) setAccount1(settingsData.account1);
        if (settingsData.account2) setAccount2(settingsData.account2);
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
          activeUpiAccount,
          account1,
          account2,
          pickupInstructions,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save settings.');
      }

      setMessage('Store & UPI Payment settings updated successfully.');
    } catch (err: any) {
      alert(err.message || 'Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminNavbar displayName={currentAdmin?.displayName} />

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">CampusCopier Settings</h1>
              <p className="text-xs text-slate-400">
                Manage business availability, dual UPI payment profiles, and pickup location notes.
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

              {/* Payment Settings Section */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>Dual UPI Payment Profiles</span>
                </h3>

                {/* Active Payment Account Selector */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                  <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    Active Payment Account for New Orders
                  </label>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <label
                      className={`p-3 rounded-xl border cursor-pointer flex items-center space-x-2 transition ${
                        activeUpiAccount === 'account_1'
                          ? 'bg-amber-950/80 border-amber-500 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="activeUpiAccount"
                        value="account_1"
                        checked={activeUpiAccount === 'account_1'}
                        onChange={() => setActiveUpiAccount('account_1')}
                        className="accent-amber-500"
                      />
                      <span>Account 1 ({account1.displayName})</span>
                    </label>

                    <label
                      className={`p-3 rounded-xl border cursor-pointer flex items-center space-x-2 transition ${
                        activeUpiAccount === 'account_2'
                          ? 'bg-amber-950/80 border-amber-500 text-white font-bold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="activeUpiAccount"
                        value="account_2"
                        checked={activeUpiAccount === 'account_2'}
                        onChange={() => setActiveUpiAccount('account_2')}
                        className="accent-amber-500"
                      />
                      <span>Account 2 ({account2.displayName})</span>
                    </label>
                  </div>
                </div>

                {/* UPI Account 1 Details */}
                <div className="border border-slate-800 rounded-xl p-4 space-y-3 bg-slate-900/50">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-200">
                    <span>UPI Account 1</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAccount1({ ...account1, isEnabled: !account1.isEnabled })
                      }
                      className="text-slate-400 hover:text-slate-200"
                    >
                      {account1.isEnabled ? (
                        <span className="text-emerald-400">Enabled</span>
                      ) : (
                        <span className="text-rose-400">Disabled</span>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Display Name / Recipient
                      </label>
                      <input
                        type="text"
                        value={account1.displayName}
                        onChange={(e) =>
                          setAccount1({ ...account1, displayName: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        UPI ID (VPA)
                      </label>
                      <input
                        type="text"
                        value={account1.upiId}
                        onChange={(e) =>
                          setAccount1({ ...account1, upiId: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* UPI Account 2 Details */}
                <div className="border border-slate-800 rounded-xl p-4 space-y-3 bg-slate-900/50">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-200">
                    <span>UPI Account 2</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAccount2({ ...account2, isEnabled: !account2.isEnabled })
                      }
                      className="text-slate-400 hover:text-slate-200"
                    >
                      {account2.isEnabled ? (
                        <span className="text-emerald-400">Enabled</span>
                      ) : (
                        <span className="text-rose-400">Disabled</span>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Display Name / Recipient
                      </label>
                      <input
                        type="text"
                        value={account2.displayName}
                        onChange={(e) =>
                          setAccount2({ ...account2, displayName: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        UPI ID (VPA)
                      </label>
                      <input
                        type="text"
                        value={account2.upiId}
                        onChange={(e) =>
                          setAccount2({ ...account2, upiId: e.target.value })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
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
