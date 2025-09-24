/**
 * ? Capybara Timer - Spacing System
 * 
 * Consistent spacing values for margins, padding, and layout.
 * Based on an 8pt grid system for perfect alignment.
 */

// Base unit: 8pt grid system
// This ensures everything aligns perfectly and looks professional
const BASE_UNIT = 8;

export const Spacing = {
  // Micro spacing (for fine adjustments)
  xs2: BASE_UNIT * 0.25,  // 2pt
  xs: BASE_UNIT * 0.5,    // 4pt
  
  // Small spacing
  sm: BASE_UNIT * 1,      // 8pt
  md: BASE_UNIT * 2,      // 16pt
  
  // Medium spacing (most common)
  lg: BASE_UNIT * 3,      // 24pt
  xl: BASE_UNIT * 4,      // 32pt
  
  // Large spacing
  xl2: BASE_UNIT * 5,     // 40pt
  xl3: BASE_UNIT * 6,     // 48pt
  xl4: BASE_UNIT * 8,     // 64pt
  xl5: BASE_UNIT * 10,    // 80pt
  xl6: BASE_UNIT * 12,    // 96pt
};

// Common layout values
export const Layout = {
  // Screen padding (safe area)
  screenPadding: Spacing.md,
  
  // Card and component padding
  cardPadding: Spacing.lg,
  componentPadding: Spacing.md,
  
  // Element spacing
  elementSpacing: Spacing.sm,
  sectionSpacing: Spacing.xl,
  
  // Border radius (rounded corners)
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    xlarge: 24,
    round: 999, // Perfect circle
  },
  
  // Common sizes
  buttonHeight: {
    small: 36,
    medium: 44,
    large: 52,
  },
  
  // Timer specific
  timerCircleSize: 280,
  timerButtonSize: 72,
  companionSize: 120,
};

// Helper functions for common spacing patterns
export const SpacingHelpers = {
  // Horizontal padding
  horizontalPadding: (size: keyof typeof Spacing = 'md') => ({
    paddingHorizontal: Spacing[size],
  }),
  
  // Vertical padding
  verticalPadding: (size: keyof typeof Spacing = 'md') => ({
    paddingVertical: Spacing[size],
  }),
  
  // All padding
  padding: (size: keyof typeof Spacing = 'md') => ({
    padding: Spacing[size],
  }),
  
  // Horizontal margin
  horizontalMargin: (size: keyof typeof Spacing = 'md') => ({
    marginHorizontal: Spacing[size],
  }),
  
  // Vertical margin
  verticalMargin: (size: keyof typeof Spacing = 'md') => ({
    marginVertical: Spacing[size],
  }),
  
  // All margin
  margin: (size: keyof typeof Spacing = 'md') => ({
    margin: Spacing[size],
  }),
};
