// Transitional adapter: the running service keeps using its current schema until
// the verified migration commits and the backend is restarted.
import {sql} from './db';
import * as legacy from './content-legacy';
import * as relational from './content-relational';
export type {VersionedContent,ContentDataset} from './content-relational';
const [schema]=await sql`select to_regclass('public.content_revisions') is not null as ready`;
export const relationalContentReady=Boolean(schema.ready);
const service=relationalContentReady?relational:legacy;
export const {currentContent,currentDataset,contentManifest,publishContent,publishDataset}=service;
