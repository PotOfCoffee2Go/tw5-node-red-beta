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
		'See http://localhost:1880/svr/wiki/notebook.html?mws=intro',
		' for more information'
		].join('\n')
	);
}

module.exports = {
	Help: Help,
	intro: intro,
}
