
const FeatureSudokupadPro = (() => {
	// Helpers
		const {svgToDataUri, puzzleToSvg, urlToImg, imgToCanvas, imgUriToBlob, blobToBlobUrl} = PuzzleTools;
		const {resolvePuzzleData} = PuzzleLoader;

	function FeatureSudokupadPro() {
		bindHandlers(this);
		this.featureEnabled = false;
	}
	const C = FeatureSudokupadPro, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'sudokupadpro';
	C.SettingName = C.Name;
	C.featureStyle = `
		.game > .supportlinks {
			position: absolute;
			top: 40px;
		}
		.game > .supportlinks .prefix { display: none; }
		.supportlinks.type1 {
			font-size: 1.5rem;
			line-height: 2rem;
			text-align: center;
			padding-bottom: 0.5rem;
		}
		.supportlinks.type2 {
			font-size: 1.5rem;
			line-height: 2rem;
			text-align: center;
			padding-bottom: 0.5rem;
		}
		.dialog .supportlinks { font-size: 1.3rem; }
	`;
	//style="font-size: 1.3rem; padding: 0px 1rem; text-align: center; margin: 0rem 0px;"
	C.SupportIcons = {
		patreon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 180 180" style="height: 2rem"><path fill="#f96753" d="M109 26a48 48 0 1 0 0 96 48 48 0 0 0 0-96"></path><path fill="#052a49" d="M23 154V26h24v128z"></path></svg>`,
	};
	C.SupportLinks = {
		'clover': {
			url: 'https://patreon.com/sudokuclover',
			className: 'type1',
			//prefix: 'Enjoy Puzzles?',
			linktext: `<span style="white-space:nowrap;">More from Clover</span> <span style="white-space:nowrap;">on Patreon <span class="icon" style="vertical-align: middle;">${C.SupportIcons['patreon']}</span></span>`,
		},
	};
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
	// Support Links
		P.getSupportLinkHtml = function(linkname) {
			console.info('FeatureSudokupadPro.getSupportLinkHtml("%s");', linkname);
			const {url, prefix, linktext, className} = C.SupportLinks[linkname];
			let html = `<div class="supportlinks${className ? ` ${className}` : ''}">${prefix ? `<div class="prefix">${prefix}</div>` : ''}<a href="${url}">${linktext}</a></div>`;
			return html;
		};
		P.updateSupportLinksControlsInfo = async function() {
			//console.warn('FeatureSudokupadPro.updateSupportLinks();');
			const infoEl = document.querySelector('.controls-info');
			let linksEl = document.querySelector('.game > .supportlinks');
			const linkname = 'clover';
			const html = () => this.getSupportLinkHtml(linkname);
			const {className} = C.SupportLinks[linkname];
			if(window.getComputedStyle(infoEl).display === 'none') {
				if(linksEl === null) {
					console.log('  ADD LINK board > portrait');
					document.querySelector('.game').insertAdjacentHTML('afterbegin', html());
					linksEl = document.querySelector('.game > .supportlinks');
				}
			}
			else {
				if(linksEl !== null) linksEl.remove();
				if(infoEl.querySelector('.supportlinks') === null) {;
					console.log('  ADD LINK board > landscape');
					switch(className) {
						case 'type1': infoEl.querySelector('.puzzle-rules').insertAdjacentHTML('afterbegin', html()); break;
						case 'type2': infoEl.insertAdjacentHTML('beforeend', html()); break;
					}
				}
			}
			let squash = linksEl !== null && bounds('#board').top < bounds(linksEl).bottom;
			if(squash) linksEl.remove();
		};
		P.updateSupportLinksDialog = async function() {
			//console.warn('FeatureSudokupadPro.updateSupportLinksDialog();');
			const dialogEl = await waitForSelector('.dialog', 10, 500),
						rulestextEl = dialogEl.querySelector('.rulestext'),
						supportlinksEl = dialogEl.querySelector('.supportlinks');
			const linkname = 'clover';
			const html = () => this.getSupportLinkHtml(linkname);
			const {className} = C.SupportLinks[linkname];
			console.log('rulestextEl:', rulestextEl);
			if(supportlinksEl === null) {
				if(rulestextEl !== null) {
					console.log('  Add LINK dialog > rulestext');
					switch(className) {
						case 'type1': rulestextEl.insertAdjacentHTML('afterend', html()); break;
						case 'type2': rulestextEl.insertAdjacentHTML('beforeend', html()); break;
					}
				}
			}
			else if(supportlinksEl !== null) {
				console.log('  Add LINK dialog > supportlinks');
				supportlinksEl.insertAdjacentHTML('afterend', html());
				supportlinksEl.remove();
			}
		};
	// Handlers
		P.handleUpdateSupportLinks = async function() {
			//console.info('FeatureSudokupadPro.handleUpdateSupportLinks();');
			const {app, app: {puzzle, sourcePuzzle, currentPuzzle}} = Framework;
			let hasControlsInfo = document.querySelector('.controls-info') !== null;
			let hasRulestext = document.querySelector('.dialog .rulestext') !== null;
			let hasSupportlinks = document.querySelector('.dialog .supportlinks') !== null;
			if(hasControlsInfo) await this.updateSupportLinksControlsInfo();
			if(hasRulestext || hasSupportlinks) await this.updateSupportLinksDialog();
		};
	// Setting
		P.handleInit = function() {
			//console.info('FeatureSudokupadPro.handleInit();');
			const {app, app: {puzzle}} = Framework;
			/*
			if(!/^\/test\//.test(document.location.pathname)) return;
			puzzle.on('start', this.handleUpdateSupportLinks);
			app.on('resize', this.handleUpdateSupportLinks);
			app.on('dialognoerrors', this.handleUpdateSupportLinks);
			Framework.on('showdialog', this.handleUpdateSupportLinks);
			*/
		};
	
	return C;
})();

FeatureSudokupadPro.create();