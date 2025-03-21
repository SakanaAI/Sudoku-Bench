(() => {
	// TODO: Rewrite as feature component
	
	/*
	const getRegionShape = (size = 9) => {
		let height = Math.sqrt(size);
		if(Number.isInteger(height)) return [height, height];
		height = Math.floor(height);
		while(!Number.isInteger(size / height) && height > 1) height--;
		return height > 0 ? [height, size / height] : [1, 1];
	};
	const seenRow = (rows, cols, idx) => [...Array(cols).keys()].map(n => ~~(idx / cols) * cols + n);
	const seenCol = (rows, cols, idx) => [...Array(rows).keys()].map(n => (idx % cols) + n * cols);
	const seenBox = (rows, cols, idx) => {
		let [regr, regc] = getRegionShape(cols);
		return [...Array(regr * regc).keys()]
			.map(n => {
				return ~~(idx / (regr * cols)) * (regr * cols) +
					~~((idx % cols) / regc) * regc +
					~~(n / regc) * cols + n % regc;
			});
	};
	*/
	const {seenCageCells, intersectCageCells} = PuzzleTools;

	const featureName = 'showseencells';
	let featureStylesheet;
	let cageElem, puzzleInfo;

	const featureStyle = `
		.cage-seencells {
			fill: rgb(255, 215, 0);
			/*fill: var(--puzzle-selectioncage);*/
			opacity: 0.2;
		}
	`;
	const seencellsStyle = {offset: 0.125};

	const clearCages = () => {
		if(cageElem) cageElem.remove();
		cageElem = undefined;
	};
	const showSeenCells = () => {
		clearCages();
		let {puzzle, svgRenderer} = Framework.app, {selectedCells} = puzzle;
		if(selectedCells.length === 0) return;
		let seenCells = intersectCageCells(selectedCells.map(cell => seenCageCells(cell, puzzleInfo)));
		svgRenderer.renderCage({
			target: 'cell-highlights', style: 'seencells',
			cells: seenCells
		});
		cageElem = svgRenderer.getElem().querySelector('#cell-highlights .cage-seencells');
		if(cageElem) cageElem.parentElement.insertBefore(cageElem, cageElem.parentElement.firstChild);
	};
	const handleAct = (act, action) => {
		if(['select', 'deselect', 'undo', 'redo'].includes(action.type)) showSeenCells();
	};
	const handleLoad = (...args) => {
		puzzleInfo = Checker.getPuzzleInfo();
		showSeenCells();
	};
	let featureEnabled = false;
	const handleToggle = val => {
		let {app} = Framework;
		if(app === undefined) return;
		if(val && !featureEnabled) {
			featureEnabled = true;
			app.puzzle.on('act', handleAct);
			app.puzzle.on('progressloaded', handleLoad);
			puzzleInfo = Checker.getPuzzleInfo();
			showSeenCells();
		}
		else if(!val && featureEnabled) {
			featureEnabled = false;
			app.puzzle.off('act', handleAct);
			app.puzzle.off('progressloaded', handleLoad);
			clearCages();
		}
	};

	const addFeature = async () => {
		SvgRenderer.styles.cageBorders.seencells = seencellsStyle;
		Framework.addSetting({
			tag: 'toggle', group: 'gameplay',
			name: featureName,
			content: 'Show Seen Cells',
			onToggle: handleToggle
		});
		handleToggle(Framework.getSetting(featureName));
		featureStylesheet = await attachStylesheet(featureStyle);
	};

	/*
	const removeFeature = () => {
		clearCages();
		featureStylesheet.remove();
		delete SvgRenderer.styles.cageBorders.seencells;
	};
	*/

	Framework.getApp().then(addFeature);

})();
