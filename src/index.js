import * as update from './update';
import http from 'http';

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
            update.performUpdate()
                .then((res) => console.log('Update done', res))
                .then((err) => console.log('Update', err))
            return 'ok';
        } else {
            throw 'Bad action';
        }

        return 'done'
    } else {
        throw 'Bad path'
    }
}

export default function topLevel(request, response) {
    handle(request)
        .then((res) => {
            response.writeHead(200, { 'Content-Type': 'text/plain' });
            response.end(res)
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

const server = http.createServer(topLevel);
const port = process.env.PORT || 5000;

server.listen(port);
