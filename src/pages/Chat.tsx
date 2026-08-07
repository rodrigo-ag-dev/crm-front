import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, ChevronLeft, ChevronRight, Plus, Send, Trash2, UserCog, X } from 'lucide-react';
import {
  chatService,
  type ChatContact,
  type ChatConversation,
  type ChatMessage,
  type ChatReadStreamEvent,
  type ChatStreamEvent,
} from '../services/chatService';
import { useAuth } from '../contexts/AuthContext';
import { useUserEvent } from '../contexts/UserEventsContext';
import { useTranslation } from '../hooks/useTranslation';
import { SplitViewShell, RecordListRow, RecordListRowsSkeleton, CollapsibleSearchBar } from '../components/SplitViewShell';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import Input from '../components/Input';
import splitStyles from '../components/SplitViewShell.module.css';
import styles from './Chat.module.css';

const CONVERSATIONS_PAGE_SIZE = 15;
const CONTACTS_PAGE_SIZE = 8;

const formatTime = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleString(undefined, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const normalizeConversationId = (value?: string) => value?.trim().toLowerCase();

export const Chat: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [confirmDeleteConversationId, setConfirmDeleteConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [contactsOpen, setContactsOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [debouncedContactSearch, setDebouncedContactSearch] = useState('');
  const [contactPage, setContactPage] = useState(0);
  const [contactTotalPages, setContactTotalPages] = useState(0);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const listEndRef = useRef<HTMLDivElement | null>(null);
  const activeIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    activeIdRef.current = id;
  }, [id]);

  const refreshActiveConversationMessages = async (conversationId?: string) => {
    if (!conversationId) return;

    try {
      const response = await chatService.getMessages(conversationId);
      setMessages(response.data || []);
    } catch (err) {
      console.error('Error refreshing messages for active conversation', err);
    }
  };

  const active = useMemo(
    () => conversations.find((c) => normalizeConversationId(c.id) === normalizeConversationId(id)),
    [conversations, id],
  );

  const fetchConversations = async () => {
    setLoadingConversations(true);
    try {
      const response = await chatService.getConversations(debouncedSearch || undefined, page, CONVERSATIONS_PAGE_SIZE);
      const total = response.data.totalPages || 0;
      setConversations(response.data.content || []);
      setTotalPages(total);
      if (page > 0 && page >= total) setPage(Math.max(0, total - 1));
    } catch (err) {
      console.error('Error fetching conversations', err);
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  const isFirstSearchRun = useRef(true);
  useEffect(() => {
    if (isFirstSearchRun.current) {
      isFirstSearchRun.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (page !== 0) setPage(0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchConversations();
  }, [page, debouncedSearch]);

  useEffect(() => {
    if (!id) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoadingMessages(true);
    refreshActiveConversationMessages(id)
      .then(() => {
        if (!cancelled) setLoadingMessages(false);
      })
      .catch(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    // Opening a conversation is what marks it read; the backend echoes the new
    // total back over the stream so other tabs drop the badge too.
    chatService.markRead(id).catch((err) => console.error('Error marking conversation read', err));
    setConversations((prev) => prev.map((c) => (
      normalizeConversationId(c.id) === normalizeConversationId(id) ? { ...c, unreadCount: 0 } : c
    )));

    return () => {
      cancelled = true;
    };
  }, [id]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  };

  useEffect(() => {
    if (!id || loadingMessages) return;
    scrollToBottom();
  }, [id, loadingMessages, messages.length]);

  useEffect(() => {
    if (!id) return;

    const timer = window.setInterval(() => {
      refreshActiveConversationMessages(id);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [id]);

  const appendOrReplaceMessage = (message: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((item) => item.id === message.id)) {
        return prev.map((item) => (item.id === message.id ? message : item));
      }

      return [...prev, message];
    });
  };

  useUserEvent<ChatStreamEvent>('chat', (event) => {
    const incomingConversationId = event.message?.conversationId ?? event.conversation?.id;
    const currentConversationId = normalizeConversationId(id ?? activeIdRef.current ?? window.location.pathname.match(/^\/chat\/([^/]+)$/)?.[1]);
    const isActive = Boolean(currentConversationId) && normalizeConversationId(incomingConversationId) === currentConversationId;

    setConversations((prev) => {
      const summary = isActive ? { ...event.conversation, unreadCount: 0 } : event.conversation;
      const without = prev.filter((c) => normalizeConversationId(c.id) !== normalizeConversationId(summary?.id ?? incomingConversationId));
      return summary ? [summary, ...without] : prev;
    });

    if (!isActive || !incomingConversationId) return;

    appendOrReplaceMessage(event.message);
    scrollToBottom();

    if (event.message.senderId !== user?.id) {
      chatService.markRead(incomingConversationId).catch(() => {});
    }
  });

  useUserEvent<ChatReadStreamEvent>('chat-read', (event) => {
    setConversations((prev) => prev.map((c) => (
      normalizeConversationId(c.id) === normalizeConversationId(event.conversationId) ? { ...c, unreadCount: 0 } : c
    )));
  });

  const isFirstContactSearchRun = useRef(true);

  const openContacts = () => {
    isFirstContactSearchRun.current = true;
    setContactSearch('');
    setDebouncedContactSearch('');
    setContactPage(0);
    setContactsOpen(true);
  };

  useEffect(() => {
    if (isFirstContactSearchRun.current) {
      isFirstContactSearchRun.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedContactSearch(contactSearch);
      setContactPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [contactSearch]);

  useEffect(() => {
    if (!contactsOpen) return;

    let cancelled = false;
    setLoadingContacts(true);
    chatService.getContacts(debouncedContactSearch || undefined, contactPage, CONTACTS_PAGE_SIZE)
      .then((response) => {
        if (cancelled) return;
        setContacts(response.data.content || []);
        setContactTotalPages(response.data.totalPages || 0);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error fetching chat contacts', err);
        setContacts([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingContacts(false);
      });

    return () => {
      cancelled = true;
    };
  }, [contactsOpen, debouncedContactSearch, contactPage]);

  const startConversation = async (contact: ChatContact) => {
    try {
      const response = await chatService.startConversation(contact.id);
      setContactsOpen(false);
      setContactSearch('');
      setConversations((prev) => (
        prev.some((c) => c.id === response.data.id) ? prev : [response.data, ...prev]
      ));
      navigate(`/chat/${response.data.id}`);
    } catch (err) {
      console.error('Error starting conversation', err);
      setError(t('chat.errorStarting'));
    }
  };

  // A platform admin currently viewing the participant's own tenant (the
  // tenant switcher is what puts them there) has every message in *this*
  // conversation sent as that person automatically — always recorded with an
  // audit trail (impersonatedByUserId), never silently. This mirrors the
  // backend's own check (ChatService.SendImpersonatedMessageAsync): same
  // tenant match, and it can never apply to another platform admin.
  const isImpersonatingContext = Boolean(
    user?.platformAdmin
    && active
    && !active.participant.platformAdmin
    && active.participant.tenantId === user.tenantId,
  );

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || !id || sending) return;

    setSending(true);
    setError('');
    try {
      const response = isImpersonatingContext
        ? await chatService.sendImpersonatedMessage(id, trimmed)
        : await chatService.sendMessage(id, trimmed);
      setBody('');
      // Same race as the ticket timeline: the SSE echo of this exact message can
      // beat this response back, so dedupe rather than appending.
      appendOrReplaceMessage(response.data);
    } catch (err) {
      console.error('Error sending message', err);
      setError(t('chat.errorSending'));
    } finally {
      setSending(false);
    }
  };

  const performDeleteConversation = async (confirmed: boolean) => {
    const targetId = confirmDeleteConversationId;
    setConfirmDeleteConversationId(null);
    if (!confirmed || !targetId) return;

    try {
      await chatService.deleteConversation(targetId);
      if (normalizeConversationId(targetId) === normalizeConversationId(id)) {
        navigate('/chat');
      }
      fetchConversations();
    } catch (err) {
      console.error('Error deleting conversation', err);
      setError(t('chat.errorDeletingConversation'));
    }
  };

  return (
    <>
      <div className={splitStyles.page}>
        <div className="page-header">
          <h1 className="page-title">{t('chat.title')}</h1>
          <div className="toolbar-actions">
            <button className="btn-primary" onClick={openContacts}>
              <Plus size={18} />
              {t('chat.newConversation')}
            </button>
          </div>
        </div>

        <SplitViewShell
          hasSelection={!!id}
          left={
            <>
              <div className={splitStyles.listPaneHeader}>
                <span className={splitStyles.listPaneTitle}>{t('chat.conversations')}</span>
                <CollapsibleSearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder={t('chat.searchConversations')}
                />
              </div>

              <div className={splitStyles.listPaneBody}>
                {loadingConversations ? (
                  <RecordListRowsSkeleton />
                ) : conversations.length === 0 ? (
                  <p className="empty-state">{t('chat.noConversations')}</p>
                ) : (
                  conversations.map((conversation) => (
                    <RecordListRow
                      key={conversation.id}
                      to={`/chat/${conversation.id}`}
                      isActive={normalizeConversationId(conversation.id) === normalizeConversationId(id)}
                      primary={conversation.participant.fullName}
                      secondary={conversation.lastMessagePreview || conversation.participant.email}
                      meta={formatTime(conversation.lastMessageAt)}
                      badge={
                        conversation.unreadCount > 0 ? (
                          <span className={styles.unreadBadge}>
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </span>
                        ) : undefined
                      }
                      actions={
                        <button
                          type="button"
                          className="btn-icon-danger"
                          onClick={() => setConfirmDeleteConversationId(conversation.id)}
                          title={t('chat.deleteConversation')}
                          aria-label={t('chat.deleteConversation')}
                        >
                          <Trash2 size={14} />
                        </button>
                      }
                    />
                  ))
                )}
              </div>

              <div className={splitStyles.listPaneFooter}>
                <span>{t('pagination.pageOf', { page: page + 1, total: totalPages || 1 })}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-secondary icon-button" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))} title={t('buttons.previous')}>
                    <ChevronLeft size={16} />
                  </button>
                  <button className="btn-secondary icon-button" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} title={t('buttons.next')}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          }
          right={
            !active ? (
              <p className="empty-state">{t('chat.selectConversation')}</p>
            ) : (
              <div className={`card ${styles.thread}`}>
                <div className={styles.threadHeader}>
                  <div className={styles.threadTitleGroup}>
                    <span className={styles.threadTitle}>{active.participant.fullName}</span>
                    {active.participant.crossTenant && (
                      <span className={styles.tenantTag}>
                        <Building2 size={11} />
                        {active.participant.tenantName || t('chat.otherTenant')}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.closeThread}
                    onClick={() => navigate('/chat')}
                    aria-label={t('common.close')}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className={styles.messageList}>
                  {loadingMessages ? (
                    <div className="page-loading">{t('common.loading')}</div>
                  ) : messages.length === 0 ? (
                    <p className={styles.emptyText}>{t('chat.noMessages')}</p>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`${styles.bubble} ${message.senderId === user?.id ? styles.bubbleMine : styles.bubbleTheirs}`}
                      >
                        <div className={styles.bubbleHeader}>
                          <span className={styles.bubbleAuthor}>{message.senderName}</span>
                          <span className={styles.timestamp}>{formatTime(message.createdAt)}</span>
                        </div>
                        <span className={styles.bubbleBody}>{message.body}</span>
                        {message.impersonatedByUserId && (
                          <span className={styles.impersonatedTag}>
                            {t('chat.impersonatedTag', { name: message.impersonatedByName || '' })}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                  <div ref={listEndRef} />
                </div>

                {error && <p className="form-error">{error}</p>}

                {isImpersonatingContext && (
                  <div className={styles.impersonateBar}>
                    <UserCog size={13} />
                    {t('chat.impersonatingNotice', { name: active.participant.fullName })}
                  </div>
                )}

                <div className={styles.composer}>
                  <textarea
                    className={styles.composerTextarea}
                    rows={2}
                    value={body}
                    placeholder={isImpersonatingContext
                      ? t('chat.messagePlaceholderImpersonating', { name: active.participant.fullName })
                      : t('chat.messagePlaceholder')}
                    onChange={(event) => setBody(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <button className="btn-primary" onClick={handleSend} disabled={sending || !body.trim()}>
                    <Send size={16} />
                    {t('chat.send')}
                  </button>
                </div>
              </div>
            )
          }
        />
      </div>

      {contactsOpen && (
        <Modal isOpen title={t('chat.newConversation')} onClose={() => setContactsOpen(false)}>
          <Input
            label=""
            type="text"
            autoFocus
            placeholder={t('chat.searchContacts')}
            value={contactSearch}
            onChange={(event) => setContactSearch(event.target.value)}
          />

          <div className={styles.contactList}>
            {loadingContacts ? (
              <div className="page-loading">{t('common.loading')}</div>
            ) : contacts.length === 0 ? (
              <p className={styles.emptyText}>{t('chat.noContacts')}</p>
            ) : (
              contacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  className={styles.contactRow}
                  onClick={() => startConversation(contact)}
                >
                  <span className={styles.contactName}>{contact.fullName}</span>
                  <span className={styles.contactMeta}>
                    {contact.email}
                    {contact.crossTenant && ` · ${contact.tenantName || t('chat.otherTenant')}`}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className={styles.contactsFooter}>
            <span>{t('pagination.pageOf', { page: contactPage + 1, total: contactTotalPages || 1 })}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                className="btn-secondary icon-button"
                disabled={contactPage === 0}
                onClick={() => setContactPage((p) => Math.max(0, p - 1))}
                title={t('buttons.previous')}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="btn-secondary icon-button"
                disabled={contactPage >= contactTotalPages - 1}
                onClick={() => setContactPage((p) => p + 1)}
                title={t('buttons.next')}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmModal
        isOpen={!!confirmDeleteConversationId}
        title={t('chat.deleteConversation')}
        message={t('chat.confirmDeleteConversation')}
        onConfirm={performDeleteConversation}
        isDangerous
      />
    </>
  );
};

export default Chat;
