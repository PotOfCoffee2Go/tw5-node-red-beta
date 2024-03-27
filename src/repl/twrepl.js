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
// Run ./bin/test.sh script - may need backslashes in windows?
const runTestCommand = 'cd ./node_modules/tiddlywiki && ./bin/test.sh';

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
const prompt = colour.txt('$mws-repl> ',33,0,7,0);
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

// Show objects 5 levels deep
function showObj(obj) {
	console.dir(obj, {depth:5});
}

// Help and Test suite
const help = require('./help').Help(colour, submit, prompt);
const tests = require('./tests').Tests(colour, submit, prompt);

// -------------------
// Run TiddlyWiki tests
function runTests() {
	const { spawn } = require('child_process');
	const child = spawn(runTestCommand, {
		stdio: 'inherit',
		shell: true
	});
	child.on('exit', function (code, signal) {
		console.log(`./bin/test.sh exited with code ${code}\n`);
		colour.log(`Web page at 'http://localhost:8080/node_modules/tiddlywiki/editions/test/output/test.html'\n`, 11);
		submit('\n');
	});
}

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

	runtime.context.tnr_context = tnr_context;
	runtime.context.$tw = $tw;
	runtime.context.$twsync = $twsync;
	runtime.context.$twmws = $twmws;
	runtime.context.twikis = twikis;
	runtime.context.clientIds = clientIds;

	runtime.context.sendTiddlers = sendTiddlers;

	runtime.context.showObj = showObj;
	runtime.context.tests = tests;
	runtime.context.runTests = runTests;
	runtime.context.help = help;
	runtime.context.runtime = runtime;
}

// REPL runtime
var runtime;
function startRepl() {
	runtime = require('node:repl').start({
			prompt: prompt, useColors: true,
			ignoreUndefined: true, /*completer: completer*/
	});

	// If REPL is reset (.clear) - context needs resetting
	runtime.on('reset', () => resetContext());

	// Initial context settings
	resetContext();
}

function sendTiddlers(clientid, tiddlers, tostory) {
	var storylist = [];
	if (clientid === 'all') {
		var allIds = [];
		for(let cid in clientIds) {
			allIds.push(cid);
		}
		clientid = allIds;
	}
	if (!Array.isArray(clientid)) { clientid = [clientid]; };
	if (!Array.isArray(tiddlers)) { tiddlers = [tiddlers]; };
	if (tostory) {
		tiddlers.forEach((tiddler) => {
			storylist.push(tiddler.title);
		})
	}

	var text = JSON.stringify({
		topic: 'server.tiddlers',
		clientid,
		network: {
			meta: { source: 'repl', version: 'v' + $tw.version, _clientid: `repl${$tw.version}`, tiddlers: [] },
			client: { topic: 'from.repl', sender: [{title: 'barebones'}], tiddlers: [] },
			server: { topic: 'server.tiddlers', tiddlers, storylist }
		}
	});
	const title = 'repl' + Math.random().toString().substr(-5);
	twikis.twReplOut.addTiddler(new $tw.Tiddler(
		$tw.wiki.getCreationFields(),
		$tw.wiki.getModificationFields(),
		{title, text}
	))
	return {clientid, tiddlers, tostory};
}

// -------------------
// -------------------
// Startup
var tnr_context, $tw, $twsync, $twmws, twikis, clientIds;
function startup (_tnr_context) {
	tnr_context = _tnr_context;
	$tw = tnr_context.get('$tw');
	$twsync = tnr_context.get('$twsync');
	$twmws = tnr_context.get('$twmws');
	twikis = tnr_context.get('twikis');
	clientIds = tnr_context.get('clientIds');

	// Show prompt when startup done
	setTimeout(() => {
		if (isStarted) {
			setTimeout(() => { submit('', prompt); }, 500);
			return;
		}
		isStarted = true;
		colour.log('-------------------\n',75);
		colour.log('Startup REPL\n', 75);
		colour.log('-------------------\n',75);
		startRepl();
		submit('{ versions: { $tw: $tw.version, $twsync: $twsync.version, $twmws: $twmws.version }}\n');
		submit('Object.keys(twikis)\n');
		submit(`help.intro()\n`);
	}, 2000);
}

module.exports = {
	startup: startup,
	colour: colour,
	submit: submit,
	prompt: prompt
}
