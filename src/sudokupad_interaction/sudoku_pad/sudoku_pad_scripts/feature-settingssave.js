(() => {
	const FeatureSettingsSave = (() => {
		function FeatureSettingsSave() {
			bindHandlers(this);
		}
		const C = FeatureSettingsSave, P = Object.assign(C.prototype, {constructor: C});
		C.SettingName = 'settingssave';
		P.applySetting = function(name, val) {
			Framework.setSetting(name, val);
			Framework.toggleSettingClass(name, val);
		};
		P.handleLoadFromFile = async function(file) {
			try {
				let payload = JSON.parse((await readFile(file)).target.result);
				let settings = Framework.getSettings();
				// Remove extra settings
				Object.keys(settings)
					.filter(key => payload[key] === undefined)
					.forEach(name => this.applySetting(name, undefined));
				Object.entries(payload).forEach(([name, val]) => this.applySetting(name, val));
				Object.keys(settings).forEach(key => {
					if(settings[key] === undefined) delete settings[key];
				});
				Framework.closeDialog();
				Framework.showSettings();
			}
			catch (err) {
				console.error('Error in FeatureSettingsSave.handleLoadFromFile:', err);
				return Framework.showAlert('Error loading data from file. Possibly invalid or corrupted.');
			}
		};
		P.handleExport = function() {
			let settingsJson = JSON.stringify(Framework.getSettings(), null, '	');
			let filename = 'SudokuPad_settings.json';
			downloadFile(settingsJson, 'application/json', filename);
		};
		P.handleImport = function() {
			loadFromFile(this.handleLoadFromFile, {accept: 'application/json'});
		};
		P.addFeature = async function() {
			Framework.addSettings([
				{
					group: 'importexport', name: C.SettingName, content: 'Export Settings',
					tag: 'button', handler: this.handleExport,
				},
				{
					group: 'importexport', name: C.SettingName, content: 'Import Settings',
					tag: 'button', handler: this.handleImport,
				}
			]);
		};
		return C;
	})();
	
	const featureSettingsSave = new FeatureSettingsSave();
	Framework.getApp().then(() => featureSettingsSave.addFeature());
	return FeatureSettingsSave;
})();