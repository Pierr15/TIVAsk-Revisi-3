"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  QrCode,
  Wifi,
  WifiOff,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { DashboardSummaryDTO, WhatsAppSessionDTO } from "@tivask/shared";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryDTO | null>(null);
  const [waSession, setWaSession] = useState<WhatsAppSessionDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [sumRes, waRes] = await Promise.all([
        api.get<DashboardSummaryDTO>("/api/dashboard/summary"),
        api.get<WhatsAppSessionDTO>("/api/whatsapp/status"),
      ]);
      setSummary(sumRes);
      setWaSession(waRes);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Ringkasan Operasional SPMB
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Status bot WhatsApp, Knowledge Base, dan penanganan pertanyaan panitia.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors self-start"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          <span>Perbarui Data</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Percakapan
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-bold text-slate-900">
            {summary?.totalConversations ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500">Nomor orang tua / calon siswa</p>
        </div>

        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Eskalasi Terbuka
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-bold text-amber-600">
            {summary?.openEscalations ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500">Menunggu balasan manual panitia</p>
        </div>

        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Eskalasi
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-bold text-slate-900">
            {summary?.totalEscalations ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500">Pertanyaan dialihkan ke admin</p>
        </div>

        <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              KB Terbit
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-3xl font-bold text-emerald-600">
            {summary?.totalKBPublished ?? 0}
          </div>
          <p className="mt-1 text-xs text-slate-500">Unit informasi aktif dipakai bot</p>
        </div>
      </div>

      {/* WhatsApp Gateway Status Section */}
      <div className="rounded-2xl bg-white p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-5 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                waSession?.status === "connected"
                  ? "bg-emerald-50 text-emerald-600"
                  : waSession?.status === "needs_qr"
                  ? "bg-amber-50 text-amber-600"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {waSession?.status === "connected" ? (
                <Wifi className="h-5 w-5" />
              ) : (
                <WifiOff className="h-5 w-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Status Koneksi WhatsApp Gateway
              </h2>
              <p className="text-xs text-slate-500">
                Penyedia layanan pesan resmi chatbot TIVAsk
              </p>
            </div>
          </div>

          <div>
            {waSession?.status === "connected" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Terhubung & Aktif
              </span>
            )}
            {waSession?.status === "needs_qr" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200">
                <QrCode className="h-3.5 w-3.5" />
                Menunggu Scan QR
              </span>
            )}
            {waSession?.status === "disconnected" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
                Terputus / Memulai Ulang
              </span>
            )}
          </div>
        </div>

        <div className="pt-6">
          {waSession?.status === "connected" && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 text-sm text-emerald-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <span>
                Bot WhatsApp siap menerima pesan pertanyaan orang tua/calon siswa dan
                menjawab secara otomatis berdasarkan Knowledge Base resmi sekolah.
              </span>
            </div>
          )}

          {waSession?.status === "needs_qr" && (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <p className="text-sm font-medium text-slate-700 mb-4">
                Buka aplikasi WhatsApp di HP panitia &rarr; Perangkat Tertaut &rarr; Tautkan
                Perangkat &rarr; Scan QR Code berikut:
              </p>
              {waSession.qrCode ? (
                <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-md">
                  <img
                    src={waSession.qrCode}
                    alt="WhatsApp QR Code"
                    className="w-56 h-56 object-contain"
                  />
                </div>
              ) : (
                <div className="h-56 w-56 flex items-center justify-center bg-slate-100 rounded-xl">
                  <span className="text-xs text-slate-400">Menyiapkan QR Code...</span>
                </div>
              )}
            </div>
          )}

          {waSession?.status === "disconnected" && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-600">
              Gateway WhatsApp sedang bersiap atau berjalan secara background. Status akan
              diperbarui otomatis setiap 10 detik.
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Link
          href="/escalations"
          className="group rounded-2xl bg-white p-6 border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Lihat Daftar Eskalasi</h3>
                <p className="text-xs text-slate-500">
                  {summary?.openEscalations ?? 0} pertanyaan membutuhkan balasan panitia
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link
          href="/knowledge-base"
          className="group rounded-2xl bg-white p-6 border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Kelola Knowledge Base</h3>
                <p className="text-xs text-slate-500">
                  Tambah, perbarui, dan terbitkan panduan resmi SPMB
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      </div>
    </div>
  );
}
