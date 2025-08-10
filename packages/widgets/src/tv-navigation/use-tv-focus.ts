"use client";

/**
 * TV Focus Hook - React Aria Implementation
 * 
 * React hook for managing individual component focus in TV navigation.
 * Provides focus state, keyboard handling, and integration with TV context.
 * 
 * Key Features:
 * - Individual component focus management
 * - Enter key activation handling
 * - Focus state coordination with global TV context
 * - Click interaction support for mixed input scenarios
 * 
 * @author TV Navigation PoC Team
 * @version 1.0.0
 */

import { useRef, useEffect, useCallback } from 'react';
import { useTVNavigation } from './context';

interface UseTVFocusOptions {
  index: number;
  onEnterPress?: () => void;
}

export function useTVFocus({ index, onEnterPress }: UseTVFocusOptions) {
  const { isTVMode, currentFocus, setCurrentFocus } = useTVNavigation();
  const ref = useRef<HTMLElement>(null);

  const isFocused = isTVMode && currentFocus === index;

  // Handle Enter key press
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter' && isFocused && onEnterPress) {
      event.preventDefault();
      event.stopPropagation();
      onEnterPress();
    }
  }, [isFocused, onEnterPress]);

  // Set focus when this item becomes focused
  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.focus();
    }
  }, [isFocused]);

  // Add keyboard event listener
  useEffect(() => {
    if (isTVMode) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isTVMode, handleKeyDown]);

  // Handle click to set focus
  const handleClick = useCallback(() => {
    if (isTVMode) {
      setCurrentFocus(index);
    }
  }, [isTVMode, setCurrentFocus, index]);

  return {
    ref,
    isFocused,
    handleClick,
    tabIndex: isTVMode ? 0 : -1,
  };
} 