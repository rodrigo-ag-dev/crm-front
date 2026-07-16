import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Modal } from './Modal';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: (confirmed: boolean) => void;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  confirmText,
  cancelText,
  isDangerous = false,
}) => {
  const { t } = useTranslation();
  
  const finalTitle = title || t('modals.confirmTitle');
  const finalConfirmText = confirmText || t('modals.yes');
  const finalCancelText = cancelText || t('modals.no');

  const handleConfirm = () => {
    onConfirm(true);
  };

  const handleCancel = () => {
    onConfirm(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title={finalTitle}>
      <div className="confirm-message-wrap">
        <p className="confirm-message">
          {message}
        </p>
      </div>

      <div className="modal-footer">
        <button
          type="button"
          className="btn-secondary"
          onClick={handleCancel}
        >
          {finalCancelText}
        </button>
        <button
          type="button"
          className={isDangerous ? 'btn-danger' : 'btn-primary'}
          onClick={handleConfirm}
        >
          {finalConfirmText}
        </button>
      </div>
    </Modal>
  );
};
