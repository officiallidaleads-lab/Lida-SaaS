
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Fail gracefully during build time or if keys are missing
export const supabase = (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient('https://placeholder.supabase.co', 'placeholder');


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

// Plan Limits Configuration
export const PLAN_LIMITS = {
    free: { searches: 5, saves: 5 },
    pro: { searches: 1000, saves: 1000 },
    agency: { searches: 10000, saves: 10000 }
};

export const UsageService = {
    // Get current usage and plan
    getStatus: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Fetch Plan
        let { data: profile } = await supabase
            .from('profiles')
            .select('plan')
            .eq('id', user.id)
            .single();

        // Fetch Usage
        let { data: usage } = await supabase
            .from('user_usage')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Handle missing records (e.g. old users)
        if (!profile) {
             // Create profile if missing
             const { data: newProfile } = await supabase.from('profiles').insert([{ id: user.id, email: user.email }]).select().single();
             profile = newProfile;
        }
        if (!usage) {
             // Create usage if missing
             const { data: newUsage } = await supabase.from('user_usage').insert([{ user_id: user.id }]).select().single();
             usage = newUsage;
        }

        return {
            plan: profile?.plan || 'free',
            usage: usage || { searches_count: 0, leads_saved_count: 0 }
        };
    },

    // Check if action is allowed & Increment
    checkAndIncrement: async (action: 'search' | 'save'): Promise<{ allowed: boolean, error?: string }> => {
        const status = await UsageService.getStatus();
        if (!status) return { allowed: false, error: 'User not logged in' };

        const { plan, usage } = status;
        const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
        
        // Reset check (Simulated daily reset logic could go here, for now relying on DB trigger or just logic)
        // Ideally DB should have a cron, but frontend can't rely on it. 
        // We will assume usage counts are valid for "today".

        if (action === 'search') {
            if (usage.searches_count >= limits.searches) {
                return { allowed: false, error: 'Daily search limit reached. Upgrade to Pro!' };
            }
            // Increment
            await supabase.rpc('increment_searches', { user_id_param: usage.user_id });
        } 
        
        if (action === 'save') {
             if (usage.leads_saved_count >= limits.saves) {
                return { allowed: false, error: 'Daily save limit reached. Upgrade to Pro!' };
            }
            // Increment
            await supabase.rpc('increment_saves', { user_id_param: usage.user_id });
        }

        return { allowed: true };
    }
};

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
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.error('User must be logged in to save leads');
            return null;
        }

        const { data, error } = await supabase
            .from('leads')
            .insert([{ ...lead, user_id: user.id }])
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

    // Real AI Enrichment
    enrichLead: async (lead: { title: string, link: string, snippet: string }) => {
        try {
            const res = await axios.post('/api/enrich', {
                company: lead.title,
                url: lead.link,
                snippet: lead.snippet
            });
            return {
                emails: res.data.email ? [res.data.email] : [],
                phones: res.data.phone ? [res.data.phone] : [],
                relevance_score: res.data.confidence === 'high' ? 95 : 70
            };
        } catch (error) {
            console.error("Enrichment failed", error);
            return null;
        }
    },

    // Legacy Mock (Kept for fallback if needed, but unused now)
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
