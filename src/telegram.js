import { request } from './crawler';

export async function telegram(method, data) {
    if (process.env.ARMED !== 'true') {
        return;
    }

    console.log('Telegram:', method);

    const telegramKey = process.env['TELEGRAM_KEY'];

    const respo = await request(
        `https://api.telegram.org/bot${telegramKey}/${method}`,
        JSON.stringify(data),
        { 'Content-Type': 'application/json' }
    );

    const res = JSON.parse(respo.body);
    console.log('Telegram says', res);
    return res;
}

export function sendMessage(msg) {
    return telegram('sendMessage', {
        chat_id: '@nixos_updates',
        text: msg,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
    });
}

export function generateDiff(chan, oldData, newData, comp) {
    const header = `*${chan}*`;

    const updateLine =
        (oldData === null || oldData.ver === null)
        ? `\u2728 new at \`${newData.ver}\``
        : `\`${oldData.ver}\` \u2026 \`${newData.ver}\``;

    const tot =
        (0 + (comp['still-succeed'] || 0) + (comp['sill-fail'] || 0)
        + (comp['now-fail'] || 0) + (comp['now-succeed'] || 0)
        + (comp['new'] || 0));

    const deltaPieces = [
        [ String.fromCodePoint(0x1f4e6),    tot                 ],
        [ String.fromCodePoint(0x1f6d1),    comp['aborted']     ],
        [ '\u274c',                         comp['now-fail']    ],
        [ '\u2714\ufe0f',                   comp['now-succeed'] ],
        [ '\u2795',                         comp['new']         ],
        [ '\u2796',                         comp['removed']     ]
    ];

    const delta = deltaPieces
        .filter(pc => pc[1] !== undefined && pc[1] !== 0)
        .map(pc => `${pc[0]} \`${pc[1]}\``)
        .join('    ');

    function gen_dt() {
        const dt = new Date(newData.time) - new Date(oldData.time);
        const hours = Math.round(dt / 1000 / 3600);
        const days = Math.floor(hours / 24);
        const remh = hours - days * 24;
        if (days) return `${days}d ${remh}h`;
        else return `${remh}h`;
    }

    const timeSeg = `${newData.time}${oldData == null ? "" : ` (${gen_dt()} since last)`}`

    console.log(newData);

    const linkSegParts = []

    if (newData.gitRev) {
        linkSegParts.push(
            (oldData === null || oldData.gitRev === null)
            ? `[View on GitHub (${newData.gitRev.slice(0, 7)})](https://github.com/NixOS/nixpkgs-channels/commits/${newData.gitRev})`
            : `[View on GitHub (${newData.gitRev.slice(0, 7)})](https://github.com/NixOS/nixpkgs-channels/compare/${oldData.gitRev}...${newData.gitRev})`
        );
    }

    if (newData.hydraNum) {
        linkSegParts.push(
            (oldData === null || oldData.hydraNum === null)
                ? `[View on Hydra (${newData.hydraNum})](https://hydra.nixos.org/eval/${newData.hydraNum})`
                : `[View on Hydra (${newData.hydraNum})](https://hydra.nixos.org/eval/${newData.hydraNum}?compare=${oldData.hydraNum})`
        );
    }

    return [ header, updateLine, delta, timeSeg, ... linkSeg ].join('\n');
}
