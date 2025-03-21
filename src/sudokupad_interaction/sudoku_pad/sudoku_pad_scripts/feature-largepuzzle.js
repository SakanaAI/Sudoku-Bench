
const FeatureLargePuzzle = (() => {
	// Helpers
		const {minDrag, makeGrabScrollHandler, attachScrollHandler, dettachScrollHandler} = SudokuPadUtilities;
		const getDimensions = () => {
			const {CellSize: CS} = SvgRenderer,
						{app, app: {svgRenderer, puzzle: {rows, cols}}} = Framework,
						[left, top, width, height] = svgRenderer.getElem().getAttribute('viewBox').split(' ').map(n => parseFloat(n));
			return {
				width: cols * CS, height: rows * CS,
				marginLeft: -left, marginRight: width + left - cols * CS,
				marginTop: -top, marginBottom: height + top - rows * CS,
			}
		};
		const getEventPos = e => e.touches ? [e.touches[0].clientX, e.touches[0].clientY] : [e.clientX, e.clientY];
	
	function FeatureLargePuzzle() {
		bindHandlers(this);
		PortableEvents.mixin(this);
	}
	const C = FeatureLargePuzzle, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'largepuzzle';
	C.SettingName = C.Name;
	C.featureStyle = `
		.topbar { z-index: 1; }
	`;
	C.ZoomFactor = 0.3;
	C.MinZoomLevel = 1;
	//C.MaxBaseScale = 0.8;
	C.MaxBaseScale = 9999;
	C.StartEventNames = 'mousedown touchstart',
	C.PanEventNames = 'mousemove touchmove',
	C.StopEventNames = 'mouseup touchend';
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
	// PanZoom
		P.reset = function() {
			this.isPanning = false;
			this.lastPos = [];
			this.hasPanned = false;
			this.zoomLevel = 1;
			this.panPos = [0, 0];
			this.baseScale = 1;
			this.zoomStep = C.ZoomFactor * this.baseScale;
			this.updateTransform();
		};
		P.updateTransform = function() {
			const {boEl, zoomLevel, baseScale, panPos} = this;
			let scale = baseScale + zoomLevel - 1;
			boEl.style.transform = `translate(calc(-50% - ${panPos[0]}px), calc(-50% - ${panPos[1]}px)) scale(${scale.toFixed(3)})`;
		};
	// Handlers
		P.handleContextmenu = function(event) {
			event.preventDefault();
		};
		P.handleResize = function(event) {
			const {boEl} = this;
			this.baseScale = getTransform(boEl).sx;
			this.zoomStep = C.ZoomFactor * this.baseScale;
			this.updateTransform();
		};
		P.handleZoomInOut = function(inOut, pos) {
			if(this.baseScale >= C.MaxBaseScale) return;
			const {MinZoomLevel} = C,
						{boEl, baseScale, zoomLevel, panPos, zoomStep} = this;
			let gaBounds = bounds(boEl),
					dx = pos[0] - (gaBounds.left + 0.5 * gaBounds.width),
					dy = pos[1] - (gaBounds.top + 0.5 * gaBounds.height);
			let maxZoomLevel = Math.max(1, 2 - baseScale),
					zoomDelta = 1 + inOut * zoomStep,
					nextZoomLevel = Math.min(maxZoomLevel, Math.max(MinZoomLevel, zoomLevel * zoomDelta)),
					zoomLevelDelta = nextZoomLevel - zoomLevel,
					zoomFactor = zoomLevelDelta / (baseScale + zoomLevel - 1);
			panPos[0] += dx * zoomFactor;
			panPos[1] += dy * zoomFactor;
			this.zoomLevel = nextZoomLevel;
			this.updateTransform();
		};
		P.handleWheel = function(event) {
			if(this.baseScale >= C.MaxBaseScale) return;
			let inOut = -1 * Math.sign(event.deltaY);
			this.handleZoomInOut(inOut, getEventPos(event));
		};
		P.handlePan = function(dxy) {
			console.log('handlePan:', dxy);
			const {panPos} = this;
			panPos[0] -= dxy[0];
			panPos[1] -= dxy[1];
			this.updateTransform();
		};
		P.handleMousemove = function(event) {
			if(event.buttons !== 2) return;
			const {panPos} = this;
			let eType = event.type;
			event.preventDefault();
			event.stopPropagation();
			if(eType === 'mousedown' || eType === 'touchstart') {
				this.lastPos = getEventPos(event);
				this.hasPanned = false;
			}
			else if((eType === 'mousemove' || eType === 'touchmove') && this.lastPos) {
				let pos = getEventPos(event);
				let lastPos = this.lastPos = this.lastPos || pos;
				let delta = [(pos[0] - lastPos[0]), (pos[1] - lastPos[1])];
				if(this.hasPanned || Math.abs(delta[0]) >= minDrag || Math.abs(delta[1]) >= minDrag) {
					panPos[0] -= delta[0];
					panPos[1] -= delta[1];
					lastPos[0] = pos[0];
					lastPos[1] = pos[1];
					this.hasPanned = true;
					this.updateTransform();
				}
			}
		};
		P.handleStartPanCapture = function(event) {
			if(this.baseScale >= C.MaxBaseScale) return;
			if(this.isPanning) return;
			this.isPanning = true;
			remHandler(this.boEl, C.StartEventNames, this.handleStartPanCapture, {capture: true});
			addHandler(window, C.StopEventNames, this.handleStopPanCapture, {capture: true});
			addHandler(window, 'contextmenu', this.handleContextmenu, {capture: true});
			addHandler(window, C.PanEventNames, this.handleMousemove, {capture: true});
			this.lastPos = getEventPos(event);
			this.hasPanned = false;
		};
		P.handleStopPanCapture = async function(event) {
			if(!this.isPanning) return;
			this.isPanning = false;
			this.lastPos = undefined;
			this.hasPanned = false;
			remHandler(window, C.StopEventNames, this.handleStopPanCapture, {capture: true});
			remHandler(window, C.PanEventNames, this.handleMousemove, {capture: true});
			await sleep(10)();
			remHandler(window, 'contextmenu', this.handleContextmenu, {capture: true});
			addHandler(this.boEl, C.StartEventNames, this.handleStartPanCapture, {capture: true});
		};
		P.handleZoomPan = function(inOut, pan) {
			console.log('handleZoomPan:', inOut, pan);
			const {MinZoomLevel} = C,
						{boEl, baseScale, zoomLevel, panPos, zoomStep} = this;
			let maxZoomLevel = Math.max(1, 2 - baseScale),
					zoomDelta = 1 + inOut * zoomStep,
					nextZoomLevel = Math.min(maxZoomLevel, Math.max(MinZoomLevel, zoomLevel * zoomDelta)),
					zoomLevelDelta = nextZoomLevel - zoomLevel,
					zoomFactor = zoomLevelDelta / (baseScale + zoomLevel - 1);
			console.log('  zoomDelta:', zoomDelta);
			console.log('  zoomLevel:', zoomLevel);
			console.log('  nextZoomLevel:', nextZoomLevel);
			console.log('  zoomLevelDelta:', zoomLevelDelta);
			console.log('  zoomFactor:', zoomFactor);
			panPos[0] += pan[0] * zoomFactor;
			panPos[1] += pan[1] * zoomFactor;
			this.zoomLevel = nextZoomLevel;
			this.updateTransform();
		};
		P.touchesToAABB = function(touches) {
			const xs = [...event.touches].map(({clientX}) => clientX),
						ys = [...event.touches].map(({clientY}) => clientY);
			return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
		};
		P.distance = ([dx, dy]) => Math.sqrt(dx**2 + dy**2);
		P.aabbSize = aabb => Math.sqrt((aabb[2] - aabb[0])**2 + (aabb[3] - aabb[1])**2);
		P.aabbPos = aabb => [0.5 * (aabb[0] + aabb[2]), 0.5 * (aabb[1] + aabb[3])];
		P.handletouchmove = async function(event) {
			//console.log('handletouchmove');
			let aabb = this.touchesToAABB([...event.touches]),
					size = this.aabbSize(aabb), pos = this.aabbPos(aabb);
			if(this.lastAAB === undefined) this.lastAAB = aabb;
			let lastSize = this.aabbSize(this.lastAAB), lastPos = this.aabbPos(this.lastAAB);
			//console.log('  size / pos:', size, pos);
			//console.log('  lastSize / lastPos:', lastSize, lastPos);
			let deltaSize = lastSize - size;
			let deltaPos = [pos[0] - lastPos[0], pos[1] - lastPos[1]];
			let dist = this.distance(deltaPos);
			//this.handleZoomPan(0, deltaPos);
		};
	// Feature
		P.attachElem = function() {
			if(this.featureEnabled) return;
			this.featureEnabled = true;
			this.boEl = document.querySelector('#board');
			addHandler(this.boEl, 'wheel', this.handleWheel, {capture: true});
			Framework.app.on('resize', this.handleResize);
			addHandler(this.boEl, C.StartEventNames, this.handleStartPanCapture, {capture: true});
			/*
			this.lastPinchPos = [];
			this.lastPinchSize = 0;
			addHandler(document.body, 'touchmove', this.handletouchmove, {capture: true});
			*/
			this.reset();
			Framework.app.resize();
		};
		P.detachElem = function() {
			if(!this.featureEnabled) return;
			this.featureEnabled = false;
			this.handleStopPanCapture();
			addHandler(this.boEl, 'wheel', this.handleWheel, {capture: true});
			Framework.app.off('resize', this.handleResize);
			remHandler(this.boEl, C.StartEventNames, this.handleStartPanCapture, {capture: true});
			this.reset();
			Framework.app.resize();
		};
		P.handleSettingChange = function() {
			let setting = Framework.getSetting(C.SettingName);
			setting ? this.attachElem() : this.detachElem();
		};
		P.handleInit = async function() {
			Framework.addSetting({
				group: 'experimental', name: C.SettingName, content: 'Test Large Puzzle UI',
				tag: 'toggle',
				onToggle: this.handleSettingChange,
			});
		};
	
	return C;
})();

FeatureLargePuzzle.create();