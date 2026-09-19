import Link from 'next/link';
import { MarketingPage } from './MarketingPage';
import { ArrowIcon } from './WhatsAppLink';

export function AdvicePage({eyebrow, title, intro, sections, children, cta = '/contact'}: {eyebrow: string; title: React.ReactNode; intro: string; sections?: {title: string; copy: string}[]; children?: React.ReactNode; cta?: string}) {
  return <MarketingPage eyebrow={eyebrow} title={title} intro={intro} cta={cta}>
    {sections && <div className="resource-grid">{sections.map(section => <article key={section.title}><h2>{section.title}</h2><p>{section.copy}</p></article>)}</div>}
    {children}
  </MarketingPage>;
}

export function AdviceLinks({links}: {links: {label: string; href: string}[]}) {
  return <div className="resource-callout"><p className="eyebrow">KEEP EXPLORING</p><div className="resource-grid">{links.map(link => <article key={link.href}><h2>{link.label}</h2><Link href={link.href}>Explore this page <ArrowIcon/></Link></article>)}</div></div>;
}
