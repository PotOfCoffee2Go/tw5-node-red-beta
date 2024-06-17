const fs = require('fs');
const mustache = require("mustache");
var customTags = [ '{%', '%}' ];

// Utilities and helpers
const fieldIsTid = (fld) => /^title\:.*$/gm.test(fld);
const payloadIsJson = (msg) => {
	try {
		JSON.parse(msg.payload);
	} catch(e) {
		return false;
	}
	return true;
}

const templateIsTid = (node) => /^title\:.*$/gm.test(node.template);
const templateIsJson = (node) => {
	try {
		JSON.parse(node.template);
	} catch(e) {
		return false;
	}
	return true;
}

function getNodeTostory(node) {
	return node.updtostory && (node.networkfield.split('.')[1] === 'server') ? (node.tostory ? true : false) : false;
}


// Verify msg
function verifyMsg(msg) {
	if (!msg.topic) return false;
	if (msg.topic === 'network.connected') return true;
	if (!msg.network || !msg.network._clientid ||
		!msg.network.client || !msg.network.server || !msg.network.meta ||
		!msg.network.client.tiddlers || !msg.network.server.tiddlers)
		return false;

	return true;
}

function getTwiki(twikiName, node) {
	const $tw = node.context().global.get('$tw');
	const twikis = node.context().global.get('twikis');
	let twiki = twikis[twikiName] ? twikis[twikiName] : new $tw.Wiki;
	twikis[twikiName] = twiki;
	return twiki;
}

// modified from $tw.utils.parseFields
function tidToFields(text,fields) {
	fields = fields || Object.create(null);
	text.trimStart();
	let lines = text.split(/\r?\n/mg);
	let i = 0, len = lines.length;
	for (i=0;i<lines.length;i++) {
		let line = lines[i];
		if (line) {
			if(line.charAt(0) !== "#") {
				var p = line.indexOf(":");
				if(p !== -1) {
					var field = line.substr(0, p).trim(),
						value = line.substr(p+1).trim();
					if(field) {
						fields[field] = value;
					}
				}
			}
			continue;
		}
		break;
	}
	i++;
	for (x=0;x<i;x++) {
		lines.shift();
	}
	fields.text = lines.join('\n');
	return fields;
}

// Convert tiddler to .tid format
// (todo: find where TW does this?)
function tiddlerToTid(tiddler) {
	let fields = tiddler.fields || tiddler;
	let tid = '';
	Object.keys(fields).forEach((fld) => {
		if (fld !== 'text') {
			if (['created', 'modified','fetched'].indexOf(fld) !== -1) {
				// If date is TW format leave as is
				if (/^\d/.test(fields[fld])) {
					tid += (fld + ': ' + fields[fld] + '\n');
				}	else { // need to convert date to TW format
					tid += (fld + ': ' + $tw.utils.stringifyDate(fields[fld]) + '\n');
				}
			}	else { // not a date field
				tid += (fld + ': ' + fields[fld] + '\n');
			}
		}
	})
	// All fields done - now for the text
	tid += '\n';
	tid += (fields['text'] ? fields['text'] : '');

	tid += '\n'; // insure last line has a linefeed
	tid.replace(/\n+$/,'\n'); // Remove extra trailing linefeeds
	return tid;
}

function updateFromPayload(network, node, msg) {
	let networkfield = node.networkfield;
	// Check payload for a .tid title
	if (msg.payload && typeof msg.payload === 'object') {
		if (!Array.isArray(msg.payload)) msg.payload = [msg.payload];
		msg.payload.forEach(tiddler => {
			if (networkfield === 'network.client.tiddlers') {
				network.client.tiddlers.push(tiddler);
			} else if (networkfield === 'network.server.tiddlers') {
				network.server.tiddlers.push(tiddler);
			} else if (networkfield === 'network.meta.tiddlers') {
				network.meta.tiddlers.push(tiddler);
			}
		})
	} else if (msg.payload && fldIsTid(msg.payload)) {
		let payload = msg.payload//.replace(/\\n/g, '\n');
		if (networkfield === 'network.client.tiddlers') {
			network.client.tiddlers.push(tidToFields(payload));
		} else if (networkfield === 'network.server.tiddlers') {
			network.server.tiddlers.push(tidToFields(payload));
		} else if (networkfield === 'network.meta.tiddlers') {
			network.meta.tiddlers.push(tidToFields(payload));
		}
	}
}

function updateFileFromNetwork(network, node, msg) {

}


function updateNetworkFromTemplate(network, node, msg) {
	var tiddlers = [];
	// Check template for a .tid title
	if (templateIsTid(node)) {
		tiddlers = arrayOfTids(node.template, msg);
	} else if (templateIsJson(node)) {
		tiddlers = JSON.parse(node.template);
		if (!Array.isArray(tiddlers)) tiddlers = [tiddlers];
	}
	return tiddlers;
}

