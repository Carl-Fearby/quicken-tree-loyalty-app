'use client';

import {useState} from 'react';
import {Icon} from '../Icon';
import styles from './styles.module.css';

export type ItemOptionSet = {groups: {label: string; minSelections: number; maxSelections: number; options: string[]}[]};

export function ItemOptionsDialog({itemName, optionSet, onClose, onAdd}: {itemName: string; optionSet: ItemOptionSet; onClose: () => void; onAdd: (item: string) => void}) {
    const [choices, setChoices] = useState<Record<string, string[]>>({});
    const select = (group: ItemOptionSet['groups'][number], option: string) => setChoices(current => {
        const selected = current[group.label] ?? [];
        if (selected.includes(option)) return {...current, [group.label]: selected.filter(value => value !== option)};
        const next = group.maxSelections === 1 ? [option] : selected.length >= group.maxSelections ? selected : [...selected, option];
        return {...current, [group.label]: next};
    });
    const selectedCount = (group: ItemOptionSet['groups'][number]) => (choices[group.label] ?? []).length;
    const isReady = optionSet.groups.every(group => selectedCount(group) >= group.minSelections && selectedCount(group) <= group.maxSelections);
    const selectionSummary = optionSet.groups.flatMap(group => choices[group.label] ?? []);
    return <div className={styles.root} role="dialog" aria-modal="true" aria-label={`Customise ${itemName}`}>
        <section className={styles.sheet}>
            <button className={styles.close} type="button" onClick={onClose} aria-label="Close options"><Icon name="fa-xmark"/></button>
            <p className="eyebrow">Order ahead</p><h2>Make it<br/>your way.</h2><p className={styles.intro}>{itemName}</p>
            <div className={styles.groups}>{optionSet.groups.map(group => <section key={group.label}>
                <h3>{group.label}<small>{selectedCount(group)} / {group.maxSelections} selected</small></h3>
                <div>{group.options.map(option => {const selected = (choices[group.label] ?? []).includes(option); const atLimit = selectedCount(group) >= group.maxSelections && !selected; return <button key={option} type="button" disabled={atLimit} className={selected ? styles.selected : ''} onClick={() => select(group, option)}><span>{option}</span>{selected && <Icon name="fa-check"/>}</button>;})}</div>
            </section>)}</div>
            <button type="button" className={styles.add} disabled={!isReady} onClick={() => onAdd(`${itemName} · ${selectionSummary.join(' · ')}`)}>Add to order <Icon name="fa-arrow-right"/></button>
        </section>
    </div>;
}
