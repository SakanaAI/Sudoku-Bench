
const FeatureEndless = (() => {
	// Helpers
		const {ThumbSettingsExclude, puzzleToSvg, svgToDataUri} = PuzzleTools;
		const {fetchPuzzle, parsePuzzleData, resolvePuzzleData} = PuzzleLoader;
		const isInViewport = (el) =>{
			const rect = el.getBoundingClientRect();
			return (
				rect.top >= 0 &&
				rect.left >= 0 &&
				rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
				rect.right <= (window.innerWidth || document.documentElement.clientWidth)
			);
		};
	
	function FeatureEndless() {
		bindHandlers(this);
		PortableEvents.mixin(this);
		this.featureEnabled = false;
		this.puzzlesets = [];
		this.puzzles = [];
		this.thumbQueue = [];
		this.thumbIsProcessing = false;
		this.pThumbs = Promise.resolve();
		this.savedSettings = {};
	}
	const C = FeatureEndless, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'endless';
	C.SettingName = C.Name;
	C.featureStyle = `
		.endlessdialog {
			/*
			border: none;
			border-radius: 0;
			width: 100%; height: 100%;*/
		}
		.endlesspuzzle {
			position: relative;
		}
		.endlessdialog .endless-btn-skip {
			position: absolute;
			top: 0;
			right: 0;
			width: 20px; height: 20px;
			line-height: 20px;
			padding: 0; margin: 4px;
			font-size: 18px;
			font-weight: 800;
			border-radius: 4px;
			opacity: 0.8;
		}
	`;
	C.DataVersion = '1.0.0';
	C.DataKey = 'endlesspuzzles';
	C.InitialPuzzleSets = '/assets/endlesspuzzles.json';
	C.SetPuzzleCount = 3;
	C.icon = `<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M220-260q-92 0-156-64T0-480q0-92 64-156t156-64q37 0 71 13t61 37l68 62-60 54-62-56q-16-14-36-22t-42-8q-58 0-99 41t-41 99q0 58 41 99t99 41q22 0 42-8t36-22l310-280q27-24 61-37t71-13q92 0 156 64t64 156q0 92-64 156t-156 64q-37 0-71-13t-61-37l-68-62 60-54 62 56q16 14 36 22t42 8q58 0 99-41t41-99q0-58-41-99t-99-41q-22 0-42 8t-36 22L352-310q-27 24-61 37t-71 13Z"/></svg>`;
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
			this.trigger('init');
			if(C.featureStyle) this.featureStylesheet = await attachStylesheet(C.featureStyle);
		};
		P.addFeature = async function() {
			this.init();
		};
		P.removeFeature = async function() {
			this.featureEnabled = false;
			if(this.featureStylesheet) this.featureStylesheet.remove();
		};
	// Puzzle
		C.setPuzzleLocation = async function(puzzleId) {
			let pathname = document.location.pathname.replace(/\/(sudoku\/)?(.*)/, '/$1');
			let qs = new URLSearchParams(document.location.search);
			qs.delete('puzzleid');
			let qstr = qs.toString();
			let nextUrl = `${pathname}${puzzleId}${qstr ? '?' + qstr : ''}`;
			window.history.pushState({}, 'SudokuPad', nextUrl);
		};
		P.getPuzzle = function(shortid) {
			return this.puzzles.find(p => p.shortid === shortid);
		};
		P.hasPuzzle = function(shortid) {
			return this.puzzles.find(p => p.shortid === shortid);
		};
		P.loadPuzzleData = async function(shortid, res = {}) {
			//console.warn('FeatureEndless.loadPuzzleData:', shortid);
			// TODO: Turn this into a cache
			let puzzleId, puzzle, id;
			try {
				puzzleId = await fetchPuzzle(shortid);
				puzzle = await parsePuzzleData(puzzleId);
				id = String(puzzle.id).replace(/[^0-9]/g, '');
				return Object.assign(res, {shortid, id, puzzleId, puzzle});
			}
			catch(err) {
				console.error('loadPuzzleData:', err);
				console.log('  shortid:', shortid);
				console.log('  puzzleId:', puzzleId);
				console.log('  puzzle:', puzzle);
				console.log('  id:', id);
			}
		};
	// Settings
		C.ForcedSettings = {
			labelrowscols: false,
			digitoutlines: false,
			dashedgrid: false,
			largedigits: true,
			hidecolours: false,
		};
		P.preserveSettings = function() {
			this.restoreSettings();
			for(const [name, val] of Object.entries(C.ForcedSettings)) {
				this.savedSettings[name] = Framework.getSetting(name);
				Framework.setSetting(name, val);
			}
		};
		P.restoreSettings = function() {
			for(const [name, val] of Object.entries(this.savedSettings)) {
				Framework.setSetting(name, val);
				delete this.savedSettings[name];
			}
		};
	// Puzzle Thumbs
		C.LoadingThumb = svgToDataUri(Framework.icons.loadingThumb);
		P.thumbsDone = function() {
			const {setLoading, thumbQueue, puzzles} = this;
			return !setLoading && thumbQueue.length === 0 && puzzles.find(p => p.observer !== undefined) === undefined;
		};
		P.waitForThumbs = async function() {
			if(this.thumbsDone()) return;
			let handleThumbsdone;
			await new Promise(resolve => {
				handleThumbsdone = resolve;
				this.on('thumbsdone', handleThumbsdone);
			});
			this.off('thumbsdone', handleThumbsdone);
		};
		P.refreshThumbs = function() {
			const thumbImgs = document.querySelectorAll(`img.endless-thumb`);
			thumbImgs.forEach(img => {
				let id = img.dataset.puzzleid;
				let puzzleData = this.getPuzzle(id);
				let thumbUrl = puzzleData.thumb;
				try {
					if(thumbUrl && img.src !== thumbUrl) {
						img.addEventListener('error', this.handleThumbError);
						img.src = thumbUrl;
						if(puzzleData.observer) {
							puzzleData.observer.unobserve(img);
							puzzleData.observer.disconnect();
							delete puzzleData.observer;
						}
					}
				}
				catch(err) {
					console.error('refreshThumbs:', err);
					console.log('  id:', id);
					console.log('  puzzleData:', puzzleData);
				}
			});
			if(this.thumbsDone()) this.trigger('thumbsdone');
		};
		P.createThumb = async function(puzzleData) {
			if(puzzleData.thumb) return puzzleData.thumb;
			const {app} = Framework;
			//const timeLabel = `createthumb("${puzzleData.id}")`;
			//console.time(timeLabel);
			//app.puzzle.replayPlaying = true;
			this.isPuzzleLoading = true;
			app.puzzle.puzzleId = undefined;
			const puzzleClone = JSON.parse(JSON.stringify(puzzleData.puzzle));
			await app.loadCTCPuzzle(puzzleClone);
			this.throttledRestoreCurrentPuzzle();
			puzzleData.isCompleted = app.puzzle.isCompleted();
			this.isPuzzleLoading = false;
			this.trigger('puzzleloadingdone');
			//app.puzzle.replayPlaying = true;
			this.preserveSettings();
			puzzleData.thumb = svgToDataUri(await puzzleToSvg({width: 512, height: 512}));
			this.restoreSettings();
			//console.timeEnd(timeLabel);
		};
		P.removeFromQueue = function(puzzleData) {
			const {thumbQueue} = this;
			let idx = thumbQueue.indexOf(puzzleData);
			if(idx !== -1) thumbQueue.splice(idx, 1);
		};
		P.handleProcessThumb = async function() {
			const {thumbQueue} = this;
			if(thumbQueue.length === 0) return false;
			const puzzleData = thumbQueue.shift();
			if(puzzleData.thumb) return true;
			let res = false;
			this.thumbIsProcessing = true;
			try {
				await this.createThumb(puzzleData);
				this.refreshThumbs();
				res = true;
			}
			catch(err) {
				console.error('handleProcessThumb:', err);
				console.log('  puzzleData:', puzzleData);
			}
			this.thumbIsProcessing = false;
			return res;
		};
		P.enqueueThumb = function(puzzleData, priority = false) {
			const {thumbQueue} = this;
			if(puzzleData !== undefined) {
				if(priority) {
					this.removeFromQueue(puzzleData);
					thumbQueue.unshift(puzzleData);
				}
				else {
					let idx = thumbQueue.indexOf(puzzleData);
					if(idx === -1) thumbQueue.push(puzzleData);
				}
			}
		};
		P.requestThumb = async function(puzzleData, priority = false) {
			const {thumbQueue} = this;
			if(puzzleData.thumb !== undefined) {
				console.warn('skip?!', puzzleData);
				return this.pThumbs;
			}
			if(puzzleData !== undefined) this.enqueueThumb(puzzleData, priority);
			await this.pThumbs;
			if(thumbQueue.length > 0) {
				this.pThumbs = this.pThumbs.then(() => this.handleProcessThumb());
			}
			return this.pThumbs;
		};
		P.handleThumbIntersection = async function(entries) {
			const {thumbQueue} = this;
			const {target: img, intersectionRatio: ratio, isIntersecting} = entries[0];
			let id = img.dataset.puzzleid;
			let puzzleData = this.getPuzzle(id);
			if(isIntersecting) {
				this.requestThumb(puzzleData, ratio > 0.5);
			}
			else {
				this.removeFromQueue(puzzleData);
			}
		}
		P.observeThumb = function(img) {
			let id = img.dataset.puzzleid;
			let puzzleData = this.getPuzzle(id);
			const opts = {
				root: document.querySelector('.endlessdialog'),
				threshold: [0, 0.5]
			};
			let observer = new IntersectionObserver(this.handleThumbIntersection, opts);
			observer.observe(img);
			puzzleData.observer = observer;
		};
		P.handleThumbError = async function(event) {
			let img = event.target, id = img.dataset.puzzleid;
			console.error('handleThumbError("%s");', id);
			console.log('  event:', event);
			console.log('  event.type:', event.type);
			console.log('  img:', img);
		};
	// Puzzle Listing
		P.puzzleGetHtml = function(puzzleData) {
			const {shortid, thumb = C.LoadingThumb, puzzle} = puzzleData;
			let w = 128, h = 128, {nextpuzzle} = puzzle.metadata || {};
			return `
				<div class="endlesspuzzle" data-id="${shortid}" style="display: inline-block; padding: 16px;">
					<a href="/${shortid}" class="display: block;"><img class="endless-thumb" data-puzzleid="${shortid}" src="${thumb}" loading="lazy" width="${w}" height="${h}" style="display: block;"></a>
					<button class="endless-btn-skip" data-id="${shortid}" title="Skip">✕</button>
				</div>
			`;
		};
		P.puzzleRender = function(set, puzzleData) {
			let setElem = document.querySelector(`.endlessset[data-setid="${set.start}"] .setscroll`);
			setElem.insertAdjacentHTML('beforeend', this.puzzleGetHtml(puzzleData));
			let puzElem = setElem.lastElementChild;
			this.observeThumb(puzElem.querySelector('.endless-thumb'));
			//puzElem.querySelector('.endless-thumb').addEventListener('error', this.handleThumbError);
			puzElem.querySelector('.endless-btn-skip').addEventListener('click', this.handleSkip);
			return puzElem;
		};
		P.handleSkip = async function(event) {
			let id = event.target.dataset.id;
			return this.skipPuzzle(id);
		};
	// Puzzle Sets
		P.setRenderPuzzles = async function(set) {
			const {start, current} = set;
			let setElem = document.querySelector(`.endlessset[data-setid="${start}"] .setscroll`);
			const setHiddenElem = document.querySelector(`.endlessset[data-setid="${start}"] .set-hidden`);
			if(setHiddenElem) setHiddenElem.innerHTML = `(${set.archive.length} puzzles hidden)`;
			let puzzleElems = setElem.querySelectorAll(`.endlesspuzzle`);
			puzzleElems.forEach(elem => {
				if(!current.includes(elem.dataset.id)) elem.remove();
			});
			for(let i = 0; i < current.length; i++) {
				let shortid = current[i];
				if(document.querySelector(`.endlesspuzzle[data-id="${shortid}"]`)) continue;
				let puzzleData = this.getPuzzle(shortid);
				await this.puzzleRender(set, puzzleData);
			}
			setElem.scrollLeft = 1000;
			/*
			if(!this.setLoading) {
				await this.waitForThumbs();
				this.restoreCurrentPuzzle();
			}
			*/
		};
		P.setGetHtml = function (set) {
			return `
				<div class="endlessset" data-setid="${set.start}" style="overflow: hidden;">
					<h2>${set.title}</h2>
					<div style="margin: 0 1rem; font-size: 80%;" class="set-hidden">(${set.archive.length} puzzle${set.archive.length===1?'':'s'} hidden)</div>
					<div class="setscroll" style="white-space: nowrap; overflow-x: scroll;">
					</div>
				</div>
			`;
		};
		P.setRender = async function(set) {
			let rootElem = document.querySelector('#puzzlesets');
			rootElem.insertAdjacentHTML('beforeend', this.setGetHtml(set));
			/*
			let shortid = set.start;
			for(let i = 0; i < C.SetPuzzleCount; i++) {
				let puzzleData = await this.addPuzzle(set, shortid);
				shortid = puzzleData.puzzle.metadata.nextpuzzle;
				if(shortid === undefined) break;
			}
			*/
			await this.setRenderPuzzles(set);
		};
		P.addPuzzle = async function(set, shortid) {
			let puzzleData = this.getPuzzle(shortid);
			if(puzzleData === undefined) {
				puzzleData = await this.loadPuzzleData(shortid);
				this.puzzles.push(puzzleData);
			}
			set.current.push(puzzleData.shortid);
			puzzleData.set = set;
			return puzzleData;
		};
		P.skipPuzzle = async function(shortid) {
			let puzzleData = this.getPuzzle(shortid);
			if(puzzleData === undefined) throw new Error('setSkipPuzzle > puzzle not found: ' + shortid);
			const {set} = puzzleData;
			let idx = set.current.indexOf(shortid);
			if(idx === -1) return console.warn('Puzzle not found in set', shortid, set);
			// Find next shortid
			let lastPuzzle = this.getPuzzle(set.current[set.current.length - 1]);
			let nextPuzzleId = lastPuzzle.puzzle.metadata.nextpuzzle;
			// Archive puzzle
			set.archive.push(set.current.splice(idx, 1)[0]);
			// Add next
			await this.addPuzzle(set, nextPuzzleId);
			this.throttledSaveData();
			await this.setRenderPuzzles(set);
		};
		P.addSet = function(start, title) {
			const setExists = this.puzzlesets.find(set => set.start === start) !== undefined;
			if(setExists) throw new Error(`Set "${start}" already exists.`);
			const set = {title, start, current: [], archive: []};
			this.puzzlesets.push(set);
			return set;
		};
	// Dialog
		P.handleAppMenu = async function(event) {
			event.preventDefault();
			this.handleShowDialog();
		};
		P.handleInit = async function() {
			Framework.addSetting({
				group: 'experimental', name: C.SettingName,
				tag: 'button',
				content: 'Endless Puzzles',
				handler: this.handleShowDialog
			});
			Framework.on('togglesetting', this.handleToggleSetting);
			const appmenuElem = document.querySelector('#appmenuitems');
			if(appmenuElem) {
				appmenuElem.insertAdjacentHTML('beforeend',
					`<a class="mdc-list-item menu-link-endless" href="#" id="appmenu-endless">
						<div class="icon">${C.icon}</div>
						<span class="mdc-list-item-text">Endless Puzzles (Demo)</span>
					</a>`
				);
				addHandler(appmenuElem.lastChild, 'click', this.handleAppMenu, {passive: false, capture: true});
			}
		};
		P.handlePuzzleSolved = async function() {
			/*
			let puzzleId = getPuzzleId();
			for await(const set of this.puzzlesets) {
				//console.log('  set:', set.current);
				if(set.current.indexOf(puzzleId) !== -1) {
					//console.warn('ENDLESS: Remove current puzzle:', puzzleId);
					//await this.skipPuzzle(puzzleId);
				}
			}
			*/
		};
		P.handleToggleSetting = function(name, prev, next) {
			if(ThumbSettingsExclude.includes(name)) {
				for(const puzzleData of this.puzzles) delete puzzleData.thumb;
			}
		};
		P.restoreCurrentPuzzle = async function() {
			const {app} = Framework;
			const {thumbQueue} = this;
			thumbQueue.length = 0;
			if(this.isPuzzleLoading) {
				await new Promise(resolve => {
					const handleLoadingDone = () => {
						this.off('puzzleloadingdone', handleLoadingDone);
						resolve();
					};
					this.on('puzzleloadingdone', handleLoadingDone);
				});
			}
			if(this.currentPuzzle && app.puzzle.puzzleId !== this.currentPuzzleId) {
				app.puzzle.puzzleId = undefined;
				await app.loadCTCPuzzle(await resolvePuzzleData(this.currentPuzzle));
			}
		};
		P.throttledRestoreCurrentPuzzle = throttleFunc(P.restoreCurrentPuzzle, 200, 5000);
		P.loadData = async function() {
			let data = Framework.getData(C.DataKey);
			//console.log('  data:', data);
			if(data === null) {
				let initialSets = await (await fetchWithTimeout(C.InitialPuzzleSets)).json();
				for await (const {start, title} of initialSets) {
					const set = this.addSet(start, title);
					//console.log('  preparing set:', set);
					let shortid = set.start;
					for(let i = 0; i < C.SetPuzzleCount; i++) {
						let puzzleData = await this.addPuzzle(set, shortid);
						shortid = puzzleData.puzzle.metadata.nextpuzzle;
						if(shortid === undefined) break;
					}
				}
			}
			else {
				for await (const {start, title, current, archive} of data.sets) {
					const setExists = this.puzzlesets.find(set => set.start === start) !== undefined;
					//console.log('Adding set:', start, title, setExists);
					if(setExists) continue;
					const set = this.addSet(start, title);
					for await (const idx of current) {
						await this.addPuzzle(set, data.puzzles[idx]);
					}
					set.archive.length = 0;
					set.archive.push(...archive.map(idx => data.puzzles[idx]));
				}
			}
			//console.log('  puzzles:', this.puzzles);
			//console.log('  puzzlesets:', this.puzzlesets);
		};
		P.saveData = async function() {
			//console.log('  puzzles:', this.puzzles);
			//console.log('  puzzlesets:', this.puzzlesets);
			const shortids = [...new Set(this.puzzlesets.flatMap(({current, archive}) => [...current, ...archive]))];
			//console.log('  shortids:', shortids);
			/*
			const completed = shortids.map(id => {
				let puz = this.hasPuzzle(id);
				if(puz === undefined) return -1;
				return puz.isCompleted ? 1 : 0;
			});
			*/
			const data = {
				version: C.DataVersion,
				puzzles: shortids,
				//completed,
				sets: this.puzzlesets.map(({title, start, current, archive}) => ({
					title, start,
					current: current.map(id => shortids.indexOf(id)),
					archive: archive.map(id => shortids.indexOf(id)),
				}))
			}
			//console.log('  data:', data);
			//console.log('  data:', JSON.stringify(data).length, JSON.stringify(data));
			Framework.setData(C.DataKey, data);
		};
		P.resetData = async function() {
			Framework.removeData(C.DataKey);
			this.puzzles.length = 0;
			this.puzzlesets.length = 0;
			this.handleShowDialog();
		};
		P.throttledSaveData = throttleFunc(P.saveData, 500, 2000);
		P.handleDialogClose = async function() {
			//console.warn('FeatureEndless.handleDialogClose();');
			this.throttledRestoreCurrentPuzzle.force.call(this);
		};
		P.handleDialogButton = async function(btn) {
			//console.warn('FeatureEndless.handleDialogButton();');
			switch(btn) {
				case 'Close':
					this.handleDialogClose();
					Framework.closeDialog();
					break;
				case 'Reset All':
					this.resetData();
					break;
			}
		};
		P.handleShowDialog = async function() {
			//console.warn('FeatureEndless.handleShowDialog();');
			this.currentPuzzle = getPuzzleId();
			this.currentPuzzleId = Framework.app.puzzle.puzzleId;
			Framework.closeDialog();
			Framework.showDialog({
				parts: [
					{tag: 'title', innerHTML: 'Endless Puzzles', style: 'text-align: center'},
					{tag: 'div', id: 'puzzlesets'},
					{tag: 'options', options: ['Close', 'Reset All']},
				],
				overlayClass: 'endlessoverlay',
				dialogClass: 'endlessdialog',
				autoClose: false,
				centerOverBoard: true,
				onButton: this.handleDialogButton,
				onCancel: this.handleDialogClose,
			});
			await this.loadData();
			this.setLoading = true;
			console.time('load sets');
			for await (const set of this.puzzlesets) await this.setRender(set);
			console.timeEnd('load sets');
			this.setLoading = false;
			this.throttledSaveData();
		};
	
	return C;
})();

FeatureEndless.create();