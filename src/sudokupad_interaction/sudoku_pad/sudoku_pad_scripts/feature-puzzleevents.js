var FeaturePuzzleEvents = (() => {
	
	// Triggers
		const PuzzleTriggerThreeInTheCorner = (() => {
			function PuzzleTriggerThreeInTheCorner() {
				bindHandlers(this);
				this.queue = [];
				this.timeoutId = undefined;
			}
			const C = PuzzleTriggerThreeInTheCorner, P = Object.assign(C.prototype, {constructor: C});
			C.triggerTimeout = 1000;
			C.cornerRCs = ['r1c1', 'r1c9', 'r9c1', 'r9c9'];
			P.isCellThreeInTheCorner = function(cell) {
				return cell.propGet('normal') === '3' && C.cornerRCs.includes(cell.toRC());
			};
			P.handleTrigger = function() { throw new Error('handleTrigger not assigned'); };
			P.handleInit = function(handleTrigger) { this.handleTrigger = handleTrigger; };
			P.handleLoad = function() {
				let {app: {puzzle}} = Framework;
				let [min, max] = puzzle.getMinMaxRC();
				C.cornerRCs = [
					`r${min[0]+1}c${min[1]+1}`,
					`r${min[0]+1}c${max[1]+1}`,
					`r${max[0]+1}c${min[1]+1}`,
					`r${max[0]+1}c${max[1]+1}`,
				];
			};
			P.handleTimeout = function() {
				const now = Date.now();
				const {triggerTimeout} = C;
				let {queue, timeoutId, handleTimeout} = this;
				this.timeoutId = undefined;
				queue.forEach(([cell, time]) => {
					let dt = now - time;
					if(this.isCellThreeInTheCorner(cell) && dt >= triggerTimeout) {
						let bounds = cell.elem.getBoundingClientRect();
						this.handleTrigger(this, {
							x: bounds.x + 0.5 * bounds.width,
							y: bounds.y + 0.5 * bounds.height
						});
					}
				});
				this.queue = queue = queue.filter(([cell, time]) => now - time < triggerTimeout);
				if(queue.length > 0) {
					let timeToNext = triggerTimeout - (now - queue[0][1]);
					this.timeoutId = setTimeout(this.handleTimeout, timeToNext);
				}
			};
			P.handleAct = function(action) {
				if(!['value', 'clear'].includes(action.type)) return;
				let {app, app: {puzzle, puzzle: {selectedCells}}} = Framework;
				let {queue, timeoutId, triggerTimeout, handleTimeout} = this;
				this.queue = queue = queue.filter(([cell, time]) => cell.propGet('normal') === '3');
				if(action.type === 'value' && action.arg === '3') {
					let haveThree = selectedCells
						.filter(this.isCellThreeInTheCorner)
						.filter(cell => !queue.find(([c, t]) => c === cell));
					if(haveThree.length > 0) {
						let time = Date.now();
						queue.push(...haveThree.map(cell => [cell, time]));
						if(timeoutId === undefined) this.timeoutId = setTimeout(handleTimeout, triggerTimeout);
					}
				}
			};
			return C;
		})();
		const PuzzleTriggerBDaySpecial = (() => {
			function PuzzleTriggerBDaySpecial() {
				bindHandlers(this);
				this.queue = [];
				this.timeoutId = undefined;
				this.enabled = false;
				this.isOnCooldown = false;
				this.cooldownTimeoutId;
			}
			const C = PuzzleTriggerBDaySpecial, P = Object.assign(C.prototype, {constructor: C});
			C.triggerTimeout = 1000;
			C.triggerCooldown = 5000;
			C.cornerRCs = ['r1c1', 'r1c9', 'r9c1', 'r9c9'];
			C.triggerSolutionDigest = 'caf35df6910c44dc38f15b89599e0cfc';
			P.isCellThreeInTheCorner = function(cell) {
				return cell.propGet('normal') === '3' && C.cornerRCs.includes(cell.toRC());
			};
			P.handleTrigger = function() { throw new Error('handleTrigger not assigned'); };
			P.handleInit = function(handleTrigger) { this.handleTrigger = handleTrigger; };
			P.handleLoad = function() {
				let {app: {puzzle, currentPuzzle: {cages, solution = ''}}} = Framework;
				let [min, max] = puzzle.getMinMaxRC();
				C.cornerRCs = [
					`r${min[0]+1}c${min[1]+1}`,
					`r${min[0]+1}c${max[1]+1}`,
					`r${max[0]+1}c${min[1]+1}`,
					`r${max[0]+1}c${max[1]+1}`,
				];
				if(C.triggerSolutionDigest === md5Digest(solution)) this.enabled = true;
			};
			P.handleCooldownTimeout = function() {
				clearTimeout(this.cooldownTimeoutId);
				this.isOnCooldown = false;
			};
			P.startCooldown = function() {
				clearTimeout(this.cooldownTimeoutId);
				this.cooldownTimeoutId = setTimeout(this.handleCooldownTimeout, C.triggerCooldown);
				this.isOnCooldown = true;
			};
			P.handleTimeout = function() {
				const now = Date.now();
				const {triggerTimeout} = C;
				let {queue, timeoutId, handleTimeout} = this;
				this.timeoutId = undefined;
				if(!this.isOnCooldown) {
					queue.forEach(([cell, time]) => {
						let dt = now - time;
						if(this.isCellThreeInTheCorner(cell) && dt >= triggerTimeout) {
							let bounds = cell.elem.getBoundingClientRect();
							this.handleTrigger(this, {
								x: bounds.x + 0.5 * bounds.width,
								y: bounds.y + 0.5 * bounds.height
							});
							this.startCooldown();
						}
					});
				}
				this.queue = queue = queue.filter(([cell, time]) => now - time < triggerTimeout);
				if(queue.length > 0) {
					let timeToNext = triggerTimeout - (now - queue[0][1]);
					this.timeoutId = setTimeout(this.handleTimeout, timeToNext);
				}
			};
			P.handleAct = function(action) {
				if(!this.enabled) return;
				if(!['value', 'clear'].includes(action.type)) return;
				let {app, app: {currentPuzzle: {solution = ''}, puzzle, puzzle: {selectedCells}}} = Framework;
				let {queue, timeoutId, triggerTimeout, handleTimeout} = this;
				this.queue = queue = queue.filter(([cell, time]) => cell.propGet('normal') === '3');
				if(action.type === 'value' && action.arg === '3') {
					let haveThree = selectedCells
						.filter(this.isCellThreeInTheCorner)
						.filter(cell => !queue.find(([c, t]) => c === cell));
					if(haveThree.length > 0) {
						let time = Date.now();
						queue.push(...haveThree.map(cell => [cell, time]));
						if(timeoutId === undefined) this.timeoutId = setTimeout(handleTimeout, triggerTimeout);
					}
				}
			};
			return C;
		})();
	
	// Effects
		const EffectConfetti = (() => {
			function EffectConfetti(config) {
				this.config = Object.assign({}, C.DefaultConfig, config);
			}
			const C = EffectConfetti, P = Object.assign(C.prototype, {constructor: C});
			C.DefaultConfig = {
				interval: 16, timeout: 3000,
				size: 10, posJitter: 0, angJitter: 0, distJitter: 0, sizeJitter: 0,
				var_color: ['#EF2964', '#00C09D', '#2D87B0', '#48485E','#EFFF1D'],
				var_animation: [
					'confetti-slow 2.25s ease-out 1 forwards',
					'confetti-medium 1.75s ease-out 1 forwards',
					'confetti-fast 1.25s ease-out 1 forwards',
				],
			};
			C.getJitter = jitter => Math.round((Math.random() - 0.5) * jitter);
			C.getAngDist = ([x0, y0], [x1, y1]) => {
				let dx = x0 - x1, dy = y0 - y1;
				return [
					Math.atan2(dy, dx) * 180 / Math.PI + 90,
					Math.round(Math.sqrt(dx * dx + dy * dy))
				];
			};
			P.fireConfetti = function(from, to) {
				const {parent, colors, anims, timeout, posJitter, angJitter, distJitter, size, sizeJitter, cssClass} = this.config;
				let x = from[0] + C.getJitter(posJitter), y = from[1] + C.getJitter(posJitter),
						dx = x - to[0], dy = y - to[1],
						[ang, dist] = C.getAngDist(from, to),
						confSize = size + C.getJitter(sizeJitter);
				ang += C.getJitter(angJitter);
				dist += C.getJitter(distJitter);
				let elem = document.createElement('div');
				Object.assign(elem.style, {width: `${dist}px`, height: `${confSize}px`, left: `${x}px`, top: `${y}px`, transform: `rotate(${ang}deg)`});
				let classes = [`confetti`];
				if(cssClass) classes.push(cssClass);
				elem.classList.add(...classes);
				for(const [prop, vals] of Object.entries(this.config)) if(prop.startsWith('var_')) {
					elem.style.setProperty(`--confetti-${prop.slice(4)}`, vals[Math.floor(Math.random() * vals.length)]);
				}
				setTimeout(() => elem.remove(), timeout);
				parent.appendChild(elem);
				return elem;
			};
			P.blastConfetti = function(from, to, duration = 500) {
				const {interval} = this.config;
				let intervalId = setInterval(this.fireConfetti.bind(this, from, to), interval);
				setTimeout(() => clearInterval(intervalId), duration);
			};
			P.startConfettiGun = function(from, to) {
				const {interval} = this.config;
				clearInterval(this.confettiGunId);
				this.confettiGunId = setInterval(this.fireConfetti.bind(this, from, to), interval);
			};
			P.stopConfettiGun = function() {
				clearInterval(this.confettiGunId);
				delete this.confettiGunId;
			};
			return C;
		})();
		const PuzzleEffectConfetti = (() => {
			function PuzzleEffectConfetti() {
				bindHandlers(this);
				this.confettiRunning = false;
				this.confetti = new EffectConfetti({
					interval: 16, size: 10,
					angJitter: 30, sizeJitter: 20, distJitter: 20, posJitter: 10,
				});
			}
			const C = PuzzleEffectConfetti, P = Object.assign(C.prototype, {constructor: C});
			P.handleRemoveConfettiContainer = function() {
				if(this.confettiRunning || this.containerEl === undefined) return;
				this.containerEl.remove();
				delete this.containerEl;
				this.confettiRunning = false;
			};
			P.trigger = function(pos) {
				if(this.containerEl === undefined) {
					const containerEl = document.createElement('div');
					containerEl.classList.add('confetti-container');
					document.body.appendChild(containerEl);
					this.containerEl = containerEl;
					this.confetti.config.parent = this.containerEl;
					this.confetti.config.timeout = 3000;
				}
				this.confettiRunning = true;
				let bb = bounds(Framework.app.svgRenderer.svgElem),
						from = [pos.x, pos.y],
						to =   [Math.round(bb.left + 0.5 * bb.width), Math.round(bb.top + 0.5 * bb.height)];
				this.confetti.blastConfetti(from, to, 1500);
				clearTimeout(this.confettiTimeoutId);
				this.confettiTimeoutId = setTimeout(this.handleRemoveConfettiContainer, 3000);
			};
			return C;
		})();
		const PuzzleEffectSnowCannon = (() => {
			function PuzzleEffectSnowCannon() {
				bindHandlers(this);
				this.confettiRunning = false;
				this.confetti = new EffectConfetti({
					interval: 16, timeout: 3000,
					size: 25, posJitter: 30, angJitter: 70, distJitter: 30, sizeJitter: 10,
					cssClass: 'snowflake',
					var_color: ['#99b8ff', '#d1e3ff', '#c6efff', '#c6efff', '#eaeaea', '#eaeaea', '#f9f9f9', '#f9f9f9'],
					var_animation: [
						'confetti-slow 2.25s ease-out 1 forwards',
						'confetti-medium 1.75s ease-out 1 forwards',
						'confetti-fast 1.25s ease-out 1 forwards',
					],
					var_maskimage: [
						`url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3e%3cpath d='m38.9 74.5 16.7-9.7-16.7-9.6L25.3 63l-4.2-7.2 9.4-5.4-13.7-8 4.2-7.2 13.7 7.9V32.3h8.4v15.6l16.7 9.7V38.2l-13.5-7.7 4.2-7.3 9.3 5.4V12.8h8.4v15.8l9.3-5.4 4.2 7.3-13.5 7.7v19.4l16.7-9.7V32.3h8.4v10.8l13.7-7.9 4.2 7.2-13.7 8 9.4 5.4-4.2 7.2-13.6-7.8-16.7 9.6 16.7 9.7 13.6-7.8 4.2 7.3-9.4 5.4 13.7 7.9-4.2 7.3-13.7-8v10.8h-8.4V81.8l-16.7-9.7v19.4l13.5 7.8-4.2 7.2-9.3-5.4V117h-8.4v-15.9l-9.3 5.4-4.2-7.2 13.5-7.8V72.1l-16.7 9.7v15.6h-8.4V86.6l-13.7 8-4.2-7.3 13.7-7.9-9.4-5.4 4.2-7.3z'/%3e%3c/svg%3e")`,
						`url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3e%3cpath d='M59.8 34.3V12.8h8.4v21.5l20.3-11.8v23.4L107 35.2l4.2 7.2-18.6 10.8L113 64.9 92.7 76.6l18.5 10.7-4.2 7.3-18.5-10.8v23.6L68.2 95.6V117h-8.4V95.6l-20.3 11.8V83.8L21 94.6l-4.2-7.3 18.5-10.7L15 64.9l20.4-11.7-18.6-10.8 4.2-7.2 18.5 10.7V22.5zm0 9.6L47.9 37v13.7l11.9 6.9zm20.3 6.9V37l-11.9 6.9v13.8zM55.6 65l-11.9-6.9-12 6.9 11.9 6.8zm40.7 0-12-6.9L72.4 65l11.9 6.9zM59.9 86V72.2l-12 6.9v13.8zm20.4-6.9-12-6.9V86l12 6.9z'/%3e%3c/svg%3e")`,
						`url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3e%3cpath d='M59.8 19.8v-7h8.4V20l9.8-5.6 6.9 12-16.7 9.7v21.4l18.7-10.8V27.3h14v11.4L107 35l4.2 7.3-6.4 3.7 9.8 5.6-7 12.1-16.7-9.6-18.6 10.7L91 75.6l16.7-9.7 7 12.1-9.8 5.6 6.2 3.7-4.2 7.2-6.4-3.7v11.3H86.6V82.7L68.2 72.1v21.2l16.7 9.7-6.9 12.1-9.8-5.6v7.2h-8.4v-7l-9.8 5.6-6.9-12.1 16.7-9.7V72L41.3 82.6V102h-14V90.7L21 94.4l-4.2-7.2 6.1-3.6-9.7-5.6 7-12.2 16.7 9.7 18.7-10.7L37 54.1l-16.7 9.7-7-12.1 9.8-5.6-6.4-3.7 4.1-7.3 6.3 3.6V27.4H41v19.4l18.8 10.8V35.9l-16.7-9.7L50 14.1z'/%3e%3c/svg%3e")`,
						`url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3e%3cpath d='M64 48.6V17.8q-2.9 0-6.4 3.1-2 1.8-2 6.5 0 5.7 2.5 9.2 3.9 5.1 5.9 12zm11 15.5-1.2.8 1.2.8q3.7 2.2 10.8 2.2l4.8-.2 2.4-.1q6.3 0 11.1 2.8 6.5 3.7 7.7 8.8.8 3 .8 5.8 0 3.9-1.7 7-3.1 5.2-10.7 7.3-1.4.4-2.9.4-3.9 0-8.5-2.7-5.8-3.3-9.1-10.4-4.4-9.6-9.6-12.5l-1.2-.7v1.4q0 5.9 6 14.5 4.5 6.5 4.5 13.2 0 7.4-3.8 11Q69.9 119 64 119q-6.1 0-11.6-5.5-3.8-3.8-3.8-11 0-6.7 4.5-13.2 6-8.6 6-14.5v-1.4l-1.2.7q-5 2.8-9.6 12.5-3.4 7.1-9.1 10.4-4.6 2.7-8.5 2.7-1.5 0-2.9-.4Q20.1 97 17.1 92q-1.7-3.1-1.7-7 0-2.8.8-5.8 1.2-5.1 7.7-8.8 4.8-2.8 11.1-2.8l2.4.1 4.8.2q7.1 0 10.8-2.2l1.2-.8-1.2-.8Q49.4 62 42.4 62l-5 .2-2.4.1q-6.3 0-11.1-2.8-6.3-3.6-7.7-8.8-.9-3-.9-5.7 0-4 1.8-7.1 3-5 10.7-7.3 1.4-.4 2.9-.4 3.9 0 8.5 2.7 5.8 3.3 9.1 10.4 4.4 9.6 9.6 12.5l1.2.7v-1.4q0-5.9-6-14.6-4.5-6.4-4.5-13.1 0-7.4 3.8-11 5.7-5.5 11.6-5.5 5.9 0 11.6 5.5 3.8 3.6 3.8 11 0 6.7-4.5 13.1-6 8.7-6 14.6v1.4l1.2-.7q5-2.8 9.6-12.5 3.4-7.2 9.1-10.4 4.6-2.7 8.5-2.7 1.5 0 2.9.4 7.6 2.1 10.7 7.3 1.7 3.1 1.7 7 0 2.8-.8 5.8-1.2 5.1-7.7 8.8-4.8 2.8-11.1 2.8l-2.4-.1-5-.2q-7 0-10.6 2.1zM64 81.2V112q2.9 0 6.4-3 2-1.8 2-6.5 0-5.7-2.5-9.2Q66 88.2 64 81.2zm14.1-24.4 26.7-15.4q-1.5-2.5-5.8-4-.7-.3-1.6-.3-2.1 0-5.1 1.8-4.9 2.8-6.7 6.8-2.5 5.9-7.5 11.1zM49.9 73.1 23.2 88.5q1.5 2.5 5.8 4 .7.3 1.6.3 2.1 0 5.1-1.8 4.9-2.8 6.7-6.8 2.5-6 7.5-11.1zm0-16.3L23.2 41.4q-.9 1.6-.9 3.9 0 1.5.4 3.1.5 2.8 4.6 5.1 4.2 2.4 7.9 2.4l1.3-.1q2-.2 4.1-.2 4.5 0 9.3 1.2zm28.2 16.3 26.7 15.4q.9-1.6.9-3.9 0-1.5-.4-3.1-.5-2.8-4.6-5.1-4.2-2.4-7.9-2.4l-1.3.1q-2 .2-4.1.2-4.5 0-9.3-1.2z'/%3e%3c/svg%3e")`,
						`url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3e%3cpath d='M71.4 57.2q3.1 3.1 3.1 7.4 0 4.4-3.1 7.4-3.1 3.1-7.4 3.1-4.3 0-7.4-3.1-3.1-3-3.1-7.4 0-4.3 3.1-7.4 3.1-3 7.4-3 4.3 0 7.4 3zm32.4 41.4-5.9 6-27.1-27.1 6-6zM57 51.9l-5.9 5.8-26.9-26.9 5.9-5.9zM97.9 25l5.9 5.9-27 27.1-6-6zM51.2 71.9l5.9 5.9-26.9 26.9-5.9-5.9zm12.9-21.1q-4-4.2-5-5.9-1.6-2.6-1.9-7.3l-.1-7.8.1-6.9q.3-4.5 1.3-6.7 1.6-3.5 5.6-3.5 4 0 5.6 3.5 1 2.2 1.2 6.7.2 2.1.2 6.9l-.1 7.8q-.3 4.7-1.9 7.3-1 1.7-5 5.9zm0 30.2q4 4.2 5 5.8 1.6 2.6 1.9 7.4l.1 7.7q0 4.8-.2 6.9-.2 4.6-1.2 6.8-1.6 3.4-5.6 3.4-4 0-5.6-3.4-1-2.2-1.3-6.8l-.1-6.9.1-7.7q.3-4.8 1.9-7.4 1-1.6 5-5.8zM49 65.9q-4.2 4-5.9 5-2.5 1.6-7.3 1.9l-7.7.1q-4.9 0-7-.2-4.5-.2-6.7-1.2-3.4-1.6-3.4-5.6 0-4 3.4-5.6 2.2-1.1 6.7-1.3l7-.1 7.7.1q4.8.2 7.3 1.9 1.7 1 5.9 5zm30.2 0q4.2-4 5.8-5 2.6-1.7 7.4-1.9l7.7-.1 6.9.1q4.6.2 6.8 1.3 3.4 1.6 3.4 5.6 0 4-3.4 5.6-2.2 1-6.8 1.2-2.1.2-6.9.2l-7.7-.1q-4.8-.3-7.4-1.9-1.6-1-5.8-5z'/%3e%3c/svg%3e")`,
						`url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3e%3cpath d='M75.1 53.5q4.6 4.6 4.6 11.1t-4.6 11.1q-4.6 4.6-11.1 4.6t-11.1-4.6q-4.6-4.6-4.6-11.1t4.6-11.1q4.6-4.6 11.1-4.6t11.1 4.6zm-45 51.1-5.9-6 20.7-20.7 6 5.9zm52.9-53-5.9-5.9L97.8 25l5.9 5.9zM24.2 30.9l5.9-6 20.7 20.8-5.9 5.9zm52.9 53 6-5.9 20.7 20.7-5.9 5.9zm-1.9-62.1q1.3 3.4 1.3 7.3t-1.3 7.4q-1.5 3.8-4.2 6.2-3.2 2.8-7 2.8-3.9 0-7.1-2.8-2.7-2.4-4.2-6.2-1.3-3.5-1.3-7.4 0-3.9 1.3-7.3 1.5-3.9 4.2-6.3 3.2-2.8 7.1-2.8 3.8 0 7 2.8 2.7 2.4 4.2 6.3zm0 73.4q1.3 3.5 1.3 7.4 0 3.9-1.3 7.3-1.5 3.8-4.2 6.3-3.2 2.8-7 2.8-3.9 0-7.1-2.8-2.7-2.5-4.2-6.3-1.3-3.4-1.3-7.3t1.3-7.4q1.5-3.8 4.2-6.2 3.2-2.8 7.1-2.8 3.8 0 7 2.8 2.7 2.4 4.2 6.2zM19.9 54.6q3.4-1.3 7.3-1.3t7.4 1.3q3.8 1.5 6.2 4.2 2.8 3.2 2.8 7 0 3.9-2.8 7.1-2.4 2.7-6.2 4.2-3.5 1.3-7.4 1.3-3.9 0-7.3-1.3-3.8-1.5-6.3-4.2-2.8-3.2-2.8-7.1 0-3.8 2.8-7 2.5-2.7 6.3-4.2zm73.4 0q3.5-1.3 7.4-1.3 3.9 0 7.3 1.3 3.9 1.5 6.3 4.2 2.8 3.2 2.8 7 0 3.9-2.8 7.1-2.4 2.7-6.3 4.2-3.4 1.3-7.3 1.3t-7.4-1.3q-3.8-1.5-6.2-4.2-2.8-3.2-2.8-7.1 0-3.8 2.8-7 2.4-2.7 6.2-4.2z'/%3e%3c/svg%3e")`,
						`url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3e%3cpath d='M118 64.8q0 2.9-1.9 5-2 2-4.8 2h-.7l-29-3.5v-7l29-3.5h.7q2.7 0 4.8 2.1 1.9 2.1 1.9 4.9zm-108 0q0-2.8 1.9-4.9 2-2.1 4.8-2.1h.7l29 3.5v7l-29 3.5h-.7q-2.7 0-4.8-2-1.9-2.1-1.9-5zm92.3-38.2q2 2 2 4.9 0 2.8-1.9 4.8l-.5.5-23 18-4.9-4.9 18-23 .5-.5q1.9-1.9 4.8-1.9t5 2.1zM25.7 103q-2-2-2-4.9 0-2.7 1.9-4.8l.5-.5 23-18 4.9 4.9-18 23-.5.5q-1.9 1.9-4.8 1.9-2.8 0-5-2.1zm0-76.4q2.1-2.1 5-2.1 2.8 0 4.8 1.9l.5.5 18 23-4.9 4.9-23-18-.5-.5q-1.9-1.9-1.9-4.8t2-4.9zm76.6 76.4q-2.1 2.1-5 2.1t-4.8-1.9l-.5-.5-18-23 4.9-4.9 23 18 .5.5q1.9 1.9 1.9 4.8t-2 4.9zM59 12.8q2.1-2.1 5-2.1t5 2.1q2 1.9 2 4.7v.7l-3.5 29h-7l-3.5-29v-.7q0-2.7 2-4.7zm12.4 44.6q3.1 3 3.1 7.4 0 4.3-3.1 7.4-3.1 3-7.4 3-4.3 0-7.4-3-3.1-3.1-3.1-7.4 0-4.4 3.1-7.4 3.1-3.1 7.4-3.1 4.3 0 7.4 3.1zM69 116.9q-2.1 2-5 2t-5-2q-2-2-2-4.8v-.7l3.5-29h7l3.5 29v.7q0 2.7-2 4.8z'/%3e%3c/svg%3e")`,
						`url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3e%3cpath d='M64 10.7q3 0 6.3 3.3 2.4 2.5 2.4 7.6l-.3 2.7-5.5 33.3 19.9-27.4 1.6-2.1q3.6-3.7 7.1-3.7 4.6 0 6.8 2.2 2.1 2.1 2.1 6.8 0 3.8-3.7 7.1l-2.4 1.9-27.2 19.4 33.5-5.4q1.7-.3 2.6-.3 5.3 0 7.6 2.4 3.2 3.2 3.2 6.3 0 3-3.2 6.3-2.5 2.5-7.6 2.5l-3.1-.4-33-5.4 27.5 19.7 2.1 1.6q3.7 3.7 3.7 7.2 0 4.6-2.1 6.7-2.2 2.2-6.8 2.2-3 0-7.1-3.7-.7-.6-2-2.4L66.9 72l5.5 33.3.3 2.7q0 5.2-2.4 7.6-3.3 3.3-6.3 3.3t-6.3-3.3q-2.4-2.4-2.4-7.6l.3-3.1L61.1 72 41.6 99.1q-1.3 1.8-2 2.4-3.6 3.7-7.1 3.7-4.6 0-6.8-2.2-2.1-2.1-2.1-6.7 0-5.3 3.7-7.2l2.1-1.6 27.5-19.7-33 5.4-3.1.4q-5.1 0-7.6-2.5-3.2-3.3-3.2-6.3 0-3.1 3.2-6.3 2.3-2.4 7.6-2.4.9 0 2.6.3l33.5 5.4-27.2-19.4-2.4-1.9q-3.7-3.7-3.7-7.1 0-4.7 2.1-6.8 2.2-2.2 6.8-2.2l7.1 3.7 1.6 2.1 19.9 27.4-5.5-32.9-.3-3.1q0-5.1 2.4-7.6 3.2-3.3 6.3-3.3z'/%3e%3c/svg%3e")`,
					],
				});
			}
			const C = PuzzleEffectSnowCannon, P = Object.assign(C.prototype, {constructor: C});
			P.handleRemoveConfettiContainer = function() {
				if(this.confettiRunning || this.containerEl === undefined) return;
				this.containerEl.remove();
				delete this.containerEl;
				this.confettiRunning = false;
			};
			P.trigger = function(pos) {
				if(this.containerEl === undefined) {
					const containerEl = document.createElement('div');
					containerEl.classList.add('confetti-container');
					document.body.appendChild(containerEl);
					this.containerEl = containerEl;
					this.confetti.config.parent = this.containerEl;
					this.confetti.config.timeout = 3000;
				}
				this.confettiRunning = true;
				let bb = bounds(Framework.app.svgRenderer.svgElem),
						from = [pos.x, pos.y],
						to =   [Math.round(bb.left + 0.5 * bb.width), Math.round(bb.top + 0.5 * bb.height)];
				let distScale = 0.5;
				to[0] = from[0] + distScale * (to[0] - from[0]);
				to[1] = from[1] + distScale * (to[1] - from[1]);
				this.confetti.blastConfetti(from, to, 1500);
				clearTimeout(this.confettiTimeoutId);
				this.confettiTimeoutId = setTimeout(this.handleRemoveConfettiContainer, 3000);
			};
			return C;
		})();
		const PuzzleEffectDeetDeetDoot = (() => {
			function PuzzleEffectDeetDeetDoot() {
				bindHandlers(this);
			}
			const C = PuzzleEffectDeetDeetDoot, P = Object.assign(C.prototype, {constructor: C});
			C.html = `<div class="deetdeetdoot">
				<div class="keys"></div>
				<div class="notes">
					<div class="deet1"><span class="slide"><span class="flip">Deet</span></span></div>
					<div class="deet2"><span class="slide"><span class="flip">Deet</span></span></div>
					<div class="doot"><span class="slide"><span class="flip">Doot</span></span></div>
				</div>
			</div>`;
			P.handleRemoveContainer = function() {
				if(this.containerEl === undefined) return;
				this.containerEl.remove();
				delete this.containerEl;
			};
			P.trigger = function(pos) {
				const {createElem} = Framework;
				if(this.containerEl === undefined) {
					this.containerEl = createElem({parent: document.body});
				}
				let bb = bounds(Framework.app.svgRenderer.svgElem),
						from = [pos.x, pos.y],
						to =   [Math.round(bb.left + 0.5 * bb.width), Math.round(bb.top + 0.5 * bb.height)];
				let dx = from[0] - to[0], dy = from[1] - to[1];
				let ang = Math.round(Math.atan2(dy, dx) * 180 / Math.PI + 135);
				this.containerEl.insertAdjacentHTML('beforeend', C.html);
				let el = this.containerEl.lastChild;
				el.style.left = `${Math.round(pos.x)}px`;
				el.style.top = `${Math.round(pos.y)}px`;
				el.style.transform = `rotate(${ang}deg`;
				if(ang > 45 && ang < 270) el.classList.add('flipped');
				clearTimeout(this.containerTimeoutId);
				this.containerTimeoutId = setTimeout(this.handleRemoveContainer, 3000);
			};
			return C;
		})();

	const FeaturePuzzleEvents = (() => {
		function FeaturePuzzleEvents() {
			bindHandlers(this);
			this.featureEnabled = false;
			this.triggers = {};
			this.effects = {};
			this.triggerEffects = {};
		}
		const C = FeaturePuzzleEvents, P = Object.assign(C.prototype, {constructor: C});
		C.SettingName = 'puzzleevents';
		C.FeatureSettings = {
			off: {value: false, label: 'Off', alt: [false , 'off']},
			confetti: {value: 'confetti', label: 'Confetti'},
			deetdeetdoot: {value: 'deetdeetdoot', label: 'Deet Deet Doot'},
			snowcannon: {value: 'snowcannon', label: 'Snow Cannon'},
		};
		C.SettingDefault = 'confetti';
		C.featureStyle = `
			.confetti-container {
				perspective: 700px;
				position: absolute;
				overflow: hidden;
				top: 0;
				right: 0;
				bottom: 0;
				left: 0;
				user-select: none;
				pointer-events: none;
				-webkit-transform: translate3d(0, 0, 0);
				transform: translate3d(0, 0, 0);
				perspective: 1000;
				-webkit-perspective: 1000;
				backface-visibility: hidden;
				-webkit-backface-visibility: hidden;
			}
			.confetti {
				position: absolute;
				transform-origin: top left;
				--confetti-content: "";
				--confetti-color: blue;
				--confetti-animation: confetti-slow 2.25s ease-out 1 forwards;
			}
			.confetti::before {
				display: block;
				height: 100%;
				aspect-ratio: 1 / 1;
				transform-origin: center;
				content: var(--confetti-content);
				background-color: var(--confetti-color);
				animation: var(--confetti-animation);
			}
			@keyframes confetti-slow {
				0% { margin-top: 0; transform: translate3d(0, 0, 0) rotateX(0) rotateY(0) scale(1, 1); opacity: 1; }
				100% { margin-top: 105%; transform: translate3d(0, 0, 0) rotateX(360deg) rotateY(180deg) scale(1.5, 1.5); opacity: 0; }
			}
			@keyframes confetti-medium {
				0% { margin-top: 0; transform: translate3d(0, 0, 0) rotateX(0) rotateY(0) scale(1, 1); opacity: 1; }
				100% { margin-top: 105%; transform: translate3d(0, 0, 0) rotateX(100deg) rotateY(360deg) scale(1.3, 1.3); opacity: 0; }
			}
			@keyframes confetti-fast {
				0% { margin-top: 0; transform: translate3d(0, 0, 0) rotateX(0) rotateY(0) scale(0.8, 0.8); opacity: 1; }
				100% { margin-top: 105%; transform: translate3d(0, 0, 0) rotateX(10deg) rotateY(250deg) scale(1.2, 1.2); opacity: 0; }
			}
			.confetti--animation-slow::before { animation: confetti-slow 2.25s ease-out 1 forwards; }
			.confetti--animation-medium::before { animation: confetti-medium 1.75s ease-out 1 forwards; }
			.confetti--animation-fast::before { animation: confetti-fast 1.25s ease-out 1 forwards; }

			.deetdeetdoot {
				position: absolute;
				width: 128px; height: 128px;
				transform-origin: top left;
				transform: scale(1.3);
				--rotatey: -10deg;
				--transFrom: 0%;
				--transTo: 50%;
				--rotatez-deet1: 15deg;
				--rotatez-deet2: 45deg;
				--rotatez-doot : 75deg;
			}
			.deetdeetdoot * { display: block; position: absolute;  }
			.deetdeetdoot .keys {
				font-size: 32px;
				transform-origin: center center;
				left: -30%; top: -30%;
				transform: rotate(-45deg);
				width: 36px; height: 36px;
				background: no-repeat url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABIBAMAAACnw650AAAAHlBMVEVHcEwxNz0xNz0xNz0xNz0xNz3h6O0xNz2Um6B+hIpZaSqLAAAABnRSTlMAcO/fYIAX+Cy6AAAAZElEQVRIx2NgVC8nAIoCGNzLCYJCBnPCiooZyokAw15RGhBAOFgZaaOKRhWNKhpVNKqIDEXTQSKVWBkIRSBmGg7GqKJRRYNYURuIlQGlMRkZxDZD1IlprokTVlTCwEKw5VckAADbD2ztv9+oVAAAAABJRU5ErkJggg==);
				background-size: 36px 36px;
			}
			.deetdeetdoot .notes { width: 100%; height: 100%; perspective-origin: 0 0; }
			.deetdeetdoot .notes * { width: 100%; }
			.deetdeetdoot .notes div {
				font-size: 48px;
				height: 1.5rem; line-height: 1.5rem;
				margin-top: -0.75rem;
				left: -30%; top: -30%;
				perspective: 20px;
				transform-origin: center left;
			}
			.deetdeetdoot .notes .slide { transform-origin: center right; animation: 1.2s ease-out 0s 2 forwards; }
			.deetdeetdoot .keys { animation: 2.4s ease-out 0s 1 forwards; }
			.deetdeetdoot .deet1 { transform: rotateZ(var(--rotatez-deet1)); }
			.deetdeetdoot .deet2 { transform: rotateZ(var(--rotatez-deet2)); }
			.deetdeetdoot .doot  { transform: rotateZ(var(--rotatez-doot )); }
			.deetdeetdoot.flipped .flip { transform: scale(-1, -1); }
			@keyframes deetdeetdoot-keys {
				  0% { opacity: 1.0; }
				 95% { opacity: 1.0; }
				100% { opacity: 0.0; }
			}
			@keyframes deetdeetdoot-deet1 {
					      0% { transform: rotateY(var(--rotatey)) translate(var(--transFrom), 0%); opacity: 0.3; }
				 20%,  40% { transform: rotateY(var(--rotatey)) translate(var(--transTo), 0%); opacity: 1.0; }
				 60%, 100% { transform: rotateY(var(--rotatey)) translate(var(--transTo), 0%); opacity: 0.0; }
			}
			@keyframes deetdeetdoot-deet2 {
				  0%,  19% { transform: rotateY(var(--rotatey)) translate(var(--transFrom), 0%); opacity: 0.0; }
				       20% { transform: rotateY(var(--rotatey)) translate(var(--transFrom), 0%); opacity: 0.3; }
				 40%,  60% { transform: rotateY(var(--rotatey)) translate(var(--transTo), 0%); opacity: 1.0; }
				 80%, 100% { transform: rotateY(var(--rotatey)) translate(var(--transTo), 0%); opacity: 0.0; }
			}
			@keyframes deetdeetdoot-doot  {
				  0%,  39% { transform: rotateY(var(--rotatey)) translate(var(--transFrom), 0%); opacity: 0.0; }
				       40% { transform: rotateY(var(--rotatey)) translate(var(--transFrom), 0%); opacity: 0.3; }
				 60%,  80% { transform: rotateY(var(--rotatey)) translate(var(--transTo), 0%); opacity: 1.0; }
				      100% { transform: rotateY(var(--rotatey)) translate(var(--transTo), 0%); opacity: 0.0; }
			}
			.deetdeetdoot .keys  { animation-name: deetdeetdoot-keys; }
			.deetdeetdoot .deet1 .slide { animation-name: deetdeetdoot-deet1; }
			.deetdeetdoot .deet2 .slide { animation-name: deetdeetdoot-deet2; }
			.deetdeetdoot .doot  .slide { animation-name: deetdeetdoot-doot; }
			
			.snowflake::before {
				mask-image: var(--confetti-maskimage);
				mask-size: 100% 100%;
				mask-position: top left;
			}
		`;
		P.triggerEvent = function(eventName, args, triggers) {
			if(args === undefined) args = [];
			if(!Array.isArray(args)) args = [args];
			if(triggers === undefined) triggers = Object.values(this.triggers);
			if(!Array.isArray(triggers)) triggers = [triggers];
			let handlerName = `handle${eventName.charAt(0).toUpperCase()}${eventName.slice(1)}`;
			triggers.forEach(trigger => trigger[handlerName] ? trigger[handlerName](...args) : null);
		};
		P.addTrigger = function(name, trigger) {
			this.triggers[name] = trigger;
			this.triggerEvent('init', this.handleTrigger, trigger);
		};
		P.addEffect = function(name, effect) {
			this.effects[name] = effect;
		};
		P.getTriggerEffects = function(triggerName) {
			return this.triggerEffects[triggerName] = this.triggerEffects[triggerName] || [];
		};
		P.addTriggerEffect = function(triggerName, effectName) {
			this.getTriggerEffects(triggerName).push(effectName);
		};
		P.handleTrigger = function(trigger, ...args) {
			let triggerName = (Object.entries(this.triggers).find(([name, tr]) => trigger === tr) || [])[0];
			(this.triggerEffects[triggerName] || []).forEach(effect => this.effects[effect].trigger(...args));
		};
		P.handleAct = function(action) {
			this.triggerEvent('act', action);
		};
		P.handleLoad = function() {
			this.triggerEvent('load');
		};
		P.handleStart = function() {
			this.triggerEvent('start');
		};
		P.attachElem = async function() {
			let {app, app: {puzzle}} = Framework;
			if(app === undefined) return;
			if(this.featureEnabled) return;
			this.featureEnabled = true;
			app.on('act', this.handleAct);
			puzzle.on('start', this.handleStart);
			puzzle.on('progressloaded', this.handleLoad);
			this.featureStylesheet = await attachStylesheet(C.featureStyle);
		};
		P.detachElem = function() {
			let {app, app: {puzzle}} = Framework;
			if(app === undefined) return;
			if(!this.featureEnabled) return;
			this.featureEnabled = false;
			app.off('act', this.handleAct);
			puzzle.off('start', this.handleStart);
			puzzle.off('progressloaded', this.handleLoad);
		};
		P.handleInit = function() {
			let {app} = Framework;
			if(app === undefined) return;
			const setting = Framework.getSetting(C.SettingName);
			let urlOverride = new URLSearchParams(document.location.search).get('setting-puzzleevents');
			if(C.FeatureSettings[setting] === undefined) {
				Framework.setSetting(C.SettingName, C.SettingDefault);
				Framework.toggleSettingClass(C.SettingName, C.SettingDefault);
			}
			if(C.FeatureSettings[urlOverride] !== undefined) {
				Framework.getSettings()[C.SettingName] = urlOverride;
				Framework.toggleSettingClass(C.SettingName, urlOverride);
			}
			this.handleChange();
		};
		P.handleChange = function(event) {
			if(event) Framework.handleSettingsChange(event);
			const setting = Framework.getSetting(C.SettingName);
			Framework.toggleSettingClass(C.SettingName, C.FeatureSettings[setting].value);
			let effects = this.getTriggerEffects('threeinthecorner');
			effects.length = 0;
			effects.push(setting);
			(setting === 'off') ? this.detachElem() : this.attachElem();
		};
		P.addFeature = function() {
			Framework.addSetting({
				group: 'experimental', name: C.SettingName, content: '3-In-The-Corner Effect:',
				init: this.handleInit, handler: this.handleChange,
				tag: 'multi',
				options: Object.entries(C.FeatureSettings)
					.map(([value, {label: content}]) => ({value, content})),
				style: 'display: flex; gap: 0.5rem;',
			});
		};
		return C;
	})();
	FeaturePuzzleEvents.EffectConfetti = EffectConfetti;
	FeaturePuzzleEvents.PuzzleEffectConfetti = PuzzleEffectConfetti;
	FeaturePuzzleEvents.effects = [
		PuzzleEffectConfetti
	];
	FeaturePuzzleEvents.triggers = [
		PuzzleTriggerThreeInTheCorner,
		PuzzleTriggerBDaySpecial
	];

	const featurePuzzleEvents = new FeaturePuzzleEvents();
	featurePuzzleEvents.addEffect('confetti', new PuzzleEffectConfetti());
	featurePuzzleEvents.addEffect('deetdeetdoot', new PuzzleEffectDeetDeetDoot());
	featurePuzzleEvents.addEffect('snowcannon', new PuzzleEffectSnowCannon());
	featurePuzzleEvents.addTrigger('threeinthecorner', new PuzzleTriggerThreeInTheCorner());
	featurePuzzleEvents.addTriggerEffect('threeinthecorner', 'confetti');
	featurePuzzleEvents.addTriggerEffect('threeinthecorner', 'deetdeetdoot');
	featurePuzzleEvents.addTriggerEffect('threeinthecorner', 'snowcannon');
	
	Framework.getApp().then(() => featurePuzzleEvents.addFeature());

	return FeaturePuzzleEvents;
})();