import React, { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { LanguageSelector } from './LanguageSelector';
import { ThemeSelector } from './ThemeSelector';
import { CommandPalette } from './CommandPalette';
import { NotificationBell } from './NotificationBell';
import { ChatTopbarButton } from './ChatTopbarButton';
import { QuickAddTask } from './QuickAddTask';
import { UserEventsProvider } from '../contexts/UserEventsContext';
import { ChangePasswordGate } from './ChangePasswordGate';
import { TenantSwitcher } from './TenantSwitcher';
import { getStoredSidebarExpanded, setStoredSidebarExpanded } from '../utils/sidebarPreferences';
import qsIconWhite from '../assets/brand/qs-icon-white.svg';
import styles from './Layout.module.css';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  LogOut,
  UserCircle,
  Ticket,
  SlidersHorizontal,
  Search,
  Menu,
  X,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  FileText,
  Wallet,
  MessageCircle,
} from 'lucide-react';

type NavItem = {
  to: string;
  icon: React.ElementType;
  labelKey: string;
  color: string;
  end?: boolean;
};

const DASHBOARD_ICON_COLOR = 'var(--primary-color)';

const RAIL_ITEMS: NavItem[] = [
  { to: '/my-day', icon: CheckSquare, labelKey: 'navigation.myDay', color: 'var(--secondary-color)', end: true },
  { to: '/deals', icon: Briefcase, labelKey: 'navigation.deals', color: 'var(--tertiary-color)' },
  { to: '/financial', icon: Wallet, labelKey: 'navigation.financial', color: 'var(--nav-color-gold)' },
  { to: '/tickets', icon: Ticket, labelKey: 'navigation.tickets', color: 'var(--accent-color)', end: true },
  { to: '/companies', icon: Building2, labelKey: 'navigation.companies', color: 'var(--nav-color-indigo)' },
  { to: '/contacts', icon: Users, labelKey: 'navigation.contacts', color: 'var(--nav-color-cyan)' },
  { to: '/chat', icon: MessageCircle, labelKey: 'navigation.chat', color: 'var(--secondary-color)' },
  { to: '/reports', icon: FileText, labelKey: 'navigation.reports', color: 'var(--nav-color-coral)' },
];

const PAGE_TITLE_MAP: Record<string, string> = {
  '/': 'navigation.dashboard',
  '/my-day': 'navigation.myDay',
  '/deals': 'navigation.deals',
  '/financial': 'navigation.financial',
  '/companies': 'navigation.companies',
  '/contacts': 'navigation.contacts',
  '/chat': 'navigation.chat',
  '/tickets': 'navigation.tickets',
  '/settings': 'navigation.settings',
};

const PAGE_TITLE_PREFIXES: [string, string][] = [
  ['/deals/', 'navigation.deals'],
  ['/companies/', 'navigation.companies'],
  ['/contacts/', 'navigation.contacts'],
  ['/tickets/', 'navigation.tickets'],
];

const resolvePageTitleKey = (pathname: string): string => {
  if (PAGE_TITLE_MAP[pathname]) return PAGE_TITLE_MAP[pathname];
  const match = PAGE_TITLE_PREFIXES.find(([prefix]) => pathname.startsWith(prefix));
  return match?.[1] ?? 'navigation.dashboard';
};

interface RailLinkProps {
  to: string;
  icon: React.ElementType;
  label: string;
  color: string;
  end?: boolean;
  onClick?: () => void;
}

const RailLink: React.FC<RailLinkProps> = ({ to, icon: Icon, label, color, end, onClick }) => (
  <NavLink
    to={to}
    end={end}
    aria-label={label}
    onClick={onClick}
    className={({ isActive }) => `${styles.railItem} ${isActive ? styles.active : ''}`}
  >
    <Icon size={20} className={styles.railItemIcon} style={{ color }} />
    <span className={styles.railLabel}>{label}</span>
    <span className={styles.railTooltip}>
      {label}
      <span className={styles.railTooltipBorder} />
      <span className={styles.railTooltipArrow} />
    </span>
  </NavLink>
);

