'use client';

import { type CSSProperties, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ModalShell } from '../booking-diary/modals/ModalShell';
import { Breadcrumbs } from '../ui/Breadcrumbs';

type Menu = { id: string; name: string; position: number };
type Category = { id: string; label: string; menuName: string; position: number };
type Section = { id: string; menuId: string; title: string; position: number };
type Item = {
  id: string;
  sectionId: string;
  name: string;
  description: string;
  priceLabel: string;
  position: number;
  imageData: string | null;
};
type ItemOption = { label: string; priceDeltaPence: number | null; priceDeltaInput?: string };
type ItemOptionGroup = {
  label: string;
  minSelections: number;
  maxSelections: number;
  options: ItemOption[];
};
type MenuData = {
  menus: Menu[];
  categories: Category[];
  sections: Section[];
  items: Item[];
  categorySections: { categoryId: string; sectionPosition: number }[];
  dietaryTags?: { itemName: string; tagCode: string; label?: string }[];
  dietaryTagDefinitions?: { code: string; label: string }[];
  allergenTags?: { itemName: string; code: string; label?: string; color?: string; icon?: string }[];
  allergenDefinitions?: { code: string; label: string; color?: string; icon?: string }[];
  unavailableItems?: { itemName: string }[];
  itemOptions?: { itemName: string; groups: ItemOptionGroup[] }[];
};
type ItemDraft = { name: string; description: string; priceLabel: string; imageData: string | null; dietaryTags: string[]; allergens: string[]; optionGroups: ItemOptionGroup[] };
const emptyItem: ItemDraft = { name: '', description: '', priceLabel: '', imageData: null, dietaryTags: [], allergens: [], optionGroups: [] };
const emptyGroup = (): ItemOptionGroup => ({
  label: '',
  minSelections: 1,
  maxSelections: 1,
  options: [{ label: '', priceDeltaPence: null }],
});
const optionPriceLabel = (pence: number | null) =>
  pence ? `${pence > 0 ? '+' : '-'}£${(Math.abs(pence) / 100).toFixed(2)}` : 'Included';
const allergenPresentation: Record<string, { color: string; icon: string }> = {
  g: { color: '#e4c45b', icon: 'fa-wheat-awn' },
  cr: { color: '#f38a31', icon: 'fa-shrimp' },
  e: { color: '#7ccfd0', icon: 'fa-egg' },
  f: { color: '#55bd80', icon: 'fa-fish' },
  p: { color: '#f47b2c', icon: 'fa-seedling' },
  s: { color: '#b975d3', icon: 'fa-leaf' },
  m: { color: '#82cfd2', icon: 'fa-bottle-water' },
  n: { color: '#d8585d', icon: 'fa-cookie-bite' },
  c: { color: '#82cfd2', icon: 'fa-carrot' },
  md: { color: '#d2a63a', icon: 'fa-bottle-droplet' },
  se: { color: '#f49a2d', icon: 'fa-jar-wheat' },
  sd: { color: '#82cfd2', icon: 'fa-bottle-droplet' },
  l: { color: '#83b75c', icon: 'fa-seedling' },
  mo: { color: '#d64d50', icon: 'fa-fan' },
};
const allergenBadgeStyle = (code: string, color?: string) =>
  ({
    '--badge-color': color ?? allergenPresentation[code.toLowerCase()]?.color ?? '#c44d4d',
  }) as CSSProperties;
const allergenIcon = (code: string, icon?: string) =>
  icon ?? allergenPresentation[code.toLowerCase()]?.icon ?? 'fa-circle-info';
const sanitizeMoneyInput = (value: string) => {
  const cleaned = value.replace(/[^\d.]/g, '');
  const [whole = '', ...decimalParts] = cleaned.split('.');
  const decimals = decimalParts.join('').slice(0, 2);
  return decimalParts.length ? `${whole}.${decimals}` : whole;
};
const moneyInputValue = (value: string) => {
  const match = value.match(/£?\s*(\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]).toFixed(2) : '';
};
const formatPriceLabel = (value: string) => {
  const clean = sanitizeMoneyInput(value);
  if (!clean) return '';
  const amount = Number(clean);
  return Number.isFinite(amount) ? `£${amount.toFixed(2)}` : '';
};
const poundsToPence = (value: string) => {
  const trimmed = sanitizeMoneyInput(value);
  if (!trimmed) return null;
  const amount = Number(trimmed);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
};
const penceToPounds = (value: number | null) => (value ? (value / 100).toFixed(2) : '');
const cleanOptionGroups = (groups: ItemOptionGroup[]): ItemOptionGroup[] =>
  groups.map((group) => ({
    ...group,
    options: group.options.map(({ priceDeltaInput, ...option }) => option),
  }));
