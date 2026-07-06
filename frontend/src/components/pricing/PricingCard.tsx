'use client';

import { Check, Star, Zap, Infinity as InfinityIcon, Shield, Database, Users } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

export interface PlanFeature {
  text: string;
  icon?: 'check' | 'star' | 'zap' | 'infinity' | 'shield' | 'database' | 'users';
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: string | number;
  priceSuffix?: string;
  features: PlanFeature[];
  buttonText: string;
  buttonHref: string;
  isRecommended?: boolean;
  isPopular?: boolean;
  note?: string;
}

interface PricingCardProps {
  plan: PricingPlan;
  onSelect?: (plan: PricingPlan) => void;
}

export default function PricingCard({ plan, onSelect }: PricingCardProps) {
  const isRecommended = plan.isRecommended;
  const buttonHref = plan.buttonHref || '/login';
  const isExternal = buttonHref.startsWith('mailto:') || buttonHref.startsWith('tel:') || buttonHref.startsWith('http');

  const renderIcon = (iconName: string = 'check') => {
    const props = { className: "w-[18px] h-[18px] flex-shrink-0 mt-[2px]" };
    switch (iconName) {
      case 'star': return <Star {...props} />;
      case 'zap': return <Zap {...props} />;
      case 'infinity': return <InfinityIcon {...props} />;
      case 'shield': return <Shield {...props} />;
      case 'database': return <Database {...props} />;
      case 'users': return <Users {...props} />;
      case 'check':
      default:
        return <Check {...props} />;
    }
  };

  const buttonClass = `w-full inline-flex items-center justify-center rounded-md px-4 py-3 text-sm font-bold transition-colors ${
    isRecommended
      ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]'
      : 'border border-[#cbd5e1] bg-white text-[#1e293b] hover:bg-[#f8fafc]'
  }`;

  return (
    <div className={`relative flex h-full min-h-[520px] w-full flex-col rounded-lg border bg-white/82 px-5 py-6 shadow-sm backdrop-blur transition-colors md:px-6 ${
      isRecommended ? 'border-[#2563eb] shadow-[0_16px_48px_rgba(37,99,235,0.16)]' : 'border-white/80 hover:border-[#cbd5e1]'
    }`}>
      {isRecommended && (
        <div className="absolute right-5 top-5">
          <span className="rounded-md bg-[#dbeafe] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#1d4ed8]">
            Recommended
          </span>
        </div>
      )}

      <div className="mb-5 pr-24">
        <h3 className="mb-2 text-[24px] font-extrabold text-[#0f172a]">{plan.name}</h3>
        <p className="text-[14px] leading-6 text-[#64748b]">{plan.description}</p>
      </div>

      <div className="mb-5 flex flex-wrap items-baseline gap-x-2 text-[#0f172a]">
        <span className="break-words text-[34px] font-extrabold leading-none tracking-normal md:text-[40px]">
          {typeof plan.price === 'number' ? `₦${plan.price.toLocaleString()}` : plan.price}
        </span>
        {plan.priceSuffix && (
          <span className="whitespace-nowrap text-[14px] font-semibold text-[#64748b]">{plan.priceSuffix}</span>
        )}
      </div>

      {onSelect ? (
        <button type="button" onClick={() => onSelect(plan)} className={`${buttonClass} mb-7`}>
          {plan.buttonText}
        </button>
      ) : isExternal ? (
        <a href={buttonHref} className={`${buttonClass} mb-7`}>
          {plan.buttonText}
        </a>
      ) : (
        <Link href={buttonHref} className={`${buttonClass} mb-7`}>
          {plan.buttonText}
        </Link>
      )}

      <div className="flex-1">
        <ul className="space-y-3">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className={isRecommended ? 'text-[#2563eb]' : 'text-[#059669]'}>
                {renderIcon(feature.icon)}
              </div>
              <span className="text-[14px] leading-6 text-[#334155]">{feature.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {plan.note && (
        <p className="mt-6 border-t border-[#e2e8f0] pt-4 text-[12px] leading-5 text-[#64748b]">
          {plan.note}
        </p>
      )}
    </div>
  );
}
