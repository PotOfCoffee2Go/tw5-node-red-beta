#!/usr/bin/env node

/* Script starts 'server' edition for the given app name and port
 * If the ./public/app/appname directory is not present will
 *   '--init server' before --listen
 *
 * Can include tiddlers in the TiddlyWiki by adding them to
 *  './src/tiddlywiki/sync/tiddlers.json'
 *
 * host=0.0.0.0 would allow remote access
 */

const fs = require('node:fs');
const process = require('node:process');

const boot = require('./src/tiddlywiki/sync/boot.js');

// Get app name and options
const argv = Array.prototype.slice.call(process.argv,2);

// App name given?
if (argv.length === 0) {
    console.log([
    'Application name required',
    'Example of default values:',
    'npm run syncserver appname port=8080 host=127.0.0.1 dir=./public/app/appname',
    'host=0.0.0.0 would allow remote access'
    ].join('\n'));
    return;
}

// Sane application name?
if (!/^\w+$/.test(argv[0])) {
    console.log('Application name can only contain letters/numbers/underbar')
    return;
}

// Default options
const opts = {
    app: argv[0],
    port: '8080',
    host: '127.0.0.1', // 0.0.0.0 = allow remote access
    dir: `./public/app/${argv[0]}`
};

// Get params and place override/add to options
for (let x=1; x<argv.length; x++) {
    let arg = /(\w+)=(.+$)/.exec(argv[x]);
    if (arg) { opts[arg[1].trim()] = arg[2].trim(); }
}

// Spawn to --init directory
function initApp() {
    return new Promise((resolve) => {
        var child = require('child_process').exec(`tiddlywiki ${opts.dir} --init server`)
        child.stdout.pipe(process.stdout)
        child.on('exit', () => {
            resolve();
        })
    })
}

function listen(commands) {
    const { $twsync } = boot.tiddlywiki(opts.dir);
    // TiddlyWki commander got an error?
    function checkForErrors(err) {
        if (err) {
            try {
                $twsync.utils.error("Error: " + err);
            } catch (e) {}
        }
    }

    // Create $twsync.Commander to do listen command
    const cmdr = {
        execute: (cmds) => {
            const cc = new $twsync.Commander(cmds, checkForErrors, $twsync.wiki);
            cc.execute();
        }
    }
    cmdr.execute(commands);
}

// -----------------------

const commands = ['--listen', `port=${opts.port}`, `host=${opts.host}`];

if (!fs.existsSync(opts.dir)) {
    initApp().then(() => listen(commands));
} else {
    listen(commands)
}

