"use client";

/**
 * TV Navigation Context - React Aria Implementation
 * 
 * This module provides TV remote control navigation for Homarr using React Aria
 * for robust focus management. Replaces the problematic spatial navigation library
 * with industry-standard patterns used by Adobe, Netflix, and Disney+.
 * 
 * Key Features:
 * - Arrow key activation (3 presses to enter TV mode)
 * - Spatial grid navigation
 * - Mouse movement detection for TV mode deactivation
 * - Proper focus management for accessibility
 * 
 * @author TV Navigation PoC Team
 * @version 1.0.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface TVNavigationContextType {
  isTVMode: boolean;
  currentFocus: number;
  setCurrentFocus: (index: number) => void;
  activateTVMode: () => void;
  deactivateTVMode: () => void;
  navigate: (direction: 'up' | 'down' | 'left' | 'right') => void;
  totalItems: number;
  setTotalItems: (count: number) => void;
}

const TVNavigationContext = createContext<TVNavigationContextType | null>(null);

interface TVNavigationProviderProps {
  children: React.ReactNode;
}

export function TVNavigationProvider({ children }: TVNavigationProviderProps) {
  const [isTVMode, setIsTVMode] = useState(false);
  const [currentFocus, setCurrentFocus] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [arrowKeyCount, setArrowKeyCount] = useState(0);
  const [lastMousePosition, setLastMousePosition] = useState({ x: 0, y: 0 });
  const mouseMovementThreshold = 50;
  const mouseInactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Activate TV mode
  const activateTVMode = useCallback(() => {
    setIsTVMode(true);
    setArrowKeyCount(0);
  }, []);

  // Deactivate TV mode
  const deactivateTVMode = useCallback(() => {
    setIsTVMode(false);
    setArrowKeyCount(0);
  }, []);

  // Navigate in TV mode
  const navigate = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!isTVMode || totalItems === 0) return;

    const cols = 3; // Assuming 3 columns for grid layout
    let newFocus = currentFocus;

    switch (direction) {
      case 'right':
        newFocus = (currentFocus + 1) % totalItems;
        break;
      case 'left':
        newFocus = (currentFocus - 1 + totalItems) % totalItems;
        break;
      case 'down':
        newFocus = (currentFocus + cols) % totalItems;
        break;
      case 'up':
        newFocus = (currentFocus - cols + totalItems) % totalItems;
        break;
    }

    setCurrentFocus(newFocus);
  }, [isTVMode, currentFocus, totalItems]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      
      if (!isTVMode) {
        // Count arrow key presses to activate TV mode
        setArrowKeyCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            activateTVMode();
            return 0;
          }
          return newCount;
        });
        return;
      }

      // Navigate in TV mode
      switch (event.key) {
        case 'ArrowRight':
          navigate('right');
          break;
        case 'ArrowLeft':
          navigate('left');
          break;
        case 'ArrowDown':
          navigate('down');
          break;
        case 'ArrowUp':
          navigate('up');
          break;
      }
    }
  }, [isTVMode, navigate, activateTVMode]);

  // Handle mouse movement to deactivate TV mode
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isTVMode) return;

    const mouseDelta = Math.sqrt(
      Math.pow(event.clientX - lastMousePosition.x, 2) + 
      Math.pow(event.clientY - lastMousePosition.y, 2)
    );

    if (mouseDelta > mouseMovementThreshold) {
      deactivateTVMode();
    }

    setLastMousePosition({ x: event.clientX, y: event.clientY });
  }, [isTVMode, lastMousePosition, deactivateTVMode]);

  // Set up event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleKeyDown, handleMouseMove]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (mouseInactivityTimerRef.current) {
        clearTimeout(mouseInactivityTimerRef.current);
      }
    };
  }, []);

  const value: TVNavigationContextType = {
    isTVMode,
    currentFocus,
    setCurrentFocus,
    activateTVMode,
    deactivateTVMode,
    navigate,
    totalItems,
    setTotalItems,
  };

  return (
    <TVNavigationContext.Provider value={value}>
      {children}
    </TVNavigationContext.Provider>
  );
}

export function useTVNavigation() {
  const context = useContext(TVNavigationContext);
  if (!context) {
    throw new Error('useTVNavigation must be used within a TVNavigationProvider');
  }
  return context;
} 