
function createSolver(puzzle81) {
	const digits = '123456789'.split('');
	const rowOffset = [0, 1, 2, 3, 4, 5, 6, 7, 8];
	const colOffset = [0, 9, 18, 27, 36, 45, 54, 63, 72];
	const boxOffset = [0, 1, 2, 9, 10, 11, 18, 19, 20];
	let puzzle729 = [];
	const buildCellMap = (cellMap = []) => {
		for(let i = 0; i < 81; i++) {
			let r = Math.floor(i / 9), c = i % 9, targetCells = [];
			for(let ii = 0; ii < 9; ii++) {
				targetCells.push(ii * 9 + c, r * 9 + ii, (Math.floor(r / 3) * 3 + Math.floor(ii / 3)) * 9 + (Math.floor(c / 3) * 3 + Math.floor(ii % 3)));
			}
			cellMap[i] = [...new Set(targetCells)].sort((a, b) => a - b);
			cellMap[i].splice(cellMap[i].indexOf(i), 1);
		}
		return cellMap;
	};
	const puzzle81to729 = (puzzle81, puzzle729 = []) => {
		puzzle81.split('').forEach((v, vi) => digits.forEach((d, di) =>
			puzzle729[vi * 9 + di] = v === '.'
				? d
				: puzzle729[vi * 9 + di] = (d === v ? v : '.'))
		);
		return puzzle729;
	};
	const toPuzzle81 = () => {
		let puzzle81 = [];
		for(let i = 0; i < 81; i++) {
			let val = getVal(i);
			puzzle81[i] = (val.length === 1) ? val : '.';
		}
		return puzzle81.join('');
	};
	const getVal = (idx) => {
		let val = [];
		for(let i = idx * 9; i < idx * 9 + 9; i++) {
			if(puzzle729[i] !== '.') val.push(puzzle729[i]);
		}
		return val.join('');
	};
	const setVal = (idx, val) => {
		for(di = 0; di < 9; di++) {
			puzzle729[idx * 9 + di] = String(1 + di) === val ? val : '.';
		}
	};
	const getCands = idx => puzzle729.slice(idx * 9, idx * 9 + 9);
	const showState = (app, stateData) => {
		let puzzle = Framework.app.puzzle, grid = puzzle.grid;
		puzzle.clearPuzzle();
		let puzzle729bak = [...puzzle729];
		if(stateData === undefined) stateData = puzzle729;
		if(stateData.length === 81) puzzle729 = puzzle81to729(stateData);
		for(let i = 0; i < 81; i++) {
			let r = Math.floor(i / 9), c = i % 9, cell = grid.getCell(r, c);
			cell.clearAll();
			if(puzzle81[i].match(/[1-9]/)) {
				cell.setGiven(puzzle81[i]);
			}
			else {
				cell.setGiven();
				let cands = getCands(i), val = cands.join('').replace(/\./g, '');
				cands.forEach((v, i) => v !== '.' ? cell.propSet('centre', v) : null);
				if(val.length === 1) cell.propSet('normal', val);
			}
		}
		puzzle729 = puzzle729bak;
	}
	const hasBrokenCells = () => {
		let valCount;
		for(let i = 0; i < 81; i++) {
			valCount = 9;
			for(let di = 0; di < 9; di++) {
				if(puzzle729[i * 9 + di] === '.') valCount--;
			}
			if(valCount === 0) return true;
		}
		return false;
	}
	const removeCandidate = (idx, cand) => puzzle729[idx * 9 + parseInt(cand) - 1] = '.';
	const updateCandidates = () => {
		for(let i = 0; i < 81; i++) {
			let val = getVal(i);
			if(val.length === 1) {
				for(let ii = 0, len = cellMap[i].length; ii < len; ii++) {
					puzzle729[cellMap[i][ii] * 9 + parseInt(val) - 1] = '.';
				}
			}
		}
	};
	const findHiddenSingles = () => {
		let hiddenSingles = {}, row = [], col = [], box = [];
		let di;
		for(di = 0; di < 9; di++) {
			row[di] = [];
			col[di] = [];
			box[di] = [];
		}
		for(let i = 0; i < 9; i++) {
			for(let di = 0; di < 9; di++) row[di].length = col[di].length = box[di].length = 0;
			for(let ii = 0; ii < 9; ii++) {
				let ri = 9 * i + rowOffset[ii];
				let ci = i + colOffset[ii];
				let bi = Math.floor(i / 3) * 27 + (i * 3) % 9 + boxOffset[ii];
				for(di = 0; di < 9; di++) {
					if(puzzle729[ri * 9 + di] !== '.') row[di].push(ri);
					if(puzzle729[ci * 9 + di] !== '.') col[di].push(ci);
					if(puzzle729[bi * 9 + di] !== '.') box[di].push(bi);
				}
			}
			for(di = 0; di < 9; di++) {
				let val = String(1 + di);
				if(row[di].length === 1 && getVal(row[di][0]) !== val) hiddenSingles[row[di][0]] = val;
				if(col[di].length === 1 && getVal(col[di][0]) !== val) hiddenSingles[col[di][0]] = val;
				if(box[di].length === 1 && getVal(box[di][0]) !== val) hiddenSingles[box[di][0]] = val;
			}
		}
		return hiddenSingles;
	};
	const clearSingles = singles => Object.keys(singles).forEach(idx => setVal(idx, singles[idx]));
	const solveSingles = () => {
		updateCandidates();
		let hiddenSingles = findHiddenSingles();
		while(Object.keys(hiddenSingles).length > 0) {
			clearSingles(hiddenSingles);
			updateCandidates();
			hiddenSingles = findHiddenSingles();
		}
	}
	const findSolutions = (maxSolutions = 1) => {
		let solutions = [];
		const findNextSolution = (cell = 0) => {
			solveSingles();
			if(hasBrokenCells()) return false;
			let valCount;
			do {
				valCount = 9;
				for(let di = 0; di < 9; di++) if(puzzle729[cell * 9 + di] === '.') valCount--;
			}
			while(valCount <= 1 && cell++ < 81);
			if(cell >= 81) {
				solutions.push(toPuzzle81());
				return true;
			}
			let savedPuzzle = puzzle729;
			for(let di = 0; di < 9; di++) {
				if(puzzle729[cell * 9 + di] !== '.') {
					puzzle729 = [...savedPuzzle];
					setVal(cell, String(1 + di));
					let res = findNextSolution(cell + 1);
					puzzle729 = savedPuzzle;
					if(res && (maxSolutions > 0) && solutions.length >= maxSolutions) return true;
				}
			}
			return false;
		};
		findNextSolution(0);
		return solutions;
	};
	const cellMap = buildCellMap();
	puzzle81to729(puzzle81, puzzle729);
	return {
		puzzle81, puzzle729,
		toPuzzle81,
		updateCandidates,
		showState,
		hasBrokenCells,
		findHiddenSingles,
		clearSingles,
		solveSingles,
		findSolutions
	};
}