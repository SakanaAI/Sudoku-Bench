
const FeaturePuzzlePack = (() => {
	// Helpers
		const {stripPuzzleFormat, decompressPuzzleId, fetchPuzzle, parsePuzzleData} = PuzzleLoader,
					{ThumbSettingsExclude, puzzleToSvg, svgToDataUri} = PuzzleTools;
	function FeaturePuzzlePack() {
		bindHandlers(this);
		PortableEvents.mixin(this);
		this.featureEnabled = false;
		this.packUiVisible = false;
		this.pack = undefined;
		this.puzzleIdx = undefined;
	}
	const C = FeaturePuzzlePack, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'puzzlepack';
	C.SettingName = C.Name;
	C.featureStyle = `
		.packpuzzle {
			display: block;
			line-height: 3rem;
			margin: 0 1rem;
			padding: 0.1rem;
		}
		.packpuzzle.current {
			/*background: #eeee;*/
		}
		/*
		.packpuzzle img {
			float: left;
			height: 2.8rem;
		}
		*/
		.overlay-padpack {
			background-color: var(--body-bg);
			animation: none;
		}
		.overlay-padpack .dialog {
			width: 100%;
			border: none;
		}
		.packsegment {
			margin: 0 2rem;
			border-bottom: 1px solid #aaa;
			max-width: 40rem;
			margin: 0 auto;
		}
		.packsegment .packpuzzle { display: block; margin: 0 auto; }
		.packsegment .packpuzzle img { display: block; width: 100%; height: 100%; }
	`;
	C.DefaultPackTitle = 'Puzzle Pack';
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
	// Thumbs
		C.LoadingThumb = svgToDataUri(Framework.icons.loadingThumb);
	// Puzzle Pack
		P.getHashIdx = () => parseInt((document.location.hash.match(/#puzzle([0-9]+)/) || [])[1]) || 0;
		P.getPuzzle = async function(puzzleIdx = this.puzzleIdx) {
			//console.warn('FeaturePuzzlePack.getPuzzle();', puzzleIdx);
			const {pack: {puzzles}} = this;
			const puzzleData = puzzles[puzzleIdx];
			return await parsePuzzleData(await fetchPuzzle(puzzleData.puzzle));
		};
		P.handleParsePuzzlePack = async function(puzzleId) {
			//console.warn('FeaturePuzzlePack.handleParsePuzzlePack(puzzleId);');
			await this.initPack();
			this.pack = JSON.parse(decompressPuzzleId(stripPuzzleFormat(puzzleId)));
			const puzzleIdx = this.puzzleIdx = this.getHashIdx();
			document.location.hash = `#puzzle${puzzleIdx}`;
			return await this.getPuzzle();
		};
		P.createPuzzlePack = async function(opts) {
			const {app} = Framework;
			const pack = {puzzles: []};
			if(opts.title) pack.title = opts.title;
			for(const p of opts.puzzles) {
				const puzzleInfo = {puzzle: p.puzzle};
				let puzzle = await parsePuzzleData(await fetchPuzzle(p.puzzle));
				const metadata = app.extractPuzzleMeta(puzzle);
				if(metadata.title) puzzleInfo.title = metadata.title;
				if(metadata.author) puzzleInfo.author = metadata.author;
				pack.puzzles.push(puzzleInfo);
			}
			return 'pack' + loadFPuzzle.compressPuzzle(JSON.stringify(pack));
		};
		P.openPuzzle = async function(nextPuzzleIdx = this.puzzleIdx) {
			//console.warn('FeaturePuzzlePack.openPuzzle(nextPuzzleIdx);', nextPuzzleIdx);
			const {app, app: {puzzle}} = Framework,
						{pack, puzzleIdx} = this;
			if(nextPuzzleIdx === puzzleIdx) return console.warn(`Pack Puzzle ${puzzleIdx} already open.`);
			this.puzzleIdx = nextPuzzleIdx;
			let ctcPuzzle = await this.getPuzzle();
			puzzle.puzzleId = undefined;
			await app.loadCTCPuzzle(ctcPuzzle);
		};
		P.initPack = async function() {
			if(this.packInitialized) return;
			//console.warn('FeaturePuzzlePack.initPack();');
			window.addEventListener('hashchange', this.handleHashchange);
			const {app, app: {puzzle}} = Framework;
			puzzle.on('start', this.handleStart);
			app.on('dialognoerrors', this.handleDialogNoErrors);
			Framework.addSetting({
				group: 'experimental', name: C.SettingName,
				tag: 'button',
				content: 'View Puzzle Pack',
				handler: this.handleShowDialog,
			});
			await requireScriptDependencies([`https://cdnjs.cloudflare.com/ajax/libs/showdown/2.1.0/showdown.min.js`]);
			this.mdconverter = new showdown.Converter();
			this.packInitialized = true;
		};
	// Handlers
		P.handleHashchange = async function(event) {
			//console.warn('FeaturePuzzlePack.handleHashchange(event);');
			if(this.pack === undefined) return;
			Framework.closeDialog();
			this.openPuzzle(this.getHashIdx());
		};
		P.handleShowDialog = function() {
			//console.warn('FeaturePuzzlePack.handleShowDialog();');
			this.openPackUi();
		};
		P.handleDialogClose = function() {
			//console.warn('FeaturePuzzlePack.handleDialogClose();');
			Framework.off('closedialog', this.handleDialogClose);
			this.packUiVisible = false;
		};
		P.handleStart = function() {
			if(this.pack) this.handleShowDialog();
		};
		P.handleCloseDialog = async function() {
			//console.warn('FeaturePuzzlePack.handleCloseDialog();');
			const {app, app: {puzzle}} = Framework;
			Framework.off('closedialog', this.handleCloseDialog);
			await sleep(0)();
			if(puzzle.isCompleted()) {
				let currentIdx = this.getHashIdx();
				document.location.hash = `#puzzle${currentIdx + 1}`;
				this.openPackUi();
			}
		};
		P.handleDialogButton = function(button) {
			//console.warn('FeaturePuzzlePack.handleDialogButton("%s");', button);
			const {app, app: {puzzle}} = Framework;
			if(button !== 'Close') {
				let elem = resolveSelector('.dialog .dialog-options button').find(elem => elem.textContent === button);
				this.openPuzzle(parseInt(elem.dataset.idx));
			}
			Framework.closeDialog();
			this.handleDialogClose();
		};
		P.handleDialogNoErrors = function() {
			//console.warn('FeaturePuzzlePack.handleDialogNoErrors();');
			const {app, app: {puzzle}} = Framework, {pack = {}} = this, {puzzles = [], segments = []} = pack;
			if(puzzle.isCompleted()) {
				let btnOkEl = document.querySelector('.dialog-options button');
				let currentIdx = this.getHashIdx();
				let nextPuzzle = puzzles[currentIdx + 1];
				if(nextPuzzle) {
					btnOkEl.innerHTML = `Next: ${nextPuzzle.title.slice(0, 30) + (nextPuzzle.title.length > 30 ? '…' : '')}`;
				}
			}
			Framework.on('closedialog', this.handleCloseDialog);
		};
		P.handleOpenPuzzle = async function(event) {
			//console.warn('FeaturePuzzlePack.handleOpenPuzzle(event);');
			const lerp = (from, to, progress) => Math.round((from + (to - from) * progress) * 10)/10;
			const {app, app: {svgRenderer: {svgElem}}} = Framework;
			event.preventDefault();
			const fromEl = event.target.closest('img');
			const hash = fromEl.closest('a').getAttribute('href');
			window.history.pushState(null, null, hash);
			this.openPuzzle(this.getHashIdx());
			const from = fromEl.getBoundingClientRect(), to = svgElem.getBoundingClientRect();
			const overlayEl = document.querySelector('.dialog-overlay');
			const img = new Image();
			img.src = fromEl.src;
			Object.assign(img.style, {
				position: 'absolute', 'z-index': 10000, //outline: '5px solid magenta',
				left: `${Math.round(from.left)}px`,
				top: `${Math.round(from.top)}px`,
				width: `${Math.round(from.width)}px`,
				height: `${Math.round(from.height)}px`
			});
			document.body.appendChild(img);
			for(let progress = 0; progress < 1; progress += 1/20) {
				Object.assign(img.style, {
					left: `${lerp(from.x, to.x, progress)}px`,
					top: `${lerp(from.y, to.y, progress)}px`,
					width: `${lerp(from.width, to.width, progress)}px`,
					height: `${lerp(from.height, to.height, progress)}px`,
					opacity: lerp(1, 0, progress)
				});
				overlayEl.style.opacity = lerp(1, 0, progress);
				await sleep(16)();
			}
			img.remove();
			Framework.closeDialog();
		};
	// Pack UI
		P.renderSegment = function(segment, idx) {
			//console.warn('FeaturePuzzlePack.renderSegment(segment, idx);', segment, idx);
			const {pack, pack: {puzzles}} = this, {title, text,puzzleidx, description} = segment;
			let res = '';
			if(title !== undefined) res += `<h2>${title}</h2>`;
			if(text !== undefined) res += this.mdconverter.makeHtml(text);
			if(puzzleidx !== undefined) {
				let puzzle = puzzles[puzzleidx];
				res += `<div><h2>${puzzle.title}</h2><a class="packpuzzle" href="#puzzle${puzzleidx}" id="puzzle${puzzleidx}" title="Click to Play"><img src="${C.LoadingThumb}"></a></div>`;
			}
			if(description !== undefined) res += this.mdconverter.makeHtml(description);
			return res;
		};
		P.openPackUi = async function() {
			//console.warn('FeaturePuzzlePack.openPackUi();');
			if(this.packUiVisible || this.pack === undefined) return;
			const {app, app: {puzzle}} = Framework, {pack, pack: {puzzles = [], segments = []}} = this;
			puzzle.off('start', this.handleStart);
			let title = pack.title || C.DefaultPackTitle;
			let currentIdx = this.getHashIdx();
			do await sleep(5)();
			while (this.mdconverter === undefined);
			Framework.closeDialog();
			Framework.on('closedialog', this.handleDialogClose);
			this.packUiVisible = true;
			if(segments.length === 0) {
				puzzles.forEach((puzzle, idx) => segments.push({puzzleidx: idx}));
			}
			Framework.showDialog({
				parts: [
					{tag: 'title', innerHTML: title, style: 'text-align: center'},
					{tag: 'div', children: segments.map((seg, idx) => ({class: 'packsegment', innerHTML: this.renderSegment(seg, idx)}))},
					{tag: 'options', options: ['Play Next', 'Close']},
				],
				overlayClass: 'overlay-padpack',
				autoClose: false,
				centerOverBoard: true,
				onButton: this.handleDialogButton,
				onCancel: this.handleDialogClose,
			});
			document.querySelector(`#puzzle${currentIdx}`)
				.closest('div').scrollIntoView({behavior: 'instant'});
			await this.updatePackUi();
		};
		P.updatePackUi = async function() {
			//console.warn('FeaturePuzzlePack.updatePackUi();');
			const {app, app: {puzzle}} = Framework, {puzzleIdx, pack, pack: {puzzles}} = this;
			if(!this.packUiVisible) return;
			const puzzleHash = `#puzzle${puzzleIdx}`;
			for(const elem of resolveSelector('.packpuzzle')) {
				elem.classList.toggle('current', elem.href.includes(puzzleHash));
			}
			let nextPuzzle;
			if(!puzzle.isCompleted()) nextPuzzle = puzzles[puzzleIdx];
			else if(puzzleIdx < puzzles.length - 1) nextPuzzle = puzzles[puzzleIdx + 1];
			const rePlayBtn = /^Play /;
			for(const elem of resolveSelector('.dialog .dialog-options button')) {
				if(rePlayBtn.test(elem.textContent)) {
					if(nextPuzzle !== undefined) {
						elem.style.display = 'block';
						elem.textContent = `Play "${nextPuzzle.title.slice(0, 25)}"`;
						elem.dataset.idx = puzzles.indexOf(nextPuzzle);
					}
					else {
						elem.style.display = 'none';
					}
				}
			}
			let puzElems = resolveSelector('.packpuzzle');
			for(const el of puzElems) {
				el.removeEventListener('click', this.handleOpenPuzzle);
				el.addEventListener('click', this.handleOpenPuzzle);
			}
			let restorePuzzle = false;
			for(let i = 0; i < puzzles.length; i++) {
				let puzzleData = puzzles[i];
				if(puzzleData.thumb === undefined) {
					restorePuzzle = true;
					let ctcPuzzle = await this.getPuzzle(i);
					puzzle.puzzleId = undefined;
					await app.loadCTCPuzzle(ctcPuzzle);
					puzzleData.thumb = svgToDataUri(await puzzleToSvg({width: 256, height: 256}));
				}
				let imgElem = puzElems[i].querySelector('img');
				imgElem.src = puzzleData.thumb;
			}
			if(restorePuzzle) {
				let ctcPuzzle = await this.getPuzzle(puzzleIdx);
				let puzzleData = puzzles[puzzleIdx];
				puzzle.puzzleId = undefined;
				await app.loadCTCPuzzle(ctcPuzzle);
			}
		};
	// Setting
		P.handleInit = async function() {
			PuzzleLoader.addPuzzleFormat({prefix: 'pack', parse: this.handleParsePuzzlePack});
		};
	
	return C;
})();

FeaturePuzzlePack.create();