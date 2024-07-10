/*
 * export.js v0.3.0
 *
 * Builds a Node-Red flowFile given a list of the tabs to
 *  collect from a running Node-RED server
 *
 * Auther: PptOfCoffee2Go
 * Licence: MIT
 */

"use strict";

console.log('export.js v0.3.0\n')

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

// Default parameters
var defParams = {
	path: './flows/new.json',
	library:'./lib/tw5-node-red/flows/all',
	overwrite: 'y',
	tabsString: '0,tnr'
}
// TW5-Node-RED tabs
var tnrTabLabels = ['* Startup', '* Network', '* Security',
		'* onConnect', '* Databases', '* Utilities', '* TW Multi Wiki'];


// Outout tabs to a single flowFile or a library directory
var mode = 'file'; // or 'library'

// End of config
// -------------

// -------------
// Working parameters
var inp = {
	path: '',
	library:'',
	overwrite: '',
	tabsString: '',
	tabsParsed: ''
}

// Help text - see end of program
var help = {};

// Flows from Node-RED
var flows = [];
// Nodes to write to file
var toFlowFile = [];

// Helpers
const makeCopy = (obj) => JSON.parse(JSON.stringify(obj));
const fnd = (fld, val) => flows.filter(node => node[fld] === val);
const listOfTabs = () => flows.filter(node => node.type === 'tab');
const listOfTabsIndex = (label) => listOfTabs().findIndex((node) => node.label === label)

// Set terminal colours
const colour = {
	log: (txt='', fg=255, bg=0, efg=255, ebg=0) => process.stdout.write(
		`\x1b[38;5;${fg};48;5;${bg}m${txt}\x1b[38;5;${efg};48;5;${ebg}m`),

	txt: (txt='', fg=255, bg=0, efg=255, ebg=0) =>
		`\x1b[38;5;${fg};48;5;${bg}m${txt}\x1b[38;5;${efg};48;5;${ebg}m`,
}

// TW5-Node-RED tabs that are missing
var tnrTabLabelsMissing = makeCopy(tnrTabLabels);

// Syntax candy - logging and debug
const log = (...args) => { console.log(...args); }
const dir = (...args) => { console.dir(...args); }

