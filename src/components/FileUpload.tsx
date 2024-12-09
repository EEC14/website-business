import React, { useCallback, useState } from 'react';
import { Upload, AlertCircle, X, FileText } from 'lucide-react';
import { parseHealthFile, HealthData } from '../services/fileParser';

interface FileUploadProps {
  onDataParsed: (data: HealthData) => void;
  onError: (error: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataParsed, onError }) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    try {
      const data = await parseHealthFile(file);
      setUploadedFile(file);
      onDataParsed(data);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to parse file');
    }
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      await processFile(file);
    }
  }, [onDataParsed, onError]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  }, [onDataParsed, onError]);

  const handleRemoveFile = useCallback(() => {
    setUploadedFile(null);
    const input = document.getElementById('file-upload') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
        <div className="space-y-1">
          <p className="text-sm text-blue-700">
            Upload a file containing patient health data to automatically fill the questionnaire.
          </p>
          <p className="text-sm text-blue-600">
            Supported formats: Excel (.xlsx, .xls), Text (.txt), CSV (.csv)
          </p>
        </div>
      </div>

      {uploadedFile ? (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={handleRemoveFile}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              title="Remove file"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-500'
          }`}
        >
          <input
            type="file"
            onChange={handleFileSelect}
            accept=".xlsx,.xls,.txt,.csv"
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="w-8 h-8 text-gray-400" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-700">
                Drop your file here, or click to browse
              </p>
              <p className="text-xs text-gray-500">
                The file should contain sections like: Symptoms, Medications, Conditions, etc.
              </p>
            </div>
          </label>
        </div>
      )}
    </div>
  );
};