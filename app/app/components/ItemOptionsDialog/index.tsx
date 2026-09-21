'use client';

import {useState} from 'react';
import {Icon} from '../Icon';
import styles from './styles.module.css';

export type ItemOption = string | {label: string; priceDeltaPence?: number | null};
export type ItemOptionSet = {groups: {label: string; minSelections: number; maxSelections: number; options: ItemOption[]}[]};
export type ItemOptionResult = {name: string; description: string; priceDelta: number};
const optionLabel = (option: ItemOption) => typeof option === 'string' ? option : option.label;
const optionPriceDelta = (option: ItemOption) => typeof option === 'string' ? 0 : (option.priceDeltaPence ?? 0) / 100;
const priceDeltaLabel = (option: ItemOption) => {
    const delta = optionPriceDelta(option);
    return delta ? `${delta > 0 ? '+' : '-'}£${Math.abs(delta).toFixed(2)}` : '';
};

export function ItemOptionsDialog({itemName, optionSet, onClose, onAdd}: {itemName: string; optionSet: ItemOptionSet; onClose: () => void; onAdd: (item: ItemOptionResult) => void}) {
    const [choices, setChoices] = useState<Record<string, string[]>>({});
    const select = (group: ItemOptionSet['groups'][number], option: ItemOption) => setChoices(current => {
        const label = optionLabel(option);
        const selected = current[group.label] ?? [];
        if (selected.includes(label)) return {...current, [group.label]: selected.filter(value => value !== label)};
        const next = group.maxSelections === 1 ? [label] : selected.length >= group.maxSelections ? selected : [...selected, label];
        return {...current, [group.label]: next};
    });
    const selectedCount = (group: ItemOptionSet['groups'][number]) => (choices[group.label] ?? []).length;
    const isReady = optionSet.groups.every(group => selectedCount(group) >= group.minSelections && selectedCount(group) <= group.maxSelections);
    const selectionSummary = optionSet.groups.flatMap(group => choices[group.label] ?? []);
    const selectedOptions = optionSet.groups.flatMap(group => group.options.filter(option => (choices[group.label] ?? []).includes(optionLabel(option))));
    const priceDelta = selectedOptions.reduce((total, option) => total + optionPriceDelta(option), 0);
    return <div className={styles.root} role="dialog" aria-modal="true" aria-label={`Customise ${itemName}`}>
        <section className={styles.sheet}>
            <button className={styles.close} type="button" onClick={onClose} aria-label="Close options"><Icon name="fa-xmark"/></button>
            <p className="eyebrow">Order ahead</p><h2>Make it<br/>your way.</h2><p className={styles.intro}>{itemName}</p>
            <div className={styles.groups}>{optionSet.groups.map(group => <section key={group.label}>
                <h3>{group.label}<small>{selectedCount(group)} / {group.maxSelections} selected</small></h3>
                <div>{group.options.map(option => {const label = optionLabel(option); const selected = (choices[group.label] ?? []).includes(label); const atLimit = selectedCount(group) >= group.maxSelections && !selected; return <button key={label} type="button" disabled={atLimit} className={selected ? styles.selected : ''} onClick={() => select(group, option)}><span>{label}<small>{priceDeltaLabel(option)}</small></span>{selected && <Icon name="fa-check"/>}</button>;})}</div>
            </section>)}</div>
            <button type="button" className={styles.add} disabled={!isReady} onClick={() => onAdd({name: `${itemName} · ${selectionSummary.join(' · ')}`, description: selectionSummary.join(' · '), priceDelta})}>Add to order <Icon name="fa-arrow-right"/></button>
        </section>
    </div>;
}
