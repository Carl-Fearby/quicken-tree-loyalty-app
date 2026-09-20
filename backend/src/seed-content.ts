import appointments from '../seed-data/appointments.json';
import appConfig from '../seed-data/app-config.json';
import mainMenu from '../seed-data/main-menu-september.json';
import menu from '../seed-data/menu.json';
import points from '../seed-data/points-and-tier.json';
import profile from '../seed-data/profile.json';
import rewards from '../seed-data/rewards.json';
import events from '../seed-data/events.json';
import {publishContent,relationalContentReady} from './content';
import {sql} from './db';
import {createContentSchema} from './relational-content';

const data = {appointments, appConfig, mainMenu, menu, points, profile, rewards, events};
if(relationalContentReady)await sql.begin(transaction=>createContentSchema(transaction));
await publishContent(data);
if(!relationalContentReady)for(const [key,payload]of Object.entries(data))await sql`insert into content_datasets(dataset_key,payload) values(${key},${sql.json(payload)}) on conflict(dataset_key) do update set payload=excluded.payload,version=content_datasets.version+1,updated_at=now()`;
await sql.end();
