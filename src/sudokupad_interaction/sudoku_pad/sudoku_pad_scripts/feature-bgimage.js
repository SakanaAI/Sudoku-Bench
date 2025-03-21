const FeatureBgImage = (() => {
	// Helpers
		const {zip} = PuzzleZipper,
			{compressPuzzle, encodeFPuzzleData} = loadFPuzzle,
			{fetchPuzzle, parsePuzzleData, getPuzzleFormat, saveJsonUnzip, decompressPuzzleId} = PuzzleLoader;
		const decodePuzzle = async puzzleId => 'fpuz' === getPuzzleFormat(puzzleId)
			? saveJsonUnzip(decompressPuzzleId(puzzleId))
			: parsePuzzleData(puzzleId);
		const encodePuzzle = (puzzleId, puzzleData) => 'fpuz' === getPuzzleFormat(puzzleId)
			? `fpuz${encodeFPuzzleData(puzzleData)}`
			: `scl${compressPuzzle(zip(JSON.stringify(puzzleData)))}`;
		const injectPuzzleMeta = (puzzle, metadata = {}) => {
			puzzle.metadata = puzzle.metaData || puzzle.metadata || {};
			delete puzzle.metaData;
			for(const [key, val] of Object.entries(metadata)) {
				if(val === undefined || val === '') delete puzzle.metadata[key];
				else puzzle.metadata[key] = val;
			}
			return puzzle;
		};
	
	function FeatureBgImage() {
		bindHandlers(this);
		this.featureStylesheet = undefined;
		this.featureEnabled = false;
	}
	const C = FeatureBgImage, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'bgimage';
	C.featureStyle = ``;
	C.reMultiSlash = /\/{2}/;
	C.reFloat = /^(0|1|0?(\.[0-9]+))$/;
	C.puzzleIdUriEncode = puzzleId => C.reMultiSlash.test(puzzleId) ? encodeURIComponent(puzzleId) : puzzleId;
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
	// Setting
		P.handleLoadBgImage = function() {
			this.loadBgImage();
		};
		P.attachElem = function() {
			let {app, app: {currentPuzzle}} = Framework;
			if(this.featureEnabled) return;
			this.featureEnabled = true;
			app.puzzle.on('start', this.handleLoadBgImage);
			app.puzzle.on('loaded', this.handleLoadBgImage);
			app.puzzle.on('progressloaded', this.handleLoadBgImage);
			this.loadBgImage();
		};
		P.detachElem = function() {
			let {app} = Framework, {puzzle} = app;
			if(!this.featureEnabled) return;
			this.featureEnabled = false;
			app.puzzle.off('loaded', this.handleLoadBgImage);
			app.puzzle.off('progressloaded', this.handleLoadBgImage);
			app.puzzle.off('start', this.handleLoadBgImage);
			if(this.bgimageEl) this.removeBgImage();
		};
		P.handleToggle = function(settingOn) {
			settingOn ? this.detachElem() : this.attachElem();
		};
		P.handleInit = function() {
			Framework.addSettings([
				{
					tag: 'toggle', group: 'visual', name: 'hidebgimage',
					content: 'Hide Background Image',
					onToggle: this.handleToggle
				},
				{
					tag: 'button', group: 'advanced', name: 'addbgimage',
					content: 'Add Background Image',
					handler: this.handleOpenDialog
				},
			]);
			this.handleToggle(Framework.getSetting('hidebgimage'));
		};
	// Feature
		C.injectMetadata = async function(puzzleId = getPuzzleId(), metadata) {
			puzzleId = await fetchPuzzle(puzzleId);
			let puzzleData = await decodePuzzle(puzzleId);
			injectPuzzleMeta(puzzleData, metadata);
			let res = await encodePuzzle(puzzleId, puzzleData);
			return res;
		};
		P.getDimensions = function() {
			const {CellSize: CS} = SvgRenderer,
						{app, app: {svgRenderer, puzzle: {rows, cols}}} = Framework,
						[left, top, width, height] = svgRenderer.getElem().getAttribute('viewBox').split(' ').map(n => parseFloat(n));
			return {
				width: cols * CS, height: rows * CS,
				marginLeft: -left, marginRight: width + left - cols * CS,
				marginTop: -top, marginBottom: height + top - rows * CS,
			}
		};
		P.parseBgImageOpacity = function(opacity) {
			opacity = parseFloat(opacity);
			if(isNaN(opacity)) opacity = 0.2;
			opacity = Math.max(0, Math.min(1, opacity));
			opacity = Math.round(opacity * 100) * 0.01;
			return opacity;
		};
		P.removeBgImage = function() {
			if(this.bgimageEl) {
				this.bgimageEl.remove();
				this.bgimageEl = undefined;
			}
		};
		P.loadBgImage = async function() {
			const {app, app: {svgRenderer, puzzle, currentPuzzle}} = Framework, {CellSize: CS} = SvgRenderer;
			try {
				if(puzzle.replayPlaying) return;
				if(currentPuzzle === undefined) return;
				if(this.bgimageEl && this.bgimageEl.parent) return;
				if(this.bgimageEl) this.removeBgImage();
				const {metadata: {bgimage, bgimageopacity, bgimagetarget} = {}} = currentPuzzle;
				if(bgimage === undefined) return;
				const {width, height, marginLeft, marginRight, marginTop, marginBottom} = app.getDimensions();
				this.bgimageEl = svgRenderer.renderPart({
					target: bgimagetarget || 'background',
					type: 'image', 
					attr: {
						href: await sanitizeImageUrl(bgimage),
						x: -marginLeft, y: -marginTop,
						width: width + marginLeft + marginRight,
						height: height + marginTop + marginBottom,
						opacity: this.parseBgImageOpacity(bgimageopacity),
						preserveAspectRatio: 'none'
					}
				});
			}
			catch (err) {
				console.error('Error loading background image:', err);
			}
		};
		P.handleOpenDialog = async function() {
			const {app, app: {currentPuzzle}} = Framework;
			const {metadata = {}} = currentPuzzle;
			const {bgimage, bgimageopacity} = metadata;
			const dims = app.getDimensions();
			const handleDialogButton = async button => {
				if(button === 'Add Background') {
					const nextBgImage = document.getElementById('input_bgimage').value;
					const nextBgImageOpacity = document.getElementById('input_bgimageopacity').value;
					let metadata = {
						bgimage: nextBgImage,
						bgimageopacity: C.reFloat.test(nextBgImageOpacity) ? nextBgImageOpacity : ''
					};
					let newPuzzleId = await C.injectMetadata(getPuzzleId(), metadata);
					if(newPuzzleId === undefined) {
						console.error('Error adding BG Image');
						return;
					}
					const newUrl = new URL(document.location);
					newUrl.pathname = '/' + C.puzzleIdUriEncode(newPuzzleId);
					document.location = newUrl;
				}
			};
			Framework.closeDialog();
			Framework.showDialog({
				parts: [
					{tag: 'title', innerHTML: 'Add Background Image', style: 'text-align: center'},
					{style: 'margin: 0.25rem 1rem 0 1rem;', children: [
						{tag: 'label', content: 'Image URL:', style: 'margin: 0;'},
						{tag: 'input', value: bgimage || '', id: 'input_bgimage', style: 'width: calc(100% - 2rem); margin: 0;'},
					]},
					{style: 'margin: 0.25rem 1rem 0 1rem;', children: [
						{tag: 'label', content: 'Image Opacity:', style: 'margin: 0; display: inline;'},
						{tag: 'input', value: bgimageopacity || '', min: 0, max: 1, id: 'input_bgimageopacity', style: 'width: 3rem; text-align: right; margin: 0 0 0 0.5rem;'},
					]},
					{
						innerHTML: `
						<div>Board size: ${dims.width}x${dims.height}</div>
						<div>Margins (top, bottom, left, right):<br>
							${dims.marginTop},
							${dims.marginBottom}, 
							${dims.marginLeft},
							${dims.marginRight}
						</div>
						`,
						style: 'margin: 1rem;'
					},
					{tag: 'options', options: ['Add Background', 'Cancel'], style: 'flex-direction: row; justify-content: center;'},
				],
				onButton: handleDialogButton,
				centerOverBoard: true
			});
		};
	return C;
})();

FeatureBgImage.create();