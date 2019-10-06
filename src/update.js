import * as crawler from './crawler';
import * as telegram from './telegram';
import { Client } from 'pg';

export async function performUpdate() {
    let cache = await readData();

    if (cache === null) {
        cache = {};
    }

    const channels = await crawler.getChannels();

    if (! ('seen' in cache)) cache.seen = {};

    const messages = [];

    let cacheChanged = false;

    for (const { link, lastUpdated } of channels) {
        if (link in cache.seen
            && cache.seen[link].time === lastUpdated) {
            continue;
        }

        cacheChanged = true;

        const isNew = ! (link in cache.seen);
        if (isNew) console.log(`NEW    ${link}`);
        else console.log(`UPDATE ${link}`);

        const channelData = await crawler.fetchChannel(link)

        const hydraComp =
            await crawler.genHydraCompare(
                channelData.hydraNum,
                isNew ? null : cache.seen[link].hydraNum
            );

        const oldData = isNew ? null : cache.seen[link]

        const newData = {
            time: lastUpdated,
            ... channelData
        };

        messages.push(telegram.generateDiff(link, oldData, newData, hydraComp));

        cache.seen[link] = newData;
    }

    for (const msg of messages) {
        console.log(msg);
        await telegram.sendMessage(msg);
        await new Promise((resolve, reject) => setTimeout(resolve, 1000));
    }

    if (cacheChanged) {
        await writeData(cache);
    }
}

export async function readData() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await client.connect(process.env.DATABASE_URL);
        const res = await client.query('select data from bot_state limit 1');

        return JSON.parse(res.rows[0].data);
    } finally {
        client.end();
    }
}

export async function writeData(data) {
    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await client.connect(process.env.DATABASE_URL);
        await client.query('BEGIN');

        await client.query('delete from bot_state', data);
        await client.query('insert into bot_state (data) values ($1)', data);

        return JSON.parse(res.rows[0].data);
    } finally {
        client.query('ROLLBACK');
        client.end();
    }
}
