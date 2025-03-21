
const FeatureReplayGif = (() => {
	// Helpers
		const {svgToDataUri, puzzleToSvg, blobToBlobUrl, svgToBlob, imgUriToBlob} = PuzzleTools;
		const {resolvePuzzleData} = PuzzleLoader;

	function FeatureReplayGif() {
		bindHandlers(this);
		PortableEvents.mixin(this);
		this.featureEnabled = false;
		this.status = 'idle';
		this.dialogPresets = {
			totalFrames: 50,
			repeatLastFrame: 10,
			frameDuration: 1,
			width: 360, height: 360,
		};
	}
	const C = FeatureReplayGif, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'replaygif';
	C.SettingName = C.Name;
	C.featureStyle = ``;
	C.ScriptDependencies = ['/gifshot-0.4.5-b.min.js'];
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
			this.trigger('init');
			if(C.featureStyle) this.featureStylesheet = await attachStylesheet(C.featureStyle);
		};
		P.addFeature = async function() {
			this.init();
		};
		P.removeFeature = async function() {
			this.featureEnabled = false;
			if(this.featureStylesheet) this.featureStylesheet.remove();
		};
	// Setting
		P.handleInit = function() {
			Framework.addSetting({
				group: 'importexport', name: C.SettingName,
				tag: 'button',
				content: 'Replay GIF',
				handler: this.handleOpenDialog,
			});
		};
	// Replay/GIF Tools
		C.createGif = async opts => new Promise((resolve, reject) => gifshot.createGIF(opts, ({error, image}) => error ? reject(error) : resolve(image)));
		C.createAnimationFilename = async function(puzzleId) {
			const cleanStr = (str = '') => str.replace(/[^a-zA-Z0-9]/gm, ' ').replace(/^ *| *$/gm, '').replace(/ +/gm, '_');
			const {app} = Framework;
			let metadata = app.extractPuzzleMeta(await resolvePuzzleData(puzzleId));
			let author = cleanStr(metadata.author);
			let title = cleanStr(metadata.title || 'puzzle');
			let filename = `sudokupad-${author ? author.slice(0, 10) + '-' : ''}${title.slice(0, 30)}.gif`;
			return filename;
		};
		C.getReplay = function() {
			return Replay.decode(Framework.app.getReplay());
		};
		C.getPuzzleDims = function() {
			const {app: {svgRenderer}} = Framework, {width, height} = svgRenderer.getContentBounds();
			return {width: Math.ceil(width), height: Math.ceil(height)};
		};
		P.getFrames = async function(totalFrames, onFrame) {
			const {app: {puzzle}} = Framework,
						replay = this.currentReplay,
						replayLength = Puzzle.replayLength(replay),
						asyncFrames = this.asyncFrames = [];
			let prevAction = 0, currentReplayTime = 0;
			const addFrame = async () => {
				let svg = await puzzleToSvg(this.puzzleDims);
				let uri = blobToBlobUrl(await svgToBlob(svg));
				if(typeof onFrame === 'function') onFrame(uri);
				//console.log('  Adding frame %s at time %s (stack: %s)', frames.length, (currentReplayTime / 1000).toFixed(1), puzzle.replayStack.length);
				return uri;
			};
			const handleReplayStep = async () => {
				currentReplayTime += Puzzle.replayLength({actions: replay.actions.slice(prevAction, puzzle.replayStack.length)});
				prevAction = puzzle.replayStack.length;
				if(asyncFrames.length === 0
					|| puzzle.replayStack.length >= replay.actions.length
					|| (
						(currentReplayTime >= replayLength / (totalFrames - 1) * asyncFrames.length) && 
						(asyncFrames.length < (totalFrames - 0))
					)) {
					asyncFrames.push(addFrame());
				}
			};
			await puzzle.replayPlay(replay, {speed: 10000, playToTime: 0});
			asyncFrames.push(addFrame());
			puzzle.on('replaystep', handleReplayStep);
			try {
				await Promise.race([
					new Promise((resolve, reject) => this.replayPlayAbort = reject),
					puzzle.replayPlay(replay, {speed: 10000, playToTime: -1})
				]);
			}
			finally {
				puzzle.off('replaystep', handleReplayStep);
			}
			return await Promise.all(asyncFrames);
		};
		P.createReplayAnim = async function(event) {
			const {app} = Framework;
			try {
				this.status = 'prepare';
				let elemLog = document.querySelector('#puzzle_anim_out');
				let elemBtnAction = document.querySelector('#anim_action');
				let elemBtnCancel = document.querySelector('#anim_cancel');
				const getFrames = async () => {
					let totalFrames = parseInt(document.querySelector('#animframes').value);
					elemLog.innerHTML = `Adding ${totalFrames} frames...`;
					console.info('Progress:', elemLog.textContent);
					document.querySelectorAll('.dialog input')
						.forEach(elem => elem.toggleAttribute('disabled', true));
					elemBtnAction.toggleAttribute('disabled', true);
					elemBtnAction.style['pointer-events'] = 'none';
					elemBtnAction.innerHTML = 'Processing...';
					elemBtnCancel.innerHTML = 'Abort';
					let frameCount = 0;
					const handleOnFrame = frame => {
						elemLog.innerHTML = `Adding frame ${++frameCount} of ${totalFrames}:<br/><img height="100" src="${frame}">`;
					};
					this.status = 'record';
					console.time('getFrames');
					let frames = await this.getFrames(totalFrames, handleOnFrame);
					console.timeEnd('getFrames');
					return frames;
				};
				const repeatLastFrame = async (frames) => {
					let repeatLastFrame = parseInt(document.querySelector('#animrepeatlastframe').value);
					console.info('Progress:', `Repeating last frame ${repeatLastFrame} times...`);
					for(let i = 1; i < repeatLastFrame; i++) frames.push(frames[frames.length - 1]);
				};
				const createGif = async (frames) => {
					this.status = 'create';
					let	gifWidth = parseInt(document.querySelector('#animdims_w').value),
							gifHeight = parseInt(document.querySelector('#animdims_h').value),
							frameDuration = parseInt(document.querySelector('#animframedelay').value);
					elemLog.innerHTML = `Creating animated gif with ${frames.length} frames at ${gifWidth}x${gifHeight}.<br/>This may take a bit...`;
					console.info('Progress:', elemLog.textContent);
					console.time('createGif');
					let animSrc = this.lastAnimSrc = await C.createGif({
						images: frames, gifWidth, gifHeight, frameDuration,
						numWorkers: 4, makeTransparentFrames: true,
					});
					console.timeEnd('createGif');
					if(this.status === 'abort') throw new Error('Aborted');
					return animSrc;
				};
				const showDownload = async (animSrc) => {
					this.animBlob = await imgUriToBlob(animSrc);
					this.animBlobUrl = blobToBlobUrl(this.animBlob);
					elemLog.innerHTML = `Animation completed:<br/><a href="${this.animBlobUrl}#filename=puzzlereplay.gif" target="_blank"><img src="${this.animBlobUrl}" height="100"/></a>`;
					elemBtnAction.toggleAttribute('disabled', false);
					elemBtnAction.style['pointer-events'] = 'auto';
					elemBtnAction.innerHTML = 'Download Animation';
					document.querySelector('#anim_cancel').innerHTML = 'Close';
				};
				// Start fetching async dependencies
				let pScriptDependencies = requireScriptDependencies(C.ScriptDependencies);
				try {
					let frames = await getFrames();
					await repeatLastFrame(frames);
					await pScriptDependencies; // Wait for async dependencies
					let animSrc = await createGif(frames);
					await showDownload(animSrc);
				}
				finally {
					// Revoke Object URLs for individual frames
					let frames = await Promise.all(this.asyncFrames);
					for(const frame of frames) URL.revokeObjectURL(frame);
					delete this.asyncFrames;
					frames = undefined;
				}
				this.status = 'completed';
			}
			catch (err) {
				console.error('Error in handleCreateReplayAnim:', err);
			}
		};
	// Dialog
		P.handleDialogAction = async function(event) {
			let elemActionBtn = document.querySelector('#anim_action');
			if(this.status === 'start') {
				this.createReplayAnim();
			}
			else if(this.status === 'completed') {
				let filename = await C.createAnimationFilename(getPuzzleId());
				downloadFile(this.animBlob, 'image/gif', filename);
			}
		};
		P.handleDialogCancel = function(event) {
			const {app: {puzzle}} = Framework;
			Framework.closeDialog();
			if(this.status === 'record') {
				puzzle.replayStop();
				if(typeof this.replayPlayAbort === 'function') {
					this.replayPlayAbort(new Error('Aborted'));
					delete this.replayPlayAbort;
					puzzle.replayPlay(this.currentReplay, {speed: -1});
					delete this.currentReplay;
				}
			}
			this.status = 'done';
			URL.revokeObjectURL(this.animBlobUrl);
			delete this.animBlob;
			delete this.animBlobUrl;
		};
		P.handleDialogButton = function(button) {
			if(['Close', 'Cancel'].includes(button)) this.handleDialogCancel();
			else if(['Abort'].includes(button)) {
				this.handleDialogCancel();
				this.handleOpenDialog();
			}
			else this.handleDialogAction();
		};
		P.handleWHChange = function(event) {
			const {width, height} = this.puzzleDims;
			let elem = event.target, val = parseInt(elem.value);
			if(isNaN(val)) val = 128;
			val = Math.min(1024, Math.max(0, val));
			let w, h;
			if(/w$/.test(elem.id)) {
				w = val;
				h = Math.round(w * height / width);
			}
			else {
				h = val;
				w = Math.round(h * width / height);
			}
			document.querySelector('#animdims_w').value = w;
			document.querySelector('#animdims_h').value = h;
			this.dialogPresets.width = w;
			this.dialogPresets.height = h;
		};
		P.handleDurationChange = function(event) {
			let 
				totalFrames = parseInt(document.querySelector('#animframes').value) || 1,
				repeatLastFrame = parseInt(document.querySelector('#animrepeatlastframe').value) || 1,
				frameDuration = parseInt(document.querySelector('#animframedelay').value) || 1,
				animDuration = (totalFrames + repeatLastFrame) * 0.1 * frameDuration;
			document.querySelector('#animduration').innerHTML = `${animDuration.toFixed(1)}s`;
			this.dialogPresets.totalFrames = totalFrames;
			this.dialogPresets.repeatLastFrame = repeatLastFrame;
			this.dialogPresets.frameDuration = frameDuration;
		};
		P.handleOpenDialog = function() {
			let replay = this.currentReplay = C.getReplay(),
					replayLength = Puzzle.replayLength(replay),
					{width, height} = this.puzzleDims = C.getPuzzleDims(),
					presets = this.dialogPresets;
			this.status = 'start';
			Framework.closeDialog();
			Framework.showDialog({
				parts: [
					{tag: 'title', innerHTML: 'Replay Animation', style: 'text-align: center'},
					{style: 'margin: 0.5rem 1rem;', children: [
						{style: 'margin: 0.25rem 0', children: [
							{tag: 'label', content: 'Number of replay actions:', style: 'margin: 0; display: inline;'},
							{tag: 'span', innerHTML: `<strong>${replay.actions.length}</strong>`, style: 'margin: 0.25rem;'}
						]},
						{style: 'margin: 0.25rem 0', children: [
							{tag: 'label', content: 'Puzzle dimensions:', style: 'margin: 0; display: inline;'},
							{tag: 'span', innerHTML: `<strong>${width} x ${height}</strong>`, style: 'margin: 0.25rem;'}
						]},
						{style: 'margin: 0.25rem 0', children: [
							{tag: 'label', content: 'Animation duration:', style: 'margin: 0; display: inline;'},
							{tag: 'span', id: 'animduration', style: 'margin: 0.25rem; font-weight: bold;'}
						]},
						{style: 'margin: 0.25rem 0', children: [
							{tag: 'label', content: 'Number of frames:', style: 'margin: 0; display: inline;'},
							{tag: 'input', type: 'number', value: presets.totalFrames, min: 2, max: 300, id: 'animframes', style: 'width: 4rem; text-align: right; margin: 0 0 0 1rem; border-style: solid;'}
						]},
						{style: 'margin: 0.25rem 0;', children: [
							{tag: 'label', content: 'Repeat last frame:', style: 'margin: 0; display: inline;'},
							{tag: 'input', type: 'number', value: presets.repeatLastFrame, min: 1, max: 100, id: 'animrepeatlastframe', style: 'width: 4rem; text-align: right; margin: 0 0 0 1rem; border-style: solid;'},
						]},
						{style: 'margin: 0.25rem 0;', children: [
							{tag: 'label', content: 'Frame duration (10 = 1sec):', style: 'margin: 0; display: inline;'},
							{tag: 'input', type: 'number', value: presets.frameDuration, min: 1, max: 20, id: 'animframedelay', style: 'width: 4rem; text-align: right; margin: 0 0 0 1rem; border-style: solid;'},
						]},
						{style: 'margin: 0.25rem 0;', children: [
							{tag: 'label', content: 'Dimensions:', style: 'margin: 0; display: inline;'},
							{tag: 'input', value: presets.width, min: 16, max: 1024, id: 'animdims_w', style: 'width: 3rem; text-align: right; margin: 0 1rem; border-style: solid;'},
							{tag: 'span', content: 'x'},
							{tag: 'input', value: presets.height, min: 16, max: 1024, id: 'animdims_h', style: 'width: 3rem; text-align: right; margin: 0 1rem; border-style: solid;'},
						]},
						{tag: 'label', content: 'Animation Preview:', style: 'margin: 0;'},
						{id: 'puzzle_anim_out', content: 'Ready...', style: 'min-height: 8rem; margin: 0.25rem 0; padding: 0.25rem; border: 1px solid #000;'},
					]},
					{tag: 'options', options: [
						{content: 'Create Animation', id: 'anim_action'},
						{content: 'Cancel', id: 'anim_cancel'}
					]},
				],
				autoClose: false,
				centerOverBoard: true,
				onButton: this.handleDialogButton,
				onCancel: this.handleDialogCancel,
			});
			document.querySelectorAll('#animdims_w, #animdims_h').forEach(elem => (
				elem.addEventListener('change', this.handleWHChange),
				elem.addEventListener('input', this.handleWHChange)
			));
			document.querySelectorAll('#animframes, #animrepeatlastframe, #animframedelay')
			.forEach(elem => (
				elem.addEventListener('change', this.handleDurationChange),
				elem.addEventListener('input', this.handleDurationChange)
			));
			this.handleDurationChange();
		};
	
	return C;
})();

FeatureReplayGif.create();