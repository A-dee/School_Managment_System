'use client';

import Link from 'next/link';
import { useState } from 'react';
import PricingToggle from '@/components/pricing/PricingToggle';
import PricingCard, { PricingPlan } from '@/components/pricing/PricingCard';

const SCHOOL = {
  name: 'Hope Hills Academy',
  tagline: 'Creche · Nursery · Primary',
  email: 'hopehillsacademy@gmail.com',
  phone: '08065598994',
};

const inquiryHref = (plan: string) =>
  `mailto:${SCHOOL.email}?subject=${encodeURIComponent(`Hope Hills pricing inquiry - ${plan}`)}`;

const standardPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'For small schools getting started with core records.',
    price: 0,
    priceSuffix: '/ month',
    buttonText: 'Open portal',
    buttonHref: '/login',
    features: [
      { text: 'Core student management', icon: 'users' },
      { text: 'Limited staff accounts', icon: 'check' },
      { text: 'Basic report cards', icon: 'check' },
      { text: 'Community support', icon: 'check' },
    ],
    note: 'Best for a trial or a very small school office.',
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing schools that need parent and finance workflows.',
    price: 95000,
    priceSuffix: '/ month',
    buttonText: 'Ask about Pro',
    buttonHref: inquiryHref('Pro'),
    features: [
      { text: 'More student capacity', icon: 'check' },
      { text: 'Parent portal access', icon: 'users' },
      { text: 'Advanced financial reporting', icon: 'database' },
      { text: 'Customized report cards', icon: 'star' },
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'For schools that want a complete digital administration desk.',
    price: 240000,
    priceSuffix: '/ month',
    buttonText: 'Ask about Premium',
    buttonHref: inquiryHref('Premium'),
    isRecommended: true,
    features: [
      { text: 'Unlimited students and staff', icon: 'infinity' },
      { text: 'Automated payroll system', icon: 'check' },
      { text: 'Custom domain and branding', icon: 'star' },
      { text: 'Priority email and chat support', icon: 'zap' },
    ],
    note: 'Recommended for schools running daily operations through the portal.',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large schools and education groups with advanced controls.',
    price: 965000,
    priceSuffix: '/ month',
    buttonText: 'Talk to us',
    buttonHref: inquiryHref('Enterprise'),
    features: [
      { text: 'Multi-campus management', icon: 'database' },
      { text: 'Advanced security with SSO/MFA', icon: 'shield' },
      { text: 'Dedicated account manager', icon: 'users' },
      { text: 'Custom API integrations', icon: 'zap' },
    ],
  },
];

const multiCampusPlans: PricingPlan[] = [
  {
    id: 'campus-starter',
    name: 'Campus Starter',
    description: 'For one school branch preparing to expand.',
    price: 0,
    priceSuffix: '/ month',
    buttonText: 'Open portal',
    buttonHref: '/login',
    features: [
      { text: 'Single-campus administration', icon: 'database' },
      { text: 'Basic user roles and permissions', icon: 'shield' },
      { text: 'Student, staff, and fee records', icon: 'users' },
      { text: 'Email support', icon: 'check' },
    ],
  },
  {
    id: 'campus-group',
    name: 'Campus Group',
    description: 'For teams managing multiple school branches together.',
    price: 310000,
    priceSuffix: '/ admin / month',
    buttonText: 'Plan a rollout',
    buttonHref: inquiryHref('Campus Group'),
    isRecommended: true,
    features: [
      { text: 'All Premium features across branches', icon: 'check' },
      { text: 'Advanced role-based access control', icon: 'shield' },
      { text: 'Centralized billing and administration', icon: 'database' },
      { text: 'Usage analytics, budgeting, and spend controls', icon: 'star' },
      { text: 'Integration planning for existing tools', icon: 'zap' },
    ],
    note: 'For 2+ administration seats, with rollout support available.',
  },
];

