var colour, submit, prompt;

function Tests(_colour, _submit, _prompt) {
	colour = _colour;
	submit = _submit;
	prompt = _prompt;
	return this;
};

const show = {
	intro: () => {
		submit('',[
			'tests.show.bag(bag);  - lists all tiddlers in a bag',
			].join('\n')
		);
	}
}

const getBagLastTiddlerId = {
	intro: () => {
		submit(`.clear\n`);
	},
	step: (nbr) => {
		if (nbr === 1) {
			submit(`var poll_1 = $tw.mws.store.getBagRecentTiddlers('bag-alpha')\n`,[
				'\n----- Step #1 -----',
				'Specify only the bag name param to get list of most recent tiddlers',
				` up to the 'limit' - currently 20 tiddlers`,
				].join('\n')
			);
			submit(`showObj(poll_1)\n`);

			submit(`showObj($tw.mws.store.getBagLastTiddlerId('bag-alpha'))\n`);
		}
	}
}

const addTiddler = {
	intro: () => {
		submit(`.clear\n`);
		submit(`tests.addTiddler.step(1)`,[
			'\n----- Test adding new tiddler -----',
			'There are 5 steps in this test',
			' - Step #1 returns the top 20 tiddlers in bag-alpha',
			' - Step #2 returns no tiddlers - step #1 already got them',
			' - Step #3 adds a tiddler to bag-alpha',
			' - Step #4 returns tiddler added',
			' - Step #5 returns no tiddlers - step #4 already got the added tiddler',
			'\nStep 1 returns the top 20 tiddlers in bag-alpha'
			].join('\n')
		);
	},

	step: (nbr) => {
		if (nbr === 1) {
			submit(`var poll_1 = $tw.mws.store.getBagRecentTiddlers('bag-alpha')\n`,[
				'\n----- Step #1 -----',
				'Specify only the bag name param to get list of most recent tiddlers',
				` up to the 'limit' - currently 20 tiddlers`,
				].join('\n')
			);
			submit(`showObj(poll_1)\n`);

			submit(`tests.addTiddler.step(2)`,
				`\nStep 2 will return no tiddlers - step #1 already got them`);
		}

		else if (nbr === 2) {
			submit(`poll_1.bag_max_tiddler_id\n`,[
				'\n----- Step #2 -----',
				'Using the bag_max_tiddler_id from step #1',
				`Returns no tiddlers as tiddler_id needs to be greater than step #1's bag_max_tiddler_id`
				].join('\n')
			);
			submit(`var poll_2 = $tw.mws.store.getBagRecentTiddlers('bag-alpha', poll_1.bag_max_tiddler_id)\n`);
			submit(`showObj(poll_2)\n`);

			submit(`tests.addTiddler.step(3)`,'\nStep #3 adds a tiddler to bag-alpha');
		}

		else if (nbr === 3) {
			submit(`var newTiddler = {\n`,'\n---- Step #3 Add tiddler to bag-alpha -----');
			submit(`title: 'In the bag',\n`);
			submit(`text: 'This tiddler is in bag-alpha'\n`);
			submit(`}\n`);
			submit(`$tw.mws.store.saveBagTiddler(newTiddler,'bag-alpha')\n`);

			submit(`tests.addTiddler.step(4)`,`\nStep 4 returns tiddler added`);
		}

		else if (nbr === 4) {
			submit(`poll_2.bag_max_tiddler_id\n`,[
				'\n----- Step #4 -----',
				'Using the bag_max_tiddler_id from step #2',
				'Returns new tiddler just added'
				].join('\n')
			);
			submit(`var poll_3 = $tw.mws.store.getBagRecentTiddlers('bag-alpha', poll_2.bag_max_tiddler_id)\n`);
			submit(`showObj(poll_3)\n`);

			submit(`tests.addTiddler.step(5)`,'\nStep 5 returns no tiddlers- step #4 already got added tiddler');
		}

		else if (nbr === 5) {
			submit(`poll_3.bag_max_tiddler_id\n`,[
				'\n----- Step #5 -----',
				'Using the bag_max_tiddler_id from step #4',
				'Returns no tiddlers as step #4 already got added tiddler'
				].join('\n')
			);
			submit(`var poll_4 = $tw.mws.store.getBagRecentTiddlers('bag-alpha', poll_3.bag_max_tiddler_id)\n`);
			submit(`showObj(poll_4)\n`);

			submit('', `\nEnd of test.addTiddler`);
		}


	}
}

module.exports = {
	Tests: Tests,
	addTiddler: addTiddler,
	show: show,
	getBagLastTiddlerId: getBagLastTiddlerId,
}
