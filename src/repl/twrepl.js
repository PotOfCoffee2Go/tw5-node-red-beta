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
 * Enjoy ;)
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
// Prevent node-red from restarting wen deploying changes
var isStarted = false;

// -------------------
// REPL interface
const colour = {
	log: (txt='', fg=255, bg=0, efg=255, ebg=0) => process.stdout.write(
		`\x1b[38;5;${fg};48;5;${bg}m${txt}\x1b[38;5;${efg};48;5;${ebg}m`),

	txt: (txt='', fg=255, bg=0, efg=255, ebg=0) =>
		`\x1b[38;5;${fg};48;5;${bg}m${txt}\x1b[38;5;${efg};48;5;${ebg}m`,
}
const prompt = colour.txt('$tnr-repl> ',33,0,7,0);
const submit = (cmd, desc) => {
	if (desc) {
		if (desc === prompt) {
			colour.log(`${prompt}`);
		} else {
			colour.log(desc, 10);
			colour.log(`\n${prompt}`);
		}
	}
	if (cmd) {
		runtime._ttyWrite(cmd);
	}
}

// Help and Test suite
const extra = require('./extra');
const help = require('./help').Help(colour, submit, prompt);

// -------------------
// Who are we?
//const pkg = require('./package.json');
function intro() {
	colour.log( `${pkg.name}: `,75); colour.log(`v${pkg.version}\n\n`,130);
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
function resetContext() {
	runtime.context.tnr = tnr;
	tnr.keys().forEach(key => {
		runtime.context[key] = tnr.get(key);
	})

	extra.init(tnr);
	runtime.context.runTests = extra.runTests;
	runtime.context.sendTiddlers = extra.sendTiddlers;
	runtime.context.help = help;
}

// REPL runtime
var runtime;
function startRepl() {
//	runtime = require('node:repl').start({
	runtime = require('pretty-repl').start({
			prompt: prompt, useColors: true,
			ignoreUndefined: true, /*completer: completer*/
	});

	// If REPL is reset (.clear) - context needs resetting
	runtime.on('reset', () => resetContext());

	// Initial context settings
	resetContext();
}

// -------------------
// -------------------
// Startup
var tnr;
function startup (tnr_context) {
	tnr = tnr_context;

	// Show prompt on Node-RED re-deploy
	if (isStarted) {
		setTimeout(() => { submit('', prompt); }, 500);
//		runtime.resetContext();
//		if (tnr_context.get('RED')) {
//			 tnr_context.get('RED').log.info('REPL context updated');
//		}
		return;
	}
	isStarted = true;
	setTimeout(() => {
		colour.log('-------------------\n',75);
		colour.log('Startup REPL\n', 75);
		colour.log('-------------------\n',75);
		startRepl();
		submit(`help.intro()\n`);
	},2000);
}

module.exports = {
	startup: startup,
	colour: colour,
	submit: submit,
	prompt: prompt
}
