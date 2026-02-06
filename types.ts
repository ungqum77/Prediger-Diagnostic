export enum Language {
  KR = 'KR',
  EN = 'EN'
}

export enum TargetGroup {
  CHILD = 'CHILD',
  ADULT = 'ADULT'
}

// Cards now use D, I, P, T types
export type CardType = 'D' | 'I' | 'P' | 'T';

// Design System Constants for Colors
export const TYPE_COLORS: Record<CardType, { bg: string; text: string; border: string; hex: string }> = {
  D: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', hex: '#1E88E5' }, // Data - Navy Blue
  T: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', hex: '#E53935' }, // Things - Coral Red
  P: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', hex: '#FDD835' }, // People - Mustard
  I: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', hex: '#43A047' }, // Ideas - Forest Green
};

export interface CardData {
  id: number;
  type: CardType; 
  keyword: string; 
  img: string; 
  desc: string; 
}

export interface ContentTypeData {
  title: string;
  summary: string;
  jobs: string[];
  traits: string;
}

export type ContentDB = Record<string, ContentTypeData>;

export interface UserProfile {
  name: string;
  birthDate: string;
  age: number;
}

export interface AppState {
  language: Language;
  targetGroup: TargetGroup;
  step: 'INTRO' | 'SORTING' | 'RANKING' | 'RESULT';
  userProfile: UserProfile | null;
  likedCards: number[];
  rankedCards: number[];
}

export interface Scores {
  D: number;
  I: number;
  P: number;
  T: number;
}

// Declare GSAP on window for TS
declare global {
  interface Window {
    gsap: any;
    Draggable: any;
  }
}
