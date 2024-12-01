export interface ComboBoxOption {
  id: string;
  value: string;
}

export interface Field {
  name: string;
  type: 'text' | 'number' | 'checkbox' | 'select' | 'combo box' | 'textarea' | 'date';
  label: string;
  options?: string[] | ComboBoxOption[];
  value?: string | number | boolean;
}

export interface FormData {
  fields: Field[];
}

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  selectedModel?: {
    id: string;
    name: string;
    pricing: {
      prompt: string;
      completion: string;
    };
    context_window: number;
  };
}
