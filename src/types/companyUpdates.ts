
export interface CompanyUpdate {
  title: string;
  date: string;
  description: string;
  category: string;
  url?: string;
  documentUrl?: string;
  documentType?: 'document' | 'video' | 'audio'; // Added audio type
  embedCode?: string; // For Buzzsprout embed HTML
}
