# Widget Development Reference

**Quick reference for creating widgets in Framerr.**

---

## Widget Structure

Widgets are React components in `src/components/widgets/`.

```
src/components/widgets/
├── CalendarWidget.jsx
├── ClockWidget.jsx
├── CustomHTMLWidget.jsx
├── LinkGridWidget.jsx
├── OverseerrWidget.jsx
├── PlexWidget.jsx
├── QBittorrentWidget.jsx
├── RadarrWidget.jsx
├── SonarrWidget.jsx
├── SystemStatusWidget.jsx
├── UpcomingMediaWidget.jsx
└── WeatherWidget.jsx
```

---

## Widget Template

```jsx
import React from 'react';

const MyWidget = ({ config }) => {
    return (
        <div className="h-full p-4 bg-theme-secondary rounded-lg">
            <h3 className="text-theme-primary font-semibold">
                Widget Title
            </h3>
            <div className="text-theme-secondary">
                Widget content
            </div>
        </div>
    );
};

export default MyWidget;
```

---

## Widget Registry

Register new widgets in `src/utils/widgetRegistry.js`:

```javascript
import MyWidget from '../components/widgets/MyWidget';

export const widgetRegistry = {
    // ... existing widgets
    mywidget: {
        component: MyWidget,
        name: 'My Widget',
        description: 'Description here',
        defaultConfig: {}
    }
};
```

---

## Integration-Aware Widgets

For widgets that use integrations:

```jsx
const { integrations } = useAppData();
const integration = integrations?.serviceName;
const isEnabled = integration?.enabled && integration?.url;

if (!isEnabled) {
    return <IntegrationDisabledMessage serviceName="Service Name" />;
}
```

---

## Widget Config

Widgets receive a `config` prop with user settings:

```jsx
const MyWidget = ({ config }) => {
    const { setting1, setting2 } = config;
    // Use config values
};
```

---

## Widget Styling

**Required:**
- Use theme classes (see `docs/reference/theming.md`)
- Test in Light theme
- Test with "Flatten UI" enabled
- Support glassmorphism via `.glass-card` class

**Example:**

```jsx
<div className="glass-card h-full p-4">
    <h3 className="text-theme-primary">Title</h3>
</div>
```

---

## Status Colors

```jsx
// For status indicators
const getStatusColor = (status) => {
    switch (status) {
        case 'success': return 'var(--success)';
        case 'warning': return 'var(--warning)';
        case 'error': return 'var(--error)';
        default: return 'var(--info)';
    }
};
```

---

## Testing Checklist

Before committing a new widget:
- [ ] Works with integration disabled (if applicable)
- [ ] Follows theming guidelines
- [ ] Tested in Light and Dark themes
- [ ] Tested with Flatten UI
- [ ] Registered in widget registry
- [ ] Build passes (`npm run build`)
