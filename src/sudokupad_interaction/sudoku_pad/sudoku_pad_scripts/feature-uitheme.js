(() => {
	
	const FeatureUITheme = (() => {
		function FeatureUITheme() {
			bindHandlers(this);
			this.featureEnabled = false;
		}
		const C = FeatureUITheme, P = Object.assign(C.prototype, {constructor: C});
		C.SettingName = 'uitheme';
		C.featureStyle = `
			.setting-uitheme-monolight {
				--main-color: #333;
				--controls-button-bg: var(--main-color);
				--controls-button-hover-bg: var(--main-color);
				--inv-color: #eee;
				--bg-color: #eee;
				--dm-button-dark: var(--main-color);
			}
			.setting-uitheme-purple {
				--main-color: #6a1b9a;
				--controls-button-bg: var(--main-color);
				--controls-button-hover-bg: var(--main-color);
				--inv-color: #fff;
				--bg-color: #eee;
				--dm-button-dark: var(--main-color);
			}
			.setting-uitheme-orange {
				--main-color: #d55e00;
				--controls-button-bg: var(--main-color);
				--controls-button-hover-bg: var(--main-color);
				--inv-color: #fff;
				--bg-color: #eee;
				--dm-button-dark: var(--main-color);
			}
			.setting-uitheme-red {
				--main-color: #d41159;
				--controls-button-bg: var(--main-color);
				--controls-button-hover-bg: var(--main-color);
				--inv-color: #fff;
				--bg-color: #eee;
				--dm-button-dark: var(--main-color);
			}
			.setting-uitheme-green {
				--main-color: #006400;
				--controls-button-bg: var(--main-color);
				--controls-button-hover-bg: var(--main-color);
				--inv-color: #fff;
				--bg-color: #eee;
				--dm-button-dark: var(--main-color);
			}
			.setting-uitheme-blue {
				--main-color: #0172b2;
				--controls-button-bg: var(--main-color);
				--controls-button-hover-bg: var(--main-color);
				--inv-color: #fff;
				--bg-color: #eee;
				--dm-button-dark: var(--main-color);
			}
			.setting-uitheme-brown {
				--main-color: #bc6c25;
				--controls-button-bg: var(--main-color);
				--controls-button-hover-bg: var(--main-color);
				--inv-color: #fff;
				--bg-color: #eee;
				--dm-button-dark: var(--main-color);
			}
			button, button:hover, .button, .button:hover {
				position: relative;
				background: var(--bg-color);
			}
			button:hover, .button:hover { overflow: visible !important; }
			/*
			button:hover:after, .button:hover:after {
				display: block;
				position: absolute;
				left: -1px; top: -1px;
				width: calc(100% + 2px); height: calc(100% + 2px);
				content: "";
				background: var(--main-color);
				opacity: 0.1;
			}
			*/
			.page-menu .selected,
			.foot-menu,
			.topbar,
			.controls-input button, .controls-input button:hover,
			#controls button.selected, #controls button:hover.selected,
			#controls button.selectedperm, #controls button:hover.selectedperm
				{ background: var(--main-color); }
			.controls-input button:hover,
			#controls button:hover.selected,
			#controls button:hover.selectedperm
				{ filter: brightness(1.25); }
			.controls-input button:hover:before,
			#controls button:hover.selected:before,
			#controls button:hover.selectedperm:before
				{ filter: brightness(0.8); }
			.setting-item label,
			.page-menu a,
			.puzzlemenu a,
			.puzzlemenu svg,
			button, label.button
				{ color: var(--main-color); }
			.dialog button.dialog-primary {
				background: var(--main-color);
				color: var(--inv-color);
			}
			.setting-group > label {
				background-color: var(--main-color);
			}
		`;
		C.SettingDefault = 'purple';
		C.FeatureSettings = {
			purple: {label: 'Purple Theme'},
			red: {label: 'Red Theme'},
			green: {label: 'Green Theme'},
			blue: {label: 'Blue Theme'},
			orange: {label: 'Orange Theme'},
			brown: {label: 'Brown Theme'},
			monolight: {label: 'Monochrome Theme'},
		};
		P.handleInit = function() {
			let {app} = Framework;
			if(app === undefined) return;
			if(this.featureEnabled) return;
			this.featureEnabled = true;
			const isSettingValid = Object.keys(C.FeatureSettings).includes(Framework.getSetting(C.SettingName));
			if(!isSettingValid) {
				Framework.setSetting(C.SettingName, C.SettingDefault);
				Framework.toggleSettingClass(C.SettingName, C.SettingDefault);
			}
		};
		P.addFeature = async function() {
			Framework.addSetting({
				content: 'UI Theme', group: 'experimental', name: C.SettingName,
				init: this.handleInit,
				tag: 'multi',
				options: Object.entries(C.FeatureSettings).map(([value, {label: content}]) => ({value, content})),
				style: 'display: flex; gap: 0.5rem;',
			});
			this.featureStylesheet = await attachStylesheet(C.featureStyle);
		};
		P.removeFeature = function() {
			this.featureEnabled = false;
			this.featureStylesheet.remove();
		};
		return C;
	})();
	
	const featureUITheme = new FeatureUITheme();
	Framework.getApp().then(() => featureUITheme.addFeature());

})();