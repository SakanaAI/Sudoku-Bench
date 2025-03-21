
const FeatureConflictChecker = (() => {
	
	function FeatureConflictChecker() {
		bindHandlers(this);
		PortableEvents.mixin(this);
		this.featureStylesheet = undefined;
		this.featureEnabled = false;
	}
	const C = FeatureConflictChecker, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'conflictchecker';
	C.SettingName = C.Name;
	C.FeatureSettings = {
		on: {value: true, label: 'On', alt: [true , 'on']},
		simple: {value: 'simple', label: 'Classic Sudoku', alt: ['simple']},
		off: {value: false, label: 'Off', alt: [false , 'off']},
	};
	C.SettingDefault = 'on';
	C.featureStyle = `
		.cell-error {
			background-color: var(--puzzle-cellerror);
			fill: var(--puzzle-cellerror);
		}
		.setting-checkpencilmarks #cell-pencilmarks .conflict,
		.setting-checkpencilmarks #cell-candidates .conflict {
			fill: var(--puzzle-pencilmarkerror);
		}
	`;
	C.ConflictActions = ['value', 'clear', 'pencilmarks', 'candidates', 'colour', 'groupend', 'undo', 'redo'];
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
	// Feature
		P.checkConflicts = function() {
			const {app, app: {currentPuzzle}} = Framework;
			if(currentPuzzle == undefined) return;
			app.check({checkConflicts: true});
		};
		P.handleAct = function(act, action) {
			if(C.ConflictActions.includes(action.type)) this.checkConflicts();
		};
		P.handleLoad = function() {
			this.checkConflicts();
		};
		P.attachElem = function() {
			let {app, app: {puzzle}} = Framework;
			if(app === undefined) return;
			if(!this.featureEnabled) {
				this.featureEnabled = true;
				puzzle.on('act', this.handleAct);
				puzzle.on('progressloaded', this.handleLoad);
			}
			this.checkConflicts(); // Handle switch from [on] -> [simple]
		};
		P.detachElem = function() {
			let {app, app: {puzzle}} = Framework;
			if(app === undefined) return;
			if(!this.featureEnabled) return;
			this.featureEnabled = false;
			puzzle.off('act', this.handleAct);
			puzzle.off('progressloaded', this.handleLoad);
			puzzle.clearErrors();
		};
		P.upgradeSetting = function() {
			let currentSetting = Framework.getSetting(C.SettingName);
			if(C.FeatureSettings[currentSetting] !== undefined) return;
			Object.entries(C.FeatureSettings)
				.some(([name, setting]) => {
					if((setting.alt || []).includes(currentSetting)) {
						Framework.setSetting(C.SettingName, name);
						return true;
					}
				});
		};
		P.handleChange = function(event) {
			if(event) Framework.handleSettingsChange(event);
			const setting = Framework.getSetting(C.SettingName);
			Framework.toggleSettingClass(C.SettingName, C.FeatureSettings[setting].value);
			Checker.clearPuzzleInfo();
			(setting === 'off') ? this.detachElem() : this.attachElem();
		};
		P.handleSettingInit = function() {
			this.upgradeSetting();
			const isSettingValid = Object.keys(C.FeatureSettings).includes(Framework.getSetting(C.SettingName));
			if(!isSettingValid) Framework.setSetting(C.SettingName, C.SettingDefault);
			this.handleChange();
		};
		P.handleInit = function() {
			Framework.addSettings([
				{
					group: 'gameplay', name: C.SettingName, content: 'Conflict Checker',
					init: this.handleSettingInit,
					handler: this.handleChange,
					tag: 'multi',
					options: Object.entries(C.FeatureSettings).map(([value, {label: content}]) => ({value, content})),
					style: 'display: flex; gap: 0.5rem;',
				},
				{group: 'gameplay', name: 'checkpencilmarks', content: 'Check Pencilmarks', tag: 'toggle'},
			]);
		};
	// Experimental
		P.isPartialCorrect = function() {
			const {app: {puzzle}} = Framework;
			return puzzle.check(['solution']).find(({type, found}) => type === 'incorrect' && found !== '.') === undefined;
		};
		P.undoToLastCorrectCount = async function() {
			const {app, app: {puzzle}} = Framework;
			const replay = Replay.decode(app.getReplay());
			let steps = 0;
			while(puzzle.undoStack.length > 0 && !this.isPartialCorrect()) {
				steps++;
				puzzle.execUndo();
			}
			await puzzle.replayPlay(replay, {speed: -1});
			return steps;
		};
		P.undoToLastCorrect = async function({duration = 3000, delay} = {}) {
			const {app, app: {puzzle}} = Framework;
			let undoSteps = await this.undoToLastCorrectCount();
			if(duration !== undefined) delay = Math.round(duration / undoSteps);
			for(let i = 0; i < undoSteps; i++) {
				await sleep(delay)();
				puzzle.execUndo();
			}
		};
	
	return C;
})();

FeatureConflictChecker.create();