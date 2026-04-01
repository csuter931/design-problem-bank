# Design Spec: Stitch "Academic Curator" Restyle
**Date:** 2026-03-31  
**Scope:** `index.html` + `admin.html`  
**Constraint:** Zero changes to HTML structure or JavaScript — CSS only

---

## 1. Goal

Replace the current blue/orange design system in both HTML files with the Stitch "Academic Curator" design system (Deep Indigo + Teal, Manrope + Inter fonts, editorial tonal layering). Extract all shared CSS into a new `styles.css` file; each HTML file keeps only page-specific overrides inline.

---

## 2. Architecture

### New file: `styles.css`
Lives at the project root. Contains:
- Google Fonts import (Manrope + Inter)
- All `:root` CSS custom properties (design tokens)
- CSS reset
- All components shared by both pages: body, header, buttons, cards, modals, forms, filter bar, search, chips, tabs, hero, team banner, loading states, toasts/notifications, login card

### `index.html` changes
- Remove entire `<style>` block
- Add `<link rel="stylesheet" href="styles.css">` in `<head>`
- Add small inline `<style>` block for index-only styles: wizard step indicators, submission form progress UI

### `admin.html` changes
- Same as index.html
- Keep small inline `<style>` block for admin-only styles: edit form layout, admin tab panel overrides, super user controls

---

## 3. Design Tokens (`:root` variables)

Replace all current variables with these Stitch tokens:

```css
:root {
  /* Primary — Deep Indigo */
  --primary:            #2b3896;
  --primary-container:  #4551af;
  --on-primary:         #ffffff;

  /* Secondary — Vibrant Teal */
  --secondary:          #006a60;
  --secondary-container:#85f6e5;
  --on-secondary:       #ffffff;
  --on-secondary-container: #007166;

  /* Surfaces — tonal layering (no divider lines) */
  --bg:                 #f8f9ff;   /* page background */
  --surface:            #f8f9ff;
  --surface-low:        #eff4ff;   /* structural sections */
  --surface-lowest:     #ffffff;   /* interactive cards */
  --surface-container:  #e6eeff;
  --surface-dim:        #ccdbf3;

  /* Text */
  --text:               #0d1c2e;   /* on_surface — never pure black */
  --text-light:         #454652;   /* on_surface_variant */
  --text-muted:         #757684;   /* outline */

  /* Semantic */
  --error:              #ba1a1a;
  --success:            #006a60;   /* reuse secondary */
  --warning:            #FF9800;   /* keep existing */

  /* Structure */
  --outline:            #757684;
  --outline-variant:    #c5c5d4;
  --border:             rgba(197,197,212,0.2); /* ghost border — 20% opacity */

  /* Elevation */
  --shadow:             0px 8px 20px rgba(13, 28, 46, 0.05);
  --shadow-lg:          0px 20px 40px rgba(13, 28, 46, 0.06);

  /* Shape */
  --radius:             0.5rem;    /* 8px default */
  --radius-sm:          0.25rem;   /* 4px inputs */
  --radius-lg:          0.75rem;   /* 12px modals */

  /* Transitions */
  --transition:         0.2s ease;
}
```

**What changes from current:**
- Primary: `#2D5A8E` → `#2b3896` (deeper indigo)
- Accent/orange removed — replaced by teal secondary
- Background: `#F5F7FA` → `#f8f9ff`
- Text: `#2C3E50` → `#0d1c2e`
- Borders: hard 1px lines → ghost borders at 20% opacity (or removed entirely)
- Shadows: opaque black-tinted → indigo-slate tinted

---

## 4. Typography

Add to top of `styles.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=Inter:wght@400;500;600&display=swap');
```

Apply:
```css
body {
  font-family: 'Inter', -apple-system, sans-serif;
}
h1, h2, h3, .hero h2, .card-title, .header-brand h1 {
  font-family: 'Manrope', sans-serif;
}
```

**Typography scale:**
- `display-lg` (page heroes): 3.5rem / Manrope 800 / tracking -2%
- `headline-md` (problem titles, card headings): 1.75rem / Manrope 700
- `headline-sm` (section headers): 1.25rem / Manrope 700
- `body-lg` (descriptions): 1rem / Inter 400
- `label-md` (metadata, chips, tags): 0.75rem / Inter 500 / uppercase

---

## 5. Component Styles

### Header / Nav
- Background: glassmorphism — `surface-lowest` at 80% opacity, `backdrop-filter: blur(12px)`
- Remove hard border-bottom; use `var(--shadow)` only
- Brand title: Manrope 700
- Subtitle: Inter 400, 80% opacity

### Buttons

