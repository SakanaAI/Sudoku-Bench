function PortableEvents() {
	var self = this;
	var _events = {};
	function addEventListener(type, handler) {
		if(typeof type === 'string' && typeof handler === 'function') {
			_events[type] = _events[type] || [];
			_events[type].push(handler);
		} else throw new Error('Invalid arguments to EventDispatcher.addEventListener(type, handler)');
		return self;
	}
	function removeEventListener(type, handler) {
		var idx = -1;
		if(_events[type] === undefined) return self;
		if(handler === undefined) {
			_events[type].length = 0;
		} else if((idx = _events[type].indexOf(handler)) !== -1) {
			_events[type].splice(idx, 1);
		}
		return self;
	}
	async function awaitEventListener(type, timeoutMs) {
		return await new Promise((resolve, reject) => {
			addEventListener(type, resolve);
			if(timeoutMs !== undefined) setTimeout(() => reject(`Event "${type}" timed out.`), timeoutMs);
		});
	}
	function dispatchEvent(event) {
		var type, args, handlers;
		if(typeof event === 'object' && typeof event.type === 'string') {
			type = event.type;
			args = [event];
		} else if(typeof event === 'string') {
			type = event;
			args = Array.prototype.slice.call(arguments, 1);
		} else throw new Error('Invalid arguments to EventDispatcher.dispatchEvent(...)');
		if(!(handlers = _events[type]) || handlers.length === 0) return false;
		handlers = handlers.slice();
		for(var i = 0, l = handlers.length; i < l; i++) {
			handlers[i].apply(self, args);
		}
		return true;
	}
	function getEventListeners(type) {
		if(type === undefined) return _events;
		return _events[type];
	}
	Object.defineProperties(self, {
		// DOM naming convention
		addEventListener: { value: addEventListener, enumerable: true},
		removeEventListener: { value: removeEventListener, enumerable: true},
		dispatchEvent: { value: dispatchEvent, enumerable: true},
		// jQuery naming convention
		on: { value: addEventListener, enumerable: true},
		off: { value: removeEventListener, enumerable: true},
		await: { value: awaitEventListener, enumerable: true},
		trigger: { value: dispatchEvent, enumerable: true},
		getEventListeners: { value: getEventListeners, enumerable: true},
	});
}
PortableEvents.mixin = function(obj) {
	PortableEvents.apply(obj);
	return obj;
};
