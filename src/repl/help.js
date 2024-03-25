var colour, submit, prompt;

function Help(_colour, _submit, _prompt) {
	colour = _colour;
	submit = _submit;
	prompt = _prompt;
	return this;
};

const intro = () => {
	submit('', [
		'Welcome to TW5-Node-RED\n',
		'This REPL has access to the complete system',
		'Communications is normaally done by adding',
		'tiddlers to a TW wiki (called twikis just to keep straight)',
		'When a tiddler is added/changed/deleted from a twiki an',
		'event is triggered which allows TiddlyWiki, Node-RED, and/or',
		'this REPL to perform an action.\n',

		'See http://localhost:1880/svr/wiki/notebook.html?app=intro',
		'for more information'
		].join('\n')
	);
}

module.exports = {
	Help: Help,
	intro: intro,
}
