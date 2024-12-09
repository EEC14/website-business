import { useState } from 'react';

export interface Analytics {
  patientQueries: number;
  staffQueries: number;
  urgentCases: number;
}

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics>({
    patientQueries: 0,
    staffQueries: 0,
    urgentCases: 0
  });

  const incrementMetric = (metric: keyof Analytics) => {
    setAnalytics(prev => ({
      ...prev,
      [metric]: prev[metric] + 1
    }));
  };

  return { analytics, incrementMetric };
}