export const Layout: React.FC = () => {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const { isOnline, isChecking } = useHealthCheck();
  const navigate = useNavigate();
  const location = useLocation();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [quickAddTaskOpen, setQuickAddTaskOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [railExpanded, setRailExpanded] = useState(() => getStoredSidebarExpanded());
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLElement | null>(null);

  const displayName = user?.firstName || user?.username || user?.email || t('navigation.settings');
  const fullName = user?.fullName || user?.username || user?.email || t('navigation.settings');

  const currentPageKey = resolvePageTitleKey(location.pathname);
  const pageTitle = t(currentPageKey);
  const isDashboard = location.pathname === '/';
  const canGoBack = Boolean(
    typeof window !== 'undefined' && (window.history.state as { idx?: number } | null)?.idx,
  );

  const handleLogout = () => {
    setAccountMenuOpen(false);
    signOut();
    navigate('/login');
  };

  const closeAccountMenu = () => setAccountMenuOpen(false);
  const closeRail = () => setRailOpen(false);
  const toggleRailExpanded = () => {
    setRailExpanded((prev) => {
      const next = !prev;
      setStoredSidebarExpanded(next);
      return next;
    });
  };

  useEffect(() => {
    if (!accountMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        closeAccountMenu();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAccountMenu();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!railOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!railRef.current?.contains(event.target as Node)) {
        closeRail();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRail();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [railOpen]);


  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };

    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (
        event.key.toLowerCase() === 't' &&
        !event.metaKey && !event.ctrlKey && !event.altKey &&
        !isTypingTarget(event.target) &&
        !commandPaletteOpen
      ) {
        event.preventDefault();
        setQuickAddTaskOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, [commandPaletteOpen]);

  return (
    // One SSE connection for the whole signed-in session: the bell and the chat
    // badge both subscribe to it rather than opening one each.
    <UserEventsProvider>
    <div className={styles.appContainer}>
      {railOpen && <div className={styles.railOverlay} onClick={closeRail} />}

      <aside
        ref={railRef}
        className={`${styles.rail}${railOpen ? ` ${styles.railOpen}` : ''}${railExpanded ? ` ${styles.railExpanded}` : ''}`}
      >
        <div className={styles.railBrand} title={t('navigation.crmPro')}>
          <img src={qsIconWhite} alt="" className={styles.railBrandIcon} />
          <span className={styles.railBrandLabel}>{t('navigation.crmPro')}</span>
        </div>

        <nav className={styles.railNav}>
          <RailLink to="/" end icon={LayoutDashboard} label={t('navigation.dashboard')} color={DASHBOARD_ICON_COLOR} onClick={closeRail} />

          <div className={styles.railDivider} />

          {RAIL_ITEMS.map((item) => (
            <RailLink key={item.to} to={item.to} end={item.end} icon={item.icon} label={t(item.labelKey)} color={item.color} onClick={closeRail} />
          ))}
        </nav>

        <button
          type="button"
          className={styles.railToggle}
          onClick={toggleRailExpanded}
          aria-label={railExpanded ? t('navigation.collapseMenu') : t('navigation.expandMenu')}
          title={railExpanded ? t('navigation.collapseMenu') : t('navigation.expandMenu')}
        >
          {railExpanded ? <ChevronLeft size={18} className={styles.railItemIcon} /> : <ChevronRight size={18} className={styles.railItemIcon} />}
          <span className={styles.railLabel}>{t('navigation.collapseMenu')}</span>
        </button>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              type="button"
              className={styles.hamburgerButton}
              onClick={() => setRailOpen((v) => !v)}
              aria-label={railOpen ? t('navigation.closeMenu') : t('navigation.openMenu')}
              aria-expanded={railOpen}
            >
              {railOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            {canGoBack && (
              <button
                type="button"
                className={styles.backButton}
                onClick={() => navigate(-1)}
                title={t('common.back')}
                aria-label={t('common.back')}
              >
                <ArrowLeft size={16} />
              </button>
            )}

            <nav className={styles.breadcrumb} aria-label="breadcrumb">
              <Link
                to="/"
                className={`${styles.breadcrumbHome}${isDashboard ? ` ${styles.breadcrumbHomeCurrent}` : ''}`}
              >
                {t('navigation.dashboard')}
              </Link>
              {!isDashboard && (
                <>
                  <ChevronRight size={14} className={styles.breadcrumbSeparator} aria-hidden="true" />
                  <span className={styles.breadcrumbCurrent}>{pageTitle}</span>
                </>
              )}
            </nav>
          </div>

          <div className={styles.layoutShell}>
            {user?.tenantName && (
              user.platformAdmin ? (
                <TenantSwitcher />
              ) : (
                <div className={styles.tenantBadge} title={user.tenantName}>
                  <Building2 size={14} />
                  <span>{user.tenantName}</span>
                </div>
              )
            )}
            <button
              type="button"
              className={styles.topbarSearchButton}
              onClick={() => setCommandPaletteOpen(true)}
            >
              <Search size={16} />
              <span>{t('commandPalette.placeholder')}</span>
              <kbd className={styles.topbarSearchKbd}>Ctrl K</kbd>
            </button>
            <ChatTopbarButton />
            <NotificationBell />
            <div ref={accountMenuRef} className={styles.layoutAccountWrapper}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((v) => !v)}
                className={styles.topbarAccountButton}
                aria-label={displayName}
                aria-expanded={accountMenuOpen}
                title={isOnline ? t('common.backendOnline') : t('common.backendOffline')}
              >
                <UserCircle
                  size={22}
                  className={`${styles.topbarAccountStatusIcon} ${
                    isChecking
                      ? styles.topbarAccountStatusIconChecking
                      : isOnline
                      ? styles.topbarAccountStatusIconOnline
                      : styles.topbarAccountStatusIconOffline
                  }`}
                />
                <span>{displayName}</span>
              </button>

              {accountMenuOpen && (
                <div className={styles.topbarAccountMenu}>
                  <div className={styles.topbarAccountHeader}>
                    <UserCircle size={28} />
                    <div>
                      <div className={styles.topbarAccountName}>{fullName}</div>
                      {user?.tenantName && (
                        <div className={styles.topbarAccountTenant}>{user.tenantName}</div>
                      )}
                      {!isOnline && !isChecking && (
                        <div className={styles.topbarAccountOffline}>{t('common.backendOffline')}</div>
                      )}
                    </div>
                  </div>

                  <div className={styles.topbarAccountTheme}>
                    <ThemeSelector variant="compact" label={t('settings.appearanceTitle')} />
                  </div>

                  <NavLink
                    to="/settings"
                    onClick={closeAccountMenu}
                    className={({ isActive }) => `${styles.topbarAccountItem} ${isActive ? styles.active : ''}`}
                  >
                    <SlidersHorizontal size={16} />
                    {t('settings.title')}
                  </NavLink>

                  <div className={styles.topbarAccountLanguage}>
                    <LanguageSelector />
                  </div>

                  <button type="button" onClick={handleLogout} className={styles.topbarAccountLogout}>
                    <LogOut size={16} />
                    {t('common.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className={styles.pageContent}>
          <Outlet />
        </div>
      </main>

      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <QuickAddTask isOpen={quickAddTaskOpen} onClose={() => setQuickAddTaskOpen(false)} />
      <ChangePasswordGate />
    </div>
    </UserEventsProvider>
  );
};
