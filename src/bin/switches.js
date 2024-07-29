/*
 * switches.js v0.3.0
 *
 * List of all the switches in node-red server
 *
 * Auther: PptOfCoffee2Go
 * Licence: MIT
 */

"use strict";

console.log('switches.js v0.3.0\n')

const fs = require('node:fs');
const http = require('node:http');
const repl = require('node:repl');

// ---------------
// Start of config

// Server host, port, and AdminRoot (in Node-RED ./setting.js)
const options = {
   host: '127.0.0.1',
   port: '1880',
   path: `/red`
};

// End of config
// -------------


// Syntax candy - logging and debug
const log = (...args) => { console.log(...args); }
const dir = (...args) => { console.dir(...args, {depth:5}); }

// Helpers
const makeCopy = (obj) => JSON.parse(JSON.stringify(obj));
const fnd = (fld, val) => flows.filter(node => node[fld] === val);
const listOfFromClients = () => flows.filter(node => node.name === 'From Client');

// Set terminal colours
const colour = {
	log: (txt='', fg=255, bg=0, efg=255, ebg=0) => process.stdout.write(
		`\x1b[38;5;${fg};48;5;${bg}m${txt}\x1b[38;5;${efg};48;5;${ebg}m`),

	txt: (txt='', fg=255, bg=0, efg=255, ebg=0) =>
		`\x1b[38;5;${fg};48;5;${bg}m${txt}\x1b[38;5;${efg};48;5;${ebg}m`,
}

// Flows from Node-RED
var flows = [];

// Request to running Node-RED server
function noderedRequest(path) {
	return new Promise((resolve, reject) => {
		const opts = makeCopy(options);
		opts.path = opts.path + `/${path}`;
		// Options to be used by request
		colour.log(`\nRequesting: http://${opts.host}:${opts.port}${opts.path}\n`,153);
		// Callback function is used to deal with response
		const callback = (response) => {
			// Continuously update stream with data
			let body = '';
			response.on('data', (data) => {
				body += data;
			});
			response.on('end', () => {
				flows = JSON.parse(body).flows;
				colour.log(`Received ${flows.length} nodes from Node-RED server\n`,153);
				resolve(body.length);
			});
		}
		// Make a request to the server
		try {
			const req = http.request(opts, callback);
			req.setHeader('Node-RED-API-Version', 'v2');
			req.end();
		} catch(err) { dir(err); }
	}).catch(err => { dir(err); })
}

// -------------
var switchCount = 0;
var fromClientCount = 0;
var output = [];

function extractListOfFromClients() {
	let sourceNode = fnd('id', '4c9c46b76b72965f');
	dir(sourceNode);
	sourceNode[0].links.forEach(clientNodeId => {
		if (fnd('id', clientNodeId).length === 0) {
			log(`Node not found ------- ${clientNode}-----------`)
		} else {
			fromClientCount++;
			//dir(fnd('id', clientNodeId));
			let clientNode = fnd('id', clientNodeId)[0];
			let tab = fnd('id', clientNode.z)[0].label;
			if (clientNode.wires && clientNode.wires[0].length){
				clientNode.wires[0].forEach(switchNodeId => {
					let switchNode = fnd('id', switchNodeId)[0];
					//dir(switchNode);
					switchNode.rules.forEach(rule => {
						//dir(rule.v);
						output.push(`|${rule.v.replace('|', ' ')}|${tab}|`)
					})
					switchCount++;
				})
			}
		}
	})
	log('from client count:', fromClientCount);
	log('switch count:', switchCount);
	rt.displayPrompt();
}


// -------------------
// REPL interface
const prompt = colour.txt('switches > ',33,0,7,0);
const submit = (cmd, key) => {// key = {ctrl: true, name: 'l'}
	if (cmd) {
		process.nextTick(() => {
			rt.write(cmd, key);
		});
	}
}

// Node.js REPL command lookup
function mycompleter(line) {
	var completions = [];
	//  const hits = completions.filter((c) => c.startsWith(line));
	if (line === 'xxx') completions = ['sweet'];
	return [completions, line];
}

// Place in REPL context so can be referenced
function resetContext() {
	rt.context.rt = rt;
	rt.context.flows = () => flows;
	rt.context.help = help;
}

// Switch between default and my completer
function toMyCompleter(mine = false) {
	if (mine) {
		rt.completer = (v, cb) => cb(null, mycompleter(v));
	} else { // repl default
		rt.completer = rtcompleter;
	}
}

// REPL runtime
var rt;
var rtcompleter;
function startRepl() {
	rt = repl.start({
		prompt: prompt, useColors: true,
		ignoreUndefined: true, completer: mycompleter
	});
	rtcompleter = rt.completer;

	// If REPL is reset (.clear) - context needs resetting
	rt.on('reset', () => resetContext());

	// Initial context settings
	resetContext();
}

// -------------------
// Startup
startRepl();
noderedRequest('flows')
	.then(() => {
		extractListOfFromClients()
	})
	.then(() => {
		log('\n|Topic|Tab|h');
		log(output.sort().join('\n'));
		rt.displayPrompt();
	})



// -------------------
// -------------------
// Help text
var help = {};

help.cmds = () => {
	colour.log(`help.intro()\n`)
	colour.log(`help.questions()\n`)
	rt.displayPrompt();
}

help.questions = () => {
	colour.log([`Questions: `,
	`Export to [1] flowFile or [2] library ?`,
	``,
	`  Node-RED tabs can be combined into a single flow file`,
	`    or each tab can be individually exported into a directory`,
	`    called a Library`,
	``,
	`Output path/filename (./flows/new.json) ?`,
	`   or`,
	`Output library path (./lib/tw5-node-red/flows/all/) ?`,
	`  `,
	`Overwrite if file exists y/n ?`,
	``,
	`  `,
	].join('\n'),68);
}

help.intro = () => {
colour.log(`Export list of Tabs from local Node-RED server.
   * host: ${options.host} port: ${options.port} AdminRoot: '${options.path}'
--------`,153); colour.log(`
Note:
   In ./setting.js the host must allow default 'read' access
   for this program to query the Node-RED server.
	adminAuth: {
		···
		default: {
			permissions: "read"
		}
	}
`,214); colour.log(`--------
Enter the output filename. The file will be initialized to contain an
empty Node-RED workspace. Normally will want to be in the './flows' directory
for TW5-Node-RED, but can specify any path. Will be asked to confirm overwrite.

Given the file, will then be asked for the tabs to export. Select from the list
displayed. The tabs preceded by '*' indicate tabs required by TW5-Node-RED.

Comma separate the tab numbers (1,2,3,4). Can use a dash '-' to indicate
a sequence of numbers (1-4). To include all TW5-Node-RED required Tabs
use 'tnr' (tnr,11,12). Use 'all' to export all tabs.

https://nodejs.org/api/readline.html#tty-keybindings describes handy hot-keys
to for editing and moving the cursor around.
--------

`,153);
}
