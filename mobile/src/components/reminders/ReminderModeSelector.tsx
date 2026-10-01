import React from 'react';
import { SelectField } from '../accounts/SelectField';

interface Props {
  selectedMode: string;
  onSelectMode: (mode: string) => void;
}

const MODES = ['Call', 'Email', 'Meeting', 'Task', 'WhatsApp'];

export function ReminderModeSelector({ selectedMode, onSelectMode }: Props) {
  return (
    <SelectField
      label=""
      value={selectedMode}
      options={MODES}
      onChange={onSelectMode}
    />
  );
}
