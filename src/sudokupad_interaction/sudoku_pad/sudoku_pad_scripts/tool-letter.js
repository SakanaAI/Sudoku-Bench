
/*
	Letter Tool Activation Options:
	1. "altletter": Hold ALT to enter 26 letters, all other hotkeys work normally (i.e. ctrl+alt+letter = letter center mark)
	2. "althotkey": Enter 26 letters directly, hold ALT for other hotkeys (i.e. CTRL+ALT+a = select all)
	3. "shiftletter": Hold SHIFT to enter 26 letters, all other hotkeys work normally (i.e. ctrl+alt+letter = letter center mark)
	4. "shifthotkey": Enter 26 letters directly, hold SHIFT for other hotkeys (i.e. CTRL+ALT+a = select all)
	5. "nohotkey:" Enter 26 letters directly, hotkeys with bare letters no longer function (i.e. ZXCV to toggle tools, WASD to move selection)
	6. "onlyten": Enter 10 letters directly (only A-O), and only loose WASD hotkeys, but keep ZXCV hotkeys.
*/

const ToolLetter_tool = (() => {
	function ToolLetter() {
		bindHandlers(this);
		this.name = 'letter';
		this.isEnabled = false;
		this.isTool = false;
		this.letterMode = false;
	}
	const C = ToolLetter, P = Object.assign(C.prototype, {constructor: C});
	const LETTER_MAP = C.LETTER_MAP = 'OABCDEFGHI'.split('');
	const lettersRe = C.lettersRe = '[A-Z]';
	const digitsRe = C.digitsRe = '[0-9]';
	const reIsLetter = C.reIsLetter = new RegExp(`^${lettersRe}$`);
	const reIsDigit = C.reIsDigit = new RegExp(`^${digitsRe}$`);
	const reKeyCodeToLetter = C.reKeyCodeToLetter = new RegExp(`^(?:(?:Key|Digit)?(${lettersRe})|.*())$`, 'i');
	const reKeyCodeToDigit = C.reKeyCodeToDigit = new RegExp(`^(?:(?:Key|Digit)?(${digitsRe})|.*())$`, 'i');
	P.isToolWithLetters = tool => ['normal', 'corner', 'centre'].includes(tool);
	P.keyCodeToLetter = ({code, key}) => {
		let letter = code.replace(reKeyCodeToLetter, '$1').toUpperCase();
		if(!reIsLetter.test(letter)) letter = key.replace(reKeyCodeToLetter, '$1').toUpperCase();
		return letter;
	};
	P.keyCodeToDigit = ({code, key}) => {
		let digit = code.replace(reKeyCodeToDigit, '$1');
		if(!reIsDigit.test(digit)) digit = key.replace(reKeyCodeToDigit, '$1');
		return digit;
	};
	P.handleToggleKey = function(event) {
		event.preventDefault();
		this.toggleMode();
	};
	P.handleKey = function(event) {
		const {app} = Framework;
		if(!this.letterMode) return;
		if(!this.isToolWithLetters(app.tool)) return;
		let letter = this.keyCodeToLetter(event);
		if(!reIsLetter.test(letter)) {
			let digit = this.keyCodeToDigit(event);
			if(!reIsDigit.test(digit)) return;
			event.preventDefault();
			app.doPressDigit(digit);
			return true;
		}
		let {shiftPressed, altPressed} = app;
		let letterEntryMode = Framework.getSetting('toolletter_mode');
		altPressed = altPressed || event.getModifierState('AltGraph');
		// FIXME: In nohotkey it ignores if we're in letter mode
		switch(letterEntryMode) {
			//case 'altletter': if(!altPressed) return; break;
			case 'althotkey': if(altPressed) return; break;
			//case 'shiftletter': if(!shiftPressed) return; break;
			case 'shifthotkey': if(shiftPressed) return; break;
			//case 'nohotkey': break;
			//case 'onlyten': if(LETTER_MAP.indexOf(letter) === -1) return; break;
		}
		event.preventDefault();
		app.doPressDigit(letter);
		return true;
	};
	P.keyHandlers = [
		{key: '/', handler: P.handleToggleKey},
		{key: 'Tab', handler: P.handleToggleKey},
		{key: () => true, handler: P.handleKey},
	];
	P.canTempSwitch = function() {
		let {app} = Framework, {altPressed, shiftPressed} = app;
		let mode = Framework.getSetting('toolletter_mode');
		return ((mode === 'altletter' && altPressed) || (mode === 'shiftletter' && shiftPressed));
	};
	P.handleKeydown = function(event) {
		//console.info('ToolLetter.handleKeydown(event)');
		let {app} = Framework, {altPressed, shiftPressed} = app;
		if(this.canTempSwitch() && !this.letterMode) {
			this.tempSwitch = true;
			this.setLetterMode(true, true);
		}
	};
	P.handleKeyup = function(event) {
		//console.info('ToolLetter.handleKeyup(event)');
		if(!this.canTempSwitch() && this.letterMode) {
			this.setLetterMode();
		}
	};
	P.showHideLetters = function(show) {
		//console.info('ToolLetter.showHideLetters(%s);', show);
		const {LETTER_MAP} = C;
		let controls = document.querySelector('.controls-main');
		controls.classList.toggle('input-letter', show);
		controls.classList.toggle('input-digit', !show);
		document.querySelectorAll('.controls-buttons .digit')
			.forEach(digit => {
				let prevVal = digit.dataset['value'];
				let index = (LETTER_MAP[prevVal] && prevVal) || LETTER_MAP.indexOf(prevVal);
				let nextVal = show ? LETTER_MAP[index] : index;
				digit.textContent = digit.dataset['value'] = nextVal;
			});
	};
	P.setLetterMode = function(letterMode, tempSwitch) {
		//console.info('ToolLetter.setLetterMode(letterMode: %s, tempSwitch: %s): %s -> %s', letterMode, tempSwitch, this.letterMode, letterMode);
		if(this.letterMode === letterMode) {
			//console.error('  Attempt to switch to current mode');
			return;
		}
		if(letterMode === undefined && !this.tempSwitch) {
			//console.error('  Unswitching temp mode, but not in temp mode!');
			return;
		}
		if(letterMode === undefined && this.tempSwitch) {
			//console.error('  Unswitching temp mode');
			this.tempSwitch = false;
			letterMode = this.prevMode;
		}
		if(tempSwitch && !this.tempSwitch) {
			//console.error('  Switching temp mode');
			this.prevMode = this.letterMode;
			this.tempSwitch = true;
		}
		this.letterMode = letterMode;
		if(!tempSwitch) Framework.setData('ToolLetter_letterMode', letterMode);
		const {app} = Framework;
		let controls = document.querySelector('.controls-main');
		if(letterMode && !this.isToolWithLetters(app.tool)) {
			//console.warn('Exiting setLetterMode, incorrect tool:', app.tool);
			return;
		}
		this.showHideLetters(letterMode);
		Framework.app.toolExecHandler('handleToolUpdate');
	};
	P.toggleMode = function(letterMode) {
		let {app} = Framework;
		if(!this.isToolWithLetters(app.tool)) return;
		if(letterMode === undefined) letterMode = !this.letterMode;
		this.setLetterMode(letterMode);
	};
	P.handleToggle = function(event) {
		this.toggleMode();
		event.stopPropagation();
		event.preventDefault();
		event.stopImmediatePropagation();
	};
	P.enable = function() {
		if(this.isEnabled) return;
		this.showHideLetters(this.letterMode);
		let btnDelete = document.querySelector('button[data-control="delete"]');
		let btn = document.querySelector('button[data-control="toggleletter"]') ||
			Framework.createElem({tag: 'button', dataset: {control: 'toggleletter'}, title: '/', handler: this.handleToggle});
		btnDelete.parentNode.insertBefore(btn, btnDelete);
		this.isEnabled = true;
	};
	P.disable = function() {
		if(!this.isEnabled) return;
		this.showHideLetters(false);
		let controls = document.querySelector('.controls-main');
		controls.classList.remove('input-letter');
		controls.classList.remove('input-digit');
		let btn = document.querySelector('button[data-control="toggleletter"]');
		btn && btn.remove();
		this.isEnabled = false;
	};
	P.handleToolEnter = function() {
		let controls = document.querySelector('.controls-main');
		this.isToolWithLetters(Framework.app.tool) ? this.enable() : this.disable();
	};
	P.init = function() {
		// TODO: Proper hotkey API
		const getAltShift = () => {
			let {altPressed: alt, shiftPressed: shift} = Framework.app;
			let tool = Framework.getSetting('toolletter'), mode = Framework.getSetting('toolletter_mode');
			if(tool && (mode === 'altletter' || mode === 'althotkey')) return shift;
			if(tool && (mode === 'shiftletter' || mode === 'shifthotkey')) return alt;
			return alt || shift;
		};
		let {tools} = Framework.app;
		if(tools.corner !== undefined) tools.corner.tempKey = (event, app) => (!app.controlPressed && getAltShift());
		if(tools.centre !== undefined) tools.centre.tempKey = (event, app) => (app.controlPressed && !getAltShift());
		if(tools.colour !== undefined) tools.colour.tempKey = (event, app) => (app.controlPressed && getAltShift());
		Framework.app.on('tool-handleToolEnter', this.handleToolEnter);
		this.letterMode = Framework.getData('ToolLetter_letterMode');
		this.handleToolEnter();
	};
	P.done = function() {
		Framework.app.off('tool-handleToolEnter', this.handleToolEnter);
		this.disable();
	};
	return C;
})();

