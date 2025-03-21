
const FeatureRuleAlert = (() => {
	function FeatureRuleAlert() {
		bindHandlers(this);
		this.featureEnabled = false;
	}
	const C = FeatureRuleAlert, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'rulealert';
	C.SettingName = C.Name;
	C.featureStyle = `
		#controls .rulealert {
			position: absolute;
			margin-top: -1.6rem;
			line-height: 1.6rem;
			font-weight: bold;
			font-size: 1.0rem;
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
	// Alerts
		P.handleUpdateAlerts = function() {
			let {app, app: {sourcePuzzle}} = Framework;
			if(sourcePuzzle === undefined) return;
			const rules = (sourcePuzzle.global || []);
			let alerts = [];
			if(rules.includes('antixv')) alerts.push('XV');
			if(rules.includes('antiknight')) alerts.push('♘');
			if(rules.includes('antiking')) alerts.push('♚');
			if(alerts.length > 0) {
				const controlsElem = document.querySelector('#controls');
				let alertElem = controlsElem.querySelector('.rulealert');
				if(alertElem === null) {
					controlsElem.insertAdjacentHTML('afterbegin', '<div class="rulealert"></div>');
					alertElem = controlsElem.querySelector('#controls .rulealert');
				}
				alertElem.innerHTML = `-🚨 ${alerts.join(' ')}`;
			}
		};
	// Setting
		P.attachElem = async function() {
			let {app} = Framework;
			app.puzzle.on('start', this.handleUpdateAlerts);
			app.puzzle.on('loaded', this.handleUpdateAlerts);
			app.puzzle.on('progressloaded', this.handleUpdateAlerts);
			this.handleUpdateAlerts();
		};
		P.detachElem = async function() {
			let alertElem = document.querySelector('#controls .rulealert');
			if(alertElem) alertElem.remove();
		};
		P.handleSettingChange = async function() {
			const setting = Framework.getSetting(C.SettingName);
			setting ? this.attachElem() : this.detachElem();
		};
		P.handleInit = async function() {
			Framework.addSetting({
				group: 'visual', name: C.SettingName,
				content: 'Constraint Alert',
				tag: 'toggle',
				onToggle: this.handleSettingChange,
			});
		};
	
	return C;
})();

FeatureRuleAlert.create();