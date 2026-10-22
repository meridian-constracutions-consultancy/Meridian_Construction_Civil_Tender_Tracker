export interface TenderDocument {
  id: string;
  document_name: string;
  document_type: string;
  file_url: string;
  file_size_bytes?: number;
  extraction_status: string;
}

export interface Corrigendum {
  id: string;
  corrigendum_title: string;
  corrigendum_type: string;
  publication_date?: string;
  previous_deadline?: string;
  new_deadline?: string;
  details?: string;
  discovered_at: string;
}

export interface TenderListItem {
  id: string;
  tender_id: string;
  reference_number?: string;
  title: string;
  organization_name?: string;
  department?: string;
  state?: string;
  district?: string;
  location?: string;
  portal_name: string;
  source_id: string;
  original_url: string;
  
  estimated_value?: number;
  currency: string;
  tender_fee?: number;
  emd_amount?: number;
  emd_exemption_allowed?: boolean;
  
  published_date?: string;
  bid_submission_start_date?: string;
  bid_submission_deadline?: string;
  bid_opening_date?: string;
  last_verified_at: string;
  
  tender_category?: string;
  product_category?: string;
  category_id?: string;
  is_civil_construction: boolean;
  classification_score: number;
  matched_keywords?: string;
  
  status: string; // ACTIVE, AMENDED, CLOSED
  created_at: string;
  isNewArrival?: boolean; // UI highlight flag for SSE arrivals
}

export interface TenderDetail extends TenderListItem {
  work_description?: string;
  pincode?: string;
  contract_type?: string;
  tenderer_class?: string;
  contract_duration_days?: number;
  contact_name?: string;
  contact_address?: string;
  classification_reason?: string;
  classification_method: string;
  documents: TenderDocument[];
  corrigenda: Corrigendum[];
}

export interface TenderListResponse {
  total_count: number;
  matching_count: number;
  civil_count: number;
  closing_soon_count: number;
  today_count?: number;
  limit: number;
  offset: number;
  items: TenderListItem[];
}

export interface SourceRead {
  id: string;
  name: string;
  base_url: string;
  listing_url: string;
  connector_type: string;
  is_enabled: boolean;
  poll_interval_minutes: number;
  health_status: string; // HEALTHY, RUNNING, WARNING, ERROR, READY
  consecutive_failures: number;
  last_successful_check?: string;
  last_error_time?: string;
  last_error_message?: string;
  last_discovered_identifier?: string;
}

export interface FilterState {
  search: string;
  is_civil_only: boolean;
  category_id: string;
  state: string;
  source_id: string;
  value_range: string;
  closing_soon: boolean;
  listed_today?: boolean;
  sort_by: string;
  order: 'asc' | 'desc';
}
