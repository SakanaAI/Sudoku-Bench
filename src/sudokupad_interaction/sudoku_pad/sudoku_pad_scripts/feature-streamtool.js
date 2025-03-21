
const FeatureStreamTool = (() => {
	// Helpers
		const {EffectConfetti, PuzzleEffectConfetti} = FeaturePuzzleEvents;
		const {fetchPuzzle, parsePuzzleData, resolvePuzzleData} = PuzzleLoader;
		const getEventPos = e => e.touches ? [e.touches[0].clientX, e.touches[0].clientY] : [e.clientX, e.clientY];
		const resolveCellRef = ref => {
			const reRC = /^r(\d+)c(\d+)$/i, reNum = /^(\d+)$/i;
			const {app: {puzzle, puzzle: {cells}}} = Framework;//, [min, max] = puzzle.getMinMaxRC();
			let str = String(ref);
			if(reRC.test(str)) return (puzzle.parseCells(str) || [])[0];
			if(reNum.test(str)) return cells[parseInt(str)];
			throw new Error(`Invalid cell ref: ${JSON.stringify(ref)}`);
		};
	
	function FeatureStreamTool() {
		bindHandlers(this);
		PortableEvents.mixin(this);
		this.featureEnabled = false;
		this.isHost = false;
		this.cloneviewReady = false;
		this.cloneviewType = 'none';
		this.reconnectAttemptCount = 0;
		this.url = this.getWsUrl(window.location);
		this.currentPuzzleid = getPuzzleId();
		this.hosts = {};
		this.stateInitialized = false;
		this.seq = 0;
	}
	const C = FeatureStreamTool, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'streamtool';
	C.SettingName = C.Name;
	C.featureStyle = `
		.cloneview-pointer {
			display: flex;
			position: absolute;
			white-space: nowrap;
			left: 0; top: 0;
			width: 2rem; height: 2rem; line-height: 2rem;
			margin: -1rem 0 0 -1rem;
			justify-content: center;
			font-size: 0.7rem;
			border-radius: 1rem;
			border: 2px solid magenta;
			color: magenta;
			transition: transform 0.05s ease-out;
		}
		#puzzleselector a {
			display: block;
			padding: 0 1rem;
			line-height: 2rem;
		}
		@keyframes markerbounce {
			  0% { transform: scale(1.0); opacity: 1; }
			 33% { transform: scale(1.3); opacity: 1; }
			 66% { transform: scale(1.0); opacity: 1; }
			100% { transform: scale(2.0); opacity: 0; }
		}
		.cage-cellmarker {
			opacity: 0;
			animation: 1.0s ease-in-out 0s 1 markerbounce;
		}
		
		.setting-rulesonly .topbar,
		.setting-rulesonly #board,
		.setting-rulesonly .controls-buttons,
		.setting-rulesonly .controls-footer,
		.setting-rulesonly .puzzle-header,
		.setting-rulesonly .rules-copy
		{ display: none !important; }
		.setting-rulesonly .controls,
		.setting-rulesonly .controls-info,
		.setting-rulesonly .puzzle-rules
		{
			display: block !important;
			position: absolute !important;
			top: 0 !important;
			left: 0 !important;
			right: 0 !important;
			bottom: 0 !important;
			transform: none !important;
			max-height: 100% !important;
			max-width: 100% !important;
			background: none !important;
			border: none !important;
			overflow: hidden !important;
		}
		.setting-streameffects .topbar,
		.setting-streameffects .controls,
		.setting-streameffects #svenpeek,
		.setting-streameffects #svgrenderer #background,
		.setting-streameffects #svgrenderer #underlay,
		.setting-streameffects #svgrenderer #cell-colors,
		.setting-streameffects #svgrenderer #arrows,
		.setting-streameffects #svgrenderer #cages,
		.setting-streameffects #svgrenderer #cell-grids,
		.setting-streameffects #svgrenderer #cell-errors,
		.setting-streameffects #svgrenderer #overlay,
		.setting-streameffects #svgrenderer #cell-overlay,
		.setting-streameffects #svgrenderer #cell-givens,
		.setting-streameffects #svgrenderer #cell-pen,
		.setting-streameffects #svgrenderer #cell-pencilmarks,
		.setting-streameffects #svgrenderer #cell-candidates,
		.setting-streameffects #svgrenderer #cell-values,
		.setting-streameffects #svgrenderer .cage-seencells,
		.setting-streameffects #svgrenderer .cage-selectioncage
		{ opacity: 0 !important; }
	`;
	C.ReconnectIntervalMs = 1000;
	C.MaxReconnectIntervalMs = 30000;
	C.UpdatePointerMinMs = 25; // 25
	C.UpdatePointerMaxMs = 50; // 50
	C.ConnectTimeoutMs = 3000;
	C.ReconnectDecay = 1.5;
	C.TimeoutIntervalMs = 2000;
	C.MaxReconnectAttempts = 100;
	C.WSReadyState = Object.assign(...'CLOSED,CLOSING,CONNECTING,OPEN'.split(',').map(name => ({[WebSocket[name]]: name})));
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
	// Setting
		P.attachElem = function() {
			if(this.isAttached) return;
			if(/^sudokucon\//.test(getPuzzleId())) {
				this.enableCloneview();
			}
			this.isAttached = true;
		};
		P.detachElem = function() {
			if(!this.isAttached) return;
			this.isAttached = false;
			this.disableCloneview();
		};
		P.handleSettingChange = function() {
			const setting = Framework.getSetting(C.SettingName);
			setting ? this.attachElem() : this.detachElem();
		};
		P.handleInit = function() {
			Framework.addSetting({
				group: 'experimental', name: C.SettingName,
				content: 'Streaming Tools',
				tag: 'toggle',
				onToggle: this.handleSettingChange,
			});
			Framework.addSetting({
				group: 'experimental', name: 'CloneViewSelectPuzzle',
				tag: 'button',
				content: 'CloneView Select Puzzle',
				handler: this.handleShowPuzzleMenu,
			});
		};
	// Helpers
		C.waitForPuzzleLoaded = async (timeoutMs = 2000) => {
			const {app: {puzzle, timer}} = Framework;
			const isReady = () => (puzzle.puzzleId !== undefined && !puzzle.replayPlaying && (timer.running || puzzle.replayStack.length > 0));
			if(isReady()) return;
			return await new Promise((resolve, reject) => {
				let timeoutId, t0 = Date.now();
				const handleCheckReady = () => {
					const timedOut = Date.now() - t0 > timeoutMs, ready = isReady();
					if(!timedOut && !ready) return;
					clearTimeout(timeoutId);
					puzzle.off('loaded', handleCheckReady);
					puzzle.off('progressloaded', handleCheckReady);
					puzzle.off('start', handleCheckReady);
					if(ready) return resolve();
					reject('Timed out');
				};
				puzzle.on('loaded', handleCheckReady);
				puzzle.on('progressloaded', handleCheckReady);
				puzzle.on('start', handleCheckReady);
				timeoutId = setTimeout(handleCheckReady, timeoutMs)
			});
		};
	// WebSocket
		P.getWsUrl = function(location) {
			const {href, hash} = new URL(location);
			const url = new URL(href.replace(/#$/, '').slice(0, href.length - hash.length));
			url.protocol = url.protocol.replace(/^http(s?:.*)$/, 'ws$1');
			return url;
		};
		P.getReadyState = function() {
			return C.WSReadyState[this.ws.readyState];
		};
		P.handleWsError = function(event) {
			console.warn('FeatureStreamTool.handleWsError(event);', event);
		};
		P.handleWsOpen = function(event) {
			//console.info('FeatureStreamTool.handleWsOpen(event);');
			clearTimeout(this.connectTimeoutId);
			this.reconnectAttemptCount = 0;
			this.trigger('open');
			//this.testCloneview();
		};
		P.handleWsClose = function(event) {
			const {code, reason} = event
			//console.warn('FeatureStreamTool.handleWsClose(event);', code, reason);
			this.disconnect();
		};
		P.handleWsMessage = function(event) {
			this.trigger('msg', JSON.parse(event.data));
		};
		P.handleConnectTimeout = function() {
			console.warn('FeatureStreamTool.handleConnectTimeout();');
			const {ws} = this;
			ws.close();
		};
		P.connect = async function(reconnectAttempt = false) {
			//console.info('FeatureStreamTool.connect(%s);', reconnectAttempt);
			const {url} = this;
			if(reconnectAttempt === false) {
				this.reconnectAttemptCount = 0;
			}
			else if(this.reconnectAttemptCount > C.MaxReconnectAttempts) {
				throw new Error(`Maximum reconnect attempts reached: ${this.reconnectAttemptCount}`);
			}
			const ws = this.ws = new WebSocket(url);
			ws.addEventListener('error', this.handleWsError);
			ws.addEventListener('open', this.handleWsOpen);
			ws.addEventListener('close', this.handleWsClose);
			ws.addEventListener('message', this.handleWsMessage);
			this.connectTimeoutId = setTimeout(this.handleConnectTimeout, C.ConnectTimeoutMs);
		};
		P.disconnect = function(force = false) {
			//console.info('FeatureStreamTool.disconnect(%s);', force);
			const {ws} = this;
			clearTimeout(this.connectTimeoutId);
			ws.removeEventListener('error', this.handleWsError);
			ws.removeEventListener('open', this.handleWsOpen);
			ws.removeEventListener('close', this.handleWsClose);
			ws.removeEventListener('message', this.handleWsMessage);
			if(ws.readyState !== WebSocket.CONNECTING) ws.close();
			if(!force) this.reconnect();
			this.trigger('close');
			//if(typeof this.stopCloneview === 'function') this.stopCloneview();
		};
		P.reconnect = async function() {
			//console.warn('FeatureStreamTool.reconnect();');
			const {ws} = this;
			const reconnectTimeoutMs = Math.min(C.MaxReconnectIntervalMs, C.ReconnectIntervalMs * Math.pow(C.ReconnectDecay, this.reconnectAttemptCount));
			this.reconnectTimeoutId = setTimeout(() => {
				this.reconnectAttemptCount++;
				this.connect(true);
			}, reconnectTimeoutMs);
		};
		P.close = function() {
			console.warn('FeatureStreamTool.close();');
			this.disconnect(true);
		};
	// Incoming
		C.reScale = /scale\(\s*([0-9.]*)/;
		// TODO:
		// - Cache scale/rect/viewBox/etc
		P.toBoardRelative = function([x, y]) {
			this.boardElem = this.boardElem || document.querySelector('.board');
			const {app: {svgRenderer: {svgElem}}} = Framework,
						scale = parseFloat((this.boardElem.style.transform.match(C.reScale) || [])[1]),
						rect = svgElem.getBoundingClientRect(),
						viewBox = svgElem.getAttribute('viewBox').split(' ').map(val => parseFloat(val)),
						left = rect.left - viewBox[0] * scale,
						top = rect.top - viewBox[1] * scale;
			return [Math.round((x - left) / scale), Math.round((y - top) / scale)];
		};
		P.fromBoardRelative = function([x, y]) {
			this.boardElem = this.boardElem || document.querySelector('.board');
			const {app: {svgRenderer: {svgElem}}} = Framework,
						scale = parseFloat((this.boardElem.style.transform.match(C.reScale) || [])[1]),
						rect = svgElem.getBoundingClientRect(),
						viewBox = (svgElem.getAttribute('viewBox') || '').split(' ').map(val => parseFloat(val)),
						left = rect.left - viewBox[0] * scale,
						top = rect.top - viewBox[1] * scale;
			return [Math.round(x * scale + left), Math.round(y * scale + top)];
		};
		P.createHostPointer = function({name, color} = {}) {
			//console.info('getHostPointer.createHostPointer(host);', {name, color});
			document.body.insertAdjacentHTML('beforeend', `<div class="cloneview-pointer" data-host="${name}">${name}</div>`);
			const elem = resolveSelector(`.cloneview-pointer[data-host="${name}"]`)[0];
			elem.style.color = elem.style.borderColor = color;
			elem.textContent = name;
			return {name, color, elem};
		};
		P.getHostPointer = function(host) {
			//console.info('getHostPointer.getHostPointer(host);', host);
			const {hosts} = this, {name} = host;
			if(hosts[name] === undefined) hosts[name] = this.createHostPointer(host);
			if(host.color && hosts[name].color !== host.color) {
				const style = hosts[name].elem.style;
				style.color = style.borderColor = host.color;
			}
			return hosts[name];
		};
		P.handleMsgPointer = function(msg) {
			//console.info('FeatureStreamTool.handleMsgPointer(msg);', msg);
			const {hosts} = this;
			let host = this.getHostPointer(msg.host);
			let pos = this.fromBoardRelative([msg.x, msg.y]);
			host.elem.style.transform = `translate(${pos[0]}px, ${pos[1]}px)`;
		};
		P.handleMsgAct = function(msg) {
			//console.info('FeatureStreamTool.handleMsgAct(msg);', msg);
			const {app, app: {puzzle}} = Framework;
			if(this.isHost && msg.seq < this.seq) {
				console.info('  Local state is better (ACT):', this.seq, msg.seq);
				this.sendSync();
				return;
			}
			if(!this.isHost) Framework.closeDialog();
			this.seq = msg.seq;
			if(this.cloneviewType === 'host') puzzle.off('act', this.handleHostAct);
			app.act(msg.act);
			if(this.cloneviewType === 'host') puzzle.on('act', this.handleHostAct);
		};
		P.handleMsgSync = async function(msg) {
			//console.info('FeatureStreamTool.handleMsgSync(msg);', msg);
			const {app, app: {puzzle, puzzle: {replayStack}}} = Framework, {isHost} = this;
			let puzzleChanged = false;
			let actionCount = replayStack.length;
			if(this.isHost && msg.seq < this.seq) {
				console.info('  CloneView(SYNC) > Local state is better:', this.seq, msg.seq);
				this.sendSync();
				return;
			}
			if(!this.isHost) Framework.closeDialog();
			this.seq = msg.seq;
			if(msg.puzzleid !== this.currentPuzzleid) {
				console.info('  CloneView(SYNC) > Change Puzzle:', this.currentPuzzleid, msg.puzzleid);
				this.currentPuzzleid = msg.puzzleid;
				await this.loadPuzzle(this.currentPuzzleid);
			}
			if(msg.replay) {
				console.info('  CloneView(SYNC) > Loading replay:', actionCount, msg.actionCount);
				await app.loadReplay(msg.replay, {speed: -1});
			}
			if(msg.acts && msg.acts.length > 0) {
				console.info('  CloneView(SYNC) > Catching up actions:', msg.acts.length);
				if(isHost) puzzle.off('act', this.handleHostAct);
				for(const act of msg.acts) puzzle.act(act);
				if(isHost) puzzle.on('act', this.handleHostAct);
			}
		};
		P.handleMsgUpdatepuzzles = async function(msg = {}) {
			//console.info('FeatureStreamTool.handleMsgUpdatepuzzles(msg);', msg);
			if(Array.isArray(msg.puzzles)) this.currentPuzzles = msg.puzzles;
		};
		P.handleMsgSelectpuzzle = async function(msg) {
			//console.info('FeatureStreamTool.handleMsgSelectpuzzle(msg);', msg);
			this.handleShowPuzzleMenu(msg);
		};
		P.handleMsgMarkcell = async function(msg) {
			const {app: {puzzle: {cells}}} = Framework;
			let cell = resolveCellRef(msg.cell);
			this.markCell(cell);
		};
		P.handleMsgSetting = async function(msg) {
			console.info('FeatureStreamTool.handleMsgSetting(%s);', JSON.stringify(msg));
			Framework.setSetting(msg.setting, msg.value);
		};
		P.handleMsgClosedialog = async function(msg) {
			Framework.closeDialog();
		};
		P.handleMsg = async function(msg) {
			//if(!['pointer', 'act'].includes(msg.cmd)) console.info('FeatureStreamTool.handleMsg(msg);', msg);
			//console.log('handleMsg:', msg.cmd);
			switch(msg.cmd) {
				case 'pointer': await this.handleMsgPointer(msg); break;
				case 'act': await this.handleMsgAct(msg); break;
				case 'sync': await this.handleMsgSync(msg); break;
				case 'updatepuzzles': await this.handleMsgUpdatepuzzles(msg); break;
				case 'selectpuzzle': await this.handleMsgSelectpuzzle(msg); break;
				case 'setpuzzle': await this.handleMsgSetpuzzle(msg); break;
				case 'markcell': await this.handleMsgMarkcell(msg); break;
				case 'setting': await this.handleMsgSetting(msg); break;
				case 'closedialog': await this.handleMsgClosedialog(msg); break;
				default: console.error('Unkown message:', msg);
			}
		};
	// Outgoing
		P.sendMsg = function(msg) {
			//console.log('FeatureStreamTool.sendMsg(msg);', msg);
			const {ws} = this, readyState = this.getReadyState();
			if(readyState !== 'OPEN') {
				console.warn('Cannot send message in readyState:', readyState);
				return;
			}
			ws.send(JSON.stringify(msg));
		};
		P.sendSync = function() {
			const {app, app: {puzzle, puzzle: {replayStack}}} = Framework, actionCount = replayStack.length;
			const msg = {cmd: 'sync', puzzleid: this.currentPuzzleid, seq: this.seq, actionCount};
			if(actionCount > 0) msg.replay = app.getReplay();
			//console.warn('FeatureStreamTool.sendSync();', msg);
			this.sendMsg(msg);
		};
		P.handleHostRestarted = function() {
			//console.warn('FeatureStreamTool.handleHostRestarted();');
			//this.sendMsg({cmd: 'restart'});
		};
		P.handleHostAct = function(act, action) {
			//console.info('FeatureStreamTool.handleHostAct(act, action);', act, action);
			const {app: {puzzle}} = Framework;
			if(puzzle.replayPlaying) return;
			this.sendMsg({cmd: 'act', seq: this.seq++, act});
		};
		P.handleHostMousemove = function(event) {
			//console.info('FeatureStreamTool.handleHostMousemove(event);');
			let [x, y] = this.toBoardRelative(getEventPos(event));
			this.sendMsg({cmd: 'pointer', x, y});
		};
		P.handleHostMousemove = throttleFunc(P.handleHostMousemove, C.UpdatePointerMinMs, C.UpdatePointerMaxMs);
		P.handleCloseDialog = function() {
			this.sendMsg({cmd: 'closedialog'});
		};
		P.handleDialogNoErrors = function() {
			const {app: {puzzle, timer: {elapsedTime}, currentPuzzle: {title, author}}} = Framework,
						completed = puzzle.isCompleted();
			const reTimeTrim = /^(?:00:)*0*(.*\d\:\d\d)$/;
			let timeStr = formatHHMMSS(elapsedTime);
			timeStr = timeStr.replace(reTimeTrim, '$1');
			let msgstr = `${title ? `"${title}"` : `Puzzle`}${author ? ` by ${author}` : ``} was solved in ${timeStr}`;
			this.sendMsg({cmd: 'puzzlesolved', message: msgstr});
		};
	// CloneView
		P.startCloneview = function(opts) {
			//console.info('FeatureStreamTool.startCloneview(opts);', opts);
			if(this.cloneviewReady) throw new Error('Cloneview already ready');
			const {app, app: {puzzle}} = Framework;
			this.isHost = typeof opts.hostkey === 'string' && opts.hostkey !== '';
			this.cloneviewType = this.isHost ? 'host' : 'guest';
			this.cloneviewReady = true;
			this.seq = 0;
			this.on('msg', this.handleMsg);
			if(this.isHost) {
				app.on('restarted', this.handleHostRestarted);
				puzzle.on('act', this.handleHostAct);
				document.addEventListener('mousemove', this.handleHostMousemove);
				Framework.on('closedialog', this.handleCloseDialog);
				app.on('dialognoerrors', this.handleDialogNoErrors);
			}
			this.sendMsg(Object.assign({cmd: 'cloneview'}, opts));
			this.trigger('cloneviewready');
		};
		P.stopCloneview = function() {
			//console.info('FeatureStreamTool.stopCloneview();');
			const {app, app: {puzzle}} = Framework;
			this.cloneviewReady = false;
			this.cloneviewType = 'none';
			this.off('msg', this.handleMsg);
			app.off('restarted', this.handleHostRestarted);
			puzzle.off('act', this.handleHostAct);
			document.removeEventListener('mousemove', this.handleHostMousemove);
			Framework.off('closedialog', this.handleCloseDialog);
			app.off('dialognoerrors', this.handleDialogNoErrors);
		};
		P.handleCloneViewSocketOpen = function() {
			this.startCloneview(this.cloneviewOpts);
		};
		P.handleCloneViewSocketClose = function() {
			this.stopCloneview();
		};
		P.runInitMsgs = async function() {
			//console.info('FeatureStreamTool.runInitMsgs();');
			const {hash} = window.location;
			if(String(hash).length <= 1) return;
			if(!this.cloneviewReady) await this.await('cloneviewready');
			try {
				let initMsgs = JSON.parse(decodeURIComponent(hash.replace(/^#/, '')));
				if(!Array.isArray(initMsgs)) initMsgs = [initMsgs];
				for(let msg of initMsgs) {
					msg = Object.assign({includeself: true}, msg)
					console.log('  init msg:', msg);
					await this.sendMsg(msg);
				}
			}
			catch(err) {
				console.error(err);
			}
		};
		P.enableCloneview = async function() {
			//console.info('FeatureStreamTool.enableCloneview();');
			const propNames = ['guestkey', 'hostkey', 'hostname', 'hostcolor'];
			const qs = new URLSearchParams(window.location.search);
			this.cloneviewOpts = Object.fromEntries(propNames.map(k => [k, qs.get(k) || undefined]));
			this.on('open', this.handleCloneViewSocketOpen);
			this.on('close', this.handleCloneViewSocketClose);
			await C.waitForPuzzleLoaded();
			this.connect();
			await this.runInitMsgs();
		};
		P.disableCloneview = function() {
			//console.info('FeatureStreamTool.disableCloneview();');
			this.stopCloneview();
			this.off('open', this.handleCloneViewSocketOpen);
			this.off('close', this.handleCloneViewSocketClose);
			this.close();
		};
	// Puzzle
		P.loadPuzzle = async function(puzzleid) {
			//console.info('FeatureStreamTool.loadPuzzle("%s");', puzzleid);
			const {app, app: {puzzle}} = Framework;
			const ctcPuzzle = await parsePuzzleData(await fetchPuzzle(puzzleid));
			puzzle.puzzleId = undefined;
			await app.loadCTCPuzzle(ctcPuzzle);
			this.currentPuzzleid = puzzleid;
		};
		P.setPuzzle = async function(puzzleid) {
			console.info('FeatureStreamTool.setPuzzle(%s);', JSON.stringify(puzzleid));
			Framework.closeDialog();
			this.currentPuzzleid = puzzleid;
			await this.loadPuzzle(puzzleid);
			this.seq++;
			this.sendSync();
		};
		P.handlePuzzleSelection = function(event) {
			event.preventDefault();
			let {puzzleid} = event.target.dataset;
			if(puzzleid === undefined) puzzleid = resolveSelector('#cloneview_puzzleid')[0].value;
			console.info('FeatureStreamTool.handlePuzzleSelection(%s);', JSON.stringify(puzzleid));
			if(puzzleid === undefined) throw new Error('Invalid puzzleid');
			this.setPuzzle(puzzleid);
		};
		P.handleShowPuzzleMenu = function(opts) {
			//console.info('FeatureStreamTool.handleShowPuzzleMenu(opts);', JSON.stringify(opts));
			//console.log('  this.currentPuzzles:', this.currentPuzzles);
			this.handleMsgUpdatepuzzles(opts);
			let puzzles = Array.isArray(this.currentPuzzles) ? this.currentPuzzles : [];
			Framework.closeDialog();
			const puzzleToLink = p => (Array.isArray(p)
				? `<a href="#" data-puzzleid="${p[0]}">${p[1] || p[0]}</a>`
				: `<a href="#" data-puzzleid="${p}">${p}</a>`
			);
			Framework.showDialog({
				parts: [
					{tag: 'title', innerHTML: 'Switch CloneView Puzzle', style: 'text-align: center'},
					{tag: 'div', id: 'puzzleselector', innerHTML: 
						(puzzles || []).map(puzzleToLink).join('')
					},
					{style: 'margin: 0.25rem 1rem;', children: [
						{tag: 'label', content: 'Puzzle ID (eg: sudokupad/puzzle):', style: 'margin: 0;'},
						{tag: 'input', value: '', id: 'cloneview_puzzleid', style: 'width: 100%;'},
						{tag: 'button', value: '', id: 'cloneview_openpuzzle', content: 'Load Puzzle', style: 'font-size: 1.2rem; padding: 0 1rem; margin: 1rem auto;'},
					]},
					{tag: 'options', options: ['Close']},
				],
				autoClose: true,
				centerOverBoard: true
			});
			resolveSelector('#puzzleselector a, #cloneview_openpuzzle').forEach(elem => elem.addEventListener('click', this.handlePuzzleSelection));
		};
	// Effects
		P.markCell = function(cell) {
			//console.info('FeatureStreamTool.markCell(%s);', cell.toRC());
			const {CellSize} = SvgRenderer;
			const {app: {svgRenderer, svgRenderer: {svgElem}}} = Framework;
			const reScale = /scale\(\s*([0-9.]*)/;
			const boardElem = document.querySelector('.board');
			const scale = parseFloat((boardElem.style.transform.match(reScale) || [])[1]);
			const svgBounds = svgElem.getBoundingClientRect();
			const viewBox = svgElem.getAttribute('viewBox').split(' ').map(val => parseFloat(val));
			const svgOrigin = [svgBounds.left - viewBox[0] * scale, svgBounds.top - viewBox[1] * scale];
			const toBoardRelative = ([x, y]) => [Math.round((x - svgOrigin[0]) / scale), Math.round((y - svgOrigin[1]) / scale)];
			const markerPath = 'M0 20L0 0L20 0M44 0L64 0L64 20M64 44L64 64L44 64M20 64L0 64L0 44';
			const transformPath = (path, ox, oy) => path
				.split(/(?=[ML][0-9]+ [0-9]+)/g)
				.map(str => str.match(/([ML])([0-9]+) ([0-9]+)/))
				.map(([m, l, x, y]) => `${l}${parseInt(x) + ox} ${parseInt(y) + oy}`)
				.join('');
			/*
			svgElem
				.querySelectorAll('#cell-highlights .cage-cellmarker')
				.forEach(elem => elem.remove());
			*/
			let markerAttr = {
				class: 'cage-cellmarker',
				fill: 'rgba(255, 255, 255, 0.4)',
				stroke: 'rgba(0, 126, 255, 0.7)',
				'stroke-width': '8px',
				'stroke-linecap': 'butt',
				'stroke-linejoin': 'round',
				'shape-rendering': 'geometricprecision',
				'vector-effect': 'non-scaling-stroke',
				d: transformPath(markerPath, cell.col * CellSize, cell.row * CellSize)
			};
			let marker = svgRenderer.renderPart({target: 'cell-highlights', type: 'path', attr: markerAttr});
			let mb = bounds(marker);
			let origin = toBoardRelative([mb.x + 0.5 * mb.width, mb.y + 0.5 * mb.height]);
			marker.style.transformOrigin = `${origin[0]}px ${origin[1]}px`;
			if(!this.confettiParent || !this.confettiParent.parent) {
				this.confettiParent = Framework.createElem({class: 'confetti-container', parent: document.body});
			}
			const effect = new EffectConfetti({
				interval: 32, size: 7,
				angJitter: 30, sizeJitter: 20, distJitter: 20, posJitter: 5,
				timeout: 3000,
				parent: this.confettiParent,
			});
			const PI180 = Math.PI / 180;
			const {x, y, width: w, height: h} = cell.elem.getBoundingClientRect();
			const cx = x + w * 0.5, cy = y + h * 0.5;
			let dt = 80;
			for(let ang = 0; ang <= 720; ang += 20) {
				let s = Math.sin(ang * PI180), c = -Math.cos(ang * PI180);
				let from = [cx + s * 0.5 * w, cy + c * 0.5 * h], to = [cx + s * 1.5 * w, cy + c * 1.5 * h];
				setTimeout(() => effect.blastConfetti(from, to, 100), ang / 45 * dt);
				dt *= 0.98;
			}
		};
	// Testing
		C.CamStyle = `
			.topbar {
			}
			.topbar * { opacity: 0; }
			.topbar::after {
				content: "STREAMTOOL OVERLAY";
				display: block;
				position: absolute;
				top: 0; left: 0;
				padding: 0 60px;
				background: no-repeat url(/images/sudokucon-profile-70x70.png);
				background-size: 40px 40px;
			}
			#facecam {
				position: absolute;
				width: 480px;
				top: 40px; right: 0;
			}
			#controls {
			}
			#controls * { opacity: 0; }
			#controls::after {
				opacity: 1;
				content: "SPACE FOR TWITCH CHAT \\A\\A\\A\\A\\A\\A\\A\\A\\A\\A\\A\\A\\A\\A\\A\\A\\A\\A\\A\\A SPACE FOR SPONSOR MESSAGE";
				display: block;
				white-space: pre-wrap;
				position: absolute;
				top: 0; left: 0;
				padding: 0 2rem;
			}
		`;
		P.testCam = async function() {
			console.info('FeatureStreamTool.testCam();');
			const WebCam = (() => {
				function WebCam(opts = {}) {
					bindHandlers(this);
					this.fps = Math.min(60, Math.max(0.1, opts.fps || 1));
					this.video = opts.video;
					this.onReady = opts.onReady;
					this.onFrame = opts.onFrame;
				}
				const P = Object.assign(WebCam.prototype, {constructor: WebCam});
				P.start = async function(camOpts = {}) {
					console.warn('WebCam.start(camOpts);', camOpts);
					const video = this.video;
					video.addEventListener('canplay', this.handleCanPlay);
					try {
						/*
						let devices = [...await window.navigator.mediaDevices.enumerateDevices()]
							.filter(d => d.kind === 'videoinput');
						console.log('  devices:', devices);
						document.querySelector('.puzzle-rules').innerHTML += `<div>${devices.map(d => d.label).join(', ')}</div>`;
						*/
						let stream = await window.navigator.mediaDevices.getUserMedia({
								audio: false,
								/*
								video: Object.assign({
									//facing: 'environment',
									//facingMode: 'environment',
									//width: { ideal: 640 },
									//height: { ideal: 480 } 
								}, camOpts)
								*/
								video: true
							})
						this.handleMediaStream(stream);
						//document.querySelector('.puzzle-rules').innerHTML += `<div>stream ${stream.toString()}</div>`;
					}
					catch(err) {
						console.log('There was an error 😱', err);
						//document.querySelector('.puzzle-rules').innerHTML += `<div>Error ${err.toString()}</div>`;
						this.handleGetUserMediaError(err);
					}
				};
				P.stop = function() {
					console.warn('WebCam.stop();', );
					const video = this.video;
					const stream = this.stream;
					video.pause();
					if(stream && stream.getTracks) {
						const track = (stream.getTracks() || [])[0];
						if(track && track.stop) {
							track.stop();
						}
					}
					video.srcObject = undefined;
					video.src = '';
				};
				P.handleMediaStream = function(stream) {
					console.warn('WebCam.handleMediaStream(stream);', stream);
					const video = this.video;
					this.stream = stream;
					video.srcObject = stream;
					video.play();
				};
				P.handleCanPlay = function(event) {
					console.warn('WebCam.handleCanPlay(stream);', event);
					if(typeof this.onReady === 'function') this.onReady(this);
					this.frameTime = Date.now();
					this.handleVideoFrame();
				};
				P.handleVideoFrame = function() {
					const video = this.video;
					if(video.paused) return;
					const targetDelay = Math.round(1000 / this.fps);
					const now = Date.now();
					const actualDelay = Math.max(0, targetDelay - (now - this.frameTime));
					this.frameTime = now;
			  	setTimeout(this.handleVideoFrame, actualDelay);
					if(typeof this.onFrame === 'function') this.onFrame(this);
				};
				P.handleGetUserMediaError = function(err) {
					console.error('WebCam.handleGetUserMediaError:', err);
				};
				return WebCam;
			})();
			function handleBodyClick(event) {
				console.warn('FeatureStreamTool.testCam > handleBodyClick');
				document.body.removeEventListener('click', handleBodyClick);
				cam.start();
			}
			async function handleCamReady(event) {
				console.warn('FeatureStreamTool.testCam > handleCamReady');
				await attachStylesheet(C.CamStyle);
			}
			document.body.insertAdjacentHTML('beforeend', `<video id="facecam" playsinline></video>`);
			let cam = new WebCam({
				fps: 30,
				video: document.getElementById('facecam'),
				onReady: handleCamReady,
				//onFrame: handleCamFrame,
			});
			//document.body.addEventListener('click', handleBodyClick);
			document.title = 'StreamTool Overlay';
			cam.start();
		};
		P.handleInitTestCam = async function() {
			if(new URLSearchParams(document.location.search).get('testcam') === '1') this.testCam();
		};
		
	return C;
})();

FeatureStreamTool.create();