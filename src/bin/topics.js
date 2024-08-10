/*
 * topics.js
 *
 * List of the TW5-Node-RED topics in node-red server
 *
 * Auther: PotOfCoffee2Go
 * Licence: MIT
 */
"use strict";
console.log('topics.js v0.4.0\n')

// ---------------
// Config
// Server host, port, and AdminRoot (in Node-RED ./setting.js)
// Source 'From Client' node id in the Node-RED Editor 'Network' tab
const options = {
   host: '127.0.0.1',
   port: '1880',
   path: `/red`,
   clientMsgSrcNodeId: '4c9c46b76b72965f'
};

// Set terminal colours
const colour = {
	log: (txt='', fg=255, bg=0, efg=255, ebg=0) => process.stdout.write(
		`\x1b[38;5;${fg};48;5;${bg}m${txt}\x1b[38;5;${efg};48;5;${ebg}m`),
	txt: (txt='', fg=255, bg=0, efg=255, ebg=0) =>
		`\x1b[38;5;${fg};48;5;${bg}m${txt}\x1b[38;5;${efg};48;5;${ebg}m`,
}

// Syntax candy - logging, debug
const log = (...args) => { console.log(...args); }
const dir = (...args) => { console.dir(...args, {depth:5}); }

// Helpers
const makeCopy = (obj) => JSON.parse(JSON.stringify(obj));
const fnd = (fld, val) => flows.filter(node => node[fld] === val);
const listOfFromClients = () => flows.filter(node => node.name === 'From Client');
const formatRule = (rule) => rule.replace('|', ' ');
const formatName = (name) => name.replace(/ \\n.*$/, ' \\n · · ·');
const byTopic = (a,b) => ((a.topic < b.topic) ? -1 : ((a.topic > b.topic) ? 1 : 0));
const byTab = (a,b) => ((a.tab < b.tab) ? -1 : ((a.tab > b.tab) ? 1 : 0));
const makeButton = (topic) => `<$button actions="<<node-red '${topic}'>>"> ${topic} </$button>`;

// Global data
//  Source 'From Client' node in the 'Network' tab
//  Flows from Node-RED
//  Topics from switch nodes
var clientMsgSrcNode;
var flows = [];
var topics = [];
var switchCount = 0;
var fromClientCount = 0;

// Request from running Node-RED server
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
			response.on('data', (data) => { body += data; });
			response.on('end', () => {
				flows = JSON.parse(body).flows;
				colour.log(`Received ${flows.length} nodes from Node-RED server\n`,153);
				resolve(body.length);
			});
		}
		// Make a request to the server
		try {
			const req = require('node:http').request(opts, callback);
			req.setHeader('Node-RED-API-Version', 'v2');
			req.end();
		} catch(err) { dir(err); }
	}).catch(err => { dir(err); })
}

// Topic information from switch following the 'From Client' node
function clientNodeTopicInfo(clientNodeId) {
	let clientNode = fnd('id', clientNodeId)[0];
	let tab = fnd('id', clientNode.z)[0].label;
	if (clientNode.wires && clientNode.wires[0].length) {
		clientNode.wires[0].forEach(switchNodeId => {
			let switchNode = fnd('id', switchNodeId)[0];
			switchNode.rules.forEach(rule => {
				topics.push({
					tab: tab,
					name: formatName(switchNode.name),
					topic: formatRule(rule.v)
				});
			})
			switchCount++;
		})
	}
}

// Nodes that the source node is linked to
function extractListOfFromClientNodes() {
	clientMsgSrcNode = fnd('id', options.clientMsgSrcNodeId);
	clientMsgSrcNode[0].links.forEach(clientNodeId => {
		if (fnd('id', clientNodeId).length === 0) {
			log(`Node not found ------- ${clientNodeId}-----------`)
		} else {
			clientNodeTopicInfo(clientNodeId);
			fromClientCount++;
		}
	})
}

// -------------------
// REPL
var rt;
var completions = [
	'ctx.outputTopicTable()',
	'ctx.sortByTopic()', 'ctx.sortByTab()',
	'ctx.clientMsgSrcNode', 'ctx.topics', 'ctx.flows',
	'ctx.fromClientCount', 'ctx.switchCount',
];

// REPL global data access
const ctx = {
	get clientMsgSrcNode () { return clientMsgSrcNode },
	get flows () { return flows },
	get topics () { return topics },
	get fromClientCount () { return fromClientCount },
	get switchCount () { return switchCount },

	outputTopicTable: () => {
		colour.log(`\n|Tab|Name|Topic|Send|h\n`,153);
		topics.forEach(switchNode => {
			colour.log(`|${switchNode.tab}|${switchNode.name}|${switchNode.topic}|` +
				makeButton(switchNode.topic) + `|\n`,153);
		})
		colour.log(`\n`,153);
	},

	sortByTopic: () => { topics.sort(byTopic);ctx.outputTopicTable(); },
	sortByTab: () => { topics.sort(byTab);ctx.outputTopicTable(); },
}

// REPL interface
const prompt = colour.txt('topics > ',33,0,7,0);
const submit = (cmd, key, repeat = 1) => { // key = {ctrl: true, name: 'l'}
	for (let i = 0; i < repeat; i++) {
		process.nextTick(() => { rt.write(cmd, key); });
	}
}

// REPL context
function resetContext() {
	rt.context.rt = rt;
	rt.context.ctx = ctx;
	rt.context.help = help;
}

// Initialize REPL history with app specific commands
function setHistoryWithCtxCmds() {	rt.history = makeCopy(completions); }

// REPL runtime
function startRepl() {
	rt = require('node:repl').start({
		prompt: prompt, useColors: true, ignoreUndefined: true
	});
	// If REPL is reset (.clear) - context needs resetting
	rt.on('reset', () => resetContext());
	// Initial context
	resetContext();
}

// -------------------
// Help text
function help() {
	colour.log([
	'ctx.outputTopicTable()',
	'ctx.clientMsgSrcNode', 'ctx.topics', 'ctx.flows', 'ctx.nodeCounts()',
	'ctx.sortByTopic()', 'ctx.sortByTab()',
	'ctx.fromClientCount', 'ctx.switchCount\n'
	].join('\n'), 153)};

// -------------------
// App startup
startRepl();
//help();
noderedRequest('flows').then(() => {
	extractListOfFromClientNodes();
	setHistoryWithCtxCmds();
	colour.log('\nUp-arrow to see commands\n\n',153);
	// Display context (ctx) properties
	rt.displayPrompt();
	submit('ctx.');
	submit('', {name: 'tab'}, 2);
	submit('', {name: 'backspace'}, 4);
})
