import type {CSSProperties} from 'react';
import styles from './styles.module.css';
import {Icon} from '../../Icon';
import type {ItemOption, ItemOptionSet} from '../../ItemOptionsDialog';

type MenuSection = { title: string; items: ReadonlyArray<readonly [string, string, string]> };
type MenuCategory = { label: string; service: string; sections: MenuSection[] };
type CourseOffer = {heading: string; description: string; options: {label: string; courses: number; pricePence: number}[]; courses: {section: string; minSelections: number; maxSelections: number}[]};
type AllergenTagStyle = {color: string; icon: string};
type Props = {categories: MenuCategory[]; selectedCategory: string; onCategoryChange: (category: string) => void; search: string; onSearchChange: (value: string) => void; sections: MenuSection[]; dietaryTags: Record<string, string[]>; dietaryTagNames: Record<string, string>; dishImages: Record<string, string>; allergenTags?: Record<string, string[]>; allergenTagNames?: Record<string, string>; allergenTagStyles?: Record<string, AllergenTagStyle>; outOfStockItems: Set<string>; courseOffer?: CourseOffer; onBuildCourseMenu: () => void; itemOptions: Record<string, ItemOptionSet>; onPromptItemOptions: (item: string) => void; orderAheadBooking: {guests: string; time: string} | null; serviceLabel?: string; onAdd: (name: string) => void; onBook: () => void};
const optionDeltaPence = (option: ItemOption) => typeof option === 'string' ? 0 : option.priceDeltaPence ?? 0;
const pricePence = (price: string) => Math.round(Number(price.match(/£([\d.]+)/)?.[1] ?? 0) * 100);
const priceLabel = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const priceRangeLabel = (basePrice: string, optionSet?: ItemOptionSet) => {
  if (!optionSet) return basePrice;
  const basePence = pricePence(basePrice);
  const [minDelta, maxDelta] = optionSet.groups.reduce(([minTotal, maxTotal], group) => {
    const deltas = group.options.map(optionDeltaPence).sort((a, b) => a - b);
    const minCount = Math.max(0, Math.min(group.minSelections, deltas.length));
    const maxCount = Math.max(minCount, Math.min(group.maxSelections, deltas.length));
    const min = deltas.slice(0, minCount).reduce((total, value) => total + value, 0);
    const max = deltas.slice(-maxCount).reduce((total, value) => total + value, 0);
    return [minTotal + min, maxTotal + max];
  }, [0, 0]);
  return minDelta === maxDelta ? basePrice : `${priceLabel(basePence + minDelta)} - ${priceLabel(basePence + maxDelta)}`;
};

export function MenuScreen({categories, selectedCategory, onCategoryChange, search, onSearchChange, sections, dietaryTags, dietaryTagNames, dishImages, allergenTags = {}, allergenTagNames = {}, allergenTagStyles = {}, outOfStockItems, courseOffer, onBuildCourseMenu, itemOptions, onPromptItemOptions, orderAheadBooking, serviceLabel, onAdd, onBook}: Props) {
  const addItem = (name: string) => itemOptions[name] ? onPromptItemOptions(name) : onAdd(name);
  const isSearching = Boolean(search.trim());
  return <div className={styles.root}><p className="eyebrow">The Quicken Tree menu</p><h1>Good food,<br/>all day long.</h1>{orderAheadBooking && <p className="preOrderBanner"><Icon name="fa-utensils"/> Ordering ahead for {orderAheadBooking.guests} at {orderAheadBooking.time}{serviceLabel ? ` · ${serviceLabel}` : ''}</p>}<label className="menuSearch"><Icon name="fa-magnifying-glass"/><input value={search} onChange={event => onSearchChange(event.target.value)} placeholder="Search all menus"/></label><div className="menuTabs">{categories.map(category => <button key={category.label} className={selectedCategory === category.label ? 'selected' : ''} onClick={() => onCategoryChange(category.label)}>{category.label}</button>)}</div><p className="menuService">{isSearching ? 'Showing results from all menus' : categories.find(category => category.label === selectedCategory)?.service}</p>{courseOffer && <section className={styles.courseOffer} aria-label={courseOffer.heading}><div><p className="eyebrow">Set menu</p><h2>{courseOffer.heading}</h2><p>{courseOffer.description}</p></div><div className={styles.coursePrices}>{courseOffer.options.map(option => <span key={option.label}><b>£{(option.pricePence / 100).toFixed(0)}</b><small>{option.label}</small></span>)}</div>{orderAheadBooking && <button type="button" className={styles.buildCourse} onClick={onBuildCourseMenu}>Build your meal <Icon name="fa-arrow-right"/></button>}</section>}<p className="dietaryLegend">{(['V','VG','GF','VGO'] as const).map(tag => <span key={tag} title={dietaryTagNames[tag]}><em>{dietaryTagNames[tag]}</em></span>)}</p><div className="menuList">{sections.length ? sections.map(section => <section className="menuSection" key={section.title}><h2>{section.title}</h2>{section.items.map(([name,description,price]) => {const outOfStock = outOfStockItems.has(name); const displayPrice = priceRangeLabel(price, itemOptions[name]); return <article className={`menuItem${outOfStock ? ` ${styles.outOfStock}` : ''}`} key={name}>{dishImages[name] && <img className="menuDishImage" src={dishImages[name]} alt="" loading="lazy" />}<div><b>{name}</b>{dietaryTags[name] && <span className="dietaryTags">{dietaryTags[name].map(tag => <mark key={tag} title={dietaryTagNames[tag]}>{tag}</mark>)}</span>}{allergenTags[name] && <span className="dietaryTags allergenTags">{allergenTags[name].map(tag => {const tagStyle = allergenTagStyles[tag]; return <mark key={tag} title={allergenTagNames[tag]} style={{'--allergen-color': tagStyle?.color} as CSSProperties}>{tagStyle?.icon && <span><Icon name={tagStyle.icon}/></span>}<em>{tag}</em></mark>;})}</span>}<p>{description}</p></div><aside>{displayPrice && <strong>{displayPrice}</strong>}{outOfStock ? <em className={styles.unavailable}>Out of stock</em> : orderAheadBooking && !courseOffer && <button className="addToOrder" onClick={() => addItem(name)} aria-label={`Add ${name} to order`}>Add</button>}</aside></article>;})}</section>) : <p className="noMenuResults">No menu items match “{search}”.</p>}</div>{orderAheadBooking ? null : <button className="cta" onClick={onBook}>Book a table</button>}</div>;
}
