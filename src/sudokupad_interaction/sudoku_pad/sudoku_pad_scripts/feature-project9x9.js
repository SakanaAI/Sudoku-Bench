
const FeatureProject9x9 = (() => {
	// Helpers
		const getTransform = el => {
			const [scale, x, y] = (getComputedStyle(el).transform
				.match(/matrix\(\s*([^,]*)\s*,[^,]*,[^,]*,[^,]*,\s*([^,]*)\s*,\s*([^,]*)\s*\)/) || [])
				.slice(1).map(n => parseFloat(n))
				;
			return {x, y, scale};
		};
		const setTransform = (el, t) => {
			const rnd = (n, r = 3) => Math.round(Number(n) * 10**r) / 10**r;
			let parts = [];
			if(t.x !== undefined || t.y !== undefined) parts.push(`translate(${rnd(t.x)}px, ${rnd(t.y)}px)`);
			if(t.scale !== undefined) parts.push(`scale(${rnd(t.scale)})`);
			el.style.transform = parts.join(' ');
		};
	
	function FeatureProject9x9() {
		bindHandlers(this);
		PortableEvents.mixin(this);
		this.featureEnabled = false;
	}
	const C = FeatureProject9x9, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'project9x9';
	C.SettingName = C.Name;
	C.layoutStyle = `
		.controls-footer { display: none; }
		.controls-buttons .controls-app { display: none; }
		.controls-buttons .controls-main { display: block; margin: 0; }
		
		.controls-info .puzzle-header { display: none; }
		.controls-info .puzzle-rules {
			background-color: #E4E9EC;
			border: 0.2rem solid #36464E;
			overflow: hidden;
		}
		.topbar-header {
			position: absolute;
			z-index: -1;
			left: 0;
			width: 100%;
			text-align: center;
		}
		.topbar-author { font-size: smaller; }
		.layout-9x9 {
			--main-color: #5286BE;
		}
		.controls-aux {
			position: absolute;
			bottom: 0rem;
		}
		.orientation-portrait .controls-aux {
			position: absolute;
			left: 0;
			bottom: 0rem;
			flex-direction: row;
		}
		.controls-input button[data-key="0"] {
			display: none;
		}
		.controls-input button[data-control="delete"] {
			flex: 0 0 4rem;
			width: 4rem;
			margin-left: 8.75rem;
		}
	`;
	C.ForcedSettings = [
		['toolletter', false],
		['toolpen', false],
		['copycells', false],
		['toolcalculator', false],
		['showplayinsudokupad', false],
		['marksolveddigits', false],
		['hidesvenpeek', true],
		['hidesupportlinks', true],
		['hidesventobyemoji', true],
		['showplayinsudokupad', false],
	];
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
	// Handlers
	// Settings
		P.initSettings = async function() {
			for(const [key, val] of C.ForcedSettings) {
				//console.log('  Change setting[%s]:', key, Framework.getSetting(key), val);
				Framework.tempSettings.push(key);
				Framework.setSetting(key, val);
			}
		};
	// Tools
		P.setTools = async function(tools, refresh = true) {
			const Tools = {'normal': ToolNormal, 'corner': ToolCorner, 'centre': ToolCentre, 'colour': ToolColor},
						toolNames = Framework.app.getToolNames(),
						defaultTool = toolNames[0],
						currentTool = Framework.app.tool;
			const normalizeTools = (tools, def = defaultTool) => tools.reduce((acc, cur) => def === cur ? acc : [...acc, cur], []);
			tools = normalizeTools(tools);
			Framework.app.changeTool(defaultTool);
			await sleep(0)();
			for(const name of toolNames) if(name !== defaultTool) Framework.removeTool(name);
			for(const name of tools) Framework.addTool(Tools[name]);
			Framework.app.changeTool(currentTool);
		if(refresh) Framework.app.refreshControls();
		};
		P.setControls = async function(controls, refresh = true) {
			const AppControls = [appButtonSettings, appButtonFullscreen, appButtonRules, appButtonInfo, appButtonRestart],
						curr = [...document.querySelectorAll('.controls-app button')].map(({id}) => id.replace(/^control-/, ''));
			for(const name of curr) Framework.removeControlButton(name);
			Framework.addAppButtons(controls.map(name => AppControls.find(({name: n}) => n === name)));
			if(refresh) Framework.app.refreshControls();
		};
		P.initControls = async function() {
			await this.setControls([], false);
			await this.setTools(['normal'], false);
			for(const name of ['check', 'select', 'normal']) {
				Framework.removeControlButton(name);
			}
			Framework.app.refreshControls();
		};
	// Menu
		P.handleMenuRestart = async function() {
			createAppMenu.closeMenu();
			Framework.app.handleRestartPuzzle();
		};
		P.initMenu = async function() {
			const removeItemNames = ['steam', 'kofi', 'patreon', 'youtube', 'openalternate', 'shorturl', 'endless'],
						removeItems = [...document.querySelectorAll(removeItemNames
							.map(name => `#appmenuitems .menu-link-${name}`)
							.join(', ')
						)];
			for(const el of removeItems) el.remove();
			document.querySelector('#appmenuitems .menu-link-home').insertAdjacentHTML('afterend', 
				`<a class="mdc-list-item menu-link-restart" href="#">
					<div class="icon">${Framework.icons.restart}</div>
					<span class="mdc-list-item-text">Restart Puzzle</span>
				</a>`
			);
			document.querySelector('#appmenuitems .menu-link-restart').addEventListener('click', this.handleMenuRestart);
		};
	// Layout
		P.getOrientation = function() {
			const gaEl = document.querySelector('.game'),
						gaBounds = bounds(gaEl);
			let orientation;
			if(gaBounds.width > gaBounds.height) {
				orientation = 'landscape';
			}
			else {
				orientation = 'portrait';
			}
			return orientation;
		};
		P.handleResize = function() {
			const margin = 32,
						gaEl = document.querySelector('.game'),
						boEl = document.querySelector('#board'),
						coEl = document.querySelector('#controls'),
						ciEl = document.querySelector('.controls-info'),
						cbEl = document.querySelector('.controls-buttons');
			const resetTransformXY = el => {
				let trans = getTransform(el);
				delete trans.x;
				delete trans.y;
				setTransform(el, trans);
			};
			const centerBoard = () => {
				resetTransformXY(boEl);
				boEl.style['transform-origin'] = 'center';
				boEl.style.left = 'unset';
				boEl.style.top = 'unset';
			};
			const alignControls = () => {
				document.body.classList.toggle('layout-controlsflipped', false);
				const resetStyle = {
					position: 'absolute',
					transform: 'none',
					left: '0px', top: '0px',
					'transform-origin': 'top left',
				};
				for(const {style} of [coEl, ciEl, cbEl]) Object.assign(style, resetStyle);
				let gaBounds = bounds(gaEl),
						boBounds = bounds(boEl),
						cbBounds = bounds(cbEl),
						boT = getTransform(boEl);
				let boMargin = margin * 0.5 * boT.scale;
				let cbScaleH = (gaBounds.right - boBounds.right - 1 * boMargin) / (cbBounds.width);
				let cbScaleV = (boBounds.height - 2 * boMargin) / cbBounds.height;
				let cbScale = Math.min(cbScaleH, cbScaleV);
				setTransform(cbEl, {scale: cbScale});
				cbBounds = bounds(cbEl);
				Object.assign(cbEl.style, {
					left: `${boBounds.right + 0 * boMargin}px`,
					top: `${boBounds.bottom - cbBounds.height - 1 * boMargin}px`,
				});
				Object.assign(ciEl.style, {
					left: `${boMargin}px`,
					width: `${boBounds.left - boMargin}px`,
					top: `${boBounds.top + boMargin}px`,
				});
			};
			let orientation = this.getOrientation();
			if(orientation === 'landscape') {
				centerBoard();
				alignControls();
			}
			else {
				for(const {style} of [ciEl, cbEl]) Object.assign(style, {
					position: '', transform: '',
					top: '', left: '',
					'transform-origin': '',
				});
			}
		};
		P.initLayout = async function() {
			const {app} = Framework;
			app.on('resize', this.handleResize);
			app.resize();
		};
		P.initTitle = async function() {
			const {app, app: {currentPuzzle: {title, author}}} = Framework;
			const tbEl = document.querySelector('.topbar');
			tbEl.querySelector('.game-clock').insertAdjacentHTML('beforebegin',
				`<div class="topbar-header"><span class="topbar-title">${title}</span> <span class="topbar-author">by ${author}</span></div>`
			);
		};
	// Feature
		P.handleLoaded = async function() {
			const {app, app: {puzzle}} = Framework;
			puzzle.off('loaded', this.handleLoaded);
			await this.initTitle();
			app.resize();
		};
		P.start = async function() {
			const {app: {currentPuzzle, puzzle}} = Framework;
			document.body.classList.toggle('layout-9x9', true);
			this.layoutStylesheet = await attachStylesheet(C.layoutStyle);
			await this.initSettings();
			await this.initMenu();
			await this.initControls();
			await this.initSettings();
			await this.initLayout();
			if(Framework.app.currentPuzzle !== undefined) {
				this.handleLoaded();
			}
			else {
				puzzle.on('loaded', this.handleLoaded);
			}
		};
		P.attachElem = function() {
			if(this.featureEnabled) return;
			this.featureEnabled = true;
		};
		P.detachElem = function() {
			if(!this.featureEnabled) return;
			this.featureEnabled = false;
		};
		P.handleSettingChange = async function() {
			const setting = Framework.getSetting(C.SettingName);
			setting ? this.attachElem() : this.detachElem();
		};
		P.handleInit = async function() {
			const qs = new URLSearchParams(document.location.search);
			if(qs.get('layout') === '9x9') await this.start();
		};
	
	return C;
})();

FeatureProject9x9.create();