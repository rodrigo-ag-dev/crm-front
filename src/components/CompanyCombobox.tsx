import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { GenericCombobox } from './GenericCombobox';

export const CompanyCombobox: React.FC<{ value: string; onChange: (id: string) => void }> = ({ value, onChange }) => {
  const { t } = useTranslation();
  
  return (
    <GenericCombobox
      label={t('combobox.company')}
      value={value}
      onChange={onChange}
      placeholder={t('combobox.searchCompany')}
      endpoint="/companies"
      mapOption={data => ({ id: data.id, name: data.name, subtitle: data.email })}
      mapSelectedName={data => data?.name}
    />
  );
};