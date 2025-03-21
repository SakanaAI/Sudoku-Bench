
const FeatureHairGag = (() => {
	
	function FeatureHairGag() {
		bindHandlers(this);
		this.featureStylesheet = undefined;
		this.featureEnabled = false;
	}
	const C = FeatureHairGag, P = Object.assign(C.prototype, {constructor: C});
	C.SettingName = 'hairgag';
	C.featureStyle = ``;
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
	// Pushable
		P.insertPushable = function() {
			const {pushable} = this;
			if(pushable.el) el.remove();
			document.body.insertAdjacentHTML('beforeend', `<div id="pushable"></div>`);
			pushable.el = document.querySelector('#pushable');
			Object.assign(pushable.el.style, {
				position: 'absolute',
				left: '-20000px', top: '-20000px',
				width: '1cm', height: '1cm',
				'z-index': 9000,
				'pointer-events': 'none',
				background: `center/contain no-repeat url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAAwCAMAAADAQ2FbAAAAXVBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC5BxTwAAAAH3RSTlMAoZoai3djM6aULgqekIFtTB+tg3ppWEg+NyQQtoYngfkOTAAAAJFJREFUKM+NzkkSgzAMRFEwng22mack9z9m9l9VIVq+klrdPE1HcA4QN56UBDERYC1TNf+okyED4H6xnM6sMrHKewakiSmrYhe/A6Lnilko7QG4xNGqKYMVMQ4wtlyponARwdk8vwqVohyl/4iC4x9yiZwofh2UsFF0oZiZYgPl7BtRqBPvKyUvlN1TUribX/MFILEESqUFgTIAAAAASUVORK5CYII=)`,
				'transform-origin': 'center',
				transform: `rotate(${pushable.angle}deg)`,
			});
		};
		P.handleUpdatePushable = function() {
			const {pushable: {el, pos, delta, angle}} = this;
			const x = Math.round(pos[0] + delta[0] - window.screenX),
						y = Math.round(pos[1] + delta[1] - window.screenY);
			Object.assign(el.style, {left: `${x}px`, top: `${y}px`, transform: `rotate(${angle}deg)`});
		};
		P.handlePushStart = function() {
			const {pushable, pushable: {el, pointerDown, pointerMove, pos, delta}} = this;
			pointerDown.splice(0, 2, ...pointerMove);
			pushable.pushing = true;
			pushable.rotateDir = Math.random() >= 0.5 ? 1 : -1;
			pushable.pushRatio = 0.65 + 0.3 * Math.random();
			pos[0] += delta[0];
			pos[1] += delta[1];
			delta[0] = 0; delta[1] = 0;
		};
		P.handlePushStop = function() {
			const {pushable} = this;
			pushable.pushing = false;
		};
		P.handlePushMove = function(event) {
			const {pushable, pushable: {el, pushing, pointerDown, pointerMove, delta, pushRatio, rotateDir}} = this,
						{pageX, pageY, radiusX} = event.touches ? event.touches[0] : event,
						{left, top, width, height} = el.getBoundingClientRect(),
						size = width + (radiusX || 0),
						xy = [left + 0.5 * width, top + 0.5 * height];
			pointerMove.splice(0, 2, pageX, pageY);
			const shouldPush = event.buttons !== 0 && calcDistanceArr(xy, pointerMove) <= 0.5 * size;
			if(!pushing && shouldPush) this.handlePushStart();
			else if(pushing && !shouldPush) this.handlePushStop();
			if(!pushing) return;
			const nextHD = [
				pushRatio * (pointerMove[0] - pointerDown[0]),
				pushRatio * (pointerMove[1] - pointerDown[1])
			];
			pushable.angle += rotateDir * calcDistanceArr(delta, nextHD);
			delta.splice(0, 2, ...nextHD);
		};
		P.removePushable = function() {
			const {pushable: {el, intervalId}} = this;
			if(el) el.remove();
			clearInterval(intervalId);
			removeDownEventHandler(window, this.handlePushMove, {capture: true});
			removeMoveEventHandler(window, this.handlePushMove, {capture: true});
			removeUpEventHandler(window, this.handlePushStop, {capture: true});
		};
		P.initPushable = function() {
			const {width, height} = document.querySelector('.game').getBoundingClientRect(),
						pushable = this.pushable = {
				el: undefined,
				intervalId: undefined,
				pos: [
					Math.floor(window.screenX + (0.1 + 0.7 * Math.random()) * width),
					Math.floor(window.screenY + (0.1 + 0.7 * Math.random()) * height),
				],
				delta: [0, 0],
				pointerDown: [0, 0],
				pointerMove: [0, 0],
				angle: Math.round(360 * Math.random()),
				rotateDir: 1,
				pushRatio: 1,
				pushing: false,
			};
			this.insertPushable();
			this.handleUpdatePushable();
			clearInterval(pushable.intervalId);
			pushable.intervalId = setInterval(this.handleUpdatePushable, 16);
			addDownEventHandler(window, this.handlePushMove, {capture: true});
			addMoveEventHandler(window, this.handlePushMove, {capture: true});
			addUpEventHandler(window, this.handlePushStop, {capture: true});
		};
	// Feature
		P.attachElem = function() {
			if(this.featureEnabled) return;
			this.featureEnabled = true;
			this.initPushable();
		};
		P.detachElem = function() {
			if(!this.featureEnabled) return;
			this.featureEnabled = false;
			this.removePushable();
		};
	// Setting
		P.handleSettingChange = function() {
			let setting = Framework.getSetting(C.SettingName);
			setting ? this.attachElem() : this.detachElem();
		};
		P.handleInit = function() {
			Framework.addSetting({
				group: 'experimental', name: C.SettingName, content: 'Enable Hair Gag',
				tag: 'toggle',
				onToggle: this.handleSettingChange,
			});
		};
	
	return C;
})();

FeatureHairGag.create();