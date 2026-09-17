import {sql} from './db';
import {createContentSchema} from './relational-content';

try {
    await sql.begin(async transaction => {
        await createContentSchema(transaction);
        await transaction`update content_revisions set updated_at=clock_timestamp() where dataset_key='menuAvailability'`;
    });
    console.log('Menu catalogue and menu availability are now independently versioned.');
} finally {
    await sql.end();
}
