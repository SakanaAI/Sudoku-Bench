
const FeatureDebug = (() => {
	function FeatureDebug() {
		bindHandlers(this);
		PortableEvents.mixin(this);
		this.featureEnabled = false;
	}
	const C = FeatureDebug, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'debug';
	C.SettingName = C.Name;
	C.featureStyle = ``;
	C.featureStyleOutlineTest = `
		.setting-outlinetest-outlinetestnone #arrows { filter: none; }
		.setting-outlinetest-outlinetesta #arrows { filter: url("#outlinetesta"); }
		.setting-outlinetest-outlinetestb #arrows { filter: url("#outlinetestb"); }
	`;
	C.OutlineTestFilters = `
		<filter id="outlinetesta" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
			<feMorphology in="SourceGraphic" result="outline" operator="dilate" radius="1" />
			<feBlend in2="SourceGraphic" in="outline" mode="normal" />
		</filter>
		<filter id="outlinetestb" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
			<feMorphology in="SourceGraphic" result="outline" operator="dilate" radius="1" />
			<feBlend in2="SourceGraphic" in="outline" mode="difference" />
		</filter>
	`;
	// API
		C.create = async function() {
			const feature = new C();
			Framework.getApp().then(() => feature.addFeature());
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
			const proto = Object.getPrototypeOf(this);
			for await (const prop of Object.getOwnPropertyNames(proto)) {
				if('function' !== typeof this[prop] || !/^handleInit.*/.test(prop)) continue;
				await this[prop]();
			}
			this.trigger('init');
		};
		P.addFeature = async function() {
			/*
			Framework.addSetting({
				content: 'Outline Test', group: 'experimental', name: 'outlinetest',
				init: this.handleStartOutlineTest,
				tag: 'multi',
				options: [
					{value: 'outlinetestdisabled', content: 'Disable Test'},
					{value: 'outlinetestnone', content: 'Test No Outline'},
					{value: 'outlinetesta', content: 'Test Outline A'},
					{value: 'outlinetestb', content: 'Test Outline B'},
					{value: 'outlinetestc', content: 'Test Outline C'},
					{value: 'outlinetestd', content: 'Test Outline D'},
					{value: 'outlineteste', content: 'Test Outline O'},
					{value: 'outlinetestf', content: 'Test Outline P'},
					{value: 'outlinetestg', content: 'Test Outline Q'},
				],
				style: 'display: flex; gap: 0.5rem;',
			});
			*/
			Framework.addSetting({
				group: 'experimental', name: 'showstats',
				tag: 'button',
				content: 'Show Stats.js',
				handler: this.handleShowStats
			});
			this.init();
		};
		P.removeFeature = async function() {
			this.featureEnabled = false;
			if(this.featureStylesheet) this.featureStylesheet.remove();
		};
	// Outline test
		P.handleStartOutlineTest = function() {
			const {app, app: {svgRenderer}} = Framework;
			const svgElem = svgRenderer.getElem();
			svgElem.querySelector('g.defs defs').insertAdjacentHTML('beforeend', C.OutlineTestFilters);
		};
		P.handleShowStats = async function() {
			if(this.statsLoaded) return;
			this.statsLoaded = true;
			await loadScript('https://mrdoob.github.io/stats.js/build/stats.min.js');
			let stats = new Stats();
			document.body.appendChild(stats.dom);
			requestAnimationFrame(function handleRAF() {
				stats.update();
				requestAnimationFrame(handleRAF)
			});
		};
	// Replay debugging
		P.sliceReplay = function(replay, len) {
			if(typeof replay === 'string') replay = Replay.decode(replay);
			replay.actions.length = len;
			return Replay.encode(replay);
		};
		P.debugReplay = async function() {
			const {app, app: {puzzle, currentPuzzle}} = Framework;
			const {replayStack, undoStack, redoStack, stateStack} = puzzle;
			//console.log('  puzzle stacks:', {replayStack, undoStack, redoStack, stateStack});
			let replayData = Replay.encode(puzzle);
			let replay = JSON.parse(replayData);
			let replayActionData = loadFPuzzle.decompressPuzzle(replay.data);
			let replayActions = Replay.replayC2A(replayActionData, replay.rows, replay.cols).split(',');
			let actions = puzzle.replayStack.map(act => puzzle.parseAction(act));
			let actionsByType = {};
			actions.forEach(a => {
				actionsByType[a.type] = actionsByType[a.type] || [];
				actionsByType[a.type].push(a);
			});
			let cells = puzzle.cells, selected = [];
			let selections = [];
			actions.forEach(({type, arg}, i) => {
				switch(type) {
					case 'select': selected.push(...arg.filter(cell => !selected.includes(cell))); break;
					case 'deselect': selected = selected.filter(cell => !arg.includes(cell)); break;
				}
				selections[i] = [...selected];
			});
			const actionToString = action => puzzle.actionToString(action);
			const cellToRC = cell => cell.toRC();
			const getSelectionAt = idx => selections[idx];
			const getGroupAt = idx => {
				let start = idx;
				while(start-- > 0) {
					if(actions[start].type === 'groupend') return [];
					if(actions[start].type === 'groupstart') break;
				}
				if(start === -1) return [];
				let len = actions.length, end = start;
				while(end++ < len) {
					if(actions[end].type === 'groupend') return actions.slice(start, end + 1);
				}
				return [];
			};
			const getActionInfo = action => {
				let idx = actions.indexOf(action);
				return {idx, action, selection: getSelectionAt(idx).map(cellToRC).join(', '), group: getGroupAt(idx).map(actionToString).join(', ')};
			}
		};
		C.eventToPos = function(event, pos = {}) {
			let {clientX: x, clientY: y} = (event.touches && event.touches[0]) || event;
			return Object.assign(pos, {x, y});
		};
		C.getInputRc = function() {
			const {app} = Framework, {x, y} = app.inputPos;
			return app.xyToRCExact(x, y);
		};
		P.ptMouseFx = async function() {
			const {seenCageCells, intersectCageCells} = PuzzleTools;
			const {CellSize} = SvgRenderer;
			const {app, app: {svgRenderer, selectedCells, grid}} = Framework;
			const svgElem = svgRenderer.getElem();
			const mouse = {x: 0, y: 0, r: 0, c: 0, down: false};
			let puzzleInfo = Checker.getPuzzleInfo();
			const updateMouse = (props = {}) => {
				Object.assign(mouse, app.inputPos, C.getInputRc(), props);
			};
			const rowColToRc = ({row: r, col: c}) => ({r, c});
			const rcCellDist = (rc, cell) => Math.sqrt(((cell.row + 0.5) - rc.r)**2 + ((cell.col + 0.5) - rc.c)**2);
			const partTouchCell = (part, cell) => rcCellDist(part, cell) < part.size;
			const inverseN = (x, N, D) => {
				if(x <= 0) return 1;
				else if (x >= D) return 0;
				else return 1 - (x ** N) / (D ** N);
			};
			const boundsSize = bounds => Math.sqrt((bounds.width / CellSize)**2 + (bounds.height / CellSize)**2);
			const pullPart = (part, rc = mouse) => {
				const range = 3, reach = 0.5, scale = 2;
				let dr = rc.r - part.r, dc = rc.c - part.c;
				let dist = Math.sqrt(dr**2 + dc**2);
				let delta = Math.min(1, part.size) * (reach / range) * inverseN(dist, scale, range) * CellSize;
				part.elem.style.transform = `translate(${dc * delta}px, ${dr * delta}px)`;
			};
			const jiggleFacts = [...Array(10)].map((_,i)=>({
				r: [Math.random(), Math.random(), Math.random()],
				c: [Math.random(), Math.random(), Math.random()],
			}));
			for(let f = 0; f < 3; f++) {
				let sumr = 0, sumc = 0
				for(let i = 0; i < jiggleFacts.length; i++) {
					sumr += jiggleFacts[i].r[f];
					sumc += jiggleFacts[i].c[f];
				}
				for(let i = 0; i < jiggleFacts.length; i++) {
					jiggleFacts[i].r[f] /= sumr;
					jiggleFacts[i].c[f] /= sumc;
				}
			}
			const resetPart = part => part.elem.style.transform = '';
			const jigglePart = (part, rc = mouse) => {
				const t = Date.now() * 0.4 + parts.indexOf(part) * 10000;
				let delta = 0.6 * CellSize;
				/*
				const range = 3, reach = 0.5, scale = 2;
				let dr = rc.r - part.r, dc = rc.c - part.c;
				let dist = Math.sqrt(dr**2 + dc**2);
				delta *= 1 * Math.min(1, part.size) * (reach / range) * inverseN(dist, scale, range) ;
				*/
				let r = 0, c = 0;
				for(let i = 0; i < jiggleFacts.length; i++) {
					let facts = jiggleFacts[i];
					r += ((i + 1) / 55) * facts.r[0] * Math.sin(facts.r[1] * t + facts.r[2]);
					c += ((i + 1) / 55) * facts.c[0] * Math.sin(facts.c[1] * t + facts.c[2]);
				}
				part.elem.style.transform = `translate(${c * delta}px, ${r * delta}px)`;
			};
			const moveParts = parts => {
				//let {puzzle, svgRenderer} = Framework.app, {selectedCells} = puzzle;
				//if(selectedCells.length === 0) return;
				//let seenCells = intersectCageCells(selectedCells.map(cell => seenCageCells(cell, puzzleInfo)));
				const mouseCell = grid.getCell(mouse.r, mouse.c);
				let seenCells = seenCageCells(mouseCell, puzzleInfo);
				//console.log('  mouseCell:', mouse.r, mouse.c, mouseCell, seenCells);
				const nearestCell = (rc, cells) => cells.map(cell => ({cell, dist: rcCellDist(rc, cell)}))
					.sort((a, b) => a.dist - b.dist)
					.map(({cell}) => cell)[0];
				//console.log(parts.map(part => [part, nearestCell(part, seenCells)]));
				parts
					//.filter(part => seenCells.some(cell => partTouchCell(part, cell)))
					.forEach(part => {
						let rc = mouse;
						//let rc = rowColToRc(nearestCell(part, seenCells));
						//rc.r = 0.5 * (rc.r + mouse.r);
						//rc.c = 0.5 * (rc.c + mouse.c);
						pullPart(part, rc);
					});
			}
			const jiggleParts = parts => {
				const mouseCell = grid.getCell(mouse.r, mouse.c);
				if(mouseCell === undefined) return;
				//let seenCells = seenCageCells(mouseCell, puzzleInfo);
				parts
					//.filter(part => seenCells.some(cell => partTouchCell(part, cell)))
					.filter(part => {
						let elemCell = grid.getCell(part.r, part.c);
						return mouseCell.propGet('normal') === elemCell.propGet('normal');
					})
					.forEach(part => jigglePart(part, mouse));
			};
			const fxlayer = svgRenderer.addLayer('mousefx');
			const partParentIds = [
				'underlay', 'overlay', 'cell-givens', 'arrows', 'cages',
				'cell-givens', 'cell-pen', 'cell-errors', 'cell-colors',
				'cell-pencilmarks', 'cell-candidates', 'cell-values',
			];
			const parts = [...svgElem.querySelectorAll('*')]
				.map(elem => {
					let b = bounds(elem);
					let rc = app.xyToRCExact(b.x + 0.5 * b.width, b.y + 0.5 * b.height);
					return {elem, ...rc, size: boundsSize(b)};
				})
				.filter(part => partParentIds.includes(part.elem.parentElement.id))
				//.filter(part => part.elem.nodeName === 'text')
				//.filter(part => part.elem.classList.contains('cell-value'))
				//.filter(part => part.size >= 0.01)
				;
			const handleInputmove = event => {
				if(mouse.down) {
					updateMouse();
					//jiggleParts(parts);
					moveParts(parts);
				}
			};
			let intervalId;
			const handleInputdown = event => {
				event.preventDefault();
				event.stopPropagation();
				puzzleInfo = Checker.getPuzzleInfo();
				updateMouse({down: true});
				moveParts(parts);
				clearInterval(intervalId);
				//intervalId = setInterval(() => jiggleParts(parts), 33);
			};
			const handleInputup = event => {
				event.preventDefault();
				event.stopPropagation();
				updateMouse({down: false});
				parts.forEach(resetPart);
				clearInterval(intervalId);
			};
			addMoveEventHandler(window, handleInputmove, {passive: false, capture: true});
			addDownEventHandler(window, handleInputdown, {passive: false, capture: true});
			addUpEventHandler(window, handleInputup, {passive: false, capture: true});
		};
	// Rendering debugging
		C.debugRenderingStyle = `
			#svgrenderer * { outline: 2px dotted rgba(255,0,255,0.5); }
		`;
		P.handleInitRendering = async function() {
			this.debugRenderingEnabled = false;
			const qs = new URLSearchParams(document.location.search);
			let qsDebugrendering = qs.get('debugrendering');
			if(qsDebugrendering !== null) this.debugRenderingToggle(true);
		};
		P.debugRenderingToggle = async function(forceOn = false) {
			let enable = forceOn || !this.debugRenderingEnabled;
			if(!enable && this.debugRenderingEnabled) {
				this.renderingStyleElem.remove();
				delete this.renderingStyleElem;
				this.debugRenderingEnabled = false;
			}
			else if(enable) {
				this.renderingStyleElem = await attachStylesheet(C.debugRenderingStyle);
				this.debugRenderingEnabled = true;
			}
		};
	
	return C;
})();

FeatureDebug.create();