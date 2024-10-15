/*
 * Author: @poc2go at talk.tiddlywiki.org
 * License: MIT
 * Description: Runs a node.js REPL with '$tw' installed.
 *
 * Usage:

npm install http://github.com/PotOfCoffee2Go/mws-repl.git
cd mws-repl
npm install
npm start

 *
*/

// TW output path
//  is where 'edition/multiwikiserver' tiddlywiki.info lives
const editionFolder = './public/mws';
// Port and host for multi wiki server
//  'host=0.0.0.0' will make available on local network
const mwsServerCommand = ['--listen','port=9200','host=127.0.0.1'];
// Port and host for sync server
//  'host=0.0.0.0' will make available on local network
const syncServerCommand = ['--listen','port=8101','host=127.0.0.1'];
// Prevent node-red from restarting REPL when deploying changes
var isStarted = false;

// -------------------
// REPL interface
const colour = {
	log: (txt='', fg=255, bg=0, efg=255, ebg=0) => process.stdout.write(
		`\x1b[38;5;${fg};48;5;${bg}m${txt+'\n'}\x1b[38;5;${efg};48;5;${ebg}m`),
	txt: (txt='', fg=255, bg=0, efg=255, ebg=0) =>
		`\x1b[38;5;${fg};48;5;${bg}m${txt}\x1b[38;5;${efg};48;5;${ebg}m`,
}

// Syntax candy
const log = (...args) => { colour.log(...args); }
const dbg = (property, depth=0) => { console.dir(property, {depth}); }
const makeCopy = (obj) => JSON.parse(JSON.stringify(obj));

const prompt = colour.txt('$tnr-repl> ',33,0,7,0);
const submit = (cmd, key, repeat = 1) => { // key = {ctrl: true, name: 'l'}
	for (let i = 0; i < repeat; i++) {
		process.nextTick(() => { rt.write(cmd, key); });
	}
}

// -------------------
// TiddlyWiki commander
// commander got an error?
function checkForErrors(tw, err) {
	if (err) {
		try {
			tw.utils.error("Error: " + err);
		} catch (e) {}
	}
}

// Create $tw.Commander to do... commands
const cmdr = {
	execute: (tw, cmds) => {
		new tw.Commander(cmds, checkForErrors, tw.wiki).execute();
	}
}

// -------------------
// Node'js REPL
// Place $tw in REPL context so can be referenced
var rt;
var tnrContext;
const history = ['.docs', `dbg(tnr)`];

// REPL runtime
function startRepl() {
//	rt = require('node:repl').start({
	rt = require('pretty-repl').start({
			prompt: prompt, useColors: true,
			ignoreUndefined: true, /*completer: completer*/
	});
	rt.on('reset', () => resetContext());
	resetContext();
}

function resetContext() {
	rt.context.rt = rt;
	rt.context.log = log;
	rt.context.dbg = dbg;
	rt.context.ctx = tnrContext;

	rt.context.tnr = {};
	tnrContext.keys().forEach(key => {
		rt.context.tnr[key] = tnrContext.get(key);
	})
	// express 'app' of the admin api server
	rt.context.tnr.app = rt.context.tnr.RED.httpAdmin.parent;
}

// -------------------
// Startup
function startup(tnr_context) {
	tnrContext = tnr_context;

	// Show prompt on Node-RED re-deploy
	if (isStarted) {
		rt.context.tnr = {};
		tnrContext.keys().forEach(key => {
			rt.context.tnr[key] = tnrContext.get(key);
		})
		setTimeout(() => { rt.displayPrompt(); }, 250);
		return;
	}
	isStarted = true;
	setTimeout(() => {
		log('-------------------',75);
		log('Startup REPL', 75);
		log('-------------------',75);
		startRepl();
		rt.history = JSON.parse(JSON.stringify(history));
		require('./docs.js').startup(rt);
	},2000);
}

module.exports = {
	startup: startup
}
