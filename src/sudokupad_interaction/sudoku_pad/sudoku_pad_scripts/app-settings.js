
const handleCageSelectionInit = () => {
	const SettingName = 'selection';
	const validSettings = ['cage', 'default', 'light', 'dark'], defaultSetting = 'cage';
	let svgRenderer, svgElem, puzzle;
	let cageStyleEnabled = false;
	const clearSelectionCage = () => {
		if(!cageStyleEnabled) return;
		cageStyleEnabled = false;
		svgElem
			.querySelectorAll('#cell-highlights .cage-selectioncage')
			.forEach(elem => elem.remove());
	};
	const renderSelectionCage = () => {
		clearSelectionCage();
		cageStyleEnabled = true;
		svgRenderer.renderCage({
			target: 'cell-highlights', style: 'selectioncage',
			cells: puzzle.selectedCells
		});
	};
	const handleSelectionCageAct = (act, action) => {
		if(puzzle.replayPlaying) return;
		if(['select', 'deselect', 'undo', 'redo'].includes(action.type)) renderSelectionCage();
	};
	const toggleSelectionCage = (enabled) => {
		const {app} = Framework;
		if(app === undefined) return;
		svgRenderer = app.svgRenderer
		svgElem = svgRenderer.getElem();
		puzzle = app.puzzle;
		app.puzzle.off('act', handleSelectionCageAct);
		app.puzzle.off('start', renderSelectionCage);
		app.puzzle.off('replaystep', renderSelectionCage);
		if(enabled) {
			app.puzzle.on('act', handleSelectionCageAct);
			app.puzzle.on('start', renderSelectionCage);
			app.puzzle.on('replaystep', renderSelectionCage);
			renderSelectionCage();
		}
		else {
			clearSelectionCage();
		}
	};
	Framework.on('togglesetting', (setting, val) => {
		if(setting === SettingName) toggleSelectionCage(val === 'cage');
	});
	let settingVal = Framework.getSetting(SettingName);
	if(!validSettings.includes(settingVal)) {
		Framework.setSetting(SettingName, settingVal = defaultSetting);
	}
};

const handlToggleAutoCheck = (() => {
	let settingVal = false, lastIsCompletedCheck = false;
	const handleProgressloaded = async () => {
		const { app: {puzzle}} = Framework;
		lastIsCompletedCheck = puzzle.isCompleted();
	};
	const handleAct = async (act, action) => {
		const {app, app: {puzzle, timer}} = Framework;
		/// Don't trigger while replay is playing
		if(puzzle.replayPlaying) {
			puzzle.off('act', handleAct);
			await puzzle.await('replaydone');
			if(settingVal) puzzle.on('act', handleAct);
		}
		if(action && !['value', 'clear', 'undo', 'redo'].includes(action.type)) return; // Not an entered/cleared value
		let isCompletedCheck = !puzzle.errorsVisible && puzzle.isCompleted();
		if(lastIsCompletedCheck === isCompletedCheck) return;
		lastIsCompletedCheck = isCompletedCheck;
		if(isCompletedCheck) {
			timer.stop();
			app.showPuzzleNoErrorsDialog();
		}
	};
	const handlToggleAutoCheck = val => {
		const {app: {puzzle}} = Framework;
		if(settingVal = val) {
			puzzle.on('progressloaded', handleProgressloaded);
			puzzle.on('act', handleAct);
		}
		else {
			puzzle.off('progressloaded', handleProgressloaded);
			puzzle.off('act', handleAct);
		}
	};
	return handlToggleAutoCheck;
})();

const handleToggleArrowsbovelines = (() => {
	let currVal;
	return (val, prevVal) => {
		if(currVal !== undefined && val !== prevVal && prevVal !== undefined) {
			// Save settings & progress and refresh to redraw puzzle
			Framework.saveSettings();
			Framework.app.puzzle.saveProgress(true);
			setTimeout(() => document.location.reload(true), 100);
		}
		currVal = val;
	};
})();

