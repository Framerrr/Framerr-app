# Widget Development Guide

## Overview

This guide provides step-by-step instructions for creating new dashboard widgets following the Framerr widget system architecture.

---

## Widget Sizing Questionnaire

When creating a new widget, answer these questions to determine proper sizing constraints:

### 1. Content Analysis
- **Q1:** What type of content does the widget display?
  - Options: List, Grid, Single metric, Chart, Media, Text block, Custom
- **Q2:** How many distinct pieces of information are shown?
  - Consider: Headers, values, labels, icons, images
- **Q3:** Does the content need to scroll vertically?
  - Yes → Consider higher maxH
  - No → Keep maxH moderate

### 2. Minimum Width (minW)
- **Q4:** What is the narrowest width that maintains readability?
  - 2 cols (≈200px): Very compact text-only widgets
  - 3 cols (≈280px): Standard compact widgets, allows short labels
  - 4 cols (≈360px): Comfortable reading width, sideby-side elements
  - 5+ cols: Wide layouts, multiple columns, media grids

**Guidelines:**
- Text labels: Need ~3 cols minimum for comfort
- Side-by-side elements: Need ~4 cols minimum
- Image + text: Need ~4 cols minimum
- Multiple columns: Need 5+ cols

### 3. Minimum Height (minH) - WITH HEADER
- **Q5:** How many rows of content are displayed?
  - 1 row: minH = 2 (1 for header + 1 for content)
  - 2 rows: minH = 3 (1 for header + 2 for content)
  - 3 rows: minH = 4 (1 for header + 3 for content)

**Important:** Always set minH assuming header is VISIBLE. The system automatically reduces by 1 when `hideHeader: true`.

### 4. Maximum Height (maxH)
- **Q6:** Should the widget expand vertically?
  - Fixed content: Set maxH close to minH (e.g., minH:2, maxH:2 or 3)
  - Scrollable lists: Set higher maxH (e.g., maxH:6 or 8)
  - No limit: Omit maxH entirely

### 5. Default Size
- **Q7:** What is the ideal initial size?
  - Usually: `w` = minW + 1-2 cols, `h` = minH (or +1 if comfortable)
  - Balance: Not too cramped, not excessively large

---

## Widget Sizing Examples

### Example 1: Clock Widget
**Content:** Time display + date
**Answers:**
- Q1: Text block
- Q2: 2 pieces (time, date)
- Q3: No scroll
- Q4: 3 cols (enough for "00:00:00 PM")
- Q5: 2 rows (time + date, with header)
- Q6: Fixed → maxH: 2
- Q7: Default 3x2 (compact)

**Registry Entry:**
```javascript
'clock': {
    component: ClockWidget,
    icon: Clock,
    name: 'Clock',
    description: 'Time display with timezone support',
    category: 'utility',
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 3, h: 2 },
    maxSize: { h: 2 },
    requiresIntegration: false
}
```

**Sizing Behavior:**
- With header: Can't go below 3x2
- Without header: Can go to 3x1 (auto-adjusted)

---

### Example 2: Plex Widget
**Content:** Media images + text (title, user, progress)
**Answers:**
- Q1: Grid/media
- Q2: Multiple (poster, title, user, progress)
- Q3: Yes (multiple streams)
- Q4: 4 cols (image + text side-by-side)
- Q5: 4 rows (header + 3 rows of content for comfortable viewing)
- Q6: Scrollable → maxH: 6
- Q7: Default 6x3 (wider for multi-stream)

**Registry Entry:**
```javascript
'plex': {
    component: PlexWidget,
    icon: Tv,
    name: 'Plex',
    description: 'Now playing and recent activity',
    category: 'media',
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 4 },
    maxSize: { h: 6 },
    requiresIntegration: 'plex'
}
```

**Sizing Behavior:**
- With header: Can't go below 4x4
- Without header: Can go to 4x3 (auto-adjusted)

---

### Example 3: List Widget (Sonarr/Radarr)
**Content:** Vertical list of episodes/movies
**Answers:**
- Q1: List
- Q2: Multiple items (title, date, status)
- Q3: Yes (scrolls)
- Q4: 3 cols (title can wrap)
- Q5: 3 rows (header + 2 visible items minimum)
- Q6: Scrollable → maxH: 6
- Q7: Default 4x3 (comfortable list)

**Registry Entry:**
```javascript
'sonarr': {
    component: SonarrWidget,
    icon: MonitorPlay,
    name: 'Sonarr',
    description: 'TV show management and calendar',
    category: 'media',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 3 },
    maxSize: { h: 6 },
    requiresIntegration: 'sonarr'
}
```

**Sizing Behavior:**
- With header: Can't go below 3x3
- Without header: Can go to 3x2 (auto-adjusted)

---

## Sizing Rules Summary

