import * as update from './update';
import http from 'http';
import { handleMessage } from './sub';
import { Client } from 'pg';

function readRequest(request) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let len = 0;

        request.on('data', (chunk) => {
            chunks.push(chunk);
            len += chunk.length;
        });

        request.on('end', () => {
            resolve(Buffer.concat(chunks, len).toString());
        });

        request.on('error', (err) => { reject(err); });
    });
}

async function handle(request) {
    const WEBHOOK_PATH = `/webhook/${process.env.BOT_SECRET}`;

    if (request.url === '/update') {
        if (request.method !== 'POST')
            throw 'Bad request';

        const dataRaw = await readRequest(request);

        const data = JSON.parse(dataRaw);

        if (! process.env.BOT_SECRET
            || data.secret !== process.env.BOT_SECRET) {
            throw 'Bad request';
        }

        if (data.action === 'update') {
            setTimeout(() => {
                update.performUpdate()
                    .then(() => console.log('Update done'))
                    .catch((err) => console.log('Update', err));

            }, Math.random() * 60 * 1000); // Add random delay

            return 'ok';
        } else {
            throw 'Bad action';
        }
    } else if (request.url == WEBHOOK_PATH) {
        const dataRaw = await readRequest(request);
        const data = JSON.parse(dataRaw);
        if (data.message) {
            return handleMessage(data.message);
        } else {
            return 'ignored';
        }
    } else {
        throw 'Bad path'
    }
}

async function setupDatabase() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await client.connect();
        await client.query(`
            create table if not exists bot_state (
                data text not null
            );
            create table if not exists subscriptions (
                chat_id bigint not null,
                channel text not null,
                unique (channel, chat_id)
            );
        `);
    } finally {
        await client.end();
    }
}

export default function topLevel(request, response) {
    handle(request)
        .then((res) => {
            if (typeof res === 'object') {
                response.writeHead(200, { 'Content-Type': 'application/json' });
                response.end(JSON.stringify(res));
            } else {
                response.writeHead(200, { 'Content-Type': 'text/plain' });
                response.end(res)
            }
        })
        .catch((err) => {
            response.writeHead(400, { 'Content-Type': 'text/plain' });
            if (typeof err === 'string') {
                response.end(err);
            } else {
                console.log(err.stack);
                response.end(err.constructor.name);
            }
        });
}

setupDatabase().catch(err => {
    console.log("Cannot setup database: ", err);
    process.exit(1)
});

const server = http.createServer(topLevel);
const port = process.env.PORT || 5000;

server.listen(port);
