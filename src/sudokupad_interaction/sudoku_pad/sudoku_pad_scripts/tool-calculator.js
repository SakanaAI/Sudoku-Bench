
const KillerCalculator = (() => {
	// Helpers
		const {makeGrabScrollHandler, attachScrollHandler, dettachScrollHandler} = SudokuPadUtilities;
		const {seenCageCells, intersectCageCells} = PuzzleTools;
		const combSum = comb => {
			let sum = 0, i = comb.length;
			while(i--) sum += comb[i];
			return sum;
		};
		const calcCombSums = combs => {
			let sums = [], minSum = Number.MAX_SAFE_INTEGER, maxSum = 0, i = combs.length;
			if(i === 0) minSum = 0;
			while(i--) {
				sums[i] = combSum(combs[i]);
				minSum = Math.min(minSum, sums[i]);
				maxSum = Math.max(maxSum, sums[i]);
			}
			return {sums, minSum, maxSum};
		};
		const sortCombsOrd = (a, b) => {
			let len = Math.min(a.length, b.length);
			for(let i = 0; i < len; i++) {
				if(a[i] !== b[i]) return a[i] - b[i];
			}
			return 0;
		};
		const sortCombsSum = (a, b) => {
			let sa = combSum(a), sb = combSum(b);
			if(sa === sb) return sortCombsOrd(a, b);
			return sa - sb;
		};
		const triangularNumber = (n) => (n / 2) * (n + 1);
		const getKillerCombinations = (opts) => {
			let {minVal = 1, maxVal = 9, size, sum, minSum, maxSum, minSize, maxSize} = opts;
			if(minSum === undefined) minSum = sum;
			if(minSum === undefined) minSum = 0;
			if(maxSum === undefined) maxSum = sum;
			if(maxSum === undefined) maxSum = 45;
			if(minSize === undefined) minSize = size;
			if(minSize === undefined) minSize = 1;
			if(maxSize === undefined) maxSize = size;
			if(maxSize === undefined) maxSize = 9;
			minSize = Math.max(1, minSize);
			minSum = Math.max(0, minSum);
			// TODO: Respect minVal in calculations
			let combs = [], comb = [], i, j, combSumMin, combSumMax;
			for(size = minSize; size <= maxSize; size++) { // For each size in range
				combSumMin = Math.max(minSum, triangularNumber(minVal + size - 1) - triangularNumber(minVal - 1));
				combSumMax = Math.min(maxSum, triangularNumber(maxVal) - triangularNumber(maxVal - size));
				if(combSumMin > maxSum) continue; // If smallest sum for size is greater than maxSum
				if(combSumMax < minSum) continue; // If largest sum for size is less than minSum
				comb.length = size;
				for(i = 0; i < size; i++) comb[i] = minVal;
				i = 0;
				while(true) { // While we can fit more digits into combination
					while(comb[i] > (maxVal - size + i + 1) && i > 0) comb[--i]++; // Back up to next, left value to inc
					while(comb[i] < maxVal && i < size - 1) { // Forward to right and increment
						comb[i + 1] = comb[i] + 1;
						i++;
					}
					if(i < size - 1) break; // Cannot fit more digits, done
					let sum = 0;
					for(let j = 0; j < size; j++) sum += comb[j]; // Calc current sum
					do {
						if(sum > combSumMax) { // If sum too large, continue
							comb[i] = maxVal + 1;
							break;
						}
						if(sum >= minSum) combs.push(comb.slice(0)); // If sum large enough, keep
						comb[i]++; sum++; // Increment final value
					} while(i < size && comb[i] <= maxVal);
					if(i === 0 && sum >= combSumMax) break; // Check for 1-val comb sum overflow
				}
			}
			return combs;
		};
		const filterCombinations = (combinations = [], filter = {}) => {
			const {incVals = [], excVals = [], excCombs = [], incSums = [], excSums = []} = filter;
			const incLen = incVals.length, excLen = excVals.length;
			const filtered = [];
			for(let c = 0, len = combinations.length; c < len; c++) {
				if(excCombs.indexOf(c) !== -1) continue;
				let comb = combinations[c], include = true, exclude = false;
				let sum = combSum(comb);
				if(!((incSums.length === 0 && !excSums.includes(sum)) || incSums.includes(sum))) {
					continue;
				}
				for(let i = 0; i < incLen; i++) {
					if(comb.indexOf(incVals[i]) === -1) {
						include = false;
						break;
					}
				}
				if(!include) continue;
				for(let i = 0; i < excLen; i++) {
					if(comb.indexOf(excVals[i]) !== -1) {
						exclude = true;
						break;
					}
				}
				if(exclude) continue;
				filtered.push(comb);
			}
			return filtered;
		};
		const testGetKillerCombinations = (count = 10000, opts, filter) => {
			console.warn('testGetKillerCombinations(count, opts, filter);');
			if(opts === undefined) opts = {size: 0, minSize: 1, maxSize: 9, sum: 0, minSum: 0, maxSum: 45};
			if(filter === undefined) filter = {incVals: [8,9], excVals: [2], excCombs: [2]};
			console.log('  count:', JSON.stringify(count));
			console.log('  opts:', JSON.stringify(opts));
			let combs, filtered, t0, t1;
			console.group('getKillerCombinations');
			console.time(`getKillerCombinations x${count}`);
			t0 = Date.now();
			for(let i = 0; i < count; i++) combs = getKillerCombinations(opts);
			t1 = Date.now();
			console.timeEnd(`getKillerCombinations x${count}`);
			console.log(`getKillerCombinations x${count} @ ${(t1 - t0) / count}ms each`);
			console.log('combs:', combs);
			console.groupEnd('getKillerCombinations');
			console.group('filterCombinations');
			console.time(`filterCombinations x${count}`);
			t0 = Date.now();
			for(let i = 0; i < count; i++) filtered = filterCombinations(combs, filter);
			t1 = Date.now();
			console.timeEnd(`filterCombinations x${count}`);
			console.log(`getKillerCombinations x${count} @ ${(t1 - t0) / count}ms each`);
			console.log('filtered:', filtered);
			console.groupEnd('filterCombinations');
		};
		const getPuzzleCages = () => {
			let {app} = Framework, {puzzle = {}} = app, {currentPuzzle = {}} = puzzle;
			let allCages = (currentPuzzle.cages || []);
			const isValidCage = ({style, unique, sum, hidden}) => (
				(style === 'killer' && !hidden)
				//|| (unique === true && parseInt(sum) > 0) // Handle X/V/XV
			);
			let killerCages = allCages
				.filter(isValidCage)
				.map(cage => {
					let cageInfo = {cells: puzzle.parseCells(cage.cells)};
					if(cage.cageValue !== undefined) {
						let [r, c, val] = Puzzle.parseRCVal(cage.cageValue);
						cageInfo.value = val;
					}
					if(cage.sum !== undefined) cageInfo.sum = cage.sum;
					if(cage.unique !== undefined) cageInfo.unique = cage.unique;
					return cageInfo;
				});
			return {allCages, killerCages, puzzle: currentPuzzle};
		};
		const makeClassList = (...args) => [...new Set(args.flat().filter(e=>undefined!==e&&''!==e))].join(' ');

		const SolverTool = (() => {
			// Helpers
				function getCellFixed(cell) {
					let val = cell.getVal();
					let digit = parseInt(val);
					if(String(val) === String(digit) && digit >= 0) return digit;
				};
				function getCellOptions(cell) {
					let i, options = [0, 0, 0, 0, 0, 0, 0, 0, 0];
					let fixed = getCellFixed(cell);
					if(fixed !== undefined) {
						for(i = 0; i < 9; i++) options[i] = i + 1 === fixed ? i + 1 : 0;
						return options;
					}
					if(cell.propVisible('centre')) {
						let centreVal = cell.propGet('centre');
						let isValid = false;
						let len = centreVal.length;
						for(i = 0, len; i < len; i++) {
							let val = centreVal[i], digit = parseInt(val);
							if(String(val) === String(digit) && digit >= 0) {
								isValid = true;
								options[digit - 1] = digit;
							}
						}
						if(isValid) return options;
					}
					for(i = 0; i < 9; i++) options[i] = i + 1;
					return options;
				};

			function SolverTool(opts) {
				this.solveTimeoutMs = 100;
				this.fixedSum = 0;
				this.inputCells = [];
				this.options = [];
				this.refs = [];
				this.puzzleInfo = undefined;
				this.cidToRc = this.cidToRc.bind(this);
				this.cidToOptions = this.cidToOptions.bind(this);
				this.cidToString = this.cidToString.bind(this);
			}
			const C = SolverTool, P = Object.assign(C.prototype, {constructor: C});
			C.getCellFixed = getCellFixed;
			C.getCellOptions = getCellOptions;
			C.sleep = async function(ms = 0) {
				return await new Promise(resolve => setTimeout(resolve, ms));
			};
			P.cidToRc = function(cid) {
				return this.inputCells[cid].toRC();
			};
			P.cidToOptions = function(cid) {
				return this.options.slice(cid * 9, cid * 9 + 9).join('');
			};
			P.cidToString = function(cid) {
				return `cell[${cid}][${this.cidToRc(cid)}] ${this.cidToOptions(cid)} >> [${this.refs[cid].map(this.cidToRc).join(', ')}]`;
			};
			P.logCells = function(cids) {
				if(cids === undefined) cids = [...this.inputCells.keys()];
				console.log(cids.map(this.cidToString).join('\n'));					
				console.log('  fixedSum:', this.fixedSum);
			};
			P.init = function(cells = []) {
				if(this.puzzleInfo === undefined) this.puzzleInfo = Checker.getPuzzleInfo();
				const puzzleInfo = this.puzzleInfo;
				let fixedSum = 0, inputCells = [], options = [], refs = [];
				let i, len, cell, val;
				// Remove fixed cells
				for(i = 0, len = cells.length; i < len; i++) {
					cell = cells[i];
					val = getCellFixed(cell);
					if(val !== undefined) {
						fixedSum += val;
					}
					else {
						inputCells.push(cell);
					}
				}
				for(let cid = 0, clen = inputCells.length; cid < clen; cid++) {
					refs[cid] = [];
					cell = inputCells[cid];
					options.push.apply(options, getCellOptions(cell));
					let seenCells = seenCageCells(cell, puzzleInfo);
					for(i = 0, len = seenCells.length; i < len; i++) {
						let seenCell = seenCells[i];
						if(seenCell === cell) continue;
						let fixed = getCellFixed(seenCell);
						if(fixed !== undefined) options[cid * 9 + fixed - 1] = 0;
						let refCid = inputCells.indexOf(seenCell);
						if(refCid !== -1) refs[cid].push(refCid);
					}
				}
				this.fixedSum = fixedSum;
				this.inputCells = inputCells;
				this.options = options;
				this.refs = refs;
			};
			P.backupOptions = function() {
				return this.options.slice();
			};
			P.restoreOptions = function(savedOptions) {
				let options = this.options;
				for(let i = 0, len = options.length; i < len; i++)
					options[i] = savedOptions[i];
			};
			P.setFixed = function(cid, val) {
				let i, options = this.options, refs = this.refs[cid], refLen = refs.length;
				for(i = 0; i < 9; i++) options[cid * 9 + i] = i === (val - 1) ? val : 0;
				for(i = 0; i < refLen; i++) options[refs[i] * 9 + val - 1] = 0;
			};
			P.solveMin = function(cids) {
				if(cids === undefined) cids = [...this.inputCells.keys()];
				//console.info('SolverTool.solveMin([%s]);', cids.map(this.cidToRc).join(', '));
				const {options, solveTimeoutMs} = this, cidsLen = cids.length;
				let time = Date.now();
				const solveCell = (idx = 0, min = Infinity) => {
					if(Date.now() - time >= solveTimeoutMs) throw new Error(`solveMin timed out after ${Date.now() - time}ms`);
					if(idx >= cidsLen) throw new Error('solveMin: idx out of range', idx, cids.length);
					const cid = cids[idx];
					let i, val;
					if(idx === cidsLen - 1) {
						for(i = 0; i < 9; i++) {
							val = options[cid * 9 + i];
							if(val !== 0) return val;
						}
						return undefined;
					}
					let saved = this.backupOptions();
					for(i = 0; i < 9; i++) {
						val = options[cid * 9 + i];
						if(val !== 0) {
							if(val >= min) return min;
							this.setFixed(cid, val);
							let sum = val + solveCell(idx + 1, min - val);
							if(!isNaN(sum) && sum < min) min = sum;
							this.restoreOptions(saved);
						}
					}
					return min;
				}
				return this.fixedSum + solveCell();
			};
			P.solveMax = function(cids) {
				if(cids === undefined) cids = [...this.inputCells.keys()];
				//console.info('SolverTool.solveMax([%s]);', cids.map(this.cidToRc).join(', '));
				const {options, solveTimeoutMs} = this, cidsLen = cids.length;
				let time = Date.now();
				const solveCell = (idx = 0, max = -Infinity) => {
					if(Date.now() - time >= solveTimeoutMs) throw new Error(`solveMax timed out after ${Date.now() - time}ms`);
					if(idx >= cidsLen) throw new Error('solveMax: idx out of range', idx, cids.length);
					const cid = cids[idx];
					let i, val;
					if(idx === cidsLen - 1) {
						for(i = 8; i >= 0; i--) {
							val = options[cid * 9 + i];
							if(val !== 0) return val;
						}
						return undefined;
					}
					let saved = this.backupOptions();
					for(i = 8; i >= 0; i--) {
						val = options[cid * 9 + i];
						if(val !== 0) {
							//if(val <= max) return max; // MT: Early exit fails in solveMax.
							this.setFixed(cid, val);
							let sum = val + solveCell(idx + 1, max - val);
							if(!isNaN(sum) && sum > max) max = sum;
							this.restoreOptions(saved);
						}
					}
					return max;
				}
				return this.fixedSum + solveCell();
			};
			P.solveMinMax = function(cids) {
				if(cids === undefined) cids = [...this.inputCells.keys()];
				//console.info('SolverTool.solveMinMax([%s]);', cids.map(this.cidToRc).join(', '));
				let min, max;
				if(cids.length > 0) {
					let time = Date.now(), solveTimeoutMs = this.solveTimeoutMs;
					try {
						max = this.solveMax(cids);
						this.solveTimeoutMs = solveTimeoutMs - (Date.now() - time);
						min = this.solveMin(cids);
					}
					catch(err) {
						console.info(`solveMinMax timed out after ${Date.now() - time}ms`);
					}
					this.solveTimeoutMs = solveTimeoutMs;
				}
				else if(this.fixedSum > 0) {
					min = max = this.fixedSum;
				}
				return [min, max];
			};

			return C;
		})();

	function KillerCalculator() {
		bindHandlers(this);
		this.name = 'calculator';
		//this.isTool = true;
		this.cages = {};
		this.handleAct = throttleFunc(this.handleAct, C.SolveTimeoutMs, 1000);
		this.solverTool = new SolverTool();
		this.solverTool.solveTimeoutMs = C.SolveTimeoutMs;
		this.isAttached = false;
	}
	const C = KillerCalculator, P = Object.assign(C.prototype, {constructor: C});
	C.icon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="-40 -40 540 540"><path d="M401 0H59C38 0 21 17 21 38v384c0 21 17 38 38 38h342c21 0 38-17 38-38V38c0-21-17-38-38-38zM145 396c0 6-5 10-11 10H81c-6 0-10-4-10-10v-53c0-6 4-11 10-11h53c6 0 10 5 10 11v53zm0-117c0 5-5 10-11 10H81c-6 0-10-5-10-10v-54c0-5 4-10 10-10h53c6 0 10 5 10 10v54zm122 117c0 6-5 10-10 10h-54c-5 0-10-4-10-10v-53c0-6 5-11 10-11h54c5 0 10 5 10 11v53zm0-117c0 5-5 10-10 10h-54c-5 0-10-5-10-10v-54c0-5 5-10 10-10h54c5 0 10 5 10 10v54zm123 117c0 6-5 10-11 10h-53c-6 0-10-4-10-10v-53c0-6 4-11 10-11h53c6 0 10 5 10 11v53zm0-117c0 5-5 10-11 10h-53c-6 0-10-5-10-10v-54c0-5 4-10 10-10h53c6 0 10 5 10 10v54zm0-127c0 5-5 10-11 10H81c-6 0-10-5-10-10V56c0-5 4-10 10-10h298c6 0 10 5 10 10v96z" fill="currentColor"/></svg>`;
	C.SolveTimeoutMs = 100;
	C.reCageSum = /^\s*(?:[-]{2,}\s+)?([0-9]+)\s*$/;
	C.triangularNumber = triangularNumber;
	C.getKillerCombinations = getKillerCombinations;
	C.filterCombinations = filterCombinations;
	C.testGetKillerCombinations = testGetKillerCombinations;
	C.combSum = combSum;
	C.calcCombSums = calcCombSums;
	C.sortCombsSum = sortCombsSum;
	C.sortCombsSum = sortCombsSum;
	C.getPuzzleCages = getPuzzleCages;
	P.getCages = function() {
		let puzzleCages = this._puzzleCages;
		if(puzzleCages === undefined || (puzzleCages.puzzle !== Framework.app.currentPuzzle)) {
			puzzleCages = this._puzzleCages = C.getPuzzleCages();
		}
		let {selectedCells} = Framework.app.puzzle, {allCages, killerCages} = puzzleCages;
		let selectedCage;
		selectedCells.find(cell => {
			if(selectedCage === undefined) {
				return undefined === (selectedCage = killerCages.find(({cells}) => cells.includes(cell) && cells.every(c => !c.hideclue)));
			}
			if(selectedCage.cells.includes(cell)) return false;
			selectedCage = undefined;
			return true;
		});
		return {allCages, killerCages, selectedCage};
	};
	P.getCageInfo = function(cageId) {
		let {cages} = this;
		return cages[cageId] = cages[cageId] || {inc: [], exc: [], cageVals: [], excCombs: [], incSums: [], excSums: []};
	};
	P.getCellVals = function(cells) {
		return cells
			.map(cell => parseInt(cell.getVal()))
			.filter(val => !isNaN(val) && val !== 0)
			.map(val => String(val));
	};
	P.getCagesFromSelection = function(selectedCells) {
		//console.log('getCagesFromSelection:', selectedCells);
		let {app} = Framework, {puzzle = {}} = app, {currentPuzzle = {}} = puzzle;
		let allCages = (currentPuzzle.cages || []);
		let killerCages = allCages.filter(({style}) => style === 'killer');
		let cells = [], outies = [];
		let cages = [];
		killerCages.forEach((cage, cageId) => {
			let cells = puzzle.parseCells(cage.cells);
			if(cells.filter(cell => selectedCells.includes(cell)).length === cells.length) {
				let minSum = 0, maxSum = 0;
				if(cage.sum) {
					minSum = maxSum = cage.sum;
				}
				else if(cage.cageValue !== undefined) {
					let [r, c, val] = Puzzle.parseRCVal(cage.cageValue);
					minSum = maxSum = val;
				}
				else {
					minSum = C.triangularNumber(cageCells.length);
					maxSum = 45 - C.triangularNumber(9 - cageCells.length);
				}
				cages.push({
					cageId,
					size: cells.length,
					minSum, maxSum, cells,
					vals: this.getCellVals(cells),
					cage
				});
			}
		});
		let inSize = 0, outSize = 0;
		let inCells = [], outCells = [], allVals = [];
		cages.forEach(cage => {
			inCells.push(...cage.cells);
			inSize += cage.cells.length;
			allVals.push(...cage.vals);
		});
		if(selectedCells.length > inCells.length) {
			outCells = selectedCells.filter(cell => !inCells.includes(cell));
			outSize = selectedCells.length - inSize;
			let outCage = {
				cageId: outCells.map(c => c.toRC()).sort().join(''),
				isOutie: true,
				size: outSize,
				minSum: C.triangularNumber(outSize),
				maxSum: 45 - C.triangularNumber(9 - outSize),
				vals: this.getCellVals(outCells),
				cells: outCells
			};
			allVals.push(...outCage.vals);
			cages.push(outCage);
		}
		let globMinSum = 0, globMaxSum = 0;
		let combCount = 0, filteredCombCount = 0;
		cages
			.forEach(cage => {
				let {size, minSum, maxSum, vals = []} = cage;
				let allCombs = cage.allCombs = C.getKillerCombinations({size, minSum, maxSum});
				let incVals = vals.map(Number);
				let excVals = allVals.map(Number).filter(val => !incVals.includes(val));
				let filteredCombs = cage.filteredCombs = filterCombinations(allCombs, {incVals, excVals});
				combCount += allCombs.length;
				filteredCombCount += filteredCombs.length;
				let tmp = minSum;
				minSum = maxSum;
				maxSum = tmp;
				allCombs
					.forEach((comb, combId) => {
						if(!filteredCombs.includes(comb)) return;
						let sum = comb.reduce((sum, val) => sum + val, 0);
						minSum = Math.min(minSum, sum);
						maxSum = Math.max(maxSum, sum);
					});
				cage.minSum = minSum;
				cage.maxSum = maxSum;
				globMinSum += cage.minSum;
				globMaxSum += cage.maxSum;
			});
		return {
			cages,
			size: cages.reduce((acc, cage) => acc + cage.cells.length, 0),
			minSum: globMinSum,
			maxSum: globMaxSum,
		};
	};
	P.clearSummary = function() {
		this.summaryElem.textContent = 'No valid cage selected';
		this.detailsElem.innerHTML = '';
		if(Framework.getSetting('toolcalculatorsum')) {
			let {selectedCells} = Framework.app.puzzle;
			if(selectedCells.length > 0) {
				this.solverTool.init(selectedCells);
				let [min, max] = this.solverTool.solveMinMax();
				if(min === undefined || max === undefined) {
					this.summaryElem.textContent = `Cannot find sum`;
				}
				else {
					this.summaryElem.textContent = min === max
						? `sum = ${min}`
						: `sum = ${min} to ${max}`;
				}
			}
		}
	};
	P.cageSumStr = ({minSum, maxSum, combs}) => {
		let sumStr = minSum === maxSum ? minSum : `${minSum} - ${maxSum}`;
		if(combs !== undefined && combs.length === 0) sumStr = 'n/a';
		return sumStr;
	};
	P.combsToHtml = function({cageId, cage, allCombs, filteredCombs}) {
		const {inc, exc, cageVals, excCombs, incSums, excSums} = this.getCageInfo(cageId),
					{sums, minSum, maxSum} = calcCombSums(allCombs),
					showSum = minSum !== maxSum,
					_allVals = [...new Set([...cageVals, ...this.getCellVals(cage.cells)])],
					_incVals = [...new Set([...inc, ..._allVals])],
					_excVals = exc.filter(val => !_allVals.includes(val));
		const valToHtml = val => `<span class="${makeClassList(
			'digit',
			(_incVals.includes(String(val)) ? 'include' : []),
			(_excVals.includes(String(val)) ? 'exclude' : []),
			(_allVals.includes(String(val)) ? 'forced' : []),
		)}">${val}</span>`;
		const sumToHtml = sum => `<span class="${makeClassList(
			'sum',
			(incSums.includes(sum) ? 'include' : []),
			(excSums.includes(sum) ? 'exclude' : [])
		)}" data-sum="${sum}">= ${sum}</span>`;
		const combToHtml = (comb, combId) => `<li class="${makeClassList(
			(!filteredCombs.includes(comb) ? 'invalid' : []),
			(excCombs.includes(combId) ? ['invalid', 'exclude'] : [])
		)}" data-set="${comb.join(',')}" data-cage="${cageId}" data-comb="${combId}">${comb.map(valToHtml).join('')}${showSum ? sumToHtml(sums[combId]) : ''}</li>`;
		return `<ul class="combs">${allCombs.map(combToHtml).join('')}</ul>`;
	};
	P.getPuzzleMaxVal = function() {
		let {app: {currentPuzzle: {solution}, puzzle}} = Framework;
		let [minRC, maxRC] = puzzle.getMinMaxRC()
		let maxSize = Math.max(maxRC[0] - minRC[0], maxRC[1] - minRC[1]) + 1;
		if(typeof solution === 'string' && solution.length > 0) {
			const solDigits = solution.split('').map(n => parseInt(n)).filter(n => !isNaN(n));
			if(solDigits.length >= 0.5 * maxSize**2) return Math.max(...new Set(solDigits));
		}
		return maxSize;
	};
	P.getCageSum = function(cage) {
		return cage.sum || ((cage.value || '').match(C.reCageSum) || [])[1];
	};
	P.showCage = function(cageId, cage) {
		let maxVal = this.getPuzzleMaxVal();
		const cageSum = this.getCageSum(cage);
		let allCombs = C.getKillerCombinations({
			size: cage.cells.length, sum: cageSum,
			maxVal, maxSum: cageSum || triangularNumber(maxVal)
		});
		if(allCombs.length === 0) return;
		allCombs.sort(sortCombsSum);
		let {inc, exc, cageVals, excCombs, incSums, excSums} = this.getCageInfo(cageId);
		cageVals.splice(0, cageVals.length, ...this.getCellVals(cage.cells));
		const _incVals = [...new Set([...inc, ...cageVals])];
		const _excVals = exc.filter(val => !cageVals.includes(val));
		let filteredCombs = filterCombinations(allCombs, {incVals: _incVals.map(Number), excVals: _excVals.map(Number), excCombs, incSums, excSums});
		const filterVisComb = (comb, combId) => filteredCombs.includes(comb) && !excCombs.includes(combId);
		let visCombs = allCombs.filter(filterVisComb);
		let {minSum, maxSum} = calcCombSums(visCombs);
		// This does not yet include filtering according to getCageInfo(cageId)
		//const {allCombs, filteredCombs, minSum, maxSum} = this.getCagesFromSelection(cage.cells).cages[0];
		let sumStr = this.cageSumStr({minSum, maxSum, combs: visCombs});
		this.summaryElem.textContent = `sum: ${sumStr} (${filteredCombs.length}/${allCombs.length})`;
		this.detailsElem.innerHTML = this.combsToHtml({cageId, cage, allCombs, filteredCombs});
		this.calculatorElem.classList.toggle('empty', visCombs.length === 0);
	};
	P.showMultiCage = function(cells) {
		let cageInfo = this.getCagesFromSelection(cells);
		if(cageInfo.cages.length === 0) return this.clearSummary();
		let allCount = 0, filteredCount = 0, totalSize = 0;
		minSum = 0; maxSum = 0;
		cageInfo.cages.forEach(cage => {
			allCount += cage.allCombs.length;
			filteredCount += cage.filteredCombs.length;
			minSum += cage.minSum;
			maxSum += cage.maxSum;
			totalSize += cage.size;
		});
		const cageToHtml = (cage, cageIdx, cages) => {
			const {cageId, isOutie, cells, allCombs, filteredCombs} = cage;
			let {inc, exc, cageVals, excCombs} = this.getCageInfo(cageId);
			cageVals.splice(0, cageVals.length, ...this.getCellVals(cage.cells));
			const _incVals = [...new Set([...inc, ...cageVals])];
			const _excVals = exc.filter(val => !cageVals.includes(val));
			const valToHtml = val => `<span class="digit` +
				(_incVals.includes(String(val)) ? ' include' : '') +
				(_excVals.includes(String(val)) ? ' exclude' : '') +
				(cageVals.includes(String(val)) ? ' forced' : '') +
				`">${val}</span>`;
			const combToHtml = (comb, combId) => (
				`<li data-set="${comb.join(',')}" data-cage="${cageId}" data-comb="${combId}" class="${
					(!filteredCombs.includes(comb) ? 'invalid ' : '') + 
					(excCombs.includes(combId) ? 'invalid exclude' : '')
				}">${comb.map(valToHtml).join('')}</li>`);
			let cageName = cages.length <= 1 ? '' : `${isOutie ? 'Outies' : `Cage ${cageIdx+1}`}<br/>`;			
			let labelHtml = `<label>${cageName}sum: ${this.cageSumStr(cage)} size: ${cells.length}</label>`;
			return `<li>${labelHtml}<ul class="combs">${allCombs.map(combToHtml).join('')}</ul></li>`;
		};
		this.summaryElem.textContent = `sum: ${this.cageSumStr({minSum, maxSum})} (${filteredCount}/${allCount})`;
		this.detailsElem.innerHTML = `<ul class="cages">${cageInfo.cages.map(cageToHtml).join('')}</ul>`;
	};
	P.update = function() {
		//console.info('KillerCalculator.update();');
		let {app} = Framework, {puzzle} = app, {currentPuzzle, selectedCells} = puzzle;
		//return this.showMultiCage(selectedCells);
		const {killerCages, selectedCage: cage} = this.getCages();
		// Hide calculator when no cages are found
		//this.calculatorElem.classList.toggle('hidden', killerCages.length === 0);
		if(cage === undefined) return this.clearSummary();
		const cageId = killerCages.indexOf(cage);
		this.showCage(cageId, cage);
	};
	P.attachElem = function() {
		this.detachElem();
		this.isAttached = true;
		const {createElem, app} = Framework;
		this.calculatorElem = createElem({
			parent: '#controls',
			class: 'killercalc-onscreen',
			children: [{class: 'summary'}, {class: 'details'}, {class: 'min'}]
		});
		this.summaryElem = this.calculatorElem.querySelector('.summary');
		this.detailsElem = this.calculatorElem.querySelector('.details');
		app.puzzle.on('progressloaded', this.handleLoad);
		app.puzzle.on('act', this.handleAct);
		app.puzzle.on('start', this.handleStart);
		this.handleScroll = attachScrollHandler(this.detailsElem, this.handleScroll);
		addDownEventHandler(this.calculatorElem, this.handleDown);
		addUpEventHandler(this.calculatorElem, this.handleClick);
		addUpEventHandler(this.detailsElem, this.handleClickDetails);
		this.puzzleInfo = Checker.getPuzzleInfo();
		this.update();
	};
	P.detachElem = function() {
		if(!this.isAttached) return;
		const {app} = Framework;
		app.puzzle.off('progressloaded', this.handleLoad);
		app.puzzle.off('act', this.handleAct);
		app.puzzle.off('start', this.handleStart);
		this.calculatorElem = document.querySelector('.killercalc-onscreen');
		this.summaryElem = this.calculatorElem.querySelector('.summary');
		this.detailsElem = this.calculatorElem.querySelector('.details');
		if(this.calculatorElem) {
			removeDownEventHandler(this.calculatorElem, this.handleDown);
			removeDownEventHandler(this.calculatorElem, this.handleClick);
			this.calculatorElem.remove();
			this.calculatorElem = undefined;
		}
		remHandler(window, 'mouseup touchend', this.handleScroll, {capture: true});
		if(this.detailsElem) {
			this.handleScroll = this.handleScroll.detach();
			removeUpEventHandler(this.detailsElem, this.handleClickDetails);
			this.detailsElem.remove();
			this.detailsElem = undefined;
		}
		this.isAttached = false;
	};
	P.handleLoad = function() {
		this.puzzleInfo = Checker.getPuzzleInfo();
	};
	P.handleDown = function(event) {
		event.preventDefault();
		event.stopPropagation();
	};
	P.handleClick = function(event) {
		event.preventDefault();
		event.stopPropagation();
		if(event.target.className === 'min') {
			this.calculatorElem.classList.toggle('short');
		}
		else {
			this.calculatorElem.classList.toggle('open');
		}
	};
	P.handleClickDetails = function(event) {
		let {incDigits, excDigits} = this;
		event.preventDefault();
		event.stopPropagation();
		let eventTarget = event.target, {classList} = eventTarget;
		let combElem = eventTarget.closest('li');
		if(combElem === null) return;
		let {dataset} = combElem;
		let {cage: cageId, comb: combId} = dataset;
		if(this.cages[cageId] === undefined) return;
		combId = parseInt(combId);
		let {inc, exc, cageVals, excCombs, incSums, excSums} = this.getCageInfo(cageId);
		if(classList.contains('digit')) {
			let val = eventTarget.textContent;
			if(!cageVals.includes(val)) {
				if(inc.includes(val)) {
					inc.splice(inc.indexOf(val), 1);
					exc.push(val);
				}
				else if(exc.includes(val)) {
					exc.splice(exc.indexOf(val), 1);
				}
				else {
					inc.push(val);
				}
			}
		}
		else if(classList.contains('sum')) {
			let sum = parseInt(eventTarget.dataset.sum);
			if(incSums.includes(sum)) {
				incSums.splice(incSums.indexOf(sum), 1);
				excSums.push(sum);
			}
			else if(excSums.includes(sum)) {
				excSums.splice(excSums.indexOf(sum), 1);
			}
			else {
				incSums.push(sum);
			}
		}
		else {
			if(excCombs.includes(combId)) {
				excCombs.splice(excCombs.indexOf(combId), 1);
			}
			else {
				excCombs.push(combId);
			}
		}
		this.update();
	};
	P.handleAct = function(act, action) {
		if(!Framework.app.puzzle.replayPlaying) this.update();
	};
	P.handleStart = function() {
		if(Framework.app.puzzle.replayPlaying) return;
		if(Framework.app.puzzle.replayStack.length === 0) {
			//console.warn('Puzzle start with empty replayStack: resetting killer calculator');
			this.cages = {};
		}
		this.update();
	};
	P.handleSettingToggle = function(settingOn) {
		if(settingOn) {
			this.attachElem();
		}
		else {
			this.detachElem();
		}
	};
	return C;
})();


const killerCalculator = new KillerCalculator();

Framework.addSetting({tag: 'toggle', group: 'advanced', name: 'toolcalculator',
	content: 'Show Killer Calculator',
	innerHTML: `<span class="icon">${KillerCalculator.icon}</span> Killer Calculator`,
	onToggle: killerCalculator.handleSettingToggle
});

Framework.addSetting({tag: 'toggle', group: 'advanced', name: 'toolcalculatorsum', content: 'Calculate Cell Sums'});

