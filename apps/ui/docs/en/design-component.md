---
title: Design Components
lang: en
audience: both
applies_to:
  - apps/ui
translation: ../ko/design-component.md
related:
  - ./design.md
  - ./design-token.md
---

# Design Components

## Canonical Source

Posts screens and Stitch `Main Blog Page (Ember & Ash Theme)` are the
canonical design sources for v1 component extraction.
`Source*` screens are temporary product UI and must not drive shared component
API design until they receive an intentional design pass.

v1 components are not a general-purpose UI kit. Extract stable React components
only when a pattern repeats inside the posts reading experience or directly
supports the Stitch blog design.

Shared components should use token-backed Tailwind classes. Page-level raw hex
colors are a migration target, and new shared components should not introduce
them. `className` is allowed for layout adjustments such as margin, width, and
grid placement, but not for overriding a component's color, typography, border,
or visual identity.

## Typography Roles

- Headline and body UI use Geist through `font-sans`.
- Terminal text, metadata, tags, code-like labels, and action affordances use
  JetBrains Mono through `font-mono`.

## Accessibility

- Action links must have clear text labels and may add a visible arrow
  affordance.
- Loading, empty, and error states must include text and must not rely on color
  alone.
- Existing progress semantics such as `SyncJobProgress` `progressbar` ARIA must
  be preserved when componentizing surrounding UI.

## Buttons

- **Primary**: Solid Rose Red (`#e06c75`) background with White text. No border.
- **Secondary**: Ghost style. Transparent background with a 1px Rose Red border and Rose Red text.
- **Tertiary**: Transparent background, white text, no border. Subtle underline on hover.

## Chips & Tags

Always rendered in **JetBrains Mono**. Use a dark charcoal background (`#282c34`) with Rose Red text for high-visibility tags, or muted gray text for standard metadata.

## Input Fields

Dark backgrounds (`#121418`) with a 1px gray border (`#3e4451`). On focus, the border changes to Rose Red. Monospaced font is used for the input text to reinforce the technical theme.

## Lists

Clean, horizontal dividers using 1px charcoal lines. Active list items are signaled by a 2px vertical Rose Red "marker" on the left edge rather than a full background highlight.

## Cards

Cards use the `#282c34` surface color. They do not use shadows. They are defined by their contrast against the `#1a1d23` background and a subtle top-border highlight in Rose Red for featured content.

## Checkboxes & Radio Buttons

Custom-styled squares and circles. When checked, they are filled with Rose Red with a white checkmark/dot. Unchecked states use a simple charcoal border.

## UI Primitives

### `Tag`

Renders compact JetBrains Mono labels.

Props:

- `tone`: `accent` for high-visibility labels, `muted` for quieter metadata.
- `className`: layout-only adjustments.

Example:

```tsx
<Tag tone="accent">#POST</Tag>
```

### `ActionLink`

Renders an internal router link with mono uppercase text and a visible arrow
affordance. Use it for post navigation actions such as "Read Note" and
"Back to posts".

Props:

- All `react-router-dom` `Link` props.
- `className`: layout-only adjustments.

Example:

```tsx
<ActionLink to="/posts/post-1">Read Note</ActionLink>
```

### `LoadingDots`

Renders the animated dot indicator for infinite/loading states. Pair it with
visible status text.

Example:

```tsx
<LoadingDots />
```

### `StatusMessage`

Renders loading, empty, and error messages with tokenized state styling. Error
messages use `role="alert"`.

Props:

- `tone`: `loading`, `empty`, or `error`.
- `className`: layout-only adjustments.

Example:

```tsx
<StatusMessage tone="error">Error: API unavailable</StatusMessage>
```

## Post Components

### `TerminalWindow`

Renders the posts hero terminal shell with traffic lights, title bar, and
prompt/body/cursor slots. It owns terminal chrome and typography; callers
provide the terminal content.

Example:

```tsx
<TerminalWindow prompt={<div>visitor@garden:~$ init</div>}>
  <div>Ready for input.</div>
</TerminalWindow>
```

### `PostMeta`

Renders the date, view count, and tag as a mono metadata row.

Props:

- `updatedAt`: ISO timestamp string.
- `viewCount`: numeric post views.
- `tag`: optional label, default `#POST`.

### `PostCard`

Renders a post preview with metadata, title, summary, action link, optional
thumbnail, and optional title highlighting for search results.

Props:

- `post`: `PostSummary`.
- `highlight`: optional search query text to mark in the title.
- `thumbnailUrl`: optional image URL.

### `PostSectionHeader`

Renders the centered-column section heading pattern used by posts sections such
as `Latest Notes & Essays`.