function updateFieldFromTemplate(field, node, msg) {
	var tiddlers = [];
	// Check template for a .tid title
	if (templateIsTid(node)) {
		tiddlers = arrayOfTids(node.template, msg);
	} else if (templateIsJson(node)) {
		tiddlers = JSON.parse(node.template);
		if (!Array.isArray(tiddlers)) tiddlers = [tiddlers];
	}
	return tiddlers;
}


function updateTwikiFromTemplate(twiki, node, msg) {
	// Check template for a .tid title
	if (node.editorIsX) {
		if (templateIsTid(node)) {
			twiki.addTiddlers(arrayOfTids(node.template, msg))
		}
		else if (templateIsJson(node)) {
			var tiddlers = JSON.parse(node.template);
			if (!Array.isArray(tiddlers)) tiddlers = [tiddlers];
			tiddlers.forEach(tiddler => {
			})
			twiki.addTiddlers(tiddlers);
		}
	}
}

function wikiMsg(node, _topic, msg = {} ) {
	var topic = _topic || msg.topic || 'need.topic';

	let network = msg.network || {
		meta: { source: 'Node-Red', version: 'v3.1.9', location: node.type, _clientid: node.id, tiddlers: [] },
		client: { topic, sender: [{title: 'Node-Red'}], tiddlers:[] },
		server: { topic: 'server.tiddlers', tiddlers: [], storylist: [], deletelist: [] }
	};
	if (node.networkfield === 'network.server.tiddlers' && node.topic.length) {
		network.server.topic = node.topic;
	}

	let newmsg = { topic, network };
	return Object.assign({}, msg, newmsg);
}

function getStoryArray(tiddlers, titles = []) {
	tiddlers.forEach(tiddler => {
		if (!titles.includes(tiddler.title)) {
			titles.push(tiddler.title);
		}
	})
	return titles;
}

function arrayOfTids(inTids, msg = {}) {
	let tid = [], tiddlers = [];
	let lines = inTids.split('\n');
	for (let idx=0; idx<lines.length; idx++) {
		if (lines[idx] === '+======+') {
			tiddlers.push(tidToFields(tid.join('\n')));
			tid = [];
		} else { // skip leading whitespacce
			if (tid.length === 0 && lines[idx].length === 0) continue;
			tid.push(lines[idx]);
		}
	}
	// Last tiddler
	if (tid.length) {
			tiddlers.push(tidToFields(tid.join('\n')));
	}
	for (let i=0; i<tiddlers.length; i++) {
		if (tiddlers[i].text && tiddlers[i].mustache === 'yes') {
			for (fld in tiddlers[i]) {
				tiddlers[i][fld] = mustache.render(tiddlers[i][fld], msg, {}, customTags);
			}
		}
	}
	return tiddlers;
}

function dirOfTids(path, msg) {
	const fullPath = path;
	return fs.promises.readdir(fullPath, { withFileTypes: true })
		.then(async (dirents) => {
			let allFilesRead = [];
			let allFileData = [];
			for (let idx = 0; idx < dirents.length; idx++) {
				if (dirents[idx].isFile() && /\.tid$/.test(dirents[idx].name)) {
					let filePromise = fs.promises.readFile(fullPath + '/' + dirents[idx].name, 'utf8')
						.then((data) => {
							allFileData.push(data);
						});
					allFilesRead.push(filePromise);
				}
			}
			await Promise.all(allFilesRead);
			return allFileData;
		})
		.then((allFileData) => {
			let tiddlers = [];
			allFileData.forEach(data => {
				tiddlers = tiddlers.concat(arrayOfTids(data, msg));
//				tiddlers.push(tidToFields(mustache.render(data, msg, {}, customTags)))
			})
			return tiddlers;
		})
		.catch(err => {
			return [];
		})
}

module.exports = {
	fieldIsTid: fieldIsTid,
	payloadIsJson: payloadIsJson,
	templateIsTid: templateIsTid,
	templateIsJson: templateIsJson,
	getNodeTostory: getNodeTostory,
	verifyMsg: verifyMsg,
	getTwiki: getTwiki,
	tidToFields: tidToFields,
	tiddlerToTid: tiddlerToTid,
	updateFromPayload: updateFromPayload,
	updateFileFromNetwork: updateFileFromNetwork,
	updateNetworkFromTemplate: updateNetworkFromTemplate,
	updateTwikiFromTemplate: updateTwikiFromTemplate,
	updateFieldFromTemplate: updateFieldFromTemplate,
	wikiMsg: wikiMsg,
	getStoryArray: getStoryArray,
	arrayOfTids: arrayOfTids,
	dirOfTids: dirOfTids
}
