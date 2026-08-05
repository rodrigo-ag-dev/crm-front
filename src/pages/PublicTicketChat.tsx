import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import { publicTicketService, getApiBaseUrl, type PublicTicket, type PublicTicketComment } from '../services/publicTicketService';
import { useTranslation } from '../hooks/useTranslation';
import { useTicketCommentsStream } from '../hooks/useTicketCommentsStream';
import styles from './PublicTicketChat.module.css';

const formatDateTime = (value?: string): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleString(navigator.language || 'pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

export const PublicTicketChat: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [ticket, setTicket] = useState<PublicTicket | null>(null);
  const [comments, setComments] = useState<PublicTicketComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    fetchData();
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  useTicketCommentsStream<PublicTicketComment>({
    url: token ? `${getApiBaseUrl()}/public/tickets/${token}/comments/stream` : null,
    onComment: (comment) => {
      setComments((prev) => (
        prev.some((c) => c.id === comment.id)
          ? prev.map((c) => (c.id === comment.id ? comment : c))
          : [...prev, comment]
      ));
    },
    onRevoked: () => setNotFound(true),
    fallbackPoll: fetchComments,
  });

  async function fetchData() {
    if (!token) return;
    setLoading(true);
    try {
      const [ticketRes, commentsRes] = await Promise.all([
        publicTicketService.getTicket(token),
        publicTicketService.getComments(token),
      ]);
      setTicket(ticketRes.data);
      setComments(commentsRes.data || []);
    } catch (err) {
      console.error('Error loading public ticket chat', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }

  async function fetchComments() {
    if (!token) return;
    try {
      const response = await publicTicketService.getComments(token);
      setComments(response.data || []);
    } catch (err) {
      console.error('Error refreshing public ticket chat', err);
    }
  }

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !body.trim()) return;
    setSending(true);
    setError('');
    try {
      const response = await publicTicketService.addComment(token, body.trim());
      // The backend publishes to the SSE stream before this request even
      // resolves, so the live-pushed echo of this exact comment can beat
      // this response back to the browser - dedupe by id instead of a bare
      // append, or a fast SSE echo + this optimistic append both land.
      setComments((prev) => (
        prev.some((c) => c.id === response.data.id) ? prev : [...prev, response.data]
      ));
      setBody('');
    } catch (err) {
      console.error('Error sending public ticket message', err);
      setError(t('publicChat.errorSending'));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.centerBox}>{t('common.loading')}</div>
      </div>
    );
  }

  if (notFound || !ticket) {
    return (
      <div className={styles.page}>
        <div className={styles.centerBox}>{t('publicChat.notFound')}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{ticket.title}</h1>
        {ticket.stageName && <span className={styles.stageBadge}>{ticket.stageName}</span>}
      </header>

      <div className={styles.messages}>
        {comments.length === 0 && <p className={styles.emptyText}>{t('publicChat.empty')}</p>}

        {comments.map((comment) => (
          <div
            key={comment.id}
            className={`${styles.bubble} ${comment.type === 'AGENT_REPLY' ? styles.bubbleAgent : styles.bubbleContact}`}
          >
            <p className={styles.bubbleBody}>{comment.body}</p>
            <span className={styles.bubbleTimestamp}>{formatDateTime(comment.createdAt)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <div className="status-message status-message--error">{error}</div>}

      {ticket.canceled || ticket.closedAt ? (
        <div className={styles.closedNotice}>{t('publicChat.closed')}</div>
      ) : (
        <form className={styles.composer} onSubmit={handleSend}>
          <textarea
            className={styles.composerTextarea}
            rows={2}
            placeholder={t('publicChat.composerPlaceholder')}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={sending || !body.trim()}>
            <Send size={16} />
            {t('publicChat.send')}
          </button>
        </form>
      )}
    </div>
  );
};
