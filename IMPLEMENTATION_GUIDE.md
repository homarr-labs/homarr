# React Aria TV Navigation - Implementation Guide

## 🚀 Quick Start

This guide provides step-by-step instructions for integrating the React Aria TV navigation system into Homarr.

## 📦 Dependencies

The following React Aria packages are already installed:

```bash
pnpm add @react-aria/focus @react-aria/dialog @react-aria/interactions @react-aria/overlays
```

## 🏗️ Core Components

### 1. TV Navigation Context (`packages/widgets/src/tv-navigation/context.tsx`)

Central state management for TV navigation:

```typescript
import { TVNavigationProvider, useTVNavigation } from './tv-navigation';

// Wrap your app with the provider
<TVNavigationProvider>
  {/* Your app content */}
</TVNavigationProvider>
```

### 2. TV Modal Component (`packages/widgets/src/tv-navigation/tv-modal.tsx`)

Replace all native dialogs with this component:

```typescript
import { TVModal } from './tv-navigation';

// Usage
<TVModal 
  isOpen={showModal} 
  onClose={() => setShowModal(false)}
  title="App Activation"
>
  <p>Opening {appName}...</p>
</TVModal>
```

### 3. TV Focus Hook (`packages/widgets/src/tv-navigation/use-tv-focus.ts`)

For individual focusable components:

```typescript
import { useTVFocus } from './tv-navigation';

function AppWidget({ app, index }) {
  const { ref, isFocused, handleClick } = useTVFocus({
    index,
    onEnterPress: () => {
      // Handle app activation
    }
  });

  return (
    <div 
      ref={ref}
      onClick={handleClick}
      className={isFocused ? 'focused' : ''}
    >
      {/* App content */}
    </div>
  );
}
```

## 🔄 Migration Steps

### Step 1: Add Provider to Layout

Update your main layout component:

```typescript
// apps/nextjs/src/app/[locale]/layout.tsx
import { TVNavigationProvider } from "@homarr/widgets/tv-navigation";

export default function Layout({ children }) {
  return (
    <TVNavigationProvider>
      {children}
    </TVNavigationProvider>
  );
}
```

### Step 2: Update App Widgets

Replace the current spatial navigation in app components:

```typescript
// Before
import { useFocusStyle, useFocusable } from "@homarr/spatial-navigation";

// After
import { useTVFocus, TVModal } from "@homarr/widgets/tv-navigation";

function AppWidget({ app, options, index }) {
  const [showModal, setShowModal] = useState(false);
  
  const { ref, isFocused } = useTVFocus({
    index,
    onEnterPress: () => {
      setShowModal(true);
      // Handle app opening logic
    }
  });

  return (
    <>
      <div ref={ref} className={isFocused ? 'focused' : ''}>
        {/* App content */}
      </div>
      
      <TVModal 
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Opening App"
      >
        <p>Opening {app.name}...</p>
      </TVModal>
    </>
  );
}
```

### Step 3: Remove Old Dependencies

```bash
# Remove the problematic spatial navigation package
rm -rf packages/spatial-navigation

# Update package.json to remove references
# Remove from transpilePackages in next.config.ts
```

### Step 4: Update Styling

Add focus styles for TV navigation:

```css
.focused {
  border: 3px solid #3b82f6;
  background: #1e40af;
  transform: scale(1.05);
  outline: none;
}

.app-item:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}
```

## 🧪 Testing

### Manual Testing:
1. Press arrow keys 3 times to activate TV mode
2. Use arrow keys to navigate between apps
3. Press Enter to activate an app
4. Verify modal appears with proper focus trapping
5. Press Enter/Escape to close modal
6. Verify navigation resumes after modal closes

### Automated Testing:
```typescript
// e2e/tv-navigation.spec.ts
test('TV Navigation works after modal interactions', async ({ page }) => {
  // Activate TV mode
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight'); 
  await page.keyboard.press('ArrowRight');
  
  // Test multiple interactions
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Enter');
    await page.waitForSelector('.modal-overlay');
    await page.keyboard.press('Enter'); // Close modal
    await page.waitForSelector('.modal-overlay', { state: 'hidden' });
    await page.keyboard.press('ArrowRight'); // Should still work
  }
});
```

## 🔧 Troubleshooting

### Common Issues:

1. **Focus not restored after modal**
   - Ensure `TVModal` is properly closed with `onClose`
   - Check that focus restoration timeout is sufficient

2. **Arrow keys not working in TV mode**
   - Verify `TVNavigationProvider` wraps your app
   - Check that components use `useTVFocus` hook

3. **Modal doesn't trap focus**
   - Ensure React Aria dependencies are installed
   - Verify modal uses proper ARIA attributes

### Debug Mode:
Enable console logging to debug focus issues:

```typescript
// Add to context.tsx for debugging
console.log('TV Mode:', isTVMode, 'Current Focus:', currentFocus);
```

## 📋 Checklist

- [ ] React Aria dependencies installed
- [ ] TV navigation components created
- [ ] Provider added to layout
- [ ] App widgets updated to use new hooks
- [ ] Old spatial navigation package removed
- [ ] Focus styles updated
- [ ] Testing completed
- [ ] Documentation updated

## 🎯 Performance Notes

- Bundle size increase: ~15KB gzipped
- No performance impact on navigation
- Lazy load TV navigation components if needed
- Consider code splitting for large applications

## 🔗 References

- [React Aria Documentation](https://react-spectrum.adobe.com/react-aria/)
- [Focus Management Best Practices](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [TV Navigation Patterns](https://developer.roku.com/docs/developer-program/core-concepts/navigation.md)

---

*For questions or issues, refer to the TV Navigation PoC documentation.*