export default function PricingPage() {
  const [mode, setMode] = useState<'personal' | 'business'>('personal');
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const displayedPlans = mode === 'personal' ? standardPlans : multiCampusPlans;
  const selectedPrice = selectedPlan
    ? `${typeof selectedPlan.price === 'number' ? `₦${selectedPlan.price.toLocaleString()}` : selectedPlan.price}${selectedPlan.priceSuffix ? ` ${selectedPlan.priceSuffix}` : ''}`
    : '';

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#eff6ff_0%,#f5f3ff_34%,#ecfdf5_68%,#fff7ed_100%)] px-4 py-5 text-[#0f172a] md:px-8">
      <nav className="mx-auto mb-10 flex max-w-[1180px] items-center justify-between rounded-lg border border-white/80 bg-white/72 px-4 py-3 shadow-sm backdrop-blur md:px-5">
        <Link href="/" className="flex min-w-0 items-center gap-3 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hope-hills-logo.png" alt={SCHOOL.name} className="h-10 w-10 rounded-md bg-white object-contain p-1 shadow-sm" />
          <div className="min-w-0">
            <div className="truncate text-sm font-extrabold text-[#1e293b] md:text-base">{SCHOOL.name}</div>
            <div className="text-[11px] font-semibold text-[#64748b]">{SCHOOL.tagline}</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/" className="hidden rounded-md px-3 py-2 text-sm font-bold text-[#475569] hover:bg-white md:inline-flex">
            Home
          </Link>
          <Link href="/login" className="rounded-md bg-[#2563eb] px-4 py-2 text-sm font-bold text-white hover:bg-[#1d4ed8]">
            Sign In
          </Link>
        </div>
      </nav>

      <section className="mx-auto max-w-[1180px] pb-16">
        <div className="mb-8 max-w-3xl">
          <p className="mb-3 inline-flex rounded-md border border-[#bfdbfe] bg-white/72 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.08em] text-[#2563eb]">
            Pricing
          </p>
          <h1 className="mb-4 text-[34px] font-black leading-tight tracking-normal text-[#0f172a] md:text-[52px]">
            Choose the school management setup that fits your operations.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-[#475569] md:text-lg">
            Start with the essentials, then move into parent portals, finance workflows, payroll, report cards, and multi-campus administration when the school is ready.
          </p>
        </div>

        <PricingToggle mode={mode} setMode={setMode} />

        <div className={`grid grid-cols-1 gap-5 md:grid-cols-2 ${
          mode === 'personal' ? 'xl:grid-cols-4' : 'mx-auto max-w-[820px]'
        }`}>
          {displayedPlans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} onSelect={setSelectedPlan} />
          ))}
        </div>

        <div className="mt-10 rounded-lg border border-white/80 bg-white/72 p-5 text-sm leading-6 text-[#475569] shadow-sm backdrop-blur md:flex md:items-center md:justify-between md:gap-6">
          <p>
            Need help selecting a plan? Call <a href={`tel:${SCHOOL.phone}`} className="font-bold text-[#059669]">{SCHOOL.phone}</a> or email{' '}
            <a href={`mailto:${SCHOOL.email}`} className="font-bold text-[#2563eb]">{SCHOOL.email}</a>.
          </p>
          <Link href="/login" className="mt-4 inline-flex rounded-md border border-[#cbd5e1] bg-white px-4 py-2 font-bold text-[#1e293b] hover:bg-[#f8fafc] md:mt-0">
            Use existing account
          </Link>
        </div>
      </section>

      {selectedPlan && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-[#0f172a]/45 px-4 py-4 backdrop-blur-sm md:items-center">
          <div role="dialog" aria-modal="true" aria-labelledby="selected-plan-title" className="w-full max-w-[560px] rounded-lg border border-white/80 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.28)] md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 inline-flex rounded-md bg-[#dbeafe] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#1d4ed8]">
                  Selected plan
                </p>
                <h2 id="selected-plan-title" className="text-[26px] font-black leading-tight text-[#0f172a]">
                  {selectedPlan.name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#64748b]">{selectedPlan.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                aria-label="Close selected plan"
                className="rounded-md border border-[#cbd5e1] px-3 py-2 text-sm font-black text-[#475569] hover:bg-[#f8fafc]"
              >
                X
              </button>
            </div>

            <div className="mb-5 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4">
              <div className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#64748b]">Plan cost</div>
              <div className="mt-1 text-[28px] font-black text-[#0f172a]">{selectedPrice}</div>
              {selectedPlan.note && <p className="mt-2 text-sm leading-6 text-[#64748b]">{selectedPlan.note}</p>}
            </div>

            <div className="mb-6">
              <div className="mb-3 text-sm font-extrabold text-[#0f172a]">Included in this plan</div>
              <ul className="grid gap-2 text-sm leading-6 text-[#334155] md:grid-cols-2">
                {selectedPlan.features.map((feature) => (
                  <li key={feature.text} className="rounded-md border border-[#e2e8f0] bg-white px-3 py-2">
                    {feature.text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Link href="/login" className="inline-flex justify-center rounded-md bg-[#2563eb] px-4 py-3 text-sm font-extrabold text-white hover:bg-[#1d4ed8]">
                Continue to portal
              </Link>
              <a href={inquiryHref(selectedPlan.name)} className="inline-flex justify-center rounded-md border border-[#cbd5e1] bg-white px-4 py-3 text-sm font-extrabold text-[#1e293b] hover:bg-[#f8fafc]">
                Email school
              </a>
              <a href={`tel:${SCHOOL.phone}`} className="inline-flex justify-center rounded-md border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-extrabold text-[#047857] hover:bg-[#dcfce7]">
                Call now
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
