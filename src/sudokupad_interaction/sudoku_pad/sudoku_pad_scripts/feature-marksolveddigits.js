(() => {
	const FeatureMarkSolvedDigits = (() => {
		// Helpers
			const cellToVal = cell => cell.hideclue ? '.' : cell.getVal() || '.';

		function FeatureMarkSolvedDigits() {
			bindHandlers(this);
			this.featureStylesheet = undefined;
			this.featureEnabled = false;
		}
		const C = FeatureMarkSolvedDigits, P = Object.assign(C.prototype, {constructor: C});
		C.SettingName = 'marksolveddigits';
		C.FeatureSettings = {
			on: {value: 'on', label: 'On', alt: [true , 'on']},
			gradual: {value: 'gradual', label: 'Gradual'},
			count: {value: 'count', label: 'Count (9x9 Only!)'},
			off: {value: false, label: 'Off', alt: [false , 'off']},
		};
		C.SettingDefault = 'off';
		C.featureStyle = `
		.solveddigits-0 { opacity: 1; }
		.solveddigits-1 { opacity: 1; }
		.solveddigits-2 { opacity: 1; }
		.solveddigits-3 { opacity: 0.9; }
		.solveddigits-4 { opacity: 0.9; }
		.solveddigits-5 { opacity: 0.8; }
		.solveddigits-6 { opacity: 0.7; }
		.solveddigits-7 { opacity: 0.6; }
		.solveddigits-8 { opacity: 0.5; }
		.solveddigits-9 { opacity: 0.3; }
		
		.setting-marksolveddigits-on .solveddigits-0 { opacity: 1; }
		.setting-marksolveddigits-on .solveddigits-1 { opacity: 1; }
		.setting-marksolveddigits-on .solveddigits-2 { opacity: 1; }
		.setting-marksolveddigits-on .solveddigits-3 { opacity: 1; }
		.setting-marksolveddigits-on .solveddigits-4 { opacity: 1; }
		.setting-marksolveddigits-on .solveddigits-5 { opacity: 1; }
		.setting-marksolveddigits-on .solveddigits-6 { opacity: 1; }
		.setting-marksolveddigits-on .solveddigits-7 { opacity: 1; }
		.setting-marksolveddigits-on .solveddigits-8 { opacity: 1; }
		.setting-marksolveddigits-on .solveddigits-9 { opacity: 0.3; }
		
		.setting-marksolveddigits-count .solveddigit:after {
			display: block;
			position: absolute;
			bottom: 0.25rem; right: 0.25rem;
			font-size: 0.8rem;
			line-height: 1rem;
		}
		.setting-marksolveddigits-count .solveddigits-0:after { content: ""; }
		.setting-marksolveddigits-count .solveddigits-1:after { content: "1"; }
		.setting-marksolveddigits-count .solveddigits-2:after { content: "2"; }
		.setting-marksolveddigits-count .solveddigits-3:after { content: "3"; }
		.setting-marksolveddigits-count .solveddigits-4:after { content: "4"; }
		.setting-marksolveddigits-count .solveddigits-5:after { content: "5"; }
		.setting-marksolveddigits-count .solveddigits-6:after { content: "6"; }
		.setting-marksolveddigits-count .solveddigits-7:after { content: "7"; }
		.setting-marksolveddigits-count .solveddigits-8:after { content: "8"; }
		.setting-marksolveddigits-count .solveddigits-9:after { content: "9"; }
		`;
		C.ButtonValues = '0123456789'.split('');
		C.RemClasses = ['solveddigit', ...[...new Array(10)].map((_, i) => `solveddigits-${i}`)];
		P.clearClasses = function() {
			[...document.body.classList]
				.filter(className => /^solveddigit-/.test(className))
				.forEach(className => document.body.classList.remove(className));
			document.querySelectorAll('.solveddigit').forEach(elem => elem.classList.remove(...C.RemClasses));
		};
		P.markSolvedDigits = function() {
			const selectButtons = val => document.querySelectorAll(
				['normal', 'corner', 'centre']
					.map(tool => `.tool-${tool}:not(.input-letter) button[data-value="${val}"]`)
					.join(',\n')
				);
			const reDigit = /^\d$/;
			const {app} = Framework, {puzzle, puzzle: {currentPuzzle = {}, cells = [], grid}} = app;
			if(cells.length === 0) return;
			let {solution, cages = []} = currentPuzzle;
			const [minRC, maxRC] = puzzle.getMinMaxRC();
			const rows = maxRC[0] - minRC[0] + 1, cols = maxRC[1] - minRC[1] + 1;
			const solCount = {};
			if(solution === undefined) {
				for(let i = 1; i <= rows; i++) solCount[i] = cols;
			}
			else {
				const solDigits = [...new Set(solution.split(''))];
				for(let i = 0, len = solDigits.length; i < len; i++) {
					solCount[solDigits[i]] = solution.length - solution.replaceAll(solDigits[i], '').length;
				}
			}
			const digitCount = {};
			for(let r = minRC[0]; r <= maxRC[0]; r++)
				for(let c = minRC[1]; c <= maxRC[1]; c++) {
					const val = cellToVal(grid.getCell(r, c));
					// Skip if digit doesn't match solution, handle ".", "?", etc
					if(solution !== undefined && !reDigit.test(solution[r * cols + c])) continue;
					digitCount[val] = digitCount[val] || 0;
					digitCount[val]++;
				}
			document.querySelectorAll('.solveddigit').forEach(elem => elem.classList.remove(...C.RemClasses));
			C.ButtonValues.forEach(val => {
				const solvedClass = `solveddigits-${Math.round((solvedProg = Math.min(1, digitCount[val] / solCount[val]) || 0) * 9)}`;
				selectButtons(val).forEach(btn => btn.classList.add('solveddigit', solvedClass));
			});
		};
		P.handleAct = function(action) {
			if(['value', 'clear', 'undo', 'redo'].includes(action.type)) this.markSolvedDigits();
		};
		P.handleLoad = function(...args) {
			this.markSolvedDigits();
		};
		P.handleStart = function() {
			let {app} = Framework, {puzzle} = app;
			if(puzzle.replayPlaying) return;
			this.markSolvedDigits();
		};
		P.handleToolUpdate = function() {
			this.markSolvedDigits();
		};
		P.attachElem = function() {
			let {app} = Framework;
			if(app === undefined) return;
			if(this.featureEnabled) return;
			this.featureEnabled = true;
			app.on('act', this.handleAct);
			app.puzzle.on('progressloaded', this.handleLoad);
			app.puzzle.on('start', this.handleStart);
			app.on('tool-handleToolUpdate', this.handleToolUpdate);
			this.markSolvedDigits();
		};
		P.detachElem = function() {
			let {app} = Framework;
			if(app === undefined) return;
			if(!this.featureEnabled) return;
			this.featureEnabled = false;
			app.off('act', this.handleAct);
			app.puzzle.off('progressloaded', this.handleLoad);
			app.puzzle.off('start', this.handleStart);
			app.off('tool-handleToolUpdate', this.handleToolUpdate);
			this.clearClasses();
		};
		P.handleChange = function(event) {
			if(event) Framework.handleSettingsChange(event);
			const setting = Framework.getSetting(C.SettingName);
			Framework.toggleSettingClass(C.SettingName, C.FeatureSettings[setting].value);
			(setting === 'off') ? this.detachElem() : this.attachElem();
		};
		P.handleInit = function() {
			const isSettingValid = Object.keys(C.FeatureSettings).includes(Framework.getSetting(C.SettingName));
			if(!isSettingValid) Framework.setSetting(C.SettingName, C.SettingDefault);
			this.handleChange();
		};
		P.addFeature = async function() {
			Framework.addSetting({
				group: 'gameplay', name: C.SettingName, content: 'Mark Solved Digits',
				init: this.handleInit, handler: this.handleChange,
				tag: 'multi',
				options: Object.entries(C.FeatureSettings)
					.map(([value, {label: content}]) => ({value, content})),
				style: 'display: flex; gap: 0.5rem;',
			});
			this.featureStylesheet = await attachStylesheet(C.featureStyle);
		};
		P.removeFeature = function() {
			this.clearClasses();
			this.featureStylesheet.remove();
		};
		return C;
	})();

	const featureMarkSolvedDigits = new FeatureMarkSolvedDigits();
	Framework.getApp().then(() => featureMarkSolvedDigits.addFeature());

})();