const prepareDishImage = async (file: File) => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15_000_000)
    throw Error('Choose a JPG, PNG or WebP image under 15 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    if (!canvas.width || !canvas.height) throw Error('This image cannot be used.');
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.65, 0.5]) {
      const image = canvas.toDataURL('image/webp', quality);
      if (image.length <= 400000) return image;
    }
    throw Error('This image is too detailed. Choose a smaller image.');
  } finally {
    bitmap.close();
  }
};

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  const body = await response.json();
  if (!response.ok) throw Error(body.message || 'Unable to update the menu.');
  return body;
}

export function MenuMaintenance({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<MenuData | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [expandedCategoryId, setExpandedCategoryId] = useState('');
  const [message, setMessage] = useState('');
  const [menuDialog, setMenuDialog] = useState(false);
  const [sectionDialog, setSectionDialog] = useState(false);
  const [itemDialog, setItemDialog] = useState<{ sectionId: string; item?: Item } | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [name, setName] = useState('');
  const [draft, setDraft] = useState<ItemDraft>(emptyItem);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setMessage('');
      setData(await request('/api/menu'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load menu maintenance.');
    }
  }, []);
  useEffect(() => void load(), [load]);

  const categories = useMemo(
    () => data?.categories.filter((category) => category.label !== 'Brunch') ?? [],
    [data],
  );
  const active = categories.find((category) => category.id === selectedCategoryId) ?? categories[0];
  const sectionsFor = useCallback(
    (category: Category) => {
      if (!data) return [];
      const menu = data.menus.find((entry) => entry.name === category.menuName);
      const source = menu ? data.sections.filter((section) => section.menuId === menu.id) : [];
      const requested = data.categorySections
        .filter((mapping) => mapping.categoryId === category.id)
        .map((mapping) => mapping.sectionPosition);
      return requested.length
        ? requested.map((position) => source[position]).filter(Boolean)
        : source;
    },
    [data],
  );
  const visibleSections = active ? sectionsFor(active) : [];
  const sourceSections = useMemo(() => {
    if (!active || !data) return [];
    const menu = data.menus.find((entry) => entry.name === active.menuName);
    return menu ? data.sections.filter((section) => section.menuId === menu.id) : [];
  }, [active, data]);
  const shownSections = selectedSectionId
    ? visibleSections.filter((section) => section.id === selectedSectionId)
    : visibleSections;
  const searchTerm = search.trim().toLowerCase();
  const itemMatchesSearch = useCallback(
    (item: Item) => {
      if (!data || !searchTerm) return true;
      const section = data.sections.find((entry) => entry.id === item.sectionId);
      const menu = data.menus.find((entry) => entry.id === section?.menuId);
      const category = categories.find((entry) => entry.menuName === menu?.name);
      return [
        item.name,
        item.description,
        item.priceLabel,
        section?.title ?? '',
        menu?.name ?? '',
        category?.label ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(searchTerm);
    },
    [categories, data, searchTerm],
  );
  const displaySections = useMemo(() => {
    if (!data || !searchTerm) return shownSections;
    return data.sections.filter((section) =>
      data.items.some((item) => item.sectionId === section.id && itemMatchesSearch(item)),
    );
  }, [data, itemMatchesSearch, searchTerm, shownSections]);
  const displayDishCount = useMemo(
    () =>
      displaySections.reduce(
        (count, section) =>
          count +
          (data?.items.filter((item) => item.sectionId === section.id && itemMatchesSearch(item))
            .length ?? 0),
        0,
      ),
    [data, displaySections, itemMatchesSearch],
  );
  const contentTitle = searchTerm
    ? `Search results for "${search.trim()}"`
    : selectedSectionId
      ? shownSections[0]?.title ?? active?.label ?? 'Menu'
      : active?.label ?? 'Menu';

  const saveOrder = async (path: string, key: string, ids: string[]) => {
    try {
      await request(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: ids }),
      });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save the new order.');
    }
  };
  const move = (ids: string[], from: string, target: string) => {
    const next = [...ids];
    next.splice(next.indexOf(from), 1);
    next.splice(next.indexOf(target), 0, from);
    return next;
  };
  const submitMenu = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await request('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setMenuDialog(false);
      setName('');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to add the menu.');
    }
  };
  const submitSection = async (event: FormEvent) => {
    event.preventDefault();
    if (!active) return;
    try {
      await request('/api/menu/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: active.id, name }),
      });
      setSectionDialog(false);
      setName('');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to add the section.');
    }
  };
  const submitItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!itemDialog || imageBusy) return;
    try {
      await request(itemDialog.item ? `/api/menu/items/${itemDialog.item.id}` : '/api/menu/items', {
        method: itemDialog.item ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          priceLabel: formatPriceLabel(draft.priceLabel),
          optionGroups: cleanOptionGroups(draft.optionGroups),
          sectionId: itemDialog.sectionId,
        }),
      });
      setItemDialog(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save the dish.');
    }
  };
  const toggleAvailability = async (item: Item) => {
    if (!data) return;
    const unavailable =
      data.unavailableItems?.some((entry) => entry.itemName === item.name) ?? false;
    try {
      await request(`/api/menu/items/${item.id}/out-of-stock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outOfStock: !unavailable }),
      });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to change availability.');
    }
  };
  const optionsFor = (itemName: string) =>
    data?.itemOptions?.find((entry) => entry.itemName === itemName)?.groups ?? [];
  const tagsFor = (itemName: string) =>
    data?.dietaryTags?.filter((tag) => tag.itemName === itemName).map((tag) => tag.tagCode) ?? [];
  const allergensFor = (itemName: string) =>
    data?.allergenTags?.filter((tag) => tag.itemName === itemName).map((tag) => tag.code) ?? [];
  const dietaryTagDefinitions = data?.dietaryTagDefinitions?.length
    ? data.dietaryTagDefinitions
    : [
        { code: 'V', label: 'Vegetarian' },
        { code: 'VG', label: 'Vegan' },
        { code: 'GF', label: 'Gluten Free' },
        { code: 'GFO', label: 'Gluten Free Option Available' },
        { code: 'VGO', label: 'Vegan Option Available' },
      ];
  const toggleDietaryTag = (code: string) =>
    setDraft((current) => ({
      ...current,
      dietaryTags: current.dietaryTags.includes(code)
        ? current.dietaryTags.filter((tag) => tag !== code)
        : [...current.dietaryTags, code],
    }));
  const allergenDefinitions = data?.allergenDefinitions?.length
    ? data.allergenDefinitions
    : [
        { code: 'g', label: 'Gluten' },
        { code: 'cr', label: 'Crustaceans' },
        { code: 'e', label: 'Eggs' },
        { code: 'f', label: 'Fish' },
        { code: 'p', label: 'Peanuts' },
        { code: 's', label: 'Soybeans' },
        { code: 'm', label: 'Milk' },
        { code: 'n', label: 'Nuts' },
        { code: 'c', label: 'Celery' },
        { code: 'md', label: 'Mustard' },
        { code: 'se', label: 'Sesame' },
        { code: 'sd', label: 'Sulphites' },
        { code: 'l', label: 'Lupin' },
        { code: 'mo', label: 'Molluscs' },
      ];
  const toggleAllergen = (code: string) =>
    setDraft((current) => ({
      ...current,
      allergens: current.allergens.includes(code)
        ? current.allergens.filter((tag) => tag !== code)
        : [...current.allergens, code],
    }));
  const updateGroup = (index: number, group: ItemOptionGroup) =>
    setDraft((current) => ({
      ...current,
      optionGroups: current.optionGroups.map((entry, entryIndex) =>
        entryIndex === index ? group : entry,
      ),
    }));
  const updateOption = (groupIndex: number, optionIndex: number, option: ItemOption) =>
    setDraft((current) => ({
      ...current,
      optionGroups: current.optionGroups.map((group, entryIndex) =>
        entryIndex === groupIndex
          ? {
              ...group,
              options: group.options.map((entry, choiceIndex) =>
                choiceIndex === optionIndex ? option : entry,
              ),
            }
          : group,
      ),
    }));

  return (
    <section className="menu-maintenance">
      <Breadcrumbs
        current={active?.label || 'Menu maintenance'}
        onSettings={onBack}
      />
      <div className="menu-heading">
        <div>
          <p className="eyebrow">MENU MAINTENANCE</p>
          <h1>{active?.label || 'Menu maintenance'}</h1>
          <p className="settings-intro">
            Manage sections, dishes, prices, options and availability.
          </p>
        </div>
        <div className="menu-actions">
          <label className="menu-search">
            Search dishes
            <span className="menu-search-field">
              <span aria-hidden="true" className="menu-search-icon">
              </span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search all menu items"
              />
              {search && (
                <button
                  aria-label="Clear search"
                  className="menu-search-clear"
                  type="button"
                  onClick={() => setSearch('')}
                >
                  ×
                </button>
              )}
            </span>
          </label>
          <button type="button" onClick={() => void load()}>
            Refresh
          </button>
          <button className="primary menu-add-button" type="button" onClick={() => setMenuDialog(true)}>
            + Add menu
          </button>
        </div>
      </div>
      {message && <p className="error-message">{message}</p>}
      {active && (
        <div className="menu-workspace">
          <aside className="menu-navigation">
            <h2>Menus</h2>
            {categories.map((category) => {
              const children = sectionsFor(category).filter(
                (section) => section.title !== category.label,
              );
              const expanded = expandedCategoryId ? expandedCategoryId === category.id : active?.id === category.id;
              return (
                <div
                  className="menu-nav-group"
                  draggable
                  key={category.id}
                  onDragOver={(event) => event.preventDefault()}
                  onDragStart={(event) => event.dataTransfer.setData('menu-category', category.id)}
                  onDrop={(event) => {
                    const from = event.dataTransfer.getData('menu-category');
                    if (from && from !== category.id) {
                      const visible = move(
                        categories.map((item) => item.id),
                        from,
                        category.id,
                      );
                      const hidden =
                        data?.categories
                          .filter((item) => !visible.includes(item.id))
                          .map((item) => item.id) ?? [];
                      void saveOrder('/api/menu/categories/order', 'categoryIds', [
                        ...visible,
                        ...hidden,
                      ]);
                    }
                  }}
                >
                  <button
                    aria-current={active?.id === category.id}
                    className="menu-nav-parent"
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(category.id);
                      setSelectedSectionId('');
                      setExpandedCategoryId(expanded ? '' : category.id);
                    }}
                  >
                    {category.label}
                    {children.length ? <span>{expanded ? '⌃' : '⌄'}</span> : null}
                  </button>
                  {expanded &&
                    children.map((section) => (
                      <button
                        aria-current={selectedSectionId === section.id}
                        className="menu-nav-section"
                        key={section.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(category.id);
                          setSelectedSectionId(section.id);
                        }}
                      >
                        {section.title}
                      </button>
                    ))}
                </div>
              );
            })}
          </aside>
          <div className="menu-content">
            <div className="menu-content-toolbar">
              <div>
                <h2>{contentTitle}</h2>
                <div className="menu-stats">
                  <span>
                    {displaySections.length} section{displaySections.length === 1 ? '' : 's'}
                  </span>
                  <span>
                    {displayDishCount} dish{displayDishCount === 1 ? '' : 'es'}
                  </span>
                </div>
              </div>
              {!selectedSectionId && active && (
                <button
                  type="button"
                  onClick={() => {
                    setName('');
                    setSectionDialog(true);
                  }}
                >
                  + Add section
                </button>
              )}
            </div>
            {searchTerm && displaySections.length === 0 && (
              <p className="menu-empty-state">No dishes match “{search.trim()}”.</p>
            )}
            {displaySections.map((section) => {
              const sectionItems = data?.items.filter((item) => item.sectionId === section.id) ?? [];
              const items = sectionItems.filter(itemMatchesSearch);
              return (
                <article className="menu-section" key={section.id}>
                  <header
                    draggable={!searchTerm && visibleSections.length === sourceSections.length}
                    onDragOver={(event) => {
                      if (!searchTerm && visibleSections.length === sourceSections.length)
                        event.preventDefault();
                    }}
                    onDragStart={(event) => event.dataTransfer.setData('menu-section', section.id)}
                    onDrop={(event) => {
                      const from = event.dataTransfer.getData('menu-section');
                      if (
                        from &&
                        from !== section.id &&
                        !searchTerm &&
                        visibleSections.length === sourceSections.length
                      )
                        void saveOrder(
                          '/api/menu/sections/order',
                          'sectionIds',
                          move(
                            visibleSections.map((entry) => entry.id),
                            from,
                            section.id,
                          ),
                        );
                    }}
                  >
                    <div>
                      <h2>{section.title}</h2>
                      <span>{items.length} dishes</span>
                    </div>
                    <button
                      type="button"
                  onClick={() => {
                    setDraft(emptyItem);
                    setImageError('');
                    setItemDialog({ sectionId: section.id });
                      }}
                    >
                      + Add dish
                    </button>
                  </header>
                  <div
                    className="menu-item-list"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      if (searchTerm) return;
                      const from = event.dataTransfer.getData('menu-item');
                      if (from)
                        void saveOrder('/api/menu/items/order', 'itemIds', [
                          ...sectionItems.map((item) => item.id).filter((id) => id !== from),
                          from,
                        ]);
                    }}
                  >
                    {items.map((item) => {
                      const unavailable =
                        data?.unavailableItems?.some((entry) => entry.itemName === item.name) ??
                        false;
                      const tags =
                        data?.dietaryTags?.filter((tag) => tag.itemName === item.name) ?? [];
                      const allergens =
                        data?.allergenTags?.filter((tag) => tag.itemName === item.name) ?? [];
                      return (
                        <div
                          className="menu-item"
                          draggable={!searchTerm}
                          key={item.id}
                          onDragOver={(event) => {
                            if (!searchTerm) event.preventDefault();
                          }}
                          onDragStart={(event) => event.dataTransfer.setData('menu-item', item.id)}
                          onDrop={(event) => {
                            event.stopPropagation();
                            if (searchTerm) return;
                            const from = event.dataTransfer.getData('menu-item');
                            if (from && from !== item.id)
                              void saveOrder(
                                '/api/menu/items/order',
                                'itemIds',
                                move(
                                  sectionItems.map((entry) => entry.id),
                                  from,
                                  item.id,
                                ),
                              );
                          }}
                        >
                          <span className="menu-drag" aria-hidden="true">
                            ⠿
                          </span>
                          {item.imageData && <img className="menu-dish-thumb" src={item.imageData} alt="" />}
                          <div className="menu-item-copy">
                            <div className="menu-item-title-row">
                              <b>{item.name}</b>
                              {optionsFor(item.name).length > 0 && (
                                <small className="menu-item-options">
                                  {optionsFor(item.name).length} option group
                                  {optionsFor(item.name).length === 1 ? '' : 's'}
                                </small>
                              )}
                            </div>
                            {(tags.length > 0 || allergens.length > 0) && (
                              <div className="menu-item-badges">
                                {tags.length > 0 && (
                                  <span className="menu-badge-group">
                                    <small>Dietary</small>
                                    {tags.map((tag) => (
                                      <mark className="menu-code-badge dietary" key={tag.tagCode} title={tag.label}>
                                        {tag.tagCode}
                                      </mark>
                                    ))}
                                  </span>
                                )}
                                {allergens.length > 0 && (
                                  <span className="menu-badge-group">
                                    <small>Allergens</small>
                                    {allergens.map((tag) => (
                                      <mark
                                        className="menu-code-badge allergen"
                                        key={tag.code}
                                        style={allergenBadgeStyle(tag.code, tag.color)}
                                        title={tag.label}
                                      >
                                        <span className="allergen-icon-dot">
                                          <i aria-hidden="true" className={`fa-solid ${allergenIcon(tag.code, tag.icon)}`} />
                                        </span>
                                        <span>{tag.label ?? tag.code}</span>
                                      </mark>
                                    ))}
                                  </span>
                                )}
                              </div>
                            )}
                            <p>{item.description}</p>
                          </div>
                          <em>{item.priceLabel}</em>
                          <button
                            className={
                              unavailable
                                ? 'availability-toggle is-unavailable'
                                : 'availability-toggle'
                            }
                            type="button"
                            onClick={() => void toggleAvailability(item)}
                          >
                            {unavailable ? 'Out of stock' : 'In stock'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setImageError('');
                              setDraft({
                                name: item.name,
                                description: item.description,
                                priceLabel: moneyInputValue(item.priceLabel),
                                imageData: item.imageData,
                                dietaryTags: tagsFor(item.name),
                                allergens: allergensFor(item.name),
                                optionGroups: optionsFor(item.name),
                              });
                              setItemDialog({ sectionId: section.id, item });
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="danger"
                            type="button"
                            onClick={() => setDeleteItem(item)}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
      {menuDialog && (
        <ModalShell title="Add a menu" onClose={() => setMenuDialog(false)}>
          <form className="dialog-form" onSubmit={submitMenu}>
            <label>
              Menu name
              <input
                autoFocus
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={() => setMenuDialog(false)}>
                Cancel
              </button>
              <button className="primary" type="submit">
                Add menu
              </button>
            </div>
          </form>
        </ModalShell>
      )}
      {sectionDialog && (
        <ModalShell title="Add a section" onClose={() => setSectionDialog(false)}>
          <form className="dialog-form" onSubmit={submitSection}>
            <label>
              Section name
              <input
                autoFocus
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={() => setSectionDialog(false)}>
                Cancel
              </button>
              <button className="primary" type="submit">
                Add section
              </button>
            </div>
          </form>
        </ModalShell>
      )}
      {itemDialog && (
        <ModalShell
          title={itemDialog.item ? 'Edit dish' : 'Add a dish'}
          onClose={() => setItemDialog(null)}
        >
          <form className="dialog-form" onSubmit={submitItem}>
            <label>
              Dish name
              <input
                autoFocus
                maxLength={120}
                required
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </label>
            <div className="dish-image-editor">
              <span>Dish image</span>
              {draft.imageData && <img src={draft.imageData} alt="Dish preview" />}
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={imageBusy} onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setImageBusy(true);
                try {
                  const imageData = await prepareDishImage(file);
                  setDraft(current => ({...current, imageData}));
                  setImageError('');
                } catch (error) {
                  setImageError(error instanceof Error ? error.message : 'Unable to prepare the image.');
                } finally {
                  setImageBusy(false);
                  event.target.value = '';
                }
              }} />
              {draft.imageData && <button type="button" onClick={() => setDraft(current => ({...current, imageData: null}))}>Remove image</button>}
              <small>JPG, PNG or WebP. Images are resized for the app.</small>
              {imageError && <span className="error-message" role="alert">{imageError}</span>}
            </div>
            <label>
              Description
              <textarea
                maxLength={1000}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </label>
            <label>
              Base price
              <span className="currency-field">
                <span>£</span>
                <input
                  inputMode="decimal"
                  value={draft.priceLabel}
                  onBlur={() =>
                    setDraft((current) => ({
                      ...current,
                      priceLabel: moneyInputValue(current.priceLabel),
                    }))
                  }
                  onChange={(event) =>
                    setDraft({ ...draft, priceLabel: sanitizeMoneyInput(event.target.value) })
                  }
                  placeholder="0.00"
                />
              </span>
            </label>
            <div className="dietary-allergen-container">
              <fieldset className="dietary-tag-editor">
                <legend>Dietary symbols</legend>
                <div>
                  {dietaryTagDefinitions.map((tag) => (
                    <button
                      aria-pressed={draft.dietaryTags.includes(tag.code)}
                      key={tag.code}
                      title={tag.label}
                      type="button"
                      onClick={() => toggleDietaryTag(tag.code)}
                    >
                      <span>{tag.code}</span>
                      <small>{tag.label}</small>
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="dietary-tag-editor allergen-tag-editor">
                <legend>Allergens</legend>
                <div>
                  {allergenDefinitions.map((tag) => (
                    <button
                      aria-pressed={draft.allergens.includes(tag.code)}
                      key={tag.code}
                      title={tag.label}
                      type="button"
                      onClick={() => toggleAllergen(tag.code)}
                    >
                      <span style={allergenBadgeStyle(tag.code, tag.color)}>
                        <i aria-hidden="true" className={`fa-solid ${allergenIcon(tag.code, tag.icon)}`} />
                      </span>
                      <small>{tag.label}</small>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
            <section className="menu-option-editor">
              <div>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      optionGroups: [...current.optionGroups, emptyGroup()],
                    }))
                  }
                >
                  + Add option group
                </button>
              </div>
              {draft.optionGroups.map((group, groupIndex) => (
                <article className="menu-option-group" key={groupIndex}>
                  <div className="menu-option-group-header">
                    <label>
                      Group label
                      <input
                        maxLength={80}
                        required
                        value={group.label}
                        onChange={(event) =>
                          updateGroup(groupIndex, { ...group, label: event.target.value })
                        }
                        placeholder="e.g. Choose a size"
                      />
                    </label>
                    <label>
                      Min
                      <input
                        min={0}
                        type="number"
                        value={group.minSelections}
                        onChange={(event) =>
                          updateGroup(groupIndex, {
                            ...group,
                            minSelections: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Max
                      <input
                        min={1}
                        type="number"
                        value={group.maxSelections}
                        onChange={(event) =>
                          updateGroup(groupIndex, {
                            ...group,
                            maxSelections: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <button
                      className="danger"
                      type="button"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          optionGroups: current.optionGroups.filter((_, index) => index !== groupIndex),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                  <h3 className="menu-option-heading">Options</h3>
                  <div className="menu-option-choices">
                    {group.options.map((option, optionIndex) => (
                      <div className="menu-option-choice" key={optionIndex}>
                        <input
                          maxLength={80}
                          required
                          value={option.label}
                          onChange={(event) =>
                            updateOption(groupIndex, optionIndex, {
                              ...option,
                              label: event.target.value,
                            })
                          }
                          placeholder="Option label"
                        />
                        <input
                          inputMode="decimal"
                          value={option.priceDeltaInput ?? penceToPounds(option.priceDeltaPence)}
                          onBlur={() =>
                            updateOption(groupIndex, optionIndex, {
                              ...option,
                              priceDeltaInput: undefined,
                            })
                          }
                          onChange={(event) => {
                            const value = sanitizeMoneyInput(event.target.value);
                            updateOption(groupIndex, optionIndex, {
                              ...option,
                              priceDeltaInput: value,
                              priceDeltaPence: poundsToPence(value),
                            });
                          }}
                          placeholder="Price diff"
                        />
                        <span>{optionPriceLabel(option.priceDeltaPence)}</span>
                        <button
                          type="button"
                          onClick={() =>
                            updateGroup(groupIndex, {
                              ...group,
                              options: group.options.filter((_, index) => index !== optionIndex),
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        updateGroup(groupIndex, {
                          ...group,
                          options: [...group.options, { label: '', priceDeltaPence: null }],
                        })
                      }
                    >
                      + Add option
                    </button>
                  </div>
                </article>
              ))}
            </section>
            <div className="dialog-actions">
              <button type="button" onClick={() => setItemDialog(null)}>
                Cancel
              </button>
              <button className="primary" type="submit" disabled={imageBusy}>
                {itemDialog.item ? 'Save changes' : 'Add dish'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
      {deleteItem && (
        <ModalShell title={`Remove ${deleteItem.name}?`} onClose={() => setDeleteItem(null)}>
          <p>This removes the dish from the menu. This cannot be undone.</p>
          <div className="dialog-actions">
            <button type="button" onClick={() => setDeleteItem(null)}>
              Keep dish
            </button>
            <button
              className="danger"
              type="button"
              onClick={() =>
                void request(`/api/menu/items/${deleteItem.id}`, { method: 'DELETE' })
                  .then(() => {
                    setDeleteItem(null);
                    load();
                  })
                  .catch((error) => setMessage(error.message))
              }
            >
              Remove dish
            </button>
          </div>
        </ModalShell>
      )}
    </section>
  );
}
