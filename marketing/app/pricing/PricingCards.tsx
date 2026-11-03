'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowIcon } from '../WhatsAppLink';

type Plan = {
  name: string;
  monthly: number | null;
  intro?: number;
  summary: string;
  features: string[];
  cta: string;
  emphasis?: 'popular' | 'premium';
};

const plans: Plan[] = [
  { name: 'Pace Core', monthly: 79, intro: 39, summary: 'For venues that want daily operations in one place.', features: ['Bookings and table assignments', 'Venue and kitchen hours', 'Menus, dishes and availability'], cta: 'Book a demo' },
  { name: 'Pace Growth', monthly: 139, intro: 69, summary: 'For venues turning customers into regulars.', features: ['Everything in Core', 'Customer management and CRM', 'Loyalty points and rewards', 'QR redemption and reward history'], cta: 'Book a demo', emphasis: 'popular' },
  { name: 'Pace Complete', monthly: 199, intro: 99, summary: 'The complete experience for your team and guests.', features: ['Everything in Growth', 'Customer-facing Pace mobile app', 'Mobile bookings, menus and order ahead', 'In-app loyalty and rewards'], cta: 'Book a demo', emphasis: 'premium' },
  { name: 'Pace Group', monthly: null, summary: 'For multi-site operators and larger hospitality businesses.', features: ['Central management across venues', 'Multi-site rollout and permissions', 'Bespoke onboarding and support', 'White-label requirements considered'], cta: 'Plan a rollout' },
];

const money = (value: number) => `£${value.toLocaleString('en-GB')}`;

export default function PricingCards() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  return <section className="pricing-section" aria-label="Pace pricing plans">
    <div className="billing-toggle" role="group" aria-label="Choose billing frequency">
      <button type="button" className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')}>Monthly</button>
      <button type="button" className={billing === 'annual' ? 'active' : ''} onClick={() => setBilling('annual')}>Annual <span>1 month free</span></button>
    </div>
    <p className="billing-explainer">{billing === 'monthly'
      ? 'Introductory prices apply for your first 3 months. Standard monthly pricing starts in month 4.'
      : 'Your first year includes 3 introductory-price months and 1 month free. Renewals include 1 month free each year.'}</p>
    <div className="pricing-grid">{plans.map(plan => {
      const isCustom = plan.monthly === null;
      const monthly = plan.monthly ?? 0;
      const intro = plan.intro ?? 0;
      const annualFirstYear = 8 * monthly + 3 * intro;
      const annualRenewal = 11 * monthly;
      return <article key={plan.name} className={plan.emphasis ? `pricing-${plan.emphasis}` : undefined}>
        <div className="pricing-card-heading"><span className="pricing-label">{plan.name}</span>{plan.emphasis === 'popular' && <span className="pricing-badge">Most Popular</span>}</div>
        {isCustom ? <p className="pricing-price">Custom</p> : billing === 'monthly'
          ? <p className="pricing-price">{money(monthly)}<small>/ month</small></p>
          : <p className="pricing-price">{money(annualFirstYear)}<small>/ first year</small></p>}
        <p className="pricing-cadence">{isCustom ? 'Tailored to your group' : billing === 'monthly' ? 'per venue, excluding VAT' : `${money(annualRenewal)} per year from year 2`}</p>
        {!isCustom && <p className="pricing-promo">{billing === 'monthly' ? `${money(intro)}/month for your first 3 months` : '3 introductory months + 1 month free'}</p>}
        <h2>{plan.summary}</h2>
        <ul>{plan.features.map(feature => <li key={feature}><span aria-hidden="true">✓</span>{feature}</li>)}</ul>
        <Link className="button" href="/contact?enquiry=demo">{plan.cta} <span><ArrowIcon/></span></Link>
      </article>;
    })}</div>
    <p className="annual-detail">Prices exclude VAT. The first annual payment covers 8 months at the standard monthly rate, 3 at the introductory rate and 1 free month. Annual renewal is 11 standard-rate months for 12 months of access. Setup, onboarding and third-party services may be quoted separately.</p>
  </section>;
}
