const fs = require('fs');

const utils = require('./utils');

module.exports = function(RED) {
	"use strict";
	// Helpers
	const getMsgProp = (msg, prop) => RED.util.getMessageProperty(msg, prop);
	const setMsgProp = (msg, prop, val) => RED.util.setMessageProperty(msg, prop, val, true);
	const showStatus = (node, text) => node.status(RED.settings.showWikiNodeStatus ? { text: text } : { text: ''});

	function ReadNode(n) {
		RED.nodes.createNode(this,n);
		const node = this;

		this.name = n.name || RED._('read-tiddlers.label.node');
		this.path = n.path;
		this.topic = n.topic || '';
		this.tofield = n.tofield;

		node.on('input', (msg, send, done) => {
			msg = utils.wikiMsg(node, this.topic, msg);
			const fullPath = node.path;

			utils.dirOfTids(this.path, msg)
			.then((tids) => {
				if (tids.length) {
					msg.dirname = this.path;
					setMsgProp(msg, node.tofield, tids)
					send(msg);
					done();
					return true;
				}
				return false;
			})
			.then((pathIsDirOfTids) => {
				// Was a directory of tids so all done
				if (pathIsDirOfTids) return '';
				// Check if is a file
				return fs.promises.readFile(this.path, 'utf8')
					.then((data) => {
						// See if a json file
						var json = undefined;
						try {
							json = JSON.parse(data);
						} catch(err) {}
						// if it is json - make it the data else check if a tid file
						if (json) {
							data = json;
						} else if (/^title\:.*$/gm.test(data)) {
							let tidfields = utils.arrayOfTids(data, msg);
							data = tidfields;
						};
						var fromFile = typeof data === 'object' ? data : [];

						msg.filename = this.path;
						setMsgProp(msg, node.tofield, fromFile)
						send(msg);
						done();
						return '';
					})
					.catch((err) => {
						this.error(err);
						done();
						return '';
					})
			})
		})
	}
	RED.nodes.registerType("read-tiddlers", ReadNode);


	function EditNode(n) {
		RED.nodes.createNode(this,n);
		const node = this;

		this.name = n.name || RED._('edit-tiddlers.defaults.name');
		this.topic = n.topic || '';
		this.path = n.path;
		this.tofield = n.tofield || 'payload';
		this.template = n.template;

		node.on('input', (msg, send, done) => {
			msg = utils.wikiMsg(node, this.topic, msg);
			setMsgProp(msg, this.tofield, utils.updateFieldFromTemplate('payload', this, msg));
			send(msg);
			done();
		})
	}
	RED.nodes.registerType("edit-tiddlers", EditNode);
}
