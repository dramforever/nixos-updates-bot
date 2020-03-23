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

    const method = headers.method || (body === null ? 'GET' : 'POST');
    delete headers.method;

    const options = Object.assign({}, url.parse(reqUrl), { method, headers });

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
    const Minio = require('minio');

    const client = new Minio.Client({
        endPoint: 's3.amazonaws.com'
    });

    const objects = await new Promise((resolve, reject) => {
        const stream = client.listObjectsV2('nix-channels');
        const res = []

        stream.on('data', (obj) => res.push(obj));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(res));
    });

    const re = /^(nixos|nixpkgs)-.+[^/]$/;

    const res = [];

    for (const obj of objects) {
        if (! re.test(obj.name))
            continue;

        res.push({
            link: obj.name,
            lastUpdated: obj.lastModified
        });
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
    const response = await request(
        `https://nix-channels.s3.amazonaws.com/${chan}`,
        null,
        { method: 'HEAD' }
    );

    const releaseDest = response.headers['x-amz-website-redirect-location'];

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
