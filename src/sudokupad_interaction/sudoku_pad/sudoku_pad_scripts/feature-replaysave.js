const FeatureReplaySave = (() => {

	function FeatureReplaySave() {
		bindHandlers(this);
		PortableEvents.mixin(this);
		this.featureEnabled = false;
	}
	const C = FeatureReplaySave, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'replaysave';
	C.SettingName = C.Name;
	C.featureStyle = `
		.replayfiledrop .dialog {
			border-color: red;
		}
	`;
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
	C.createPayload = async function(puzzle, replay) {
		const {fetchPuzzle} = PuzzleLoader;
		let format = 'replay_v1.0';
		puzzle = await fetchPuzzle(puzzle);
		return JSON.stringify({format, puzzle, replay: JSON.parse(replay)});
	};
	C.createReplayFilename = async function(payload) {
		const {resolvePuzzleData} = PuzzleLoader;
		const cleanStr = (str = '') => str.replace(/[^a-zA-Z0-9]/gm, ' ').replace(/^ *| *$/gm, '').replace(/ +/gm, '_');
		const {app} = Framework;
		let {puzzle: puzzleId, replay} = JSON.parse(payload);
		replay = Replay.decode(replay);
		let replayLength = Puzzle.replayLength(replay);
		let metadata = app.extractPuzzleMeta(await resolvePuzzleData(puzzleId));
		let author = cleanStr(metadata.author);
		let title = cleanStr(metadata.title || 'puzzle');
		let filename = `sudokupad-${author ? author.slice(0, 10) + '-' : ''}${title.slice(0, 30)}-a${replay.actions.length}-d${Math.round(replayLength / 1000)}.replay`;
		return filename;
	};
	P.setPuzzleLocation = async function(puzzleId) {
		let pathname = document.location.pathname.replace(/\/(sudoku\/)?(.*)/, '/$1');
		let qs = new URLSearchParams(document.location.search);
		qs.delete('puzzleid');
		let qstr = qs.toString();
		let nextUrl = `${pathname}${puzzleId}${qstr ? '?' + qstr : ''}`;
		window.history.pushState({}, 'SudokuPad', nextUrl);
	};
	P.loadPayload = async function(payload) {
		const {app, app: {puzzle}} = Framework, {splitPuzzleFormat, resolvePuzzleData} = PuzzleLoader;
		let {puzzle: puzzleId, replay} = JSON.parse(payload);
		if(!puzzleId || !replay) throw new Error('Invalid payload (puzzleId or replay)');
		let [puzzleFormat, puzzleData] = splitPuzzleFormat(puzzleId);
		if(!puzzleFormat) throw new Error('Invalid payload (puzzleFormat)');
		if(puzzleId !== getPuzzleId()) this.setPuzzleLocation(puzzleId);
		puzzle.puzzleId = undefined;
		await app.loadCTCPuzzle(await resolvePuzzleData(puzzleId));
		puzzle.restartPuzzle();
		await puzzle.loadProgress({replay});
	};
	P.clearDragNDrop = function() {
		document.removeEventListener('drop', this.handleWindowDrop);
		document.removeEventListener('dragenter', this.handleWindowDragenter, {capture: true});
		document.removeEventListener('dragleave', this.handleWindowDragleave, {capture: true});
		document.removeEventListener('dragover', this.handleWindowDragover, {capture: true});
		document.body.classList.remove('replayfiledrop');
	};
	P.getDropFiles = function(event) {
		let {dataTransfer = {}, dataTransfer: {items = [], files = []} = {}} = event;
		return [...items];
	};
	P.handleLoadFromFile = async function(file) {
		try {
			let payload = (await readFile(file)).target.result;
			await this.loadPayload(payload);
		}
		catch (err) {
			console.error('Error in handleLoadFromFile:', err);
			this.handleDialogCancel();
			return Framework.showAlert('Error loading data from file. Possibly invalid or corrupted.');
		}
		this.handleDialogCancel();
	};
	P.handleWindowDrop = async function(event) {
		let dropFiles = this.getDropFiles(event);
		if(dropFiles.length === 0) return;
		event.preventDefault();
		event.stopPropagation();
		await this.handleLoadFromFile(dropFiles[0].getAsFile());
	};
	P.handleWindowDragover = function(event) {
		if(this.getDropFiles(event).length === 0) return;
		event.preventDefault();
		event.stopPropagation();
	};
	P.handleWindowDragenter = function(event) {
		if(this.getDropFiles(event).length === 0) return;
		event.preventDefault();
		event.stopPropagation();
		document.body.classList.add('replayfiledrop');
	};
	P.handleWindowDragleave = function(event) {
		if(this.getDropFiles(event).length === 0) return;
		if(event.relatedTarget !== null) return;
		event.preventDefault();
		event.stopPropagation();
		document.body.classList.remove('replayfiledrop');
	};
	P.handleDialogButton = async function(button) {
		if(button === 'Save File') {
			let filename = document.querySelector('#replaysave_filename').value;
			downloadFile(this.payload, 'application/json', filename);
		}
		else if(button === 'Load File') {
			return loadFromFile(this.handleLoadFromFile, {accept: '.replay, .json'});
		}
		this.handleDialogCancel();
	};
	P.handleDialogCancel = async function() {
		Framework.closeDialog();
		delete this.payload;
		this.clearDragNDrop();
	};
	P.handleOpenDialog = async function(event) {
		if(event && event.target && event.target.tagName === 'A') event.preventDefault();
		const {app} = Framework;
		let payload = this.payload = await C.createPayload(getPuzzleId(), app.getReplay());
		let {puzzle: puzzleId, replay} = JSON.parse(payload);
		replay = Replay.decode(replay);
		let filename = await C.createReplayFilename(payload);
		document.addEventListener('dragenter', this.handleWindowDragenter, {capture: true});
		document.addEventListener('dragleave', this.handleWindowDragleave, {capture: true});
		document.addEventListener('dragover', this.handleWindowDragover, {capture: true});
		document.addEventListener('drop', this.handleWindowDrop, {capture: true});
		Framework.closeDialog();
		Framework.showDialog({
			parts: [
				{tag: 'title', innerHTML: 'Replay Save/Load', style: 'text-align: center'},
				{tag: 'p', content: 'Drop replay file here to load.', style: 'font-size: 120%; margin: 1rem;'},
				{style: 'margin: 0.5rem 1rem;', children: [
					{style: 'margin: 0.25rem 0', children: [
						{tag: 'label', content: 'Size in bytes:', style: 'margin: 0; display: inline;'},
						{tag: 'span', innerHTML: `<strong>${payload.length}</strong>`, style: 'margin: 0.25rem;'}
					]},
					{style: 'margin: 0.25rem 0', children: [
						{tag: 'label', content: 'Number of actions in replay:', style: 'margin: 0; display: inline;'},
						{tag: 'span', innerHTML: `<strong>${replay.actions.length}</strong>`, style: 'margin: 0.25rem;'}
					]},
					{style: 'margin: 0.25rem 0', children: [
						{tag: 'label', content: 'Filename:', style: 'margin: 0; display: inline;'},
						{tag: 'input', type: 'text', value: filename, id: 'replaysave_filename', style: 'display: block; width: 100%; margin: 0; padding: 0.25rem;  border-style: solid;'}
					]},
				]},
				{tag: 'options', options: ['Save File', 'Load File', 'Cancel']},
			],
			autoClose: false,
			centerOverBoard: true,
			onButton: this.handleDialogButton,
			onCancel: this.handleDialogCancel,
		});
	};
	P.handleDownloadReplays = async function(event) {
		const reProgress = /^progress_/, ls = localStorage, len = ls.length,
					textEncoder = new TextEncoder(),
					progressData = [];
		for(let i = 0; i < len; i++) {
			let key = ls.key(i);
			if(reProgress.test(key)) progressData.push({name: `${key}.progress`, data: textEncoder.encode(ls.getItem(key))});
		}
		let zipped = zipArchive(progressData);
		downloadBlobAsFile(zipped, `sudokupad_progress_${(new Date).toISOString().split('T')[0]}.zip`);
	};
	P.handleDialogSolved = function() {
		if(document.querySelector('#openreplay') !== null) return;
		document.querySelector('.dialog .dialog-options')
			.insertAdjacentHTML('beforebegin', `
				<p style="font-size: 80%; text-align: center; line-height: 2em; margin: 0;"><a href="#" id="openreplay">Save Replay</a></p>
			`);
		document.querySelector('#openreplay').addEventListener('click', this.handleOpenDialog);
	};
	P.handleStart = function() {
		this.handleOpenDialog();
		Framework.app.puzzle.off('start', this.handleStart);
	};
	P.handleInit = function() {
		let {app} = Framework;
		app.on('dialognoerrors', this.handleDialogSolved);
		app.on('dialogsolved', this.handleDialogSolved);
		Framework.addSetting({
			group: 'importexport', name: C.Name,
			tag: 'button',
			content: 'Replay Save/Load',
			handler: this.handleOpenDialog
		});
		Framework.addSetting({
			group: 'importexport', name: C.Name,
			tag: 'button',
			content: 'Download All Replays',
			handler: this.handleDownloadReplays
		});
	};
	
	return C;
})();

FeatureReplaySave.create();