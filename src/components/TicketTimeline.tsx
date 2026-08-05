import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2, Send } from 'lucide-react';
import { ticketService, type TicketComment, type TicketCommentType, type TicketStageHistoryEntry } from '../services/ticketService';
import { getApiBaseUrl } from '../services/api';
import type { Ticket } from './TicketModal';
import { useTranslation } from '../hooks/useTranslation';
import { useTicketCommentsStream } from '../hooks/useTicketCommentsStream';
import { SimpleDropdown } from './SimpleDropdown';
import { SkeletonBar } from './Skeleton';
import styles from './TicketTimeline.module.css';

interface TicketTimelineProps {
  ticketId: string;
  ticket: Ticket | null;
}

type TimelineEntry =
  | { kind: 'system'; id: string; timestamp: string; text: string }
  | { kind: 'stage'; id: string; timestamp: string; entry: TicketStageHistoryEntry }
  | { kind: 'comment'; id: string; timestamp: string; comment: TicketComment };

const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '-';
  const locale = localStorage.getItem('@CRM:language') || navigator.language || 'pt-BR';
  return date.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' });
};

export const TicketTimeline: React.FC<TicketTimelineProps> = ({ ticketId, ticket }) => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<TicketStageHistoryEntry[]>([]);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [commentType, setCommentType] = useState<TicketCommentType>('AGENT_REPLY');
  const [commentBody, setCommentBody] = useState('');
  const [sending, setSending] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const entryListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTimelineData();
  }, [ticketId]);

  useEffect(() => {
    const container = entryListRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [comments.length]);

  useTicketCommentsStream<TicketComment>({
    url: ticketId ? `${getApiBaseUrl()}/tickets/${ticketId}/comments/stream` : null,
    onComment: (comment) => {
      setComments((prev) => (
        prev.some((c) => c.id === comment.id)
          ? prev.map((c) => (c.id === comment.id ? comment : c))
          : [...prev, comment]
      ));
    },
    fallbackPoll: pollComments,
  });

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  async function fetchTimelineData() {
    setLoading(true);
    setError('');
    try {
      const [historyRes, commentsRes] = await Promise.all([
        ticketService.getTicketHistory(ticketId),
        ticketService.getTicketComments(ticketId),
      ]);
      setHistory(historyRes.data || []);
      setComments(commentsRes.data || []);
    } catch (err) {
      console.error('Error fetching ticket timeline', err);
      setError(t('tickets.timeline.errorLoading'));
    } finally {
      setLoading(false);
    }
  }

  async function pollComments() {
    try {
      const response = await ticketService.getTicketComments(ticketId);
      setComments(response.data || []);
    } catch (err) {
      console.error('Error polling ticket comments', err);
    }
  }

  const handleSendComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!commentBody.trim()) return;
    setSending(true);
    try {
      const response = await ticketService.addTicketComment(ticketId, { type: commentType, body: commentBody.trim() });
      // Same race as PublicTicketChat.tsx: the backend broadcasts to the SSE
      // stream before this request resolves, so its echo can beat this
      // response back - dedupe by id instead of a bare append.
      setComments((prev) => (
        prev.some((c) => c.id === response.data.id) ? prev : [...prev, response.data]
      ));
      setCommentBody('');
      setCommentType('AGENT_REPLY');
    } catch (err) {
      console.error('Error adding ticket comment', err);
      setError(t('tickets.timeline.errorSending'));
    } finally {
      setSending(false);
    }
  };

  const entries = useMemo<TimelineEntry[]>(() => {
    const items: TimelineEntry[] = [];

    if (ticket?.createdAt) {
      items.push({ kind: 'system', id: 'created', timestamp: ticket.createdAt, text: t('tickets.timeline.created') });
    }

    history.forEach((entry) => {
      items.push({ kind: 'stage', id: entry.id, timestamp: entry.changedAt, entry });
    });

    comments.forEach((comment) => {
      items.push({ kind: 'comment', id: comment.id, timestamp: comment.createdAt, comment });
    });

    if (ticket?.closedAt) {
      items.push({ kind: 'system', id: 'closed', timestamp: ticket.closedAt, text: t('tickets.timeline.closed') });
    }

    if (ticket?.canceled && ticket?.canceledAt) {
      items.push({ kind: 'system', id: 'canceled', timestamp: ticket.canceledAt, text: t('tickets.timeline.canceled') });
    }

    return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [ticket, history, comments, t]);

  const commentTypeLabel = (type: TicketCommentType) => t(`tickets.timeline.type.${type}`);

  return (
    <>
      {isFullscreen && <div className={styles.fullscreenBackdrop} onClick={() => setIsFullscreen(false)} />}

      <div className={`card ${styles.timelineCard}${isFullscreen ? ` ${styles.timelineCardFullscreen}` : ''}`}>
        <div className={styles.timelineHeader}>
          <h3 className={styles.sectionTitle}>{t('tickets.timeline.title')}</h3>
          <button
            type="button"
            className={styles.fullscreenButton}
            onClick={() => setIsFullscreen((v) => !v)}
            title={isFullscreen ? t('tickets.timeline.exitFullscreen') : t('tickets.timeline.enterFullscreen')}
            aria-label={isFullscreen ? t('tickets.timeline.exitFullscreen') : t('tickets.timeline.enterFullscreen')}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>

        {error && <div className="status-message status-message--error">{error}</div>}

      {loading ? (
        <div className={styles.entryList} aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 0' }}>
              <SkeletonBar width={i % 2 === 0 ? '55%' : '40%'} height={11} />
              <SkeletonBar width={i % 2 === 0 ? '35%' : '25%'} height={9} />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.entryList} ref={entryListRef}>
          {entries.length === 0 && <p className={styles.emptyText}>{t('tickets.timeline.empty')}</p>}

          {entries.map((item) => {
            if (item.kind === 'system') {
              return (
                <div key={item.id} className={styles.systemLine}>
                  <span>{item.text}</span>
                  <span className={styles.timestamp}>{formatDateTime(item.timestamp)}</span>
                </div>
              );
            }

            if (item.kind === 'stage') {
              const { entry } = item;
              return (
                <div key={item.id} className={styles.systemLine}>
                  <span>
                    {t('tickets.timeline.stageChange', {
                      author: entry.changedByName || '-',
                      from: entry.fromStageName || '-',
                      to: entry.toStageName || '-',
                    })}
                  </span>
                  <span className={styles.timestamp}>{formatDateTime(item.timestamp)}</span>
                </div>
              );
            }

            const { comment } = item;
            const displayName =
              comment.type === 'CONTACT_MESSAGE'
                ? comment.contactName || comment.authorName
                : comment.authorName;
            return (
              <div key={item.id} className={`${styles.commentBubble} ${styles[`type_${comment.type}`]}`}>
                <div className={styles.commentHeader}>
                  <span className={styles.commentAuthor}>{displayName || commentTypeLabel(comment.type)}</span>
                  <span className={styles.commentTypeLabel}>{commentTypeLabel(comment.type)}</span>
                </div>
                <p className={styles.commentBody}>{comment.body}</p>
                <span className={styles.timestamp}>{formatDateTime(comment.createdAt)}</span>
              </div>
            );
          })}
        </div>
      )}

      <form className={styles.composer} onSubmit={handleSendComment}>
        <SimpleDropdown
          value={commentType}
          onChange={(id) => setCommentType(id as TicketCommentType)}
          wrapperClassName={styles.composerTypeDropdown}
          options={[
            { id: 'CONTACT_MESSAGE', name: t('tickets.timeline.type.CONTACT_MESSAGE') },
            { id: 'AGENT_REPLY', name: t('tickets.timeline.type.AGENT_REPLY') },
            { id: 'INTERNAL_NOTE', name: t('tickets.timeline.type.INTERNAL_NOTE') },
          ]}
        />
        <textarea
          className={styles.composerTextarea}
          rows={2}
          placeholder={t('tickets.timeline.composerPlaceholder')}
          value={commentBody}
          onChange={(event) => setCommentBody(event.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={sending || !commentBody.trim()}>
          <Send size={16} />
          {t('tickets.timeline.send')}
        </button>
      </form>
      </div>
    </>
  );
};
