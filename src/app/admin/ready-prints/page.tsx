'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import {
  BookOpen,
  Plus,
  Upload,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  CheckCircle,
  AlertTriangle,
  FileText,
  X,
} from 'lucide-react';

interface ReadyPrint {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  storageKey: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  pageCount: number;
  defaultPrintMode: string;
  defaultBinding: string;
  defaultCopies: number;
  isPublished: boolean;
  createdAt: string;
}

export default function AdminReadyPrintsPage() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('');
  const [loading, setLoading] = useState(true);
  const [readyPrints, setReadyPrints] = useState<ReadyPrint[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ReadyPrint | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [defaultPrintMode, setDefaultPrintMode] = useState('BW_SINGLE');
  const [defaultBinding, setDefaultBinding] = useState('NONE');
  const [defaultCopies, setDefaultCopies] = useState(1);
  const [isPublished, setIsPublished] = useState(true);

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

      await fetchReadyPrints();
    } catch (err) {
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReadyPrints = async () => {
    try {
      const res = await fetch('/api/admin/ready-prints');
      const data = await res.json();
      if (res.ok) {
        setReadyPrints(data.readyPrints || []);
      }
    } catch (err) {
      console.error('Fetch ready prints error:', err);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setTitle('');
    setCategory('');
    setDescription('');
    setFile(null);
    setDefaultPrintMode('BW_SINGLE');
    setDefaultBinding('NONE');
    setDefaultCopies(1);
    setIsPublished(true);
    setErrorMessage(null);
    setShowModal(true);
  };

  const openEditModal = (item: ReadyPrint) => {
    setEditingItem(item);
    setTitle(item.title);
    setCategory(item.category || '');
    setDescription(item.description || '');
    setFile(null);
    setDefaultPrintMode(item.defaultPrintMode);
    setDefaultBinding(item.defaultBinding);
    setDefaultCopies(item.defaultCopies);
    setIsPublished(item.isPublished);
    setErrorMessage(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Title is required.');
      return;
    }

    if (!editingItem && !file) {
      setErrorMessage('Please upload a source file.');
      return;
    }

    if (file && file.size > 20 * 1024 * 1024) {
      setErrorMessage('File size exceeds 20MB limit.');
      return;
    }

    try {
      setSaving(true);
      let storageKey = editingItem?.storageKey || '';
      let fileName = editingItem?.fileName || '';
      let mimeType = editingItem?.mimeType || 'application/pdf';
      let fileSize = editingItem?.fileSize || 0;

      // 1. If new file uploaded, send to /api/uploads
      if (file) {
        const formData = new FormData();
        formData.append('file', file);

        const uploadRes = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || 'Failed to upload document to storage.');
        }

        storageKey = uploadData.storageKey;
        fileName = uploadData.fileName;
        mimeType = uploadData.mimeType;
        fileSize = uploadData.fileSize;
      }

      // 2. Create or Update Ready Print
      if (editingItem) {
        const res = await fetch('/api/admin/ready-prints', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingItem.id,
            title: title.trim(),
            category: category.trim() || null,
            description: description.trim() || null,
            defaultPrintMode,
            defaultBinding,
            defaultCopies,
            isPublished,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update Ready Print');
      } else {
        const res = await fetch('/api/admin/ready-prints', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            category: category.trim() || null,
            description: description.trim() || null,
            storageKey,
            fileName,
            mimeType,
            fileSize,
            defaultPrintMode,
            defaultBinding,
            defaultCopies,
            isPublished,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create Ready Print');
      }

      setShowModal(false);
      await fetchReadyPrints();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (item: ReadyPrint) => {
    try {
      const res = await fetch('/api/admin/ready-prints', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          isPublished: !item.isPublished,
        }),
      });
      if (res.ok) await fetchReadyPrints();
    } catch (err) {
      console.error('Toggle publish error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Unpublish and archive this Ready Print? Historical customer orders referencing this document will remain safe and accessible.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/ready-prints?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) await fetchReadyPrints();
    } catch (err) {
      console.error('Delete ready print error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm animate-pulse">Loading Ready Prints Catalog...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <AdminNavbar displayName={adminName} />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <span>Ready Prints Catalog</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Upload course materials and notes ONCE. Students can quickly add them to orders with custom print settings.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center space-x-2 transition shadow-lg shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Ready Print</span>
          </button>
        </div>

        {readyPrints.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
            <BookOpen className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-medium text-slate-300">No Ready Prints catalog entries created yet.</p>
            <p className="text-xs text-slate-500">Click "Add Ready Print" above to upload notes, workbooks, or question banks.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {readyPrints.map((item) => (
              <div
                key={item.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-md"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {item.category || 'General'}
                    </span>

                    <button
                      onClick={() => handleTogglePublish(item)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center space-x-1 border ${
                        item.isPublished
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-amber-950 text-amber-400 border-amber-800'
                      }`}
                    >
                      {item.isPublished ? (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Published</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Unpublished</span>
                        </>
                      )}
                    </button>
                  </div>

                  <h2 className="text-base font-bold text-white leading-snug">{item.title}</h2>
                  {item.description && (
                    <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                  )}

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Document Page Count</span>
                      <span className="font-mono font-bold text-indigo-400">{item.pageCount} pages</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Default Print Mode</span>
                      <span className="font-mono">{item.defaultPrintMode}</span>
                    </div>
                    <div className="flex justify-between text-slate-400 text-[11px]">
                      <span>Default Binding</span>
                      <span className="font-mono">{item.defaultBinding}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                  <button
                    onClick={() => openEditModal(item)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center space-x-1.5 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 rounded-lg flex items-center space-x-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Archive</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">
                {editingItem ? 'Edit Ready Print' : 'Add Ready Print Document'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="bg-rose-950/80 border border-rose-800 text-rose-200 rounded-xl p-3 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Japanese Workbook"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Subject / Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Japanese"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Default Copies</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={defaultCopies}
                    onChange={(e) => setDefaultCopies(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Japanese workbook for Semester 5 students."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Source Document (PDF/Image up to 20MB) {!editingItem && <span className="text-rose-400">*</span>}
                </label>
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-indigo-400 hover:file:bg-slate-700 cursor-pointer"
                />
                {editingItem && !file && (
                  <p className="text-[10px] text-slate-500 mt-1">Existing document: {editingItem.fileName} ({editingItem.pageCount} pg)</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Default Print Mode</label>
                  <select
                    value={defaultPrintMode}
                    onChange={(e) => setDefaultPrintMode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="BW_SINGLE">B&W Single Side</option>
                    <option value="BW_DOUBLE">B&W Double Side</option>
                    <option value="BW_4UP">B&W 4-Up Duplex</option>
                    <option value="COLOR_SINGLE">Color Single Side</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Default Binding</label>
                  <select
                    value={defaultBinding}
                    onChange={(e) => setDefaultBinding(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="NONE">No Binding</option>
                    <option value="SOFT">Soft Binding</option>
                    <option value="SPIRAL">Spiral Binding</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isPublishedCheck"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
                <label htmlFor="isPublishedCheck" className="text-slate-300 cursor-pointer font-semibold">
                  Publish to Customer Ready Prints Catalog
                </label>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Ready Print'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
