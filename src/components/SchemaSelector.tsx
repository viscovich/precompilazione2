import React from 'react';
import { SchemaOption } from '../utils/schemaUtils';

interface SchemaSelectorProps {
  schemas: SchemaOption[];
  selectedSchema: string;
  onSchemaChange: (schemaId: string) => void;
}

export function SchemaSelector({ schemas, selectedSchema, onSchemaChange }: SchemaSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Seleziona Schema JSON
      </label>
      <div className="neumorphic-inset rounded-lg">
        <select
          value={selectedSchema}
          onChange={(e) => onSchemaChange(e.target.value)}
          className="w-full bg-transparent px-4 py-2 rounded-lg focus:outline-none"
        >
          <option value="">Seleziona uno schema</option>
          {schemas.map((schema) => (
            <option key={schema.id} value={schema.id}>
              {schema.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}