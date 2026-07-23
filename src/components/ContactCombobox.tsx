import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { GenericCombobox } from './GenericCombobox';

export const ContactCombobox: React.FC<{ value: string; onChange: (id: string) => void; companyId?: string }> = ({ value, onChange, companyId }) => {
  const { t } = useTranslation();

  return (
    <GenericCombobox
      label={t('combobox.contact')}
      value={value}
      onChange={onChange}
      placeholder={t('combobox.searchContact')}
      endpoint="/contacts"
      mapOption={data => ({ id: data.id, name: data.name, subtitle: data.description })}
      mapSelectedName={data => data?.name || data?.description}
      extraParams={companyId ? { companyId } : undefined}
      disabled={!companyId}
      disabledMessage={t('combobox.selectCompanyFirst')}
    />
  );
};