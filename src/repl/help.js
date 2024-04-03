var colour, submit, prompt;

exports.Help = (_colour, _submit, _prompt) => {
	colour = _colour;
	submit = _submit;
	prompt = _prompt;
	return this;
};

exports.intro = () => {
	submit('', [
		'\nWelcome to TW5-Node-RED\n',
		'This REPL has online access to the complete system',
		'See http://localhost:1880/svr/wiki/empty.html?mws=repl',
		' for more information.',
		"(User: 'demo' password 'demo' or better yet",
		"'Create account'. To test 'Chat' will want to",
		'create a few of them.\n',
		"help.common('versions') to see some common JS command lines\n"
		].join('\n')
	);
}

exports.common = (step) => {
	if (typeof step !== 'string') { step = 'help.intro()\n'; }
	switch (step) {
		case 'versions':
			submit('{ versions: { $tw: $tw.version, $twsync: $twsync.version, $twmws: $twmws.version }}\n',prompt);
			submit("help.common('tnr')");
			break;
		case 'tnr':
			submit('{ "Node-RED global context": tnr.keys().sort() }\n',prompt);
			submit("help.common('twikis')");
			break;
		case 'twikis':
			submit('{ twikis:Object.keys(twikis).sort() }\n',prompt);
			submit("help.common('sendTiddler')");
			break;
		case 'sendTiddlers':
			submit("sendTiddlers('all', {title:'from server',text:'this is from the server'},true)\n",prompt);
			break;
		default:
			submit(step, prompt);
			break;
	}
}
