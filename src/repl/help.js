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
		'This REPL has online access to the system',
		'See http://localhost:1880/svr/wiki/notebook.html?mws=intro',
		' for more information\n',
		'help.status() to see common values\n'
		].join('\n')
	);
}

exports.status = () => {
		submit('{ versions: { $tw: $tw.version, $twsync: $twsync.version, $twmws: $twmws.version }}\n');
		submit('{ "Node-RED global context": tnr_context.keys().sort() }\n');
		submit('{ twikis:Object.keys(twikis).sort() }\n');
}
