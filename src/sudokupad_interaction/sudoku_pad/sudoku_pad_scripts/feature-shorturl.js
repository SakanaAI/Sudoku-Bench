
const FeatureShortUrl = (() => {
	function FeatureShortUrl() {
		bindHandlers(this);
		PortableEvents.mixin(this);
		this.featureEnabled = false;
	}
	const C = FeatureShortUrl, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'shorturl';
	C.SettingName = C.Name;
	C.featureStyle = `
		.setting-outlinetest-outlinetestnone #arrows { filter: none; }
		.setting-outlinetest-outlinetesta #arrows { filter: url("#outlinetesta"); }
		.setting-outlinetest-outlinetesta #arrows { filter: url("#outlinetesta"); }
		.setting-outlinetest-outlinetestb #arrows { filter: url("#outlinetestb"); }
		.setting-outlinetest-outlinetestc #arrows { filter: url("#outlinetestc"); }
		.setting-outlinetest-outlinetestd #arrows { filter: url("#outlinetestd"); }
		.setting-outlinetest-outlineteste #arrows { filter: url("#outlineteste"); }
		.setting-outlinetest-outlinetestf #arrows { filter: url("#outlinetestf"); }
		.setting-outlinetest-outlinetestg #arrows { filter: url("#outlinetestg"); }
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
		<filter id="outlinetestc" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
			<feMorphology in="SourceGraphic" result="outline" operator="dilate" radius="1" />
			<feBlend in2="SourceGraphic" in="outline" mode="overlay" />
		</filter>
		<filter id="outlinetestd" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
			<feMorphology in="SourceGraphic" result="outline" operator="dilate" radius="1" />
			<feBlend in2="SourceGraphic" in="outline" mode="screen" />
		</filter>
		<filter id="outlineteste" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
			<feMorphology in="SourceGraphic" result="outline" operator="dilate" radius="1" />
			<feBlend in2="SourceGraphic" in="outline" mode="multiply" />
		</filter>
		<filter id="outlinetestf" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
			<feMorphology in="SourceGraphic" result="outline" operator="dilate" radius="1" />
			<feBlend in2="SourceGraphic" in="outline" mode="lighten" />
		</filter>
	`;
	C.btnCreateShortUrl = 'Create Short URL';
	C.btnOpenShortUrl = 'Open Short URL';
	// API
		C.create = async function() {
			const feature = new C();
			Framework.getApp().then(() => feature.addFeature());
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
	// Feature
		P.handleAppMenu = async function(event) {
			event.preventDefault();
			this.handleCreateShortUrlDialog();
		};
		P.handleInit = async function() {
			Framework.addSetting({
				group: 'importexport', name: C.SettingName,
				tag: 'button',
				content: 'Create Short URL',
				handler: this.handleCreateShortUrlDialog,
			});
			const appmenuElem = document.querySelector('#appmenuitems');
			if(appmenuElem) {
				appmenuElem.insertAdjacentHTML('beforeend',
					`<a class="mdc-list-item menu-link-shorturl" href="#" id="appmenu-shorturl">
						<div class="icon">${Framework.icons.link}</div>
						<span class="mdc-list-item-text">Create Short SudokuPad URL</span>
					</a>`
				);
				addHandler(appmenuElem.lastChild, 'click', this.handleAppMenu, {passive: false, capture: true});
			}
		};
		P.apiCreateShortId = async function(puzzleId) {
			puzzleId = await PuzzleLoader.fetchPuzzle(puzzleId);
			let url = '/admin/createlink';
			let opts = {
				method: 'post',
				'Content-Type': 'application/json',
				body: JSON.stringify({puzzle: puzzleId})
			};
			console.time('/admin/createlink');
			let res = await fetch(url, opts);
			console.timeEnd('/admin/createlink');
			if(res.status !== 200) throw (await res.json());
			return res.json();
		};
		P.getShorturlHtml = shorturl => `<a href="${shorturl}">${shorturl}</a><br/><br/>
			<a id="shorturl-clipboardcopy" style="cursor: pointer;" title="Copy to clipboard">
			Copy to clipboard <span style="vertical-align: middle;">${Framework.icons.copy}</span></a>`;
		P.createShortUrl = async function() {
			try {
				await sleep(0)();
				Framework.showDialog({
					parts: [
						{tag: 'title', innerHTML: 'Puzzle Short URL', style: 'text-align: center'},
						{tag: 'p', id: 'shorturl', innerHTML: 'Preparing...', style: 'text-align: center'},
						{tag: 'options', options: [
							{type: 'button', id: 'shorturl-openurl', disabled: 'disabled', content: C.btnOpenShortUrl},
							'Cancel'
						]},
					],
					autoClose: true,
					centerOverBoard: true,
					onButton: this.handleDialogButton,
				});
				let textShorturl = document.querySelector('#shorturl');
				let btnOpenUrl = document.querySelector('#shorturl-openurl');
				btnOpenUrl.toggleAttribute('disabled', true);
				try {
					let res = await this.apiCreateShortId(getPuzzleId());
					let shortid = res.shortid, shorturl = `${document.location.origin}/${shortid}`;
					btnOpenUrl.toggleAttribute('disabled', false);
					this.currentShortUrl = shorturl;
					textShorturl.innerHTML = P.getShorturlHtml(shorturl);
					let copyElem = document.querySelector('#shorturl-clipboardcopy');
					copyElem.addEventListener('click', event => {
						navigator.clipboard.writeText(shorturl);
						copyElem.innerHTML = copyElem.innerHTML.replace(/Copy to clipboard <span/, 'Copy to clipboard (copied) <span');
					});
				}
				catch(err) {
					// TODO: Handle server errors
					console.error('createShortUrl:', err);
					textShorturl.innerHTML = `<span class="emoji">⚠</span> <span style="color: #f80000">Error creating URL. Please try again later or contact Sven on Discord or email.</span> <span class="emoji">⚠</span>`;
				}
			}
			catch(err) {
				// TODO: Handle server errors
				console.error('createShortUrl:', err);
			}
		}
		P.openShortUrl = async function() {
			document.location = this.currentShortUrl;
		};
		P.handleDialogButton = async function(button) {
			if(button === C.btnCreateShortUrl) return this.createShortUrl();
			if(button === C.btnOpenShortUrl) return this.openShortUrl();
		};
		P.handleCreateShortUrlDialog = async function() {
			Framework.closeDialog();
			Framework.showDialog({
				parts: [
					{tag: 'title', innerHTML: 'Create Short URL', style: 'text-align: center'},
					{tag: 'options', options: [C.btnCreateShortUrl, 'Cancel']},
				],
				autoClose: true,
				centerOverBoard: true,
				onButton: this.handleDialogButton,
			});
		};
	
	return C;
})();

FeatureShortUrl.create();