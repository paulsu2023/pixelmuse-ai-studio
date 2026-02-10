export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
}

export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '3:4',
  LANDSCAPE = '4:3',
  TALL = '9:16',
  WIDE = '16:9',
}

export enum Resolution {
  R_1K = '1K',
  R_2K = '2K',
  R_4K = '4K',
}

export interface GenerationSettings {
  aspectRatio: AspectRatio;
  resolution: Resolution;
  prompt: string;
}

export type ImageCategory = 'user' | 'scene' | 'reference';

// === User & Auth Types ===
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  plan: PlanType;
  credits: number;
  totalGenerated: number;
  createdAt: string;
  lastLoginAt: string;
}

export type PlanType = 'free' | 'basic' | 'pro' | 'enterprise';

export interface PricingPlan {
  id: PlanType;
  name: string;
  nameEn: string;
  price: number;
  period: string;
  credits: number;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  maxResolution: Resolution;
  maxUploads: number;
  editEnabled: boolean;
  priorityQueue: boolean;
}

export interface GenerationRecord {
  id: string;
  userId: string;
  templateName: string;
  imageUrl: string;
  prompt: string;
  settings: GenerationSettings;
  createdAt: string;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  showLoginModal: boolean;
  showRegisterModal: boolean;
  showPricingModal: boolean;
  showProfileModal: boolean;
}
