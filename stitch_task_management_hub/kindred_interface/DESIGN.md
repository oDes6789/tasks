---
name: Kindred Interface
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464554'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#615b6f'
  on-secondary: '#ffffff'
  secondary-container: '#e5dcf4'
  on-secondary-container: '#666073'
  tertiary: '#5b5c5e'
  on-tertiary: '#ffffff'
  tertiary-container: '#747476'
  on-tertiary-container: '#fdfcfe'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#e7dff6'
  secondary-fixed-dim: '#cbc3da'
  on-secondary-fixed: '#1d192a'
  on-secondary-fixed-variant: '#494457'
  tertiary-fixed: '#e3e2e4'
  tertiary-fixed-dim: '#c6c6c8'
  on-tertiary-fixed: '#1a1c1d'
  on-tertiary-fixed-variant: '#464749'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
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
    lineHeight: 26px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 24px
  gutter: 16px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 48px
---

## Brand & Style

The design system focuses on radical hospitality and emotional warmth. It is designed to feel like a digital "soft landing," prioritizing a sense of calm, accessibility, and friendliness for the user. The aesthetic leans heavily into a modern, refined minimalism blended with soft, tactile elements.

The target audience values comfort and ease of use over technical density. To achieve this, the system avoids sharp edges and high-tension contrasts. Instead, it utilizes depth through soft shadows and a "pill-based" geometry to create an environment that feels safe and intuitive. The UI should evoke a feeling of "cushioning"—where every interaction feels gentle and deliberate.

## Colors

The palette moves away from aggressive saturation toward a pastel-informed, calming spectrum. 

- **Primary:** A soft indigo (`#6366F1`) serves as the main action color, providing enough contrast for accessibility while maintaining a friendly temperament.
- **Secondary:** A pale lavender-tinted background (`#F0E7FF`) is used for large surface areas and active states to soften the visual weight.
- **Background Tints:** Pure white is avoided for primary surfaces. Instead, a nearly-white violet tint (`#FDFCFE`) is used to reduce eye strain and maintain the "soft" brand narrative.
- **Neutral:** A muted slate-blue (`#64748B`) is used for text to ensure readability without the harshness of pure black.

## Typography

This design system uses Inter exclusively to maintain a clean, systematic foundation, but applies it with "breathing room." 

To enhance the friendly feel, line heights are set to at least 1.5x or 1.6x the font size. Body text is slightly enlarged to 16px (Medium) and 18px (Large) to ensure effortless legibility. Headlines use a semi-bold weight rather than heavy bold to keep the tone approachable. Tight letter-spacing is used only on large headlines to maintain a cohesive, "tucked-in" look.

## Layout & Spacing

The layout follows a fluid-first philosophy with generous inner padding. Elements are never crowded; the system relies on whitespace to define hierarchy rather than lines or borders.

- **Desktop:** A 12-column grid with 24px gutters and 80px side margins.
- **Mobile:** A 4-column grid with 16px gutters and 20px side margins.
- **Vertical Rhythm:** A consistent 8px base unit is used. To maintain the "soft" feel, use larger increments (24px, 48px) between major sections to prevent a cluttered appearance.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** and **Tonal Layers** rather than borders. 

- **Level 1 (Base):** The secondary background tint.
- **Level 2 (Cards/Buttons):** These surfaces use a pure white background to pop against the tinted base. They feature a very soft, diffused shadow: `0px 10px 30px rgba(99, 102, 241, 0.08)`. The shadow is slightly tinted with the primary indigo to maintain color harmony.
- **Level 3 (Modals/Popovers):** Higher elevation with a more pronounced shadow: `0px 20px 50px rgba(99, 102, 241, 0.12)`.

Harsh hex-code borders are strictly prohibited. If separation is needed, use a 1px border that is only 2-3% darker than the surface color it sits on.

## Shapes

The shape language is defined by high-radius curves. Every interactive element—from buttons to input fields—utilizes a pill-shaped or "super-rounded" corner. Small components like chips and checkboxes use a full `rounded-full` (pill) treatment, while larger containers like cards and modals use a minimum 24px (`1.5rem`) radius to maintain the soft, approachable aesthetic.

## Components

- **Buttons:** Always pill-shaped. The primary button uses a solid Indigo fill with white text. Secondary buttons use the lavender background tint with Indigo text. Avoid ghost buttons with borders; use tonal backgrounds instead.
- **Inputs:** High corner radius (at least 12px or pill-shaped). Backgrounds should be a subtle shade darker than the surface they sit on to create a "recessed" feel without needing a heavy border.
- **Cards:** White surfaces with 24px corner radius and the Level 2 ambient shadow. Internal padding should be a minimum of 24px.
- **Chips:** Fully rounded (pill) with a subtle lavender-tinted background and indigo text. 
- **Icons:** Use "Soft-Line" or "Duotone" styles. All terminals and joins in the icon set must be rounded. Use a dual-tone approach where the secondary color is a 30% opacity version of the primary indigo.
- **Lists:** Items are separated by whitespace or subtle tonal shifts rather than divider lines. Hover states should trigger a very soft, rounded background highlight.