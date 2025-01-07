// FileUploader.tsx
import React, { useState } from 'react';
import { Upload, AlertCircle, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface FileUploaderProps {
  onDataParsed: (data: Partial<PatientData>) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onDataParsed }) => {
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const parseExcel = async (arrayBuffer: ArrayBuffer) => {
    const workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      cellNF: true,
      cellText: true
    });
    
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    
    const headers = data[0] as string[];
    const values = data[1] as string[];
    
    const patientData: Partial<PatientData> = {};
    headers.forEach((header, index) => {
      const key = header.toLowerCase().replace(/\s+/g, '') as keyof PatientData;
      if (values[index]) {
        patientData[key] = values[index];
      }
    });
    
    return patientData;
  };

  const parseCSV = (file: File): Promise<Partial<PatientData>> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const firstRow = results.data[0] as Record<string, string>;
            const patientData: Partial<PatientData> = {};
            
            Object.entries(firstRow).forEach(([key, value]) => {
              const processedKey = key.toLowerCase().replace(/\s+/g, '') as keyof PatientData;
              if (value) {
                patientData[processedKey] = value;
              }
            });
            
            resolve(patientData);
          } else {
            reject(new Error('No data found in CSV file'));
          }
        },
        error: (error) => reject(error)
      });
    });
  };

  const parseXML = async (text: string) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    
    const patientData: Partial<PatientData> = {};
    const fields: (keyof PatientData)[] = ['name', 'age', 'height', 'weight', 'medicalConditions', 'medications', 'allergies', 'previousTreatments'];
    
    fields.forEach(field => {
      const element = xmlDoc.getElementsByTagName(field)[0];
      if (element && element.textContent) {
        patientData[field] = element.textContent;
      }
    });
    
    return patientData;
  };

  const parseTXT = (text: string) => {
    const lines = text.split('\n');
    const patientData: Partial<PatientData> = {};
    
    lines.forEach(line => {
      const [key, value] = line.split(':').map(str => str.trim());
      if (key && value) {
        const processedKey = key.toLowerCase().replace(/\s+/g, '') as keyof PatientData;
        patientData[processedKey] = value;
      }
    });
    
    return patientData;
  };

  const handleFile = async (file: File) => {
    setIsLoading(true);
    setError('');

    try {
      let patientData: Partial<PatientData>;

      if (file.type.includes('excel') || file.type.includes('spreadsheetml')) {
        const arrayBuffer = await file.arrayBuffer();
        patientData = await parseExcel(arrayBuffer);
      } else if (file.type === 'text/csv') {
        patientData = await parseCSV(file);
      } else if (file.type === 'text/xml' || file.type === 'application/xml') {
        const text = await file.text();
        patientData = await parseXML(text);
      } else if (file.type === 'text/plain') {
        const text = await file.text();
        patientData = parseTXT(text);
      } else if (file.type === 'application/pdf') {
        throw new Error('PDF parsing requires additional server-side processing');
      } else {
        throw new Error('Unsupported file format');
      }

      onDataParsed(patientData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFile(file);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex items-center justify-center w-full ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        } border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50`}
      >
        <label className="flex flex-col items-center justify-center w-full h-32 cursor-pointer">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className={`w-8 h-8 mb-2 ${isDragging ? 'text-blue-500' : 'text-gray-500'}`} />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              XML, PDF, TXT, Excel, or CSV
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            accept=".xml,.pdf,.txt,.xlsx,.xls,.csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            disabled={isLoading}
          />
        </label>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center text-gray-500 space-x-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Processing file...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default FileUploader;