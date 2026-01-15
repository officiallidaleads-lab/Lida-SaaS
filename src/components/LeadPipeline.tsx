"use client";

import React, { useState } from 'react';
import { Lead } from '@/lib/storage';
import { 
    Mail, Phone, Linkedin, MessageSquare, Clock, Star, 
    Calendar, ExternalLink, Tag, CheckCircle, XCircle,
    ArrowRight, Edit3, Trash2, Plus, Filter
} from 'lucide-react';

interface LeadPipelineProps {
    leads: Lead[];
    onUpdateLead: (leadId: string, updates: Partial<Lead>) => Promise<void>;
    onDeleteLead: (leadId: string) => Promise<void>;
}

type PipelineStage = 'new' | 'contacted' | 'follow_up' | 'converted' | 'not_interested';

const STAGE_CONFIG = {
    new: { 
        label: 'New Leads', 
        color: 'bg-blue-100 text-blue-700 border-blue-300',
        icon: Plus 
    },
    contacted: { 
        label: 'Contacted', 
        color: 'bg-purple-100 text-purple-700 border-purple-300',
        icon: MessageSquare 
    },
    follow_up: { 
        label: 'Follow Up', 
        color: 'bg-orange-100 text-orange-700 border-orange-300',
        icon: Clock 
    },
    converted: { 
        label: 'Converted', 
        color: 'bg-green-100 text-green-700 border-green-300',
        icon: CheckCircle 
    },
    not_interested: { 
        label: 'Not Interested', 
        color: 'bg-slate-100 text-slate-700 border-slate-300',
        icon: XCircle 
    }
};

export default function LeadPipeline({ leads, onUpdateLead, onDeleteLead }: LeadPipelineProps) {
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [noteText, setNoteText] = useState('');
    const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');

    const groupedLeads = leads.reduce((acc, lead) => {
        const stage = lead.status || 'new';
        if (!acc[stage]) acc[stage] = [];
        acc[stage].push(lead);
        return acc;
    }, {} as Record<PipelineStage, Lead[]>);

    const handleAddNote = async (lead: Lead) => {
        if (!noteText.trim()) return;
        
        const existingNotes = lead.notes || '';
        const timestamp = new Date().toLocaleString();
        const newNote = `[${timestamp}] ${noteText}\n${existingNotes}`;
        
        await onUpdateLead(lead.id, { notes: newNote });
        setNoteText('');
    };

    const handleStageChange = async (lead: Lead, newStage: PipelineStage) => {
        await onUpdateLead(lead.id, { status: newStage });
    };

    const renderLeadCard = (lead: Lead) => {
        const isSelected = selectedLead?.id === lead.id;
        
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
                        <a 
                            href={lead.url}
                            target="_blank"
                            className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs hover:bg-purple-100 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <ExternalLink className="w-3 h-3" />
                            Visit
                        </a>
                    )}
                </div>

                {/* Expanded Details */}
                {isSelected && (
                    <div className="border-t border-slate-200 pt-4 mt-4 space-y-4">
                        {/* Stage Changer */}
                        <div>
                            <label className="text-xs font-semibold text-slate-700 mb-2 block">Move to Stage:</label>
                            <div className="flex gap-2 flex-wrap">
                                {Object.entries(STAGE_CONFIG).map(([stage, config]) => (
                                    <button
                                        key={stage}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleStageChange(lead, stage as PipelineStage);
                                        }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                            lead.status === stage
                                                ? config.color + ' border-2'
                                                : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:border-slate-300'
                                        }`}
                                    >
                                        {config.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notes Section */}
                        <div>
                            <label className="text-xs font-semibold text-slate-700 mb-2 block flex items-center gap-2">
                                <Edit3 className="w-4 h-4" />
                                Notes & Follow-ups
                            </label>
                            <div className="space-y-2">
                                <textarea
                                    value={noteText}
                                    onChange={(e) => setNoteText(e.target.value)}
                                    placeholder="Add a note... (e.g., 'Called on Jan 15, left voicemail')"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                    rows={2}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddNote(lead);
                                    }}
                                    disabled={!noteText.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Add Note
                                </button>
                            </div>
                            
                            {/* Existing Notes */}
                            {lead.notes && (
                                <div className="mt-3 bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                                    <pre className="text-xs text-slate-600 whitespace-pre-wrap font-sans">
                                        {lead.notes}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer - Date */}
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                    <Calendar className="w-3 h-3" />
                    <span>Added {new Date(lead.date_added).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
            </div>
        );
    };

    if (viewMode === 'list') {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">My Leads ({leads.length})</h2>
                    <button
                        onClick={() => setViewMode('pipeline')}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                        Pipeline View
                    </button>
                </div>
                <div className="grid gap-4">
                    {leads.map(renderLeadCard)}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Lead Pipeline</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage your sales pipeline & track progress</p>
                </div>
                <button
                    onClick={() => setViewMode('list')}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
                >
                    List View
                </button>
            </div>

            {/* Pipeline Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {(Object.keys(STAGE_CONFIG) as PipelineStage[]).map((stage) => {
                    const config = STAGE_CONFIG[stage];
                    const stageLeads = groupedLeads[stage] || [];
                    const Icon = config.icon;

                    return (
                        <div key={stage} className="bg-slate-50 rounded-xl p-4">
                            {/* Column Header */}
                            <div className="flex items-center gap-2 mb-4">
                                <div className={`p-2 rounded-lg ${config.color.split(' ')[0]}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900 text-sm">{config.label}</h3>
                                    <p className="text-xs text-slate-500">{stageLeads.length} leads</p>
                                </div>
                            </div>

                            {/* Cards */}
                            <div className="space-y-3">
                                {stageLeads.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-sm">
                                        No leads yet
                                    </div>
                                ) : (
                                    stageLeads.map(renderLeadCard)
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
