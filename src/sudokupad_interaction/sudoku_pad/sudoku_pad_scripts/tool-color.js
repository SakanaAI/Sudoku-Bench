
const ToolColor_tool = (() => {
	function ToolColor() {
		bindHandlers(this);
		this.name = 'colour';
		this.isEnabled = false;
		this.isTool = true;
		this.actionLong = 'colour';
		this.actionShort = 'co';
		this.palette = undefined;
		this.currentPage = undefined;
		this.btnPalette = undefined;
		this.editMode = false;
	}
	const C = ToolColor, P = Object.assign(C.prototype, {constructor: C});
	C.DefaultPalette = {
		//id: 'sudokupad_default',
		//name: 'SudokuPad Default',
		colors: {
			'0': 'transparent',
			'1': 'rgb(214, 214, 214)',
			'2': 'rgb(124, 124, 124)',
			'3': 'rgb(-36, -36, -36)',
			'4': 'rgb(179, 229, 106)',
			'5': 'rgb(232, 124, 241)',
			'6': 'rgb(228, 150, 50)',
			'7': 'rgb(245, 58, 55)',
			'8': 'rgb(252, 235, 63)',
			'9': 'rgb(61, 153, 245)',
			'a': 'transparent',
			'b': 'rgb(204, 51, 17)',
			'c': 'rgb(17, 119, 51)',
			'd': 'rgb(0, 68, 196)',
			'e': 'rgb(238, 153, 170)',
			'f': 'rgb(255, 255, 25)',
			'g': 'rgb(240, 70, 240)',
			'h': 'rgb(160, 90, 30)',
			'i': 'rgb(51, 187, 238)',
			'j': 'rgb(145, 30, 180)',
			'k': 'transparent',
			'l': 'rgb(245, 58, 55)',
			'm': 'rgb(76, 175, 80)',
			'n': 'rgb(61, 153, 245)',
			'o': 'rgb(249, 136, 134)',
			'p': 'rgb(149, 208, 151)',
			'q': 'rgb(158, 204, 250)',
			'r': 'rgb(170, 12, 9)',
			's': 'rgb(47, 106, 49)',
			't': 'rgb(9, 89, 170)',
		},
		pages: [
			['0','1','2','3','4','5','6','7','8','9'],
			['a','b','c','d','e','f','g','h','i','j'],
			['k','l','m','n','o','p','q','r','s','t'],
		],
	};
	C.HoldToEditDelayMs = 1000;
	// Helpers
		const rgb2hex = C.rgb2hex = c => `#${c.match(/\d+/g).map(x => (+x).toString(16).padStart(2, 0)).join('')}`;
		const hex2rgb = C.hex2rgb = c => `rgb(${c.match(/([0-9a-f]{2})/g).map(h => parseInt(h, 16)).join(', ')})`;
		const getCssVar = C.getCssVar = name => window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
		const setCssVar = C.setCssVar = (name, val) => document.documentElement.style.setProperty(name, val);
		C.getColorPaths = colors => {
			const {svgRenderer} = Framework.app;
			return colors.map((color, i, arr) => {
				let cnt = arr.length;
				let a1 = 25 + i * (360 / cnt), a2 = 25 + (i + 1) * (360 / cnt);
				//let elem = svgRenderer.renderCellWedge({target: 'background', center: [0.5, 0.5], a1, a2, color});
				let elem = svgRenderer.renderCellWedge({target: 'background', center: [0.5, 0.5], a1, a2, class: `color-${color}`});
				elem.remove();
				return elem;
			});
		};
		P.isCurrentTool = function() {
			return Framework.app.tool === this.name;
		};
	// Setup
		P.createPaletteIcon = function(colorVals, pageNumber, pageCount) {
			//console.info('ToolColor.createPaletteIcon(colorVals, pageNumber, pageCount);', pageNumber, pageCount);
			const {colors} = this.palette;
			let colorPaths = C.getColorPaths(colorVals);
			return `<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 64 64">
				<g stroke="#0003" stroke-width=".3" clip-path="inset(0.5rem 0.5rem 0.5rem 0.5rem round 0rem)">
					${colorPaths.map(path => path.outerHTML).join('')}
				</g>
				<g stroke="var(--controls-button-text)" fill="var(--controls-button-text)" stroke-width="1px">
					${[...new Array(pageCount)].map((_, i) => `<circle cx="${54 - 8 * (pageCount - i - 1)}" cy="10" r="3" ${i === pageNumber ? '' : 'fill="none"'}/>`).join('')}
				</g>
			</svg>`;
		}
		P.removePaletteButton = function() {
			//console.warn('ToolColor.removePaletteButton();', this.btnPalette);
			if(this.btnPalette === undefined) return;
			this.btnPalette.remove();
			this.btnPalette = undefined;
		};
		P.createPaletteButton = function() {
			//console.warn('ToolColor.createPaletteButton();', this.btnPalette);
			if(!this.isCurrentTool()) return;
			if(this.btnPalette !== undefined) this.removePaletteButton();
			const btnDelete = document.querySelector('button[data-control="delete"]');
			if(btnDelete === null) throw new Error('ToolColor > Unable to create palette button. No delete button found.');
			const btnPalette = this.btnPalette = Framework.createElem({
				tag: 'button',
				dataset: {control: 'selectpalette'},
				class: 'palettebutton',
				handler: this.handlePaletteToggle,
			});
			// TODO: Consider if we should even have this
			btnPalette.addEventListener('wheel', this.handleMousewheel);
			btnDelete.parentNode.insertBefore(btnPalette, btnDelete);
		};
		P.updatePaletteButton = function() {
			//console.warn('ToolColor.updatePaletteButton();');
			if(!this.isCurrentTool()) return;
			const {palette, currentPage} = this, {id, name, pages} = palette;
			const btnPalette = document.querySelector('button[data-control="selectpalette"]');
			if(btnPalette === null) return console.warn('Palette button not found.');
			const nextPage = (currentPage + 1) % pages.length;
			const icon = this.createPaletteIcon(pages[nextPage], currentPage, pages.length);
			btnPalette.innerHTML = `<div class="icon">${icon}</div>`;
		};
		P.getCssRules = function() {
			const style = [...document.styleSheets].find(style => (style.href || '').match(/tool-color\.css/));
			return [...style.cssRules];
		};
		P.setButtonPad = function(vals) {
			//console.warn('ToolColor.setButtonPad(vals);', vals);
			document.querySelectorAll('.controls-input button[data-key]')
				.forEach(btn => {
					const {key} = btn.dataset, nextVal = vals ? vals[key] : key;
					btn.dataset.value = nextVal;
					btn.setAttribute('title', nextVal);
				});
		};
		P.updateButtonPad = function(reset = false) {
			//console.info('ToolColor.updateButtonPad(%s);', reset);
			const {palette, currentPage} = this, {pages} = palette;
			const vals = !(reset || !this.isCurrentTool())
				? [...new Array(10)].map((_, val) => pages[currentPage][val] || '0')
				: undefined;
			this.setButtonPad(vals);
		};
	// Palette
		P.validatePaletteData = function(palette) {
			if(palette === null || palette === undefined) return null;
			if(typeof palette === 'string') {
				try {
					palette = JSON.parse(palette);
				} catch(err) {
					return null;
				}
			}
			if(typeof palette.colors !== 'object') return null;
			if(!Array.isArray(palette.pages)) return null;
			const colors = Object.keys(palette.colors);
			for(let i = 0; i < palette.pages.length; i++) {
				let page = palette.pages[i];
				if(!Array.isArray(page)) return null;
				if(page.find(val => !colors.includes(val)) !== undefined) return null;
			}
			return palette;
		};
		P.exportPalette = function() {
			const {pages} = this.palette;
			const colorKeys = [...new Set([].concat(...pages))];
			const colors = {}
			colorKeys.forEach(key => colors[key] = getCssVar(`--cell-color-${key}`));
			return {colors, pages};
		};
		P.setColor = function(key, nextColor) {
			//console.info('ToolColor.setColor(%s, %s);', key, nextColor);
			const {palette} = this;
			if(palette.colors === undefined) palette.colors = this.exportPalette().colors;
			const {colors} = palette;
			const prevColor = colors[key];
			if(prevColor !== nextColor) {
				//console.log('  Changing color["%s"]: %s -> %s', key, prevColor, nextColor);
				setCssVar(`--cell-color-${key}`, nextColor);
				colors[key] = nextColor;
			}
			this.savePalette(this.palette);
		};
		// TODO: throttle this!
		P.savePalette = function(palette) {
			//console.info('ToolColor.savePalette(palette);', palette);
			Framework.setData('ToolColor_palette', palette);
		};
		P.setPalette = function(palette) {
			//console.info('ToolColor.setPalette(palette);', palette);
			palette = this.validatePaletteData(palette) || C.DefaultPalette;
			this.palette = palette;
			Object.keys(palette.colors)
				.forEach(key => setCssVar(`--cell-color-${key}`, palette.colors[key]));
			this.setPage(this.currentPage);
			return this.palette;
		};
		P.setPage = function(page) {
			//console.info('ToolColor.setPage(%s);', page, this.currentPage);
			const len = this.palette.pages.length;
			const currentPage = this.currentPage = Math.max(0, Math.min(len - 1, page));
			Framework.setData('ToolColor_page', currentPage);
			this.exitEditMode();
			this.updatePaletteButton();
			this.updateButtonPad();
		};
		P.setPagePrev = function() {
			const {palette, currentPage} = this, len = palette.pages.length;
			let prevPage = (currentPage + len - 1) % len;
			this.setPage(prevPage);
		};
		P.setPageNext = function() {
			const {palette, currentPage} = this, len = palette.pages.length;
			let nextPage = (currentPage + 1) % len;
			this.setPage(nextPage);
		};
	// Edit Mode
		P.handlePadButtonDown = function(event) {
			clearTimeout(this.__buttonHoldTimeout);
			this.__buttonHoldTimeout = setTimeout(() => this.toggleEditMode(), C.HoldToEditDelayMs);
		};
		P.handlePadButtonUp = function(event) {
			clearTimeout(this.__buttonHoldTimeout);
			delete this.__buttonHoldTimeout;
		};
		P.handleColorPickerInput = function(event) {
			//console.info('ToolColor.handleColorPickerInput:', event.type);
			const input = event.target;
			const val = input.dataset.val;
			this.setColor(val, hex2rgb(input.value));
		};
		P.handleColorPickerExit = function(event) {
			//console.warn('ToolColor.handleColorPickerExit:', event.type);
			//this.exitEditMode();
		};
		P.handleColorPickerOpen = function(event) {
			if(!this.editMode) return;
			//console.warn('ToolColor.handleColorPickerOpen(event);');
			if(this.__pickerIsOpen && (this.__pickerIsOpen !== event.type)) {
				event.preventDefault();
				return;
			}
			this.__pickerIsOpen = event.type;
		};
		P.toggleEditMode = function() {
			this.editMode ? this.exitEditMode() : this.enterEditMode();
		};
		P.enterEditMode = function() {
			//console.warn('ToolColor.enterEditMode();');
			if(!this.isCurrentTool() || this.editMode) return;
			this.editMode = true;
			delete this.__pickerIsOpen;
			document.querySelector('.controls-input').classList.add('edit-colors');
			[...document.querySelectorAll('.tool-colour button.digit')]
				.forEach(btn => {
					const color = rgb2hex(window.getComputedStyle(btn, ':after')['background-color']).slice(0, 7);
					btn.insertAdjacentHTML('beforebegin', 
						`<div class="colorpicker"><input type="color" data-val="${btn.dataset.value}" value="${color}" style="pointer-events: all;"></input></div>`
					);
				});
			const selColorInput = '.edit-colors input[type="color"]';
			addDownEventHandler(selColorInput, this.handleColorPickerOpen, {capture: true});
			addHandler(selColorInput, 'input', this.handleColorPickerInput);
			addHandler(selColorInput, 'change', this.handleColorPickerExit);
		};
		P.exitEditMode = function() {
			//console.warn('ToolColor.exitEditMode();');
			if(!this.editMode) return;
			this.editMode = false;
			delete this.__pickerIsOpen;
			document.querySelector('.controls-input').classList.remove('edit-colors');
			const selColorInput = '.edit-colors input[type="color"]';
			removeDownEventHandler(selColorInput, this.handleColorPickerOpen, {capture: true});
			remHandler(selColorInput, 'input', this.handleColorPickerInput);
			remHandler(selColorInput, 'change', this.handleColorPickerExit);
			removeDownEventHandler(window, this.exitEditMode, {capture: true});
			[...document.querySelectorAll('div.colorpicker')].forEach(input => input.remove());
		};
	// Handlers
		P.handlePaletteToggle = function(event) {
			event.preventDefault();
			this.setPageNext();
		};
		P.handleMousewheel = function(event) {
			event.deltaY < 0 ? this.setPagePrev() : this.setPageNext();
		};
		P.handleImportExportColors = function(...args) {
			const paletteData = JSON.stringify(this.exportPalette());
			const handleDialogButton = button => {
				switch(button) {
					case 'Copy to Clipboard':
						navigator.clipboard.writeText(paletteData);
						break;
					case 'Import':
						const importData = document.querySelector('textarea#palette-import').value;
						let nextPalette = this.validatePaletteData(importData);
						if(nextPalette === null) {
							console.error('Invalid import data:', importData);
							alert('Invalid import data!');
							return;
						}
						this.setPalette(nextPalette);
						this.savePalette(nextPalette);
						break;
					case 'Reset To Default':
						this.setPalette(C.DefaultPalette);
						this.savePalette(this.palette);
						break;
				}
			};

			Framework.closeDialog();
			Framework.showDialog({
				parts: [
					{tag: 'title', innerHTML: 'Import/Export Color Palette', style: 'text-align: center'},
					{tag: 'options', options: [{innerHTML: 'Reset To Default'}]},
					{tag: 'label', content: 'Export current palette:', style: 'margin-bottom: 0;'},
					{tag: 'textarea', style: 'width: calc(100% - 1rem); height: 6rem; margin: 0.5rem;',
						content: paletteData
					},
					{tag: 'options', options: [{innerHTML: 'Copy to Clipboard'}]},
					{tag: 'label', content: 'Import new palette (paste JSON below):', style: 'margin-bottom: 0;'},
					{tag: 'textarea', id: 'palette-import', style: 'width: calc(100% - 1rem); height: 6rem; margin: 0.5rem;'},
					{tag: 'options', options: [{innerHTML: 'Import'}]},
				],
				onButton: handleDialogButton,
				centerOverBoard: true
			});
		};
	// Tool API
		P.tempKey = (event, app) => (app.controlPressed && (app.altPressed || app.shiftPressed));
		P.handleBlur = function(event) {
			this.exitEditMode();
		};
		P.handleKeydown = function(event) {
			if(!this.isCurrentTool()) return;
			const {code, key} = event;
			if(code === 'AltLeft') {
				this.enterEditMode();
				return true;
			}
			if(code === 'Tab') {
				this.keyDownTab = true;
				this.setPageNext();
				return true;
			}
			if(this.keyDownTab) {
				if(key === 'Shift') {
					this.setPagePrev();
					return true;
				}
				let digit = (code.match(/^Digit(\d)$/) || [])[1];
				if(digit !== undefined) {
					const {pages} = this.palette;
					digit--;
					if(pages[digit]) {
						this.setPage(digit);
						return true;
					}
				}
			}
		};
		P.handleKeyup = function(event) {
			if(event.code === 'Tab') this.keyDownTab = false;
			if(event.code === 'AltLeft') this.exitEditMode();
		};
		/*
		P.handleToolButton = function(button) {
			console.warn('ToolColor.handleToolButton(button);', button);
			if(!this.editMode) return;
			return true;
		};
		*/
		P.handleToolEnter = function() {
			this.editMode = false;
			this.keyDownTab = false;
			this.createPaletteButton();
			this.setPage(this.currentPage);
			addDownEventHandler('.controls-input', this.handlePadButtonDown, {capture: true});
			addUpEventHandler(window, this.handlePadButtonUp, {capture: true});
		};
		P.handleToolExit = function() {
			if(this.editMode) this.exitEditMode();
			this.updateButtonPad(true);
			this.removePaletteButton();
			removeDownEventHandler('.controls-input', this.handlePadButtonDown, {capture: true});
			removeUpEventHandler(window, this.handlePadButtonUp, {capture: true});
			this.editMode = false;
			this.keyDownTab = false;
		};
		P.addImportExportSetting = function() {
			Framework.addSettings([
				{tag: 'button', group: 'importexport',
					content: 'Import/Export Color Palette', handler: this.handleImportExportColors,
					//style: 'display: block; margin: 0.5rem 1rem; padding: 0rem 1rem; font-size: 1.2rem;'
				},
			]);
		};
		P.init = function() {
			this.currentPage = Framework.getData('ToolColor_page') || 0;
			this.setPalette(Framework.getData('ToolColor_palette'));
		};
		P.done = function() {
		};

	return C;
})();

const ToolColor = {
	button: {
		name: 'colour', title: 'Color',
		content: `<div class="icon">${Framework.icons.toolColour}</div>Color`,
	},
	tool: new ToolColor_tool()
};
Framework.getApp().then(() => ToolColor.tool.addImportExportSetting());
