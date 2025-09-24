/**
 * ? Capybara Timer - Design System Colors
 * 
 * Inspired by capybaras' natural, calm, and peaceful nature.
 * Color psychology: warm browns for comfort, soft greens for focus,
 * and energizing oranges for motivation.
 */

// ? Capybara Color Palette
const capybaraBrown = '#8B4513';      // Warm capybara fur color
const capybaraLightBrown = '#D2B48C'; // Lighter fur shade
const waterBlue = '#4A90E2';          // Calm water where capybaras relax
const leafGreen = '#7CB342';          // Fresh vegetation they love
const sunsetOrange = '#FF8C42';       // Energizing sunset colors
const softCream = '#FFF8DC';          // Gentle, peaceful background

export const Colors = {
  light: {
    // Basic colors
    text: '#2C1810',                   // Dark brown for readability
    background: softCream,             // Warm, peaceful background
    surface: '#FFFFFF',                // Clean white for cards/surfaces
    
    // Capybara theme colors
    primary: capybaraBrown,            // Main brand color
    primaryLight: capybaraLightBrown,   // Lighter variant
    secondary: leafGreen,              // Focus/productivity color
    accent: sunsetOrange,              // Action buttons (start/pause)
    
    // Timer specific
    timerActive: sunsetOrange,         // When timer is running
    timerPaused: '#FFA726',           // When timer is paused
    timerComplete: leafGreen,          // When session is complete
    
    // UI elements
    tint: capybaraBrown,
    icon: '#6B4423',
    tabIconDefault: '#8D6E63',
    tabIconSelected: capybaraBrown,
    border: 'rgba(0,0,0,0.1)',
    
    // Functional colors
    success: leafGreen,
    warning: '#FFB74D',
    error: '#E57373',
    info: waterBlue,
  },
  dark: {
    // Basic colors
    text: '#F5E6D3',                   // Warm cream text
    background: '#1A1611',             // Dark brown background
    surface: '#2C2118',                // Slightly lighter surface
    
    // Capybara theme colors (adjusted for dark mode)
    primary: '#A0522D',                // Lighter brown for visibility
    primaryLight: capybaraLightBrown,           // Cream accent
    secondary: '#8BC34A',              // Brighter green for contrast
    accent: '#FF9800',                 // Brighter orange for visibility
    
    // Timer specific
    timerActive: '#FF9800',            // Bright orange for dark mode
    timerPaused: '#FFB74D',           // Lighter pause color
    timerComplete: '#8BC34A',          // Bright success green
    
    // UI elements
    tint: capybaraLightBrown,
    icon: '#A08060',
    tabIconDefault: '#8D6E63',
    tabIconSelected: capybaraLightBrown,
    border: 'rgba(255,255,255,0.1)',
    
    // Functional colors
    success: '#8BC34A',
    warning: '#FFB74D',
    error: '#EF5350',
    info: '#64B5F6',
  },
};
