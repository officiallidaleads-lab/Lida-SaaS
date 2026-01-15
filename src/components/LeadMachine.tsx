"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Globe, MapPin, Building2, Save, Trash2, ExternalLink, Bot, CheckCircle, Smartphone, Mail, Loader2, X, Zap, Lock } from 'lucide-react';
import { LeadService, Lead, supabase, UsageService, PLAN_LIMITS } from '@/lib/storage';
import Auth from './Auth';
import Upgrade from './Upgrade';
import LeadPipeline from './LeadPipeline';
import toast from 'react-hot-toast';
import { ModeToggle } from './ModeToggle';

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
            if (!user) return;

            const { data, error } = await supabase
                .from('leads')
                .update(updates)
                .eq('id', leadId)
                .eq('user_id', user.id)
                .select();

            if (error) {
                console.error('Update error:', error.message);
                toast.error('Failed to update lead');
                return;
            }

            if (!data || data.length === 0) {
                console.error('No rows updated');
                toast.error('Failed to update lead');
                return;
            }

            // Show success message based on what was updated
            if (updates.status) {
                toast.success('Lead moved to new stage');
            } else if (updates.notes !== undefined) {
                toast.success('Note saved successfully');
            } else {
                toast.success('Lead updated');
            }

            // Reload leads to reflect changes
            await loadSavedLeads();
        } catch (error) {
            console.error('Update failed:', error);
            toast.error('Something went wrong');
        }
    };

    const handleDeleteLead = async (leadId: string) => {
        try {
            await LeadService.deleteLead(leadId);
            toast.success('Lead deleted');
            await loadSavedLeads();
        } catch (error) {
            console.error('Failed to delete lead:', error);
            toast.error('Failed to delete lead');
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
                toast.success(`Found ${resultsWithPlatform.length} leads`);
            } else {
                toast.error('No results found');
            }
        } catch (error) {
            console.error(error);
            setError('Search failed. Please try again later.');
            toast.error('Search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (item: any) => {
        // Prevent duplicate saves locally first
        const isDuplicate = savedLeads.some(lead => lead.url === item.link);
        if (isDuplicate) {
            toast.error('Lead already saved');
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
            niche: niche,
            location: location,
            url: item.link,
            platform: item.searchedPlatform || platform,
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 transition-colors">
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
                            className="ml-4 px-2 py-1 text-xs font-bold uppercase tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
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
                                <div className="bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2 border border-transparent dark:border-slate-700">
                                    <div className={`w-2 h-2 rounded-full ${usage.searches_count >= (PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.searches || 100) ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                    <span>
                                        {usage.searches_count} / {PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS]?.searches || 0} Credits
                                    </span>
                                </div>
                            </div>
                        )}
                        <ModeToggle />
                        <nav className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-transparent dark:border-slate-700">
                            <button 
                                onClick={() => setView('search')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                    view === 'search' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                            >
                                Search
                            </button>
                            <button 
                                onClick={() => setView('leads')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                    view === 'leads' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                            >
                                My Leads ({savedLeads.length})
                            </button>
                        </nav>
                        <button 
                            onClick={() => supabase.auth.signOut()}
                            className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                            Log Out
                        </button>
                    </div>
                </div>
            </header>

            {view === 'search' && (
                <main className="max-w-3xl mx-auto px-4 py-12">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
                            Find Your Next Big Client
                        </h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400">
                            AI-powered lead generation across web & social media
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 mb-8 transition-colors">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Platform</label>
                                    <div className="relative">
                                        <Globe className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <select 
                                            value={platform}
                                            onChange={(e) => setPlatform(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none"
                                        >
                                            <option value="linkedin.com">LinkedIn</option>
                                            <option value="facebook.com">Facebook</option>
                                            <option value="instagram.com">Instagram</option>
                                            <option value="x.com">X (Twitter)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Niche</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text" 
                                            value={niche}
                                            onChange={(e) => setNiche(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400"
                                            placeholder="e.g. Real Estate"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Location</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                        <input 
                                            type="text" 
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none placeholder:text-slate-400"
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
                    </div>


                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-pulse">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            {error}
                        </div>
                    )}

                    {/* Results */}
                    <div className="space-y-4">
                        {results.length > 0 && (
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Found {results.length} Leads
                                </h3>
                                <button
                                    onClick={() => setResults([])}
                                    className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    Clear Results
                                </button>
                            </div>
                        )}
                        
                        {results.map((item, i) => {
                            const isSaved = savedLeads.some(l => l.url === item.link);

                            return (
                                <div 
                                    key={i} 
                                    className={`group bg-white dark:bg-slate-900 rounded-xl p-5 border transition-all hover:shadow-lg ${
                                        isSaved 
                                            ? 'border-green-200 dark:border-green-900 bg-green-50/30 dark:bg-green-900/10' 
                                            : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {item.title}
                                            </h3>
                                            <a 
                                                href={item.link} 
                                                target="_blank" 
                                                className="text-sm text-slate-400 hover:text-blue-500 flex items-center gap-1 mt-1 mb-2"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                {new URL(item.link).hostname}
                                            </a>
                                            <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2">{item.snippet}</p>
                                            
                                            {/* Labels / Tags */}
                                            <div className="flex gap-2 mt-4">
                                                {/* Enrichment UI */}
                                                {item.enriching ? (
                                                     <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs border border-purple-100 dark:border-purple-800">
                                                        <Loader2 className="w-3 h-3 animate-spin"/> Enriching...
                                                     </span>
                                                ) : item.enrichment ? (
                                                    <div className="flex gap-2">
                                                        {item.enrichment.emails.length > 0 && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs border border-green-100 dark:border-green-800">
                                                                <Mail className="w-3 h-3"/> {item.enrichment.emails.length} Emails
                                                            </span>
                                                        )}
                                                        {item.enrichment.phones.length > 0 && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs border border-blue-100 dark:border-blue-800">
                                                                <Smartphone className="w-3 h-3"/> Phone Found
                                                            </span>
                                                        )}
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs border border-amber-100 dark:border-amber-800">
                                                            <Zap className="w-3 h-3"/> {item.enrichment.relevance_score}% Match
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleEnrich(item.link)}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs hover:bg-purple-50 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                                    >
                                                        <Bot className="w-3 h-3" /> Enrich Lead
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => isSaved ? null : handleSave(item)}
                                            disabled={isSaved}
                                            className={`p-3 rounded-lg transition-all ${
                                                isSaved 
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 cursor-default' 
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600'
                                            }`}
                                        >
                                            {isSaved ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Pagination */}
                        {results.length > 0 && (
                            <div className="flex justify-center gap-4 mt-8">
                                <button 
                                    onClick={() => {
                                        setPage(p => Math.max(1, p - 1));
                                        handleSearch();
                                    }}
                                    disabled={page === 1}
                                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <span className="flex items-center text-slate-600 dark:text-slate-400 font-medium">Page {page}</span>
                                <button 
                                    onClick={() => {
                                        setPage(p => p + 1);
                                        handleSearch();
                                    }}
                                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                </main>
            )}

            {view === 'leads' && (
                <main className="max-w-7xl mx-auto px-4 py-8">
                     <LeadPipeline 
                        leads={savedLeads} 
                        onUpdateLead={handleUpdateLead}
                        onDeleteLead={handleDeleteLead}
                    />
                </main>
            )}
            
            {/* Limit Reached Modal */}
            {showLimitModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center border border-slate-200 dark:border-slate-800">
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
