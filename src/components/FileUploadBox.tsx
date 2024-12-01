import React from 'react';
import { FileUpload } from './FileUpload';
import { FilePreview } from './FilePreview';
import { Upload } from 'lucide-react';
import { Button } from './ui/Button';

interface FileUploadBoxProps {
  title: string;
  subtitle: string;
  accept: Record<string, string[]>;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onFileRemove: () => void;
  fileType: 'json' | 'pdf';
  onUseTestFile?: () => void;
}

export function FileUploadBox({
  title,
  subtitle,
  accept,
  onFileSelect,
  selectedFile,
  onFileRemove,
  fileType,
  onUseTestFile,
}: FileUploadBoxProps) {
  return (
    <div className="p-6 neumorphic rounded-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
      <p className="text-gray-600 mb-6">{subtitle}</p>
      
      {selectedFile ? (
        <FilePreview
          fileName={selectedFile.name}
          fileType={fileType}
          onRemove={onFileRemove}
        />
      ) : (
        <div className="space-y-4">
          <div className="neumorphic-inset rounded-xl p-6">
            <FileUpload
              onFileSelect={onFileSelect}
              accept={accept}
              icon={<Upload className="w-12 h-12 text-gray-400 mb-4" />}
              label={`Trascina qui il file ${fileType.toUpperCase()} o clicca per caricarlo`}
            />
          </div>
          {onUseTestFile && (
            <div className="flex justify-center">
              <Button onClick={onUseTestFile}>
                Usa PDF di Test
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