const handleCreatesollink = async () => {
	try {
		await openPuzzleWithSolution();
	}
	catch(err) {
		console.error('Something went wrong. This only works for f-puzzles and ctc links! \n' + err.toString())
		alert('Something went wrong. This only works for f-puzzles and ctc links! \n' + err.toString())
	}
};

const handleOpenPatreonLink = () => {
	Framework.app.showOpenExternalLinkDialog('Support me on Patreon.com/SvenCodes', 'https://patreon.com/svencodes');
};

const handleMulticolorInit = () => {
	const SettingName = 'multicolour';
	const validSettings = [true, false], defaultSetting = true;
	let settingVal = Framework.getSetting(SettingName);
	if(!validSettings.includes(settingVal)) Framework.setSetting(SettingName, defaultSetting);
};

const createAppSettings = () => {
	Framework.addGroups([
		{name: 'tools', label: 'Tools'},
		{name: 'visual', label: 'Visual'},
		{name: 'gameplay', label: 'Gameplay'},
		{name: 'importexport', label: 'Import/Export', closed: true},
		{name: 'advanced', label: 'Advanced', closed: true},
		{name: 'support', label: 'Support SudokuPad'},
		{name: 'experimental', label: 'Experimental', closed: true},
	]);
	Framework.addSettings([
		{tag: 'toggle', group: 'support', name: 'hidesvenpeek', content: 'Hide Peeking Sven'},
		{tag: 'toggle', group: 'support', name: 'hidesupportlinks', content: 'Hide Support Links'},
		{tag: 'toggle', group: 'support', name: 'showplayinsudokupad', innerHTML: 'Show "Play in SudokuPad"'},
		{tag: 'toggle', group: 'support', name: 'hidesventobyemoji', innerHTML: 'Hide Sven & Toby Emoji'},
		{tag: 'button', group: 'support',
			innerHTML: `Support Sven on Patreon <span class="icon" style="vertical-align: middle;"">${Framework.icons.patreon}</span>`,
			handler: handleOpenPatreonLink,
			style: 'display: block; margin: 0.5rem 1rem; padding: 0rem 1rem; font-size: 1.2rem;'
		},
		{tag: 'toggle', group: 'visual', name: 'largedigits', content: 'Large Digits'},
		{tag: 'multi', group: 'advanced', name: 'selection', content: 'Selection Style', init: handleCageSelectionInit, options: [
			{value: 'cage', content: 'Selection Blue Cage'},
			{value: 'default', content: 'Selection Yellow'},
			{value: 'light', content: 'Selection Outline Light'},
			{value: 'dark', content: 'Selection Outline Dark'},
		]},
		{tag: 'toggle', group: 'experimental', name: 'darkmode', content: 'Dark Mode Alpha'},
		{tag: 'toggle', group: 'visual', name: 'flipkeypad', content: 'Keypad Flipped'},
		{tag: 'toggle', group: 'advanced', name: 'multicolour', content: 'Multi-color Mode', init: handleMulticolorInit},
		{tag: 'toggle', group: 'visual', name: 'hidecolours', content: 'Hide Colours'},
		{tag: 'toggle', group: 'visual', name: 'hidetimer', content: 'Hide Timer'},
		{tag: 'toggle', group: 'visual', name: 'dashedgrid', content: 'Dashed Grid'},
		{tag: 'toggle', group: 'visual', name: 'digitoutlines', content: 'Outlines on Elements'},
		{tag: 'toggle', group: 'advanced', name: 'hidesolved', content: 'Hide Already Solved', title: 'Hides already solved puzzles when loading.'},
		{tag: 'toggle', group: 'visual', name: 'arrowsabovelines', content: 'Draw Arrows Above Lines', onToggle: handleToggleArrowsbovelines},
		{tag: 'button', group: 'advanced', name: 'createsollink', content: 'New Solution Link', handler: handleCreatesollink},
		{tag: 'toggle', group: 'gameplay', name: 'nopauseonstart', content: 'Don\'t Pause On Start'},
		{tag: 'toggle', group: 'gameplay', name: 'autocheck', content: 'Check on Finish', onToggle: handlToggleAutoCheck},
		//{tag: 'toggle', name: 'smartcornermarks2', content: 'Smart Cornermarks'}, //ML
	]);
};