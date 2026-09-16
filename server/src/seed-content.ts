import appointments from '../../app/data/appointments.json';
import appConfig from '../../app/data/app-config.json';
import mainMenu from '../../app/data/main-menu-september.json';
import menu from '../../app/data/menu.json';
import points from '../../app/data/points-and-tier.json';
import profile from '../../app/data/profile.json';
import rewards from '../../app/data/rewards.json';
import {publishContent} from './content';
import {sql} from './db';

const data = {appointments, appConfig, mainMenu, menu, points, profile, rewards};
await publishContent(data);
await sql.end();