### Minimum Width Guidelines
| Widget Type | Recommended minW | Reason |
|-------------|------------------|--------|
| Text-only compact | 2 | Minimal text display |
| Standard text | 3 | Comfortable reading |
| Side-by-side elements | 4 | Two-column layout |
| Media + text | 4 | Image beside info |
| Wide layouts | 5-6 | Multiple columns |

### Minimum Height Guidelines (With Header)
| Content Rows | minH | Example |
|--------------|------|---------|
| 1 row | 2 | Clock, single metric |
| 2 rows | 3 | List items, stats grid |
| 3 rows | 4 | Detailed cards, rich content |

**Remember:** System automatically subtracts 1 from minH when header is hidden!

### Maximum Height Guidelines
| Behavior | Recommended maxH | Example |
|----------|------------------|---------|
| Fixed/compact | 2-3 | Clock, Weather |
| Medium content | 4-5 | System Status, stats |
| Scrollable | 6-8 | Lists, feeds |
| Unlimited | (omit) | Custom HTML, flexible content |

---

## Header-Aware Sizing System

### How It Works

```javascript
// Dashboard automatically adjusts minH based on header visibility
minH_effective = minH_registry - (hideHeader ? 1 : 0)
minH_final = Math.max(minH_effective, 1) // Never below 1
```

### Example Calculations

**Widget with minSize: { w: 4, h: 4 }**
- Header shown: minW = 4, minH = 4
- Header hidden: minW = 4, minH = 3

**Widget with minSize: { w: 3, h: 2 }**
- Header shown: minW = 3, minH = 2
- Header hidden: minW = 3, minH = 1

**Safety:** Widgets can never have minH < 1, even with header hidden.

---

## New Widget Checklist

When adding a new widget to the system:

### 1. Component Development
- [ ] Create widget component in `src/components/widgets/`
- [ ] Implement `config`, `editMode`, `widgetId` props
- [ ] Add error handling and loading states
- [ ] Test responsive behavior at different sizes

### 2. Widget Registry
- [ ] Add entry to `src/utils/widgetRegistry.js`
- [ ] Set component, icon, name, description, category
- [ ] Answer sizing questionnaire (above)
- [ ] Set `defaultSize`, `minSize`, `maxSize`
- [ ] Set `requiresIntegration` if needed

### 3. Sizing Validation
- [ ] Test with header visible (should respect minSize)
- [ ] Test with header hidden (should reduce minH by 1)
- [ ] Test at minimum size (content not cut off)
- [ ] Test at maximum size (behaves correctly)
- [ ] Test on mobile breakpoints

### 4. Integration (if required)
- [ ] Add integration configuration in Settings
- [ ] Add to `IntegrationsSettings.jsx`
- [ ] Test enable/disable behavior
- [ ] Add proper error messages

---

## Common Sizing Patterns

### Pattern 1: Compact Info Widget (Clock, Weather)
```javascript
defaultSize: { w: 3, h: 2-3 }
minSize: { w: 3, h: 2 }
maxSize: { h: 2-4 }
```
**Use for:** Single value, compact displays

### Pattern 2: Standard List Widget (Sonarr, Radarr)
```javascript
defaultSize: { w: 4, h: 3 }
minSize: { w: 3, h: 3 }
maxSize: { h: 6 }
```
**Use for:** Scrollable lists, feeds

### Pattern 3: Rich Media Widget (Plex, Overseerr)
```javascript
defaultSize: { w: 6, h: 3-4 }
minSize: { w: 4, h: 4 }
maxSize: { h: 6 }
```
**Use for:** Images + detailed text

### Pattern 4: Flexible Widget (Custom HTML)
```javascript
defaultSize: { w: 4, h: 3 }
minSize: { w: 2, h: 2 }
maxSize: { h: 10 }
```
**Use for:** User-controlled content

---

## Testing Your Widget

### Size Matrix Test
Test your widget at these critical sizes:

| Test Case | Size | Check |
|-----------|------|-------|
| Min w/ header | minW × minH | Content visible, not cut off |
| Min w/o header | minW × (minH-1) | Content visible, not cut off |
| Default | defaultSize | Looks comfortable, well-proportioned |
| Max height | minW × maxH | Scrolls correctly if needed |
| Wide | (minW+3) × minH | Responsive behavior (if applicable) |

### Header Toggle Test
1. Add widget to dashboard
2. Edit widget settings → Toggle "Hide Header"
3. Verify widget resizes correctly
4. Verify content still looks good
5. Try resizing to minimum - should stop at adjusted minH

---

## Files Reference

### Add Widget Component
**Location:** `src/components/widgets/YourWidget.jsx`
**Template:**
```javascript
import React, { useState, useEffect } from 'react';

const YourWidget = ({ config, editMode, widgetId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Your logic here
    
    return (
        <div>
            {/* Your content */}
        </div>
    );
};

export default YourWidget;
```

### Register Widget
**Location:** `src/utils/widgetRegistry.js`
**Add to:** `WIDGET_TYPES` object

### Add Integration (if needed)
**Location:** `src/pages/settings/IntegrationsSettings.jsx`
