
const FeatureFpuz = (() => {
	const {compressPuzzle} = loadFPuzzle;
	const {fetchPuzzle, getPuzzleFormat, decompressPuzzleId, parsePuzzleData, resolvePuzzleData} = PuzzleLoader;
	
	function FeatureFpuz() {
		bindHandlers(this);
		this.featureEnabled = false;
		this.config = C.DefaultConfig;
	}
	const C = FeatureFpuz, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'fpuztool';
	C.settingName = C.Name;
	C.DefaultConfig = {
		openNewWindow: true,
		insertMarkings: true,
	};
	// API
		C.create = async function() {
			const feature = new C();
			Framework.withApp(() => feature.addFeature());
		};
		P.init = async function() {
			if(C.featureStyle) this.featureStylesheet = await attachStylesheet(C.featureStyle);
			Framework.features = Framework.features || {};
			if(Framework.features[C.Name] !== undefined) {
				console.error('Feature "%s" already exists.', C.Name);
			}
			else {
				Framework.features[C.Name] = this;
			}
		};
		P.addFeature = async function() {
			this.init();
			if(typeof this.handleInit === 'function') this.handleInit();
		};
		P.removeFeature = async function() {
			this.featureEnabled = false;
			if(this.featureStylesheet) this.featureStylesheet.remove();
		};
	C.cleanInt = v => isNaN(parseInt(v)) ? v : parseInt(v);
	C.updateMarks = (cell, prop, fbCell, fpProp) => {
		let val = cell.propGet(prop);
		if(val === undefined || val === null || (Array.isArray(val) && val.length === 0)) return false;
		fbCell[fpProp] = Array.isArray(val) ? val.map(C.cleanInt): C.cleanInt(val);
		return true;
	};
	P.insertMarkings = function(fpuzzle) {
		const {updateMarks} = C;
		const {app: {currentPuzzle, sourcePuzzle, puzzle: {grid}}} = Framework;
		let changed = false;
		let rows = grid.cells, rowCnt = rows.length;
		for(let r = 0; r < rowCnt; r++) {
			let cols = rows[r], colCnt = cols.length;
			for(let c = 0; c < colCnt; c++) {
				changed = updateMarks(cols[c], 'centre', fpuzzle.grid[r][c], 'centerPencilMarks') || changed;
				changed = updateMarks(cols[c], 'corner', fpuzzle.grid[r][c], 'cornerPencilMarks') || changed;
				changed = updateMarks(cols[c], 'normal', fpuzzle.grid[r][c], 'value') || changed;
			}
		}
		return fpuzzle;
	};
	P.handleOpenFpuzzles = function() {
		const {puzzleId, config: {openNewWindow, insertMarkings}} = this;
		let fpuzzle = JSON.parse(decompressPuzzleId(puzzleId));
		if(insertMarkings) this.insertMarkings(fpuzzle);
		const fpuzUrl = `https://f-puzzles.com/?load=${compressPuzzle(JSON.stringify(fpuzzle))}`;
		if(openNewWindow) {
			window.open(fpuzUrl, '_blank');
		}
		else {
			document.location = fpuzUrl;
		}
	};
	P.clearSetting = function() {
		let settingsOpts = Framework.settingsOpts;
		let settingIdx = settingsOpts.findIndex(({name}) => name === C.settingName)
		if(settingIdx !== -1) settingsOpts.splice(settingIdx, 1);
	};
	P.addSetting = function() {
		this.clearSetting();
		// TODO: Handle settings without persistance more cleanly
		Framework.addSetting({
				group: 'importexport', name: C.settingName,
				tag: 'button',
				innerHTML: 'Open in f-puzzle <span style="font-size:80%;">(+marks, SPOILS fog!)</span>',
				style: 'font-size: 90%;',
				handler: this.handleOpenFpuzzles
		});
	};
	P.handleUpdate = async function() {
		const {app} = Framework;
		if(app === undefined) return;
		const {currentPuzzle} = app;
		if(currentPuzzle === undefined) return;
		let puzzleId = getPuzzleId();
		if(this.puzzleId === puzzleId) return;
		puzzleId = await fetchPuzzle(puzzleId);
		if(this.puzzleId === puzzleId) return;
		this.puzzleId = puzzleId;
		const isFpuz = getPuzzleFormat(puzzleId) === 'fpuz';
		const hasFog = currentPuzzle.foglight !== undefined;
		if(isFpuz) this.addSetting();
	};
	P.attachElem = function() {
		const {app} = Framework;
		if(app === undefined) return;
		app.puzzle.on('progressloaded', this.handleUpdate);
		app.puzzle.on('start', this.handleUpdate);
	};
	P.detachElem = function() {
		let {app} = Framework;
		if(app === undefined) return;
		app.puzzle.off('progressloaded', this.handleUpdate);
		app.puzzle.off('start', this.handleUpdate);
	};
	P.handleInit = function() {
		this.attachElem();
		this.handleUpdate();
	};
	P.removeFeature = async function() {
		this.featureEnabled = false;
		if(this.featureStylesheet) this.featureStylesheet.remove();
		this.detachElem();
	};
	
	return C;
})();

FeatureFpuz.create();