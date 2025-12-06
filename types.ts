export enum EmergencyType {
  POLICE = 'POLICE',
  FIRE = 'FIRE',
  MEDICAL = 'MEDICAL'
}

export enum IncidentStatus {
  PENDING = 'PENDING',
  DISPATCHED = 'DISPATCHED',
  RESOLVED = 'RESOLVED',
  FALSE_ALARM = 'FALSE_ALARM'
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface AIAnalysis {
  severity: number; // 1 (Low) to 5 (Critical)
  category: string;
  suggestedAction: string;
  summary: string;
}

export interface Incident {
  id: string;
  type: EmergencyType;
  timestamp: number;
  location: Coordinates;
  address?: string; // Reversed geocoded or user provided
  description: string;
  status: IncidentStatus;
  userContact?: string;
  userCpf?: string;
  aiAnalysis?: AIAnalysis;
  dispatchedUnit?: string;
}

export type ViewMode = 'CITIZEN' | 'DISPATCHER';