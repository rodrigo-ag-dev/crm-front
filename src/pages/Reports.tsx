import React, { useEffect, useRef, useState } from 'react';
import { Download, FileDown, Loader2, Printer } from 'lucide-react';
import api from '../services/api';
import { useTranslation } from '../hooks/useTranslation';
import { CompanyCombobox } from '../components/CompanyCombobox';
import { ContactCombobox } from '../components/ContactCombobox';
import { StageCombobox } from '../components/StageCombobox';
import { Modal } from '../components/Modal';
import { getTicketStages, sortTicketStages, type TicketStageOption } from '../services/ticketStageService';
import styles from './Reports.module.css';

type ReportType = 'companies' | 'contacts' | 'tickets' | 'deals' | 'agenda';

const today = () => new Date().toISOString().slice(0, 10);

export const Reports: React.FC = () => {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState<ReportType>('companies');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ url: string; filename: string } | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    return () => {
      if (preview) window.URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const [ticketStages, setTicketStages] = useState<TicketStageOption[]>([]);
  useEffect(() => {
    getTicketStages().then((res) => setTicketStages(sortTicketStages(res.data || []))).catch(() => setTicketStages([]));
  }, []);

  const [companyFilter, setCompanyFilter] = useState({ name: '', active: '' });
  const [contactFilter, setContactFilter] = useState({ companyId: '', name: '', active: '' });
  const [ticketFilter, setTicketFilter] = useState({ companyId: '', contactId: '', ticketStageId: '', canceled: '', dueFrom: '', dueTo: '' });
  const [dealFilter, setDealFilter] = useState({ companyId: '', stageId: '', status: '', closeDateFrom: '', closeDateTo: '' });
  const [agendaFilter, setAgendaFilter] = useState({ date: today() });

  const reportOptions: { value: ReportType; label: string }[] = [
    { value: 'companies', label: t('reports.companies') },
    { value: 'contacts', label: t('reports.contacts') },
    { value: 'tickets', label: t('reports.tickets') },
    { value: 'deals', label: t('reports.deals') },
    { value: 'agenda', label: t('reports.agenda') },
  ];

  const buildParams = (): { endpoint: string; params: Record<string, string> } => {
    switch (reportType) {
      case 'companies':
        return {
          endpoint: '/reports/companies',
          params: {
            ...(companyFilter.name ? { name: companyFilter.name } : {}),
            ...(companyFilter.active ? { active: companyFilter.active } : {}),
          },
        };
      case 'contacts':
        return {
          endpoint: '/reports/contacts',
          params: {
            ...(contactFilter.companyId ? { companyId: contactFilter.companyId } : {}),
            ...(contactFilter.name ? { name: contactFilter.name } : {}),
            ...(contactFilter.active ? { active: contactFilter.active } : {}),
          },
        };
      case 'tickets':
        return {
          endpoint: '/reports/tickets',
          params: {
            ...(ticketFilter.companyId ? { companyId: ticketFilter.companyId } : {}),
            ...(ticketFilter.contactId ? { contactId: ticketFilter.contactId } : {}),
            ...(ticketFilter.ticketStageId ? { ticketStageId: ticketFilter.ticketStageId } : {}),
            ...(ticketFilter.canceled ? { canceled: ticketFilter.canceled } : {}),
            ...(ticketFilter.dueFrom ? { dueFrom: ticketFilter.dueFrom } : {}),
            ...(ticketFilter.dueTo ? { dueTo: ticketFilter.dueTo } : {}),
          },
        };
      case 'deals':
        return {
          endpoint: '/reports/deals',
          params: {
            ...(dealFilter.companyId ? { companyId: dealFilter.companyId } : {}),
            ...(dealFilter.stageId ? { stageId: dealFilter.stageId } : {}),
            ...(dealFilter.status ? { status: dealFilter.status } : {}),
            ...(dealFilter.closeDateFrom ? { closeDateFrom: dealFilter.closeDateFrom } : {}),
            ...(dealFilter.closeDateTo ? { closeDateTo: dealFilter.closeDateTo } : {}),
          },
        };
      case 'agenda':
      default:
        return {
          endpoint: '/reports/agenda',
          params: agendaFilter.date ? { date: agendaFilter.date } : {},
        };
    }
  };

  const handleGenerate = async () => {
    setError('');
    setGenerating(true);
    try {
      const { endpoint, params } = buildParams();
      const response = await api.get(endpoint, { params, responseType: 'blob' });

      const disposition = response.headers['content-disposition'] as string | undefined;
      const match = disposition?.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || `${reportType}.pdf`;

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      setPreview((prev) => {
        if (prev) window.URL.revokeObjectURL(prev.url);
        return { url, filename };
      });
    } catch (err) {
      console.error('Error generating report', err);
      setError(t('reports.errorGenerating'));
    } finally {
      setGenerating(false);
    }
  };

  const handleClosePreview = () => {
    if (preview) window.URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const handleDownload = () => {
    if (!preview) return;
    const link = document.createElement('a');
    link.href = preview.url;
    link.download = preview.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  return (
    <div className={styles.page}>
      <div className="page-header">
        <h1 className="page-title">{t('reports.title')}</h1>
      </div>

      <div className={`card ${styles.card}`}>
        <div className={styles.typeSelector}>
          {reportOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={reportType === option.value ? 'btn-primary' : 'btn-secondary'}
              onClick={() => setReportType(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className={styles.filters}>
          {reportType === 'companies' && (
            <>
              <div className="form-group">
                <label className="form-label">{t('companies.name')}</label>
                <input className="input-field" value={companyFilter.name} onChange={(e) => setCompanyFilter({ ...companyFilter, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('reports.status')}</label>
                <select className="input-field" value={companyFilter.active} onChange={(e) => setCompanyFilter({ ...companyFilter, active: e.target.value })}>
                  <option value="">{t('reports.statusAll')}</option>
                  <option value="true">{t('reports.statusActive')}</option>
                  <option value="false">{t('reports.statusInactive')}</option>
                </select>
              </div>
            </>
          )}

          {reportType === 'contacts' && (
            <>
              <CompanyCombobox value={contactFilter.companyId} onChange={(id) => setContactFilter({ ...contactFilter, companyId: id })} />
              <div className="form-group">
                <label className="form-label">{t('contacts.name')}</label>
                <input className="input-field" value={contactFilter.name} onChange={(e) => setContactFilter({ ...contactFilter, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('reports.status')}</label>
                <select className="input-field" value={contactFilter.active} onChange={(e) => setContactFilter({ ...contactFilter, active: e.target.value })}>
                  <option value="">{t('reports.statusAll')}</option>
                  <option value="true">{t('reports.statusActive')}</option>
                  <option value="false">{t('reports.statusInactive')}</option>
                </select>
              </div>
            </>
          )}

          {reportType === 'tickets' && (
            <>
              <CompanyCombobox value={ticketFilter.companyId} onChange={(id) => setTicketFilter({ ...ticketFilter, companyId: id, contactId: '' })} />
              <ContactCombobox value={ticketFilter.contactId} onChange={(id) => setTicketFilter({ ...ticketFilter, contactId: id })} companyId={ticketFilter.companyId} />
              <div className="form-group">
                <label className="form-label">{t('tickets.stage')}</label>
                <select className="input-field" value={ticketFilter.ticketStageId} onChange={(e) => setTicketFilter({ ...ticketFilter, ticketStageId: e.target.value })}>
                  <option value="">{t('reports.statusAll')}</option>
                  {ticketStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('tickets.canceled')}</label>
                <select className="input-field" value={ticketFilter.canceled} onChange={(e) => setTicketFilter({ ...ticketFilter, canceled: e.target.value })}>
                  <option value="">{t('reports.statusAll')}</option>
                  <option value="false">{t('reports.notCanceled')}</option>
                  <option value="true">{t('reports.canceled')}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('reports.dueFrom')}</label>
                <input className="input-field" type="date" value={ticketFilter.dueFrom} onChange={(e) => setTicketFilter({ ...ticketFilter, dueFrom: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('reports.dueTo')}</label>
                <input className="input-field" type="date" value={ticketFilter.dueTo} onChange={(e) => setTicketFilter({ ...ticketFilter, dueTo: e.target.value })} />
              </div>
            </>
          )}

          {reportType === 'deals' && (
            <>
              <CompanyCombobox value={dealFilter.companyId} onChange={(id) => setDealFilter({ ...dealFilter, companyId: id })} />
              <StageCombobox value={dealFilter.stageId} onChange={(id) => setDealFilter({ ...dealFilter, stageId: id })} />
              <div className="form-group">
                <label className="form-label">{t('reports.status')}</label>
                <select className="input-field" value={dealFilter.status} onChange={(e) => setDealFilter({ ...dealFilter, status: e.target.value })}>
                  <option value="">{t('reports.statusAll')}</option>
                  <option value="Open">{t('reports.dealOpen')}</option>
                  <option value="Won">{t('reports.dealWon')}</option>
                  <option value="Lost">{t('reports.dealLost')}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('reports.closeDateFrom')}</label>
                <input className="input-field" type="date" value={dealFilter.closeDateFrom} onChange={(e) => setDealFilter({ ...dealFilter, closeDateFrom: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">{t('reports.closeDateTo')}</label>
                <input className="input-field" type="date" value={dealFilter.closeDateTo} onChange={(e) => setDealFilter({ ...dealFilter, closeDateTo: e.target.value })} />
              </div>
            </>
          )}

          {reportType === 'agenda' && (
            <div className="form-group">
              <label className="form-label">{t('reports.date')}</label>
              <input className="input-field" type="date" value={agendaFilter.date} onChange={(e) => setAgendaFilter({ date: e.target.value })} />
            </div>
          )}
        </div>

        {error && <div className="form-feedback">{error}</div>}

        <div className={styles.actions}>
          <button type="button" className="btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 size={18} className="combobox-loading" /> : <FileDown size={18} />}
            {t('reports.generate')}
          </button>
        </div>
      </div>

      <Modal
        isOpen={!!preview}
        onClose={handleClosePreview}
        title={t('reports.previewTitle')}
        contentClassName={styles.previewModal}
      >
        {preview && (
          <>
            <iframe ref={iframeRef} src={preview.url} title={t('reports.previewTitle')} className={styles.previewFrame} />
            <div className={styles.previewActions}>
              <button type="button" className="btn-secondary" onClick={handlePrint}>
                <Printer size={18} />
                {t('reports.print')}
              </button>
              <button type="button" className="btn-primary" onClick={handleDownload}>
                <Download size={18} />
                {t('reports.download')}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};
