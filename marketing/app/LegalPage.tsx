import Link from 'next/link';
import { SiteFooter, SiteHeader } from './SiteChrome';

export function LegalPage({eyebrow, title, intro, sections}:{eyebrow:string;title:string;intro:string;sections:[string,string][]}) {
  return <><SiteHeader/><main className="subpage legal-page wrap"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="subpage-intro">{intro}</p><div className="legal-sections">{sections.map(([heading,copy])=><section key={heading}><h2>{heading}</h2><p>{copy}</p></section>)}</div><Link className="text-link" href="/">Back to Pace home <span>↗</span></Link></main><SiteFooter/></>;
}
