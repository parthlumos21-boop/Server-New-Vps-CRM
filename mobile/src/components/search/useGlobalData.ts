import { useState, useEffect } from 'react';
import apiClient from '../../api/client';

export interface GlobalDataState {
  accounts: any[];
  customers: any[];
  deals: any[];
  projects: any[]; // Assuming these are converted deals
  isLoading: boolean;
}

export function useGlobalData() {
  const [data, setData] = useState<GlobalDataState>({
    accounts: [],
    customers: [],
    deals: [],
    projects: [],
    isLoading: true,
  });

  useEffect(() => {
    fetchGlobalData();
  }, []);

  const fetchGlobalData = async () => {
    try {
      setData((prev) => ({ ...prev, isLoading: true }));
      
      const [leadsRes, customersRes, dealsRes] = await Promise.all([
        apiClient.get('/leads').catch(() => ({ data: { data: [] } })),
        apiClient.get('/customers').catch(() => ({ data: { data: [] } })),
        apiClient.get('/deals').catch(() => ({ data: { data: [] } })),
      ]);

      const accounts = leadsRes.data?.data || [];
      const customers = customersRes.data?.data || [];
      const allDeals = dealsRes.data?.data || [];

      // Filter converted deals for projects if applicable
      const deals = allDeals.filter((d: any) => !d.convertPo);
      const projects = allDeals.filter((d: any) => d.convertPo);

      setData({
        accounts,
        customers,
        deals,
        projects,
        isLoading: false,
      });
    } catch (error) {
      console.log('[useGlobalData] Error fetching global data:', error);
      setData((prev) => ({ ...prev, isLoading: false }));
    }
  };

  return data;
}

const normalizeQuery = (value: any) => String(value || '').trim().toLowerCase();

export const matchesQuery = (query: string, values: any[]) => {
  if (!query) return true;
  return values
    .flatMap((value) => {
      if (Array.isArray(value)) return value;
      return [value];
    })
    .some((value) => normalizeQuery(value).includes(query));
};
