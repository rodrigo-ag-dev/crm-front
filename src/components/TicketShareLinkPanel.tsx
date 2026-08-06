import React, { useEffect, useState } from 'react';
import { Copy, Link2, RotateCw, Trash2 } from 'lucide-react';
import { ticketShareLinkService, type TicketShareLink } from '../services/ticketShareLinkService';
import { useTranslation } from '../hooks/useTranslation';
import { copyToClipboard } from '../utils/clipboard';
import { ConfirmModal } from './ConfirmModal';
import styles from './TicketShareLinkPanel.module.css';

interface TicketShareLinkPanelProps {
  ticketId: string;
}

const buildShareUrl = (token: string) => `${window.location.origin}/share/${token}`;

export const TicketShareLinkPanel: React.FC<TicketShareLinkPanelProps> = ({ ticketId }) => {
  const { t } = useTranslation();
  const [link, setLink] = useState<TicketShareLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);

  useEffect(() => {
    fetchActiveLink();
  }, [ticketId]);

  async function fetchActiveLink() {
    setLoading(true);
    setError('');
    try {
      const response = await ticketShareLinkService.getActive(ticketId);
      setLink(response.data || null);
    } catch (err) {
      console.error('Error fetching ticket share link', err);
      setError(t('tickets.shareLink.errorLoading'));
    } finally {
      setLoading(false);
    }
  }

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setCopied(false);
    try {
      const response = await ticketShareLinkService.create(ticketId);
      setLink(response.data);
    } catch (err) {
      console.error('Error generating ticket share link', err);
      setError(t('tickets.shareLink.errorGenerating'));
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    setConfirmRevokeOpen(true);
  };

  const handleConfirmRevoke = async (confirmed: boolean) => {
    setConfirmRevokeOpen(false);
    if (!confirmed) return;

    setLoading(true);
    setError('');
    try {
      await ticketShareLinkService.revoke(ticketId);
      setLink(null);
    } catch (err) {
      console.error('Error revoking ticket share link', err);
      setError(t('tickets.shareLink.errorRevoking'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    const success = await copyToClipboard(buildShareUrl(link.token));
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setError(t('tickets.shareLink.errorCopying'));
    }
  };

  return (
    <div className={`card ${styles.panel}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <Link2 size={15} />
          {t('tickets.shareLink.title')}
        </h3>
      </div>

      {error && <div className="status-message status-message--error">{error}</div>}

      {link ? (
        <div className={styles.linkRow}>
          <code className={styles.linkValue}>{buildShareUrl(link.token)}</code>
          <button type="button" className="btn-icon" title={t('common.copy')} aria-label={t('common.copy')} onClick={handleCopy}>
            <Copy size={16} />
          </button>
          <button
            type="button"
            className="btn-icon"
            title={t('tickets.shareLink.regenerate')}
            aria-label={t('tickets.shareLink.regenerate')}
            onClick={handleGenerate}
            disabled={loading}
          >
            <RotateCw size={16} />
          </button>
          <button
            type="button"
            className="btn-icon"
            title={t('tickets.shareLink.revoke')}
            aria-label={t('tickets.shareLink.revoke')}
            onClick={handleRevoke}
            disabled={loading}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <button type="button" className="btn-secondary" onClick={handleGenerate} disabled={loading}>
          <Link2 size={14} />
          {t('tickets.shareLink.generate')}
        </button>
      )}

      {link && <p className={styles.hint}>{t('tickets.shareLink.expiresHint', { date: new Date(link.expiresAt).toLocaleDateString() })}</p>}
      {copied && <p className={styles.copiedHint}>{t('tickets.shareLink.copied')}</p>}

      <ConfirmModal
        isOpen={confirmRevokeOpen}
        message={t('tickets.shareLink.revokeConfirm')}
        onConfirm={handleConfirmRevoke}
        confirmText={t('tickets.shareLink.revoke')}
        cancelText={t('common.cancel')}
        isDangerous
      />
    </div>
  );
};
