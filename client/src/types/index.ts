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