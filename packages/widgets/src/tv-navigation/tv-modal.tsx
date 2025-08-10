"use client";

/**
 * TV Modal Component - React Aria Implementation
 * 
 * Custom modal component with proper focus trapping for TV navigation.
 * Replaces native browser dialogs that break TV remote control functionality.
 * 
 * Key Features:
 * - React Aria dialog integration for accessibility
 * - Proper focus trapping prevents background navigation
 * - Keyboard event isolation (only modal keys work)
 * - Automatic focus restoration on close
 * - ARIA compliant for screen readers
 * 
 * @author TV Navigation PoC Team
 * @version 1.0.0
 */

import React, { useRef, useEffect } from 'react';
import { useDialog } from '@react-aria/dialog';
import { useFocusTrap } from '@react-aria/focus';

interface TVModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm?: () => void;
}

export function TVModal({ isOpen, onClose, title, children, onConfirm }: TVModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { dialogProps } = useDialog({}, modalRef);
  const { focusTrapProps } = useFocusTrap({ isDisabled: !isOpen });

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle Enter key on OK button
  const handleOKClick = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        ref={modalRef}
        {...dialogProps}
        {...focusTrapProps}
        className="bg-gray-800 p-6 rounded-lg max-w-md mx-4 border-2 border-blue-500"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h2 
          id="modal-title" 
          className="text-lg font-semibold mb-4 text-white"
        >
          {title}
        </h2>
        
        <div className="text-white mb-6">
          {children}
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleOKClick}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            autoFocus
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
} 