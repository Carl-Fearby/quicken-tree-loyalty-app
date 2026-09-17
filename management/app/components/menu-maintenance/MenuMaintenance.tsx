'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
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
};
type MenuData = {
  menus: Menu[];
  categories: Category[];
  sections: Section[];
  items: Item[];
  categorySections: { categoryId: string; sectionPosition: number }[];
  dietaryTags?: { itemName: string; tagCode: string; label?: string }[];
  unavailableItems?: { itemName: string }[];
};
type ItemDraft = { name: string; description: string; priceLabel: string };
const emptyItem: ItemDraft = { name: '', description: '', priceLabel: '' };

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
  const active = categories.find((category) => category.id === selectedCategoryId);
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
    if (!itemDialog) return;
    try {
      await request(itemDialog.item ? `/api/menu/items/${itemDialog.item.id}` : '/api/menu/items', {
        method: itemDialog.item ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, sectionId: itemDialog.sectionId }),
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

  return (
    <section className="menu-maintenance">
      <Breadcrumbs
        current={active?.label || 'Menu maintenance'}
        onParent={active ? () => setSelectedCategoryId('') : undefined}
        onSettings={onBack}
        parent={active ? 'Menu maintenance' : undefined}
      />
      <div className="menu-heading">
        <div>
          <p className="eyebrow">MENU MAINTENANCE</p>
          <h1>{active?.label || 'Menu maintenance'}</h1>
          <p className="settings-intro">
            {active
              ? 'Manage sections, dishes, prices and availability.'
              : 'Choose a service to manage its menu, sections, dishes and availability.'}
          </p>
        </div>
        <div className="menu-actions">
          <button type="button" onClick={() => void load()}>
            Refresh
          </button>
          <button className="primary" type="button" onClick={() => setMenuDialog(true)}>
            + Add menu
          </button>
        </div>
      </div>
      {message && <p className="error-message">{message}</p>}
      {active && (
        <div aria-label="Service zones" className="menu-zone-grid">
          {categories.map((category) => {
            const sections = sectionsFor(category);
            const dishes = sections.flatMap(
              (section) => data?.items.filter((item) => item.sectionId === section.id) ?? [],
            );
            return (
              <button
                aria-current={category.id === active.id}
                className="menu-zone"
                key={category.id}
                type="button"
                onClick={() => {
                  setSelectedCategoryId(category.id);
                  setSelectedSectionId('');
                  setExpandedCategoryId(category.id);
                }}
              >
                <b>{category.label}</b>
                <span>
                  {sections.length} sections · {dishes.length} dishes
                </span>
              </button>
            );
          })}
        </div>
      )}
      {!active ? (
        <div className="menu-service-grid">
          {categories.map((category) => {
            const sections = sectionsFor(category);
            const dishes = sections.flatMap(
              (section) => data?.items.filter((item) => item.sectionId === section.id) ?? [],
            );
            return (
              <button
                className="menu-service-card"
                key={category.id}
                type="button"
                onClick={() => {
                  setSelectedCategoryId(category.id);
                  setSelectedSectionId('');
                  setExpandedCategoryId(category.id);
                }}
              >
                <span>MENU</span>
                <strong>{category.label}</strong>
                <small>
                  {sections.length} sections · {dishes.length} dishes
                </small>
                <b>Manage menu →</b>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="menu-workspace">
          <aside className="menu-navigation">
            <h2>Menus</h2>
            {categories.map((category) => {
              const children = sectionsFor(category).filter(
                (section) => section.title !== category.label,
              );
              const expanded = expandedCategoryId === category.id;
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
              <div className="menu-stats">
                <span>{visibleSections.length} sections</span>
                <span>
                  {
                    visibleSections.flatMap(
                      (section) =>
                        data?.items.filter((item) => item.sectionId === section.id) ?? [],
                    ).length
                  }{' '}
                  dishes
                </span>
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
            {shownSections.map((section) => {
              const items = data?.items.filter((item) => item.sectionId === section.id) ?? [];
              return (
                <article className="menu-section" key={section.id}>
                  <header
                    draggable={visibleSections.length === sourceSections.length}
                    onDragOver={(event) => {
                      if (visibleSections.length === sourceSections.length) event.preventDefault();
                    }}
                    onDragStart={(event) => event.dataTransfer.setData('menu-section', section.id)}
                    onDrop={(event) => {
                      const from = event.dataTransfer.getData('menu-section');
                      if (
                        from &&
                        from !== section.id &&
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
                      const from = event.dataTransfer.getData('menu-item');
                      if (from)
                        void saveOrder('/api/menu/items/order', 'itemIds', [
                          ...items.map((item) => item.id).filter((id) => id !== from),
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
                      return (
                        <div
                          className="menu-item"
                          draggable
                          key={item.id}
                          onDragOver={(event) => event.preventDefault()}
                          onDragStart={(event) => event.dataTransfer.setData('menu-item', item.id)}
                          onDrop={(event) => {
                            event.stopPropagation();
                            const from = event.dataTransfer.getData('menu-item');
                            if (from && from !== item.id)
                              void saveOrder(
                                '/api/menu/items/order',
                                'itemIds',
                                move(
                                  items.map((entry) => entry.id),
                                  from,
                                  item.id,
                                ),
                              );
                          }}
                        >
                          <span className="menu-drag" aria-hidden="true">
                            ⠿
                          </span>
                          <div className="menu-item-copy">
                            <b>{item.name}</b>
                            {tags.length > 0 && (
                              <small>{tags.map((tag) => tag.tagCode).join(' · ')}</small>
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
                              setDraft({
                                name: item.name,
                                description: item.description,
                                priceLabel: item.priceLabel,
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
            <label>
              Description
              <textarea
                maxLength={1000}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </label>
            <label>
              Price
              <label>
                <input
                  maxLength={40}
                  value={draft.priceLabel}
                  onChange={(event) => setDraft({ ...draft, priceLabel: event.target.value })}
                  placeholder="e.g. £12.50"
                />
              </label>
            </label>
            <div className="dialog-actions">
              <button type="button" onClick={() => setItemDialog(null)}>
                Cancel
              </button>
              <button className="primary" type="submit">
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
