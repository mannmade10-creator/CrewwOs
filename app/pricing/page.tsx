"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

type PriceKey =
  | "starter"
  | "pro"
  | "enterprise"
  | "site_basic"
  | "site_pro"
  | "site_elite"
  | "nia_setup"
  | "nia_credits_500"
  | "nia_credits_1500"
  | "nia_credits_5000"
  | "biz_registration"
  | "biz_ein"
  | "biz_bundle"
  | "biz_registered_agent";

const AGENTS = {
  starter: [
    "Content Repurposer",
    "Social Caption Writer",
    "Email Drafter",
  ],
  pro: [
    "Content Repurposer",
    "Social Caption Writer",
    "Email Drafter",
    "SEO Optimizer",
    "Ad Copy Generator",
  ],
  enterprise: [
    "Content Repurposer",
    "Social Caption Writer",
    "Email Drafter",
    "SEO Optimizer",
    "Ad Copy Generator",
    "Lead Qualifier",
    "CRM Updater",
    "Invoice Generator",
    "Contract Drafter",
    "Analytics Reporter",
  ],
};

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState<PriceKey | null>(null);

  async function checkout(priceKey: PriceKey) {
    

    setLoading(priceKey);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceKey }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Something went wrong. Please try again.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-sm font-semibold tracking-widest text-purple-400 uppercase mb-3">
          CrewwOS Pricing
        </p>
        <h1 className="text-5xl font-bold mb-5 bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">
          Your AI Crew, Your Price
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Start with basic agents and upgrade as you grow. Every plan includes
          your personal CrewwOS workspace and dashboard.
        </p>
      </div>

      {/* Main Plans */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Starter
              </p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold">$99</span>
                <span className="text-gray-400 mb-1">/mo</span>
              </div>
              <p className="text-sm text-gray-500">3 AI agents to get started</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {AGENTS.starter.map((a) => (
                <li key={a} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-purple-400">✓</span> {a}
                </li>
              ))}
              <li className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-purple-400">✓</span> CrewwOS Workspace
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-purple-400">✓</span> Basic Dashboard
              </li>
            </ul>
            <button
              onClick={() => checkout("starter")}
              disabled={loading === "starter"}
              className="w-full py-3 rounded-xl border border-purple-500 text-purple-400 font-semibold hover:bg-purple-500/10 transition disabled:opacity-50"
            >
              {loading === "starter" ? "Loading…" : "Get Started"}
            </button>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border border-purple-500 bg-purple-500/10 p-8 flex flex-col relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-bold px-4 py-1 rounded-full">
              MOST POPULAR
            </div>
            <div className="mb-6">
              <p className="text-sm font-semibold text-purple-300 uppercase tracking-widest mb-2">
                Pro
              </p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold">$299</span>
                <span className="text-gray-400 mb-1">/mo</span>
              </div>
              <p className="text-sm text-gray-400">5 mid-tier agents for growth</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {AGENTS.pro.map((a) => (
                <li key={a} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-purple-400">✓</span> {a}
                </li>
              ))}
              <li className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-purple-400">✓</span> Everything in Starter
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-purple-400">✓</span> Priority Support
              </li>
            </ul>
            <button
              onClick={() => checkout("pro")}
              disabled={loading === "pro"}
              className="w-full py-3 rounded-xl bg-purple-500 text-white font-semibold hover:bg-purple-600 transition disabled:opacity-50"
            >
              {loading === "pro" ? "Loading…" : "Get Pro"}
            </button>
          </div>

          {/* Enterprise */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 flex flex-col">
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Enterprise
              </p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold">$999</span>
                <span className="text-gray-400 mb-1">/mo</span>
              </div>
              <p className="text-sm text-gray-500">10 power agents, full suite</p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {AGENTS.enterprise.map((a) => (
                <li key={a} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-purple-400">✓</span> {a}
                </li>
              ))}
              <li className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-purple-400">✓</span> Everything in Pro
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-purple-400">✓</span> Dedicated Support
              </li>
              <li className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-purple-400">✓</span> Custom Integrations
              </li>
            </ul>
            <button
              onClick={() => checkout("enterprise")}
              disabled={loading === "enterprise"}
              className="w-full py-3 rounded-xl border border-purple-500 text-purple-400 font-semibold hover:bg-purple-500/10 transition disabled:opacity-50"
            >
              {loading === "enterprise" ? "Loading…" : "Go Enterprise"}
            </button>
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-3xl font-bold text-center mb-3">Add-Ons & Services</h2>
        <p className="text-gray-400 text-center mb-12">
          Purchase individually — no subscription required
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Website + App Builder */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">🌐</span>
              <div>
                <h3 className="text-xl font-bold">Website + App Builder</h3>
                <p className="text-sm text-gray-400">Launch in 5 minutes</p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                { key: "site_basic" as PriceKey, label: "Basic", price: "$150", desc: "5-page site, mobile-friendly, custom domain" },
                { key: "site_pro" as PriceKey, label: "Pro", price: "$299", desc: "Up to 20 pages, e-commerce, blog, booking" },
                { key: "site_elite" as PriceKey, label: "Elite", price: "$499", desc: "Unlimited pages, custom app features, API integrations" },
              ].map(({ key, label, price, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="font-semibold">{label} — {price}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  <button
                    onClick={() => checkout(key)}
                    disabled={loading === key}
                    className="ml-4 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 text-sm font-semibold hover:bg-purple-500/30 transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {loading === key ? "…" : "Buy"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Nia AI Receptionist */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">🤖</span>
              <div>
                <h3 className="text-xl font-bold">Nia AI Receptionist</h3>
                <p className="text-sm text-gray-400">Credit-based, buy more anytime</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <div>
                  <p className="font-semibold">Setup + 100 Credits — $49</p>
                  <p className="text-xs text-gray-400">One-time setup fee, includes 100 starter credits</p>
                </div>
                <button
                  onClick={() => checkout("nia_setup")}
                  disabled={loading === "nia_setup"}
                  className="ml-4 px-4 py-2 rounded-lg bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 transition disabled:opacity-50 whitespace-nowrap"
                >
                  {loading === "nia_setup" ? "…" : "Start"}
                </button>
              </div>
              {[
                { key: "nia_credits_500" as PriceKey, label: "500 Credits", price: "$29", desc: "~500 minutes of call handling" },
                { key: "nia_credits_1500" as PriceKey, label: "1,500 Credits", price: "$79", desc: "~1,500 minutes — best value" },
                { key: "nia_credits_5000" as PriceKey, label: "5,000 Credits", price: "$199", desc: "~5,000 minutes, volume pricing" },
              ].map(({ key, label, price, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="font-semibold">{label} — {price}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                  <button
                    onClick={() => checkout(key)}
                    disabled={loading === key}
                    className="ml-4 px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 text-sm font-semibold hover:bg-purple-500/30 transition disabled:opacity-50 whitespace-nowrap"
                  >
                    {loading === key ? "…" : "Buy"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Business Formation */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">🏢</span>
              <div>
                <h3 className="text-xl font-bold">Business Formation Services</h3>
                <p className="text-sm text-gray-400">
                  We handle the paperwork — LLC, EIN, state registration
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { key: "biz_registration" as PriceKey, label: "State Registration", price: "$149", desc: "File your LLC/Corp in your state" },
                { key: "biz_ein" as PriceKey, label: "EIN Filing", price: "$79", desc: "Get your federal EIN number" },
                { key: "biz_bundle" as PriceKey, label: "Full Bundle", price: "$199", desc: "Registration + EIN + Operating Agreement" },
                { key: "biz_registered_agent" as PriceKey, label: "Registered Agent", price: "$99/yr", desc: "Annual registered agent service" },
              ].map(({ key, label, price, desc }) => (
                <div key={key} className="flex flex-col p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="font-semibold mb-1">{label}</p>
                  <p className="text-2xl font-bold text-purple-300 mb-1">{price}</p>
                  <p className="text-xs text-gray-400 mb-4 flex-1">{desc}</p>
                  <button
                    onClick={() => checkout(key)}
                    disabled={loading === key}
                    className="w-full py-2 rounded-lg bg-purple-500/20 text-purple-300 text-sm font-semibold hover:bg-purple-500/30 transition disabled:opacity-50"
                  >
                    {loading === key ? "…" : "Order"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ / Note */}
      <section className="max-w-3xl mx-auto px-4 pb-24 text-center">
        <p className="text-gray-500 text-sm">
          All payments are processed securely through Stripe. Subscriptions renew monthly and can
          be cancelled anytime. Add-ons are one-time purchases. Questions?{" "}
          <a href="mailto:support@crewwos.com" className="text-purple-400 hover:underline">
            Contact us
          </a>
        </p>
      </section>
    </main>
  );
}

