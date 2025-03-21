
const FeatureGridRules = (() => {
	// Helpers
		const gridToRulesHtml = grid => `<div class="gridrules">
			<div class="titleandauthor">
				<span class="title">${textToHtml(grid.title)}</span>
				<span class="author">by ${textToHtml(grid.author || 'Unknown')}</span>
			</div>
			${Framework.app.puzzle.getRules(true, grid)}
		</div>`;
		const cellInArea = ({top, left, width, height}) => ({row, col}) => (col >= left) && (col < left + width) && (row >= top) && (row < top + height);
		const filterGridByCells = cells => ({top, left, width, height}) => cells.some(cellInArea({top, left, width, height}));
	function FeatureGridRules() {
		bindHandlers(this);
		PortableEvents.mixin(this);
		this.selectedGrids = [];
	}
	const C = FeatureGridRules, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'gridrules';
	C.SettingName = C.Name;
	C.featureStyle = `
		.gridrules {
			margin: 1rem 0;
		}
		.gridrules .titleandauthor {
			margin: 0 0 0.5rem 0;
			font-size: 110%;
		}
		.gridrules .titleandauthor .title, .gridrules .titleandauthor .author {
			font-weight: bold;
		}
	`;
	C.GridRulesClass = 'gridrulessection';
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
	// Grid
		P.getGrids = function() {
			return Framework?.app?.currentPuzzle?.metadata?.grids ?? [];
		};
		P.updateRules = function() {
			const {app, app: {puzzle, puzzle: {selectedCells}}} = Framework,
						{selectedGrids} = this;
			let nextGrids = [];
			for(const grid of this.getGrids()) {
				if(filterGridByCells(selectedCells)(grid)) nextGrids.push(grid);
				if(nextGrids.length >= 2) break;
			}
			if(nextGrids.length === 0) nextGrids.splice(0, Infinity, ...selectedGrids);
			const ruEl = document.querySelector('.dialog .rulestext') || document.querySelector('#controls .puzzle-rules');
			let gridRulesEl = ruEl.querySelector(`.${C.GridRulesClass}`);
			let gridsChanged = nextGrids.length !== selectedGrids.length
					|| nextGrids.some((grid, index) => grid !== selectedGrids[index]);
			if(!gridRulesEl) {
				gridRulesEl = Object.assign(document.createElement('div'), {className: C.GridRulesClass});
				ruEl.append(gridRulesEl);
				gridsChanged = true;
			}
			if(gridsChanged) {
				selectedGrids.splice(0, Infinity, ...nextGrids);
				gridRulesEl.innerHTML = selectedGrids.map(gridToRulesHtml).join('\n');
				app.resize();
			}
		};
		P.updateRulesThrottled = throttleFunc(P.updateRules, 200, 1000);
	// Handlers
		P.handlePuzzleLoaded = function() {
			const enabled = this.getGrids().length !== 0;
			enabled ? this.attachElem() : this.detachElem();
		};
		P.handleAct = async function(act, action) {
			const {app: {puzzle}} = Framework;
			// Don't trigger while replay is playing
			if(puzzle.replayPlaying) {
				puzzle.off('act', this.handleAct);
				await puzzle.await('replaydone');
				puzzle.on('act', this.handleAct);
			}
			if(!(action && ['select', 'deselect'].includes(action.type))) return;
			this.updateRulesThrottled();
		};
		P.handleDialogShow = function() {
			let hasRulestext = document.querySelector('.dialog .rulestext') !== null;
			if(hasRulestext) this.updateRules();
		};
	// Feature
		P.attachElem = function() {
			if(this.featureEnabled) return;
			this.featureEnabled = true;
			this.updateRulesThrottled();
			Framework.app.puzzle.on('act', this.handleAct);
			Framework.on('showdialog', this.handleDialogShow);
		};
		P.detachElem = function() {
			if(!this.featureEnabled) return;
			this.featureEnabled = false;
			Framework.app.puzzle.off('act', this.handleAct);
			Framework.off('showdialog', this.handleDialogShow);
			document.querySelectorAll(`.${C.GridRulesClass}`).forEach(el => el.remove());
		};
		P.handleInit = async function() {
			const {app: {puzzle}} = Framework;
			puzzle.on('loaded', this.handlePuzzleLoaded);
		};
	
	return C;
})();

FeatureGridRules.create();
