// Terminal colors
const colour = {
	log: (txt='', fg=255, bg=0, efg=255, ebg=0) => process.stdout.write(
		`\x1b[38;5;${fg};48;5;${bg}m${txt+'\n'}\x1b[38;5;${efg};48;5;${ebg}m`),
	txt: (txt='', fg=255, bg=0, efg=255, ebg=0) =>
		`\x1b[38;5;${fg};48;5;${bg}m${txt}\x1b[38;5;${efg};48;5;${ebg}m`,
}

// Syntax candy
const log = (...args) => { colour.log(...args); }
const dbg = (property, depth=0) => { console.dir(property, {depth}); }
const makeCopy = (obj) => JSON.parse(JSON.stringify(obj));

// -------------------
// REPL interface
const prompt = colour.txt('$tnr-repl> ',33,0,7,0);

function resetContext() {
	rt.context.rt = rt;
	rt.context.log = log;
	rt.context.dbg = dbg;
}

// REPL runtime
var rt;
function startRepl() {
	rt = require('node:repl').start({
			prompt: prompt, useColors: true,
			ignoreUndefined: true, /*completer: completer*/
	});
	rt.on('reset', () => resetContext());
	resetContext();
}

log('-------------------',75);
log('Startup REPL', 75);
log('-------------------',75);
startRepl();
rt.history.push('.docs');
require('./docs').startup(rt);
