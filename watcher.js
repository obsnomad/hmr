import { watch, readFile } from 'node:fs/promises';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import checksum from 'checksum';
import replaceAsync from 'string-replace-async';
import open from 'open';
import config from './config.js';

const FILE_REGEX = new RegExp(`\.(${config.fileTypes.join('|')})$`);
const HTTP_PORT = config.httpPort ?? 3000;
const WEBSOCKET_PORT = config.wsPort ?? 9000;

const getHash = async (path) => new Promise((resolve, reject) => {
    checksum.file(path, (error, sum) => {
        if (error || !sum) {
            reject(error);
            return;
        }
        resolve(sum.substring(0, 10));
    });
});

const injectHashes = async (content) => {
    return await replaceAsync(content, /(href|src)=["'](.*?\.(css|js))["']/g, async (match, attribute, file) => {
        try {
            const hash = await getHash(`${config.watchDir}/${file}`);
            return `${attribute}="${file}?${hash}"`;
        } catch (e) {
            return match;
        }
    });
}

const injectClient = async (content) => {
    const client = (await readFile('./client.js')).toString().replace('config.wsPort', WEBSOCKET_PORT);
    return content.replace('</head>', `<script>${client}</script></head>`);
};

createServer(async (req, res) => {
    try {
        const { pathname } = new URL(req.url, `http://${req.headers.host}`);
        const url = pathname === '/' ? config.entrypoint : pathname;
        const data = await readFile(config.watchDir + url);

        res.writeHead(200);

        if (/\.html$/.test(url)) {
            const content = await injectClient(data.toString());
            res.end(Buffer.from(await injectHashes(content)));
            return;
        }

        res.end(data);
    } catch (e) {
        res.writeHead(404);
        res.end(JSON.stringify(e));
    }
}).listen(HTTP_PORT);

const wss = new WebSocketServer({ port: WEBSOCKET_PORT });

wss.on('connection', (ws) => {
    ws.on('message', async (data) => {
        const { type, value } = JSON.parse(data);

        switch (type) {
            case 'connect':
                ws.location = value.location.replace(/\/$/, '/index.html').replace(/^\//, '');
                if (value.reconnect) {
                    const content = await injectHashes((await readFile(config.watchDir + '/' + ws.location)).toString());
                    send(ws, 'rewrite', content);
                }
                break;
        }
    });
});

const close = () => {
    wss.clients.forEach((ws) => ws.close());
    process.exit();
};

const send = (client, type, value) => client.send(JSON.stringify({ type, value }));

process.on('SIGINT', close);
process.on('SIGQUIT', close);
process.on('SIGTERM', close);

(async () => {
    setTimeout(async () => {
        if (!wss.clients.size) {
            await open(`http://localhost:${HTTP_PORT}`);
        }
    }, 1000);
    const watcher = watch(config.watchDir, { recursive: true });
    for await (const { filename } of watcher) {
        if (FILE_REGEX.test(filename)) {
            const ext = path.extname(filename);
            switch (ext) {
                case '.html':
                    const content = await injectHashes((await readFile(config.watchDir + '/' + filename)).toString());
                    wss.clients.forEach((ws) => {
                        if (ws.location === filename) {
                            send(ws, 'rewrite', content);
                        }
                    });
                    break;
                case '.css':
                case '.js':
                    const hash = await getHash(config.watchDir + '/' + filename);
                    wss.clients.forEach((ws) => {
                        send(ws, 'upgrade', { filename, hash });
                    });
                    break;
            }
        }
    }
})();
