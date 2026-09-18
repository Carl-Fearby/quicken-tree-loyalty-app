export type TenantBrand = {
    name: string;
    shortName: string;
    location: string;
    logoRed: string;
    logoWhite: string;
    primaryColor: string;
};

// Tenant configuration, rather than Pace product branding. A white-label
// build can override these public values without changing the app UI.
export const tenantBrand: TenantBrand = {
    name: process.env.NEXT_PUBLIC_VENUE_NAME ?? 'The Quicken Tree',
    shortName: process.env.NEXT_PUBLIC_VENUE_SHORT_NAME ?? 'Quicken Tree',
    location: process.env.NEXT_PUBLIC_VENUE_LOCATION ?? 'Heart of England Conference Centre',
    logoRed: process.env.NEXT_PUBLIC_VENUE_LOGO_RED ?? '/brand/quicken-tree-red.png',
    logoWhite: process.env.NEXT_PUBLIC_VENUE_LOGO_WHITE ?? '/brand/quicken-tree-white.png',
    primaryColor: process.env.NEXT_PUBLIC_VENUE_PRIMARY_COLOR ?? '#c5233b'
};
