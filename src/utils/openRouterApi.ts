import { APIProcessingError } from './errorUtils';
import { Field, ComboBoxOption } from '../types';

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

interface OpenRouterConfig {
  apiKey: string;
  model: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_window: number;
}

export interface ProcessingResult {
  data: Record<string, any>;
  cost: {
    promptCost: number;
    completionCost: number;
    totalCost: number;
  };
}

export async function fetchAvailableModels(): Promise<OpenRouterModel[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
        'HTTP-Referer': window.location.origin,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.map((model: any) => ({
      id: model.id,
      name: model.name || model.id,
      pricing: {
        prompt: model.pricing?.prompt || 'N/A',
        completion: model.pricing?.completion || 'N/A',
      },
      context_window: model.context_window || 8192,
    }));
  } catch (error) {
    throw new APIProcessingError(
      error instanceof Error ? error.message : 'Failed to fetch available models'
    );
  }
}

function createPrompt(text: string, fields: Field[]): string {
  const fieldDescriptions = fields.map(f => {
    let description = `${f.name} (${f.type}`;
    if (f.type === 'combo box' && f.options) {
      const options = (f.options as ComboBoxOption[])
        .map(opt => `${opt.id}:${opt.value}`)
        .join(', ');
      description += `, options: [${options}]`;
    } else if (f.options) {
      description += `, options: [${f.options.join(', ')}]`;
    }
    description += ')';
    return description;
  }).join('\n');

  return `
You are a document parser. Extract information from the text below and provide values for the specified fields.
Respond ONLY with a valid JSON object containing the extracted values.

Fields to extract:
${fieldDescriptions}

Text content:
${text}

Rules:
- Keys must match the field names exactly
- For combo box fields, return the ID of the matching option
- For select fields, values must be one of the provided options
- For checkbox fields, values must be true or false
- For number fields, values must be numeric
- For text fields, values must be strings
- If a value cannot be found or is uncertain, omit the field from the response

Example response format:
{
  "fieldName1": "value1",
  "fieldName2": true,
  "fieldName3": 42,
  "comboBoxField": "01"
}`;
}

export async function processWithOpenRouter(
  text: string,
  fields: Field[],
  config: OpenRouterConfig
): Promise<ProcessingResult> {
  try {
    const prompt = createPrompt(text, fields);
    const response = await makeAPIRequest(prompt, config);
    const { data, usage } = await parseAPIResponse(response, fields);
    
    // Calculate costs
    const model = await fetchAvailableModels().then(
      models => models.find(m => m.id === config.model)
    );
    
    if (!model) {
      throw new Error('Model pricing information not available');
    }

    const promptRate = parseFloat(model.pricing.prompt.replace('$', '')) || 0;
    const completionRate = parseFloat(model.pricing.completion.replace('$', '')) || 0;

    const cost = {
      promptCost: (usage.prompt_tokens / 1000) * promptRate,
      completionCost: (usage.completion_tokens / 1000) * completionRate,
      get totalCost() {
        return this.promptCost + this.completionCost;
      }
    };

    return { data, cost };
  } catch (error) {
    console.error('OpenRouter API Error:', error);
    throw new APIProcessingError(
      error instanceof Error ? error.message : 'Failed to process with OpenRouter API'
    );
  }
}

async function makeAPIRequest(prompt: string, config: OpenRouterConfig): Promise<Response> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Document Processing App',
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new APIProcessingError(
      errorData.error?.message || `API request failed with status ${response.status}`,
      response.status
    );
  }

  return response;
}

async function parseAPIResponse(response: Response, fields: Field[]): Promise<{ data: Record<string, any>, usage: { prompt_tokens: number, completion_tokens: number } }> {
  try {
    const responseData = await response.json() as OpenRouterResponse;
    const content = responseData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Empty response from API');
    }

    let parsedContent: Record<string, any>;
    try {
      const cleanContent = content.replace(/\\n/g, '').trim();
      parsedContent = typeof cleanContent === 'string' ? JSON.parse(cleanContent) : content;
    } catch (error) {
      console.error('JSON Parse Error:', error, 'Content:', content);
      throw new Error('Invalid JSON in API response');
    }

    const validatedContent: Record<string, any> = {};
    
    for (const field of fields) {
      const value = parsedContent[field.name];
      
      if (value === undefined || value === null || value === '') {
        continue;
      }

      switch (field.type) {
        case 'combo box':
          const options = field.options as ComboBoxOption[];
          if (options.some(opt => opt.id === value)) {
            validatedContent[field.name] = value;
          }
          break;

        case 'number':
          const num = Number(value);
          if (!isNaN(num)) {
            validatedContent[field.name] = num;
          }
          break;

        case 'checkbox':
          if (typeof value === 'boolean') {
            validatedContent[field.name] = value;
          } else if (typeof value === 'string') {
            validatedContent[field.name] = value.toLowerCase() === 'true';
          }
          break;

        case 'select':
          if (field.options?.includes(value)) {
            validatedContent[field.name] = value;
          }
          break;

        case 'text':
        case 'textarea':
        case 'date':
          if (value !== null) {
            validatedContent[field.name] = String(value);
          }
          break;
      }
    }

    return {
      data: validatedContent,
      usage: responseData.usage
    };
  } catch (error) {
    console.error('Response Parsing Error:', error);
    throw new APIProcessingError(
      error instanceof Error 
        ? `Failed to parse API response: ${error.message}`
        : 'Failed to parse API response'
    );
  }
}