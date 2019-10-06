import * as crawler from './crawler';
import * as telegram from './telegram';
import { MongoClient } from 'mongodb';

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

    for (const msg in messages) {
        console.log(msg);
        await telegram.sendMessage(msg);
        await new Promise((resolve, reject) => setTimeout(resolve, 1000));
    }

    if (cacheChanged) {
        await writeData(cache);
    }
}

export async function readData() {
    const client = new MongoClient(process.env.DATABASE);
    await client.connect();

    const coll = client.db('nixos_updates_bot').collection('state');

    return await coll.findOne({ _tag: 'nixos_updates_bot' });
}

export async function writeData(data) {
    data._tag = 'nixos_updates_bot';

    const client = new MongoClient(process.env.DATABASE);
    await client.connect();

    const coll = client.db('nixos_updates_bot').collection('state');
    await coll.findOneAndReplace({ _tag: 'nixos_updates_bot' }, data, { upsert: true });
}
