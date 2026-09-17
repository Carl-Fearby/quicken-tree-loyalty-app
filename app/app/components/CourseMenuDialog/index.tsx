'use client';

import {useMemo, useState} from 'react';
import {Icon} from '../Icon';
import styles from './styles.module.css';

type MenuSection = {title: string; items: ReadonlyArray<readonly [string, string, string]>};
export type CourseOffer = {heading: string; description: string; options: {label: string; courses: number; pricePence: number}[]; courses: {section: string; minSelections: number; maxSelections: number}[]};

export function CourseMenuDialog({offer, sections, outOfStockItems, onClose, onAdd}: {offer: CourseOffer; sections: MenuSection[]; outOfStockItems: Set<string>; onClose: () => void; onAdd: (line: {name: string; description: string; price: number}) => void}) {
    const [optionIndex, setOptionIndex] = useState(0);
    const [choices, setChoices] = useState<Record<string, string>>({});
    const option = offer.options[optionIndex];
    const selectableSections = useMemo(() => offer.courses.map(rule => ({rule, section: sections.find(section => section.title === rule.section)})).filter((entry): entry is {rule: CourseOffer['courses'][number]; section: MenuSection} => Boolean(entry.section)), [offer.courses, sections]);
    const selectedCount = Object.keys(choices).length;
    const choose = (section: string, item: string) => setChoices(current => current[section] === item ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== section)) : {...current, [section]: item});
    const changeOption = (index: number) => {
        const next = offer.options[index];
        setOptionIndex(index);
        setChoices(current => Object.fromEntries(Object.entries(current).slice(0, next.courses)));
    };
    const ready = selectedCount === option.courses && selectableSections.every(({rule}) => (choices[rule.section] ? 1 : 0) >= rule.minSelections);
    const add = () => {
        if (!ready) return;
        const dishes = Object.values(choices);
        onAdd({name: `${offer.heading} · ${dishes.join(' · ')}`, description: `${option.label} · ${dishes.join(' · ')}`, price: option.pricePence / 100});
    };
    return <div className={styles.root} role="dialog" aria-modal="true" aria-label={`Build ${offer.heading}`}><section className={styles.sheet}><button className={styles.close} type="button" onClick={onClose} aria-label="Close course menu"><Icon name="fa-xmark"/></button><p className="eyebrow">Order ahead</p><h2>Build your<br/>{offer.heading}.</h2><p className={styles.intro}>{offer.description}</p><div className={styles.offers}>{offer.options.map((entry, index) => <button type="button" key={entry.label} className={index === optionIndex ? styles.selected : ''} onClick={() => changeOption(index)}><span>{entry.label}</span><b>£{(entry.pricePence / 100).toFixed(0)}</b></button>)}</div><p className={styles.progress}>{selectedCount} of {option.courses} course{option.courses === 1 ? '' : 's'} selected</p><div className={styles.sections}>{selectableSections.map(({rule, section}) => <section key={rule.section}><h3>{section.title}<small>{choices[rule.section] ? 'Selected' : rule.minSelections ? 'Required' : 'Choose up to one'}</small></h3><div>{section.items.map(([name, description]) => {const unavailable = outOfStockItems.has(name); const selected = choices[rule.section] === name; const limitReached = selectedCount >= option.courses && !selected; return <button key={name} type="button" disabled={unavailable || limitReached} className={selected ? styles.itemSelected : ''} onClick={() => choose(rule.section, name)}><span><b>{name}</b><small>{unavailable ? 'Out of stock' : description}</small></span>{selected && <Icon name="fa-check"/>}</button>;})}</div></section>)}</div><button type="button" className={styles.add} disabled={!ready} onClick={add}>Add {option.label} · £{(option.pricePence / 100).toFixed(0)} <Icon name="fa-arrow-right"/></button></section></div>;
}
