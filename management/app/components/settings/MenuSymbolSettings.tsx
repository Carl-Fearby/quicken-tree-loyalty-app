'use client';
import { useEffect, useState } from 'react';
import { Breadcrumbs } from '../ui/Breadcrumbs';

type DietaryTag = { code: string; label: string; usageCount?: number };
type AllergenTag = DietaryTag & { color: string; icon: string };

const emptyDietary = (): DietaryTag => ({ code: '', label: '' });
const emptyAllergen = (): AllergenTag => ({
  code: '',
  label: '',
  color: '#d8585d',
  icon: 'fa-circle-info',
});

export function MenuSymbolSettings({ onBack }: { onBack: () => void }) {
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>([]);
  const [allergenTags, setAllergenTags] = useState<AllergenTag[]>([]);
  const [message, setMessage] = useState('');

  const load = async () => {
    setMessage('');
    const response = await fetch('/api/menu-tags');
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.message || 'Unable to load menu symbols.');
      return;
    }
    setDietaryTags(body.dietaryTags || []);
    setAllergenTags(body.allergenTags || []);
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setMessage('Saving...');
    const response = await fetch('/api/menu-tags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dietaryTags, allergenTags }),
    });
    const body = await response.json();
    setMessage(response.ok ? 'Saved.' : body.message || 'Unable to save menu symbols.');
    if (response.ok) await load();
  };

  return (
    <section className="settings-page menu-symbol-settings">
      <Breadcrumbs current="Menu symbols" onSettings={onBack} />
      <p className="eyebrow">MENU SETTINGS</p>
      <h1>Dietary & allergen symbols</h1>
      <p className="settings-intro">
        Manage the white-label symbol keys used by dishes in the back office and loyalty app.
      </p>
      <section className="settings-card menu-symbol-card">
        <header>
          <div>
            <h2>Dietary symbols</h2>
            <p>Short codes shown against menu items.</p>
          </div>
          <button type="button" onClick={() => setDietaryTags((tags) => [...tags, emptyDietary()])}>
            + Add dietary symbol
          </button>
        </header>
        <div className="menu-symbol-grid dietary-symbol-grid">
            <div className="menu-symbol-column-headings">
              <span>Code</span>
              <span>Label</span>
              <span>Used</span>
              <span>Actions</span>
            </div>
          {dietaryTags.map((tag, index) => (
            <div className="menu-symbol-row" key={`${tag.code}-${index}`}>
              <input
                aria-label="Dietary code"
                value={tag.code}
                onChange={(event) =>
                  setDietaryTags((tags) =>
                    tags.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, code: event.target.value.toUpperCase() } : entry,
                    ),
                  )
                }
              />
              <input
                aria-label="Dietary label"
                value={tag.label}
                onChange={(event) =>
                  setDietaryTags((tags) =>
                    tags.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, label: event.target.value } : entry,
                    ),
                  )
                }
              />
              <small>{tag.usageCount ?? 0}</small>
              <button
                type="button"
                disabled={Boolean(tag.usageCount)}
                onClick={() => setDietaryTags((tags) => tags.filter((_, entryIndex) => entryIndex !== index))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>
      <section className="settings-card menu-symbol-card">
        <header>
          <div>
            <h2>Allergen symbols</h2>
            <p>Icon, colour and label used for allergen badges.</p>
          </div>
          <button type="button" onClick={() => setAllergenTags((tags) => [...tags, emptyAllergen()])}>
            + Add allergen
          </button>
        </header>
        <div className="menu-symbol-grid allergen-symbol-grid">
            <div className="menu-symbol-column-headings">
              <span>Code</span>
              <span>Label</span>
              <span>Colour</span>
              <span>Icon</span>
              <span>Used</span>
              <span>Actions</span>
            </div>
          {allergenTags.map((tag, index) => (
            <div className="menu-symbol-row" key={`${tag.code}-${index}`}>
              <input
                aria-label="Allergen code"
                value={tag.code}
                onChange={(event) =>
                  setAllergenTags((tags) =>
                    tags.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, code: event.target.value.toLowerCase() } : entry,
                    ),
                  )
                }
              />
              <input
                aria-label="Allergen label"
                value={tag.label}
                onChange={(event) =>
                  setAllergenTags((tags) =>
                    tags.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, label: event.target.value } : entry,
                    ),
                  )
                }
              />
              <span className="colour-field">
                <input
                  aria-label="Allergen colour"
                  type="color"
                  value={tag.color || '#d8585d'}
                  onChange={(event) =>
                    setAllergenTags((tags) =>
                      tags.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, color: event.target.value } : entry,
                      ),
                    )
                  }
                />
                <input
                  aria-label="Allergen colour hex"
                  value={tag.color}
                  onChange={(event) =>
                    setAllergenTags((tags) =>
                      tags.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, color: event.target.value } : entry,
                      ),
                    )
                  }
                />
              </span>
              <input
                aria-label="Font Awesome icon"
                value={tag.icon}
                placeholder="fa-wheat-awn"
                onChange={(event) =>
                  setAllergenTags((tags) =>
                    tags.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, icon: event.target.value } : entry,
                    ),
                  )
                }
              />
              <small>{tag.usageCount ?? 0}</small>
              <button
                type="button"
                disabled={Boolean(tag.usageCount)}
                onClick={() => setAllergenTags((tags) => tags.filter((_, entryIndex) => entryIndex !== index))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>
      <div className="settings-actions">
        <p role="status">{message}</p>
        <button className="primary" type="button" onClick={() => void save()}>
          Save symbols
        </button>
      </div>
    </section>
  );
}
