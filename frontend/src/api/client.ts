import { TenderListResponse, TenderDetail, SourceRead, FilterState } from '../types/tender';

const BASE_URL = '/api';

export async function fetchTenders(
  filters: Partial<FilterState>,
  limit: number = 50,
  offset: number = 0,
  signal?: AbortSignal
): Promise<TenderListResponse> {
  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  params.set('offset', offset.toString());

  if (filters.search) params.set('search', filters.search);
  if (filters.is_civil_only !== undefined) params.set('is_civil_only', filters.is_civil_only.toString());
  if (filters.category_id) params.set('category_id', filters.category_id);
  if (filters.state) params.set('state', filters.state);
  if (filters.source_id) params.set('source_id', filters.source_id);
  if (filters.closing_soon) params.set('closing_soon', 'true');
  if (filters.listed_today) params.set('listed_today', 'true');
  if (filters.sort_by) params.set('sort_by', filters.sort_by);
  if (filters.order) params.set('order', filters.order);

  // Handle value range presets
  if (filters.value_range) {
    if (filters.value_range === 'under_50l') {
      params.set('max_value', '5000000');
    } else if (filters.value_range === '50l_2cr') {
      params.set('min_value', '5000000');
      params.set('max_value', '20000000');
    } else if (filters.value_range === '2cr_10cr') {
      params.set('min_value', '20000000');
      params.set('max_value', '100000000');
    } else if (filters.value_range === 'above_10cr') {
      params.set('min_value', '100000000');
    }
  }

  params.set('_t', Date.now().toString());
  const response = await fetch(`${BASE_URL}/tenders?${params.toString()}`, {
    signal,
    cache: 'no-store',
    headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch tenders: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchTenderDetail(idOrTenderId: string): Promise<TenderDetail> {
  const response = await fetch(`${BASE_URL}/tenders/${encodeURIComponent(idOrTenderId)}?_t=${Date.now()}`, {
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch tender detail: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchSources(): Promise<SourceRead[]> {
  const response = await fetch(`${BASE_URL}/sources?_t=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch sources: ${response.statusText}`);
  }
  return response.json();
}

export async function syncAllSources(): Promise<any> {
  const response = await fetch(`${BASE_URL}/sources/sync-now`, {
    method: 'POST',
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`Failed to trigger live sync: ${response.statusText}`);
  }
  return response.json();
}

export async function triggerSourceScan(sourceId: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/sources/${encodeURIComponent(sourceId)}/trigger`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to trigger source scan: ${response.statusText}`);
  }
  return response.json();
}

export async function toggleSaveTender(tenderId: string): Promise<{ status: string }> {
  const response = await fetch(`${BASE_URL}/tenders/${encodeURIComponent(tenderId)}/save`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to save tender: ${response.statusText}`);
  }
  return response.json();
}

export function getExportUrl(type: 'csv' | 'excel', filters: Partial<FilterState>): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.is_civil_only !== undefined) params.set('is_civil_only', filters.is_civil_only.toString());
  if (filters.category_id) params.set('category_id', filters.category_id);
  if (filters.state) params.set('state', filters.state);
  if (filters.source_id) params.set('source_id', filters.source_id);
  if (filters.closing_soon) params.set('closing_soon', 'true');
  if (filters.listed_today) params.set('listed_today', 'true');
  return `${BASE_URL}/export/${type}?${params.toString()}`;
}
