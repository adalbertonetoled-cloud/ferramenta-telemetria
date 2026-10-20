export type VehicleType = 'CONTEINER' | 'LS' | 'RODOTREM';
export type CargoStatus = 'CARREGADO' | 'VAZIO';

export interface ExtractedPernoiteItem {
  id: string;
  data: string;          // DD/MM/YYYY
  placa: string;         // e.g. HBG-5A80 (reversed standard)
  placaOriginal?: string;// e.g. 5A80-HBG
  motorista: string;     // Full driver name
  tipo: VehicleType;     // CONTEINER | LS | RODOTREM
  observacao: string;    // Empty by default as requested, or manual notes
  status: CargoStatus;   // CARREGADO (verde) | VAZIO (cinza)
  operacaoOriginal?: string; // e.g. "04-Em Viagem OP LS - DESENGATE..."
  velocidade?: string;   // e.g. "88 Km/h"
  localizacao?: string;  // e.g. "PRF SANTA RITA, SP"
  confidence?: number;
}

export interface ExtractionStats {
  total: number;
  carregados: number;
  vazios: number;
  conteiner: number;
  ls: number;
  rodotrem: number;
}

export interface ExtractionResponse {
  success: boolean;
  items: ExtractedPernoiteItem[];
  detectedDate?: string;
  sourceImageCount?: number;
  rawText?: string;
  message?: string;
  error?: string;
}
