var colour, submit, prompt;

exports.Help = (_colour, _submit, _prompt) => {
	colour = _colour;
	submit = _submit;
	prompt = _prompt;
	return this;
};

exports.intro = () => {
	submit('', [
		'\nWelcome to TW5-Node-RED',
		'',
		'This REPL has online access to the complete system.',
		'See http://localhost:1880/svr/wiki/empty.html?app=repl for more information.',
		"(User: 'demo' password 'demo') or better yet 'Create account' at login.",
		" To test 'Chat' will want to create a few of them.",
		'',
		'See http://localhost:1880/svr/wiki/nodered.html?app=welcome for documentation.',
		"again -(User: 'demo' password 'demo') or better yet 'Create account' at login.",
		'',
		'The Node-RED flow editor is at http://localhost:1880/red',
		"Dev login - (user: 'admin' password 'password')",
		" Press the upper-right 'person' icon to log in",
		'',
		'---- ---- ---- ---- ---- ----',
		'This release is to test the interface to the upcoming TW Multi Wiki Server',
		'',
		'http://localhost:1880/svr/wiki/nodered.html?mws=blank is the TW5-Node-RED',
		' application used to play with recipes.',
		'http://localhost:8200 is the TiddlyWiki MWS client',
		'http://localhost:8100 to edit the mwsTest app.',
		'---- ---- ---- ---- ---- ----',
		'',
//		`The Node-RED global context is 'tnr' in this REPL`,
//		`since 'global' is already used by the REPL itself.\n`,
		].join('\n')
	);
}

exports.common = (step) => {
	if (typeof step !== 'string') { step = 'help.intro()\n'; }
	switch (step) {
		case 'versions':
			submit('{ versions: { $tw: $tw.version, $twsync: $twsync.version, $twmws: $twmws.version }}\n',prompt);
			submit("help.common('clientIds')");
			break;
		case 'clientIds':
			submit('clientIds', [
			`\nA clientId is a unigue string generated by the client when connecting the server`,
			`It is created when the page is loaded or reloaded. If a browser has 3 pages connected`,
			`the the server will have 3 client Ids, one for each page.`,
			].join('\n'));
//			submit("help.common('tnr')");
			break;
		case 'tnr':
			submit('{ "Node-RED global context": tnr.keys().sort() }\n',prompt);
			submit("help.common('twikis')");
			break;
		case 'twikis':
			submit('{ twikis:Object.keys(twikis).sort() }\n',prompt);
			submit("help.common('sendTiddlers')");
			break;
		case 'sendTiddlers':
			submit("sendTiddlers('all', {title:'from server',text:'this is from the server'},true)\n",prompt);
			break;
		default:
			submit(step, prompt);
			break;
	}
}
