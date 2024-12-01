import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { FileUploadBox } from './components/FileUploadBox';
import { DynamicForm } from './components/DynamicForm';
import { ConfigForm } from './components/ConfigForm';
import { Header } from './components/Header';
import { SchemaSelector } from './components/SchemaSelector';
import { CostSummary } from './components/CostSummary';
import { extractTextFromPDF } from './utils/pdfUtils';
import { processWithOpenRouter, fetchAvailableModels, OpenRouterModel } from './utils/openRouterApi';
import { getErrorMessage } from './utils/errorUtils';
import { Field, OpenRouterConfig } from './types';
import { Button } from './components/Button';
import { availableSchemas, getSchemaById } from './utils/schemaUtils';
import testPdf from './config/pdf/16764_AUA_ProvBL.pdf';

function App() {
  const [fields, setFields] = useState<Field[]>([]);
  const [config, setConfig] = useState<OpenRouterConfig>({
    apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || '',
    model: '',
  });
  const [selectedSchema, setSelectedSchema] = useState(availableSchemas[0]?.id || '');
  const [selectedModel, setSelectedModel] = useState<OpenRouterModel | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfText, setPdfText] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [completedFields, setCompletedFields] = useState(0);
  const [processingCost, setProcessingCost] = useState<{
    promptCost: number;
    completionCost: number;
    totalCost: number;
  }>();

  useEffect(() => {
    const loadModels = async () => {
      try {
        const models = await fetchAvailableModels();
        const sonnetModel = models.find(m => m.id === 'anthropic/claude-3-sonnet');
        if (sonnetModel) {
          setConfig(prev => ({ ...prev, model: sonnetModel.id }));
          setSelectedModel(sonnetModel);
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (selectedSchema) {
      const schema = getSchemaById(selectedSchema);
      if (schema) {
        setFields(schema.schema.fields.map(field => ({
          ...field,
          value: field.type === 'checkbox' ? false : '',
        })));
        setCompletedFields(0);
        setProcessingCost(undefined);
      }
    }
  }, [selectedSchema]);

  const handlePDFUpload = async (file: File) => {
    try {
      const text = await extractTextFromPDF(file);
      setPdfText(text);
      setPdfFile(file);
      toast.success('PDF caricato con successo');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleUseTestPDF = async () => {
    try {
      const response = await fetch(testPdf);
      if (!response.ok) {
        throw new Error('Failed to fetch test PDF');
      }
      const blob = await response.blob();
      const file = new File([blob], '16764_AUA_ProvBL.pdf', { type: 'application/pdf' });
      await handlePDFUpload(file);
    } catch (error) {
      console.error('Error loading test PDF:', error);
      toast.error('Errore nel caricamento del PDF di test');
    }
  };

  const handleProcess = async () => {
    if (!config.model) {
      toast.error('Seleziona un modello prima di procedere');
      return;
    }

    if (!selectedSchema) {
      toast.error('Seleziona uno schema JSON prima di procedere');
      return;
    }

    if (!pdfText) {
      toast.error('Carica un file PDF prima di procedere');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await processWithOpenRouter(pdfText, fields, config);
      
      const updatedFields = fields.map(field => ({
        ...field,
        value: result.data[field.name] ?? (field.type === 'checkbox' ? false : ''),
      }));
      
      setFields(updatedFields);
      setCompletedFields(Object.keys(result.data).length);
      setProcessingCost(result.cost);
      toast.success('Dati estratti con successo');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCleanData = () => {
    const cleanedFields = fields.map(field => ({
      ...field,
      value: field.type === 'checkbox' ? false : '',
    }));
    setFields(cleanedFields);
    setCompletedFields(0);
    setProcessingCost(undefined);
    toast.success('Dati puliti con successo');
  };

  const handleRemovePDF = () => {
    setPdfFile(null);
    setPdfText(null);
  };

  const currentSchema = getSchemaById(selectedSchema);

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="max-w-5xl mx-auto px-4 -mt-20 relative z-10 space-y-8 pb-12">
        <div className="neumorphic rounded-2xl p-6 mb-8 bg-white/80 backdrop-blur-sm">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Configurazione</h2>
          <div className="space-y-6">
            <ConfigForm config={config} onConfigChange={(newConfig) => {
              setConfig(newConfig);
              if (newConfig.selectedModel) {
                setSelectedModel(newConfig.selectedModel);
              }
            }} />
            <SchemaSelector
              schemas={availableSchemas}
              selectedSchema={selectedSchema}
              onSchemaChange={setSelectedSchema}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <FileUploadBox
            title="Documento PDF"
            subtitle="Carica il documento da elaborare"
            accept={{ 'application/pdf': ['.pdf'] }}
            onFileSelect={handlePDFUpload}
            selectedFile={pdfFile}
            onFileRemove={handleRemovePDF}
            fileType="pdf"
            onUseTestFile={handleUseTestPDF}
          />

          {selectedModel && currentSchema && (
            <CostSummary
              selectedModel={selectedModel}
              schemaName={currentSchema.name}
              completedFields={completedFields}
              totalFields={fields.length}
              cost={processingCost}
            />
          )}
        </div>

        {fields.length > 0 && (
          <div className="neumorphic rounded-2xl p-6 bg-white/80 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Dati Estratti</h2>
              <div className="flex gap-4">
                <Button
                  onClick={handleCleanData}
                  disabled={!selectedSchema}
                >
                  Pulisci Dati
                </Button>
                <Button
                  onClick={handleProcess}
                  loading={isProcessing}
                  disabled={!selectedSchema || !pdfFile}
                >
                  {isProcessing ? 'Elaborazione...' : 'Elabora Documento'}
                </Button>
              </div>
            </div>
            <DynamicForm 
              fields={fields} 
              onChange={setFields}
            />
          </div>
        )}
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
