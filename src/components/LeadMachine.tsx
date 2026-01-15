"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Globe, MapPin, Building2, Save, Trash2, ExternalLink, Bot, CheckCircle, Smartphone, Mail, Loader2, X, Zap, Lock } from 'lucide-react';
import { LeadService, Lead, supabase, UsageService, PLAN_LIMITS } from '@/lib/storage';
import Auth from './Auth';
import Upgrade from './Upgrade';
import LeadPipeline from './LeadPipeline';

export default function LeadMachine() {
    const [view, setView] = useState<'search' | 'leads' | 'upgrade'>('search');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [savedLeads, setSavedLeads] = useState<Lead[]>([]);
    const [error, setError] = useState<string | null>(null);
    
    // Usage State
    const [usage, setUsage] = useState<any>(null);
    const [plan, setPlan] = useState('free');
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [limitMessage, setLimitMessage] = useState('');
    
    // Search Filters
    const [platform, setPlatform] = useState('linkedin.com');
    const [niche, setNiche] = useState('Real Estate');
    const [location, setLocation] = useState('Nairobi');
    const [page, setPage] = useState(1);

const [session, setSession] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setAuthLoading(false);
            if (session) {
                loadSavedLeads();
                loadUsage();
            }
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setAuthLoading(false);
            if (session) {
                loadSavedLeads();
                loadUsage();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadSavedLeads = async () => {
        // Prevent loading if no session 
        // Note: Real security is handled by RLS on backend
        const leads = await LeadService.getLeads();
        setSavedLeads(leads);
    };

    const loadUsage = async () => {
        const status = await UsageService.getStatus();
        if (status) {
            setPlan(status.plan);
            setUsage(status.usage);
        }
    };

    const handleUpdateLead = async (leadId: string, updates: Partial<Lead>) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.error('❌ No user found');
                return;
            }

            console.log('🔄 Updating lead:', leadId, 'with:', updates);
            console.log('👤 User ID:', user.id);

            const { data, error } = await supabase
                .from('leads')
                .update(updates)
                .eq('id', leadId)
                .eq('user_id', user.id)
                .select(); // IMPORTANT: Get returned data to verify update

            if (error) {
                console.error('❌ Supabase error:', error);
                console.error('❌ Error code:', error.code);
                console.error('❌ Error message:', error.message);
                console.error('❌ Error details:', error.details);
                alert(`Failed to update: ${error.message}`);
                return;
            }

            if (!data || data.length === 0) {
                console.error('❌ No rows updated! Lead might not exist or user_id mismatch');
                console.error('Lead ID:', leadId);
                console.error('User ID:', user.id);
                alert('Failed to update lead. No matching record found.');
                return;
            }

            console.log('✅ Lead updated successfully:', data);

            // Reload leads to reflect changes
            await loadSavedLeads();
            console.log('✅ Leads reloaded from database');
        } catch (error) {
            console.error('❌ Exception:', error);
            alert(`Update failed: ${error}`);
        }
    };

    const handleDeleteLead = async (leadId: string) => {
        try {
            await LeadService.deleteLead(leadId);
            await loadSavedLeads();
        } catch (error) {
            console.error('Failed to delete lead:', error);
        }
    };

    const buildQuery = () => {
        // Improved precision: Filter for companies/organizations only
        const parts = [];
        
        // Platform filter
        parts.push(`site:${platform}`);
        
        // Niche/Industry
        if (niche) parts.push(`"${niche}"`);
        
        // Location - use quotes for exact match
        if (location) parts.push(`"${location}"`);
        
        // Add filters to exclude personal profiles
        if (platform === 'linkedin.com') {
            // LinkedIn: Search for company pages only, exclude personal profiles
            parts.push('(company OR organization OR "company page")');
            parts.push('-"personal profile"');
        } else if (platform === 'facebook.com') {
            parts.push('(business OR company OR page)');
        }
        
        return parts.join(' ');
    };

    const handleSearch = async () => {
        setError(null);
        setLoading(true);
        setResults([]);

        // Enforce Search Limit (Fail-Open)
        try {
            const check = await UsageService.checkAndIncrement('search');
            if (!check.allowed) {
                setLimitMessage(check.error || 'Daily search limit reached.');
                setShowLimitModal(true);
                setLoading(false);
                return;
            }
            await loadUsage(); // Re-fetch usage to update UI
        } catch (err) {
            console.warn("Usage check failed, allowing search anyway:", err);
        }

        try {
            const query = buildQuery();
            const start = (page - 1) * 10 + 1;
            const res = await axios.get(`/api/search?query=${encodeURIComponent(query)}&start=${start}`);
            
            if (res.data.items) {
                // Attach current platform to each result to avoid confusion when toggling
                const resultsWithPlatform = res.data.items.map((r: any) => ({
                    ...r,
                    searchedPlatform: platform
                }));
                setResults(resultsWithPlatform);
            }
        } catch (error) {
            console.error(error);
            setError('Search failed. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (item: any) => {
        // Prevent duplicate saves locally first
        const isDuplicate = savedLeads.some(lead => lead.url === item.link);
        if (isDuplicate) {
            setError('This lead is already saved!');
            setTimeout(() => setError(null), 3000);
            return;
        }

        // Check limit BEFORE attempting save (don't increment yet)
        const status = await UsageService.getStatus();
        if (!status) return;
        
        const limit = PLAN_LIMITS[status.plan as keyof typeof PLAN_LIMITS]?.saves || 0;
        if (status.usage.saves_count >= limit) {
            setLimitMessage('Daily save limit reached. Upgrade for more saves!');
            setShowLimitModal(true);
            return;
        }

        const lead = {
            company_name: item.title,
            niche,
            location,
            url: item.link,
            platform,
            snippet: item.snippet,
            status: 'new' as const
        };
        
        // Try to save first
        const savedLead = await LeadService.saveLead(lead);
        
        // Only increment usage if save succeeded
        if (savedLead) {
            await UsageService.checkAndIncrement('save');
            await loadUsage();
            await loadSavedLeads();
        } else {
            setError('Failed to save lead. Please try again.');
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleEnrich = async (url: string) => {
        // Find in results to update UI state
        const updatedResults = results.map(r => {
            if (r.link === url) return { ...r, enriching: true };
            return r;
        });
        setResults(updatedResults);

        try {
            // Note: enrichLead helps us get real data from Gemini
            const data = await LeadService.enrichLead({
                title: results.find(r => r.link === url)?.title,
                link: url,
                snippet: results.find(r => r.link === url)?.snippet
            });
            
            const finalResults = results.map(r => {
                if (r.link === url) return { ...r, enriching: false, enrichment: data };
                return r;
            });
            setResults(finalResults);
            
        } catch (error) {
            console.error(error);
        }
    };

    // Show loading state while checking auth (prevents flash)
    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!session) {
        return <Auth />;
    }

    if (view === 'upgrade') {
        return <Upgrade onBack={() => setView('search')} currentPlan={plan} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <Search className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
                            Lida <span className="text-slate-400 font-normal text-sm">v2.0</span>
                        </h1>
                        <button 
                            onClick={() => setView('upgrade')}
                            className="ml-4 px-2 py-1 text-xs font-bold uppercase tracking-wide bg-amber-100 text-amber-700 rounded-full hover:bg-amber-200 transition-colors"
                        >
                            {plan} Plan
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {usage && (
                            <div className="hidden md:flex flex-col items-end mr-4">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                                    {plan} Plan
                                </div>
                                <div className="bg-slate-100 rounded-full px-3 py-1 text-xs font-semibold text-slate-700 flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${usage.searches_count >= (PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.searches || 100) ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                    <span>
                                        {usage.searches_count} / {PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.searches || 0} Credits
                                    </span>
                                </div>
                            </div>
                        )}
                        <nav className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setView('search')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                    view === 'search' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Search
                            </button>
                            <button 
                                onClick={() => setView('leads')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                    view === 'leads' ? 'bg-white shadow text-blue-600' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                My Leads ({savedLeads.length})
                            </button>
                        </nav>
                        <button 
                            onClick={() => supabase.auth.signOut()}
                            className="text-sm font-medium text-slate-500 hover:text-slate-800"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                {view === 'search' ? (
                    <div className="space-y-6">
                        {/* Search Controls */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Platform</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <select 
                                            value={platform}
                                            onChange={(e) => setPlatform(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                        >
                                            <option value="linkedin.com">LinkedIn</option>
                                            <option value="facebook.com">Facebook</option>
                                            <option value="instagram.com">Instagram</option>
                                            <option value="x.com">X (Twitter)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Niche</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text" 
                                            value={niche}
                                            onChange={(e) => setNiche(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                            placeholder="e.g. Real Estate"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Location</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text" 
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                                            placeholder="e.g. Nairobi"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-end">
                                    <button 
                                        onClick={handleSearch}
                                        disabled={loading}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                        {loading ? 'Searching...' : 'Find Leads'}
                                    </button>
                                </div>
                            </div>
                        </div>


                        {/* Error Message */}
                        {error && (
                            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                                {error}
                            </div>
                        )}

                        {/* Search Results */}
                        {results.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Company / Title</th>
                                            <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Platform</th>
                                            <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {results.map((item, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div>
                                                        <h3 className="font-medium text-slate-900 line-clamp-1" title={item.title}>{item.title}</h3>
                                                        <a href={item.link} target="_blank" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-1">
                                                            Visit Page <ExternalLink className="w-3 h-3" />
                                                        </a>
                                                        {item.enrichment && (
                                                            <div className="mt-3 bg-green-50 border border-green-100 rounded-lg p-3 text-sm">
                                                                <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                                                                    <CheckCircle className="w-4 h-4" /> AI Enriched (Confidence: {item.enrichment.relevance_score}%)
                                                                </div>
                                                                <div className="space-y-1 text-slate-600">
                                                                    {item.enrichment.emails && item.enrichment.emails.length > 0 ? (
                                                                        item.enrichment.emails.map((email: string) => (
                                                                            <div key={email} className="flex items-center gap-2 text-xs">
                                                                                <Mail className="w-3 h-3" /> {email}
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="text-xs text-slate-400 italic">No email found</div>
                                                                    )}
                                                                    {item.enrichment.phones && item.enrichment.phones.length > 0 ? (
                                                                        item.enrichment.phones.map((phone: string) => (
                                                                            <div key={phone} className="flex items-center gap-2 text-xs">
                                                                                <Smartphone className="w-3 h-3" /> {phone}
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="text-xs text-slate-400 italic">No phone found</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                                                        {item.searchedPlatform?.split('.')[0] || 'unknown'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleEnrich(item.link)}
                                                            disabled={item.enriching || item.enrichment}
                                                            className={`p-2 rounded-lg transition-all ${
                                                                item.enrichment 
                                                                    ? 'bg-green-100 text-green-700' 
                                                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                                            }`}
                                                            title="Deep Search with AI"
                                                        >
                                                            {item.enriching ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <Bot className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleSave(item)}
                                                            className={`p-2 rounded-lg transition-all cursor-pointer ${
                                                                savedLeads.some(l => l.url === item.link)
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                            }`}
                                                            title={savedLeads.some(l => l.url === item.link) ? "Lead Saved" : "Save Lead"}
                                                        >
                                                            {savedLeads.some(l => l.url === item.link) ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        
                        {/* Empty State */}
                        {!loading && results.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 px-4">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-medium text-slate-900">Ready to find leads?</h3>
                                <p className="text-slate-500 mt-2 max-w-sm mx-auto">Select a platform and niche above to start searching for potential clients using our advanced AI-powered engine.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <LeadPipeline 
                        leads={savedLeads}
                        onUpdateLead={handleUpdateLead}
                        onDeleteLead={handleDeleteLead}
                    />
                )}
            </main>

            {/* Limit Reached Modal */}
            {showLimitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setShowLimitModal(false)}
                            className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                                <Lock className="w-6 h-6 text-amber-600" />
                            </div>
                            
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Limit Reached</h3>
                            <p className="text-slate-500 mb-6">
                                {limitMessage} <br/>
                                Upgrade to <b>Pro</b> for 1,000+ daily searches.
                            </p>

                            <button
                                onClick={() => {
                                    setShowLimitModal(false);
                                    setView('upgrade');
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                            >
                                <Zap className="w-5 h-5" />
                                Upgrade Now
                            </button>
                            
                            <button 
                                onClick={() => setShowLimitModal(false)}
                                className="mt-3 text-slate-400 hover:text-slate-600 text-sm font-medium"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
