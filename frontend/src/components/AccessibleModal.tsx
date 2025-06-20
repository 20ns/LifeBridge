import React, { useEffect, useRef, ReactNode } from 'react';
import { X, AlertTriangle, Phone } from 'lucide-react';
import './AccessibleModal.css';

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  children: ReactNode;
  type?: 'confirmation' | 'emergency' | 'info';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  emergencyAction?: boolean;
}

const AccessibleModal: React.FC<AccessibleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  children,
  type = 'confirmation',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  showCancel = true,
  emergencyAction = false
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element before opening modal
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Focus the modal after opening
      setTimeout(() => {
        if (emergencyAction && confirmRef.current) {
          confirmRef.current.focus();
        } else if (initialFocusRef.current) {
          initialFocusRef.current.focus();
        }
      }, 100);

      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, emergencyAction]);

  useEffect(() => {
    if (!isOpen && previousActiveElement.current) {
      // Return focus to the previously focused element when modal closes
      previousActiveElement.current.focus();
    }
  }, [isOpen]);

  const confirmRef = useRef<HTMLButtonElement>(null);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }

    if (event.key === 'Tab') {
      // Focus trapping logic
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements && focusableElements.length > 0) {
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
        
        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  if (!isOpen) return null;

  const getModalIcon = () => {
    switch (type) {
      case 'emergency':
        return emergencyAction ? 
          <Phone className="modal-icon emergency-icon" aria-hidden="true" /> :
          <AlertTriangle className="modal-icon warning-icon" aria-hidden="true" />;
      case 'info':
        return null;
      default:
        return <AlertTriangle className="modal-icon warning-icon" aria-hidden="true" />;
    }
  };

  const getModalClass = () => {
    const baseClass = 'accessible-modal';
    const typeClass = type ? ` modal-${type}` : '';
    const emergencyClass = emergencyAction ? ' modal-emergency-action' : '';
    return `${baseClass}${typeClass}${emergencyClass}`;
  };

  return (
    <div 
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-content"
    >
      <div 
        ref={modalRef}
        className={getModalClass()}
        onKeyDown={handleKeyDown}
      >
        <div className="modal-header">
          {getModalIcon()}
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
          {!emergencyAction && (
            <button
              ref={initialFocusRef}
              className="modal-close-button"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={20} aria-hidden="true" />
            </button>
          )}
        </div>

        <div id="modal-content" className="modal-content">
          {children}
        </div>

        <div className="modal-actions">
          {onConfirm && (
            <button
              ref={emergencyAction ? confirmRef : undefined}
              className={`modal-button ${
                emergencyAction ? 'modal-button-emergency' :
                type === 'emergency' ? 'modal-button-warning' : 'modal-button-primary'
              }`}
              onClick={handleConfirm}
              autoFocus={emergencyAction}
            >
              {confirmText}
            </button>
          )}
          
          {showCancel && (
            <button
              ref={!emergencyAction && !onConfirm ? initialFocusRef : undefined}
              className="modal-button modal-button-secondary"
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccessibleModal;
