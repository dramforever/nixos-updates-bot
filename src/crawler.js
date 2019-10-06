import cheerio from 'cheerio';
import https from 'https';
import * as url from 'url';

export function request(reqUrl, body = null, headers = null) {
    if (headers === null) {
        headers = {};
    }

    if (body !== null) {
        body = Buffer.from(body);
        headers['Content-Length'] = body.length;
    }

    const options = Object.assign({}, url.parse(reqUrl), {
        method: body === null ? 'GET' : 'POST',
        headers
    });

    return new Promise((resolve, reject) => {
        const req = https.request(
            options,
            (res) => {
                const chunks = [];
                let len = 0;

                res.on('data', (chunk) => {
                    chunks.push(chunk);
                    len += chunk.length;
                });

                res.on('end', () => {
                    const body = Buffer.concat(chunks, len).toString();
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body
                    });
                });

                res.on('error', (e) => { reject(e); });
            });

        req.on('error', (e) => { reject(e); });

        if (body !== null) {
            req.write(body);
        }

        req.end();
    });
}

export async function getChannels() {

    const NIX_CHANNELS = 'https://nixos.org/channels';

    console.log("Fetching channel list...");
    const chanResp = await request(`${NIX_CHANNELS}/`);

    const $ = cheerio.load(chanResp.body);
    const res = [];

    for (const row of Array.from($('tr'))) {
        const grids = $(row).children('td');
        if (grids.length === 5) {
            const link = $(grids[1]).children('a').attr('href');
            const name = $(grids[1]).text().trim();
            const lastUpdated = $(grids[2]).text().trim();

            if (link.includes('/')) // Link to parent directory
                continue;

            res.push({ link, lastUpdated });
        }
    }

    return res;
}

// Examples:
//
//    nixos-19.09beta606.3ba0d9f75cc
// ->       19.09beta606.3ba0d9f75cc
// ->            beta606.3ba0d9f75cc
// ->            beta606
//
//    nixos-19.03.173553.6420e2649fa
// ->       19.03.173553.6420e2649fa
// ->             173553.6420e2649fa
// ->             173553
//               ^..................... Note here
//
export function genVersion(slug) {
    return slug.split('-').pop().replace(/^\d+.\d+\.?/, '').split('.')[0]
}

export async function fetchChannel(chan) {
    const NIX_CHANNELS = 'https://nixos.org/channels';

    const dest = await request(`${NIX_CHANNELS}/${chan}`);

    const releaseDest = dest.headers['location'];

    const slug = releaseDest.split('/').pop();
    const ver = genVersion(slug);

    const [ gitResp, hydraResp ] = await Promise.all([
        request(`${releaseDest}/git-revision`),
        request(`${releaseDest}/src-url`)
    ]);

    const gitRev_ = gitResp.body.trim();
    const chop = (s) => s.split('/').pop();

    const hydraNum = chop(hydraResp.body.trim());

    // Should be hex
    const gitOk = /^[a-z0-9]+$/.test(gitRev_);

    // Should be parsable as a number
    const parsedHydra =
        (+ hydraNum === + hydraNum)
        ? hydraNum
        : null;

    return {
        releaseDest,
        slug, ver,
        gitRev: gitOk ? gitRev_ : null,
        hydraNum: parsedHydra
    };
}

export async function genHydraCompare(cur, base = null) {
    const compRes = await request(`https://hydra.nixos.org/eval/${cur}?compare=${base || cur}`);
    const $ = cheerio.load(compRes.body);

    const res = {};

    for (const link of Array.from($('ul.nav-tabs a'))) {
        const href = $(link).attr('href');
        const tag = href.slice('#tabs-'.length)

        const text = $(link).text();
        const num = /\((\d+)\)/.exec(text)
        if (num == null) continue;

        res[tag] = + num[1];
    }

    return res;
}