const ToolLetter = {
	tool: new ToolLetter_tool()
};

Framework.getApp()
	.then(() => Framework.addSettings([
		{tag: 'toggle', group: 'tools', name: 'toolletter', content: 'Enable Letter Tool', onToggle: Framework.makeToolToggler(ToolLetter)},
		{tag: 'multi', group: 'advanced', name: 'toolletter_mode', content: 'Letter Tool Hotkey', options: [
				{value: 'altletter', content: '1. ALT for letters (SHIFT for corner marks)'},
				{value: 'althotkey', content: '2. Hold ALT for hotkeys'},
				{value: 'shiftletter', content: '3. SHIFT for letters (ALT for corner marks)'},
				{value: 'shifthotkey', content: '4. Hold SHIFT for hotkeys'},
				{value: 'nohotkey', content: '5. Toggle ("/") for letters'},
				//{value: 'onlyten', content: '6. Only letters OABCDEFGHI (Disables hotkeys using those)'},
			],
			init: () => {
				const validModes = ['altletter', 'althotkey', 'shiftletter', 'shifthotkey', 'nohotkey', 'onlyten'];
				const defaultMode = 'altletter';
				if(!validModes.includes(Framework.getSetting('toolletter_mode'))) {
					Framework.setSetting('toolletter_mode', defaultMode);
				}
			}
		}
	]));
