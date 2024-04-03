/**
 * The system has been specifically designed to interface to a tiddlywiki
 *  front end via the $:/plugins/potofcoffee2go/tw5-node-red/network.js
 *  tiddlywiki macro. The in/outbound messages are tiddlers. That being
 *  said, should not be too difficult to adapt to any socketio client
 *
 * The serving system is stateless - ie: the client gives all information
 *  required for the server to process the client's request.
 *
 * ------
 *  Normally the 'wiki in' node is connected to a node-red 'switch'
 *   node that route messages to the proper flow for processing.
 *
 *  You can have more than one 'wiki in' nodes in the node-red deployment.
 *   One should take care of duplicate messages, as each 'wiki in' node
 *   outputs a copy of identical socket io messages.
 *
**/
const fs = require('fs');
const path = require('path');

const utils = require('./utils');

// TiddlyWiki to Node-red interface
module.exports = function(RED) {
	// Helpers
	const getMsgProp = (msg, prop) => RED.util.getMessageProperty(msg, prop);
	const setMsgProp = (msg, prop, val) => RED.util.setMessageProperty(msg, prop, val, true);
	const showStatus = (node, text) => node.status(RED.settings.showWikiNodeStatus ? { text: text } : { text: ''});

	// ------
	// Node to copy tiddlers to another field
	function getNetwork(n) {
		RED.nodes.createNode(this, n);
		const node = this;
		const ctx = this.context();
		const $tw = ctx.global.get('$tw');
		const twikis = ctx.global.get('twikis');

		this.name = n.name || RED._('set-network.label.name');
		this.topic = n.topic;
		this.networkfield = n.networkfield || 'network.server.tiddlers';
		this.filter = n.filter;
		this.updtostory = n.updtostory || false;
		this.tostory = n.tostory || false;

		this.twikiName = n.twikiName || '';
		this.field = n.field;
		this.file = n.file;

		this.fileIsX = n.fileIsX;
		this.twikiIsX = n.twikiIsX;
		this.fieldIsX = n.fieldIsX;

		node.on('input', (msg, send, done) => {
			// Create msg.network unless already present
			msg = utils.wikiMsg(this, '', msg);

			// Apply the filter to the network tiddlers
			const originalNetwork = getMsgProp(msg, this.networkfield);
			let netTwiki = new $tw.Wiki;
			netTwiki.addTiddlers(originalNetwork);
			let filteredNetwork = JSON.parse(netTwiki.getTiddlersAsJson(this.filter));

			// Get tiddlers from network to a twiki
			if (this.twikiIsX && this.twikiName) {
				setMsgProp(msg, 'twikiName', this.twikiName);
				let twiki = utils.getTwiki(this.twikiName, this);
				twiki.addTiddlers(filteredNetwork);
			}

			// Get network tiddlers to a msg field
			if (this.fieldIsX && this.field) {
				setMsgProp(msg, this.field, filteredNetwork);
			}

			// Get network tiddlers to a file
			if (this.fileIsX && (this.file || msg.filename)) {
				// msg.filename overrides the nodes filename
				const fname = msg.filename || this.file;
				$tw.utils.createFileDirectories(fname);
				var tids = [];
				if (path.extname(fname) === '.tid') {
					filteredNetwork.forEach(tid => {
						tids.push(utils.tiddlerToTid(tid));
					})
					tids = tids.join('+======+\n');
				} else {
					tids = JSON.stringify(filteredNetwork);
				}

				fs.promises.writeFile(fname, tids)
					.then(() => {
						msg.filename = fname;
						send(msg);
						done();
					})
					.catch((err) => {
						this.error(err,msg);
						return done();
					});
				return;
			}
			send(msg);
			done();
		})
	}

	// ------
	// Node to append tiddler to network field
	function setNetwork(n) {
		RED.nodes.createNode(this, n);
		var node = this;
		this.networkfield = n.networkfield || 'network.server.tiddlers';
		this.updtostory = n.updtostory || false;
		this.tostory = typeof n.tostory === 'string' ? (n.tostory === 'true' ? true : false) : n.tostory;

		this.twikiName = n.twikiName || '';
		this.filter = n.filter;
		this.field = n.field;
		this.file = n.file;

		this.template = n.template;
        this.syntax = n.syntax || "mustache";
        this.fieldType = n.fieldType || "msg";
        this.outputFormat = n.output || "str";

		this.clear = n.clear;

		this.editorIsX = n.editorIsX;
		this.fileIsX = n.fileIsX;
		this.twikiIsX = n.twikiIsX;
		this.fieldIsX = n.fieldIsX;
		this.topic = n.topic;

		this.name = n.name;

		node.on('input', (msg, send, done) => {
			// Precedence of setting network tiddlers - lowest to highest
			//  meaningful when same tiddler title comes from multiple sources
			var fromFile = [], fromTwiki = [], fromNetwork = [], fromMsgIn = [], fromTemplate = [];

			// Create msg.network unless already present
			msg = utils.wikiMsg(node, this.topic, msg);
			// Get network tiddlers already stored in msg.network
			//  set to empty if clear flag is set
			var originalNetwork = this.clear ? [] : getMsgProp(msg, this.networkfield);

			// Get tiddlers from the node template editor
			if (this.editorIsX) {
				fromTemplate = utils.updateNetworkFromTemplate(msg.network, this, msg);
			}

			// Get tiddlers from a msg field
			if (this.fieldIsX && this.field) {
				let msgIn = getMsgProp(msg, this.field);
				if (msgIn) {
					var json = undefined;
					try {
						json = JSON.parse(msgIn);
					} catch(err) {}
					// if tiddlers in msg field already json format
					//  - no further processing needed
					if (json) {
						msgIn = json;
					}
					// If not in json format, see if can parse as .tid format
					if (typeof msgIn !== 'object' && utils.fieldIsTid(msgIn)) {
						msgIn = utils.arrayOfTids(msgIn, msg);
					}
					// If is a single tiddler, make into an array of one element
					if (!Array.isArray(msgIn)) msgIn = [msgIn];
					// Remember tiddlers from the msg field
					fromMsgIn = msgIn;
				}
			}
			// Get tiddlers from a twiki
			if (this.twikiIsX && this.twikiName) {
				let twiki = utils.getTwiki(this.twikiName, this);
				fromTwiki = JSON.parse(twiki.getTiddlersAsJson(node.filter));
			}

			// Get tiddlers from a file
			if (this.fileIsX && (this.file || msg.filename)) {
				// msg.filename overrides node filename
				const fname = msg.filename || this.file;
				// Check to see is a directory with tid formatted files
				utils.dirOfTids(fname, msg)
				.then((tids) => {
					// Found tid formatted files (tiddlers)
					if (tids.length) {
						fromFile = tids;
						// Update the storylist of titles to display in the river
						let updates = [].concat(fromFile, fromTwiki, fromNetwork, fromMsgIn, fromTemplate);
						if (utils.getNodeTostory(this)) {
							msg.network.server.storylist = utils.getStoryArray(updates, msg.network.server.storylist);
						}
						// Combine tiddlers from all sources
						updates = originalNetwork.concat(fromFile, fromTwiki, fromNetwork, fromMsgIn, fromTemplate);
						setMsgProp(msg, node.networkfield, updates);
						// Set msg.dirname with path to directory of .tid files
						msg.dirname = fname;
						send(msg);
						done();
						return true;
					}
					return false;
				})
				.then ((pathIsDirOfTids) => {
					// Was a directory of tids processed above - so all done
					if (pathIsDirOfTids) return '';

					// Check if is a file
					return fs.promises.readFile(fname, 'utf8')
						.then((data) => {
							// See if a json file
							var json = undefined;
							try {
								json = JSON.parse(data);
							} catch(err) {}
							// if it is json - make it the data else check if a tid file
							if (json) {
								data = json;
							} // to-do -> change tidToFields to utils.arrayOfTids(data, msg)???
							else if (/^title\:.*$/gm.test(data)) {
								let tidfields = utils.arrayOfTids(data, msg);
								data = tidfields;
							};
							fromFile = typeof data === 'object' ? data : [];

							// Update the storylist of titles to display in the river
							let updates = [].concat(fromFile, fromTwiki, fromNetwork, fromMsgIn, fromTemplate);
							if (utils.getNodeTostory(this)) {
								msg.network.server.storylist = utils.getStoryArray(updates, msg.network.server.storylist);
							}
							// Combine tiddlers from all sources
							updates = originalNetwork.concat(fromFile, fromTwiki, fromNetwork, fromMsgIn, fromTemplate);
							setMsgProp(msg, node.networkfield, updates);
							msg.filename = fname;
							send(msg);
							done();
						})
						.catch((err) => {
							this.error(err,msg);
							return done();
						})
				})
			} else { // Not getting tiddlers from a file
				// Update the storylist of titles to display in the river
				let updates = [].concat(fromFile, fromTwiki, fromNetwork, fromMsgIn, fromTemplate);
				if (utils.getNodeTostory(this)) {
					msg.network.server.storylist = utils.getStoryArray(updates, msg.network.server.storylist);
				}
				// Combine tiddlers from all sources
				updates = originalNetwork.concat(fromFile, fromTwiki, fromNetwork, fromMsgIn, fromTemplate);
				setMsgProp(msg, node.networkfield, updates);
				send(msg);
				done();
			}

		})
	}

	RED.nodes.registerType('get-network', getNetwork);
	RED.nodes.registerType('set-network', setNetwork);

//  Say we are initialized
	var dashitall = '+' + new Array(54).join('-');
	RED.log.info(dashitall);
	RED.log.info(`| tw5-node-red-beta v${require(__dirname + '/package').version} @potofcoffee2go/tw5-nodes initialized`);
	RED.log.info(`| TiddlyWiki $tw v${RED.settings.functionGlobalContext.$tw.version} boot successful`);
	RED.log.info(`| TW sync 'server' $twsync - directory '${RED.settings.functionGlobalContext.syncDir}'`);
	RED.log.info(`| TW MWS $twmws - directory '${RED.settings.functionGlobalContext.mwsDir}'`);
	RED.log.info(dashitall);
};
