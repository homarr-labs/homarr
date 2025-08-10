/**
 * Example Integration - TV Navigation with React Aria
 * 
 * This file demonstrates how to integrate the React Aria TV navigation system
 * into existing Homarr components. Use this as a reference for implementation.
 * 
 * @author TV Navigation PoC Team
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { useTVFocus, TVModal } from './packages/widgets/src/tv-navigation';

// Example: App Widget with TV Navigation
interface AppWidgetProps {
  app: {
    id: string;
    name: string;
    href?: string;
    iconUrl?: string;
  };
  index: number;
  options: {
    openInNewTab: boolean;
  };
}

export function AppWidgetWithTVNavigation({ app, index, options }: AppWidgetProps) {
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // TV Navigation integration
  const { ref, isFocused, handleClick } = useTVFocus({
    index,
    onEnterPress: handleAppActivation,
  });

  // Handle app activation with custom modal (no native dialogs!)
  const handleAppActivation = useCallback(() => {
    if (app.href) {
      if (options.openInNewTab) {
        setModalMessage(`Opening ${app.name} in new tab`);
        setShowModal(true);
        
        // Open in new tab after modal is shown
        setTimeout(() => {
          if (app.href) {
            window.open(app.href, '_blank', 'noopener,noreferrer');
          }
        }, 100);
      } else {
        setModalMessage(`Opening ${app.name}`);
        setShowModal(true);
        
        // Navigate after modal is shown
        setTimeout(() => {
          if (app.href) {
            window.location.href = app.href;
          }
        }, 100);
      }
    }
  }, [app.href, app.name, options.openInNewTab]);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
    setModalMessage('');
    // Focus restoration is handled automatically by TVModal
  }, []);

  return (
    <>
      {/* App Widget with TV Navigation */}
      <div
        ref={ref}
        onClick={handleClick}
        className={`app-widget ${isFocused ? 'focused' : ''}`}
        tabIndex={isFocused ? 0 : -1}
        role="button"
        aria-label={`Open ${app.name}`}
      >
        <div className="app-icon">
          {app.iconUrl ? (
            <img src={app.iconUrl} alt={app.name} />
          ) : (
            <div className="placeholder-icon">📱</div>
          )}
        </div>
        <div className="app-name">{app.name}</div>
      </div>

      {/* Custom Modal with React Aria */}
      <TVModal
        isOpen={showModal}
        onClose={handleModalClose}
        title="App Activation"
      >
        <p>{modalMessage}</p>
      </TVModal>
    </>
  );
}

// Example: Layout with TV Navigation Provider
export function LayoutWithTVNavigation({ children }: { children: React.ReactNode }) {
  return (
    <TVNavigationProvider>
      <div className="app-layout">
        <header>Homarr Dashboard</header>
        <main>{children}</main>
      </div>
    </TVNavigationProvider>
  );
}

// Example: App Grid with TV Navigation
interface AppGridProps {
  apps: Array<{
    id: string;
    name: string;
    href?: string;
    iconUrl?: string;
  }>;
  options: {
    openInNewTab: boolean;
  };
}

export function AppGridWithTVNavigation({ apps, options }: AppGridProps) {
  const { setTotalItems } = useTVNavigation();

  // Update total items count for TV navigation
  React.useEffect(() => {
    setTotalItems(apps.length);
  }, [apps.length, setTotalItems]);

  return (
    <div className="apps-grid">
      {apps.map((app, index) => (
        <AppWidgetWithTVNavigation
          key={app.id}
          app={app}
          index={index}
          options={options}
        />
      ))}
    </div>
  );
}

// Example: CSS for TV Navigation
const TVNavigationStyles = `
/* TV Navigation Focus Styles */
.app-widget {
  background: #333;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 3px solid transparent;
  outline: none;
}

.app-widget:hover {
  background: #444;
}

.app-widget.focused {
  border-color: #3b82f6;
  background: #1e40af;
  transform: scale(1.05);
  box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
}

.app-widget:focus-visible {
  outline: 2px solid #60a5fa;
  outline-offset: 2px;
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  padding: 20px;
}

/* Responsive TV Navigation */
@media (min-width: 1280px) {
  .apps-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* TV Mode Indicator */
.tv-mode-active .app-widget.focused {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { 
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
  }
  50% { 
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.6);
  }
}
`;

export default AppWidgetWithTVNavigation;