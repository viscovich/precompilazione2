import React from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept: Record<string, string[]>;
  label: string;
  icon: React.ReactNode;
}

export function FileUpload({ onFileSelect, accept, label, icon }: FileUploadProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    onDrop: files => files[0] && onFileSelect(files[0]),
  });

  return (
    <div
      {...getRootProps()}
      className="flex flex-col items-center justify-center cursor-pointer p-8 transition-all duration-200"
    >
      <input {...getInputProps()} />
      {icon}
      <p className="text-center text-gray-600">
        {isDragActive ? 'Rilascia il file qui' : label}
      </p>
    </div>
  );
}