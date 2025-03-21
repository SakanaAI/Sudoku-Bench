
const FeatureFog = (() => {
	// Helpers
		const cellListsEqual = (a, b) => {
			if(a.length !== b.length) return false;
			for(let i = 0, len = a.length; i < len; i++) {
				if(a[i] !== b[i]) return false;
			}
			return true;
		};
		const lightUpLamps = (grid, lamps) => {
			const {rows, cols} = grid;
			const cells = [];
			for(let l = 0, len = lamps.length; l < len; l++) {
				let {row: r, col: c} = lamps[l];
				for(let r0 = Math.max(0, r - 1), r1 = Math.min(rows - 1, r + 1); r0 <= r1; r0++) {
					for(let c0 = Math.max(0, c - 1), c1 = Math.min(cols - 1, c + 1); c0 <= c1; c0++) {
						let cell = grid.getCell(r0, c0);
						if(!cells.includes(cell)) cells.push(cell);
					}
				}
			}
			return cells;
		};
		const easeOut3 = t => 1 - (1 - t) ** 3;
		const easeInOutCubic = t => (t < 0.5) ? (4 * t ** 3) : (1 - Math.pow(-2 * t + 2, 3) / 2);
		const easeInOutQuint = t => (t < 0.5) ? (16 * t ** 5) : (1 - Math.pow(-2 * t + 2, 5) / 2);
		const createPart = (svg, parent, type, attrs = {}) => {
			let part = document.createElementNS(svg.namespaceURI, type);
			for(const [key, val] of Object.entries(attrs)) part.setAttribute(key, val);
			if(parent) parent.appendChild(part);
			return part;
		};

	function FeatureFog() {
		bindHandlers(this);
		this.featureStylesheet = undefined;
		this.featureEnabled = false;
		document.querySelector('svg#svgrenderer').style.opacity = 0;
		this.litCells = [];
	}
	const C = FeatureFog, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'fog';
	C.SettingName = 'foganim';
	C.fogSize = 0.2;
	C.fogDark = 0.235;
	C.fogLight = 0.9;
	C.fogCrossFadeMs = 150;
	C.fogCrossFadeInterval = 33;
	C.fogPuffsMs = 1000;
	C.featureStyle = (`
		:root {
			--fog-mask-white: #fff;
			--fog-mask-black: #000;
		}
		.fog-mask-white { fill: var(--fog-mask-white); }
		.fog-mask-black { fill: var(--fog-mask-black); }
		#fog-edge * {
			fill: var(--fog-mask-black);
			stroke-linecap: butt;
			stroke-linejoin: round;
		}
		#fog-fogcover { fill: #afafaf; }
		.setting-darkmode #fog-fogcover { fill: #4d4d4d; }
	`);
	C.CageStyles = {
		puzzlefog: {offset: 0, border: {}},
	};
	C.FoggedLayers = ['background', 'underlay', 'arrows', 'cages', 'overlay', 'cell-givens'];
	C.puzzleHasFog = (puzzle = {}) => puzzle.foglight !== undefined;
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
			if(typeof this.detachElem === 'function') this.detachElem();
		};
	P.getFogEdgeSvg = function(count, size = C.fogSize, dark = C.fogDark, light = C.fogLight) {
		const {CellSize: CS} = SvgRenderer, elems = [];
		for(let i = 0; i < count; i++) {
			const p = (count - i) / count,
				edgeWidth = Math.round(p * ((CS * 2) * size) * 10) / 10,
				p2 = 1 - (1 - p) * (1 - p),
				v = Math.round((dark + (light - dark) * p2) * 255),
				edgeColor = `rgb(${v},${v},${v})`;
			elems.push(`<use stroke-width="${edgeWidth}px" stroke="${edgeColor}" href="#fog-shape"/>`);
		}
		return elems.join('\n');
	};
	P.getLitCells = function() {
		const {app: {puzzle, puzzle: {cells, grid}, currentPuzzle = {}}} = Framework,
					minRC = [0, 0], maxRC = [grid.rows, grid.cols],
					{solution, foglight = [], foglink} = currentPuzzle;
		const isLamp = (val, sol, idx) => (sol === undefined && val !== undefined) || (sol !== undefined && val === sol[idx]);
		const toRCClipped = (row, col) => `r${Math.min(maxRC[0], Math.max(minRC[0], row)) + 1}c${Math.min(maxRC[1], Math.max(minRC[1], col)) + 1}`;
		const getLampCells = ({row, col}) => puzzle.parseCells(`${toRCClipped(row - 1, col - 1)}-${toRCClipped(row + 1, col + 1)}`);
		// Initialize litCells from puzzle.foglight
		const litCells = foglight.map(([r, c]) => grid.getCell(r, c));
		if(foglink !== undefined) {
			// foglink: puzzle has foglink & cell is lamp & cell is foglink trigger
			for(const [tCells = [], effect = []] of foglink) {
				let unfogged = tCells
					.map(cell => isLamp(cell.propGet('normal'), solution, cells.indexOf(cell)))
					.every(Boolean);
				if(unfogged) litCells.push(...effect);
			}
		}
		else {
			for(let i = 0, len = cells.length; i < len; i++) {
				const cell = cells[i], cellVal = cell.propGet('normal'); // Required for deep fog
				if(cellVal === undefined) continue;
				let cellIsLamp = isLamp(cellVal, solution, i);
				// deep fog: cell is given and value == given
				if(cell.hasProp('given')) {
					if(cell.propGet('given') === cellVal) litCells.push(cell);
				}
				// fog lamp: cell is lamp, push lamp cells
				else if(cellIsLamp) {
					litCells.push(...getLampCells(cell));
				}
			}
		}
		return [...new Set(litCells)];
	};
	P.getFoggedLayers = function() {
		const {app: {svgRenderer}} = Framework, svgElem = svgRenderer.getElem();
		return foggedLayers = svgElem.querySelectorAll(C.FoggedLayers.map(id => `#${id}`).join(','));
	};
	P.forceRedraw = function() {
		// WORKAROUND: SVG rendering bug in Chrome 122
		const {app: {svgRenderer}} = Framework, svgElem = svgRenderer.getElem();
		const el = svgElem.parentNode, display = el.style.display;
		el.style.display = 'none';
		el.offsetHeight;
		el.style.display = display;
	};
	P.clearFog = function() {
		const {app: {svgRenderer}} = Framework, svgElem = svgRenderer.getElem();
		svgElem.querySelectorAll('#fog-defs, #fog-fogcover').forEach(elem => elem.remove());
		this.getFoggedLayers().forEach(elem => elem.removeAttribute('mask'));
		this.forceRedraw();
	};
	P.initFog = function() {
		if(document.querySelector('#fog-defs') &&
			(document.querySelector('#fog-fogcover') || {}).textContent
			) return;
		const {app: {svgRenderer, puzzle: {rows, cols}, currentPuzzle = {}}} = Framework;
		if(!C.puzzleHasFog(currentPuzzle)) return;
		Object.keys(C.CageStyles).forEach(key => SvgRenderer.styles.cageBorders[key] = C.CageStyles[key]);
		this.clearFog();
		const {CellSize: CS} = SvgRenderer, svgElem = svgRenderer.getElem();
		const {left: x, top: y, width, height} = svgRenderer.getContentBounds();
		const boardRect = `x="0" y="0" width="${cols*CS}" height="${rows*CS}"`;
		const boardEdgeRect = `x="${x}" y="${y}" width="${width}" height="${height}"`;
		svgElem.insertAdjacentHTML('afterbegin', `
			<defs id="fog-defs">
				<mask id="fog-mask-fog" maskUnits="userSpaceOnUse" ${boardEdgeRect}>
					<rect class="fog-mask-white" ${boardEdgeRect}/>
					<use href="#fog-edge" class="fog-mask-black"/>
				</mask>
				<mask id="fog-mask-light" maskUnits="userSpaceOnUse" ${boardEdgeRect}>
					<rect class="fog-mask-white" ${boardEdgeRect}/>
					<rect class="fog-mask-black" mask="url(#fog-mask-fog)" ${boardEdgeRect}/>
				</mask>
				<g id="fog-shape">
					<g id="fog-path"/>
					<g id="fog-fadeout"/>
					<g id="fog-fadein"/>
				</g>
				<g id="fog-edge">
					${this.getFogEdgeSvg(4)}
					<use href="#fog-shape"/>
				</g>
			</defs>
			<g id="fog-fogcover">
				<rect mask="url(#fog-mask-light)" ${boardRect}/>
			</g>
		`);
		this.pathElem = svgElem.querySelector('#fog-path');
		this.fadeoutElem = svgElem.querySelector('#fog-fadeout');
		this.fadeinElem = svgElem.querySelector('#fog-fadein');
		this.getFoggedLayers().forEach(elem => elem.setAttribute('mask', 'url(#fog-mask-fog)'));
	};
	P.renderFogPuffs = async function(clearCells = [], durationMs = 1200) {
		const clearPuffs = () => {
			if(this.fogPuffsEl) {
				this.fogPuffsEl.remove();
				this.fogPuffsEl = undefined;
			}
		};
		clearPuffs();
		if(clearCells.length === 0) return;
		const {CellSize} = SvgRenderer,
					{app, app: {svgRenderer}} = Framework,
					svg = svgRenderer.getElem(),
					dims = app.getDimensions(),
					hPuffsPerCell = 4, vPuffsPerCell = 4,
					easePuffs = easeOut3,
					easeOpacity = easeInOutCubic;
	const createPuffs = (x, y, w, h) => {
			const {fogPuffsEl} = this;
			if(fogPuffsEl === undefined) {
				console.error('Error in createPuffs (fogPuffsEl is undefined):', fogPuffsEl);
				return;
			}
			for(let _x = 0; _x < hPuffsPerCell; _x++) for(let _y = 0; _y < vPuffsPerCell; _y++) {
				let _w = w / hPuffsPerCell, _h = h / vPuffsPerCell,
						r = (0.4 + 0.8 * Math.random()) * _w,
						cx = Math.floor((_x + 0.5) * _w + (-0.1 + 0.2 * Math.random()) * w),
						cy = Math.floor((_y + 0.5) * _h + (-0.1 + 0.2 * Math.random()) * h),
						dx = (0.3 + Math.random() * 0.7) * 100;
				cx = x + Math.min(w - r, Math.max(r, cx));
				cy = y + Math.min(h - r, Math.max(r, cy));
				let maxDx = (dims.width + dims.marginRight) - r - cx;
				dx = Math.min(maxDx, dx);
				createPart(svg, fogPuffsEl, 'circle', {cx, cy, r, x: cx, y: cy, dx});
			}
		};
		const animatePuffs = () => {
			const startT = Date.now();
			const step = () => {
				const {fogPuffsEl} = this;
				if(fogPuffsEl === undefined) return;
				const progress = Math.min(1, (Date.now() - startT) / durationMs);
				for(const puff of fogPuffsEl.children) {
					let x = parseFloat(puff.getAttribute('x')), dx = parseFloat(puff.getAttribute('dx'));
					puff.setAttribute('cx', x + dx * easePuffs(progress));
				}
				fogPuffsEl.setAttribute('opacity', 1 - easeOpacity(progress));
				requestAnimationFrame(progress < 1 ? step : clearPuffs);
			};
			step();
		};
		let fogPuffsEl = this.fogPuffsEl = createPart(svg, undefined, 'g');
		for(const cell of clearCells) {
			let x = cell.col * CellSize, y = cell.row * CellSize;
			createPuffs(x, y, CellSize, CellSize);
		}
		svg.querySelector('#fog-fogcover').appendChild(fogPuffsEl);
		animatePuffs();
	};
	P.renderFog = async function(force = false) {
		const {CellSize} = SvgRenderer;
		const {app: {svgRenderer, puzzle, puzzle: {cells}, currentPuzzle = {}}} = Framework;
		if(puzzle.replayPlaying) return;
		this.initFog();
		if(currentPuzzle.foglight === undefined) return;
		const prevLit = this.litCells, nextLit = this.getLitCells();
		if(!force && cellListsEqual(prevLit, nextLit)) return;
		this.litCells = nextLit;
		cells.forEach(cell => {
			let hideclue = !nextLit.includes(cell);
			if (cell.hideclue !== hideclue) {
				cell.hideclue = hideclue;
				cell.renderContent();
			}
		});
		// Update changed cells
			const prevCells = cells.filter(cell => !prevLit.includes(cell));
			const nextCells = cells.filter(cell => !nextLit.includes(cell));
			const unionCells = cells.filter(cell => prevCells.includes(cell) && nextCells.includes(cell));
		// Render new puzzlefog
			const cellsToPath = cells => svgRenderer
				.getCellOutline(cells)
				.map(([t, r, c], idx) => t === 'Z' ? t : `${t}${c * CellSize} ${r * CellSize}`)
				.join(' ');
			const createFogCage = (cells = []) => cells.length === 0 ? '' : `<path vector-effect="non-scaling-stroke" d="${cellsToPath(cells)}"/>`;
			const clearFade = () => {
				cancelAnimationFrame(this.rafId);
				this.rafId = undefined;
				this.fadeStartTime = undefined;
				this.fadeinElem.style.opacity = 1;
				this.fadeoutElem.style.opacity = 0;
				this.forceRedraw();
			};
			const fadeFrame = (time) => {
				if(this.fadeStartTime === undefined) {
					this.fadeStartTime = time;
					this.lastFrameTime = time - 1000/60;
					this.fadeTime = 0;
				}
				const progress = (time - this.fadeStartTime) / C.fogCrossFadeMs;
				const dt = time - this.lastFrameTime;
				this.lastFrameTime = time;
				this.fadeTime += dt;
				while(this.fadeTime >= C.fogCrossFadeInterval) {
					this.fadeinElem.style.opacity = Math.min(1, Math.max(0, progress));
					this.fadeoutElem.style.opacity = Math.min(1, Math.max(0, 1 - progress));
					this.fadeTime -= C.fogCrossFadeInterval;
				}
				this.forceRedraw();
				if(progress >= 1) return clearFade();
				this.rafId = requestAnimationFrame(fadeFrame);
			};
			const startFade = () => {
				this.pathElem.innerHTML = createFogCage(unionCells);
				const foggedCells = nextCells.filter(cell => !prevCells.includes(cell));
				const revealedCells = prevCells.filter(cell => !nextCells.includes(cell));
				this.fadeoutElem.innerHTML = createFogCage(revealedCells);
				this.fadeinElem.innerHTML = createFogCage(foggedCells);
				this.fadeinElem.style.opacity = 0;
				this.fadeoutElem.style.opacity = 1;
				this.fadeStartTime = undefined;
				this.forceRedraw();
				if(this.rafId === undefined) this.rafId = requestAnimationFrame(fadeFrame);
			};
			clearFade();
			if(force || !Framework.getSetting(C.SettingName)) {
				this.pathElem.innerHTML = createFogCage(nextCells);
				this.fadeoutElem.innerHTML = '';
				this.fadeinElem.innerHTML = '';
			}
			else {
				startFade();
			}
		// Render fog puffs
			if(Framework.getSetting(C.SettingName + '-testpuffs')) {
				let clearCells = nextLit.filter(cell => !prevLit.includes(cell));
				this.renderFogPuffs(clearCells, C.fogPuffsMs);
			}
	};
	P.handleAct = function(act, action) {
		if(['value', 'clear', 'undo', 'redo'].includes(action.type)) this.renderFog();
	};
	P.handleUpdateFog = function() {
		let {app} = Framework, {puzzle} = app;
		if(!puzzle.replayPlaying) this.renderFog(true);
	};
	P.handleFogFeature  = function (sourcePuzzle, convertedPuzzle) {
		const {app: {puzzle, puzzle: {grid}}} = Framework;
		const {foglight, cages = [], overlays = []} = sourcePuzzle;
		const minMaxRC = puzzle.getMinMaxRC(convertedPuzzle);
		if(foglight !== undefined && Array.isArray(foglight)) {
			convertedPuzzle.foglight = foglight;
		}
		cages
			.filter(cage => {
				// Find messy imports of "FOGLIGHT" via overlay text
				if(cage.value === undefined) {
					const labelCell = [...cage.cells].sort(sortTopLeftRC).pop();
					let fogLabelOverlay = overlays.find(({center: [r, c], text}) =>
						(r|0) === labelCell[0] && (c|0) === labelCell[1]
						&& String(text).includes('FOGLIGHT')
					);
					if(fogLabelOverlay) {
						cage.value = 'FOGLIGHT';
						overlays.splice(overlays.indexOf(fogLabelOverlay), 1);
					}
				}
				return String(cage.value || '').match(/^FOGLIGHT$|^foglight:.*/i);
			})
			.forEach(cage => {
				cages.splice(cages.indexOf(cage), 1);
				const parsedCells = puzzle.parseCells(((cage.value || '').match(/^FOGLIGHT$|^foglight:\s*(.+)/i) || [])[1]).map(({row, col}) => [row, col]);
				convertedPuzzle.foglight = [
					...(convertedPuzzle.foglight || []),
					...(parsedCells || []),
					...(cage.cells || []),
				];
			});
		// Handle triggereffects
		const {triggereffect} = sourcePuzzle;
		if(Array.isArray(triggereffect)) {
			convertedPuzzle.foglink = (sourcePuzzle.triggereffect || [])
				.filter(te => te?.effect?.type === 'foglight')
				.map(({trigger, effect}) => [puzzle.parseCells(trigger.cell), puzzle.parseCells(effect.cells)]);
			if(convertedPuzzle.foglight === undefined) convertedPuzzle.foglight = [];
		}
	};
	P.attachElem = function() {
		let {app, app: {puzzle}} = Framework;
		if(app === undefined) return;
		if(this.featureEnabled) return;
		this.featureEnabled = true;
		app.handleFogFeature = this.handleFogFeature;
		puzzle.on('act', this.handleAct);
		let actListeners = puzzle.getEventListeners('act');
		actListeners.unshift(actListeners.pop()); // Move listener to top
		puzzle.on('start', this.handleUpdateFog);
		this.renderFog(true);
		puzzle.on('loaded', this.handleUpdateFog);
		puzzle.on('progressloaded', this.handleUpdateFog);
	};
	P.detachElem = function() {
		let {app} = Framework, {puzzle} = app;
		if(app === undefined) return;
		if(!this.featureEnabled) return;
		this.featureEnabled = false;
		delete app.handleFogFeature;
		app.off('act', this.handleAct);
		app.puzzle.off('start', this.handleUpdateFog);
		app.puzzle.off('loaded', this.handleUpdateFog);
		app.puzzle.off('progressloaded', this.handleUpdateFog);
		puzzle.cells.map(cell => {
			delete cell.layer;
			delete cell.renderedValues['colours'];
			delete cell.hideclue;
			cell.renderContent();
		});
		this.litCells = [];
		this.clearFog();
	};
	// Setting
	P.handleInit = async function() {
		this.attachElem();
		Framework.addSetting({
			tag: 'toggle', group: 'visual',
			name: C.SettingName,
			content: 'Puzzle Fog Animation'
		});
		Framework.addSetting({
			tag: 'toggle', group: 'experimental',
			name: C.SettingName + '-testpuffs',
			content: 'Puzzle Fog Puffs'
		});
		/*
		Framework.addSetting({
			group: 'visual', name: C.SettingName,
			//init: this.handleInit, handler: this.handleChange,
			tag: 'multi',
			content: 'Puzzle Fog Animation',
			options: [
				{value: true, content: 'true'},
				{value: false, content: 'false'},
				{value: 'abc', content: 'abc'},
			],
			//options: Object.entries(C.FeatureSettings).map(([value, {label: content}]) => ({value, content})),
			//style: 'display: flex; gap: 0.5rem;',
		});
		*/

		this.featureStylesheet = await attachStylesheet(C.featureStyle);
		document.querySelector('svg#svgrenderer')?.style?.removeProperty('opacity');
		// WORKAROUND: Prevent svenpeek from playing more than once
		const svenpeekEl = document.querySelector('#svenpeek');
		if (svenpeekEl) {
			svenpeekEl.addEventListener('animationend', () => svenpeekEl.remove());
		};
	};

	return C;
})();

FeatureFog.create();
