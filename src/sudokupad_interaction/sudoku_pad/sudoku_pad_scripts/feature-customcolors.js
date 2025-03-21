
const FeatureCustomColors = (() => {
	function FeatureCustomColors() {
		bindHandlers(this);
		this.featureEnabled = false;
	}
	const C = FeatureCustomColors, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'customcolors';
	C.SettingName = C.Name;
	C.featureStyle = `
		body {
			#cell-grids .cell-grid, #cell-grids .cage-box
				{ stroke: #ff3399; }
			#cell-givens .cell-given { fill: #ff3399; }
			/*
			#cell-pencilmarks .cell-pencilmark { fill: #000099; }
			#cell-candidates .cell-candidate { fill: #000099; }
			#cell-values .cell-value { fill: #000099; }
			*/
		}
	`;
	// API
		C.create = async function() {
			const feature = new C();
			Framework.getApp().then(() => feature.addFeature());
		};
		P.init = async function() {
			if(document.location.pathname.match(/^\/barbie\//)) {
				if(C.featureStyle) this.featureStylesheet = await attachStylesheet(C.featureStyle);
			}
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
		};
		P.removeFeature = async function() {
			this.featureEnabled = false;
			if(this.featureStylesheet) this.featureStylesheet.remove();
		};
	
	return C;
})();

FeatureCustomColors.create();