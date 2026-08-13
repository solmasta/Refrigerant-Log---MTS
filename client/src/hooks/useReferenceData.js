import { useEffect, useState } from 'react';
import { api } from '../api.js';

export function useReferenceData() {
  const [data, setData] = useState({ refrigerantTypes: [], serviceTypes: [], units: ['lbs'] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .referenceData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { ...data, loading };
}
