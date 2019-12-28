import { Client } from "pg";

async function subscribe(chat_id, channel) {
    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await client.connect();
        await client.query(
            'insert into subscriptions (chat_id, channel) values ($1, $2) on conflict do nothing;',
            [ chat_id, channel ]
        );
    } finally {
        await client.end();
    }
}

async function unsubscribe(chat_id, channel) {
    const client = new Client({ connectionString: process.env.DATABASE_URL });

    try {
        await client.connect();
        await client.query(
            'delete from subscriptions where chat_id = $1 and channel = $2',
            [ chat_id, channel ]
        );
    } finally {
        await client.end();
    }
}

export async function handleMessage(message) {
    if (! message.from || ! message.text || message.chat.type !== 'private') {
        return ''; // Bad message
    }

    const chat_id = message.chat.id;

    const command_match = message.text.match(/^\/(\w+)\s+(.+)\s*$/)

    if (command_match === null) {
        return {
            method: 'sendMessage',
            chat_id,
            text: 'Please use /subscribe (channel) or /unsubscribe (channel)',
        };
    }

    const [ , command, channel ] = command_match;

    if (command === 'subscribe') {
        await subscribe(chat_id, channel);
        return {
            method: 'sendMessage',
            chat_id,
            text: `Subscribed to ${channel}`,
        };
    } else if (command === 'unsubscribe') {
        await unsubscribe(chat_id, channel);
        return {
            method: 'sendMessage',
            chat_id,
            text: `Unsubscribed from ${channel}`,
        };
    } else {
        return {
            method: 'sendMessage',
            chat_id,
            text: 'Sorry, I did not understand\nPlease use /subscribe (channel) or /unsubscribe (channel)',
        };
    }
}
