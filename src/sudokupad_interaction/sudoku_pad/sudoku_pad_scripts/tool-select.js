
const ToolSelect = {
	tool: {
		name: 'select',
		isTool: false,
		selectMode: false,
		init: function() {
			this.handleToggle = this.handleToggle.bind(this);
			this.handleUpdateKeys = this.handleUpdateKeys.bind(this);
			addDownEventHandler('#control-select', this.handleToggle, {passive: false});
		},
		handleToggle: function(event) {
			if(event) event.stopPropagation();
			this.selectMode = !this.selectMode;
			document.querySelector('#control-select').classList.toggle('selectedperm', this.selectMode);
			if(this.selectMode) {
				if(this.__updateKeys === undefined) this.__updateKeys = Framework.app.updateKeys;
				Framework.app.updateKeys = this.handleUpdateKeys;
			}
			else {
				if(this.__updateKeys !== undefined) Framework.app.updateKeys = this.__updateKeys;
				this.__updateKeys = undefined;
			}
		},
		handleUpdateKeys: function(event) {
			this.__updateKeys.call(Framework.app, event);
			if(!event.type.match(/key/)) Framework.app.controlPressed = true;
		},
	}
};
