import React, { useEffect, useState } from 'react';
import { OpenRouterConfig } from '../types';
import { OpenRouterModel, fetchAvailableModels } from '../utils/openRouterApi';
import { toast } from 'react-hot-toast';

interface ConfigFormProps {
  config: OpenRouterConfig;
  onConfigChange: (config: OpenRouterConfig) => void;
}

export function ConfigForm({ config, onConfigChange }: ConfigFormProps) {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const availableModels = await fetchAvailableModels();
        setModels(availableModels);
      } catch (error) {
        toast.error('Failed to load available models');
        console.error('Error loading models:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, []);

  const formatPrice = (priceStr: string): string => {
    const price = parseFloat(priceStr.replace('$', ''));
    const pricePerMillion = (price * 1000000).toFixed(2);
    return `$${pricePerMillion}`;
  };

  const handleModelChange = (modelId: string) => {
    const selectedModel = models.find(m => m.id === modelId);
    onConfigChange({ 
      ...config, 
      model: modelId,
      selectedModel: selectedModel
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Model
        </label>
        <select
          value={config.model}
          onChange={(e) => handleModelChange(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          disabled={isLoading}
        >
          <option value="">Select a model</option>
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} (Per million tokens - Prompt: {formatPrice(model.pricing.prompt)}, Completion: {formatPrice(model.pricing.completion)})
            </option>
          ))}
        </select>
        {isLoading && (
          <p className="mt-1 text-sm text-gray-500">Loading available models...</p>
        )}
      </div>
    </div>
  );
}
