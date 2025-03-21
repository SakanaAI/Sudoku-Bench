
const FeatureUserPlugins = (() => {
	// UserPlugin
		const UserPlugin = (() => {
			const reducePropDescriptor = (obj, [prop, value]) => Object.assign(obj, {[prop]: {value, writable: true, configurable: true}});
			function UserPlugin(name, src) {
				this.name = name;
				this.src = src;
				this.__userProps = (new Function('createUserProps', `return (${src})`))();
				Object.defineProperties(this, Object.entries(this.__userProps).reduce(reducePropDescriptor, {}));
				bindHandlers(this, this);
				PortableEvents.mixin(this);
			}
			const C = UserPlugin, P = Object.assign(C.prototype, {constructor: C});
			P.init = async function() {
				const proto = Object.getPrototypeOf(this);
				const props = [...Object.getOwnPropertyNames(proto), ...Object.keys(this.__userProps)];
				for await (const prop of props) {
					if('function' !== typeof this[prop] || !/^handleInit.*/.test(prop)) continue;
					await this[prop]();
				}
				if(this.styles) this.stylesheet = await attachStylesheet(this.styles);
			};
			P.remove = async function() {
			};
			P.toJSON = function() {
				let {name, src} = this;
				src = src.replace(/\s*\n\s*/g, '\n');
				return ({name, src});
			};
			return C;
		})();
	
	function FeatureUserPlugins() {
		bindHandlers(this);
		PortableEvents.mixin(this);
		this.featureEnabled = false;
		this.plugins = [];
	}
	const C = FeatureUserPlugins, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'userplugins';
	C.SettingName = C.Name;
	C.featureStyle = `
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
	// Plugins
		P.getPlugin = function(name) { return this.plugins.find(plugin => plugin.name === name); };
		P.addPlugin = async function(name, src, opts = {}) {
			const {skipInit = false, overwrite = false} = opts, {plugins} = this;
			if(this.getPlugin(name)) {
				if(overwrite) await this.removePlugin(name);
				else throw new Error(`Plugin "${name}" already exists`);
			}
			console.info('Adding plugin: "%s"', name);
			const plugin = new UserPlugin(name, src);
			plugins.push(plugin);
			if(!skipInit) await plugin.init();
			if(!this.skipSaving) await this.savePlugins();
			return plugin;
		};
		P.removePlugin = async function(name) {
			const {plugins} = this;
			let plugin = this.getPlugin(name);
			if(plugin === undefined) throw new Error(`Plugin "${name}" not found`);
			console.info('Removing plugin: "%s"', name);
			await plugin.remove();
			let idx = plugins.indexOf(plugin);
			plugins.splice(idx, 1);
			await this.savePlugins();
			return plugin;
		};
		P.loadPlugins = async function() {
			this.skipSaving = true;
			let data = Framework.getData(C.SettingName) || {};
			if(data.plugins && data.plugins.length > 0) {
				console.info('Loading %s plugins...', data.plugins.length);
				for(const {name, src} of data.plugins) await this.addPlugin(name, src);
			}
			this.skipSaving = false;
		};
		P.savePlugins = async function() {
			const {plugins} = this;
			Framework.setData(C.SettingName, {plugins});
		};
	// Testing
		C.DemoPlugin = `{
				settingName: 'UserSetting',
				handleInit: function(...args) {
					Framework.addSettings([
						{
							group: 'experimental', name: this.settingName, content: 'User Setting',
							tag: 'button', handler: this.handleUserSetting,
						},
					]);
				},
				handleUserSetting: function() {
					Framework.closeDialog();
					Framework.showAlert('This is a demo setting action.');
				},
			}
		`;
		C.SaveSettingsPlugin = `{
			SettingName: 'settingssaveplugin',
			applySetting: function(name, val) {
				Framework.setSetting(name, val);
				Framework.toggleSettingClass(name, val);
			},
			handleLoadFromFile: async function(file) {
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
					console.error('Error in SettingsSavePlugin.handleLoadFromFile:', err);
					return Framework.showAlert('Error loading data from file. Possibly invalid or corrupted.');
				}
			},
			handleExport: function() {
				let settingsJson = JSON.stringify(Framework.getSettings(), null, '	');
				let filename = 'SudokuPad_settings.json';
				downloadFile(settingsJson, 'application/json', filename);
			},
			handleImport: function() {
				loadFromFile(this.handleLoadFromFile, {accept: 'application/json'});
			},
			handleInit: async function() {
				Framework.addSettings([
					{
						group: 'UserPlugins', name: this.SettingName, content: 'Export Settings',
						tag: 'button', handler: this.handleExport,
					},
					{
						group: 'UserPlugins', name: this.SettingName, content: 'Import Settings',
						tag: 'button', handler: this.handleImport,
					}
				]);
			},
		}`;
		P.testPlugins = async function() {
			let pluginNames = this.plugins.map(p=>p.name);
			for(name of pluginNames) await this.removePlugin(name);
			await this.addPlugin('demoplugin', C.DemoPlugin);
			await this.addPlugin('savesettingsplugin', C.SaveSettingsPlugin);
		};
	// Feature
		P.handleInit = async function() {
			await this.loadPlugins();
			//await this.testPlugins();
		};
	
	return C;
})();

FeatureUserPlugins.create();