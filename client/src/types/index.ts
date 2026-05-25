export interface FileUploadResponse {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: string;
  status: string;
  uploadedAt: string;
  projectId?: number;
  confidence?: number | string | null;
}

export interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  response: string;
  conversationId: number;
  timestamp: string;
}

export interface DashboardStats {
  totalChangeOrders: number;
  totalValue: number;
  pendingApproval: number;
  aiProcessedRate: number;
}

export interface ExtractedData {
  projectInfo?: { name?: string; location?: string };
  date?: string;
  laborEntries?: Array<{ name: string; role: string; confidence: number; hours: number; rate?: number }>;
  equipmentEntries?: Array<{ type: string; description: string; confidence: number; hours: number; rate?: number }>;
  materialEntries?: Array<{ type: string; description: string; confidence: number; quantity: number; unit: string; rate?: number }>;
  totalConfidence: number;
}

export interface ExtractedTMData {
  laborEntries: Array<{
    description: string;
    hours: number;
    rate: number;
    amount: number;
  }>;
  materialEntries: Array<{
    description: string;
    unit: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
  equipmentEntries: Array<{
    description: string;
    unit: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
  disposalEntries: Array<{
    description: string;
    unit: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
  totalAmount: number;
  confidence: number;
}