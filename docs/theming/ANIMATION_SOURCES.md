# Animation Sources - Framerr UI

**Purpose:** Track animation references from animate-ui.com that we'll adapt for Framerr  
**Status:** Planning Phase  
**Animation Style:** Gentle but fluid (lower stiffness/damping for smoother, softer movements)  
**Last Updated:** 2025-12-09

---

## 📋 Animation Philosophy

**Key Principles:**
- **Gentle & Fluid:** Prefer softer, smoother animations over sharp, bouncy effects
- **Adapt, Don't Copy:** Use animate-ui patterns as inspiration, customize to match Framerr's design
- **Theme Integration:** All animations must work with glassmorphism, theme colors, and Flatten UI mode
- **Accessibility First:** Respect user preferences (`prefers-reduced-motion`, Flatten UI toggle)

**Recommended Spring Physics:**
- **Stiffness:** 200-250 (lower than default 300 for gentler motion)
- **Damping:** 28-32 (higher than default 25 for smoother, less bouncy motion)
- **Duration Fallback:** 300-400ms (for non-spring transitions)

---

## 🎯 Selected Animations from Animate UI

### 1. Tabs Animation
**Source:** [animate-ui.com/docs/components/radix/tabs](https://animate-ui.com/docs/components/radix/tabs)  
**Library:** Radix UI Tabs + Framer Motion  
**Use Cases in Framerr:**
- Settings page tabs (Profile, Customization, Widgets, Auth, Advanced)
- Settings sub-tabs (Customization → General/Colors/Favicon)
- Auth settings tabs (Proxy/iFrame Auth)
- Advanced settings tabs (Debug/System/Diagnostics)
- Mobile tab bar (bottom navigation)

**Key Features:**
- Smooth content transition between tabs
- Animated indicator sliding under active tab
- Fade + slide animation for tab panels
- Keyboard navigation support

**Adaptation Notes:**
- Use theme utility classes for active tab indicator
- Integrate with existing hash-based navigation
- Ensure animations work with mobile tab bar swipe gestures
- Gentler spring physics for more fluid transitions

---

### 2. Sidebar Animation
**Source:** [animate-ui.com/docs/components/radix/sidebar](https://animate-ui.com/docs/components/radix/sidebar)  
**Library:** Radix UI Collapsible + Framer Motion  
**Use Cases in Framerr:**
- Desktop sidebar expand/collapse on hover
- Mobile sidebar slide-in/out
- Tab group expand/collapse
- Sidebar menu items reveal on expand

**Key Features:**
- Width animation (collapsed ↔ expanded)
- Content opacity/position animation
- Collapsible group animations
- Smooth backdrop fade

**Adaptation Notes:**
- Already have expand/collapse logic in `Sidebar.jsx`
- Replace inline `transition-all` with Framer Motion spring
- Animate icon rotation for collapsed groups
- Smooth text reveal when expanding

**Current Implementation:** Basic CSS transitions (duration-300)  
**Needs Upgrade:** Replace with spring physics for more natural feel

---

### 3. Popover Animation (Icon Picker)
**Source:** [animate-ui.com/docs/components/radix/popover](https://animate-ui.com/docs/components/radix/popover)  
**Library:** Radix UI Popover + Framer Motion  
**Use Cases in Framerr:**
- Icon picker in tab creation/editing
- Color picker dropdowns
- User menu dropdown
- Widget settings popovers
- Context menus

**Key Features:**
- Scale + opacity entrance
- Position animation (origin-aware)
- Exit animation
- Portal rendering (overlays content)

**Adaptation Notes:**
- Use for any "picker" UI where user selects from grid/list
- Integrate with theme's `glass-subtle` styling
- Ensure proper z-index layering with modals
- Gentle scale effect (0.96 → 1.0 instead of 0.9 → 1.0)

---

### 4. Tooltip Animation
**Source:** [animate-ui.com/docs/components/radix/tooltip](https://animate-ui.com/docs/components/radix/tooltip)  
**Library:** Radix UI Tooltip + Framer Motion  
**Use Cases in Framerr:**
- Button hover tooltips (especially in edit mode)
- Icon explanations throughout UI
- Truncated text on hover
- Feature hints for new users

**Key Features:**
- Subtle entrance delay
- Fade + slide from trigger direction
- Auto-positioning (flips if near screen edge)
- Accessible (screen reader friendly)

**Adaptation Notes:**
- Keep delay minimal (150-200ms)
- Very gentle animation (quick fade, minimal motion)
- Use theme colors (`.bg-theme-tertiary`, `.text-theme-primary`)
- Should feel "lightweight" - not distracting

**Current State:** Currently no systematic tooltip implementation  
**Opportunity:** Add tooltips broadly for improved UX

---

### 5. Button Animation
**Source:** [animate-ui.com/docs/components/buttons/button](https://animate-ui.com/docs/components/buttons/button)  
**Library:** Framer Motion (no Radix dependency)  
**Use Cases in Framerr:**
- Save buttons in settings
- Action buttons (Edit, Cancel, Delete)
- Widget add button
- Primary CTAs

**Key Features:**
- Press animation (scale down slightly)
- Hover lift effect (subtle)
- Loading state animation
- Success/error state transitions

**Adaptation Notes:**
- Apply to existing `Button.jsx` component
- Use `whileHover`, `whileTap` props from Framer Motion
- Respect Flatten UI (no animation when enabled)
- Very subtle scale (0.98 on press, 1.01 on hover)

**Current Implementation:** Basic CSS transitions  
**Needs Upgrade:** Add press feedback and state transitions

---

### 6. Dialog/Modal Animation
**Source:** [animate-ui.com/docs/components/headless/dialog](https://animate-ui.com/docs/components/headless/dialog)  
**Library:** Headless UI Dialog + Framer Motion  
**Use Cases in Framerr:**
- Add Widget modal
- Media info modals (Plex)
- Playback data modal
- Confirmation dialogs
- Any full-screen overlay

**Key Features:**
- Backdrop fade (0 → opacity)
- Modal scale + fade entrance
- Stagger animation (backdrop → modal → content)
- Exit animation on close
- Focus trap

**Adaptation Notes:**
- May combine with Popover animation for smaller modals
- Backdrop should use theme overlay color
- Modal should have `glass-card` or `glass-subtle` effect
- Content within modal could have stagger animation

**Current Files to Migrate:**
- `components/common/Modal.jsx` (base modal)
- `components/dashboard/AddWidgetModal.jsx` (widget gallery)
- `components/widgets/modals/MediaInfoModal.jsx` (Plex)
- `components/widgets/modals/PlaybackDataModal.jsx` (Plex)

---

## 🔍 Additional UI Elements Needing Animation

*These are Framerr-specific elements not explicitly covered by the above sources:*

### 7. Toggle/Switch Animation
**Current:** Basic CSS transition on toggle switches  
**Locations:**
- Settings page (OAuth toggle, Flatten UI toggle, etc.)
- Widget settings toggles
- Theme switcher

**Proposed Animation:**
- Spring physics for toggle knob movement
- Background color transition
- Slight knob scale on press
- Haptic-feeling motion

**Inspiration:** Could use button animation principles with custom spring

---

### 8. Accordion/Collapsible Sections
**Current:** Basic height transition  
**Locations:**
- Widget error boundary (expand details)
- Settings expandable sections (Status Colors, Advanced Colors)
- Sidebar group expand/collapse

**Proposed Animation:**
- Smooth height animation with spring physics
- Content fade-in as it reveals
- Rotate chevron icon
- Stagger children if multiple items

**Reference:** Radix Accordion (not selected yet, but available on animate-ui)

---

### 9. Widget Add/Remove Animation
**Current:** Grid rearranges with CSS transition  
**Locations:**
- Adding widget from modal
- Removing widget from dashboard
- Widget reordering

**Proposed Animation:**
- Fade + scale in when added
- Shrink + fade out when removed
- Grid items smoothly rearrange
- "Magic move" feeling

**Implementation:** Framer Motion layout animations (`layout` prop)

---

### 10. Page Transition Animation
**Current:** Hash navigation with instant switch  
**Locations:**
- Dashboard ↔ Settings
- Settings ↔ Tab view
- Tab content switching

**Proposed Animation:**
- Subtle fade between routes
- Slide animation for tab content
- Preserve scroll position
- Very fast (200-300ms) to not feel sluggish

**Reference:** Could use tabs animation pattern from animate-ui

---

### 11. List/Grid Item Hover States
**Current:** Basic transitions on hover  
**Locations:**
- Widget gallery cards
- Link grid items
- Settings theme cards
- Sidebar menu items

**Proposed Animation:**
- Subtle lift on hover (shadow increase)
- Border glow effect
- Scale very slightly (1.0 → 1.02)
- Smooth color transitions

**Reference:** Button hover animations

---

### 12. Loading States
**Current:** Basic spinners in some places  
**Locations:**
- Widget data loading
- Settings save operations
- Initial app load

**Proposed Animation:**
- Skeleton loading screens
- Spinner with spring rotation
- Progressive reveal as data loads
- Smooth transition from loading → content

**Implementation:** Custom with Framer Motion

---

### 13. Toast Notifications
**Current:** Not implemented (browser alerts used)  
**Locations:**
- Save confirmations
- Error messages
- Success notifications

**Proposed Animation:**
- Slide in from top/bottom
- Stack multiple toasts
- Auto-dismiss with timer
- Exit animation (slide + fade)

**Reference:** Could use dialog animation pattern with position variants

---

### 14. Dropdown Menu Animation
**Current:** Basic component exists  
**File:** `components/common/Dropdown.jsx`  
**Locations:**
- User menu
- Widget context menus
- Select inputs

**Proposed Animation:**
- Scale + fade entrance (like popover)
- Stagger menu items
- Exit animation
- Position-aware (flip if near edge)

**Reference:** Popover animation from animate-ui

---

### 15. Form Validation Feedback
**Current:** Instant validation display  
**Locations:**
- Login form
- Settings forms
- Widget configuration

**Proposed Animation:**
- Shake on error
- Success checkmark animation
- Input border pulse on error
- Smooth error message slide-in

**Implementation:** Custom with Framer Motion (`animate` prop)

---

## 📊 Priority Matrix

### Highest Impact (Implement First)
1. **Tabs** - Used everywhere, highly visible
2. **Dialog/Modal** - Major interaction point
3. **Sidebar** - Core navigation element
4. **Button** - Universal component

### High Impact
5. **Tooltip** - QoL improvement across entire app
6. **Popover** - Icon picker and dropdowns
7. **Toggle/Switch** - Frequent interaction
8. **Widget Add/Remove** - Dashboard primary action

### Medium Impact
9. **Accordion/Collapsible** - Settings UX improvement
10. **Page Transition** - Polish
11. **List Item Hover** - Visual refinement
12. **Dropdown Menu** - Enhances existing component

### Lower Impact (Polish)
13. **Loading States** - Progressive enhancement
14. **Toast Notifications** - Nice-to-have
15. **Form Validation** - Micro-interactions

---

## 🛠️ Implementation Strategy

### Phase 1: Core Infrastructure
- Install Framer Motion
- Set up animation CSS variables
- Create base animation utilities
- Configure theme integration
- **Components:** None yet, just setup

### Phase 2: High-Visibility Components
- Tabs (Settings + Mobile)
- Dialog/Modal
- Sidebar
- Button
- **Estimated:** 2-3 sessions

### Phase 3: Interactive Elements
- Tooltip
- Popover
- Toggle/Switch
- Dropdown Menu
- **Estimated:** 2 sessions

### Phase 4: Dashboard-Specific
- Widget Add/Remove
- Page Transitions
- Grid Hover States
- **Estimated:** 1-2 sessions

### Phase 5: Polish & Refinement
- Accordion
- Loading States
- Toast Notifications
- Form Validation
- **Estimated:** 2-3 sessions

---

## ⚙️ Animation Configuration

### Recommended CSS Variables
```css
:root {
  /* Spring Physics - Gentle & Fluid */
  --animation-spring-stiffness: 220;
  --animation-spring-damping: 30;
  
  /* Duration Fallbacks */
  --animation-duration-instant: 0ms;
  --animation-duration-fast: 150ms;
  --animation-duration-normal: 300ms;
  --animation-duration-slow: 500ms;
  
  /* Easing Functions */
  --animation-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --animation-ease-out: cubic-bezier(0.0, 0, 0.2, 1);
  --animation-ease-in: cubic-bezier(0.4, 0, 1, 1);
  
  /* Scale Values */
  --animation-scale-press: 0.98;
  --animation-scale-hover: 1.01;
  --animation-scale-modal: 0.96;
}

/* Flatten UI Mode: Disable */
[data-flatten-ui="true"] * {
  --animation-spring-stiffness: 0;
  --animation-spring-damping: 0;
  animation: none !important;
  transition: none !important;
}

/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 📝 Notes

- **User Preference:** Gentle but fluid - prioritize smoothness over snappiness
- **Not Using As-Is:** All animations will be adapted to Framerr's design system
- **Theme Integration:** Must work with glassmorphism, theme colors, and Flatten UI
- **Testing Required:** Test all animations in Light/Dark themes and with Flatten UI enabled

---

**Next Steps:**
1. Get user approval on priority order
2. Implement Phase 1 infrastructure
3. Start with highest-impact components (Tabs, Modals, Sidebar, Buttons)
4. Iterate and refine based on user feedback
