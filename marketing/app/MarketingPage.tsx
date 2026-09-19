import { SiteFooter, SiteHeader } from './SiteChrome';
import { WhatsAppArrow, whatsappUrl } from './WhatsAppLink';

export function MarketingPage({eyebrow,title,intro,children,cta='/contact'}:{eyebrow:string;title:React.ReactNode;intro:string;children:React.ReactNode;cta?:string}) {
  return <><SiteHeader/><main className="subpage marketing-page wrap"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="subpage-intro">{intro}</p>{children}<div className="subpage-callout"><h2>Ready to make service feel more in sync?</h2><p>Tell us how your venue works and we’ll help you find a practical next step.</p><a className="button" href={whatsappUrl} target="_blank" rel="noreferrer">Talk to Pace <WhatsAppArrow/></a></div></main><SiteFooter/></>;
}
