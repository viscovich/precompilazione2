import React from 'react';
import { Field } from '../types';
import { FormField } from './FormField';

interface DynamicFormProps {
  fields: Field[];
  onChange: (fields: Field[]) => void;
}

export function DynamicForm({ fields, onChange }: DynamicFormProps) {
  const handleFieldChange = (index: number, value: string | boolean | number) => {
    const updatedFields = fields.map((field, i) => 
      i === index ? { ...field, value } : field
    );
    onChange(updatedFields);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {fields.map((field, index) => (
        <FormField
          key={field.name}
          field={field}
          onChange={(value) => handleFieldChange(index, value)}
        />
      ))}
    </div>
  );
}