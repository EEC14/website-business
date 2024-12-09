import { read, utils } from 'xlsx';

export interface HealthData {
  symptoms?: string[];
  medications?: string[];
  conditions?: string[];
  vitals?: Record<string, string>;
  allergies?: string[];
  lifestyle?: Record<string, string>;
  [key: string]: any;
}

export async function parseHealthFile(file: File): Promise<HealthData> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelFile(file);
  } else if (extension === 'txt' || extension === 'csv') {
    return parseTextFile(file);
  } else if (extension === 'docx' || extension === 'doc') {
    // For now, we'll throw an error for unsupported formats
    throw new Error('Word document format is not supported yet. Please upload an Excel (.xlsx) or text (.txt) file.');
  } else {
    throw new Error('Unsupported file format. Please upload an Excel (.xlsx) or text (.txt) file.');
  }
}

async function parseExcelFile(file: File): Promise<HealthData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = utils.sheet_to_json(worksheet, { header: 1 });
        
        const healthData: HealthData = {};
        let currentSection = '';
        
        for (const row of jsonData) {
          if (!row[0]) continue;
          
          const firstCell = String(row[0]).trim().toLowerCase();
          
          if (firstCell.endsWith(':')) {
            currentSection = firstCell.slice(0, -1);
            healthData[currentSection] = [];
          } else if (currentSection && row[0]) {
            if (Array.isArray(healthData[currentSection])) {
              healthData[currentSection].push(row[0]);
            }
          }
        }
        
        resolve(healthData);
      } catch (error) {
        reject(new Error('Failed to parse Excel file. Please check the file format.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file.'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

async function parseTextFile(file: File): Promise<HealthData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        
        const healthData: HealthData = {};
        let currentSection = '';
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          
          if (trimmedLine.endsWith(':')) {
            currentSection = trimmedLine.slice(0, -1).toLowerCase();
            healthData[currentSection] = [];
          } else if (currentSection) {
            if (Array.isArray(healthData[currentSection])) {
              healthData[currentSection].push(trimmedLine);
            }
          }
        }
        
        resolve(healthData);
      } catch (error) {
        reject(new Error('Failed to parse text file. Please check the file format.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file.'));
    };
    
    reader.readAsText(file);
  });
}