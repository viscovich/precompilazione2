import React from 'react';
import { OpenRouterModel } from '../utils/openRouterApi';

interface CostSummaryProps {
  selectedModel?: OpenRouterModel;
  schemaName: string;
  completedFields: number;
  totalFields: number;
  cost?: {
    promptCost: number;
    completionCost: number;
    totalCost: number;
  };
}

export function CostSummary({ selectedModel, schemaName, completedFields, totalFields, cost }: CostSummaryProps) {
  if (!selectedModel) return null;

  return (
    <div className="neumorphic rounded-2xl p-6 bg-white/80 backdrop-blur-sm">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Riepilogo Elaborazione</h2>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Schema JSON:</span>
          <span className="font-medium">{schemaName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Modello AI:</span>
          <span className="font-medium">{selectedModel.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Costo per token (prompt):</span>
          <span className="font-medium">{selectedModel.pricing.prompt}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Costo per token (completamento):</span>
          <span className="font-medium">{selectedModel.pricing.completion}</span>
        </div>
        {cost && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Costo prompt:</span>
              <span className="font-medium">${cost.promptCost.toFixed(4)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Costo completamento:</span>
              <span className="font-medium">${cost.completionCost.toFixed(4)}</span>
            </div>
            <div className="flex justify-between items-center font-bold">
              <span className="text-gray-600">Costo totale:</span>
              <span className="text-blue-600">${cost.totalCost.toFixed(4)}</span>
            </div>
          </>
        )}
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Campi completati:</span>
          <span className="font-medium">{completedFields} / {totalFields}</span>
        </div>
      </div>
    </div>
  );
}