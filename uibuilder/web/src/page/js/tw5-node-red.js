"use strict";
// v0.2.0
const tokenBearer = {
	'title':'$:/temp/tw5-node-red/store',
	'created':'20240204213930298',
	'modified':'20240204213930298',
	'type':'application/json',
	'text':'{ \"title\": \"$:/temp/tw5-node-red/store\" }',
	'token':''
}
// To-do: tiddler sent when server has authorized user
const serverAuthorized = '$:/temp/tw5-node-red/authorized';

const noderedUtils = {
	// modified from $tw.utils.parseFields
	tidToFields: (text,fields) => {
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
		for (let x=0;x<i;x++) {
			lines.shift();
		}
		fields.text = lines.join('\n');
		return fields;
	},

	arrayOfTids: (inTids) => {
		let tid = [], tiddlers = [];
		let lines = inTids.split('\n');
		for (let idx=0; idx<lines.length; idx++) {
			if (lines[idx] === '+======+') {
				tiddlers.push(noderedUtils.tidToFields(tid.join('\n')));
				tid = [];
			} else { // skip leading whitespacce
				if (tid.length === 0 && lines[idx].length === 0) continue;
				tid.push(lines[idx]);
			}
		}
		// Last tiddler
		if (tid.length) {
			tiddlers.push(noderedUtils.tidToFields(tid.join('\n')));
		}
		return tiddlers;
	},

	// Convert tiddler to .tid format
	// (todo: find where TW does this?)
	tiddlerToTid: (tiddler) => {
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
	},

	arrayOfTiddlers: (tiddlers) => {
		var tids = [];
		if (!Array.isArray(tiddlers)) tiddlers = [tiddlers];
		tiddlers.forEach(tid => {
			tids.push(noderedUtils.tiddlerToTid(tid));
		})
		tids = tids.join('+======+\n');
		return tids;
	}


}