| Variant | Fill | Text | Border | Notes |
|---------|------|------|--------|-------|
| `.btn-primary` | gradient `#2b3896` → `#4551af` at 135° | white | none | No drop shadow |
| `.btn-secondary` | `var(--secondary-container)` = teal | `var(--on-secondary-container)` | none | Replaces accent/orange |
| `.btn-outline` | transparent | `var(--primary)` | 1.5px `var(--outline-variant)` | Ghost |
| `.btn-ghost` | transparent | `var(--text-light)` | none | Text-only |
| `.btn-success` | `var(--secondary-container)` | `var(--on-secondary-container)` | none | Merge with secondary |
| `.btn-danger-outline` | transparent | `var(--error)` | 1.5px `var(--error)` | Keep as-is |
| `.btn-google` | white | `#333` | 1px `var(--outline-variant)` | Keep structure |

All buttons: `border-radius: var(--radius)` (8px). No `transform: translateY` hover — use shadow lift instead for primary.

### Cards (`.problem-card`)
- Background: `var(--surface-lowest)` (#ffffff)
- Placed on `var(--surface-low)` (#eff4ff) background — tonal lift without borders
- Border: none (remove `border: 1px solid var(--border)` pattern)
- Shadow: `var(--shadow)` at rest
- Hover: background stays `surface-lowest`, shadow becomes `var(--shadow-lg)` — no translateY
- Border-radius: `var(--radius-lg)` (12px)
- Spacing between cards: `2rem` (up from 1.5rem) — "breathing room" principle

### Search / Filter Bar
- Search input: filled style — background `var(--surface-container)`, no visible border at rest
- Focus state: 2px bottom-bar in `var(--primary)`, no full border
- Border-radius: `var(--radius-sm)` for input, `var(--radius)` for container
- Chips (`.chip`): pill shape (20px radius), background `var(--surface-low)`, text `var(--text-light)`
- Active chip: `var(--primary)` background, white text — gradient fill matching primary button

### Hero Section (index.html)
- Background: gradient `var(--primary)` → `var(--primary-container)` at 135°
- Headline: Manrope 800, 3.5rem, tracking -2%
- Subtext: Inter 400, 1.1rem, 90% opacity
- Decorative blobs: keep radial gradient orbs but use `secondary-container` (#85f6e5) at 15% opacity instead of orange

### Modals
- Overlay: `rgba(13, 28, 46, 0.5)` (on_surface tint, not pure black)
- Modal container: `var(--surface-lowest)`, `var(--radius-lg)`, `var(--shadow-lg)`
- No internal divider lines — use `var(--surface-low)` background on footer/header areas
- Modal header: Manrope 700

### Forms / Inputs
- Filled style: background `var(--surface-container)` (#e6eeff)
- Border-radius: `var(--radius-sm)` (4px) for field, `var(--radius)` for container
- Focus: 2px bottom-bar `var(--primary)`, no full-perimeter border
- Labels: Inter 500, `label-md` size, `var(--text-light)`

### Team Banner
- Replace hard `border-left: 4px solid var(--primary)` with background `var(--surface-low)` — no line
- Left accent: 4px `var(--secondary)` (teal) — matches Stitch "Formula Block" pattern
- Background: `var(--surface-low)` instead of `#E3F2FD`

### Tabs (admin.html)
- Active tab: `var(--primary)` bottom-bar (2px), text `var(--primary)`, background transparent
- Inactive: `var(--text-muted)`, no background
- Tab container: background `var(--surface-low)`, no border-bottom divider

### Loading / Skeleton States
- Skeleton shimmer: replace grey with `var(--surface-container)` → `var(--surface-low)` gradient

### Toast / Notifications
- Success: `var(--secondary)` background (teal)
- Error: `var(--error)` background
- Shadow: `var(--shadow-lg)`

---

## 6. The "No-Line" Rule

The Stitch design system prohibits explicit 1px borders for content separation. Wherever the current code uses:
```css
border: 1px solid var(--border);
border-bottom: 1px solid ...;
border-left: 4px solid ...;
```
Replace with background color shifts (`surface` → `surface-low` → `surface-lowest`) or the ghost border fallback (`outline-variant` at 20% opacity) for accessibility-required inputs only.

---

## 7. What Does NOT Change

- All HTML element IDs and class names
- All JavaScript functions, event listeners, Firebase calls
- The Cloudinary upload widget integration
- The Google Sign-in flow
- The responsive grid layout (`.gallery` columns, breakpoints)
- Emoji icons used throughout (🎯, 🏆, etc.)
- Animation names (e.g. `@keyframes cardHighlight`) — only update colors within

---

## 8. Out of Scope

- Changing HTML structure or layout
- Adding new screens or features
- Extracting JavaScript to separate files
- Admin-panel specific new functionality
