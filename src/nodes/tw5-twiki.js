const fs = require('fs');
const path = require('path');

/**
 * For base funcs see exports.getTiddlersAsJson
**/
const utils = require('./utils');

// TiddlyWiki to Node-red interface
module.exports = function(RED) {
	// Helpers
	const getMsgProp = (msg, prop) => RED.util.getMessageProperty(msg, prop);
	const setMsgProp = (msg, prop, val) => RED.util.setMessageProperty(msg, prop, val, true);
	const showStatus = (node, text) => node.status(RED.settings.showWikiNodeStatus ? { text: text } : { text: ''});

	// -----------------
	function toTwiki(n) {
		RED.nodes.createNode(this, n);
		const node = this;
		const ctx = this.context();
		if (!ctx.global.get('RED')) { ctx.global.set('RED', RED); }
		const $tw = ctx.global.get('$tw');
		const twikis = ctx.global.get('twikis');

		this.twikiName = n.twikiName;
		this.fromTwikiName = n.fromTwikiName;
		this.resetOnDeploy = n.resetOnDeploy;
		this.inputTask = n.inputTask;
		this.field = n.field;
		this.outputFormat = n.outputFormat;
		this.name = n.name; // RED._('twiki-wiki.defaults.name');
		this.topic = n.topic || '';
		this.useListener = n.useListener;
		this.filter = n.filter;
		this.networkfield = n.networkfield;
		this.outputs = n.outputs;
		this.template = n.template;
		this.file = n.file;
		this.clear = n.clear;

		this.editorIsX = n.editorIsX;
		this.fileIsX = n.fileIsX;
		this.networkIsX = n.networkIsX;
		this.twikiIsX = n.twikiIsX;
		this.fieldIsX = n.fieldIsX;

		this.twiki = twikis[this.twikiName] || new $tw.Wiki;
		twikis[this.twikiName] = this.twiki;

		// Init to current twiki state when node re-deployed
		//  copy current/starting changeCount
		this.changeCountSent = this.twiki.changeCount
		  ? JSON.parse(JSON.stringify(this.twiki.changeCount))
		  : {};

		if (node.useListener) {
			ctx.set('listener', function listener(changes) {
				var tiddlersToSend = [];
				for (let title in node.twiki.changeCount) {
					if (node.changeCountSent[title] !== node.twiki.changeCount[title]) {
						tiddlersToSend.push(JSON.parse(node.twiki.getTiddlerAsJson(title)));
						node.changeCountSent[title] = node.twiki.changeCount[title];
					}
				}

				var msg = {
					twikiName: node.twikiName,
					changed: {
						changes: changes,
						changeCount: node.twiki.changeCount,
						changeCountSent: node.changeCountSent
					},
					payload: tiddlersToSend
				}
				node.send([null, msg]);
			})
			node.twiki.addEventListener("change", ctx.get('listener'));
		}

		node.on('input', (msg, send, done) => {
			var fromFile = [], fromNetwork = [], fromTwiki = [], fromMsgField = [], fromTemplate = [];
			msg = utils.wikiMsg(node, this.topic, msg);
			msg.twikiName = node.twikiName;
//			msg = utils.wikiMsg(node, '', msg);

			if (this.fieldIsX && this.field) {
				let msgIn = getMsgProp(msg, this.field);
				if (msgIn) {
					var json = undefined;
					try {
						json = JSON.parse(msgIn);
					} catch(err) {}
					// if it is json make it the msg in else check if a tid file
					if (json) {
						msgIn = json;
					}
					if (typeof msgIn !== 'object' && utils.fieldIsTid(msgIn)) {
						msgIn = utils.arrayOfTids(msgIn, msg);
					}
					if (!Array.isArray(msgIn)) msgIn = [msgIn];
					fromMsgField = msgIn;
				}
			}

			if (this.networkIsX && this.networkfield) {
				fromNetwork = getMsgProp(msg, this.networkfield);
				//if (!Array.isArray(fromNetwork)) fromNetwork = [];
			}

			if (this.twikiIsX && this.fromTwikiName) {
				let fTWiki = twikis[this.fromTwikiName] || undefined;
				if (fTWiki) {
					fromTwiki = JSON.parse(fTWiki.getTiddlersAsJson(this.filter))
				}
			}

			if (this.fileIsX && (this.file || msg.filename)) {
				const fname = msg.filename || this.file;
				// Check for a directory of tid formatted tiddlers
				utils.dirOfTids(fname, msg)
				.then((tids) => {
					if (tids.length) {
						fromFile = tids;
						let updates = fromFile.concat(fromTwiki, fromNetwork, fromMsgField);
						if (this.clear) {
							this.twiki = new $tw.Wiki;
							twikis[this.twikiName] = this.twiki;
						}
						utils.updateTwikiFromTemplate(this.twiki, this, msg);
						this.twiki.addTiddlers(updates);
						msg.dirname = fname;
						send(msg);
						done();
						return true;
					}
					return false;
				})
				.then ((pathIsDirOfTids) => {
					// Was a directory of tids so all done
					if (pathIsDirOfTids) return '';
					// Check if is a file, and if JSON
					return fs.promises.readFile(fname, 'utf8')
						.then((data) => {
							// See if a json file
							var json = undefined;
							try {
								json = JSON.parse(data);
							} catch(err) {}
							// if it is json make it the data else check if a tid file
							if (json) {
								data = json;
							} else if (/^title\:.*$/gm.test(data)) {
								let tidfields = utils.tidToFields(data);
								data = [tidfields];
							};
							fromFile = typeof data === 'object' ? data : [];
							// Array order is important
							let updates = fromFile.concat(fromTwiki, fromNetwork, fromMsgField, fromTemplate);
							if (this.clear) {
								this.twiki = new $tw.Wiki;
								twikis[this.twikiName] = this.twiki;
							}
							utils.updateTwikiFromTemplate(this.twiki, this, msg);
							this.twiki.addTiddlers(updates);
							msg.filename = fname;
							send(msg);
							done();
						})
						.catch((err) => {
							this.error(err);
						})
				})
			} else {
				let updates = fromFile.concat(fromTwiki, fromNetwork, fromMsgField, fromTemplate);
				if (this.clear) {
					this.twiki = new $tw.Wiki;
					twikis[this.twikiName] = this.twiki;
				}
				utils.updateTwikiFromTemplate(this.twiki, this, msg);
				this.twiki.addTiddlers(updates);
				send(msg);
				done();
			}
		})
		node.on('close', function() {
			if (node.resetOnDeploy) twikis[node.twikiName] = new $tw.Wiki;
			if (node.useListener) node.twiki.removeEventListener('change', ctx.get('listener'));
		})
	}

	function fromTwiki(n) {
		RED.nodes.createNode(this, n);
		const node = this;
		const ctx = this.context();

		const $tw = ctx.global.get('$tw');
		const twikis = ctx.global.get('twikis');

		this.twikiName = n.twikiName;
		this.toTwikiName = n.toTwikiName;
		this.resetOnDeploy = n.resetOnDeploy;
		this.inputTask = n.inputTask;
		this.field = n.field;
		this.file = n.file;
		this.outputFormat = n.outputFormat;
		this.name = n.name || 'get ' + this.twikiName; // RED._('twiki-wiki.defaults.name');
		this.topic = n.topic || '';
		this.useListener = n.useListener;
		this.filter = n.filter ? n.filter : '[all[]]';
		this.networkfield = n.networkfield;
        this.outputs = n.outputs;
		// hack until get to bottom of node-red typedinput as 'bool'
		this.tostory = typeof n.tostory === 'string' ? (n.tostory === 'true' ? true : false) : n.tostory;

		this.fileIsX = n.fileIsX;
		this.networkIsX = n.networkIsX;
		this.twikiIsX = n.twikiIsX;
		this.fieldIsX = n.fieldIsX;

		// When loading attempt to connect to twiki
		this.twiki = twikis[this.twikiName] || new $tw.Wiki;
		twikis[this.twikiName] = this.twiki;

		// Init to current twiki state when node re-deployed
		//  copy current/starting changeCount
		this.changeCountSent = this.twiki.changeCount
		  ? JSON.parse(JSON.stringify(this.twiki.changeCount))
		  : {};

		if (node.useListener) {
			ctx.set('listener', function listener(changes) {
				var tiddlersToSend = [];
				for (let title in node.twiki.changeCount) {
					if (node.changeCountSent[title] !== node.twiki.changeCount[title]) {
						tiddlersToSend.push(JSON.parse(node.twiki.getTiddlerAsJson(title)));
						node.changeCountSent[title] = node.twiki.changeCount[title];
					}
				}

				var msg = {
					twikiName: node.twikiName,
					changed: {
						changes: changes,
						changeCount: node.twiki.changeCount,
						changeCountSent: node.changeCountSent
					},
					payload: tiddlersToSend
				}
				node.send([null, msg]);
			})
			node.twiki.addEventListener("change", ctx.get('listener'));
		}

		node.on('input', (msg, send, done) => {
			// Insure we are looking at the right twiki
			this.twiki = twikis[this.twikiName] || new $tw.Wiki;
			twikis[this.twikiName] = this.twiki;

			msg = utils.wikiMsg(node, this.topic, msg);
			msg.twikiName = this.twikiName;
			if (this.fieldIsX && this.field) {
				if (this.outputFormat === 'tiddlers') {
					setMsgProp(msg, this.field, JSON.parse(this.twiki.getTiddlersAsJson(this.filter)));
				} else {
					setMsgProp(msg, this.field, this.twiki.filterTiddlers(this.filter));
				}
			}
			if (this.twikiIsX && this.toTwikiName) {
				let fTWiki = JSON.parse(this.twiki.getTiddlersAsJson(this.filter));
				if (twikis[this.toTwikiName]) twikis[this.toTwikiName].addTiddlers(fTWiki);
			}
			if (this.networkIsX && this.networkfield) {
				var originalNetwork = getMsgProp(msg, this.networkfield);
				var toNetwork = JSON.parse(this.twiki.getTiddlersAsJson(this.filter));
				if (this.networkfield.split('.')[1] === 'server' ? this.tostory : false) {
					msg.network.server.storylist = utils.getStoryArray(toNetwork, msg.network.server.storylist);
				}
				setMsgProp(msg, this.networkfield, originalNetwork.concat(toNetwork));
			}
			if (this.fileIsX && (this.file || msg.filename)) {
				const fname = msg.filename || this.file;
				$tw.utils.createFileDirectories(fname);
				let filteredTwiki = JSON.parse(this.twiki.getTiddlersAsJson(this.filter));

				var tids = [];
				if (path.extname(fname) === '.tid') {
					filteredTwiki.forEach(tid => {
						tids.push(utils.tiddlerToTid(tid));
					})
					tids = tids.join('+======+\n');
				} else {
					tids = JSON.stringify(filteredTwiki, null, RED.settings.flowFilePretty ? 2 : null);
				}
				fs.promises.writeFile(fname, tids)
					.then(() => {
						msg.filename = fname;
						send(msg);
						done();
						return `successful write ${fname}`;
					})
					.catch((err) => {
						this.error(err);
						done();
						return err;
					});
			} else {
				send(msg);
				done();
			}
		})

		node.on('close', function() {
			if (node.useListener) node.twiki.removeEventListener('change', ctx.get('listener'));
			if (node.resetOnDeploy) twikis[node.twikiName] = new $tw.Wiki;
		});
	}

	// -----------------
	RED.nodes.registerType('to-twiki', toTwiki);
	RED.nodes.registerType('from-twiki', fromTwiki);
};
