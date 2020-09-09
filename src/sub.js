import { Client } from "pg";

const BOT_USERNAME = process.env.BOT_USERNAME || 'nixos_updates_bot';

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
    if (! message.from || ! message.text
        || ! ['private', 'group', 'supergroup'].includes(message.chat.type)) {
        return ''; // Bad message
    }

    const chat_id = message.chat.id;

    const command_match = message.text.match(/^\/(\w+)(@\w+)?\s+(.+)\s*$/)

    const usage = message.chat.type === 'group'
        ? `Please use /subscribe@${BOT_USERNAME} (channel) or /unsubscribe@${BOT_USERNAME} (channel)`
        : 'Please use /subscribe (channel) or /unsubscribe (channel)';

    if (command_match === null) {
        return {
            method: 'sendMessage',
            chat_id,
            text: usage,
        };
    }

    const [ , command, target, channel ] = command_match;

    if (message.chat.type === 'group' && target !== '@' + BOT_USERNAME)
        return ''; // Group chat, avoid command name clash

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
            text: 'Sorry, I did not understand\n' + usage,
        };
    }
}
