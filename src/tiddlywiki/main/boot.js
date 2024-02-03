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
	tiddlywiki: (_outDir = 'twout') => {
		const me = Object.create(twapp);
		me.outDir = _outDir;
		me.$tw = require('tiddlywiki').TiddlyWiki();
		me.$tw.preloadTiddlers = twPreloadTiddlers;
		me.$tw.boot.argv = [me.outDir.replace(/^\.\//, '')]; // TW outDir path
		me.$tw.boot.boot(() => {});

		// Reference hashmap of twikis
		me.twikis = { '$tw.wiki': me.$tw.wiki };
		return { $tw: me.$tw, twikis: me.twikis, outDir: me.outDir };
	}
}
