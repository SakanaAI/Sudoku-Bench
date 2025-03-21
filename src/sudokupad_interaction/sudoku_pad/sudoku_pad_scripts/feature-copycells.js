
const FeatureCopyCells = (() => {
	
	function FeatureCopyCells() {
		bindHandlers(this);
		PortableEvents.mixin(this);
		this.featureEnabled = false;
	}
	const C = FeatureCopyCells, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'copycells';
	C.SettingName = C.Name;
	C.SettingNameSymbolBlank = `${C.SettingName}_symbol_blank`;
	C.featureStyle = ``;
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
		P.handleCopyCells = function() {
			const {app: {puzzle: {cells, selectedCells}}} = Framework;
			const SymbolBlank = Framework.getSetting(C.SettingNameSymbolBlank, '.');
			let digits = selectedCells.sort((a, b) => cells.indexOf(a) - cells.indexOf(b))
				.map(cell => cell.getVal() ?? SymbolBlank).join('');
			navigator.clipboard.writeText(digits);
			Framework.showAlert(`${JSON.stringify(digits)} (${digits.length} symbols) copied to clipboard!`);
		};
	// Feature
		P.attachElem = function() {
			if(this.featureEnabled) return;
			this.featureEnabled = true;
			Framework.addAppButton({
				name: C.Name, title: 'Copy Cells',
				content: `<div class="icon">${Framework.icons.copy}</div>Copy Cells`,
				onClick: this.handleCopyCells
			});
			Framework.app.refreshControls();
		};
		P.detachElem = function() {
			if(!this.featureEnabled) return;
			this.featureEnabled = false;
			Framework.removeControlButton(C.Name);
		};
		P.handleSettingChange = async function() {
			const setting = Framework.getSetting(C.SettingName);
			setting ? this.attachElem() : this.detachElem();
		};
		P.handleInit = async function() {
			Framework.addSetting({
				group: 'advanced', name: C.SettingName,
				content: 'Copy Cells Button',
				tag: 'toggle',
				onToggle: this.handleSettingChange,
			});
			Framework.addSetting({group: 'hidden', name: C.SettingNameSymbolBlank});
		};
	
	return C;
})();

FeatureCopyCells.create();