"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Phone, Clock, Bot, User, ShieldCheck, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { ConversationDTO, MessageDTO } from "@tivask/shared";

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationDTO[]>([]);
  const [selectedConv, setSelectedConv] = useState<ConversationDTO | null>(null);
  const [messages, setMessages] = useState<MessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchConversations = async () => {
    try {
      const res = await api.get<{ conversations: ConversationDTO[] }>("/api/conversations");
      setConversations(res.conversations);
      if (res.conversations.length > 0 && !selectedConv) {
        selectConversation(res.conversations[0]);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv: ConversationDTO) => {
    setSelectedConv(conv);
    setLoadingMessages(true);
    try {
      const res = await api.get<{ messages: MessageDTO[] }>(`/api/conversations/${conv.id}/messages`);
      setMessages(res.messages);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Riwayat Percakapan WhatsApp
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Log interaksi antara calon siswa/orang tua dengan bot TIVAsk dan admin panitia.
          </p>
        </div>
        <button
          onClick={fetchConversations}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[550px]">
        {/* Left: Conversations List */}
        <div className="md:col-span-4 border-r border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 font-semibold text-xs text-slate-500 uppercase tracking-wider">
            Daftar Nomor WhatsApp ({conversations.length})
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[600px]">
            {loading ? (
              <div className="p-8 text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mx-auto" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Belum ada percakapan masuk
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = selectedConv?.id === conv.id;
                const lastMsg = conv.messages && conv.messages[0];

                return (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full text-left p-4 transition-colors flex flex-col gap-1.5 ${
                      isSelected ? "bg-indigo-50/70 border-l-4 border-indigo-600" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-sm text-slate-900">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>+{conv.phoneNumber}</span>
                      </div>
                    </div>

                    {conv.lastTopic && (
                      <span className="inline-block self-start text-[11px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 truncate max-w-full">
                        {conv.lastTopic}
                      </span>
                    )}

                    {lastMsg && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        <span className="font-medium text-slate-600">
                          {lastMsg.sender === "USER" ? "User: " : lastMsg.sender === "ADMIN" ? "Admin: " : "Bot: "}
                        </span>
                        {lastMsg.content}
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Messages View */}
        <div className="md:col-span-8 flex flex-col bg-slate-50/30">
          {selectedConv ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Phone className="h-4 w-4 text-indigo-600" />
                    <span>+{selectedConv.phoneNumber}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Topik Aktif: {selectedConv.lastTopic || "(Belum ditentukan)"} &bull; Kategori: {selectedConv.lastCategory || "-"}
                  </div>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 max-h-[500px]">
                {loadingMessages ? (
                  <div className="flex h-32 items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-12">
                    Tidak ada pesan dalam percakapan ini
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isUser = msg.sender === "USER";
                    const isAdmin = msg.sender === "ADMIN";

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        {!isUser && (
                          <div
                            className={`flex h-8 w-8 rounded-full items-center justify-center text-white text-xs flex-shrink-0 ${
                              isAdmin ? "bg-purple-600" : "bg-indigo-600"
                            }`}
                          >
                            {isAdmin ? <ShieldCheck className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                          </div>
                        )}

                        <div
                          className={`max-w-md rounded-2xl p-4 text-sm shadow-sm ${
                            isUser
                              ? "bg-indigo-600 text-white rounded-br-none"
                              : isAdmin
                              ? "bg-purple-50 text-purple-950 border border-purple-200 rounded-bl-none"
                              : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                          }`}
                        >
                          <div className="text-[11px] font-semibold opacity-70 mb-1">
                            {isUser ? "Calon Murid / Wali" : isAdmin ? "Panitia SPMB" : "TIVAsk Bot"}
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

                          {msg.evidenceIds && msg.evidenceIds.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1 text-[11px] text-indigo-600 font-medium">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Berdasarkan Evidence Resmi ({msg.evidenceIds.length} ref)</span>
                            </div>
                          )}
                        </div>

                        {isUser && (
                          <div className="flex h-8 w-8 rounded-full bg-slate-200 items-center justify-center text-slate-700 text-xs flex-shrink-0">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
              <MessageSquare className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm font-medium">Pilih salah satu nomor di sebelah kiri untuk melihat pesan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
