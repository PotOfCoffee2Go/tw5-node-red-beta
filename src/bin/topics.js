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

// Syntax candy
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
//  Switches that contain rules for topic
//  Topics from switch nodes
var clientMsgSrcNode;
var flows = [];
var switches = [];
var topics = [];

// Request from running Node-RED server
function noderedRequest(path) {
	return new Promise((resolve, reject) => {
		const opts = makeCopy(options);
		opts.path = opts.path + `/${path}`;
		colour.log(`\nRequesting: http://${opts.host}:${opts.port}${opts.path}\n`,153);

		const callback = (response) => {
			let body = '';
			response.on('data', (data) => { body += data; });
			response.on('end', () => {
				try { flows = JSON.parse(body).flows; } catch(e) { log(body); }
				colour.log(`Received ${flows.length} nodes from Node-RED server\n`,153);
				resolve(body.length);
			});
		}

		try {
			const req = require('node:http').request(opts, callback);
			req.setHeader('Node-RED-API-Version', 'v2');
			req.end();
		} catch(err) { dir(err); }
	}).catch(err => { dir(err); })
}

// Topic information from switches following the 'From Client' node
function clientNodeTopicInfo(clientNodeId) {
	let clientNode = fnd('id', clientNodeId)[0];
	let tab = fnd('id', clientNode.z)[0].label;
	if (clientNode.wires && clientNode.wires[0].length) {
		clientNode.wires[0].forEach(switchNodeId => {
			let switchNode = fnd('id', switchNodeId)[0];
			switchNode.tab = tab;
			switches.push(switchNode);
			switchNode.rules.forEach(rule => {
				let topic = makeCopy(switchNode);
				topic.name = formatName(switchNode.name);
				topic.topic = formatRule(rule.v);
				topic.button = makeButton(topic.topic);
				topics.push(topic);
			})
		})
	}
}

// Nodes that the source From Client node is linked to
function extractListOfFromClientNodes() {
	if (flows.length === 0) { return false; }
	clientMsgSrcNode = fnd('id', options.clientMsgSrcNodeId);
	clientMsgSrcNode[0].links.forEach(clientNodeId => {
		if (fnd('id', clientNodeId).length === 0) {
			log(`Node not found ------- ${clientNodeId}-----------`)
		} else {
			clientNodeTopicInfo(clientNodeId);
		}
	})
	return true;
}

// Output topics as a WikiText table
function outputTable(fields = '|tab|name|topic|', header = '|Tab|Node name|Topic|h') {
	var lines = [ header ];
	const flds = fields.toLowerCase().split('|');
	topics.forEach(topic => {
		let line = '|';
		flds.forEach(fld => {
			if (fld) { line += (topic[fld] + '|'); }
		})
		lines.push(line);
	})
	colour.log(lines.join('\n')+'\n', 153);
}

// -------------------
// REPL
var rt;
var completions = [
	`cmd.outputTable('|tab|name|topic|', '|Tab|Node name|Topic|h')`,
	'cmd.sortByTopic()', 'cmd.sortByTab()',
	'cmd.clientMsgSrcNode',	'cmd.topics', 'cmd.switches', 'cmd.flows',
];

// REPL global data access
const cmd = {
	get clientMsgSrcNode () { return clientMsgSrcNode },
	get flows () { return flows },
	get switches () { return switches },
	get topics () { return topics },
	sortByTopic: () => { switches.sort(byTopic); topics.sort(byTopic); },
	sortByTab: () => { switches.sort(byTab); topics.sort(byTab); },
	outputTable: (f,h) => { outputTable(f,h) },
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
	rt.context.cmd = cmd;
}

// Initialize REPL history with app specific commands
function setHistoryWithCtxCmds() { rt.history = makeCopy(completions); }

// REPL runtime
function startRepl() {
	rt = require('node:repl').start({
		prompt: prompt, useColors: true, ignoreUndefined: true
	});
	rt.on('reset', () => resetContext());
	resetContext();
}

// -------------------
// App startup
startRepl();
noderedRequest('flows').then(() => {
	if (extractListOfFromClientNodes()) {
		setHistoryWithCtxCmds();
		colour.log('\nUp-arrow to see commands\n\n',153);
		// Display context (cmd) properties
		submit('cmd.');
		submit('', {name: 'tab'}, 2);
		submit('', {name: 'backspace'}, 4);
	}
	rt.displayPrompt();
})
