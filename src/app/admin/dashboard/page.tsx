'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import {
  FileText,
  Clock,
  User,
  Phone,
  CheckCircle,
  Play,
  Check,
  AlertTriangle,
  Download,
  Eye,
  RefreshCw,
  Trash2,
} from 'lucide-react';

interface OrderItem {
  id: string;
  fileName: string;
  fileData: string;
  mimeType: string;
  fileSize: number;
  printMode: string;
  pageCount: number;
  physicalSheets: number;
  copies: number;
  bindingOption: string;
  pricePerUnitPaise: number;
  subtotalPaise: number;
}

interface PaymentProof {
  id: string;
  fileData: string;
  uploadedAt: string;
}

interface Order {
  id: string;
  customerName: string;
  customerMobile: string;
  specialInstructions: string | null;
  pickupMethod: string;
  totalAmountPaise: number;
  paymentMethod: string;
  paymentStatus: string;
  upiRecipientName?: string | null;
  upiIdSnap?: string | null;
  orderStatus: string;
  assignedAdminId: string | null;
  assignedAdmin: {
    id: string;
    username: string;
    displayName: string;
  } | null;
  acceptedAt: string | null;
  printingStartedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  items: OrderItem[];
  paymentProof: PaymentProof | null;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentAdmin, setCurrentAdmin] = useState<{
    adminId: string;
    username: string;
    displayName: string;
  } | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [viewingProof, setViewingProof] = useState<string | null>(null);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndLoad();
  }, [statusFilter]);

  const checkAuthAndLoad = async () => {
    try {
      setLoading(true);
      const authRes = await fetch('/api/admin/me');
      const authData = await authRes.json();

      if (!authRes.ok || !authData.authenticated) {
        router.push('/admin/login');
        return;
      }

      setCurrentAdmin(authData.admin);

      const ordersRes = await fetch(`/api/admin/orders?status=${statusFilter}`);
      const ordersData = await ordersRes.json();
      if (ordersRes.ok) {
        setOrders(ordersData.orders || []);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    setActionError((prev) => ({ ...prev, [orderId]: '' }));
    try {
      const res = await fetch('/api/admin/orders/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError((prev) => ({
          ...prev,
          [orderId]: data.error || 'Failed to accept order.',
        }));
      }
      // Refresh list
      checkAuthAndLoad();
    } catch (err: any) {
      setActionError((prev) => ({
        ...prev,
        [orderId]: err.message || 'Error accepting order.',
      }));
    }
  };

  const handleUpdateStatus = async (
    orderId: string,
    targetStatus?: string,
    markPaid?: boolean
  ) => {
    setActionError((prev) => ({ ...prev, [orderId]: '' }));
    try {
      const res = await fetch('/api/admin/orders/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, targetStatus, markPaid }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError((prev) => ({
          ...prev,
          [orderId]: data.error || 'Failed to update order status.',
        }));
      }
      checkAuthAndLoad();
    } catch (err: any) {
      setActionError((prev) => ({
        ...prev,
        [orderId]: err.message || 'Error updating order.',
      }));
    }
  };

  const downloadBase64File = (fileData: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = fileData;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter counts
  const counts = {
    NEW: orders.filter((o) => o.orderStatus === 'NEW').length,
    ACCEPTED: orders.filter((o) => o.orderStatus === 'ACCEPTED').length,
    PRINTING: orders.filter((o) => o.orderStatus === 'PRINTING').length,
    COMPLETED: orders.filter((o) => o.orderStatus === 'COMPLETED').length,
    ALL: orders.length,
  };

  const printModeLabel = (mode: string) => {
    switch (mode) {
      case 'BW_SINGLE':
        return 'B&W Single Side';
      case 'BW_DOUBLE':
        return 'B&W Double Side';
      case 'BW_4UP':
        return 'B&W 4-Up Duplex';
      case 'COLOR_SINGLE':
        return 'Color Single Side';
      default:
        return mode;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminNavbar displayName={currentAdmin?.displayName} />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 space-y-6">
        {/* Filter Badges & Refresh */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'NEW', label: 'New / Unassigned', color: 'amber' },
              { key: 'ACCEPTED', label: 'Accepted', color: 'sky' },
              { key: 'PRINTING', label: 'Printing', color: 'indigo' },
              { key: 'COMPLETED', label: 'Completed', color: 'emerald' },
              { key: 'ALL', label: 'All Orders', color: 'slate' },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition ${
                  statusFilter === filter.key
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{filter.label}</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded-full text-[10px] font-mono">
                  {counts[filter.key as keyof typeof counts] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={checkAuthAndLoad}
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Orders Cards List */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Loading order workflow...
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
            <p className="font-semibold text-slate-200">No Orders Found</p>
            <p className="text-xs text-slate-500">
              There are currently no orders under the selected filter ({statusFilter}).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => {
              const isAssignedToMe =
                order.assignedAdminId === currentAdmin?.adminId;

              return (
                <div
                  key={order.id}
                  className={`bg-slate-900 border rounded-2xl p-5 space-y-4 shadow-lg relative flex flex-col justify-between ${
                    order.orderStatus === 'NEW'
                      ? 'border-amber-500/50 shadow-amber-950/10'
                      : order.orderStatus === 'ACCEPTED'
                      ? 'border-sky-500/50 shadow-sky-950/10'
                      : order.orderStatus === 'PRINTING'
                      ? 'border-indigo-500/50 shadow-indigo-950/10'
                      : 'border-slate-800 opacity-90'
                  }`}
                >
                  {/* Card Header */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-mono font-bold text-white">
                            {order.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              order.orderStatus === 'NEW'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : order.orderStatus === 'ACCEPTED'
                                ? 'bg-sky-950 text-sky-400 border border-sky-800'
                                : order.orderStatus === 'PRINTING'
                                ? 'bg-indigo-950 text-indigo-400 border border-indigo-800'
                                : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            }`}
                          >
                            {order.orderStatus}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          • {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-lg font-mono font-bold text-emerald-400">
                          ₹{(order.totalAmountPaise / 100).toFixed(2)}
                        </div>
                        <div className="flex items-center justify-end space-x-1 mt-0.5">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              order.paymentStatus === 'PAID'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}
                          >
                            {order.paymentMethod} • {order.paymentStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center space-x-1.5 text-slate-200">
                        <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="font-medium truncate">{order.customerName}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-300 font-mono">
                        <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <a
                          href={`tel:${order.customerMobile}`}
                          className="hover:underline text-emerald-400"
                        >
                          {order.customerMobile}
                        </a>
                      </div>
                    </div>

                    {/* Historical Payment Destination Snapshot */}
                    {order.paymentMethod === 'UPI' && order.upiRecipientName && (
                      <div className="bg-amber-950/40 border border-amber-900/60 rounded-xl p-2.5 text-xs text-amber-200 flex justify-between items-center">
                        <span className="text-amber-400 font-semibold">Payment Destination:</span>
                        <span className="font-mono text-slate-200">
                          {order.upiRecipientName} ({order.upiIdSnap})
                        </span>
                      </div>
                    )}

                    {/* Assigned Admin Display */}
                    <div className="text-xs flex items-center justify-between bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800/80">
                      <span className="text-slate-400">Assigned Admin:</span>
                      {order.assignedAdmin ? (
                        <span className="font-semibold text-sky-300 bg-sky-950 px-2.5 py-0.5 rounded-full border border-sky-800">
                          Accepted by {order.assignedAdmin.displayName}
                        </span>
                      ) : (
                        <span className="font-medium text-amber-400 bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-800">
                          Unassigned
                        </span>
                      )}
                    </div>

                    {/* Special Instructions */}
                    {order.specialInstructions && (
                      <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-2.5 text-xs text-amber-200">
                        <strong className="text-amber-400">Instructions: </strong>
                        {order.specialInstructions}
                      </div>
                    )}

                    {/* Items List */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Files & Print Settings ({order.items.length})
                      </div>
                      {order.items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-2"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-slate-200 truncate max-w-[200px]">
                              {idx + 1}. {item.fileName}
                            </span>
                            <button
                              onClick={() => downloadBase64File(item.fileData, item.fileName)}
                              className="px-2 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 rounded border border-indigo-800 flex items-center space-x-1 shrink-0"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400 font-mono">
                            <div>Mode: {printModeLabel(item.printMode)}</div>
                            <div>Pages: {item.pageCount}</div>
                            <div>Sheets: {item.physicalSheets}</div>
                            <div>Copies: {item.copies}</div>
                            <div>Binding: {item.bindingOption}</div>
                            <div>Subtotal: ₹{(item.subtotalPaise / 100).toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Payment Screenshot if uploaded */}
                    {order.paymentProof && (
                      <div className="pt-1">
                        <button
                          onClick={() => setViewingProof(order.paymentProof?.fileData || null)}
                          className="text-xs text-amber-400 hover:underline flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View UPI Payment Proof Screenshot</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Race condition error reporting */}
                  {actionError[order.id] && (
                    <div className="bg-rose-950 border border-rose-800 text-rose-200 rounded-xl p-3 text-xs flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{actionError[order.id]}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-800 space-y-2">
                    {/* Mark Paid button for unpaid UPI */}
                    {order.paymentStatus !== 'PAID' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, undefined, true)}
                        className="w-full py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Verify & Mark Paid</span>
                      </button>
                    )}

                    {/* Accept Order button if NEW */}
                    {order.orderStatus === 'NEW' && (
                      <button
                        onClick={() => handleAcceptOrder(order.id)}
                        className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center space-x-1.5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Accept Order</span>
                      </button>
                    )}

                    {/* Start Printing button if ACCEPTED */}
                    {order.orderStatus === 'ACCEPTED' && isAssignedToMe && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'PRINTING')}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center space-x-1.5"
                      >
                        <Play className="w-4 h-4" />
                        <span>Start Printing</span>
                      </button>
                    )}

                    {/* Complete Order button if PRINTING */}
                    {order.orderStatus === 'PRINTING' && isAssignedToMe && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center space-x-1.5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Mark Completed</span>
                      </button>
                    )}

                    {/* Manual Delete Order button ONLY if COMPLETED */}
                    {order.orderStatus === 'COMPLETED' && (
                      <button
                        onClick={() => setDeleteConfirmOrder(order.id)}
                        className="w-full py-2 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition mt-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Order</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-2 bg-rose-950/80 border border-rose-800 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Order Permanently?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Delete order <strong className="font-mono text-emerald-400">{deleteConfirmOrder}</strong> permanently? This completed order will be removed. This action cannot be undone.
            </p>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setDeleteConfirmOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/admin/orders/delete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ orderId: deleteConfirmOrder }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      alert(data.error || 'Failed to delete order.');
                    }
                    setDeleteConfirmOrder(null);
                    checkAuthAndLoad();
                  } catch (err: any) {
                    alert(err.message || 'Error deleting order.');
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Screenshot Modal */}
      {viewingProof && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-w-lg w-full space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-white">Payment Screenshot Proof</h3>
              <button
                onClick={() => setViewingProof(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded"
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex justify-center bg-black rounded-xl p-2">
              <img
                src={viewingProof}
                alt="Payment Proof"
                className="max-w-full max-h-full object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
