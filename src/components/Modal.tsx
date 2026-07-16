import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusFirstInput } from '../hooks/useFocusFirstInput';
import { useTranslation } from '../hooks/useTranslation';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const { t } = useTranslation();
  const titleId = useId();

  // Hook sempre chamado, independente de isOpen
  const formRef = useFocusFirstInput(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={formRef} // ref aplicado aqui
        className="modal-content card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-header">
          <h2 className="modal-title" id={titleId}>{title}</h2>
          <button
            onClick={onClose}
            className="btn-icon modal-close"
            title={t('common.close')}
            aria-label={t('common.close')}
          >
            <X size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};
