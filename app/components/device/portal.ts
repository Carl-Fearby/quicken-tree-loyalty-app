import type {CSSProperties, ReactNode} from 'react';

export type ViewportRect = { left: number; top: number; width: number; height: number };
export type TilePresentation = { rect: ViewportRect; radius: number; tileStyle: CSSProperties; glyphStyle: CSSProperties; icon: ReactNode };
export type PortalTransition = {
    phase: 'opening' | 'closing';
    appId: string;
    from: ViewportRect;
    to: ViewportRect;
    startRadius: number;
    endRadius: number;
    tileStyle: CSSProperties;
    glyphStyle: CSSProperties;
    icon: ReactNode;
    isDark: boolean;
};

export const OPEN_MS = 320;
export const DISMISS_MS = 380;
export const TRANSITION_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';

export const toViewportRect = (rect: DOMRect): ViewportRect => ({left: rect.left, top: rect.top, width: rect.width, height: rect.height});

export const rectKeyframe = (rect: ViewportRect, radius: number) => ({
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    borderRadius: `${radius}px`
});

export const readTilePresentation = (iconButton: HTMLElement): TilePresentation | null => {
    const iconTile = iconButton.querySelector(':scope > span');
    const glyph = iconTile?.firstElementChild;
    if (!(iconTile instanceof HTMLElement) || !(glyph instanceof HTMLElement)) return null;
    const tileStyles = window.getComputedStyle(iconTile);
    const glyphStyles = window.getComputedStyle(glyph);
    const tileBounds = iconTile.getBoundingClientRect();
    const glyphBounds = glyph.getBoundingClientRect();
    const glyphSize = Number.parseFloat(glyphStyles.fontSize) || 33;
    const tileSize = tileBounds.width || iconTile.clientWidth;
    return {
        rect: toViewportRect(tileBounds),
        radius: Number.parseFloat(tileStyles.borderRadius) || 14,
        tileStyle: {background: tileStyles.background, boxShadow: tileStyles.boxShadow, color: tileStyles.color},
        glyphStyle: {
            '--glyph-scale': String(Math.max(glyphBounds.width / tileSize, glyphBounds.height / tileSize, glyphSize / tileSize)),
            '--glyph-font-scale': String(glyphSize / tileSize),
            '--glyph-shadow': glyphStyles.textShadow,
            '--glyph-tracking': glyphStyles.letterSpacing
        } as CSSProperties,
        icon: null as ReactNode
    };
};
