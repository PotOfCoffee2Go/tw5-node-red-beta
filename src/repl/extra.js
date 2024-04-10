// Run ./bin/test.sh script - may need backslashes in windows?
const runTestCommand = 'cd ./node_modules/tiddlywiki && ./bin/test.sh';

// Node-RED global context
var RED, $tw, clientIds;
exports.init = (tnr) => {
	RED = tnr.get('RED');
	$tw = tnr.get('$tw');
	clientIds = tnr.get('clientIds');
}

exports.runTests = () => {
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

// Send tiddlers to a client
exports.sendTiddlers = (clientid, tiddlers, tostory) => {
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

	var text = {
		topic: 'server.tiddlers',
		clientid,
		network: {
			meta: { source: 'repl', version: 'v' + $tw.version, _clientid: `repl${$tw.version}`, tiddlers: [] },
			client: { topic: 'from.repl', sender: [{title: 'barebones'}], tiddlers: [] },
			server: { topic: 'server.tiddlers', tiddlers, storylist }
		}
	};

	RED.nodes.eachNode( node => {
		if (node.name === 'Broadcast msg' && node.type === 'link in') {
			RED.nodes.getNode(node.id).send(text);
		}
	})

	return text;
}
