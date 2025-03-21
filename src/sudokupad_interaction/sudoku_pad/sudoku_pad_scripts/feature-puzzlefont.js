
const FeaturePuzzleFont = (() => {

	function FeaturePuzzleFont() {
		bindHandlers(this);
		PortableEvents.mixin(this);
		this.featureEnabled = false;
	}
	const C = FeaturePuzzleFont, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'puzzlefont';
	C.SettingName = C.Name;
	C.FontDefs = [
		{id: 'baublemonogram', name: 'Bauble Monogram', url: '/assets/fonts/Bauble_Monogram.ttf', y: -10, scale: 1.2, img: 'option_1.png'},
		{id: 'bonnet', name: 'Bonnet', url: '/assets/fonts/Bonnet__.ttf', y: 5, scale: 1.2, img: 'option_2.png'},
		{id: 'cartoonblocks', name: 'Cartoon Blocks', url: '/assets/fonts/CartoonBlocksChristmas-Regular.ttf', scale: 1.3, img: 'option_3.png'},
		{id: 'dickensianchristmas', name: 'Dickensian Christmas', url: '/assets/fonts/DickensianChristmas.ttf', y: -3, img: 'option_4.png'},
		{id: 'firstsnow', name: 'First Snow', url: '/assets/fonts/Firstsnow-nRYmg.ttf', scale: 1.5, img: 'option_5.png'},
		{id: 'christmastinsel', name: 'Christmas Tinsel', url: '/assets/fonts/PWChristmasTinsel.ttf', y: -5, scale: 1.25, img: 'option_6.png'},
		{id: 'christmasfont', name: 'Christmas Font', url: '/assets/fonts/PWChristmasfont.ttf', y: -5, img: 'option_7.png'},
		{id: 'happychristmas', name: 'Happy Christmas', url: '/assets/fonts/PWHappyChristmas.ttf', y: -5, scale: 1.1, img: 'option_8.png'},
		{id: 'rudolph', name: 'Rudolph', url: '/assets/fonts/Rudolph.otf', scale: 1.2, img: 'option_9.png'},
		{id: 'snowballs', name: 'Snowballs', url: '/assets/fonts/Snowballs.ttf', y: -5, scale: 1.4, img: 'option_10.png'},
		{id: 'stnichols', name: 'St. Nichols', url: '/assets/fonts/stnicholas.ttf', y: 5, scale: 1.1, img: 'option_11.png'},
		{id: 'xtree', name: 'X-Tree', url: '/assets/fonts/XTREE.TTF', y: 10, scale: 1.2, img: 'option_12.png'},
		{id: 'sevensegment', name: 'Seven Segment', url: '/assets/fonts/SevenSegment.ttf', y: 5, scale: 1.1, img: 'option_13.png'},
	];
	C.featureStyle = `
		.choosepuzzlefont .fontrow {
			display: flex;
			gap: 0.6rem;
			margin: 0 0.3rem;
		}
		.fontchoice {
			display: inline-block;
			padding: 0.2rem;
			width: calc(33% - 0.4rem);
		}
		.fontchoice img {
			display: block;
			width: 100%;
			height: 100%;
		}
		.choosepuzzlefont .fontchoice.selected {
			outline: 4px solid blue;
		}
		${C.FontDefs.map(({id, x, y, scale}, idx) => `
			.puzzlefont-${id} .board #svgrenderer .cell-given,
			.puzzlefont-${id} .board #svgrenderer .cell-value {
				font-family: puzzlefont-${id};
				transform: translate(${x ?? 0}px, ${y ?? 0}px);
				font-size: ${Math.round(48 * (scale ?? 1))}px;
			}
		`).join('\n')}
	`;
	C.rePuzzleFont = new RegExp(`\\bpuzzlefont-(${C.FontDefs.map(({id}) => id).join('|')})\\b`);
	C.htmlDefaultFontChoice = `<div class="fontchoice" style="display:block;font-size:125%;text-align:center;margin:0.3rem;padding:0.2rem;padding-right:calc(0.4rem + 2px);"><span style="display:inline-block;width:100%;padding:0.2rem;border:2px solid black;">Default Font</span></div>`;
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
	// Font
		P.selectFont = async function(fontid) {
			document.body.classList.remove(...C.FontDefs.map(({id}) => `puzzlefont-${id}`));
			let fontDef = C.FontDefs.find(({id}) => id === fontid);
			Framework.setSetting(C.SettingName, undefined);
			if(fontDef === undefined) return;
			let fontName = `puzzlefont-${fontDef.id}`;
			let fontFace = new FontFace(fontName, `url(${fontDef.url})`);
			document.fonts.add(fontFace);
			await fontFace.load();
			document.body.classList.add(fontName);
		};
	// Handlers
		P.handleDialogButton = async function(button) {
			if(button === 'Select Font') {
				let selectedEl = document.querySelector('.choosepuzzlefont .fontchoice.selected');
				let selectedFont = selectedEl?.dataset?.font;
				this.selectFont(selectedFont)
			}
		};
		P.getDialogHtml = () => `<div class="fontchoice" style="display:block;font-size:125%;text-align:center;margin:0.3rem;padding:0.2rem;padding-right:calc(0.4rem + 2px);"><span style="display:inline-block;width:100%;padding:0.2rem;border:2px solid black;">Default Font</span></div>${
			C.FontDefs
				.map(({id, img}, idx) => `
					${idx % 3 === 0 ?'<div class="fontrow">' : ''}
					<div class="fontchoice" data-font="${id}"><img src="/assets/fonts/${img}" width="128" height="128"></div>
					${(idx + 1) % 3 === 0 ?'</div>' : ''}
				`)
				.join('\n')
			}`;
		P.handleFontSelect = async function(event) {
			let selectedEl = null;
			if(typeof event === 'string') {
				selectedEl = document.querySelector(`.choosepuzzlefont .fontchoice[data-font="${event}"]`);
			}
			else {
				selectedEl = event?.target?.closest('.fontchoice') ?? document.querySelector('.choosepuzzlefont .fontchoice');
			}
			if(selectedEl !== null) {
				[...document.querySelectorAll('.choosepuzzlefont .fontchoice.selected')]
					.forEach(el => el.classList.remove('selected'));
				selectedEl.classList.add('selected');
			}
		};
		P.handleShowDialog = async function(event) {
			Framework.closeDialog();
			Framework.showDialog({
				parts: [
					{tag: 'title', innerHTML: 'Choose Puzzle Font'},
					{className: 'fontchoices', style: 'padding: 0.2rem', innerHTML: this.getDialogHtml()},
					{tag: 'options', options: ['Select Font', 'Cancel']},
				],
				onButton: this.handleDialogButton,
				centerOverBoard: true,
				dialogClass: 'choosepuzzlefont',
			});
			[...document.querySelectorAll('.dialog .fontchoice')]
				.forEach((el, idx) => el.addEventListener('click', this.handleFontSelect));
			let bodyClasses = document.body.classList.toString();
			this.handleFontSelect((bodyClasses.match(C.rePuzzleFont) || [])[1]);
		};
	// Feature
		P.handleSettingInit = async function() {
			const qs = new URLSearchParams(document.location.search);
			let qsPuzzlefont = qs.get('puzzlefont');
			if(C.FontDefs.find(({id}) => id === qsPuzzlefont)) {
				this.selectFont(qsPuzzlefont);
				return;
			}
			let qsDigitfont = qs.get('digitfont');
			if(C.FontDefs[qsDigitfont] !== undefined) {
				this.selectFont(C.FontDefs[qsDigitfont].id);
				return;
			}
			let storedFont = Framework.getSetting(C.SettingName);
			this.selectFont(storedFont);
		};
		P.handleInit = async function() {
			Framework.addSetting({
				group: 'experimental', name: C.SettingName, content: 'Custom Puzzle Font',
				tag: 'button',
				handler: this.handleShowDialog,
				init: this.handleSettingInit,
			});
		};
		
	return C;
})();

FeaturePuzzleFont.create();