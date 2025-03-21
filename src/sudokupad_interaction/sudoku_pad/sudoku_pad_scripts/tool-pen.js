
const ToolPen_tool = (() => {
	
	function ToolPen() {
		bindHandlers(this);
		this.name = 'pen';
		this.isTool = true;
		this.actionLong = 'pen';
		this.actionShort = 'pe';
		this.stateColor = undefined;
		this.selectedColor = undefined;
		this.lineMode = 'both';
		this._actList = [];
	}
	const C = ToolPen, P = Object.assign(C.prototype, {constructor: C});
	// Helpers
		P.rcDiagDir = (a, b) => Math.sign((b.r - a.r) * (b.c - a.c)); // \ = 1, / = -1, + = 0
		P.getInputRc = function() {
			const {app} = Framework, {x, y} = app.inputPos;
			return app.xyToRCExact(x, y);
		};
		P.getCenterEdgeLine = function(aRC, bRC, forcedIsCenterLine) {
			let aCenter = RC.addScalar(RC.round(aRC), 0.5);
			let aEdge = RC.addScalar(RC.round(RC.addScalar(aRC, -0.5)), 1);
			// Find closes of for possible candidates for center/edge lines
			let minDistCenter = Number.MAX_SAFE_INTEGER, closestCenter;
			let minDistEdge = Number.MAX_SAFE_INTEGER, closestEdge;
			[{r:  0, c:  1}, {r:  1, c:  0}, {r:  0, c: -1}, {r: -1, c:  0},
			 {r:  1, c:  1}, {r:  1, c: -1}, {r: -1, c: -1}, {r: -1, c:  1}].forEach(d => {
				let pCenter = RC.add(aCenter, d), distCenter = RC.dist(bRC, pCenter);
				if(distCenter < minDistCenter) {
					minDistCenter = distCenter;
					closestCenter = pCenter;
				}
				let pEdge = RC.add(aEdge, d), distEdge = RC.dist(bRC, pEdge);
				if(distEdge < minDistEdge) {
					minDistEdge = distEdge;
					closestEdge = pEdge;
				}
			});
			let distACenter = RC.dist(aRC, aCenter), distAEdge = RC.dist(aRC, aEdge);
			let mseCenter = (distACenter * distACenter + minDistCenter * minDistCenter) * 0.5;
			let mseEdge = (distAEdge * distAEdge + minDistEdge * minDistEdge) * 0.5;
			let isCenterLine = mseCenter < mseEdge;
			if(forcedIsCenterLine !== undefined) isCenterLine = forcedIsCenterLine;
			let rc1, rc2;
			if(isCenterLine) {
				rc1 = aCenter;
				rc2 = closestCenter;
			} else {
				rc1 = aEdge;
				rc2 = closestEdge;
			}
			let dx = aRC.c - bRC.c, dy = aRC.r - bRC.r;
			let tan = Math.abs((Math.abs(dx) < Math.abs(dy) ? dx / dy : dy / dx)); // Always beteen 0.0 and 1.0
			let isDiagonal = tan > 0.5 && RC.dist(aRC, bRC) > 0.5; // 45 +/- 18 degrees (27-63) and length > 0.5
			return [rc1, rc2, isDiagonal, isCenterLine];
		};
	// Pen API
		P.setStateColor = function(color) {
			this.stateColor = color;
		};
		P.getStateColor = function() {
			return this.stateColor;
		};
		P.setSelectedColor = function(color) {
			this.selectedColor = color;
			let currentBtn = document.querySelector('.tool-pen button.current');
			if(currentBtn) currentBtn.classList.remove('current');
			document.querySelector(`.tool-pen button[data-value="${color}"]`).classList.add('current');
			Framework.setData('ToolPen_color', this.selectedColor);
		};
		P.createLineMarker = function(cell, edge) {
			const {row, col} = cell;
			return Framework.app.svgRenderer.renderPen({row, col, value: '1'});
		};
		P.drawLineHint = function(path) {
			const {app} = Framework;
			if(this.eraseMode !== undefined) {
				if(this.linePart === undefined) {
					this.linePart = app.svgRenderer.renderPart({target: 'cell-pen', type: 'path', attr: {
						class: `penhint pencolor-${this.eraseMode ? 'erase' : this.selectedColor}`
					}});
				}
				this.linePart.setAttribute('d', SvgRenderer.rcToPathData(path.map(RC.toArr)));
			}
		};
		P.cellHasPen = function(cell, pen) {
			return cell.pen.find(p => p[0] === pen) !== undefined;
		};
		P.clickCell = function() {
			const MaxEdgeDist = 1.0, MaxCellDist = 0.5;
			const {app} = Framework;
			const {rows, cols} = app.grid;
			let inputRC = this.getInputRc();
			let cellR = Math.max(0, Math.min(rows - 1, Math.floor(inputRC.r)));
			let cellC = Math.max(0, Math.min(cols - 1, Math.floor(inputRC.c)));
			let dx = inputRC.c - (cellC + 0.5), dy = inputRC.r - (cellR + 0.5);
			if(Math.abs(dx) >= Math.abs(dy)) {
				dx = Math.sign(dx);
				dy = 0;
			}
			else {
				dx = 0;
				dy = Math.sign(dy);
			}
			let cellDist = calcDistanceArr([inputRC.r, inputRC.c], [cellR + 0.5, cellC + 0.5]);
			let edgeDist = calcDistanceArr([inputRC.r, inputRC.c], [cellR + 0.5 + 0.5 * dy, cellC + 0.5 + 0.5 * dx]);
			if(edgeDist < cellDist * 0.75 && edgeDist <= MaxEdgeDist) { // Edge Marker
				if(cellC > 0 && dx === -1) {
					cellC--;
					dx = 1;
				}
				if(cellR > 0 && dy === -1) {
					cellR--;
					dy = 1;
				}
				cell = app.grid.getCell(cellR, cellC);
				let val = dy === 0 ? '3' : '4';
				if(cellC === 0 && dx === -1) val = 'b';
				if(cellR === 0 && dy === -1) val = 'c';
				this.actStart(); // Edge Marker
				this.actAdd({type: 'select', arg: [cell]});
				this.actAdd({type: 'pen', arg: val});
				this.actSend();
			}
			else if(cellDist <= MaxCellDist) { // Cell Marker
				let cell = app.grid.getCell(cellR, cellC);
				this.actStart(); // Cell Marker
				this.actAdd({type: 'select', arg: [cell]});
				if(this.cellHasPen(cell, '5')) {
					this.actAdd({type: 'pen', arg: '5'});
					this.actAdd({type: 'pen', arg: '6'});
				}
				else if(this.cellHasPen(cell, '6')) {
					this.actAdd({type: 'pen', arg: '6'});
				}
				else {
					this.actAdd({type: 'pen', arg: '5'});
				}
				this.actSend();
			}
		};
		P.lineReset = function() {
			this.currentPath = undefined;
			this.lineType = undefined;
			this.eraseMode = undefined;
			if(this.lineMode === 'edgeonly') {
				this.lineType = 'edge';
			}
			else if(this.lineMode === 'centeronly') {
				this.lineType = 'center';
			}
		};
		P.getEraseMode = function(rc1, rc2, isCenterLine) {
			const {app} = Framework, {grid} = app, {rcDiagDir} = this;
			const getPenOrtho = (isCenterLine, isHorizontal, cellRC) => isCenterLine
				? (isHorizontal ? '1' : '2')
				: (isHorizontal
					? (cellRC.r >= 0 ? '8' : 'a')
					: (cellRC.c >= 0 ? '7' : '9')
					);
			const getPenDiag = (isCenterLine, dir, cellRC) => isCenterLine
					? (dir === -1 ? 'd' : 'e')
					: (dir === -1 ? 'f' : 'g');
			let cellRC = RC.round(RC.addScalar(RC.mid(rc1, rc2), -0.5));
			let isHorizontal = rc1.r === rc2.r, diagonalDir = rcDiagDir(rc1, rc2);
			let penVal = diagonalDir === 0
				? getPenOrtho(isCenterLine, isHorizontal, cellRC)
				: getPenDiag(isCenterLine, diagonalDir, cellRC);
			if(penVal === '9') cellRC.c++;
			if(penVal === 'a') cellRC.r++;
			if(penVal === 'd') cellRC.r++;
			let cell = grid.getCell(cellRC.r, cellRC.c);
			if(cell !== undefined) return this.cellHasPen(cell, penVal);
			console.error('Cell out of bounds:', cellRC, penVal, cell);
		};
	// Actions
		P.actStart = function() {
			if(this._actList === undefined) this._actList = [];
			this._actList.length = 0;
		};
		P.actSend = function() {
			const {app} = Framework;
			let acts = this._actList;
			if(acts.length > 0) {
				app.act({type: 'groupstart'});
				app.act({type: 'deselect'});
				if(this.selectedColor !== this.stateColor) {
					app.act({type: 'pencolor', arg: this.selectedColor});
					this.stateColor = this.selectedColor;
				}
				acts.forEach(act => app.act(act));
				app.act({type: 'deselect'});
				app.act({type: 'groupend'});
			}
			this._actList.length = 0;
		};
		P.actAdd = function(act) {
			this._actList.push(act);
		};
	// Handlers
		P.handleReset = function(event) {
			this.setStateColor(undefined);
		};
		P.handleLineModeChange = function(event) {
			this.lineMode = event.target.value;
			Framework.setData('ToolPen_linemode', this.lineMode);
		};
		P.handleToolEnter = function() {
			const {app} = Framework;
			this.active = true;
			// FIX: Inconsistent selection display during undo
			app.svgRenderer.getElem().querySelector('#cell-highlights').setAttribute('opacity', 0);
			this.selectedColor = Framework.getData('ToolPen_color') || '1';
			this.setSelectedColor(this.selectedColor);
			this.lineMode = Framework.getData('ToolPen_linemode');
			this.linemodeElem = Framework.createElem({class: 'penlinemode',
				parent: document.querySelector('.tool-pen .button-row:last-child'),
				children: [{tag: 'select', children: [
					{tag: 'option', value: 'both', content: 'Center & Edge', selected: this.lineMode === 'both'},
					{tag: 'option', value: 'centeronly', content: 'Center Only', selected: this.lineMode === 'centeronly'},
					{tag: 'option', value: 'edgeonly', content: 'Edge Only', selected: this.lineMode === 'edgeonly'},
				]}]
			});
			this.linemodeElem.addEventListener('change', this.handleLineModeChange, {passive: false});
		};
		P.handleToolExit = function() {
			if(this.linemodeElem !== undefined) {
				this.linemodeElem.remove();
				this.linemodeElem = undefined;
			}
			this.active = false;
			// FIX: Inconsistent selection display during undo
			Framework.app.svgRenderer.getElem().querySelector('#cell-highlights').removeAttribute('opacity');
		};
		P.handleToolButton = function(button) {
			this.setSelectedColor(button);
			return true;
		};
		P.handleSpecialInput = function() { return true; };
		P.keyHandlers = [
			{
				key: /[0-9]/,
				handler: function(tool) { return Framework.app.tool === this.name; }
			},
		];
		P.handleInputdown = function(event) {
			this.inputIsDown = true;
		};
		P.handleInputup = function(event) {
			if(this.inputIsDown !== true) return;
			this.inputIsDown = false;
			const path = this.currentPath || [];
			let didMove = Framework.app.didInputMove();
			if(!didMove && path.length <= 1 && this.linePart === undefined) this.clickCell();
		};
		P.handleDragStart = function(event) {
			if(this.dragStartPos !== undefined) return;
			const {app} = Framework;
			let inputRC = this.getInputRc(), cellRC = RC.round(inputRC);
			let cell = app.grid.getCell(cellRC.r, cellRC.c);
			if(cell === undefined) return;
			this.dragStartPos = inputRC;
			delete this.linePart;
			this.lineReset();
			return true;
		};
		P.handleDragMove = function(event) {
			const {app} = Framework, {grid} = app;
			const MinimumDist = 0.7;
			let minDist = MinimumDist;
			if(!app.didInputMove()) return;
			let inputRC = this.getInputRc();
			if(this.dragStartPos === undefined) this.dragStartPos = inputRC;
			let startRC = this.dragStartPos;
			let {currentPath: path} = this;
			let pathLen = path && path.length;
			let inputLen = RC.dist(startRC, inputRC);
			if(path && pathLen <= 1 && inputLen < minDist) this.lineReset();
			if(path && pathLen > 0) {
				startRC = path[pathLen - 1];
				inputLen = RC.dist(startRC, inputRC);
			}
			let forcedIsCenterLine = this.lineType && this.lineType === 'center';
			// Find line type
			let [rc1, rc2, isDiagonal, isCenterLine] = this.getCenterEdgeLine(startRC, inputRC, forcedIsCenterLine);
			if(isDiagonal) minDist *= Math.sqrt(2);

			// Board clipping
			if(
					(Math.min(rc1.c, rc2.c) < 0) || (Math.max(rc1.c, rc2.c) > grid.cols) ||
					(Math.min(rc1.r, rc2.r) < 0) || (Math.max(rc1.r, rc2.r) > grid.rows)
				) return;
			// Calc new line segment
			if(inputLen >= minDist) {
				if(this.lineType === undefined) this.lineType = isCenterLine ? 'center' : 'edge';
				if(this.eraseMode === undefined) {
					this.eraseMode = this.getEraseMode(rc1, rc2, isCenterLine);
				}
				if(path === undefined) {
					this.currentPath = path = [rc1];
					pathLen = path.length;
				}
				if(pathLen > 1 && RC.isEqual(rc2, path[pathLen - 2])) {
					path.pop();
				}
				else if(!(pathLen > 0 && RC.isEqual(rc2, path[pathLen - 1]))) {
					path.push(rc2);
				}
			}
			this.drawLineHint(path);
		};
		P.handleDragEnd = function(event) {
			const {rcDiagDir} = this;
			const {app} = Framework;
			const pathToSegs = path => path.reduce((acc, cur, idx, arr) => idx === 0 ? acc : acc
				.concat(Object.assign(RC.mid(arr[idx - 1], cur), {a: arr[idx - 1], b: cur})), []);
			if(this.currentLineMarker !== undefined) {
				this.currentLineMarker.parentElement.removeChild(this.currentLineMarker);
			}
			this.currentLineMarker = undefined;
			const path = this.currentPath || [];
			if(app.didInputMove() || path.length > 1) {
				if(path.length > 1) {
					let segs = pathToSegs(path);
					let penActs = {};
					// 7: right edge
					penActs[(this.lineType === 'edge') ? '7' : '1'] = segs
						.map(rc => RC.add(rc, {r: -0.5, c: -1}))
						.map(rc => app.grid.getCell(rc.r, rc.c))
					// 8: bottom edge
					penActs[(this.lineType === 'edge') ? '8' : '2'] = segs
						.map(rc => RC.add(rc, {r: -1, c: -0.5}))
						.map(rc => app.grid.getCell(rc.r, rc.c));
					if(this.lineType === 'edge') {
						// 9: left edge
						penActs['9'] = segs
							.map(rc => RC.add(rc, {r: -0.5, c: -1}))
							.filter(({r, c}) => c === -1)
							.map(rc => app.grid.getCell(rc.r, rc.c + 1));
						// a: top edge
						penActs['a'] = segs
							.map(rc => RC.add(rc, {r: -1, c: -0.5}))
							.filter(({r, c}) => r === -1)
							.map(rc => app.grid.getCell(rc.r + 1, rc.c));
						// f: edge bottom-left to top-right
						penActs['f'] = segs
							.filter(rc => rcDiagDir(rc.a, rc.b) === -1)
							.map(rc => RC.addScalar(rc, -0.5))
							.map(rc => app.grid.getCell(rc.r, rc.c))
						// g: edge top-left to bottom-right
						penActs['g'] = segs
							.filter(rc => rcDiagDir(rc.a, rc.b) === 1)
							.map(rc => RC.addScalar(rc, -0.5))
							.map(rc => app.grid.getCell(rc.r, rc.c));
					}
					else {
						// d: center to top-right
						penActs['d'] = segs
							.filter(rc => rcDiagDir(rc.a, rc.b) === -1)
							.map(rc => RC.add(rc, {r: 0, c: -1}))
							.map(rc => app.grid.getCell(rc.r, rc.c))
						// e: center to bottom-right
						penActs['e'] = segs
							.filter(rc => rcDiagDir(rc.a, rc.b) === 1)
							.map(rc => RC.add(rc, {r: -1, c: -1}))
							.map(rc => app.grid.getCell(rc.r, rc.c));
					}
					Object.keys(penActs).forEach(key => 
						penActs[key] = penActs[key]
							.filter(cell => cell && this.eraseMode === this.cellHasPen(cell, key))
						);
					if(Object.values(penActs).flat().length > 0) {
						this.actStart(); // Line
						Object.keys(penActs).forEach((key, idx) => {
							if(penActs[key].length === 0) return; // Skip lines without segments
							if(idx > 0) this.actAdd({type: 'deselect'});
							this.actAdd({type: 'select', arg: penActs[key]});
							this.actAdd({type: 'pen', arg: key});
						});
						this.actSend();
					}
					this.linePart.remove();
				}
			}
			delete this.dragStartPos;
			delete this.linePart;
			this.lineReset();
		};
		P.handleCreatestate = function(state) {
			Object.assign(state, {pencolor: this.getStateColor()});
		};
		P.handleApplystate = function(state) {
			this.setStateColor(state.pencolor);
		};
	// Setup
		P.init = function() {
			this.lineReset();
			this.handleLineModeChange = this.handleLineModeChange.bind(this);
			this.handleReset = this.handleReset.bind(this);
			Framework.app.puzzle.on('reset', this.handleReset);
		};
	
	return C;
})();

const ToolPen = {
	button: {
		name: 'pen', title: 'Pen',
		content: `<div class="icon">${Framework.icons.toolPen}</div>Pen`,
	},
	tool: new ToolPen_tool()
};

Framework.addSetting({tag: 'toggle', group: 'tools', name: 'toolpen', content: 'Enable Pen Tool', onToggle: Framework.makeToolToggler(ToolPen)});
