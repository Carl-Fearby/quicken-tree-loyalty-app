'use client';
import JsBarcode from 'jsbarcode';
import { useEffect, useRef } from 'react';
import styles from './styles.module.css';
import { Icon } from '../Icon';
import {designTokens} from '../../designTokens';
export type Redemption = { title: string; code: string };
export function RedemptionPass({ redemption, closing, onClose }: { redemption: Redemption; closing: boolean; onClose: () => void }) { const barcode = useRef<SVGSVGElement>(null); useEffect(() => { if (barcode.current) JsBarcode(barcode.current, redemption.code, { format: 'CODE128', displayValue: false, width: 1.45, height: 58, margin: 0, background: designTokens.barcodeSurface, lineColor: designTokens.barcodeInk }); }, [redemption.code]); return <div className={`${styles.root} redeemOverlay${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-label="Reward redemption"><section className="redeemPass"><button className="closeRedeem" onClick={onClose} aria-label="Close redemption pass"><Icon name="fa-xmark" /></button><p className="eyebrow">Reward ready</p><h2>{redemption.title}</h2><p className="redeemIntro">Show this barcode to your server to redeem your reward.</p><div className="barcode"><svg ref={barcode} aria-label={`Barcode for ${redemption.code}`} /></div><small>Redemption key</small><strong>{redemption.code}</strong><p className="redeemFine">One-time use · Valid for this visit</p><button className="cta" onClick={onClose}>Done</button></section></div>; }
