---
name: Golden Standard
colors:
  surface: '#fafaf5'
  surface-dim: '#dadad5'
  surface-bright: '#fafaf5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4ef'
  surface-container: '#eeeee9'
  surface-container-high: '#e8e8e3'
  surface-container-highest: '#e3e3de'
  on-surface: '#1a1c19'
  on-surface-variant: '#4f4633'
  inverse-surface: '#2f312e'
  inverse-on-surface: '#f1f1ec'
  outline: '#817661'
  outline-variant: '#d3c5ac'
  surface-tint: '#775a00'
  primary: '#775a00'
  on-primary: '#ffffff'
  primary-container: '#ffc72c'
  on-primary-container: '#6f5400'
  inverse-primary: '#f6bf22'
  secondary: '#ba0a06'
  on-secondary: '#ffffff'
  secondary-container: '#df2d1f'
  on-secondary-container: '#fffbff'
  tertiary: '#615e57'
  on-tertiary: '#ffffff'
  tertiary-container: '#d3cec5'
  on-tertiary-container: '#5b5850'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdf99'
  primary-fixed-dim: '#f6bf22'
  on-primary-fixed: '#251a00'
  on-primary-fixed-variant: '#5a4300'
  secondary-fixed: '#ffdad4'
  secondary-fixed-dim: '#ffb4a8'
  on-secondary-fixed: '#410000'
  on-secondary-fixed-variant: '#930001'
  tertiary-fixed: '#e7e2d8'
  tertiary-fixed-dim: '#cbc6bd'
  on-tertiary-fixed: '#1d1b16'
  on-tertiary-fixed-variant: '#494740'
  background: '#fafaf5'
  on-background: '#1a1c19'
  surface-variant: '#e3e3de'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-xl:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  mono-data:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-margin-mobile: 16px
  container-margin-desktop: 32px
  gutter: 16px
  touch-target-min: 48px
---

## Brand & Style
This design system translates a global fast-food heritage into a high-performance digital environment. The brand personality is efficient, appetizing, and mission-critical. Designed primarily for kitchen operations and logistics, the UI prioritizes speed of recognition and industrial-grade reliability.

The style is **Corporate / Modern** with a focus on functional clarity. It utilizes high-contrast color blocking and generous hit targets to ensure that the interface remains usable in fast-paced, high-heat, and high-stress environments. Every element is designed to reduce cognitive load, allowing users to focus on throughput and accuracy.

## Colors
The palette is built for maximum visibility. 
- **Primary (Yellow):** Reserved for high-priority actions, status indicators (e.g., "Ready"), and critical highlights.
- **Secondary (Red):** Used for urgent alerts, errors, and primary brand markers.
- **Tertiary (Black):** Used for primary text and high-contrast UI shells to provide a grounded anchor.
- **Surface (Warm White):** A slightly warm off-white (#F5F5F0) reduces screen glare in bright kitchen environments while maintaining a clean, sanitary feel.
- **Success/Warning/Info:** Standard semantic colors are tuned to be highly saturated to compete with the bold primary palette.

## Typography
The system uses **Inter** exclusively to leverage its exceptional legibility and systematic weight distribution. 
- **Scale:** Headlines are oversized to ensure readability from a distance (e.g., wall-mounted order screens).
- **Weight:** Heavy weights (700-800) are used for order numbers and item counts to prevent misreading.
- **Data Display:** For numeric sequences and order timers, use the `mono-data` style which utilizes Inter's tabular lining features to ensure numbers align vertically for quick scanning.

## Layout & Spacing
The layout follows a **Fluid Grid** model designed for touch-first interaction.
- **Grid:** A 12-column grid for desktop/tablet and a 4-column grid for mobile.
- **Rhythm:** An 8px base unit governs all dimensions.
- **Operational Density:** In kitchen views, use "Compact" spacing (8px gutters) to maximize information density. In customer-facing kiosks, use "Spacious" spacing (24px gutters) to reduce visual noise.
- **Safe Zones:** All interactive elements must maintain a minimum 48px touch target to accommodate use with gloved hands or rapid movement.

## Elevation & Depth
To maintain high contrast and "clean" aesthetics, this design system avoids complex gradients or heavy shadows.
- **Tonal Layers:** Depth is expressed through high-contrast layering. The base background is the warm off-white. Secondary containers (like order cards) use pure white to pop forward.
- **Low-Contrast Outlines:** Instead of shadows, use 1px or 2px solid borders (#E1E1D7) to define card boundaries.
- **Active State:** When an item is selected or "Active," use a 4px solid Primary Yellow border to create unmistakable focus without relying on subtle elevation changes.

## Shapes
The shape language is **Rounded**, echoing the friendly nature of the brand's iconic curves while maintaining a modern architectural structure. 
- **Components:** Buttons and input fields use a 0.5rem (8px) radius. 
- **Large Containers:** Order cards and modals use 1rem (16px) or 1.5rem (24px) for a softer, more approachable look that feels premium and intentional.
- **Full Rounds:** Use pill-shapes only for status badges (e.g., "New Order") to differentiate them from actionable buttons.

## Components
- **Buttons:** Primary buttons are Secondary Red with White text for maximum urgency. Secondary buttons are Primary Yellow with Tertiary Black text. 
- **Order Cards:** Use a White background with a thick top-border. The color of this border indicates order age (Green for fresh, Yellow for warning, Red for overdue).
- **Chips:** Used for "Modifications" (e.g., "No Onions"). These should have a light grey background with bold black text to ensure they aren't missed during assembly.
- **Input Fields:** Use large, clear labels. The active state should feature a 2px Primary Yellow border.
- **Checkboxes/Radios:** Oversized for easy tapping. When checked, use the Primary Yellow fill with a heavy Tertiary Black checkmark for maximum contrast.
- **Progress Bars:** Use a thick 12px height. The "filling" color should be Primary Yellow against a Neutral Grey track.