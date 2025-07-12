export interface DashboardStats {
  totalChangeOrders: number;
  totalValue: number;
  pendingApproval: number;
  aiProcessedRate: number;
}

export interface ExtractedData {
  laborEntries: LaborEntry[];
  equipmentEntries: EquipmentEntry[];
  materialEntries: MaterialEntry[];
  date: string;
  projectInfo: ProjectInfo;
  totalConfidence: number;
}

export interface LaborEntry {
  name: string;
  role: string;
  hours: number;
  rate?: number;
  confidence: number;
}

export interface EquipmentEntry {
  type: string;
  description: string;
  hours: number;
  rate?: number;
  confidence: number;
}

export interface MaterialEntry {
  type: string;
  description: string;
  quantity: number;
  unit: string;
  rate?: number;
  confidence: number;
}

export interface ProjectInfo {
  name?: string;
  location?: string;
  confidence: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  response: string;
  conversationId: number;
  timestamp: Date;
}

export interface FileUploadResponse {
  id: number;
  filename: string;
  originalName: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  extractedData?: ExtractedData;
  confidence?: number;
}

export interface ChangeOrderFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
