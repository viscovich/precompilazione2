import React from 'react';
import { Field, ComboBoxOption } from '../types';

interface FormFieldProps {
  field: Field;
  onChange: (value: string | boolean | number) => void;
}

export function FormField({ field, onChange }: FormFieldProps) {
  const isComboBox = field.type === 'combo box';
  const comboOptions = isComboBox ? field.options as ComboBoxOption[] : [];
  
  const renderField = () => {
    switch (field.type) {
      case 'combo box':
        return (
          <select
            value={field.value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent px-4 py-2 rounded-lg focus:outline-none"
          >
            <option value="">Seleziona un'opzione</option>
            {comboOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.value}
              </option>
            ))}
          </select>
        );
      
      case 'select':
        return (
          <select
            value={field.value as string || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent px-4 py-2 rounded-lg focus:outline-none"
          >
            <option value="">Seleziona un'opzione</option>
            {(field.options as string[]).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      
      case 'checkbox':
        return (
          <div className="px-4 py-2">
            <input
              type="checkbox"
              checked={field.value as boolean || false}
              onChange={(e) => onChange(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        );
      
      default:
        return (
          <input
            type={field.type}
            value={field.value as string || ''}
            onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
            className="w-full bg-transparent px-4 py-2 rounded-lg focus:outline-none"
            placeholder={`Inserisci ${field.label.toLowerCase()}`}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
      </label>
      <div className="neumorphic-inset rounded-lg">
        {renderField()}
      </div>
    </div>
  );
}