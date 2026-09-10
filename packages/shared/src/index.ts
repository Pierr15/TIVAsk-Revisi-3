export type KBStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type MessageSender = 'USER' | 'BOT' | 'ADMIN';

export type EscalationStatus = 'OPEN' | 'RESOLVED';

export interface AdminUserDTO {
  id: string;
  email: string;
}

export interface KnowledgeBaseEntryDTO {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords: string[];
  status: KBStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateKBDTO {
  title: string;
  category: string;
  content: string;
  keywords: string[];
  status?: KBStatus;
}

export interface UpdateKBDTO {
  title?: string;
  category?: string;
  content?: string;
  keywords?: string[];
  status?: KBStatus;
}

export interface MessageDTO {
  id: string;
  conversationId: string;
  sender: MessageSender;
  content: string;
  evidenceIds: string[];
  createdAt: string;
}

export interface ConversationDTO {
  id: string;
  phoneNumber: string;
  lastTopic?: string | null;
  lastCategory?: string | null;
  createdAt?: string;
  updatedAt?: string;
  messages?: MessageDTO[];
  escalations?: EscalationDTO[];
}

export interface EscalationDTO {
  id: string;
  conversationId: string;
  status: EscalationStatus;
  handledById?: string | null;
  createdAt?: string;
  updatedAt?: string;
  conversation?: {
    id: string;
    phoneNumber: string;
    lastTopic?: string | null;
    lastCategory?: string | null;
    messages?: MessageDTO[];
  };
  messages?: MessageDTO[];
}

export interface WhatsAppSessionDTO {
  id: string;
  status: 'connected' | 'disconnected' | 'needs_qr';
  qrCode?: string | null;
}

export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface LoginResponseDTO {
  user: AdminUserDTO;
  token?: string;
}

export interface DashboardSummaryDTO {
  totalConversations: number;
  totalEscalations: number;
  openEscalations: number;
  totalKBPublished: number;
  whatsAppStatus: 'connected' | 'disconnected' | 'needs_qr';
}

export interface ReplyEscalationDTO {
  message: string;
}
