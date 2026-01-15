"use client";

import { useState } from 'react';
import { 
    Clock,
    XCircle,
    Mail,
    Phone,
    ExternalLink,
    Trash2,
    Maximize2,
    Minimize2,
    Plus,
    Tag,
    MessageSquare,
    CheckCircle,
    User,
    Copy,
    FileEdit,
    Columns,
    List,
    Globe,
    X
} from 'lucide-react';
import React from 'react';
import { toast } from 'react-hot-toast';
import { type Lead, type PipelineStage } from '@/lib/storage';
import { motion, AnimatePresence } from 'framer-motion';



interface LeadPipelineProps {
    leads: Lead[];
    onUpdateLead: (leadId: string, updates: Partial<Lead>) => Promise<void>;
    onDeleteLead: (leadId: string) => Promise<void>;
}



const STAGE_CONFIG = {
    new: { 
        label: 'New Leads', 
        color: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        icon: Plus 
    },
    contacted: { 
        label: 'Contacted', 
        color: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
        icon: MessageSquare 
    },
    follow_up: { 
        label: 'Follow Up', 
        color: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
        icon: Clock 
    },
    converted: { 
        label: 'Converted', 
        color: 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
        icon: CheckCircle 
    },
    not_interested: { 
        label: 'Not Interested', 
        color: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        icon: XCircle 
    }
};

