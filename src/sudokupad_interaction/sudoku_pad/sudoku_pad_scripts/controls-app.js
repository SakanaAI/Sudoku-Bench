
const createInfoOverlay = () => {
	let appElem = document.querySelector('.app');
	let svg;
	const handleResize = event => {
		let {clientWidth: w, clientHeight: h} = appElem;
		svg.adjustViewBox(0, 0, w, h);
		handleRender();
	};
	const handleClose = event => {
		event.preventDefault();
		event.stopPropagation();
		hideOverlay();
		return false;
	};
	const renderHint = (sel, hint) => {
		let elem = document.querySelector(sel);
		if(!elem) return;
		let b = bounds(elem);
		let outlineOpts = {
			target: 'infooverlay-outlines',
			type: 'rect',
			attr: {
				stroke: 'rgba(255, 0, 0, 0.8)',
				fill: 'none',
				'stroke-width': 5,
				rx: SvgRenderer.CellSize * 0.2, ry: SvgRenderer.CellSize * 0.2,
				x: b.left, y: b.top,
				width: b.width, height: b.height
			}
		};
		let hintOpts = {
			target: 'infooverlay-hints',
			type: 'text',
			content: hint,
			attr: {
				'text-anchor': 'middle',
				'dominant-baseline': 'bottom',
				fill: 'rgba(255, 255, 255, 1)',
				x: b.left + 0.5 * b.width,
				y: b.top + 1 * b.height,
				width: 0, height: 0
			}
		};
		svg.renderPart(outlineOpts);
		let hintElem = svg.renderPart(hintOpts);
		hintElem.dataset.hinttext = hint;
	};
	const handleRender = event => {
		[...document.querySelectorAll('#infooverlay-outlines *, #infooverlay-hints *')].forEach(e => e.remove());
		svg.renderPart({
			target: 'infooverlay-outlines',
			type: 'rect',
			attr: {
				fill: 'rgba(0, 0, 0, 0.7)',
				width: '100%', height: '100%'
			}
		});
		[
			['#appmenubtn', 'Menu\n\nHome\nLegacy\nVideo'],
			['.home-link', 'Help'],
			['.timer', 'Timer'],
			['.timer-control', 'Pause'],
			['.cells', 'Puzzle Grid'],
			['button[data-control="settings"]', 'Settings'],
			['button[data-control="fullscreen"]', 'Maximise'],
			['button[data-control="rules"]', 'Rules'],
			['button[data-control="info"]', 'Info'],
			['button[data-control="video"]', 'Video'],
			['button[data-control="undo"]', 'Undo'],
			['button[data-control="redo"]', 'Redo'],
			['button[data-control="restart"]', 'Restart'],
			['button[data-control="check"]', 'Checker'],
			['[data-control="select"]', 'Toggle Selection'],
			['.controls-input', 'Entry'],
			['.controls-tool', 'Tools'],
		].forEach(args => renderHint.apply(null, args));
		//adjustTextPlacement();
	};
	const hideOverlay = () => {
		window.removeEventListener('resize', handleResize);
		let svgElem = svg.getElem();
		svgElem.removeEventListener('click', handleClose);
		svgElem.removeEventListener('touchstart', handleClose);
		svgElem.remove();
		svg = undefined;
	};
	const showOverlay = () => {
		window.addEventListener('resize', handleResize);
		let svgElem = Framework.createElem({
			elem: document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
			parent: appElem,
			attributes: {class: 'info-overlay'},
			innerHTML: `<g id="infooverlay-outlines"></g><g id="infooverlay-hints"></g>`
		});
		svg = new SvgRenderer({svg: svgElem});
		svgElem.addEventListener('click', handleClose);
		svgElem.addEventListener('touchstart', handleClose);
		handleResize();
	}

	showOverlay();
};

const showRulesDialog = event => {
	const {showDialog, app, icons} = Framework;
	showDialog({
		parts: [
			...app.getPuzzleMetaDialogParts(),
			{tag: 'options', class: 'sticky', options: [{type: 'button', innerHTML: `${icons.back}Back`, className: 'dialog-back', action: 'close'}]}
		],
		centerOverBoard: true
	});
};

const appButtonSettings = {
	name: 'settings', title: 'Settings',
	content: `<div class="icon">${Framework.icons.settings}</div>Settings`,
	onClick: event => Framework.showSettings(event)
};
const appButtonFullscreen = {
	name: 'fullscreen', title: 'Fullscreen',
	content: `<div class="icon">${Framework.icons.fullscreenOn}</div><div class="icon fullscreen">${Framework.icons.fullscreenOff}</div>
	Fullscreen`,
	init: app => docEl.addEventListener('fullscreenchange', event => document.querySelector('body').classList.toggle('fullscreen', isFullscreen())),
	onClick: event => { toggleFullscreen(); setInterval(Framework.app.resize(), 500)}
};
const appButtonRules = {
	name: 'rules', title: 'Rules',
	content: `<div class="icon">${Framework.icons.rules}</div>Rules`,
	onClick: showRulesDialog
};
const appButtonInfo = {
	name: 'info', title: 'Info',
	content: `<div class="icon">${Framework.icons.info}</div>Info`,
	onClick: createInfoOverlay
};
const appButtonRestart = {
	name: 'restart', title: 'Restart',
	content: `<div class="icon">${Framework.icons.restart}</div>Restart`,
	onClick: () => Framework.app.handleRestartPuzzle()
};

const createAppButtons = () => {
	Framework.addAppButtons([
		appButtonSettings,
		appButtonFullscreen,
		appButtonRules,
		appButtonInfo,
		appButtonRestart,
	]);
};

const createAuxButtons = () => {
	Framework.addAuxButtons([
		{
			name: 'undo', title: 'Undo',
			content: `<div class="icon">${Framework.icons.undo}</div>Undo`,
			onClick: () => Framework.app.undo(),
		},
		{
			name: 'redo', title: 'Redo',
			content: `<div class="icon">${Framework.icons.redo}</div>Redo`,
			onClick: () => Framework.app.redo(),
		},
		{
			name: 'check', title: 'Check',
			content: `<div class="icon">${Framework.icons.check}</div>Check`,
			onClick: () => Framework.app.check({log: true, alertOnError: true, alertOnNoError: true}),
		},
		{
			name: 'select', title: 'Select',
			content: `<div class="icon">${Framework.icons.toolSelect}</div>Select`,
		},
	]);
	ToolSelect.tool.init();
};
