"use client";

import Link from 'next/link';
import { ArrowRight, Search, Zap, Shield, BarChart3, Globe, Sparkles, Check, TrendingUp } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header/Nav */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Lida Leads
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="px-6 py-2.5 font-semibold text-slate-700 hover:text-blue-600 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/dashboard" 
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" />
          AI-Powered Lead Generation
        </div>
        
        <h1 className="text-6xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight">
          Find Your Next Customer
          <br />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            In Seconds, Not Days
          </span>
        </h1>
        
        <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
          Stop wasting time on manual prospecting. Lida Leads uses AI to discover, enrich, and qualify 
          leads from LinkedIn, Facebook, and beyond—automatically.
        </p>

        <div className="flex items-center justify-center gap-4 mb-16">
          <Link 
            href="/dashboard" 
            className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-semibold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            href="#features" 
            className="px-8 py-4 bg-white text-slate-700 text-lg font-semibold rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
          >
            See How It Works
          </Link>
        </div>

        {/* Social Proof */}
        <div className="flex items-center justify-center gap-8 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            <span>5 free searches daily</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            <span>AI enrichment included</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Everything You Need to Scale Your Outreach
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Built for sales teams, recruiters, and entrepreneurs who value their time
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
              <Search className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Multi-Platform Search</h3>
            <p className="text-slate-600 leading-relaxed">
              Search LinkedIn, Facebook, Instagram, and more—all from one dashboard. No more tab-switching.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-7 h-7 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">AI Lead Enrichment</h3>
            <p className="text-slate-600 leading-relaxed">
              Instantly extract emails, phone numbers, and company details with our AI-powered enrichment engine.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
              <BarChart3 className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Smart Usage Tracking</h3>
            <p className="text-slate-600 leading-relaxed">
              Monitor your searches and saves in real-time. Upgrade seamlessly when you need more capacity.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
              <Globe className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Targeted Filtering</h3>
            <p className="text-slate-600 leading-relaxed">
              Filter by industry, location, and platform to find exactly the leads you're looking for.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
              <Shield className="w-7 h-7 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Secure & Private</h3>
            <p className="text-slate-600 leading-relaxed">
              Your leads and data are encrypted and protected. We never share your information with third parties.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:shadow-xl hover:scale-105 transition-all duration-300">
            <div className="w-14 h-14 bg-pink-100 rounded-xl flex items-center justify-center mb-6">
              <TrendingUp className="w-7 h-7 text-pink-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Export Ready</h3>
            <p className="text-slate-600 leading-relaxed">
              Save your qualified leads and export them to your CRM or outreach tools in one click.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-slate-600">
            Start free, upgrade when you're ready to scale
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Free Plan */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:shadow-xl transition-shadow">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Free</h3>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-5xl font-bold text-slate-900">$0</span>
              <span className="text-slate-500">/month</span>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-slate-600">5 searches per day</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-slate-600">5 saves per day</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-slate-600">AI enrichment</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-slate-600">All platforms</span>
              </li>
            </ul>
            <Link 
              href="/dashboard" 
              className="block w-full py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg text-center hover:bg-slate-200 transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-8 rounded-2xl text-white relative overflow-hidden shadow-2xl scale-105">
            <div className="absolute top-4 right-4 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
              MOST POPULAR
            </div>
            <h3 className="text-2xl font-bold mb-2">Pro</h3>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-5xl font-bold">$29</span>
              <span className="text-blue-100">/month</span>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-white flex-shrink-0" />
                <span>1,000 searches per day</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-white flex-shrink-0" />
                <span>1,000 saves per day</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-white flex-shrink-0" />
                <span>Priority AI enrichment</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-white flex-shrink-0" />
                <span>CSV export</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-white flex-shrink-0" />
                <span>Email support</span>
              </li>
            </ul>
            <Link 
              href="/dashboard" 
              className="block w-full py-3 bg-white text-blue-600 font-semibold rounded-lg text-center hover:shadow-lg transition-shadow"
            >
              Start Pro Trial
            </Link>
          </div>

          {/* Agency Plan */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:shadow-xl transition-shadow">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Agency</h3>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-5xl font-bold text-slate-900">$99</span>
              <span className="text-slate-500">/month</span>
            </div>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-slate-600">10,000 searches per day</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-slate-600">10,000 saves per day</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-slate-600">Instant AI enrichment</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-slate-600">Team collaboration</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-slate-600">Priority support</span>
              </li>
            </ul>
            <Link 
              href="/dashboard" 
              className="block w-full py-3 bg-slate-900 text-white font-semibold rounded-lg text-center hover:bg-slate-800 transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-12 text-white shadow-2xl">
          <h2 className="text-4xl font-bold mb-4">
            Ready to 10x Your Lead Generation?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join hundreds of sales teams who've transformed their prospecting with Lida Leads
          </p>
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            Start Your Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Lida Leads</span>
          </div>
          <p className="text-sm">
            © 2026 Lida Leads. All rights reserved. Built with AI-powered precision.
          </p>
        </div>
      </footer>
    </div>
  );
}
