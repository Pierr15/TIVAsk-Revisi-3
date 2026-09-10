"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  BookOpen,
  CheckCircle,
  Clock,
  Archive,
  X,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { KnowledgeBaseEntryDTO, KBStatus } from "@tivask/shared";

const CATEGORIES = [
  "BIAYA",
  "JADWAL",
  "JALUR",
  "PERSYARATAN",
  "DAFTAR_ULANG",
  "JURUSAN",
  "FAQ",
  "PROFIL",
  "PROGRAM",
  "KONTAK",
];

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KnowledgeBaseEntryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState("BIAYA");
  const [formContent, setFormContent] = useState("");
  const [formKeywords, setFormKeywords] = useState("");
  const [formStatus, setFormStatus] = useState<KBStatus>("PUBLISHED");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter) queryParams.append("status", statusFilter);
      if (search) queryParams.append("search", search);

      const url = `/api/knowledge-base${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const res = await api.get<{ entries: KnowledgeBaseEntryDTO[] }>(url);
      setEntries(res.entries);
    } catch (err) {
      console.error("Failed to load KB entries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEntries();
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormTitle("");
    setFormCategory("BIAYA");
    setFormContent("");
    setFormKeywords("");
    setFormStatus("PUBLISHED");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (entry: KnowledgeBaseEntryDTO) => {
    setEditingId(entry.id);
    setFormTitle(entry.title);
    setFormCategory(entry.category);
    setFormContent(entry.content);
    setFormKeywords(entry.keywords.join(", "));
    setFormStatus(entry.status);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const keywords = formKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    try {
      if (editingId) {
        await api.patch(`/api/knowledge-base/${editingId}`, {
          title: formTitle,
          category: formCategory,
          content: formContent,
          keywords,
          status: formStatus,
        });
      } else {
        await api.post("/api/knowledge-base", {
          title: formTitle,
          category: formCategory,
          content: formContent,
          keywords,
          status: formStatus,
        });
      }

      setIsModalOpen(false);
      fetchEntries();
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan entri Knowledge Base.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Yakin ingin menghapus entri "${title}"?`)) return;
    try {
      await api.delete(`/api/knowledge-base/${id}`);
      fetchEntries();
    } catch (err: any) {
      alert(err.message || "Gagal menghapus entri.");
    }
  };

  const getStatusBadge = (status: KBStatus) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="h-3 w-3" />
            Published
          </span>
        );
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" />
            Draft
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <Archive className="h-3 w-3" />
            Archived
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Knowledge Base SPMB
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Basis pengetahuan resmi yang menjadi sumber satu-satunya grounding bot TIVAsk.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors self-start"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Entri Baru</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari judul, kategori, atau keyword..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 shadow-sm"
          />
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 focus:border-indigo-600 focus:outline-none shadow-sm"
        >
          <option value="">Semua Status</option>
          <option value="PUBLISHED">Published (Aktif untuk Bot)</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Entries Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-900">
              Tidak ada entri Knowledge Base
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Gunakan tombol "Tambah Entri Baru" di atas untuk menambahkan informasi resmi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Judul & Kategori</th>
                  <th className="px-6 py-4">Isi Informasi (Preview)</th>
                  <th className="px-6 py-4">Keywords</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{entry.title}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700">
                        {entry.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-xs text-slate-600 truncate">
                      {entry.content}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {entry.keywords.slice(0, 3).map((kw, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]"
                          >
                            {kw}
                          </span>
                        ))}
                        {entry.keywords.length > 3 && (
                          <span className="text-[11px] text-slate-400">
                            +{entry.keywords.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(entry.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(entry)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit entri"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id, entry.title)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Hapus entri"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? "Edit Entri Knowledge Base" : "Tambah Entri Baru"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Judul Informasi
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Mis. Ketentuan Seragam Siswa Laki-laki"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-600 focus:outline-none"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                    Status Publikasi
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as KBStatus)}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="PUBLISHED">Published (Digunakan Bot)</option>
                    <option value="DRAFT">Draft (Belum Aktif)</option>
                    <option value="ARCHIVED">Archived (Diarsipkan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Isi Informasi Lengkap (Evidence)
                </label>
                <textarea
                  required
                  rows={6}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Tuliskan data faktual resmi. Bot akan mengutip fakta dari teks ini tanpa mengarang."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                  Keywords Pencarian (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  placeholder="seragam, laki-laki, celana, sepatu, pdh"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-indigo-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Entri"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
