(() => {
	
	const FeatureRowColLabels = (() => {
		
		function FeatureRowColLabels() {
			bindHandlers(this);
			this.featureStylesheet = undefined;
			this.featureEnabled = false;
			this.labelsElem;
			this.labelledPuzzle;
		}
		const C = FeatureRowColLabels, P = Object.assign(C.prototype, {constructor: C});
		C.SettingName = 'labelrowscols';
		C.LayerName = 'labels-rowcol';
		C.featureStyle = `
			#svgrenderer .rowcollabel { font-size: 0.9rem; }
			#svgrenderer .rowlabel { text-anchor: end; }
		`;
		P.renderLabels = function() {
			const {app: {puzzle, svgRenderer, currentPuzzle}} = Framework, svgElem = svgRenderer.getElem();
			if(this.labelsElem && (currentPuzzle === this.labelledPuzzle)) return;
			this.removeLabels();
			const overlayElem = svgElem.querySelector('#overlay');
			overlayElem.insertAdjacentHTML('afterend', `<g id="${C.LayerName}"></g>`);
			this.labelsElem = svgElem.querySelector(`#${C.LayerName}`);
			let [minRC, maxRC] = puzzle.getMinMaxRC();
			for(let r = minRC[0]; r <= maxRC[0]; r++) {
				svgRenderer.renderText({
					target: C.LayerName, class: 'rowcollabel rowlabel',
					center: [r + 0.5, -0.035], width: 1, height: 1,
					text: (r - minRC[0] + 1),
				});
			}
			for(let c = minRC[1]; c <= maxRC[1]; c++) {
				svgRenderer.renderText({
					target: C.LayerName, class: 'rowcollabel collabel',
					center: [-0.2, c + 0.5], width: 1, height: 1,
					//text: String.fromCharCode('A'.charCodeAt(0) + c),
					text: (c - minRC[1] + 1),
				});
			}
			this.labelledPuzzle = currentPuzzle;
		};
		P.removeLabels = function() {
			if(this.labelsElem === undefined) return;
			this.labelsElem.remove();
			delete this.labelsElem;
			delete this.labelledPuzzle;
		};
		P.handleLoad = function() {
			this.renderLabels();
		};
		P.attachElem = function() {
			let {app} = Framework;
			if(app === undefined) return;
			if(this.featureEnabled) return;
			this.featureEnabled = true;
			app.puzzle.on('progressloaded', this.handleLoad);
			this.renderLabels();
		};
		P.detachElem = function() {
			let {app} = Framework;
			if(app === undefined) return;
			if(!this.featureEnabled) return;
			this.featureEnabled = false;
			app.puzzle.off('progressloaded', this.handleLoad);
			this.removeLabels();
		};
		P.handleChange = function(...args) {
			const setting = Framework.getSetting(C.SettingName);
			setting ? this.attachElem() : this.detachElem();
		};
		P.handleInit = function() {
			this.handleChange();
		};
		P.addFeature = async function() {
			Framework.addSetting({
				group: 'visual', name: C.SettingName, content: 'Show Row/Col Labels',
				tag: 'toggle',
				init: this.handleInit,
				onToggle: this.handleChange
			});
			this.featureStylesheet = await attachStylesheet(C.featureStyle);
		};
		P.removeFeature = function() {
			this.featureStylesheet.remove();
		};
		return C;
	})();

	const featureRowColLabels = new FeatureRowColLabels();
	Framework.getApp().then(() => featureRowColLabels.addFeature());

})();