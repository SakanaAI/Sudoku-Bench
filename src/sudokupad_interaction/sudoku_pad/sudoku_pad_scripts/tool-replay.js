
const ToolReplay = {
	button: {
		name: 'replay', title: 'Replay',
		content: `<div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M5.58 16.89l5.77-4.07c.56-.4.56-1.24 0-1.63L5.58 7.11C4.91 6.65 4 7.12 4 7.93v8.14c0 .81.91 1.28 1.58.82zM13 7.93v8.14c0 .81.91 1.28 1.58.82l5.77-4.07c.56-.4.56-1.24 0-1.63l-5.77-4.07c-.67-.47-1.58 0-1.58.81z"/></svg></div>Replay`,
	},
	tool: {
		name: 'replay',
		isTool: true,
		getReplay: function() {
			this.replay = Replay.decode(Framework.app.getReplay());
			this.replayTotalTime = Puzzle.replayLength({actions: this.replay.actions});
			this.replayCurrentTime = this.replayTotalTime;
		},
		setState: function(state) {
			let {classList} = document.body;
			[...classList]
				.filter(name => /^replay-/.test(name))
				.forEach(name => classList.remove(name));
			this.state = state;
			if(this.state !== undefined) classList.add(`replay-${this.state}`);
		},
		updateTimer: function() {
			const {app} = Framework;
			app.timer.setStartTime(Date.now() - this.replayCurrentTime);
			app.timer.stop();
			document.documentElement.style.setProperty('--tool-text', 
				`"${[
					`Time: ${Timer.formatTime(this.replayCurrentTime)} / ${Timer.formatTime(this.replayTotalTime)}`,
					`Actions: ${app.puzzle.replayStack.length} / ${this.replay.actions.length}`
					].join('\\A ')}"`);
		},
		play: function(playToTime = -1, speed = -1) {
			const {puzzle} = Framework.app;
			if(playToTime === -1) playToTime = this.replayTotalTime;
			let playStart = Date.now();
			let playFromTime = this.replayCurrentTime;
			const handleOnCompleted = () => {
				this.setState('paused');
				clearInterval(this.timerIntervalId);
			};
			const handleTimerInterval = () => {
				let elapsed = Date.now() - playStart;
				this.replayCurrentTime = playFromTime + elapsed * speed;
				this.updateTimer();
			};
			clearInterval(this.timerIntervalId);
			playToTime = Math.max(0, Math.min(this.replayTotalTime, playToTime));
			let replayOpts = {speed, playFromTime, playToTime};
			if(speed !== -1) replayOpts.onCompleted = handleOnCompleted;
			this.replayCurrentTime = playToTime;
			if(speed !== -1) {
				this.timerIntervalId = setInterval(handleTimerInterval, 50);
				handleTimerInterval();
				this.setState('playing');
			}
			puzzle.replayPlay(this.replay, replayOpts);
			this.updateTimer();
		},
		jumpTo: function(time) {
			this.play(time);
			this.setState('paused');
		},
		pause: function() {
			const {puzzle} = Framework.app;
			this.setState('paused');
			this.jumpTo(Puzzle.replayLength({actions: puzzle.replayStack}));
		},
		playPause: function(playToTime, speed) {
			if(this.state === 'playing') return this.pause();
			this.play(playToTime, speed);
		},
		init: function() {
			const handleProgressLoaded = () => {
				if(Framework.app.tool !== 'replay') return;
				this.getReplay();
				this.updateTimer();
			};
			Framework.app.puzzle.on('progressloaded', handleProgressLoaded);
			this.setState('paused');
		},
		handleToolEnter: function() {
			this.active = true;
			this.getReplay();
		},
		handleToolExit: function() {
			this.active = false;
			Framework.app.timer.resume();
		},
		handleToolButton: function(button) {
			const {puzzle} = Framework.app;
			switch(button) {
				case '1': this.jumpTo(0); break;
				case '2': this.playPause(-1, 10); break;
				case '3': this.jumpTo(this.replayTotalTime); break;
				case '4': this.jumpTo(this.replayCurrentTime - 5000); break;
				case '6': this.jumpTo(this.replayCurrentTime + 5000); break;
				case '7': this.jumpTo(this.replayCurrentTime - 30000); break;
				case '9': this.jumpTo(this.replayCurrentTime + 30000); break;
			}
			return true;
		},
		handleDragStart: function() { // disable selecting
		}
	}
};

Framework.addSetting({tag: 'toggle', group: 'experimental', name: 'toolreplay', content: 'Show Replay Tool', onToggle: Framework.makeToolToggler(ToolReplay)});
