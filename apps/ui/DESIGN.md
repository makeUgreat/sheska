---
name: Ember & Ash
colors:
  surface: '#101319'
  surface-dim: '#101319'
  surface-bright: '#363940'
  surface-container-lowest: '#0b0e14'
  surface-container-low: '#191c22'
  surface-container: '#1d2026'
  surface-container-high: '#272a30'
  surface-container-highest: '#32353b'
  on-surface: '#e1e2ea'
  on-surface-variant: '#dcc0c0'
  inverse-surface: '#e1e2ea'
  inverse-on-surface: '#2d3037'
  outline: '#a48b8b'
  outline-variant: '#564242'
  surface-tint: '#ffb3b6'
  primary: '#ffb3b6'
  on-primary: '#630c1c'
  primary-container: '#e16d76'
  on-primary-container: '#590416'
  inverse-primary: '#a13c46'
  secondary: '#c3c6d1'
  on-secondary: '#2c3039'
  secondary-container: '#454952'
  on-secondary-container: '#b5b8c2'
  tertiary: '#c0c7d4'
  on-tertiary: '#2a313b'
  tertiary-container: '#8a919e'
  on-tertiary-container: '#232a34'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdada'
  primary-fixed-dim: '#ffb3b6'
  on-primary-fixed: '#40000c'
  on-primary-fixed-variant: '#822430'
  secondary-fixed: '#dfe2ed'
  secondary-fixed-dim: '#c3c6d1'
  on-secondary-fixed: '#181c23'
  on-secondary-fixed-variant: '#43474f'
  tertiary-fixed: '#dce3f0'
  tertiary-fixed-dim: '#c0c7d4'
  on-tertiary-fixed: '#151c26'
  on-tertiary-fixed-variant: '#404752'
  background: '#101319'
  on-background: '#e1e2ea'
  surface-variant: '#32353b'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  code-snippet:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  container-max: 1280px
---

## Brand & Style

The brand identity centers on a high-precision, technical aesthetic that balances stark minimalism with a warm, editorial edge. It targets a sophisticated audience—developers, architects, and researchers—who value functional clarity and deep focus.

The design style is **Minimalist with a Technical Edge**, drawing inspiration from terminal environments and high-end print design. It utilizes heavy whitespace, intentional high contrast, and a single accent color to guide the eye without creating cognitive noise. The emotional response is one of calm authority, precision, and intellectual rigor. All green tones are strictly excluded to maintain a disciplined, monochrome-first palette.

## Colors

The palette is anchored by a deep charcoal and black foundation, using a desaturated rose red as the sole vehicle for emphasis and interactivity.

- **Primary**: `#e06c75` (Rose Red). Used exclusively for primary actions, active states, and critical highlights.
- **Surface**: `#1a1d23` (Deep Charcoal). The primary background color.
- **Surface-Elevated**: `#282c34`. Used for cards, modals, and navigation elements to create subtle depth.
- **Text-Primary**: `#ffffff`. High-contrast white for maximum readability.
- **Text-Secondary**: `#abb2bf`. A muted gray for metadata and supportive text.
- **Accent/Border**: `#3e4451`. A cool gray for subtle structural borders.

Avoid all green, blue, or yellow tones. Success states should be communicated through typography or iconography rather than color shifts to green.

## Typography

This design system uses a dual-font approach to emphasize its technical nature. **Geist** provides a clean, modern Sans-Serif foundation for all UI and prose, while **JetBrains Mono** is utilized for labels, tags, and data points to evoke a terminal-inspired precision.

Headlines should use tight tracking and bold weights to create a strong visual hierarchy against the minimal background. Body text is prioritized for legibility with generous line heights. Labels are always set in monospace and are frequently capitalized for a "metadata" feel.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** model on desktop and a **Fluid Grid** on mobile.

- **Desktop**: A 12-column grid with a maximum container width of 1280px. Gutters are fixed at 24px to provide clear separation of content blocks.
- **Mobile**: A 4-column fluid grid with 16px side margins.
- **Spacing Rhythm**: All margins and paddings must be multiples of the 4px base unit.

Use oversized margins (64px+) between major sections to emphasize the minimalist, editorial aesthetic. Content should feel "un-crowded" and intentional.

## Elevation & Depth

Depth is communicated through **Tonal Layers** and **Low-Contrast Outlines** rather than traditional shadows.

In this design system, objects closer to the user are lighter in tone. The base background is the darkest shade, while modals and floating cards use the secondary charcoal (`#282c34`).

To define boundaries, use 1px solid borders in `#3e4451`. Avoid drop shadows entirely to maintain a flat, technical appearance. When an element is active or focused, the border color shifts to the primary Rose Red (`#e06c75`) to create a "glow-less" highlight.

## Shapes

The shape language is disciplined and professional. We use **Soft** roundedness (0.25rem/4px) for small components like buttons and input fields. This provides a subtle hint of approachability without sacrificing the precision of a grid-based, rectangular layout. Larger containers like cards may use the `rounded-lg` (8px) token to further distinguish them from the background.

## Components

### Buttons

- **Primary**: Solid Rose Red (`#e06c75`) background with White text. No border.
- **Secondary**: Ghost style. Transparent background with a 1px Rose Red border and Rose Red text.
- **Tertiary**: Transparent background, white text, no border. Subtle underline on hover.

### Chips & Tags

Always rendered in **JetBrains Mono**. Use a dark charcoal background (`#282c34`) with Rose Red text for high-visibility tags, or muted gray text for standard metadata.

### Input Fields

Dark backgrounds (`#121418`) with a 1px gray border (`#3e4451`). On focus, the border changes to Rose Red. Monospaced font is used for the input text to reinforce the technical theme.

### Lists

Clean, horizontal dividers using 1px charcoal lines. Active list items are signaled by a 2px vertical Rose Red "marker" on the left edge rather than a full background highlight.

### Cards

Cards use the `#282c34` surface color. They do not use shadows. They are defined by their contrast against the `#1a1d23` background and a subtle top-border highlight in Rose Red for featured content.

### Checkboxes & Radio Buttons

Custom-styled squares and circles. When checked, they are filled with Rose Red with a white checkmark/dot. Unchecked states use a simple charcoal border.
