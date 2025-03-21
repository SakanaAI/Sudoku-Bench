
const FeatureScreenshot = (() => {
	// Helpers
		const {svgToDataUri, puzzleToSvg, urlToImg, imgToCanvas, imgUriToBlob, blobToBlobUrl, svgToDataUriBase64} = PuzzleTools;
		const {resolvePuzzleData} = PuzzleLoader;
		const ua = navigator.userAgent, isWebkit = ua.match(/Safari/i) && !ua.match(/Chrome/i);

	function FeatureScreenshot() {
		bindHandlers(this);
		this.featureEnabled = false;
		this.options = C.DefaultOptions;
	}
	const C = FeatureScreenshot, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'screenshot';
	C.SettingName = C.Name;
	C.featureStyle = `
		.screenshot-dialog .setting-item {
			margin: 0.25rem 0;
			height: 1.2rem;
		}
		.screenshot-dialog .setting-item label {
			color: var(--color-black);
			font-weight: inherit;
			font-size: inherit;
			margin: 0;
			float: left;
		}
		.screenshot-dialog input.setting-toggle {
			position: relative;
			margin-left: 1rem;
		}
		.screenshot-dialog input.setting-toggle::after {
			background-color: var(--color-black);
			position: relative;
			float: right;
		}
		.screenshot-dialog .dialog-options {
			flex-direction: row;
			flex-wrap: wrap;
			margin: 0 1rem;
		}
		.screenshot-dialog .dialog-options button {
			flex: 1 0 35%;
			min-width: auto;
		}
	`;
	C.DefaultOptions = {
		width: 512,
		height: 512,
		type: 'PNG',
		trim: false,
		blank: false,
		filename: 'sudokupad-<author>-<title>',
	};
	C.icons = {
		photopea: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 400 400"><path fill="#18a497" d="M65 0h269c36 0 65 29 65 65v269c0 36-29 65-65 65H106V226c0-65 51-118 115-118 39 0 70 32 70 71s-31 71-70 71c-12 0-23-11-23-24s11-24 23-24c13 0 24-10 24-23s-11-24-24-24c-38 0-69 32-69 71s31 71 69 71c64 0 116-53 116-118S285 61 221 61c-89 0-162 74-162 165v1l1 172c-34-3-60-31-60-65V65C0 29 29 0 65 0z"/></svg>`,
	};
	C.MaxDims = 4096;
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
	// Setting
		P.handleInit = function() {
			Framework.addSetting({
				group: 'importexport', name: C.SettingName,
				tag: 'button',
				content: 'Screenshot',
				handler: this.handleOpenDialog,
			});
		};
	// Helpers
		C.getPuzzleDims = function() {
			const {app: {svgRenderer}} = Framework, {width, height} = svgRenderer.getContentBounds();
			return {width: Math.ceil(width), height: Math.ceil(height)};
		};
	// Options
		P.loadOptions = function() {
			const {options} = this, savedOptions = Framework.getData(C.SettingName) || {};
			for(const [key, defaultVal] of Object.entries(C.DefaultOptions)) {
				let settingVal = savedOptions[key];
				if(settingVal === undefined) settingVal = defaultVal;
				options[key] = settingVal;
			}
			return options;
		};
		P.saveOptions = function() {
			Framework.setData(C.SettingName, this.options);
		};
		P.throttledSaveOptions = throttleFunc(P.saveOptions, 500, 1000);
		P.setOption = function(key, val) {
			const {options} = this,
						{width, height} = this.puzzleDims = C.getPuzzleDims();
			switch(key) {
				case 'width':
				case 'height':
					val = parseInt(val);
					if(isNaN(val)) return;
					val = Math.min(C.MaxDims, Math.max(1, val));
					options.width = Math.round(val * (key === 'width' ? 1 : width / height));
					options.height = Math.round(val * (key === 'height' ? 1 : height / width));
					break;
				case 'type':
				case 'trim':
				case 'blank':
				case 'filename':
					options[key] = val;
					break;
			}
			document.querySelector('#ssoption_width').value = options.width;
			document.querySelector('#ssoption_height').value = options.height;
			this.throttledSaveOptions();
		};
		P.getFilename = async function() {
			const {options} = this, puzzleId = getPuzzleId();
			const cleanStr = (str = '') => str.replace(/[^a-zA-Z0-9]/gm, ' ').replace(/^ *| *$/gm, '').replace(/ +/gm, '_');
			const {app} = Framework;
			let metadata = app.extractPuzzleMeta(await resolvePuzzleData(puzzleId));
			let author = cleanStr(metadata.author);
			let title = cleanStr(metadata.title || 'puzzle');
			let filename = options.filename
				.replace(/<author>/g, author || '')
				.replace(/<title>/g, title || '');
			return filename;
		};
	// Dialog
		P.convertTwemoji = async function(svg) {
			const svgEl = document.createElement('div');
			const resolveImage = async el => el.setAttribute('href', svgToDataUriBase64(await (await fetch(el.getAttribute('href'))).text()));
			svgEl.innerHTML = svg;
			const imageEls = [...svgEl.querySelectorAll('image.twemoji')];
			if(imageEls.length === 0) return svg;
			await Promise.all([...svgEl.querySelectorAll('image.twemoji')].map(resolveImage));
			return svgEl.innerHTML;
		};
		P.updateScreenshot = async function() {
			const {app, app: {puzzle}} = Framework;
			let {options: {width, height, type, trim, blank}} = this;
			const currOptions = JSON.stringify(this.options);
			if(this.__lastOptions === currOptions) return; // No updated needed;
			this.__lastOptions = currOptions;
			width = parseInt(width);
			height = parseInt(height);
			let replay;
			if(blank) {
				replay = Replay.decode(app.getReplay());
				await puzzle.replayPlay(replay, {speed: -1, playToTime: 0});
				puzzle.restartPuzzle();
			}
			let svg = await puzzleToSvg({width, height, trim});
			const reAllowedSettings = /^setting-(nogrid|dashedgrid)/;
			let settingsClassNames = [...document.querySelector('body').classList]
				.filter(name => reAllowedSettings.test(name))
				.join(' ');
			svg = svg.replace(/(<svg[^>]+class=".*)"/, `$1 ${settingsClassNames}"`);
			if(replay) {
				await puzzle.replayPlay(replay, {speed: -1});
				replay = undefined;
			}
			svg = await this.convertTwemoji(svg);
			let imgUri;
			switch(type) {
				case 'SVG': imgUri = svgToDataUriBase64(svg); break;
				//case 'PNG': imgUri = imgToCanvas(await urlToImg(svgToDataUriBase64(svg))).toDataURL('image/png'); break;
				case 'PNG':
					let tmpImg = await urlToImg(svgToDataUriBase64(svg));
					if(isWebkit) await sleep(300)();
					imgUri = imgToCanvas(tmpImg).toDataURL('image/png');
					break;
			}
			let previewImg = resolveSelector('#screenshot_preview')[0];
			previewImg.src = imgUri;
		};
		P.imageDownload = async function() {
			let previewImg = resolveSelector('#screenshot_preview')[0];
			let blob = await imgUriToBlob(previewImg.src);
			let ext = blob.type.match(/^image\/(svg|png)/)[1];
			let filename = await this.getFilename() + '.' + ext;
			downloadFile(blob, blob.type, filename);
			resolveSelector('#screenshot_log')[0].innerHTML = 'Downloaded...';
		};
		P.imageClipboard = async function() {
			let {options: {width, height, type, trim, blank}} = this;
			let previewImg = resolveSelector('#screenshot_preview')[0];
			let imgUri = previewImg.src;
			if(type === 'SVG') {
				let canvas = imgToCanvas(await urlToImg(previewImg.src));
				imgUri = canvas.toDataURL('image/png');
			}
			let blob = await imgUriToBlob(imgUri);
			await navigator.clipboard.write([new ClipboardItem({[blob.type]: blob})]);
			resolveSelector('#screenshot_log')[0].innerHTML = 'Copied...';
		};
		P.imageNewTab = async function() {
			let previewImg = resolveSelector('#screenshot_preview')[0];
			let blob = await imgUriToBlob(previewImg.src);
			let url = blobToBlobUrl(blob);
			window.open(url, '_blank');
		};
		P.imagePhotoPea = async function() {
			let previewImg = resolveSelector('#screenshot_preview')[0];
			let url = `https://www.photopea.com#${encodeURIComponent(JSON.stringify({files:[previewImg.src]}))}`;
			window.open(url, '_blank');
		};
		P.handleDialogButton = async function(button) {
			button = button.trim();
			switch(button) {
				case 'Close': this.handleCloseDialog(); break;
				case 'Download': await this.imageDownload(); break;
				case 'Clipboard': await this.imageClipboard(); break;
				case 'New Tab': this.imageNewTab(); break;
				case 'PhotoPea': this.imagePhotoPea(); break;
			}
		};
		P.handleOptionChange = async function(event) {
			const elem = event.target;
			this.setOption(elem.id.match(/.*_(.*)$/)[1], elem.type === 'checkbox' ? elem.checked : elem.value);
			await this.updateScreenshot();
		};
		P.handleOptionBlur = async function(event) {
			this.setOption();
		};
		P.handleCloseDialog = async function() {
			for(const elem of resolveSelector('[id^=ssoption_]')) {
				elem.removeEventListener('change', this.handleOptionChange);
				elem.removeEventListener('input', this.handleOptionChange);
				elem.removeEventListener('blur', this.handleOptionBlur);
			}
			Framework.closeDialog();
			delete this.__lastOptions;
		};
		P.handleOpenDialog = async function() {
			const options = this.options = this.loadOptions(),
						{width, height} = this.puzzleDims = C.getPuzzleDims();
			delete this.__lastOptions;
			Framework.closeDialog();
			Framework.showDialog({
				parts: [
					{tag: 'title', innerHTML: 'Screenshot', style: 'text-align: center'},
					{style: 'margin: 0.5rem 1rem;', children: [
						{style: 'margin: 0.25rem 0', children: [
							{tag: 'label', content: 'Puzzle dimensions:', style: 'margin: 0; display: inline;'},
							{tag: 'span', innerHTML: `<strong>${width} x ${height}</strong>`, style: 'margin: 0.25rem;'}
						]},
						{style: 'margin: 0.25rem 0;', children: [
							{tag: 'label', content: 'Dimensions:', style: 'margin: 0; display: inline;'},
							{tag: 'input', value: options.width, min: 16, max: 1024, id: 'ssoption_width', style: 'width: 3rem; text-align: right; margin: 0 1rem; border-style: solid;'},
							{tag: 'span', content: 'x'},
							{tag: 'input', value: options.height, min: 16, max: 1024, id: 'ssoption_height', style: 'width: 3rem; text-align: right; margin: 0 1rem; border-style: solid;'},
						]},
						{style: 'margin: 0.25rem 0;', children: [
							{tag: 'label', content: 'Image Type:', style: 'margin: 0; display: inline;'},
							{tag: 'select', value: options.type, id: 'ssoption_type', style: 'margin: 0 1rem;',
								children: ['PNG', 'SVG'].map(content => ({tag: 'option', content, selected: content === options.type}))}
						]},
						{tag: 'toggle', name: 'trim', content: 'Trim Whitespace', value: options.trim, id: 'ssoption_trim', style: 'color: auto;'},
						{tag: 'toggle', name: 'blank', content: 'Blank Puzzle', value: options.blank, id: 'ssoption_blank', style: 'color: auto;'},
						{style: 'margin: 0.25rem 0;', children: [
							{tag: 'label', content: 'Filename Template:', style: 'margin: 0;'},
							{tag: 'input', value: options.filename, id: 'ssoption_filename', style: 'width: calc(100% - 2rem); margin: 0 1rem;'},
						]},
						{style: 'margin: 0.25rem 0;', children: [
							{tag: 'label', content: 'Preview:', style: 'margin: 0;'},
							{style: 'margin: 0.25rem 0 0 0; height: 256px;', children: [
								{tag: 'img', id: 'screenshot_preview', style: 'display: block; width: auto; max-height: 100%; margin: 0.25rem auto; padding: 0.25rem; border: 1px solid #000;'},
							]},
						]},
						{id: 'screenshot_log'},
					]},
					{tag: 'options', options: [
						{innerHTML: `Download ${Framework.icons.download}`},
						{innerHTML: `Clipboard ${Framework.icons.copy}`},
						{innerHTML: `New Tab ${Framework.icons.opennew}`},
						{innerHTML: `PhotoPea ${C.icons.photopea}`},
						{content: 'Close'}
					]},
				],
				dialogClass: 'screenshot-dialog',
				autoClose: false,
				centerOverBoard: true,
				onButton: this.handleDialogButton,
				onCancel: this.handleCloseDialog,
			});
			for(const elem of resolveSelector('[id^=ssoption_]')) {
				elem.addEventListener('change', this.handleOptionChange);
				elem.addEventListener('input', this.handleOptionChange);
				elem.addEventListener('blur', this.handleOptionBlur);
			}
			this.setOption('width', options.width);
			await this.updateScreenshot();
		};
		
	return C;
})();

FeatureScreenshot.create();