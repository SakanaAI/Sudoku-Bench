(() => {
	
	const FeatureCompactMarks = (() => {
		function FeatureCompactMarks() {
			bindHandlers(this);
			this.featureEnabled = false;
		}
		const C = FeatureCompactMarks, P = Object.assign(C.prototype, {constructor: C});
		C.SettingName = 'compactmarks';
		C.RangeMinSize = 5;
		P.handleRenderPropCandidates = function(cell, vals) {
			const prop = 'candidates', {renderedValues, givenCentremarks = []} = cell;
			let val = vals[prop], ranges = cell[prop];
			if(val !== '') {
				let cands = cell[prop], rStart = 0, rLen = 1, i, len = cands.length;
				ranges = [];
				for(i = 1; i < len; i++) {
					if(parseInt(cands[rStart]) + rLen === parseInt(cands[i])) {
						rLen++;
					}
					else {
						if(rLen >= C.RangeMinSize) ranges.push(`${cands[rStart]}-${parseInt(cands[rStart]) + rLen - 1}`);
						else for(let j = rStart; j < i; j++) ranges.push(cands[j]);
						rStart = i;
						rLen = 1;
					}
				}
				if(rLen >= C.RangeMinSize) ranges.push(`${cands[rStart]}-${parseInt(cands[rStart]) + rLen - 1}`);
				else for(let j = rStart; j < i; j++) ranges.push(cands[j]);
				val = ranges.join('');
			}
			const rule_zeroisten = cell.getZeroIsTen();
			let key = 'cell-candidate', elem = cell.getChildElem(key);
			if(val === '') cell.clearChildElem(key);
			else {
				const valToTspan = val => {
					let isGiven = givenCentremarks.includes(String(val));
					let valText = rule_zeroisten ? String(val).replace('0', '10') : val;
					return `<tspan data-val="${val}"${isGiven ? ' class="given"' : ''}>${valText}</tspan>`;
				};
				elem.innerHTML = (ranges || cell[prop]).slice(0, 9).map(valToTspan).join('');
			}
			elem.dataset['count'] = elem.textContent.length;
			renderedValues[prop] = val;
		};
		P.handleKeydown = function(event) {
			const {reDigit} = App, {app, app: {tool}} = Framework;
			let digit = parseInt((event.code.match(reDigit) || [])[1]), isDigit = !isNaN(digit);
			if(this.inputRangeStart === undefined && tool === 'centre' && isDigit) {
				this.inputRangeStart = digit;
			}
			else if(this.inputRangeStart !== undefined && tool === 'centre' && event.key === '-') {
				this.inputRangeContinue = true;
			}
			else if(this.inputRangeStart !== undefined && this.inputRangeContinue && tool === 'centre' && isDigit) {
				let inputRangeEnd = digit;
				if(inputRangeEnd > this.inputRangeStart) {
					for(let d = this.inputRangeStart + 1; d < inputRangeEnd; d++) app.doPressDigit(d);
				}
				this.inputRangeStart = this.inputRangeContinue = undefined;
			}
			else if(this.inputRangeStart !== undefined) {
				this.inputRangeStart = this.inputRangeContinue = undefined;
			}
		};
		P.attachElem = function() {
			let {app} = Framework;
			if(app === undefined) return;
			if(this.featureEnabled) return;
			this.featureEnabled = true;
			addHandler(document, 'keydown', this.handleKeydown, {capture: true});
			this.__org_renderPropCandidates = Cell.prototype.renderPropCandidates;
			const handleRenderPropCandidates = this.handleRenderPropCandidates;
			Cell.prototype.renderPropCandidates = function(...args) {
				return handleRenderPropCandidates(this, ...args);
			};
			app.renderCells(true);
		};
		P.detachElem = function() {
			let {app} = Framework;
			if(app === undefined) return;
			if(!this.featureEnabled) return;
			this.featureEnabled = false;
			remHandler(document, 'keydown', this.handleKeydown, {capture: true});
			Cell.prototype.renderPropCandidates = this.__org_renderPropCandidates;
			delete this.__org_renderPropCandidates;
			app.renderCells(true);
		};
		P.handleInit = function() {
			let {app} = Framework;
			if(app === undefined) return;
			this.handleChange();
		};
		P.handleChange = function() {
			const setting = Framework.getSetting(C.SettingName);
			setting ? this.attachElem() : this.detachElem();
		};
		P.addFeature = function() {
			Framework.addSetting({
				group: 'experimental', name: C.SettingName, content: 'Compact Pencilmarks',
				tag: 'toggle',
				init: this.handleInit, onToggle: this.handleChange,
			});
		};
		return C;
	})();

	const featureCompactMarks = new FeatureCompactMarks();
	Framework.getApp().then(() => featureCompactMarks.addFeature());

})();