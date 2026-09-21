'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowIcon } from '../WhatsAppLink';

type Plan = {
  name: string;
  monthly: number | null;
  monthlyIntro?: number;
  annualIntro?: number;
  annualRenewal?: number;
  summary: string;
  features: string[];
  cta: string;
};

const plans: Plan[] = [
  { name: 'Pace core', monthly: 59, monthlyIntro: 29, annualIntro: 469, annualRenewal: 649, summary: 'For venues getting their daily operations into one place.', features: ['Booking diary and table assignments', 'Venue and kitchen hours', 'Menu sections, dishes and availability'], cta: 'Start a conversation' },
  { name: 'Pace growth', monthly: 99, monthlyIntro: 49, annualIntro: 789, annualRenewal: 899, summary: 'For teams ready to connect service planning with customer loyalty.', features: ['Everything in Pace core', 'Customer points and reward codes', 'Reward expiry and activity history'], cta: 'Talk through your needs' },
  { name: 'Pace group', monthly: null, summary: 'For growing hospitality businesses with more than one venue.', features: ['A rollout shaped around your venues', 'Shared operating standards', 'A plan for permissions, support and future integrations'], cta: 'Plan a rollout' },
];

const money = (value: number) => `£${value.toFixed(value % 1 ? 2 : 0)}`;

export default function PricingCards() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  return <section className="pricing-section" aria-label="Pace pricing plans">
    <div className="billing-toggle" role="group" aria-label="Choose billing frequency">
      <button type="button" className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')}>Monthly</button>
      <button type="button" className={billing === 'annual' ? 'active' : ''} onClick={() => setBilling('annual')}>Annual <span>1 month free</span></button>
    </div>
    <p className="billing-explainer">
      {billing === 'monthly'
        ? 'Introductory monthly pricing is 50% off for the first six months. Standard monthly pricing applies from month seven.'
        : 'Annual year one uses a rounded introductory price after 50% off your first 6 months. From year two, the standard annual renewal applies with 1 month free each year.'}
    </p>
    <div className="pricing-grid">{plans.map(plan => {
      const isCustom = !plan.monthly;
      const monthly = plan.monthly ?? 0;
      const monthlyIntro = plan.monthlyIntro ?? monthly / 2;
      const annualFirstYear = plan.annualIntro ?? monthly * 9;
      const annualRenewal = plan.annualRenewal ?? monthly * 11;
      return <article key={plan.name}>
        <span className="pricing-label">{plan.name}</span>
        {!isCustom && <span className="pricing-promo">{billing === 'monthly' ? '50% off for the first 6 months' : 'Introductory annual rate · 3 months equivalent free'}</span>}
        {isCustom ? <p className="pricing-price">Custom</p> : billing === 'monthly'
          ? <p className="pricing-price">{money(monthlyIntro)} <del>{money(monthly)}</del></p>
          : <p className="pricing-price">{money(annualFirstYear)} <small className="annual-total">first year</small></p>}
        <p className="pricing-cadence">{isCustom ? 'multi-venue pricing' : billing === 'monthly' ? 'per venue / month' : `${money(annualRenewal)} from year two · billed annually`}</p>
        <h2>{plan.summary}</h2>
        <ul>{plan.features.map(feature => <li key={feature}><span>✓</span>{feature}</li>)}</ul>
        <Link className="button" href="/contact">{plan.cta} <span><ArrowIcon/></span></Link>
      </article>;
    })}</div>
    <p className="annual-detail">Annual figures are shown before VAT. First-year prices are rounded commercial introductory rates reflecting 50% off your first 6 months. From the second annual payment onward, the standard renewal price applies with 1 month free each year (11 months paid for 12 months’ access). Setup, onboarding and third-party services may be quoted separately.</p>
  </section>;
}
