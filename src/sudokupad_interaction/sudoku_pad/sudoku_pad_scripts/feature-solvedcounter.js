
const FeatureSolvedCounter = (() => {
	// Helpers
		const oneHour = 3600 * 1000, oneDay = 24 * oneHour;
		const plur = val => val === 1 ? '' : 's';
		const waitForElem = async (selector, interval = 10, timeout = 500) => {
			let t1 = Date.now() + timeout, el;
			do {
				if(el = document.querySelector(selector)) return el;
				await sleep(interval)();
			}
			while(Date.now() < t1);
			return null;
		};

	function FeatureSolvedCounter() {
		bindHandlers(this);
		PortableEvents.mixin(this);
		this.featureStylesheet = undefined;
		this.featureEnabled = false;
	}
	const C = FeatureSolvedCounter, P = Object.assign(C.prototype, {constructor: C});
	C.SettingName = C.Name = 'solvedcounter';
	C.featureStyle = '';
	C.KeyCounterIncremented = 'puzzlecounterincremented';
	C.UrlCounterApi = 'https://api.sudokupad.com/counter/';
	C.reCleanStr = /[^a-z0-9+_\-&!?.,:;\/\\'"()]+/ig;
	C.BlockedCounterIds = ['author-title', 'unknown-untitled', 'unknown-classicsudoku', 'jamessinclair-tbd', 'unknown-namelesssudoku'];
	// API
		C.create = async function() {
			const feature = new C();
			Framework.withApp(() => feature.addFeature());
		};
		P.init = async function() {
			Framework.features = Framework.features || {};
			if(Framework.features[C.Name] !== undefined) {
				console.error('Feature "%s" already exists.', C.Name);
			}
			else {
				Framework.features[C.Name] = this;
			}
			const proto = Object.getPrototypeOf(this);
			for await (const prop of Object.getOwnPropertyNames(proto)) {
				if('function' !== typeof this[prop] || !/^handleInit.*/.test(prop)) continue;
				await this[prop]();
			}
			if(C.featureStyle) this.featureStylesheet = await attachStylesheet(C.featureStyle);
		};
		P.addFeature = async function() {
			this.init();
		};
		P.removeFeature = async function() {
			this.featureEnabled = false;
			if(this.featureStylesheet) this.featureStylesheet.remove();
		};
	// Replay
		P.replayTest = async function() {
			// Temporary Research Testing
			try {
				const config = await(await fetch('/assets/replaytest.config.json')).json(),
							currentDate = (new Date()).toISOString().split('T')[0],
							currentPuzzleId = getPuzzleId(),
							proceedTest = (!config.date || config.date === currentDate)
							&& (!config.puzzleids || config.puzzleids.includes(currentPuzzleId));
				if(proceedTest) {
					fetch('/admin/createlink', {
						method: 'post',
						'Content-Type': 'application/json',
						body: JSON.stringify({
							shortid: `replay/${currentPuzzleId}-${Math.random()*1e9|0}`,
							puzzle: `replay${Framework.app.puzzle.getProgress()}`
						})
					});
				}
			}
			catch(err){
				console.error('Error in replayTest:', err.toString());
			}
		};
	// Puzzle Data
		P.handleDataDecode = data => ({counter: data.includes('c'), liked: data.includes('l')});
		P.handleDataEncode = data => `${data.counter?'c':''}${data.liked?'l':''}`;
		P.loadData = function() {
			let data = Framework.getData(C.KeyCounterIncremented) || {};
			if(Array.isArray(data)) data = Object.fromEntries(data.map(v => [v, 'c'])); // Convert legacy data
			Object.keys(data).forEach(key => data[key] = P.handleDataDecode(data[key]));
			return data;
		};
		P.saveData = function(data) {
			Framework.setData(
				C.KeyCounterIncremented,
				Object.entries(data).reduce((acc, [id, dat]) => Object.assign(acc, {[id]: this.handleDataEncode(dat)}), {})
			);
		};
		P.getCounterData = function(counterid) {
			const data = this.loadData();
			data[counterid] = data[counterid] || {};
			return data[counterid];
		};
		P.setCounterData = function(counterid, prop, val) {
			const data = this.loadData();
			data[counterid] = data[counterid] || {};
			if(val !== data[counterid][prop]) {
				data[counterid][prop] = val;
				this.saveData(data);
			}
			return data[counterid];
		};
	// Counter
		P.getCounterId = function(puzzle = Framework.app.currentPuzzle) {
			let {author = 'unknown', title = 'untitled'} = puzzle;
			const reCleanStr = /[^a-z0-9+_\-&!?.,:;\/\\'"()]+/ig;
			return `${author.replace(reCleanStr, '')}-${title.replace(reCleanStr, '')}`.toLowerCase();
		};
		P.solvedCounterGet = async function(counterid) {
			return {}
			// let url = `${C.UrlCounterApi}${encodeURIComponent(counterid)}`;
			// try {
			// 	let res = await fetch(url);
			// 	if((res || {}).status === undefined) throw new Error(`fetch(${JSON.stringify(url)}): ${JSON.stringify(res)}`);
			// 	if(res.status !== 200) {
			// 		console.warn('Error in solvedCounterGet > API:', res.statusText);
			// 		return {};
			// 	}
			// 	return await res.json();
			// } catch(err) {
			// 	console.warn('Error in solvedCounterGet:', err);
			// 	return {};
			// }
		};
		P.solvedCounterInc = async function(counterid) {
			const {app: {timer, puzzle, currentPuzzle}} = Framework;
			if(this.getCounterData(counterid).counter) return this.solvedCounterGet(counterid);
			let url = `${C.UrlCounterApi}${encodeURIComponent(counterid)}/inc?time=${timer.elapsedTime}`;
			let puzzleId = getPuzzleId();
			if(puzzleId.length < 10000) url += `&puzzleid=${encodeURIComponent(puzzleId)}`;
			try {
				let res = await fetch(url);
				if(res.status !== 200) {
					console.warn('Error in solvedCounterInc > API:', res.statusText);
					return {};
				}
				let counter = await res.json();
				this.setCounterData(counterid, 'counter', true);
				Framework.track('puzzlesolved');
				this.replayTest();
				return counter;
			} catch(err) {
				console.error('Error in solvedCounterInc:', err);
				return {};
			}
		};
	// Likes
		C.LikedHtml = `<div id="likepuzzle" style="margin: 1rem auto; text-align: center; line-height: 1.5rem; vertical-align: baseline; corsor: pointer;">Liked this Puzzle? <span style="font-size: 1.5rem; vertical-align: bottom;">♡</span></div>`;
		C.updateLikeText = text => text.replace('♡', '❤️').replace('Liked this Puzzle?', 'You liked this Puzzle!');
		P.showLikeInDialog = async function(counterid) {
			const likepuzzleSel = '#likepuzzle';
			try {
				if(undefined === counterid) counterid = this.getCounterId();
				const dialogElem = await waitForElem('.dialog', 10, 500);
				let titleText = dialogElem.querySelector('h1').textContent;
				if(titleText.indexOf('Yey') !== -1) {
					if(!dialogElem.querySelector(likepuzzleSel)) {
						const isLiked = this.getCounterData(counterid).liked;
						let likeHtml = C.LikedHtml;
						if(isLiked) likeHtml = C.updateLikeText(likeHtml);
						dialogElem.querySelector('.dialog-options').insertAdjacentHTML('afterend', likeHtml);
						if(!isLiked) {
							const likepuzzleEl = dialogElem.querySelector(likepuzzleSel);
							const handleLikePuzzle = event => {
								this.setCounterData(counterid, 'liked', true);
								likepuzzleEl.innerHTML = C.updateLikeText(likepuzzleEl.innerHTML);
								likepuzzleEl.removeEventListener('click', handleLikePuzzle);
								Framework.track('puzzleliked');
							};
							likepuzzleEl.addEventListener('click', handleLikePuzzle);
						}
					}
				}
			}
			catch(err) {
				console.error('Error in showLikeInDialog:', err);
			}
		};
	// Dialog
		P.getCounterElem = async function() {
			// TODO: Select which dialogs we display in more carefully!
			let dialogElem = await waitForElem('.dialog', 10, 500);
			if(dialogElem === null) return null;
			let counterElem = dialogElem.querySelector('#solvedcounter');
			if(counterElem === null) {
				let counterHtml = `
					<p id="solvedcounter" style="display: none; font-size: 90%; text-align: center; line-height: 1rem; margin: 0.5rem 0 0 0;">
					Solve Counter: <span id="solvedcounter_val" style="font-weight: 600;"></span>
					<span id="solvedcounter_date" style="display: block; font-size: smaller; margin-top: 0.25rem;"></span>
					</p>`;
				dialogElem.querySelector('.dialog-options').insertAdjacentHTML('beforebegin', counterHtml);
				counterElem = dialogElem.querySelector('#solvedcounter');
			}
			return counterElem;
		};
		P.getCounterDurationString = function(duration) {
			let val;
			if(duration < oneHour) return `in less than 1 hour`;
			else if(duration < oneDay) {
				val = Math.round(duration / oneHour * 10) / 10;
				return `in ${val} hour${plur(val)}`;
			}
			else {
				val = Math.round(duration / oneDay * 10) / 10;
				return `in ${val} day${plur(val)}`;
			}
		};
		P.showCounterInDialog = async function(pCounter) {
			try {
				let counterid = this.getCounterId();
				this.showLikeInDialog(counterid);
				if(C.BlockedCounterIds.includes(counterid)) return;
				let counterElem = await this.getCounterElem();
				if(counterElem === null) return;
				if(pCounter === undefined) pCounter = this.solvedCounterGet(counterid);
				let counter = await pCounter;
				if(counter.count > 0) {
					counterElem.style.display = 'block';
					counterElem.querySelector('#solvedcounter_val').textContent = counter.count;
					if(counter.firstcount) {
						let duration = Date.now() - (new Date(counter.firstcount)).getTime();
						counterElem.querySelector('#solvedcounter_date').textContent =
							//`(since ${firstcountDate.toISOString().split('T')[0]})`;
							`(${this.getCounterDurationString(duration)})`;
					}
				}
			}
			catch(err) {
				console.error('Error in showCounterInDialog:', err);
			}
		};
		P.handleDialogSolved = async function() {
			this.showCounterInDialog(this.solvedCounterInc(this.getCounterId()));
		};
		P.handleStartTimer = async function() {
			const {app: {timer = {}}} = Framework;
			//if(timer.elapsedTime === 0) Framework.track('puzzlestart');
		};
		P.handleDialogShow = async function() {
			let hasRulestext = document.querySelector('.dialog .rulestext') !== null;
			let hasSupportlinks = document.querySelector('.dialog .supportlinks') !== null;
			if(hasRulestext || hasSupportlinks) this.showCounterInDialog();
		};
	// Init
		P.handleInit = async function() {
			const {app, app: {puzzle, timer}} = Framework;
			app.on('dialognoerrors', this.handleDialogSolved);
			timer.on('start', this.handleStartTimer);
			Framework.on('showdialog', this.handleDialogShow);
			app.featureSolvedCounter = this;
		};

	return C;
})();

FeatureSolvedCounter.create();
