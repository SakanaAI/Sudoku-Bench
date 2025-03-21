
const FeatureEmoji = (() => {
	// Helpers
	const stripHTML = html => {
		let doc = new DOMParser().parseFromString(html, 'text/html');
		return (doc && doc.body && doc.body.textContent) || '';
	};
	const isPuzzleReady = function() {
		const {app: {puzzle: {puzzleId, replayPlaying, replayStack = []}, timer: {running}}} = Framework;
		return undefined !== puzzleId && !replayPlaying;// && (running || replayStack.length > 0);
	};

	function FeatureEmoji() {
		bindHandlers(this);
		PortableEvents.mixin(this);
		this.featureEnabled = false;
		this.backupHtml = [];
		this.backupSvg = [];
		this.parsedPuzzleId = undefined;
	}
	const C = FeatureEmoji, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'emoji';
	C.SettingName = 'disableemoji';
	C.emojiClassName = 'emojireplacement';
	C.featureStyle = `
		img.emojireplacement {
			height: 1em; width: 1em; margin: 0 .05em 0 .1em; vertical-align: -0.1em;
		}
		image.twemoji {
			transform-box: fill-box;
			transform-origin: center;
		}
	`;
	C.ScriptDependencies = ['./assets/twemoji/twemoji.min.js'];
	C.emojiSelHtml = '.puzzle-title, .puzzle-author, .puzzle-rules';
	C.emojiSelSvg = '#svgrenderer text:not(:empty)';
	C.emojiSelSvgRestore = '#svgrenderer text:not(:empty), #svgrenderer image.twemoji';
	//'#overlay,underlay,cages'
	C.twemojiOpts = {ext: '.svg', folder: 'svg', className: C.emojiClassName, base: './assets/twemoji/'};
	C.UnicodeSubstitutions = {
		'🠀🠄🠈🠐🠔🠘🠜🠠🠤🠨🠬🠰🠴🠸🠼🡀🡄🡐🡠🡨🡰🡸🢀🢢🢦🢪🢠🢤🢨🢐🢔🢘': '←',
		'🠂🠆🠊🠒🠖🠚🠞🠢🠦🠪🠮🠲🠶🠺🠾🡂🡆🡒🡢🡪🡲🡺🢂🢣🢧🢫🢡🢥🢩🢒🢖🢚': '→',
		'🠁🠅🠉🠑🠕🠙🠝🠡🠥🠩🠭🠱🠵🠹🠽🡁🡅🡑🡡🡩🡱🡹🢁🢑🢕🢙': '↑',
		'🠃🠇🠋🠓🠗🠛🠟🠣🠧🠫🠯🠳🠷🠻🠿🡃🡇🡓🡣🡫🡳🡻🢃🢓🢗🢛': '↓',
		'🡖🡦🡮🡶🡾🢆': '↘',
		'🡗🡧🡯🡷🡿🢇': '↙',
		'🡔🡤🡬🡴🡼🢄': '↖',
		'🡕🡥🡭🡵🡽🢅': '↗',
	};
	C.AlwaysSupported = `0123456789ABCDEFGHIJKLMaAbBcCdDeEfFgGhHiIjJkKlLmMnNoOpPqQrRsStTuUvVwWxXyYzZ`
		+ Object.values(FeatureEmoji.UnicodeSubstitutions);
/*
TODO: Better handle colored emoji characters
['\u2660', '\u2665', '\u2666', '\u2663']
['♠', '♥', '♦', '♣']
['\u2664', '\u2661', '\u2662', '\u2667']
['♤', '♡', '♢', '♧']
filter: invert(42%) sepia(93%) saturate(1352%) hue-rotate(87deg) brightness(119%) contrast(119%);
filter: drop-shadow(60px 0px red) opacity();"
filter: drop-shadow(5px 0px red);background-position: -100% 0;"
*/
	C.ctxToRefString = ctx => JSON.stringify(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height).data);
	// API
		C.create = async function() {
			const feature = new C();
			Framework.withApp(() => feature.addFeature());
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
		};
		P.addFeature = async function() {
			this.init();
			if(typeof this.handleInit === 'function') this.handleInit();
		};
		P.removeFeature = async function() {
			this.featureEnabled = false;
			if(this.featureStylesheet) this.featureStylesheet.remove();
		};
	// Emoji
		P.isCharSupported = function(text) {
			if(C.AlwaysSupported.includes(text)) return true;
			let {testCanvas: canvas, testCtx: ctx, testCanvas: {width = 20, height = 20} = {}} = this;
			if(!canvas) {
				canvas = this.testCanvas = Object.assign(document.createElement('canvas'), {width, height});
				ctx = this.testCtx = canvas.getContext('2d', {willReadFrequently: true});
				ctx.fillStyle = '#000';
				ctx.font = '25px sans';
				ctx.fillText('\uFFFF', 0, height);
				this.refData = C.ctxToRefString(ctx);
			}
			ctx.clearRect(0, 0,  width, height);
			ctx.fillText(text, 0, height);
			return this.refData !== C.ctxToRefString(ctx);
		};
		P.getCharSubstitution = function(text) {
			return (Object.entries(C.UnicodeSubstitutions).find(([key, val]) => key.includes(text)) || [])[1];
		};
		P.isEmoji = function(text) {
			if(text.length === 0) return false;
			if(C.AlwaysSupported.includes(text)) return false;
			let html = twemoji.parse(text, C.twemojiOpts);
			if((html.match(/<img class="emojireplacement"/g) || []).length !== 1) return false;
			return stripHTML(twemoji.parse(text, C.twemojiOpts)).length === 0;
		};
		P.getSvgTransformScale = function(el) {
			const reScale = /scale\(\s*([0-9.]*)/, transform = (el.style.transform || el.getAttribute('transform') || '');
			return parseFloat((transform.match(reScale) || [])[1]) || 0;
		};
		P.getSvgTransformRotate = function(el) {
			const reRotate = /rotate\(\s*([0-9.]*)/, transform = (el.style.transform || el.getAttribute('transform') || '');
			return parseFloat((transform.match(reRotate) || [])[1]) || 0;
		};
		P.getSvgRelativeBounds = function(node) {
			const {app: {svgRenderer}} = Framework,
						boardEl = document.querySelector('.board'),
						svgEl = svgRenderer.getElem(),
						scale = this.getSvgTransformScale(boardEl),
						svgRect = svgEl.getBoundingClientRect(),
						viewBox = svgEl.getAttribute('viewBox').split(' ').map(val => parseFloat(val)),
						left = svgRect.left - viewBox[0] * scale,
						top = svgRect.top - viewBox[1] * scale,
						savedTransform = node.getAttribute('transform');
			if(typeof savedTransform === 'string') node.setAttribute('transform', savedTransform.replace(/rotate\s*\([^)]*\)/, 'rotate(0)'));
			const bb = node.getBoundingClientRect();
			if(typeof savedTransform === 'string') node.setAttribute('transform', savedTransform);
			bb.x = bb.x - left;
			bb.y = bb.y - top;
			for(const key of ['x', 'y', 'width', 'height']) bb[key] /= scale;
			return bb;
		};
		P.replaceTextSvg = function(el) {
			const {app: {svgRenderer}} = Framework;
			/// Check for single emoji symbol
			let text = el.innerHTML.trim();
			if(!this.isEmoji(text)) {
				if(this.isCharSupported(text)) return;
				let subst = this.getCharSubstitution(text);
				if(subst) {
					el.innerHTML = subst;
				}
				else {
					console.warn('Character %s not supported by device.', JSON.stringify(text));
				}
				return;
			}
			if(!this.isEmoji(text)) return;
			let replacementHtml = twemoji.parse(text, C.twemojiOpts)
				.replace(/^<img/, `<image class="twemoji"`)
				.replace(` src="`, ` href="`)
				.replace(` draggable="false"`, ``);
			el.insertAdjacentHTML('afterend', replacementHtml);
			const bb = this.getSvgRelativeBounds(el),
						next = el.nextSibling;
			for(const key of ['x', 'y', 'width', 'height'])
				next.setAttribute(key, +bb[key].toFixed(3));
			for(const key of ['opacity', 'transform'])
				if(el.hasAttribute(key)) next.setAttribute(key, el.getAttribute(key));
			//for(const key of ['fill']) if(el.style.fill) next.style.fill = el.style.fill;
			el.remove();
		};
		P.handleRestorePuzzle = function() {
			const {parsedPuzzleId, backupHtml, backupSvg} = this;
			if(parsedPuzzleId === Framework.app.puzzle.puzzleId) {
				for(const [idx, el] of resolveSelector(C.emojiSelHtml).entries()) {
					if(undefined !== backupHtml[idx]) el.innerHTML = backupHtml[idx];
				}
				for(const [idx, el] of resolveSelector(C.emojiSelSvgRestore).entries()) {
					if(undefined !== backupSvg[idx]) {
						el.insertAdjacentHTML('beforebegin', backupSvg[idx]);
						el.remove();
					}
				}
			}
			backupHtml.length = 0;
			backupSvg.length = 0;
			this.parsedPuzzleId = undefined;
			return backupSvg;
		};
		P.handleParsePuzzle = async function() {
			if(!isPuzzleReady()) return;
			const {backupHtml, backupSvg} = this;
			this.handleRestorePuzzle();
			for(const el of resolveSelector(C.emojiSelHtml)) {
				backupHtml.push(el.innerHTML);
				twemoji.parse(el, C.twemojiOpts);
			}
			for(const el of resolveSelector(C.emojiSelSvg)) {
				backupSvg.push(el.outerHTML);
				this.replaceTextSvg(el);
			}
			this.parsedPuzzleId = Framework.app.puzzle.puzzleId;
		};
	// Setting
		P.attachElem = async function() {
			const {app, app: {puzzle}} = Framework;
			await requireScriptDependencies(C.ScriptDependencies);
			this.handleParsePuzzle();
			puzzle.on('start', this.handleParsePuzzle);
		};
		P.detachElem = async function() {
			const {app, app: {puzzle}} = Framework;
			this.handleRestorePuzzle();
			puzzle.off('start', this.handleParsePuzzle);
		};
		P.handleSettingChange = async function() {
			const setting = Framework.getSetting(C.SettingName);
			setting ? this.detachElem() : this.attachElem();
		};
		P.handleInit = async function() {
			Framework.addSetting({
				group: 'visual',
				name: C.SettingName,
				content: 'Disable Emoji Replacement',
				tag: 'toggle',
				onToggle: this.handleSettingChange,
			});
		};

	return C;
})();

FeatureEmoji.create();