// Network interface
const nodered = {
	version: '1.0.0',

	// Path to uibuilder library on server
	socketLibrary: '/uibuilder/uibuilder.iife.min.js',

	// Unique 16 char identifier for this instance
	// UUIDv4 for client id generation - see initialize()
	_clientid: 'Not Assigned',
	uuidv4: () => {
	  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16))
	},

	// Called after nodered has loaded
	onLoad: async () => {},

	// Assign function to process every message sent to server
	// Excludes 'heartbeats'
	// To skip sending - return msg = '';
	onSendMsg: async (msg) => { return msg; },

	// Assign function to process every message received from server
	// To skip default processing - return msg = '';
	onRecvMsg: async (msg) => { return msg; },

	// Convert Array of tiddlers to .tid format
	tiddlersToTid: (tiddlers) => {
		return noderedUtils.arrayOfTiddlers(tiddlers);
	},

	// Create the network message
	//  meta = Can be used for Status and state information
	//    Note: _clientid is a required field
	//  client = requested topic, sender ($(currentTiddler)$ without 'text'),
	//    tiddlers (based on sendFilter)
	//  server = default server topic, empty tiddler array for Node-Red to populate
	createMessage: (topic, selector = '', sendTiddlers = '') => {
		if (!Array.isArray(sendTiddlers)) [sendTiddlers];
		return {
			meta: { source: 'HTML', version: nodered.version,
				location: window.location, _clientid: nodered._clientid, tiddlers: [tokenBearer] },
			client: { topic, selector, sender: [{title: 'web page', selector, userid: 'Guest'}],
				tiddlers: noderedUtils.arrayOfTids(sendTiddlers) },
			server: { topic: 'server.tiddlers', tiddlers: [], storylist: [] }
			};
	},

	// Emit a topic, selector and network object to the server
	//  use nodered topic() which calls emit
	emit: (topic, selector, network) => {
		let msg = {
			'topic': topic,
			'selector': selector,
			'network': network,
		}
		nodered.onSendMsg(msg).then((smsg) => {
			if (smsg) uibuilder.send(smsg);
		})
	},

	// Send barebones message with just a topic and selector
	bones: (topic, selector = '') => {
		nodered.emit(topic, selector, {
			meta: { source: 'HTML', version: nodered.version, _clientid: nodered._clientid, tiddlers: [tokenBearer] },
			client: { topic, selector, sender: [{title: 'barebones'}], tiddlers: [] },
			server: { topic: 'server.tiddlers', tiddlers: [], storylist: [] }
		});
	},

	// Send barebones message with just a topic and selector
	topic: (topic, selector = '', sendTiddlers = '') => {
		nodered.emit(topic, selector, nodered.createMessage(topic, selector, sendTiddlers));
	},

	// Add field.text to page using fields.selector
	fieldsToPage: (fields) => {
		if (fields.selector && fields.selector.length) {
			const elems = document.querySelectorAll(fields.selector);
			elems.forEach((elem) => {
				if (fields.insertHTML) {
					elem.insertAdjacentHTML(fields.insertHTML, fields.text);
				} else {
					elem.innerHTML = fields.text;
				}
			});
		}
	},

	// Update the page with array of tiddlers from server
	updatePage: (svr) => {
		var clientTopic = (svr.network.client.topic) ? `[[·topic: ${svr.network.client.topic}·]]` : '';
		svr.network.server.tiddlers.forEach(fields => {
			if (svr.network.server.storylist.includes(fields.title)) {
				if (typeof fields.selector === 'undefined') fields.selector = svr.selector;
			}
			nodered.fieldsToPage(fields);
		})
		if (svr.network.meta.tiddlers.length && !nodered.connected) {
			tokenBearer.token = svr.network.meta.tiddlers[0].token;
			nodered.topic('client.onload');
			hbState.startHeartbeat();
			// Call onLoad
			nodered.onLoad();
			nodered.connected = true;
		}
	},

	// Listen for uibuilder connections to server
	//  just send a heartbeat on reconnects
	//  send a 'client.onload' topic on first connect
	connected: false,
	onConnect: (evt) => {
		nodered.topic('heartbeat');
	},

	// Initialize the nodered and hbState objects
	initialize: () => {
		nodered._clientid = nodered.uuidv4().replace(/-/g,'').substr(-16);
		document.addEventListener('uibuilder:socket:connected', nodered.onConnect);

		// Listen for incoming messages from server
		//  Perform actions based on topic
		uibuilder.onChange('msg', (msg) => {
			hbState.netstat(`Node-Red Connected`);

			nodered.onRecvMsg(msg).then((rmsg) => {
				// Tiddlers from server
				if (rmsg.topic === 'server.tiddlers') {
					nodered.updatePage(rmsg);
				}
			});

		})

		// Up and running - start app level heartbeat
		console.log('TW5-Node-RED interface initialized');

	},

	// Fetch and install uibulder into page header
	loaduibulder: () => {
		fetch(nodered.socketLibrary).then((res) => {
			// Verify library fetch successful
			if (res.status !== 200) {
				throw new Error(`Unable to fetch uibuilder - HTTP status: ${res.status}`);
			}
			return res.text();
		}).then((text) => {
			// Load socket library into browser
			let elem = document.createElement("script");
			elem.innerHTML = text;
			document.head.appendChild(elem);
		}).then(() => {
			// Initialize the network interface
			nodered.initialize();
		}).catch((err) => {
			console.log(err);
		});
	},

	// Format timestamp text always same length
	tStamp: () => {
		return ' ' + ((new Date()).toLocaleDateString(undefined, {
			hourCycle: 'h23',
			year: 'numeric', month: '2-digit', day: '2-digit',
			hour: '2-digit', minute: '2-digit' //, second: '2-digit'
			})).replace(',', '');
	},

}

