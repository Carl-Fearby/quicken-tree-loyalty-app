import Link from 'next/link';
import { notFound } from 'next/navigation';
import { features } from '../../../lib/features';
import { metadata, jsonLd, siteUrl } from '../../../lib/seo';
import { SiteFooter, SiteHeader } from '../../SiteChrome';
export const dynamicParams = false;
export function generateStaticParams() { return features.map(({slug}) => ({slug})); }
export async function generateMetadata({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params; const feature=features.find(f=>f.slug===slug); if(!feature) notFound();
  return metadata(`${feature.title} | Pace`, feature.description, `/features/${slug}`);
}
export default async function FeaturePage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params; const feature=features.find(f=>f.slug===slug); if(!feature) notFound();
  return <><SiteHeader/><main className="wrap seo-feature"><nav aria-label="Breadcrumb"><Link href="/">Home</Link><span> / {feature.title}</span></nav><p className="eyebrow">PACE HOSPITALITY SOFTWARE</p><h1>{feature.heading}</h1><p className="intro">{feature.intro}</p><div className="seo-sections">{feature.sections.map(([heading,copy])=><section key={heading}><h2>{heading}</h2><p>{copy}</p></section>)}</div><aside><h2>Connect the rest of your service</h2><ul>{features.filter(f=>f.slug!==slug).map(f=><li key={f.slug}><Link href={`/features/${f.slug}`}>{f.title} →</Link></li>)}</ul><Link className="button" href="/platform">See the Pace platform ↗</Link></aside></main><SiteFooter/>{siteUrl && <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:siteUrl},{'@type':'ListItem',position:2,name:feature.title,item:`${siteUrl}/features/${slug}`}]})}}/>}</>;
}