export default function LeadPipeline({ leads, onUpdateLead, onDeleteLead }: LeadPipelineProps) {
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [noteText, setNoteText] = useState('');
    const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
    const [compactMode, setCompactMode] = useState(true);
    const [updatingStage, setUpdatingStage] = useState(false);
    const [editingNotes, setEditingNotes] = useState(false);

    const handleSaveNote = async (lead: Lead) => {
        // Save the note exactly as typed (no timestamps, no appending)
        await onUpdateLead(lead.id, { notes: noteText.trim() });
        setNoteText('');
        setEditingNotes(false);
    };



    const handleStageChange = async (lead: Lead, newStage: PipelineStage) => {
        setUpdatingStage(true);
        setSelectedLead(null); // Close card FIRST for immediate feedback
        await onUpdateLead(lead.id, { status: newStage });
        // Small delay to ensure database update propagates
        await new Promise(resolve => setTimeout(resolve, 200));
        setUpdatingStage(false);
    };

    const renderLeadCard = (lead: Lead) => {
        const isSelected = selectedLead?.id === lead.id;
        
        // Compact mode: Show minimal info until clicked
        if (compactMode && !isSelected) {
            return (
                <div 
                    key={lead.id}
                    className="bg-white rounded-lg border border-slate-200 p-3 mb-2 cursor-pointer transition-all hover:shadow-md hover:border-blue-300"
                    onClick={() => setSelectedLead(lead)}
                >
                    <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">{lead.company_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">{lead.niche}</span>
                        {lead.email && <Mail className="w-3 h-3 text-blue-500" />}
                        {lead.phone && <Phone className="w-3 h-3 text-green-500" />}
                    </div>
                </div>
            );
        }

        return (
            <div
                key={lead.id}
                className={`bg-white rounded-xl border-2 p-4 mb-3 cursor-pointer transition-all hover:shadow-lg ${
                    isSelected ? 'border-blue-500 shadow-xl' : 'border-slate-200'
                }`}
                onClick={() => setSelectedLead(isSelected ? null : lead)}
            >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 text-lg mb-1">{lead.company_name}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Tag className="w-3 h-3" />
                            <span>{lead.niche}</span>
                            <span>•</span>
                            <span>{lead.location}</span>
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteLead(lead.id);
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                {/* Quick Info */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {lead.email && (
                        <a
                            href={`mailto:${lead.email}`}
                            className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Mail className="w-3 h-3" />
                            Email
                        </a>
                    )}
                    {lead.phone && (
                        <a
                            href={`tel:${lead.phone}`}
                            className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs hover:bg-green-100 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Phone className="w-3 h-3" />
                            Call
                        </a>
                    )}
                    {lead.url && (
                        <div className="flex gap-1">
                            <a
                                href={lead.url}
                                target="_blank"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-blue-600"
                                title="Open Link"
                            >
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    )}
                </div>

                {lead.url && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                        <Globe className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{new URL(lead.url).hostname}</span>
                    </div>
                )}

                {/* Enrichment Indicators */}
                {(lead.email || lead.phone) && (
                     <div className="flex gap-1 mb-2">
                        {lead.email && <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Email Found"></div>}
                        {lead.phone && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Phone Found"></div>}
                     </div>
                )}

                {/* Note Preview */}
                {lead.notes && (
                    <div className="text-xs text-slate-500 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded border border-slate-100 dark:border-slate-800 line-clamp-2">
                        &quot;{lead.notes}&quot;
                    </div>
                )}

                <div className="text-[10px] text-slate-400 mt-2 flex justify-between items-center">
                    <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-140px)] flex flex-col">
            {/* Mobile-First Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                 <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Columns className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                        <span className="hidden sm:inline">Lead Pipeline</span>
                        <span className="sm:hidden">Pipeline</span>
                    </h2>
                    <div className="h-5 sm:h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('pipeline')}
                            className={`p-1 sm:p-1.5 rounded-md transition-all ${viewMode === 'pipeline' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                            aria-label="Pipeline view"
                        >
                            <Columns className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1 sm:p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
                            aria-label="List view"
                        >
                            <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                    </div>
                    
                    <button
                        onClick={() => setCompactMode(!compactMode)}
                        className="p-1.5 sm:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-colors hidden sm:block"
                        title={compactMode ? "Expand Cards" : "Compact Cards"}
                        aria-label={compactMode ? "Expand Cards" : "Compact Cards"}
                    >
                         {compactMode ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                    </button>
                 </div>

                 {/* Close Detail - Only shows X icon when detail is active */}
                 {selectedLead && (
                     <button
                        onClick={() => setSelectedLead(null)}
                        className="absolute top-3 right-3 sm:relative sm:top-auto sm:right-auto p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-all"
                        aria-label="Close detail"
                     >
                         <X className="w-4 h-4 sm:w-5 sm:h-5" />
                     </button>
                 )}
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-0 md:gap-6 overflow-hidden relative">
                {/* Pipeline Board */}
                <div className={`flex-1 overflow-x-auto pb-4 transition-all duration-300 ${selectedLead ? 'hidden md:block md:w-2/3 md:max-w-[66%]' : 'w-full'}`}>
                    <div className="flex gap-3 sm:gap-4 min-w-[280px] sm:min-w-[800px] md:min-w-[1000px] h-full">
                        {(Object.entries(STAGE_CONFIG) as [PipelineStage, typeof STAGE_CONFIG[PipelineStage]][]).map(([stageKey, config]) => {
                            const stageLeads = leads.filter(l => l.status === stageKey);
                            const Icon = config.icon;

                            return (
                                <div key={stageKey} className="flex-1 min-w-[140px] sm:min-w-[200px] md:min-w-[280px] flex flex-col h-full">
                                    {/* Column Header */}
                                    <div className={`
                                        flex items-center justify-between p-2 sm:p-3 rounded-t-xl border-b-2 text-xs sm:text-sm
                                        ${config.color.replace('bg-', 'bg-opacity-20 ')}
                                    `}>
                                        <div className="flex items-center gap-1.5 sm:gap-2 font-semibold">
                                            <Icon className="w-3 h-3 sm:w-4 sm:h-4 opacity-70" />
                                            <span className="hidden sm:inline">{config.label}</span>
                                            <span className="sm:hidden text-[10px]">{config.label.split(' ')[0]}</span>
                                            <span className="bg-white/50 dark:bg-black/20 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold">
                                                {stageLeads.length}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Column Body */}
                                    <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/50 border-x border-b border-slate-200 dark:border-slate-800 rounded-b-xl p-2 sm:p-3 overflow-y-auto custom-scrollbar">
                                        {stageLeads.length === 0 ? (
                                            <div className="h-24 sm:h-32 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                                <small className="text-[10px] sm:text-xs">No leads</small>
                                            </div>
                                        ) : (
                                            <AnimatePresence mode='popLayout'>
                                                {stageLeads.map(lead => (
                                                    <motion.div
                                                        key={lead.id}
                                                        layout
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        {renderLeadCard(lead)}
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Detail Panel - Full screen on mobile, right-aligned on desktop */}
                <AnimatePresence>
                {selectedLead && (
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed md:relative inset-0 md:inset-auto md:w-1/3 md:min-w-[350px] lg:min-w-[400px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 md:z-20 h-full flex flex-col md:rounded-l-2xl overflow-hidden"
                    >
                        {/* Detail Header */}
                        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex justify-between items-start mb-3 sm:mb-4">
                                <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white leading-snug pr-8">
                                    {selectedLead.company_name}
                                </h2>
                                <button
                                    onClick={() => setSelectedLead(null)}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mb-6">
                                <a
                                    href={selectedLead.url}
                                    target="_blank"
                                    className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                                >
                                    <Globe className="w-4 h-4" />
                                    {new URL(selectedLead.url!).hostname}
                                    <ExternalLink className="w-3 h-3 ml-0.5" />
                                </a>
                                <span>•</span>
                                <span>Added {new Date(selectedLead.created_at).toLocaleDateString()}</span>
                            </div>

                            {/* Stage Selector using our config */}
                            <div className="grid grid-cols-5 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                {(Object.keys(STAGE_CONFIG) as PipelineStage[]).map((stage) => (
                                    <button
                                        key={stage}
                                        onClick={() => handleStageChange(selectedLead, stage)}
                                        disabled={updatingStage}
                                        className={`
                                            py-2 rounded-md flex justify-center items-center transition-all relative group
                                            ${selectedLead.status === stage 
                                                ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400 font-medium' 
                                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                            }
                                            ${updatingStage ? 'opacity-50 cursor-not-allowed' : ''}
                                        `}
                                        title={STAGE_CONFIG[stage].label}
                                    >
                                        {/* Icon only for compact tab */}
                                        {React.createElement(STAGE_CONFIG[stage].icon, { className: "w-4 h-4" })}
                                    </button>
                                ))}
                            </div>
                            <div className="text-center mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                Current Stage: <span className="text-slate-800 dark:text-slate-200">{STAGE_CONFIG[selectedLead.status].label}</span>
                            </div>
                        </div>

                        {/* Detail Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* Notes Section */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <FileEdit className="w-4 h-4" /> Notes
                                </h3>
                                <div className="relative">
                                    <textarea
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                        onFocus={() => setEditingNotes(true)}
                                        placeholder="Add notes about this lead..."
                                        className="w-full h-32 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg text-slate-700 dark:text-slate-300 placeholder:text-yellow-700/30 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all resize-none text-sm leading-relaxed"
                                    />
                                    {editingNotes && (
                                        <div className="absolute bottom-3 right-3 flex gap-2">
                                            <button
                                                onClick={() => setEditingNotes(false)}
                                                className="px-3 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 bg-white/50 rounded-md hover:bg-white transition-all shadow-sm"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleSaveNote(selectedLead)}
                                                className="px-3 py-1 text-xs font-bold text-yellow-800 bg-yellow-200 hover:bg-yellow-300 rounded-md transition-all shadow-sm"
                                            >
                                                Save Note
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Contact Info (if enriched) */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <User className="w-4 h-4" /> Contact Details
                                </h3>
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 p-4 space-y-3">
                                    {!selectedLead.email && !selectedLead.phone && (
                                        <div className="text-center py-4 text-slate-400 text-sm">
                                            No contact info found yet. <br/>
                                            <button className="text-blue-500 hover:underline mt-1">Run Enrichment</button>
                                        </div>
                                    )}

                                    {selectedLead.email && (
                                        <div className="flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                                    <Mail className="w-4 h-4" />
                                                </div>
                                                <span className="text-slate-700 dark:text-slate-300 font-medium text-sm">{selectedLead.email}</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(selectedLead.email!);
                                                    toast.success("Email copied");
                                                }}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 transition-all"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Content Snippet */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Original Content</h3>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {selectedLead.snippet}
                                </div>
                            </div>

                        </div>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
        </div>
    );
}
