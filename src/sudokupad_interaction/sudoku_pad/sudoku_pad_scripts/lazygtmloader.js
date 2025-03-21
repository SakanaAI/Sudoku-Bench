(() => {
	window.dataLayer=window.dataLayer??[];
	window.gtag=window.gtag??function gtag(){dataLayer.push(arguments)};
	gtag('js', new Date());
	const opts = {linker: {
		accept_incoming: true,
		cookie_domain: 'auto',
		domains: ['sudokupad.app', 'beta.sudokupad.app', 'alpha.sudokupad.app', 'app.crackingthecryptic.com', 'test.crackingthecryptic.com', 'sudokupad.com', 'beta.sudokupad.com', 'alpha.sudokupad.com']
	}};
	gtag('config', 'G-7SX7DQ4WG6', opts);
	gtag('config', 'UA-173937060-1', opts);
	let initTimeoutId, gtmDone = false, maxRetry = 20;
	function isPuzzleReady() {
		if('undefined' === typeof Framework) return false;
		const {app = {}} = Framework, {puzzle = {}, timer = {}} = app, {puzzleId, replayPlaying, replayStack = []} = puzzle, {running} = timer;
		return undefined !== puzzleId && !replayPlaying && (running || replayStack.length > 0);
	};
	function initGTM() {
		clearTimeout(initTimeoutId);
		document.removeEventListener('DOMContentLoaded', initGTM);
		if(gtmDone || maxRetry-- <= 0) return;
		if(!isPuzzleReady()) return setTimeout(initGTM, 500);
		gtmDone = true;
		loadScript('https://www.googletagmanager.com/gtag/js?id=G-7SX7DQ4WG6', 'head', {async: 'async'});
	}
	document.addEventListener('DOMContentLoaded', initGTM);
	initTimeoutId = setTimeout(initGTM, 6000);
})();