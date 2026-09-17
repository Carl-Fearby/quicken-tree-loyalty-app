import appointments from '../../app/app/data/appointments.json';
import appConfig from '../../app/app/data/app-config.json';
import mainMenu from '../../app/app/data/main-menu-september.json';
import menu from '../../app/app/data/menu.json';
import points from '../../app/app/data/points-and-tier.json';
import profile from '../../app/app/data/profile.json';
import rewards from '../../app/app/data/rewards.json';
import events from '../../app/app/data/events.json';
import {publishContent,relationalContentReady} from './content';
import {sql} from './db';

const data = {appointments, appConfig, mainMenu, menu, points, profile, rewards, events};
await publishContent(data);
if(!relationalContentReady)for(const [key,payload]of Object.entries(data))await sql`insert into content_datasets(dataset_key,payload) values(${key},${sql.json(payload)}) on conflict(dataset_key) do update set payload=excluded.payload,version=content_datasets.version+1,updated_at=now()`;
await sql.end();
