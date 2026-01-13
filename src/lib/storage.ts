
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    user_id?: string; // Optional for now until auth is fully moved
}

export const LeadService = {
    getLeads: async (): Promise<Lead[]> => {
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching leads:', error);
            return [];
        }
        return data || [];
    },

    saveLead: async (lead: Omit<Lead, 'id' | 'date_added'>): Promise<Lead | null> => {
        const { data, error } = await supabase
            .from('leads')
            .insert([lead])
            .select()
            .single();

        if (error) {
            console.error('Error saving lead:', error);
            return null;
        }
        return data;
    },

    deleteLead: async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('leads')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error('Error deleting lead:', error);
        }
    },

    mockEnrich: async (url: string) => {
        // KEEPING MOCK FOR NOW - Will replace with real API later
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
