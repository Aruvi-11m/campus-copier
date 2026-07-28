'use client';

import React, { useState, useEffect } from 'react';
import {
  Printer,
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  CreditCard,
  Upload,
  Clock,
  MapPin,
  AlertTriangle,
  Info,
  Copy,
  Check,
} from 'lucide-react';

interface ServicePrice {
  serviceKey: string;
  name: string;
  unit: string;
  pricePaise: number;
  priceRupees: string;
}

interface PublicSettings {
  acceptingOrders: boolean;
  upiId: string;
  pickupInstructions: string;
}

interface PrintItemState {
  id: string;
  file: File | null;
  pageCount: number;
  printMode: 'BW_SINGLE' | 'BW_DOUBLE' | 'BW_4UP' | 'COLOR_SINGLE';
  copies: number;
  bindingOption: 'NONE' | 'SOFT' | 'SPIRAL';
}

export default function CustomerOrderPage() {
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [services, setServices] = useState<ServicePrice[]>([]);
  const [settings, setSettings] = useState<PublicSettings>({
    acceptingOrders: true,
    upiId: 'barathwaj@upi',
    pickupInstructions: 'CampusCopier Desk, Main Student Center',
  });

  // Customer Details Form State
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH'>('UPI');
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);

  // Multi-item Print Configuration State
  const [items, setItems] = useState<PrintItemState[]>([
    {
      id: '1',
      file: null,
      pageCount: 1,
      printMode: 'BW_SINGLE',
      copies: 1,
      bindingOption: 'NONE',
    },
  ]);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<any | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  useEffect(() => {
    fetchPublicData();
  }, []);

  const fetchPublicData = async () => {
    try {
      setLoadingConfig(true);
      const res = await fetch('/api/pricing/public');
      const data = await res.json();
      if (res.ok) {
        setServices(data.services || []);
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (err) {
      console.error('Failed to load pricing info:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Quick lookup helper for service prices
  const getPricePaise = (key: string): number => {
    const s = services.find((srv) => srv.serviceKey === key);
    if (s) return s.pricePaise;
    const defaults: Record<string, number> = {
      bw_single: 100,
      bw_double: 150,
      bw_4up: 200,
      color_single: 1000,
      soft_binding: 3000,
      spiral_binding: 3000,
    };
    return defaults[key] || 100;
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        file: null,
        pageCount: 1,
        printMode: 'BW_SINGLE',
        copies: 1,
        bindingOption: 'NONE',
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleFileChange = async (id: string, file: File | null) => {
    if (!file) return;

    // Check size limit (25MB)
    if (file.size > 25 * 1024 * 1024) {
      alert('File exceeds 25MB maximum limit. Please choose a smaller file.');
      return;
    }

    // Rough page count estimation client-side
    let estimatedPages = 1;
    if (file.type === 'application/pdf') {
      try {
        const text = await file.text();
        const matches = text.match(/\/Type\s*\/Page\b/g);
        if (matches && matches.length > 0) {
          estimatedPages = matches.length;
        }
      } catch (e) {
        estimatedPages = 1;
      }
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, file, pageCount: Math.max(1, estimatedPages) }
          : item
      )
    );
  };

  const updateItem = (id: string, fields: Partial<PrintItemState>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...fields } : item))
    );
  };

  // Itemized calculation for live UX display
  const calculateItemEstimate = (item: PrintItemState) => {
    const pages = item.pageCount || 1;
    let sheets = pages;
    let pricePerUnitPaise = 0;

    switch (item.printMode) {
      case 'BW_SINGLE':
        sheets = pages;
        pricePerUnitPaise = getPricePaise('bw_single');
        break;
      case 'BW_DOUBLE':
        sheets = Math.ceil(pages / 2);
        pricePerUnitPaise = getPricePaise('bw_double');
        break;
      case 'BW_4UP':
        sheets = Math.ceil(pages / 4);
        pricePerUnitPaise = getPricePaise('bw_4up');
        break;
      case 'COLOR_SINGLE':
        sheets = pages;
        pricePerUnitPaise = getPricePaise('color_single');
        break;
    }

    const units =
      item.printMode === 'BW_SINGLE' || item.printMode === 'COLOR_SINGLE'
        ? pages
        : sheets;
    const printCostPaise = units * pricePerUnitPaise * item.copies;

    let bindingPricePaise = 0;
    if (item.bindingOption === 'SOFT') {
      bindingPricePaise = getPricePaise('soft_binding');
    } else if (item.bindingOption === 'SPIRAL') {
      bindingPricePaise = getPricePaise('spiral_binding');
    }

    const bindingCostPaise = bindingPricePaise * item.copies;
    const totalItemPaise = printCostPaise + bindingCostPaise;

    return {
      sheets,
      units,
      unitPriceRupees: (pricePerUnitPaise / 100).toFixed(2),
      bindingPriceRupees: (bindingPricePaise / 100).toFixed(2),
      totalRupees: (totalItemPaise / 100).toFixed(2),
      totalPaise: totalItemPaise,
    };
  };

  const totalEstimatePaise = items.reduce(
    (sum, item) => sum + calculateItemEstimate(item).totalPaise,
    0
  );

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!settings.acceptingOrders) {
      setErrorMessage('Orders are currently closed by the store administrator.');
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    const cleanMobile = customerMobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      if (!items[i].file) {
        setErrorMessage(`Please upload a document for Print Item #${i + 1}.`);
        return;
      }
    }

    if (paymentMethod === 'UPI' && !paymentScreenshot) {
      setErrorMessage('Please upload your UPI payment screenshot to complete the order.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('customerName', customerName.trim());
      formData.append('customerMobile', cleanMobile);
      if (specialInstructions.trim()) {
        formData.append('specialInstructions', specialInstructions.trim());
      }
      formData.append('paymentMethod', paymentMethod);

      const itemsConfig = items.map((item) => ({
        printMode: item.printMode,
        copies: item.copies,
        bindingOption: item.bindingOption,
      }));
      formData.append('printItems', JSON.stringify(itemsConfig));

      items.forEach((item, index) => {
        if (item.file) {
          formData.append(`file_${index}`, item.file);
        }
      });

      if (paymentMethod === 'UPI' && paymentScreenshot) {
        formData.append('paymentScreenshot', paymentScreenshot);
      }

      const res = await fetch('/api/orders/create', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order.');
      }

      setConfirmedOrder(data.order);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while submitting your order.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // 1. Order Confirmation Screen
  if (confirmedOrder) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-white">Order Placed Successfully!</h1>
            <p className="text-slate-400 text-sm">
              Save or screenshot your Order ID for pickup.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-400 text-sm">Order ID</span>
              <span className="text-xl font-mono font-bold text-emerald-400">
                {confirmedOrder.id}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Customer</span>
              <span className="font-medium text-slate-200">{confirmedOrder.customerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Amount</span>
              <span className="font-bold text-white">
                ₹{(confirmedOrder.totalAmountPaise / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Payment Method</span>
              <span className="font-medium text-amber-400">
                {confirmedOrder.paymentMethod === 'UPI' ? 'UPI Payment' : 'Cash at Pickup'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Pickup Location</span>
              <span className="font-medium text-sky-400">College Pickup Only</span>
            </div>
          </div>

          <div className="bg-sky-950/40 border border-sky-800/60 rounded-xl p-4 text-xs text-sky-200 flex items-start space-x-3">
            <MapPin className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sky-300">Pickup Instructions:</p>
              <p className="mt-1 text-slate-300">{settings.pickupInstructions}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setConfirmedOrder(null);
              setCustomerName('');
              setCustomerMobile('');
              setSpecialInstructions('');
              setPaymentScreenshot(null);
              setItems([
                {
                  id: Date.now().toString(),
                  file: null,
                  pageCount: 1,
                  printMode: 'BW_SINGLE',
                  copies: 1,
                  bindingOption: 'NONE',
                },
              ]);
            }}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-lg"
          >
            Place Another Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-white">CampusCopier</h1>
              <p className="text-xs text-slate-400">Instant College Printing</p>
            </div>
          </div>

          {/* Store Status Badge */}
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 border ${
              settings.acceptingOrders
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                : 'bg-rose-950/80 text-rose-400 border-rose-800/80'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                settings.acceptingOrders ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span>{settings.acceptingOrders ? '🟢 Orders Open' : '🔴 Orders Closed'}</span>
          </div>
        </div>
      </header>

      {/* Main Order Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 space-y-6">
        {!settings.acceptingOrders && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 rounded-xl p-4 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-rose-300">Orders Temporarily Closed</h3>
              <p className="text-sm text-slate-300 mt-1">
                The print desk is currently closed. Please check back shortly to submit new orders.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="space-y-6">
          {/* Step 1: Customer Details */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 text-xs flex items-center justify-center font-mono">
                1
              </span>
              <span>Customer Details</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Barathwaj"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Mobile Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </section>

          {/* Step 2: Multi-Item File Upload & Settings */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 text-xs flex items-center justify-center font-mono">
                  2
                </span>
                <span>Print Items</span>
              </h2>
              <span className="text-xs text-slate-400">PDF, JPG, PNG up to 25MB</span>
            </div>

            {items.map((item, index) => {
              const estimate = calculateItemEstimate(item);
              return (
                <div
                  key={item.id}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4 relative"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                      Print Item #{index + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-500 hover:text-rose-400 transition p-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* File Selector */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Upload Document <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,image/jpeg,image/png"
                        onChange={(e) =>
                          handleFileChange(item.id, e.target.files?.[0] || null)
                        }
                        className="hidden"
                        id={`file-input-${item.id}`}
                      />
                      <label
                        htmlFor={`file-input-${item.id}`}
                        className="flex items-center justify-between w-full bg-slate-900 border border-dashed border-slate-700 hover:border-indigo-500 rounded-xl px-4 py-3 text-xs cursor-pointer transition"
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <Upload className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="text-slate-200 truncate">
                            {item.file ? item.file.name : 'Choose PDF or Image file'}
                          </span>
                        </div>
                        {item.file && (
                          <span className="text-xs font-mono text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800 shrink-0">
                            ~{item.pageCount} pg
                          </span>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Print Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Print Mode */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Print Mode
                      </label>
                      <select
                        value={item.printMode}
                        onChange={(e: any) =>
                          updateItem(item.id, { printMode: e.target.value })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="BW_SINGLE">B&W Single Side (₹1.00 / pg)</option>
                        <option value="BW_DOUBLE">B&W Double Side (₹1.50 / sheet)</option>
                        <option value="BW_4UP">B&W 4-Up Duplex (₹2.00 / sheet)</option>
                        <option value="COLOR_SINGLE">Color Single Side (₹10.00 / pg)</option>
                      </select>
                    </div>

                    {/* Copies */}
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Copies
                      </label>
                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl">
                        <button
                          type="button"
                          onClick={() =>
                            updateItem(item.id, {
                              copies: Math.max(1, item.copies - 1),
                            })
                          }
                          className="px-2.5 py-1.5 text-slate-400 hover:text-white"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={item.copies}
                          onChange={(e) =>
                            updateItem(item.id, {
                              copies: Math.max(1, parseInt(e.target.value, 10) || 1),
                            })
                          }
                          className="w-full bg-transparent text-center text-xs text-slate-100 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateItem(item.id, { copies: item.copies + 1 })
                          }
                          className="px-2.5 py-1.5 text-slate-400 hover:text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Binding Option */}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Binding Option
                    </label>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { key: 'NONE', label: 'No Binding', price: '₹0' },
                        { key: 'SOFT', label: 'Soft Binding', price: '₹30' },
                        { key: 'SPIRAL', label: 'Spiral Binding', price: '₹30' },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() =>
                            updateItem(item.id, {
                              bindingOption: opt.key as any,
                            })
                          }
                          className={`py-2 px-2 rounded-xl border text-center transition ${
                            item.bindingOption === opt.key
                              ? 'bg-indigo-950 text-indigo-200 border-indigo-500 font-semibold'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>{opt.label}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {opt.price}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Item Subtotal */}
                  <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-xs">
                    <span className="text-slate-400">
                      {item.printMode === 'BW_DOUBLE' || item.printMode === 'BW_4UP'
                        ? `${estimate.sheets} sheets`
                        : `${estimate.units} pages`}{' '}
                      × {item.copies} copy
                    </span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      Subtotal: ₹{estimate.totalRupees}
                    </span>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleAddItem}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-indigo-400 hover:text-indigo-300 text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Print Item</span>
            </button>
          </section>

          {/* Step 3: Special Instructions */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 text-xs flex items-center justify-center font-mono">
                3
              </span>
              <span>Special Instructions (Optional)</span>
            </h2>
            <textarea
              rows={2}
              placeholder="e.g. Put the name Barathwaj on the front page, stapled at top left."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </section>

          {/* Step 4: Payment Selection */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 text-xs flex items-center justify-center font-mono">
                4
              </span>
              <span>Select Payment Method</span>
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`py-3 px-4 rounded-xl border text-center text-xs font-semibold flex items-center justify-center space-x-2 transition ${
                  paymentMethod === 'UPI'
                    ? 'bg-amber-950/80 text-amber-200 border-amber-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>UPI Payment</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-3 px-4 rounded-xl border text-center text-xs font-semibold flex items-center justify-center space-x-2 transition ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-950/80 text-emerald-200 border-emerald-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>Pay at Pickup (Cash)</span>
              </button>
            </div>

            {paymentMethod === 'UPI' ? (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Pay Total Amount:</span>
                  <span className="text-lg font-bold text-amber-400 font-mono">
                    ₹{(totalEstimatePaise / 100).toFixed(2)}
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                      UPI ID
                    </div>
                    <div className="text-xs font-mono font-semibold text-slate-200">
                      {settings.upiId}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(settings.upiId)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded flex items-center space-x-1"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Upload Payment Screenshot <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPaymentScreenshot(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-amber-400 hover:file:bg-slate-700 cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-xl p-4 text-xs text-emerald-200">
                Pay <strong className="font-mono text-white">₹{(totalEstimatePaise / 100).toFixed(2)}</strong> in cash at the desk when picking up your print job.
              </div>
            )}
          </section>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl p-4 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Place Order CTA */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-300">Total Live Estimate:</span>
              <span className="text-2xl font-bold text-white font-mono">
                ₹{(totalEstimatePaise / 100).toFixed(2)}
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting || !settings.acceptingOrders}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base rounded-xl transition shadow-lg shadow-emerald-900/20 flex items-center justify-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Calculating & Placing Order...</span>
                </>
              ) : (
                <span>Place Order</span>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Admin Link Footer */}
      <footer className="py-4 border-t border-slate-900 text-center text-xs text-slate-500">
        <a href="/admin/login" className="hover:text-indigo-400 transition">
          Admin Portal Login
        </a>
      </footer>
    </div>
  );
}
