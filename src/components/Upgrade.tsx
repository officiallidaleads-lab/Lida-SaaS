"use client";

import { useState } from 'react';
import { CheckCircle, Zap, Shield, Rocket } from 'lucide-react';
import { supabase } from '@/lib/storage';

interface UpgradeProps {
    onBack: () => void;
    currentPlan: string;
}

export default function Upgrade({ onBack, currentPlan }: UpgradeProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const handleUpgrade = async (plan: string) => {
        setLoading(plan);
        try {
            // MOCK PAYMENT PROCESS
            // In real world: Redirect to Stripe Checkout
            // For now: Instantly upgrade user
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user found");

            const { error } = await supabase
                .from('profiles')
                .update({ plan: plan.toLowerCase(), subscription_status: 'active' })
                .eq('id', user.id);

            if (error) throw error;
            
            alert(`Successfully upgraded to ${plan}!`);
            window.location.reload();

        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                    <button onClick={onBack} className="text-slate-500 hover:text-slate-800 mb-4 text-sm font-medium">← Back to Dashboard</button>
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">Choose Your Plan</h1>
                    <p className="text-xl text-slate-500">Unlock unlimited leads and scale your outreach.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* FREE */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <Shield className="w-6 h-6 text-slate-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Starter</h3>
                        <div className="text-4xl font-bold text-slate-900 my-4">$0<span className="text-base font-normal text-slate-500">/mo</span></div>
                        <ul className="space-y-3 w-full mb-8 text-sm text-slate-600">
                            <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> 5 Searches / Day</li>
                            <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> 5 Saved Leads / Day</li>
                            <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> Basic Support</li>
                        </ul>
                        <button 
                            disabled={currentPlan === 'free'}
                            className="w-full py-3 rounded-xl font-semibold bg-slate-100 text-slate-400 cursor-not-allowed"
                        >
                            {currentPlan === 'free' ? 'Current Plan' : 'Downgrade'}
                        </button>
                    </div>

                    {/* PRO */}
                    <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-600 p-8 flex flex-col items-center relative transform md:-translate-y-4">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                            Most Popular
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                            <Zap className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Pro</h3>
                        <div className="text-4xl font-bold text-slate-900 my-4">$29<span className="text-base font-normal text-slate-500">/mo</span></div>
                        <ul className="space-y-3 w-full mb-8 text-sm text-slate-600">
                            <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> 1,000 Searches / Day</li>
                            <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> 1,000 Saved Leads / Day</li>
                            <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> Email Enrichment</li>
                            <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> Priority Support</li>
                        </ul>
                        <button 
                            onClick={() => handleUpgrade('Pro')}
                            disabled={currentPlan === 'pro' || loading === 'Pro'}
                            className={`w-full py-3 rounded-xl font-semibold transition-all ${
                                currentPlan === 'pro' 
                                    ? 'bg-green-100 text-green-700 cursor-default' 
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
                            }`}
                        >
                            {currentPlan === 'pro' ? 'Active Plan' : (loading === 'Pro' ? 'Processing...' : 'Upgrade Now')}
                        </button>
                    </div>

                    {/* AGENCY */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                            <Rocket className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Agency</h3>
                        <div className="text-4xl font-bold text-slate-900 my-4">$99<span className="text-base font-normal text-slate-500">/mo</span></div>
                        <ul className="space-y-3 w-full mb-8 text-sm text-slate-600">
                            <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> 10,000 Searches / Day</li>
                            <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> Unlimited Saves</li>
                            <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> API Access</li>
                            <li className="flex items-center"><CheckCircle className="w-4 h-4 text-green-500 mr-2" /> Dedicated Account Manager</li>
                        </ul>
                        <button 
                            onClick={() => handleUpgrade('Agency')}
                            disabled={currentPlan === 'agency' || loading === 'Agency'}
                            className={`w-full py-3 rounded-xl font-semibold transition-all ${
                                currentPlan === 'agency' 
                                    ? 'bg-green-100 text-green-700 cursor-default' 
                                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                        >
                            {currentPlan === 'agency' ? 'Active Plan' : (loading === 'Agency' ? 'Processing...' : 'Upgrade Now')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
