import { Field } from '../types';
import provaJson from '../config/json/provajson.json';

export interface SchemaOption {
  id: string;
  name: string;
  schema: { fields: Field[] };
}

export const availableSchemas: SchemaOption[] = [
  {
    id: 'provajson',
    name: 'Schema Prova',
    schema: provaJson
  }
];

export function getSchemaById(id: string): SchemaOption | undefined {
  return availableSchemas.find(schema => schema.id === id);
}