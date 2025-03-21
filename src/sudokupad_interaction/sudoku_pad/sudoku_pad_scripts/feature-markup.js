
const FeatureMarkup = (() => {
	function FeatureMarkup() {
		bindHandlers(this);
		PortableEvents.mixin(this);
	}
	const C = FeatureMarkup, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'markup';
	C.SettingName = C.Name;
	C.featureStyle = `
		.fabcan {
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
		}
	`;
	C.ScriptDependencies = ['/fabric-5.3.1.min.js'];
	C.BrushStyle = {color: 'red', width: 3};
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
	// Handlers
		P.handleBlockEvent = function(event) {
			event.preventDefault();
			event.stopPropagation();
		};
		P.handleResize = function(event) {
			const {clientWidth: width, clientHeight: height} = document.body,
						{fabcan} = this;
			fabcan.setDimensions({width, height});
		};
		P.handleKeydown = function(event) {
			if(event.code === 'KeyM') {
				addHandler(window, 'keyup', this.handleKeyup);
				this.startDraw();
			}
			if(this.fabcan.isDrawingMode && event.code === 'KeyC') {
				this.fabcan.clear();
			}
		};
		P.handleKeyup = function(event) {
			if(event.code === 'KeyM') {
				remHandler(window, 'keyup', this.handleKeyup);
				this.stopDraw();
			}
		};
	// Feature
		P.initFabric = async function() {
			await requireScriptDependencies(C.ScriptDependencies);
			if(this.fabcan === undefined) {
				this.fabcan = new fabric.Canvas(
					undefined,
					{isDrawingMode: false}
				);
				Object.assign(this.fabcan.freeDrawingBrush, C.BrushStyle);
			}
			if(this.contEl === undefined) {
				this.contEl = Object.assign(document.createElement('div'), {
					className: 'fabcan'
				});
				this.contEl.appendChild(this.fabcan.lowerCanvasEl.parentElement);
				this.contEl.style['pointer-events'] = 'none';
			}
			document.body.appendChild(this.contEl);
			addHandler(window, 'resize', this.handleResize);
			this.handleResize();
		};
		P.startDraw = async function() {
			const {fabcan, contEl} = this;
			if(fabcan.isDrawingMode) return;
			fabcan.isDrawingMode = true;
			contEl.style['pointer-events'] = '';
			addDownEventHandler(contEl, this.handleBlockEvent);
		};
		P.stopDraw = function() {
			const {fabcan, contEl} = this;
			if(!fabcan.isDrawingMode) return;
			fabcan.isDrawingMode = false;
			contEl.style['pointer-events'] = 'none';
			removeDownEventHandler(contEl, this.handleBlockEvent);
		};
		P.attachElem = async function() {
			if(this.featureEnabled) return;
			this.featureEnabled = true;
			await this.initFabric();
			addHandler(window, 'keydown', this.handleKeydown);
		};
		P.detachElem = function() {
			if(!this.featureEnabled) return;
			this.featureEnabled = false;
			remHandler(window, 'resize', this.handleResize);
			this.fabcan.clear();
			this.contEl.remove();
		};
		P.handleSettingChange = function() {
			let setting = Framework.getSetting(C.SettingName);
			setting ? this.attachElem() : this.detachElem();
		};
		P.handleInit = async function() {
			Framework.addSetting({
				group: 'experimental', name: C.SettingName, content: 'Test Markup (Press: "M")',
				tag: 'toggle',
				onToggle: this.handleSettingChange,
			});
		};
	
	return C;
})();

FeatureMarkup.create();