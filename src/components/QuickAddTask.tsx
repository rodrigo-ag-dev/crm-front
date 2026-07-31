import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Briefcase, CalendarClock, CheckSquare, Ticket, Users } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useLanguage } from '../contexts/LanguageContext';
import { taskService, type TaskEntityType } from '../services/taskService';
import { parseQuickAddText } from '../utils/naturalLanguageDate';
import { searchMentionCandidates, type MentionCandidate } from '../utils/entityMentionSearch';
import styles from './QuickAddTask.module.css';

interface QuickAddTaskProps {
  isOpen: boolean;
  onClose: () => void;
}

const ENTITY_ICON: Record<TaskEntityType, React.ElementType> = {
  DEAL: Briefcase,
  CONTACT: Users,
  COMPANY: Building2,
  TICKET: Ticket,
};

const MENTION_PATTERN = /@([^\s@]*)$/;

export const QuickAddTask: React.FC<QuickAddTaskProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [text, setText] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<MentionCandidate | null>(null);
  const [mentionCandidates, setMentionCandidates] = useState<MentionCandidate[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setText('');
    setSelectedEntity(null);
    setMentionCandidates([]);
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const activeMentionQuery = useMemo(() => {
    const match = text.match(MENTION_PATTERN);
    return match ? match[1] : null;
  }, [text]);

  useEffect(() => {
    if (activeMentionQuery === null || activeMentionQuery.trim().length < 2) {
      setMentionCandidates([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        const candidates = await searchMentionCandidates(activeMentionQuery);
        setMentionCandidates(candidates);
      } catch (error) {
        console.error('Error searching mention candidates', error);
        setMentionCandidates([]);
      }
    }, 250);

    return () => clearTimeout(delay);
  }, [activeMentionQuery]);

  const preview = useMemo(() => parseQuickAddText(text, language), [text, language]);

  const handleSelectMention = (candidate: MentionCandidate) => {
    setText((current) => current.replace(MENTION_PATTERN, `@${candidate.label} `));
    setSelectedEntity(candidate);
    setMentionCandidates([]);
    inputRef.current?.focus();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (mentionCandidates.length > 0) {
      handleSelectMention(mentionCandidates[0]);
      return;
    }

    const parsed = parseQuickAddText(text, language);
    if (!parsed.title.trim() || submitting) return;

    setSubmitting(true);
    try {
      await taskService.create({
        title: parsed.title,
        dueAt: parsed.dueAt,
        priority: 'MEDIUM',
        entityType: selectedEntity?.entityType,
        entityId: selectedEntity?.entityId,
      });
      onClose();
    } catch (error) {
      console.error('Error creating task from quick add', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className={styles.bar} role="dialog" aria-modal="true" onSubmit={handleSubmit}>
        <div className={styles.inputRow}>
          <CheckSquare size={18} className={styles.icon} />
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            className={styles.input}
            placeholder={t('tasks.quickAdd.placeholder')}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>

        {text.trim().length === 0 && <p className={styles.hint}>{t('tasks.quickAdd.hint')}</p>}

        {preview.dueAt && mentionCandidates.length === 0 && (
          <div className={styles.previewRow}>
            <span className={styles.previewChip}>
              <CalendarClock size={13} />
              {new Date(preview.dueAt).toLocaleString(language, {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        )}

        {mentionCandidates.length > 0 && (
          <div className={styles.mentionList}>
            {mentionCandidates.map((candidate) => {
              const Icon = ENTITY_ICON[candidate.entityType];
              return (
                <button
                  key={`${candidate.entityType}-${candidate.entityId}`}
                  type="button"
                  className={styles.mentionItem}
                  onClick={() => handleSelectMention(candidate)}
                >
                  <Icon size={16} className={styles.mentionIcon} />
                  <span className={styles.mentionText}>
                    <span className={styles.mentionPrimary}>{candidate.label}</span>
                    {candidate.secondary && <span className={styles.mentionSecondary}>{candidate.secondary}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </form>
    </div>,
    document.body,
  );
};
