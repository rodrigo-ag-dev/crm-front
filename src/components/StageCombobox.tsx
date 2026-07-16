import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { GenericCombobox } from './GenericCombobox';

export const StageCombobox: React.FC<{ value: string; onChange: (id: string) => void }> = ({ value, onChange }) => {
  const { t } = useTranslation();
  
  return (
    <GenericCombobox
      label={t('combobox.stage')}
      value={value}
      onChange={onChange}
      placeholder={t('combobox.searchStage')}
      endpoint="/stages"
      mapOption={data => ({ id: data.id, name: data.name, subtitle: data.description })}
      mapSelectedName={data => data?.name || data?.description}
    />
  );
};