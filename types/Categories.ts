/**
 * ? Category System Types
 * 
 * Defines the structure for session categories that help users
 * organize and track different types of focus sessions.
 */

export interface Category {
  id: string;
  name: string;
  color: string;        // Hex color code for the category
  createdAt: Date;
  sessionCount: number; // Number of sessions in this category
}

export interface CategoryStats {
  totalSessions: number;
  totalFocusTime: number; // in seconds
  averageSessionLength: number; // in seconds
  lastSessionDate?: Date;
}

// Predefined category colors
export const CATEGORY_COLORS = [
  '#4CAF50', // Green - study
  '#FF6B6B', // Red - work  
  '#FFD93D', // Yellow - personal
  '#6C5CE7', // Purple - creative
  '#74B9FF', // Blue - learning
  '#A0A0A0', // Gray - other
];

// Default categories that come pre-installed
export const DEFAULT_CATEGORIES: Omit<Category, 'createdAt' | 'sessionCount'>[] = [
  { id: 'study', name: 'study', color: '#4CAF50' },
  { id: 'work', name: 'work', color: '#FF6B6B' },
  { id: 'personal', name: 'personal', color: '#FFD93D' },
  { id: 'creative', name: 'creative', color: '#6C5CE7' },
  { id: 'learning', name: 'learning', color: '#74B9FF' },
  { id: 'other', name: 'other', color: '#A0A0A0' },
];
