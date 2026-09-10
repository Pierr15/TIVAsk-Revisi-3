"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Phone,
  Send,
  Check,
  RefreshCw,
  User,
  Bot,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { EscalationDTO, EscalationStatus } from "@tivask/shared";

export default function EscalationsPage() {
  const [escalations, setEscalations] = useState<EscalationDTO[]>([]);
  const [selectedEscId, setSelectedEscId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const selectedEsc = escalations.find((esc) => esc.id === selectedEscId) ?? null;
  const replyText = selectedEsc ? drafts[selectedEsc.id] ?? "" : "";
  const latestRequest = useRef(0);
  const sending = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchEscalations = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    try {
      const query = statusFilter ? "?status=" + statusFilter : "";
      const res = await api.get<{ escalations: EscalationDTO[] }>("/api/escalations" + query);
      if (requestId !== latestRequest.current) return;
      setEscalations(res.escalations);
      // Pilihan pengguna tetap berdasarkan ID; polling tidak memilih penerima lain.
    } catch (err) {
      console.error("Failed to load escalations:", err);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setSelectedEscId(null);
    void fetchEscalations();
    const interval = setInterval(() => void fetchEscalations(), 10000);
    return () => {
      clearInterval(interval);
      latestRequest.current += 1;
    };
  }, [fetchEscalations]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending.current || !selectedEsc || selectedEsc.status !== "OPEN" || !replyText.trim()) return;

    const targetId = selectedEsc.id;
    const text = replyText.trim();
    sending.current = true;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await api.post<{ whatsAppSent: boolean }>("/api/escalations/" + targetId + "/reply", {
        message: text,
      });
      if (!res.whatsAppSent) {
        throw new Error("Pengiriman belum berhasil. Periksa koneksi WhatsApp; draf tetap tersedia.");
      }
      setFeedback({ type: "success", text: "Balasan diterima gateway WhatsApp dan eskalasi ditandai selesai." });
      setDrafts((current) => {
        const next = { ...current };
        delete next[targetId];
        return next;
      });
      await fetchEscalations();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Gagal mengirim balasan eskalasi." });
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  };

  const handleResolveOnly = async () => {
    if (sending.current || !selectedEsc) return;
    sending.current = true;
    setSubmitting(true);
    setFeedback(null);
    try {
      await api.patch(`/api/escalations/${selectedEsc.id}/resolve`);
      setFeedback({
        type: "success",
        text: "Eskalasi berhasil ditandai selesai.",
      });
      fetchEscalations();
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err.message || "Gagal menyelesaikan eskalasi.",
      });
    } finally {
      sending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Eskalasi Pertanyaan Siswa / Wali
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pertanyaan yang tidak terjawab otomatis oleh bot diarahkan ke sini untuk ditindaklanjuti panitia.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            disabled={submitting}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 shadow-sm focus:border-indigo-600 focus:outline-none"
          >
            <option value="">Semua Eskalasi</option>
            <option value="OPEN">Menunggu Jawaban (OPEN)</option>
            <option value="RESOLVED">Sudah Ditangani (RESOLVED)</option>
          </select>

          <button
            aria-label="Muat ulang eskalasi"
            disabled={submitting}
            onClick={() => void fetchEscalations()}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2 p-4 rounded-xl border text-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[580px]">
        {/* Left: Escalation List */}
        <div className="md:col-span-4 border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 font-semibold text-xs text-slate-500 uppercase tracking-wider">
            Antrian Eskalasi ({escalations.length})
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[600px]">
            {loading ? (
              <div className="p-8 text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mx-auto" />
              </div>
            ) : escalations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Tidak ada data eskalasi untuk filter ini.
              </div>
            ) : (
              escalations.map((esc) => {
                const isSelected = selectedEsc?.id === esc.id;
                const isOpen = esc.status === "OPEN";

                return (
                  <button
                    key={esc.id}
                    disabled={submitting}
                    onClick={() => {
                      setSelectedEscId(esc.id);
                      setFeedback(null);
                    }}
                    className={`w-full text-left p-4 transition-colors flex flex-col gap-1.5 ${
                      isSelected ? "bg-indigo-50/70 border-l-4 border-indigo-600" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold text-sm text-slate-900">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>+{esc.conversation?.phoneNumber}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isOpen
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {esc.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500">
                      Topik: {esc.conversation?.lastTopic || "(Pertanyaan di luar KB)"}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{esc.createdAt ? new Date(esc.createdAt).toLocaleTimeString("id-ID") : "-"}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detail and Reply Box */}
        <div className="md:col-span-8 flex flex-col bg-slate-50/30">
          {selectedEsc ? (
            <>
              {/* Header */}
              <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      +{selectedEsc.conversation?.phoneNumber}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        selectedEsc.status === "OPEN"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      Status: {selectedEsc.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ID Eskalasi: {selectedEsc.id}
                  </p>
                </div>

                {selectedEsc.status === "OPEN" && (
                  <button
                    onClick={handleResolveOnly}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Tandai Selesai</span>
                  </button>
                )}
              </div>

              {/* Chat Timeline Context */}
              <div className="flex-1 p-6 overflow-y-auto space-y-3.5 max-h-[360px]">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-2">
                  Riwayat Percakapan
                </div>

                {selectedEsc.conversation?.messages && selectedEsc.conversation.messages.length > 0 ? (
                  selectedEsc.conversation.messages.map((msg) => {
                    const isUser = msg.sender === "USER";
                    const isAdmin = msg.sender === "ADMIN";

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        {!isUser && (
                          <div
                            className={`flex h-7 w-7 rounded-full items-center justify-center text-white text-[11px] flex-shrink-0 ${
                              isAdmin ? "bg-purple-600" : "bg-indigo-600"
                            }`}
                          >
                            {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                          </div>
                        )}

                        <div
                          className={`max-w-md rounded-2xl p-3.5 text-sm shadow-sm ${
                            isUser
                              ? "bg-indigo-600 text-white rounded-br-none"
                              : isAdmin
                              ? "bg-purple-50 text-purple-950 border border-purple-200 rounded-bl-none"
                              : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                          }`}
                        >
                          <div className="text-[10px] font-semibold opacity-70 mb-0.5">
                            {isUser ? "User" : isAdmin ? "Panitia" : "Bot (Fallback)"}
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>

                        {isUser && (
                          <div className="flex h-7 w-7 rounded-full bg-slate-200 items-center justify-center text-slate-700 text-[11px] flex-shrink-0">
                            <User className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-xs text-slate-400 py-6">
                    Tidak ada riwayat pesan tersimpan.
                  </div>
                )}
              </div>

              {/* Reply Form */}
              <div className="p-4 bg-white border-t border-slate-200">
                <form onSubmit={handleSendReply} className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Balas Langsung ke WhatsApp Orang Tua / Murid:
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={replyText}
                    disabled={submitting || selectedEsc.status !== "OPEN"}
                    onChange={(e) => {
                      const targetId = selectedEsc.id;
                      const value = e.target.value;
                      setDrafts((current) => ({ ...current, [targetId]: value }));
                    }}
                    placeholder="Tuliskan jawaban resmi panitia di sini. Pesan akan terkirim langsung ke nomor WhatsApp pengirim..."
                    className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">
                      Balasan akan otomatis berawalan *Pesan dari Panitia SPMB SMKN 1 Adiwerna*
                    </span>
                    <button
                      type="submit"
                      disabled={submitting || selectedEsc.status !== "OPEN" || !replyText.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-md disabled:opacity-50 transition-colors"
                    >
                      {submitting ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Kirim Balasan WhatsApp</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
              <AlertTriangle className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium">Pilih salah satu eskalasi di sebelah kiri untuk melihat detail.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
