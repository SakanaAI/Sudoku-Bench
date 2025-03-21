
const FeatureLayout = (() => {
	// Helpers
		const getTransform = el => {
			const [scale, x, y] = (getComputedStyle(el).transform
				.match(/matrix\(\s*([^,]*)\s*,[^,]*,[^,]*,[^,]*,\s*([^,]*)\s*,\s*([^,]*)\s*\)/) || [])
				.slice(1).map(n => parseFloat(n))
				;
			return {x, y, scale};
		};
		const setTransform = (el, t) => {
			const rnd = (n, r = 3) => Math.round(Number(n) * 10**r) / 10**r;
			let parts = [];
			if(t.x !== undefined || t.y !== undefined) parts.push(`translate(${rnd(t.x)}px, ${rnd(t.y)}px)`);
			if(t.scale !== undefined) parts.push(`scale(${rnd(t.scale)})`);
			el.style.transform = parts.join(' ');
		};

	function FeatureLayout() {
		bindHandlers(this);
		PortableEvents.mixin(this);
		this.opts = {
			margin: 32,
			left: false, right: false, top: false, bottom: false
		};
		this.handlingResize = false;
	}
	const C = FeatureLayout, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'layout';
	C.SettingName = C.Name;
	C.featureStyle = `
		.layout-controlsflipped .controls-buttons > div {
			flex-direction: row-reverse;
		}
	`;
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
	// Layout Helpers
		P.getOrientation = function() {
			const gaEl = document.querySelector('.game'),
						gaBounds = bounds(gaEl);
			let orientation;
			if(gaBounds.width > gaBounds.height) {
				orientation = 'landscape';
			}
			else {
				orientation = 'portrait';
			}
			return orientation;
		};
	// Handlers
		P.handleResize = function() {
			const pinControlsToEdge = (opts) => {
				/*
				Object.assign(coEl.style, {
					outline: '10px dashed magenta',
					'outline-offset': '-10px',
					'z-index': 1000
				});
				*/
				const gaEl = document.querySelector('.game'),
							coEl = document.querySelector('#controls');
				let gaBounds = bounds(gaEl),
						coBounds = bounds(coEl),
						coT = getTransform(coEl);
				document.body.classList.toggle('layout-controlsflipped', false);
				if(opts.left) {
					coEl.style.left = 0;
					coT.x = opts.margin;
					document.body.classList.toggle('layout-controlsflipped', true);
				}
				else if(opts.right) {
					coEl.style.left = 0;
					coT.x = gaBounds.width - coBounds.width - opts.margin;
				}
				
				if(opts.top) {
					coEl.style.top = 0;
					coT.y = gaBounds.y + opts.margin;
				}
				else if(opts.bottom) {
					coEl.style.top = 0;
					coT.y = gaBounds.y + gaBounds.height - coBounds.height - opts.margin;
				}
				setTransform(coEl, coT);
			};
			let orientation = this.getOrientation();
			if(orientation === 'landscape') {
				pinControlsToEdge(this.opts);
			}
		};
	// Dialog
		P.handleOpenDialog = async function() {
			const {opts} = this;
			Framework.closeDialog();
			Framework.showDialog({
				parts: [
					{tag: 'title', innerHTML: 'Layout', style: 'text-align: center'},
					{tag: 'toggle', name: 'controls_left', content: 'Controls to left', value: opts.right},
					{tag: 'toggle', name: 'controls_right', content: 'Controls to right', value: opts.left},
					{tag: 'toggle', name: 'controls_top', content: 'Controls to top', value: opts.top},
					{tag: 'toggle', name: 'controls_bottom', content: 'Controls to bottom', value: opts.bottom},
					{tag: 'options', options: ['Close']},
				],
				//autoClose: false,
				centerOverBoard: true,
				//onButton: this.handleDialogButton,
				//onCancel: this.handleCloseDialog,
			});
			const handleChange = event => {
				const {app} = Framework, {opts} = this;
				let key = event.target.name.replace('controls_', '');
				opts[key] = event.target.checked;
				let enabled = Object.values(opts).some(item => item === true);
				if(enabled) this.attachElem();
				else this.detachElem();
				app.resize();
			};
			document.querySelectorAll('.dialog input.setting-toggle')
				.forEach(el => el.addEventListener('change', handleChange));
		};
	// Feature
		P.attachElem = function() {
			if(this.handlingResize) return;
			const {app} = Framework;
			app.on('resize', this.handleResize);
			app.resize();
			this.handlingResize = true;
		};
		P.detachElem = function() {
			if(!this.handlingResize) return;
			const {app} = Framework;
			app.off('resize', this.handleResize);
			document.body.classList.toggle('layout-controlsflipped', false);
			this.handlingResize = false;
		};
		P.handleInit = async function() {
			Framework.addSetting({
				group: 'experimental', name: C.SettingName,
				tag: 'button',
				content: 'Layout',
				handler: this.handleOpenDialog,
			});
		};
	
	return C;
})();

FeatureLayout.create();