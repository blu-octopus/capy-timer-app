/**
 * ? Capybara Animation System - Type Definitions
 * 
 * Defines the structure for modular capybara animations where:
 * - Body animations are shared across all capybaras (idle, dance)
 * - Head animations are unique per capybara skin (2 expressions each)
 * - Scalable system for adding new capybaras and animations
 */

export type BodyAnimationType = 'idle' | 'dance';
export type HeadExpressionType = 'neutral' | 'happy';
export type AnimationScale = 'small' | 'medium' | 'large';

// Animation asset structure
export interface AnimationAsset {
  source: string;           // Path to GIF/animation file
  width: number;           // Original width in pixels
  height: number;          // Original height in pixels
  duration?: number;       // Animation duration in ms (optional)
  loop?: boolean;          // Whether animation should loop (default: true)
}

// Body animation definition (shared across all capybaras)
export interface BodyAnimation {
  idle: AnimationAsset;
  dance: AnimationAsset;
}

// Head animation definition (unique per capybara)
export interface HeadAnimation {
  neutral: AnimationAsset;  // Calm, focused expression
  happy: AnimationAsset;    // Excited, celebrating expression
}

// Complete capybara animation set
export interface CapybaraAnimationSet {
  id: string;               // Unique identifier
  name: string;             // Display name
  description: string;      // Description for UI
  unlockCost: number;       // Coins required to unlock
  isUnlocked: boolean;      // Unlock status
  
  // Animation assets
  head: HeadAnimation;      // Head-specific animations
  
  // Optional body override (if this capybara has unique body animations)
  body?: BodyAnimation;     // If not provided, uses default body animations
  
  // Positioning and scaling
  headOffset: {             // How to position head relative to body
    x: number;              // Horizontal offset
    y: number;              // Vertical offset
  };
  headScale: number;        // Scale factor for head (1.0 = normal)
}

// Animation state for runtime
export interface CapybaraAnimationState {
  currentBodyAnimation: BodyAnimationType;
  currentHeadExpression: HeadExpressionType;
  isAnimating: boolean;
  scale: AnimationScale;
}

// Scale configurations
export interface ScaleConfig {
  small: {
    bodyScale: number;
    headScale: number;
    containerSize: { width: number; height: number };
  };
  medium: {
    bodyScale: number;
    headScale: number;
    containerSize: { width: number; height: number };
  };
  large: {
    bodyScale: number;
    headScale: number;
    containerSize: { width: number; height: number };
  };
}