// Application level heartbeat - 6 per minute
const hbState = {
	selector: '.netstat',
	heartbeatInterval: 10000,

	// Heartbeat with server
	hbImages: {
		'heart-straight-fill': '<svg width="11pt" height="11pt" class="tc-image-phi-heart-straight-fill tc-image-button" viewBox="0 0 256 256"><rect width="256" height="256" fill="none"/><path fill="red" d="M224.627,51.90625a59.54956,59.54956,0,0,0-43.0625-19.89063,60.69786,60.69786,0,0,0-43.98437,17.55469L128.002,59.14844l-7.5-7.49219c-23.32812-23.35156-61.29687-25.3125-84.57812-4.29687a59.974,59.974,0,0,0-2.34375,87.07031l83.10937,83.10937a16.013,16.013,0,0,0,22.625,0l81.03125-81.03125C243.68945,113.15625,245.61133,75.20312,224.627,51.90625Z"/></svg>',
		'hearts-fill': '<svg width="11pt" height="11pt" class="tc-image-ri-hearts-fill tc-image-button" viewBox="0 0 24 24"><g><path fill="none" d="M0 0H24V24H0z"/><path fill="red" d="M17.363 11.045c1.404-1.393 3.68-1.393 5.084 0 1.404 1.394 1.404 3.654 0 5.047L17 21.5l-5.447-5.408c-1.404-1.393-1.404-3.653 0-5.047 1.404-1.393 3.68-1.393 5.084 0l.363.36.363-.36zm1.88-6.288c.94.943 1.503 2.118 1.689 3.338-1.333-.248-2.739-.01-3.932.713-2.15-1.303-4.994-1.03-6.856.818-2.131 2.115-2.19 5.515-.178 7.701l.178.185 2.421 2.404L11 21.485 2.52 12.993C.417 10.637.496 7.019 2.757 4.757c2.265-2.264 5.888-2.34 8.244-.228 2.349-2.109 5.979-2.039 8.242.228z"/></g></svg>',
		'heart-broken': '<svg width="11pt" height="11pt" class="tc-image-fa-heart-broken tc-image-button" viewBox="0 0 512 512"><path fill="red" d="M473.7 73.8l-2.4-2.5c-46-47-118-51.7-169.6-14.8L336 159.9l-96 64 48 128-144-144 96-64-28.6-86.5C159.7 19.6 87 24 40.7 71.4l-2.4 2.4C-10.4 123.6-12.5 202.9 31 256l212.1 218.6c7.1 7.3 18.6 7.3 25.7 0L481 255.9c43.5-53 41.4-132.3-7.3-182.1z"/></svg>'
	},

	heart: 'heart-straight-fill',

	netstat: (text) => {
		if (/Connected/.test(text)) {
			hbState.ping = 'pong';
			if (!/Connected/.test(hbState.heartText)) hbState.heart = 'hearts-fill';
		} else {
			 hbState.heart = 'heart-broken';
		}
		hbState.heartText = text;
		hbState.hbDisplay();
	},

	hbDisplay: () => {
		const elems = document.querySelectorAll(hbState.selector);
		elems.forEach((elem) => {
			elem.innerHTML = hbState.hbImages[hbState.heart] + hbState.heartText + nodered.tStamp();
		});
	},

	// Visually - heartbeat back and forth quicker to look pretty
	quickenHeartbeat: () => {
		if (hbState.heart === 'heart-straight-fill') {
			hbState.heart = 'hearts-fill';
			//fieldsToWiki({ title: settings.redNetstat, text: heart + heartText + tStamp() });
			hbState.hbDisplay();
		} else if (hbState.heart === 'hearts-fill') {
			hbState.heart = 'heart-straight-fill';
			//fieldsToWiki({ title: settings.redNetstat, text: heart + heartText + tStamp() });
			hbState.hbDisplay();
		}
	},

	// Send heartbeat
	// Check if received a message within 4 seconds of sent heartbeat
	ping: 'pong',
	heartbeat: () => {
		setTimeout(() => {
			if (hbState.ping === 'ping') {
				hbState.netstat(`Node-Red Timeout`);
			}}, 4000);

		hbState.ping = 'ping';
		nodered.bones('heartbeat');
	},

	heartText: '',

	// Use heartbeat params from settings
	// Insure timers are sane values
	hbTimer: undefined,
	visHbTimer: undefined,
	startHeartbeat: () => {
		if (hbState.hbTimer) clearInterval(hbState.hbTimer);
		if (hbState.visHbTimer) clearInterval(hbState.visHbTimer);

		hbState.heart = 'hearts-fill';
		hbState.visHbTimer = setInterval(hbState.quickenHeartbeat, 2000);

		if (hbState.heartbeatInterval) {
			hbState.hbTimer = setInterval(hbState.heartbeat,
				hbState.heartbeatInterval < 5000
				? 5000
				: hbState.heartbeatInterval);
		}
	},



}


document.addEventListener("DOMContentLoaded", () => {
	nodered.loaduibulder();
});
