var FeatureCellPaste = (() => {
	const FeatureCellPaste = (() => {
		function FeatureCellPaste() {
			bindHandlers(this);
			this.featureEnabled = false;
		}
		const C = FeatureCellPaste, P = Object.assign(C.prototype, {constructor: C});
		C.SettingName = 'cellpaste';
		C.SettingDefault = true;
		C.featureStyle = ``;
		C.CtrlKey = ['Control', 'Meta'];
		P.handleCopy = function() {
			const {app, app: {tool, prevTool, puzzle, puzzle: {selectedCells}}} = Framework;
			const {SmartSelectToolOrder} = Puzzle;
			const curTool = prevTool || tool, checkTools = [curTool, ...SmartSelectToolOrder[curTool]];
			const getCopyProps = (cells, tools) => {
				let copiedProps = {};
				for(let t = 0; t < tools.length; t++) {
					let tool = tools[t];
					for(let c = 0; c < cells.length; c++) {
						let cell = cells[c];
						if(!cell.propVisible(tool)) continue;
						let val = cell.propGet(tool);
						if(val === undefined || (Array.isArray(val) && val.length === 0)) continue;
						copiedProps[tool] = val;
						return copiedProps;
					}
				}
			}
			this.copiedProps = getCopyProps(selectedCells, checkTools);
		};
		P.handlePaste = function() {
			const {PropHiddenBy} = Cell, {ToolToAction} = Puzzle;
			const {app, app: {puzzle, puzzle: {selectedCells: cells}}} = Framework;
			const clearCellProps = (cells, props) => {
				let clearGroups = {}, cellsToClear = false;
				cells.forEach(cell => props.forEach(prop => {
					[prop, ...(PropHiddenBy[prop] || [])].forEach(clearProp => {
						if(clearProp === 'given') return;
						if(!cell.hasProp(clearProp)) return;
						clearGroups[clearProp] = clearGroups[clearProp] || [];
						clearGroups[clearProp].push(cell);
						cellsToClear = true;
					});
				}));
				if(cellsToClear) {
					let savedSelection = [...cells];
					Object.entries(clearGroups).forEach(([tool, cells]) => {
						app.deselect();
						app.select(cells);
						app.act({type: 'clear', arg: tool});
					});
					app.deselect();
					app.select(savedSelection);
				}
			};
			const pasteProps = (cells, props) => {
				props.forEach(([prop, vals]) => {
					if(vals === undefined) return;
					if(!Array.isArray(vals)) vals = [vals]
					vals.forEach(val => app.act({type: ToolToAction[prop], arg: val}));
				});
			};
			if(this.copiedProps) {
				app.act({type: 'groupstart'});
				clearCellProps(cells, Object.keys(this.copiedProps));
				let propsInVisOrder = Object.keys(PropHiddenBy).reverse().map(prop => [prop, this.copiedProps[prop]]);
				pasteProps(cells, propsInVisOrder);
				app.act({type: 'groupend'});
			}
		};
		P.handleKeydown = function() {
			const {code, key} = event;
			if(event.ctrlKey || event.metaKey) {
				if(code === 'KeyC') this.handleCopy();
				else if(code === 'KeyV') this.handlePaste();
			}
		};
		P.attachElem = async function() {
			if(this.featureEnabled) return;
			this.featureEnabled = true;
			addHandler(document, 'keydown', this.handleKeydown, {capture: true});
			this.featureStylesheet = await attachStylesheet(C.featureStyle);
		};
		P.detachElem = function() {
			if(!this.featureEnabled) return;
			this.featureEnabled = false;
			remHandler(document, 'keydown', this.handleKeydown, {capture: true});
		};
		P.handleChange = function() {
			const setting = Framework.getSetting(C.SettingName);
			setting ? this.attachElem() : this.detachElem();
		};
		P.handleInit = function() {
			let {app} = Framework;
			if(app === undefined) return;
			if(Framework.getSetting(C.SettingName) === undefined) {
				Framework.setSetting(C.SettingName, C.SettingDefault);
				Framework.toggleSettingClass(C.SettingName, C.SettingDefault);
			}
			this.handleChange();
		};
		P.addFeature = function() {
			Framework.addSetting({
				content: 'Cell Copy/Paste', group: 'experimental', name: C.SettingName,
				init: this.handleInit,
				tag: 'toggle',
				init: this.handleInit, onToggle: this.handleChange,
			});
		};
		P.removeFeature = function() {
			this.featureEnabled = false;
			this.featureStylesheet.remove();
			this.detachElem();
		};
		return C;
	})();
	
	const featureCellPaste = new FeatureCellPaste();
	Framework.getApp().then(() => featureCellPaste.addFeature());
	return FeatureCellPaste;
})();