// Request to running Node-RED server
function noderedRequest(path) {
	return new Promise((resolve, reject) => {
		const opts = makeCopy(options);
		opts.path = opts.path + `/${path}`;
		// Options to be used by request
		colour.log(`Requesting: http://${opts.host}:${opts.port}${opts.path}\n`,153);
		// Callback function is used to deal with response
		const callback = (response) => {
			// Continuously update stream with data
			let body = '';
			response.on('data', (data) => {
				body += data;
			});
			response.on('end', () => {
				flows = JSON.parse(body).flows;
				colour.log(`  Received ${flows.length} nodes from Node-RED server\n`,153);
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

function checkForMissing() {
	tnrTabLabelsMissing.forEach((tabname, idx) => {
		if (listOfTabsIndex(tabname) > -1) { tnrTabLabelsMissing[idx] = ''; }
	})
	tnrTabLabelsMissing.forEach(tabname => {
		if (tabname) { colour.log(` [info] Missing TW5-Node-RED tab: ${tabname}\n`,214); }
	})
}

function displayListOfTabs() {
	colour.log('\n',153);
	listOfTabs().forEach((tab, idx) => {
		let tnr = tnrTabLabels.includes(tab.label) ? '*' : ' ';
		colour.log(`${tnr}`,40);
		colour.log(`${idx.toString().padStart(2,'0')} - ${tab.id}: ${tab.label}\n`,153);
	})
	checkForMissing();
	colour.log('\n');
}

function setDefParams() {
	inp.path = inp.path || defParams.path;
	inp.library = inp.library || defParams.library.replace(/\/$/, '') + '/';
	inp.overwrite = inp.overwrite || defParams.overwrite;
	inp.tabsString = inp.tabsString || defParams.tabsString;
}

// Verify user allows to overwrite an existing file
// Create empty flowFile
function initFlowFile() {
	toFlowFile = [];
	try {
		if (fs.existsSync(inp.path) && (!(inp.overwrite.toUpperCase() === 'Y'))) {
			colour.log(`${inp.path} already exists\nExiting...\n`,160);
			process.exit();
		}
		fs.writeFileSync(inp.path, '[]');
	} catch(err) {
		dir(err);
	}
}

// -------------
// Parse tabs requested input string
// Converts start-end numbers to a sequence
//  ex: 3-6 becomes 3,4,5,6
// Substitutes 'tnr' to the tabs that are required for TW5-Node-RED apps
// Insures a number
function parseTabsString() {
	var result = [];
	inp.tabsString.split(',').forEach(tabNbr => {
		// Expand when '-' used ie: 3-6
		if (/\d-\d/.test(tabNbr)) {
			let nbrs = tabNbr.split('-');
			nbrs[0] = parseInt(nbrs[0]);
			nbrs[1] = parseInt(nbrs[1]);
			if (nbrs[0] > nbrs[1]) { return; }
			// Seqence of numbers between min-max
			Array(nbrs[1]-nbrs[0]+1).fill().map((element, index) => index + nbrs[0])
				.forEach(nbr => { result.push(nbr); })
		} else if (/tnr/.test(tabNbr)) {
			tnrTabLabels.forEach(label => {
				let idx = listOfTabsIndex(label);
				if (idx > -1) {
					result.push(idx);
				}
			})
		} else if (/all/.test(tabNbr)) {
			listOfTabs().forEach((tab, idx) => {
				result.push(idx);
			})
		} else {
			result.push(parseInt(tabNbr));
		}
	})
	// remove duplicates, sort, and stringify
	inp.tabsParsed = [...new Set(result)].sort((a, b) => a - b).join(',');
	return inp.tabsParsed;
}

function selectTabsForExport() {
	let inpTabNbrs = inp.tabsParsed.split(',');
	inpTabNbrs.forEach(nbr => {
		let tab = listOfTabs()[nbr];
		if (!tab) {
			colour.log(` XX - Skipping invalid tab number ${nbr}\n\n`,164);
		} else {
			toFlowFile.push(tab);
			let nodes = fnd('z', tab.id);
			let tnr = tnrTabLabels.includes(tab.label) ? '*' : ' ';
			colour.log(`${tnr}${nbr.toString().padStart(2,'0')} - ${tab.id}: ${tab.label} - ${nodes.length+1} nodes\n`,156)
			toFlowFile = toFlowFile.concat(nodes);
		}
	})
}

function writeLibrary() {
	let inpTabNbrs = inp.tabsParsed.split(',');
	inpTabNbrs.forEach(nbr => {
		let tab = listOfTabs()[nbr];
		if (!tab) {
			colour.log(` XX - Skipping invalid tab number ${nbr}\n\n`,164);
		} else {
			toFlowFile = []
			toFlowFile.push(tab);
			let nodes = fnd('z', tab.id);
			let tnr = tnrTabLabels.includes(tab.label) ? '*' : ' ';
			toFlowFile = toFlowFile.concat(nodes);

			let filename = tab.label.toLowerCase().replace(/[:\/\& ]/g,'_') + '.json';
			colour.log(`${tnr}${nbr.toString().padStart(2,'0')} - ${tab.id}: ${tab.label} - ${toFlowFile.length} nodes`,156)
			writeFlowFile(inp.library + filename)
		}
	})
}

// Create a single flowFile or selected tabs to library
function writeFlowFile(path) {
	try {
		fs.writeFileSync(path, JSON.stringify(toFlowFile));
		colour.log(`\n    written to file ${path}\n\n`,156);
	} catch(err) {
		dir(err);
	}
}

// -------------
function requestNodeRedTabs() {
	return noderedRequest('flows').then(() => {
		setDefParams();
	})
	.catch(err => { dir(err); })
}

function exportNodeRedTabs(tabsString) {
	inp.tabsString = tabsString;
	parseTabsString();
	if (mode === 'file') {
		colour.log(`\nExporting tabs : ${inp.tabsParsed}\n   to file ${inp.path}\n\n`,156);
		selectTabsForExport();
		writeFlowFile(inp.path);
		reExport();
		return;
	}
	if (mode === 'library') {
		colour.log(`\nExporting tabs : ${inp.tabsParsed}\n    to library ${inp.library}\n\n`,156);
		writeLibrary();
		reExport();
		return;
	}
	colour.log(`\nShould never get here mode !== to 'file' or 'library'`,156);
}

function setCmdList() {
	let cmds = ['exportTabs()','help.cmds()','help.intro()','help.questions()'];
	rt.history = makeCopy(cmds);
}

//-------------------
// Ask for parameters
function reExport() {
	rt.displayPrompt();
	toMyCompleter(false);
	setCmdList();
}

function enterOptions() {
	toMyCompleter(false);
	colour.log('\nNote: Existing flow files will be updated.\n',162);
	colour.log('  If not desired, press cntl-c then cntl-d to exit.\n',162);
	colour.log(['',
		`Use up-arrow/dn-arrow to navigate commands`,
		`Ctrl-u will clear command line\n`,
		`exportTabs() - Answer questions to export Node-RED tabs`,
		`help.cmds()  - help system\n`,
		`''`
	].join('\n'),153);
	setCmdList();
	rt.displayPrompt();
}

function exportTabs(prefix) {
	toMyCompleter(true);
	prefix = prefix || '';
	rt.question(`${prefix}Export to [1] flowFile or [2] library ? `, ans => {
		mode = ans === '1' ? 'file' : ans === '2' ? 'library' : exportTabs('1 or 2 - ');
		if (mode === 'library') {
			inputLibraryInfo();
		} else {
			inputFileInfo();
		}
	})
}

function inputFileInfo() {
	rt.question(`Output file path (${inp.path}) ? `, ans => {
		inp.path = ans.length ? ans : inp.path;
		inputTabsString(); // inputOverwrite();
	})
}

function inputLibraryInfo() {
	rt.question(`Output library path (${inp.library}) ? `, ans => {
		inp.library = ans.length ? ans : inp.library;
		inputTabsString();
	})
}

function inputOverwrite(prefix) {
	prefix = prefix || '';
	rt.question(`${prefix}Overwrite if file exists y/n ? `, ans => {
		inp.overwrite = ans === 'y' ? 'y' : 'n';
		initFlowFile();
		inputTabsString();
	})
}

function inputTabsString() {
	displayListOfTabs();
	rt.question(`Enter comma separated tab numbers to be exported (${inp.tabsString}) : `, ans => {
		inp.tabsString = ans.length ? ans : inp.tabsString;
		exportNodeRedTabs(inp.tabsString);
	})
	setCmdList();

}

// -------------------
// REPL interface
const prompt = colour.txt('> ',33,0,7,0);
const submit = (cmd, key) => {// key = {ctrl: true, name: 'l'}
	if (cmd) {
		process.nextTick(() => {
			rt.write(cmd, key);
		});
	}
}


// -------------------
// Node.js REPL
function mycompleter(line) {
	var completions = [];
	//  const hits = completions.filter((c) => c.startsWith(line));
	if (line === 'xxx') completions = ['sweet'];
	return [completions, line];
}

// Place in REPL context so can be referenced
function resetContext() {
	rt.context.rt = rt;
	rt.context.enterOptions = enterOptions;
	rt.context.exportTabs = exportTabs;
	rt.context.help = help;
}

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
		ignoreUndefined: true, //completer: mycompleter
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
requestNodeRedTabs().then(() => {
	enterOptions();
})


// -------------------
// -------------------
// Help text

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
