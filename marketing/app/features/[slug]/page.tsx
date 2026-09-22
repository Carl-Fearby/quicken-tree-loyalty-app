import Link from 'next/link';
import { notFound } from 'next/navigation';
import { features } from '../../../lib/features';
import { metadata, jsonLd, siteUrl } from '../../../lib/seo';
import { SiteFooter, SiteHeader } from '../../SiteChrome';
import { ArrowIcon } from '../../WhatsAppLink';
export const dynamicParams = false;
export function generateStaticParams() { return features.map(({slug}) => ({slug})); }
export async function generateMetadata({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params; const feature=features.find(f=>f.slug===slug); if(!feature) notFound();
  return metadata(`${feature.title} | Pace`, feature.description, `/features/${slug}`);
}
export default async function FeaturePage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params; const feature=features.find(f=>f.slug===slug); if(!feature) notFound();
  return <><SiteHeader/><main tabIndex={-1} id="main" className="wrap seo-feature"><nav aria-label="Breadcrumb"><Link href="/">Home</Link><span> / {feature.title}</span></nav><p className="eyebrow">PACE HOSPITALITY SOFTWARE</p><h1>{feature.heading}</h1><p className="intro">{feature.intro}</p><div className="seo-sections">{feature.sections.map(([heading,copy])=><section key={heading}><h2>{heading}</h2><p>{copy}</p></section>)}</div>{slug==='restaurant-menu-management'&&<section className="menu-product-screens" aria-labelledby="menu-product-screens-title"><div><p className="eyebrow">INSIDE THE BACK OFFICE</p><h2 id="menu-product-screens-title">The menu, maintained in one place.</h2><p>Give the team a clear catalogue view and one shared set of dietary and allergen definitions.</p></div><div className="menu-product-screen-grid">{[['menu-manager.png','Manage the full catalogue','Search across dishes, move between menus and update prices, options or availability from one operational view.'],['menu-symbols.png','Keep menu symbols consistent','Maintain the dietary and allergen labels, colours and icons used throughout the menu experience.']].map(([image,title,copy])=><figure key={image}><a href={`/back-office-screens/${image}`} target="_blank" rel="noreferrer" aria-label={`View full-size screenshot: ${title}`}><img src={`/back-office-screens/${image}`} alt={`${title} in the Pace back office`} loading="lazy"/></a><figcaption><b>{title}</b><span>{copy}</span></figcaption></figure>)}</div></section>}<aside><h2>Connect the rest of your service</h2><ul>{features.filter(f=>f.slug!==slug).map(f=><li key={f.slug}><Link href={`/features/${f.slug}`}>{f.title} <ArrowIcon direction="right"/></Link></li>)}</ul><Link className="button" href="/platform">See the Pace platform <ArrowIcon/></Link></aside></main><SiteFooter/>{siteUrl && <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:siteUrl},{'@type':'ListItem',position:2,name:feature.title,item:`${siteUrl}/features/${slug}`}]})}}/>}</>;
}
