export interface Lead {
    id: string;
    company_name: string;
    niche: string;
    location: string;
    url?: string;
    platform?: string;
    snippet?: string;
    status: 'new' | 'contacted' | 'follow_up' | 'converted' | 'not_interested';
    email?: string;
    phone?: string;
    notes?: string;
    enrichment?: any;
    date_added: string;
}

const STORAGE_KEY = 'lida_leads_v2';

export const LeadService = {
    getLeads: (): Lead[] => {
        if (typeof window === 'undefined') return [];
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    saveLead: (lead: Omit<Lead, 'id' | 'date_added'>): Lead => {
        const leads = LeadService.getLeads();
        const newLead: Lead = {
            ...lead,
            id: crypto.randomUUID(),
            date_added: new Date().toISOString(),
        };
        leads.unshift(newLead);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
        return newLead;
    },

    updateLead: (id: string, updates: Partial<Lead>): Lead | null => {
        const leads = LeadService.getLeads();
        const index = leads.findIndex(l => l.id === id);
        if (index === -1) return null;
        
        leads[index] = { ...leads[index], ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
        return leads[index];
    },

    deleteLead: (id: string): void => {
        const leads = LeadService.getLeads();
        const newLeads = leads.filter(l => l.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newLeads));
    },

    mockEnrich: async (url: string) => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
            verified: true,
            emails: [`contact@${new URL(url).hostname.replace('www.', '')}`, `sales@${new URL(url).hostname.replace('www.', '')}`],
            phones: ['+254 712 345 678'],
            socials: {
                linkedin: `https://linkedin.com/company/${new URL(url).hostname.split('.')[0]}`,
                facebook: `https://facebook.com/${new URL(url).hostname.split('.')[0]}`
            },
            relevance_score: 95
        };
    }
};
