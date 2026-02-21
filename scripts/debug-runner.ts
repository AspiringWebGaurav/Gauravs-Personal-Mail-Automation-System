// Shim for server-only package
import { createRequire } from 'module';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

const require2 = createRequire(import.meta.url);
const shimDir = join(dirname(require2.resolve('next/package.json')), '..', 'server-only');

if (!existsSync(join(shimDir, 'package.json'))) {
    mkdirSync(shimDir, { recursive: true });
    writeFileSync(join(shimDir, 'index.js'), '');
    writeFileSync(join(shimDir, 'package.json'), '{"name":"server-only","main":"index.js"}');
}

import { MailRunner } from '../src/lib/server/mailRunner';

async function main() {
    try {
        console.log('Running processQueue()...');
        const res = await MailRunner.processQueue();
        console.log('Success:', res);
    } catch (e) {
        console.error('CRASHED WITH ERROR:', e);
    }
}

main();
