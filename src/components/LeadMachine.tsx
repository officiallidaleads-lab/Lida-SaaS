"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Globe, MapPin, Building2, Save, Trash2, ExternalLink, Bot, CheckCircle, Smartphone, Mail, Loader2 } from 'lucide-react';
import { LeadService, Lead, supabase, UsageService, PLAN_LIMITS } from '@/lib/storage';
import Auth from './Auth';
import Upgrade from './Upgrade';

export default function LeadMachine() {
    const [view, setView] = useState<'search' | 'leads' | 'upgrade'>('search');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any[]>([]);
    const [savedLeads, setSavedLeads] = useState<Lead[]>([]);
    
    // Usage State
    const [usage, setUsage] = useState<any>(null);
    const [plan, setPlan] = useState('free');
    
    // Search Filters
    const [platform, setPlatform] = useState('linkedin.com');
    const [niche, setNiche] = useState('Real Estate');
    const [location, setLocation] = useState('Nairobi');
    const [page, setPage] = useState(1);

const [session, setSession] = useState<any>(null);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
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

    const buildQuery = () => {
        // Broad, fuzzy search logic
        const parts = [
            `site:${platform}`,
            niche,
            location
        ].filter(Boolean);
        return parts.join(' ');
    };

    const handleSearch = async () => {
        // Enforce Search Limit
        const check = await UsageService.checkAndIncrement('search');
        if (!check.allowed) {
            alert(check.error || 'Limit Reached');
            return;
        }
        await loadUsage(); // Re-fetch usage to update UI

        setLoading(true);
        setResults([]);
        try {
            const query = buildQuery();
            const start = (page - 1) * 10 + 1;
            const res = await axios.get(`/api/search?query=${encodeURIComponent(query)}&start=${start}`);
            
            if (res.data.items) {
                setResults(res.data.items);
            }
        } catch (error) {
            console.error(error);
            alert('Search failed. Check console.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (item: any) => {
        // Prevent duplicate saves locally first
        const isDuplicate = savedLeads.some(lead => lead.url === item.link);
        if (isDuplicate) {
            // Optional: You could show a small "Already saved" toast here
            return;
        }

        // Enforce Save Limit
        const check = await UsageService.checkAndIncrement('save');
        if (!check.allowed) {
            alert(check.error || 'Limit Reached');
            return;
        }
        await loadUsage();

        const lead = {
            company_name: item.title,
            niche,
            location,
            url: item.link,
            platform,
            snippet: item.snippet,
            status: 'new' as const
        };
        
        // Optimistic update could happen here, but we'll wait for server
        await LeadService.saveLead(lead);
        await loadSavedLeads(); // Reload list
    };

    const handleEnrich = async (url: string) => {
        // Find in results to update UI state
        const updatedResults = results.map(r => {
            if (r.link === url) return { ...r, enriching: true };
            return r;
        });
        setResults(updatedResults);

        try {
            const data = await LeadService.mockEnrich(url);
            
            const finalResults = results.map(r => {
                if (r.link === url) return { ...r, enriching: false, enrichment: data };
                return r;
            });
            setResults(finalResults);
            
        } catch (error) {
            console.error(error);
        }
    };

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
                                <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                    {plan} Plan Usage
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <span className={usage.searches_count >= PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS].searches ? 'text-red-500 font-bold' : ''}>
                                        Searches: {usage.searches_count} / {PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS].searches}
                                    </span>
                                    <span className="w-px h-3 bg-slate-200"></span>
                                    <span className={usage.leads_saved_count >= PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS].saves ? 'text-red-500 font-bold' : ''}>
                                        Saves: {usage.leads_saved_count} / {PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS].saves}
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

                        {/* Search Results */}
                        {results.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Company / Title</th>
                                            <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Platform</th>
                                            <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Status</th>
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
                                                                    <CheckCircle className="w-4 h-4" /> AI Verified (Score: {item.enrichment.relevance_score})
                                                                </div>
                                                                <div className="space-y-1 text-slate-600">
                                                                    {item.enrichment.emails.map((email: string) => (
                                                                        <div key={email} className="flex items-center gap-2 text-xs">
                                                                            <Mail className="w-3 h-3" /> {email}
                                                                        </div>
                                                                    ))}
                                                                    {item.enrichment.phones.map((phone: string) => (
                                                                        <div key={phone} className="flex items-center gap-2 text-xs">
                                                                            <Smartphone className="w-3 h-3" /> {phone}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                                                        {platform.split('.')[0]}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                        New Found
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
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-200">
                            <h2 className="text-lg font-bold text-slate-900">My Saved Leads</h2>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Company</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Details</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase">Date Added</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {savedLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6 font-medium text-slate-900">{lead.company_name}</td>
                                        <td className="py-4 px-6">
                                            <div className="text-sm text-slate-600">
                                                <span className="font-medium">{lead.niche}</span> • {lead.location}
                                            </div>
                                            <a href={lead.url} target="_blank" className="text-xs text-blue-500 hover:underline inline-block mt-1">
                                                {lead.platform}
                                            </a>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-slate-500">
                                            {new Date(lead.date_added).toLocaleDateString()}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button 
                                                onClick={async () => {
                                                    await LeadService.deleteLead(lead.id);
                                                    loadSavedLeads();
                                                }}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {savedLeads.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-slate-500">
                                            No saved leads yet. Go to Search to add some!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}
