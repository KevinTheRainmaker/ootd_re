---
name: Vogue Logic
colors:
  surface: "#fdf8f8"
  surface-dim: "#ddd9d8"
  surface-bright: "#fdf8f8"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f7f3f2"
  surface-container: "#f1edec"
  surface-container-high: "#ebe7e6"
  surface-container-highest: "#e5e2e1"
  on-surface: "#1c1b1b"
  on-surface-variant: "#444748"
  inverse-surface: "#313030"
  inverse-on-surface: "#f4f0ef"
  outline: "#747878"
  outline-variant: "#c4c7c7"
  surface-tint: "#5f5e5e"
  primary: "#000000"
  on-primary: "#ffffff"
  primary-container: "#1c1b1b"
  on-primary-container: "#858383"
  inverse-primary: "#c8c6c5"
  secondary: "#5d5e60"
  on-secondary: "#ffffff"
  secondary-container: "#dfdfe1"
  on-secondary-container: "#616365"
  tertiary: "#000000"
  on-tertiary: "#ffffff"
  tertiary-container: "#1a1c1f"
  on-tertiary-container: "#838488"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#e5e2e1"
  primary-fixed-dim: "#c8c6c5"
  on-primary-fixed: "#1c1b1b"
  on-primary-fixed-variant: "#474746"
  secondary-fixed: "#e2e2e4"
  secondary-fixed-dim: "#c6c6c8"
  on-secondary-fixed: "#1a1c1d"
  on-secondary-fixed-variant: "#454749"
  tertiary-fixed: "#e2e2e7"
  tertiary-fixed-dim: "#c6c6cb"
  on-tertiary-fixed: "#1a1c1f"
  on-tertiary-fixed-variant: "#45474b"
  background: "#fdf8f8"
  on-background: "#1c1b1b"
  surface-variant: "#e5e2e1"
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: "700"
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: "600"
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
  title-md:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: "600"
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: "400"
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: "600"
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding-mobile: 20px
  container-padding-desktop: 40px
  gutter: 16px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 24px
---

## Brand & Style

The design system is engineered for the style-conscious individual who treats getting dressed as a daily ritual of self-expression. The brand personality is **trend-conscious, helpful, and personalized**, acting as a high-end digital closet assistant.

The visual direction merges **Modern Minimalism** with **Glassmorphism**. It prioritizes high-fashion aesthetics—characterized by generous whitespace and editorial-grade typography—while maintaining the functional utility required for a daily-use calendar app. The emotional response should be one of curated calm; the UI recedes to let the user's clothing photography take center stage.

## Colors

The palette is rooted in a "Gallery White" philosophy. The primary color is a deep charcoal-black used for high-contrast typography and primary actions. The background utilizes a soft, off-white to reduce eye strain and provide a premium feel compared to pure white.

A specialized "Mood Palette" is used exclusively for calendar indicators and categorization:

- **Romantic:** A soft pastel pink for dates, dinners, or special occasions.
- **Casual:** A cool, airy blue for everyday wear and comfort.
- **Formal:** A sophisticated deep forest green for professional or black-tie events.
- **Active:** A vibrant, desaturated lime for fitness and movement-based outfits.

## Typography

This design system uses a dual-font strategy to balance editorial flair with data density. **Montserrat** is reserved for headlines and displays, providing a geometric, confident, and fashionable tone. **Inter** is used for all functional UI elements, body text, and calendar labels to ensure maximum legibility at smaller sizes.

Uppercase styling is applied to labels and small metadata to create a "fashion label" aesthetic. Line heights are kept generous to maintain a breathable, airy feel.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a focus on vertical rhythm.

- **Mobile:** A 4-column grid with 20px side margins.
- **Desktop:** A 12-column grid with a max-width of 1440px.

Spacing is based on an 8px baseline. Use "Stack" spacing for vertical relationships: 4px for labels to inputs, 12px for internal card content, and 24px between distinct sections. The "Outfits" feed should use a masonry-style or varied-height grid to mimic a physical mood board.

## Elevation & Depth

Depth is achieved through **Glassmorphism** and **Ambient Shadows**.

1.  **The Base:** The lowest layer is the soft-white background.
2.  **The Cards:** Outfits and calendar events sit on slightly elevated surfaces with a very soft, diffused shadow (Blur: 20px, Y: 4, Opacity: 4% Black).
3.  **The Overlays:** Weather widgets and floating navigation use a backdrop-blur effect (20px-30px) with a semi-transparent white fill (80% opacity). This allows the colors of the outfit photos to peak through the UI without sacrificing text legibility.
4.  **The Interaction:** Elements lift slightly on hover or press, increasing shadow spread to simulate physical touch.

## Shapes

The design system utilizes highly rounded corners to evoke a sense of modern friendliness and softness.

- **Standard UI elements** (Buttons, Inputs): 16px (`rounded-lg`).
- **Main Containers** (Cards, Modal Sheets): 24px (`rounded-xl`).
- **Mood Dots**: Perfect circles.

This roundedness contrasts with the sharp, geometric lines of the Montserrat typeface, creating a balanced, contemporary look.

## Components

### Buttons

Primary buttons are solid charcoal-black with white text and 16px rounded corners. Secondary buttons use a subtle gray fill or a simple 1px outline.

### Chips & Tags

Used for "Moods" or "Occasions." These should be pill-shaped with light tinted backgrounds (matching the mood color at 15% opacity) and dark text.

### The Calendar

The calendar grid is minimal. Selected dates are highlighted with a thick black ring. "Mood dots" appear beneath the date numeral, limited to three dots per day to avoid clutter.

### Weather Overlay

A glassmorphic card positioned at the top of the "Today" view. It uses a high-contrast icon and bold typography to provide instant context for outfit selection.

### Input Fields

Inputs are borderless with a soft-gray background (`secondary_color_hex`). On focus, they transition to a white background with a thin 1px black border.

### Outfit Cards

Full-bleed imagery with a very subtle inner shadow at the bottom to ensure white text labels (Date/Mood) remain visible over light-colored clothing photos.
