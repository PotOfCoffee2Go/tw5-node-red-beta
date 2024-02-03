// Tiddlers to be loaded into embedded TiddlyWiki
const twTiddlers = require('./tiddlers.json');
const twMacros = require('./macros.json');
const twModules = require('./modules.json');
const twPlugins = require('./plugins.json');

const twPreloadTiddlers = twTiddlers.concat(twMacros, twModules, twPlugins);

// TiddlyWiki wikis created/used by Node-Red
const twapp = {};

module.exports = {
	// Boot TiddlyWiki module
	tiddlywiki: (_outDir = 'twsync') => {
		const me = Object.create(twapp);
		me.outDir = _outDir;
		me.$tw = require('tiddlywiki').TiddlyWiki();
		me.$tw.preloadTiddlers = twPreloadTiddlers;
		me.$tw.boot.argv = [me.outDir]; // TW outDir path
		me.$tw.boot.boot(() => {});

		return { $twsync: me.$tw,  syncDir: me.outDir };
	}
}
