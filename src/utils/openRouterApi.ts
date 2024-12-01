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

  return `FORMAT: JSON

INSTRUCTIONS:
1. Extract values for the specified fields from the provided text
2. Return ONLY a JSON object with the extracted values
3. DO NOT include any text before or after the JSON object
4. DO NOT include any explanations or conversation
5. DO NOT include fields with "Non specificato" or similar values
6. DO NOT include fields where values cannot be found
7. DO NOT return a field's label as its value
8. DO NOT return a field's type as its value
9. DO NOT return "false" as a string value for non-checkbox fields

FIELDS TO EXTRACT:
${fieldDescriptions}

TEXT TO PROCESS:
${text}

VALIDATION RULES:
- Keys must exactly match field names
- Combo box fields: return option ID
- Select fields: value must be from options list
- Checkbox fields: must be true/false
- Number fields: must be numeric
- Text fields: must be strings
- Date fields: must be valid date strings
- Omit any fields with empty, null, or "Non specificato" values
- Omit any fields where the value exactly matches the field's label
- Omit any fields where the value exactly matches the field's type
- Omit any fields where the value is "false" (except for checkbox fields)

RESPONSE FORMAT:
{
  "fieldName": "value",
  ...
}

IMPORTANT: Your entire response must be a valid JSON object. No other text is allowed.`;
}

function isValidJSONString(str: string): boolean {
  try {
    const trimmed = str.trim();
    // Check if the string starts with { and ends with }
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      return false;
    }
    // Try parsing it as JSON
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

function extractJSONFromText(text: string): string {
  // Find the first { and last } in the text
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No valid JSON object found in response');
  }
  
  const jsonCandidate = text.slice(start, end + 1);
  if (!isValidJSONString(jsonCandidate)) {
    throw new Error('Extracted content is not valid JSON');
  }
  
  return jsonCandidate;
}

export async function processWithOpenRouter(
  text: string,
  fields: Field[],
  config: OpenRouterConfig
): Promise<ProcessingResult> {
  try {
    // Validate model before proceeding
    const availableModels = await fetchAvailableModels();
    const selectedModel = availableModels.find(m => m.id === config.model);
    
    if (!selectedModel) {
      throw new Error(`Model ${config.model} is not available or supported`);
    }

    // Check if it's a Gemini model
    if (config.model.toLowerCase().includes('gemini')) {
      throw new Error('Gemini models are currently not fully supported through OpenRouter. Please select a different model.');
    }

    const prompt = createPrompt(text, fields);
    const response = await makeAPIRequest(prompt, config);
    const { data, usage } = await parseAPIResponse(response, fields);
    
    // Calculate costs
    const promptRate = Number(selectedModel.pricing.prompt.replace('$', ''));
    const completionRate = Number(selectedModel.pricing.completion.replace('$', ''));

    // Calculate costs based on token usage
    const promptCost = usage.prompt_tokens * promptRate;
    const completionCost = usage.completion_tokens * completionRate;
    const totalCost = promptCost + completionCost;

    return {
      data,
      cost: {
        promptCost,
        completionCost,
        totalCost
      }
    };
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
      messages: [
        {
          role: 'system',
          content: 'CRITICAL INSTRUCTION: You are a JSON-only response generator. You must ONLY output valid JSON objects. ANY text before or after the JSON object is STRICTLY FORBIDDEN. Your entire response must be parseable as JSON. No conversation, no explanations, ONLY JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0,
      max_tokens: 1000,
      response_format: { type: "json_object" },
      stop: ["\n\n", "```", "Alright", "I understand", "Here", "The JSON"]
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new APIProcessingError(
      errorData.error?.message || `API request failed with status ${response.status}`,
      response.status
    );
  }

  const responseText = await response.text();
  if (!responseText) {
    throw new Error('Received empty response from OpenRouter API');
  }

  try {
    // Try to extract valid JSON from the response
    const jsonContent = extractJSONFromText(responseText);
    
    // If successful, create a new Response object with the validated content
    return new Response(jsonContent, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Invalid JSON response:', responseText);
    throw new Error('Received invalid JSON response from OpenRouter API');
  }
}

async function parseAPIResponse(response: Response, fields: Field[]): Promise<{ data: Record<string, any>, usage: { prompt_tokens: number, completion_tokens: number } }> {
  try {
    let responseData: OpenRouterResponse;
    
    try {
      const responseText = await response.text();
      // Try to extract JSON if the response isn't already valid JSON
      const jsonContent = isValidJSONString(responseText) 
        ? responseText 
        : extractJSONFromText(responseText);
      responseData = JSON.parse(jsonContent);
    } catch (error) {
      console.error('Failed to parse response:', error);
      throw new Error('Invalid response format from API');
    }
    
    if (!responseData || !responseData.choices || responseData.choices.length === 0) {
      throw new Error('Invalid or empty response structure from API');
    }

    const content = responseData.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content received in API response');
    }

    let parsedContent: Record<string, any>;
    try {
      // Try to extract JSON if the content isn't already valid JSON
      const jsonContent = isValidJSONString(content) 
        ? content 
        : extractJSONFromText(content);
      parsedContent = JSON.parse(jsonContent);
    } catch (error) {
      console.error('JSON Parse Error:', error, 'Content:', content);
      throw new Error('Invalid JSON in API response content');
    }

    const validatedContent: Record<string, any> = {};
    let validFieldCount = 0;
    
    for (const field of fields) {
      const value = parsedContent[field.name];
      
      // Skip empty, null, "Non specificato" values, values that match the field label or type
      if (value === undefined || 
          value === null || 
          value === '' || 
          value === field.label ||
          value === field.type ||
          (typeof value === 'string' && 
           (value.toLowerCase() === field.label.toLowerCase() ||
            value.toLowerCase() === field.type.toLowerCase() ||
            value.toLowerCase() === 'false' || // Skip "false" string values for non-checkbox fields
            value.toLowerCase().includes('non specificato') || 
            value.toLowerCase().includes('not specified') ||
            value.toLowerCase().includes('unspecified') ||
            value.toLowerCase().includes('n/a') ||
            value.toLowerCase().includes('none')))) {
        continue;
      }

      let isValidValue = false;

      switch (field.type) {
        case 'combo box':
          const options = field.options as ComboBoxOption[];
          if (options.some(opt => opt.id === value)) {
            validatedContent[field.name] = value;
            isValidValue = true;
          }
          break;

        case 'number':
          const num = Number(value);
          if (!isNaN(num)) {
            validatedContent[field.name] = num;
            isValidValue = true;
          }
          break;

        case 'checkbox':
          if (typeof value === 'boolean') {
            validatedContent[field.name] = value;
            isValidValue = value; // Only count true checkbox values
          } else if (typeof value === 'string') {
            const boolValue = value.toLowerCase() === 'true';
            validatedContent[field.name] = boolValue;
            isValidValue = boolValue; // Only count true checkbox values
          }
          break;

        case 'select':
          if (field.options?.includes(value)) {
            validatedContent[field.name] = value;
            isValidValue = true;
          }
          break;

        case 'text':
        case 'textarea':
        case 'date':
          if (value !== null && value !== '') {
            validatedContent[field.name] = String(value);
            isValidValue = true;
          }
          break;
      }

      if (isValidValue) {
        validFieldCount++;
      }
    }

    return {
      data: validatedContent,
      usage: responseData.usage || { prompt_tokens: 0, completion_tokens: 0 }
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
