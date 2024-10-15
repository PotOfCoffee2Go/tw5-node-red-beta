const twboot = require('../tiddlywiki/main/boot.js');
const { $tw } = twboot.tiddlywiki('./src/repl/docs/output');

// Wiki with documentation tiddlers
var $docs = new $tw.Wiki;
var docsOrder;	// Order of pages
var docsIdx;	// Current docs pag (tiddler)

const getText = (title) => $docs.getTiddlerText(title);
const getCmd = (title) => $docs.getTiddlerList(title, 'cmd');

const tiddlywiki = {
    // TiddlyWki commander got an error?
    checkForErrors: (err) => {
        if (err) {
            try {
                $tw.utils.error("Error: " + err);
            } catch (e) {}
        }
    },
    // Create $tw.Commander to do commands
    cmdr: {
        execute: (wiki, cmds) => {
            const cc = new $tw.Commander(cmds, tiddlywiki.checkForErrors, wiki);
            cc.execute();
        }
    }
}

const colour = {
	log: (txt='', fg=255, bg=0, efg=255, ebg=0) => process.stdout.write(
		`\x1b[38;5;${fg};48;5;${bg}m${txt+'\n'}\x1b[38;5;${efg};48;5;${ebg}m`),
	txt: (txt='', fg=255, bg=0, efg=255, ebg=0) =>
		`\x1b[38;5;${fg};48;5;${bg}m${txt}\x1b[38;5;${efg};48;5;${ebg}m`,
}
const log = colour.log;

const submit = (cmd, key, repeat = 1) => { // key = {ctrl: true, name: 'l'}
	for (let i = 0; i < repeat; i++) {
		//process.nextTick(() => { rt.write(cmd, key); });
		rt.write(cmd, key);
	}
}

function tabtab(cmd) {
	rt.displayPrompt();
	submit(cmd);
	log('{tab}{tab}',75);
	submit(null,{name:'tab'}, 2);
	submit(null,{name:'backspace'}, cmd.length);
}

// Page navigation
function navigate(page) {
	if (page === 'load') { loadDocs(); log('$docs loaded'); return; }
	else if (page === '>') { docsIdx++; page = ''; }
	else if (page === '<') { docsIdx--; page = ''; }
	else if (page === '^') { docsIdx = 0; page = ''; }
	else if (/^[ \d]+/.test(page)) { docsIdx = parseInt(page, 10); page = ''; }
	docsIdx = (docsIdx < 0 || docsIdx >= docsOrder.length) ? 0 : docsIdx;
	if (page === '*') { listDocs(); return; }

	if (!page) { page = docsOrder[docsIdx]; }

	log(`.docs ${docsIdx.toString().padEnd(2)} - ${docsOrder[docsIdx]}`, 214);
	log(getText(page), 34);

	let cmd = getCmd(page);
	if (cmd.length) {
		cmd = cmd[0];
		if (cmd[cmd.length-1] === '.') {
			tabtab(cmd);
		} else {
			submit(cmd+'\n');
		}
	}
}

function loadDocs() {
	$docs = new $tw.Wiki;
	docsIdx = 0;
	tiddlywiki.cmdr.execute($docs, ['--load', './public/app/repldocs']);
	docsOrder = $docs.getTiddlerList('Docs');
}

function listDocs() {
	for (let idx=0; idx<docsOrder.length; idx++) {
		log(`.docs ${idx.toString().padEnd(2)} - ${docsOrder[idx]}`, idx === docsIdx ? 214 : 75);
	}
}

function defineDocsCmd(rt) {
	rt.defineCommand('docs', {
	  help: 'TW5-Node-RED REPL Documentation',
	  action(page) {
		rt.clearBufferedCommand();
		//console.clear();
		navigate(page);
		rt.displayPrompt();
		rt.write('.docs >');
	  },
	});
}

// REPL runtime
var rt;
function startup(_rt) {
	rt = _rt;
	defineDocsCmd(rt);
	loadDocs();
	rt.context.$twdocs = $tw;
	rt.context.$docs = $docs;
}

module.exports = {
	startup: (rt) => startup(rt),
}
