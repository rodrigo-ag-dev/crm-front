import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { GenericCombobox } from './GenericCombobox';

export const TenantCombobox: React.FC<{ value: string; onChange: (id: string) => void }> = ({ value, onChange }) => {
  const { t } = useTranslation();

  return (
    <GenericCombobox
      label={t('users.tenant')}
      value={value}
      onChange={onChange}
      placeholder={t('combobox.searchTenant')}
      endpoint="/tenants"
      mapOption={data => ({ id: data.id, name: data.name, subtitle: data.slug })}
      mapSelectedName={data => data?.name}
    />
  );
};
