
const PuzzleLoader = (() => {
	const {saveDecompress, saveDecodeURIComponent, fixFPuzzleSlashes, parseFPuzzle} = loadFPuzzle;
	const {saveJsonUnzip, zip} = PuzzleZipper;
	// Cache
		const cache = {};
		const updateCache = (puzzleId, data) => (cache[puzzleId] = data, data);
		const clearCache = puzzleId => puzzleId
			? delete cache[puzzleId]
			: Object.keys(cache).forEach(key => delete cache[key]);
		const cacheRaw = {};
		const updateCacheRaw = (puzzleId, data) => cacheRaw[puzzleId] = data;
		const clearCacheRaw = puzzleId => puzzleId
			? delete cacheRaw[puzzleId]
			: Object.keys(cacheRaw).forEach(key => delete cacheRaw[key]);
		const getPuzzleRaw = puzzleId => cacheRaw[puzzleId];
	// URLs
		const apiEncodePuzzleId = puzzleId => puzzleId.split('/').map(encodeURIComponent).join('/');
		const apiPuzzleUrlLocal = puzzleId => `/api/puzzle/${apiEncodePuzzleId(puzzleId)}`;
		const apiPuzzleUrlLegacyProxy = puzzleId => `https://sudokupad.svencodes.com/ctclegacy/${encodeURIComponent(puzzleId)}`;
		const apiPuzzleUrlLegacy = puzzleId => `https://firebasestorage.googleapis.com/v0/b/sudoku-sandbox.appspot.com/o/${encodeURIComponent(puzzleId)}?alt=media`;
		const apiPuzzleUrls = puzzleId => [apiPuzzleUrlLocal(puzzleId), apiPuzzleUrlLegacyProxy(puzzleId), apiPuzzleUrlLegacy(puzzleId)];
	// Puzzle Format
		const createReAlias = ({prefix, alias}) => alias instanceof RegExp ? alias : new RegExp(`^(${[...new Set([prefix, ...(alias ? (Array.isArray(alias) ? alias : [alias]) : [])])].sort((a, b) => b.length - a.length).join('|')})([\\s\\S]*)`, 'm');
		const PuzzleFormats = [];
		const parsePuzzleUnknown = async puzzleId => saveJsonUnzip(decompressPuzzleId(puzzleId));
		const addPuzzleFormat = pf => {
			let idx = PuzzleFormats.findIndex(({prefix}) => prefix === pf.prefix);
			if(idx !== -1) PuzzleFormats.splice(idx, 1);
			PuzzleFormats.push(Object.assign({}, pf, {reAlias: createReAlias(pf)}));
		};
		const getPuzzleFormatInfo = (puzzleId = '') => {
			for(const pf of PuzzleFormats) if(pf.reAlias.test(puzzleId)) return pf;
		};
		const getPuzzleFormat = (puzzleId = '') => {
			const pf = getPuzzleFormatInfo(puzzleId);
			if(pf) return pf.prefix;
			return '';
		};
		const stripPuzzleFormat = puzzleId => {
			const pf = getPuzzleFormatInfo(puzzleId);
			if(pf) return puzzleId.match(pf.reAlias)[2];
			return puzzleId;
		};
		const splitPuzzleFormat = puzzleId => {
			const pf = getPuzzleFormatInfo(puzzleId);
			if(pf) return [pf.prefix, puzzleId.match(pf.reAlias)[2]];
			return ['', puzzleId];
		};
		const isRemotePuzzleId = puzzleId => {
			const pf = getPuzzleFormatInfo(puzzleId);
			if(pf) return false;
			return true;
		};
		const decompressPuzzleId = puzzleId => {
			let puzzle;
			puzzle = stripPuzzleFormat(puzzleId);
			puzzle = saveDecodeURIComponent(puzzle);
			puzzle = fixFPuzzleSlashes(puzzle) || puzzle;
			puzzle = saveDecompress(puzzle);
			return puzzle;
		};
		const parsePuzzleData = async puzzleId => {
			try {
				const pf = getPuzzleFormatInfo(puzzleId);
				if(!pf || (typeof pf.parse !== 'function')) return parsePuzzleUnknown(puzzleId);
				return pf.parse(puzzleId);
			}
			catch(err) {
				console.error('parsePuzzleData:', err);
			}
			return puzzleId;
		};
		const resolvePuzzleData = async puzzleId => await parsePuzzleData(await fetchPuzzle(puzzleId));
		const createPuzzleId = (puzzleData, idPrefix) => {
			if(typeof puzzleData !== 'string') puzzleData = compressPuzzle(JSON.stringify(puzzleData));
			return (idPrefix || getPuzzleFormat(puzzleData)) + md5Digest(puzzleData);
		};
	// Fetch
		const fetchPuzzle = async (puzzleId, opts = {timeout: 10000}) => {
			if(!isRemotePuzzleId(puzzleId)) return puzzleId;
			if(cache[puzzleId] !== undefined) return cache[puzzleId];
			let lastError;
			console.time('fetchPuzzle');
			let tryPuzzleUrls = apiPuzzleUrls(puzzleId);
			for(let i = 0; i < tryPuzzleUrls.length; i++) {
				let url = tryPuzzleUrls[i];
				try {
					let puzzle = await (await fetchWithTimeout(url, opts)).text();
					if(url.includes('firebasestorage')) puzzle = zip(puzzle);
					if(!/^pack/.test(puzzle)) { // Skip this for puzzle packs
						puzzle = isRemotePuzzleId(puzzle) ? `scl${compressPuzzle(puzzle)}` : puzzle;
					}
					puzzle = updateCache(puzzleId, puzzle);
					if(puzzle.id === undefined) puzzle.id = puzzleId;
					console.timeEnd('fetchPuzzle');
					return puzzle;
				}
				catch(err) {
					console.info('Partial error in fetchPuzzle:', err.message);
					lastError = err;
				}
			}
			console.timeEnd('fetchPuzzle');
			throw lastError;
		};
	
	// Init PuzzleFormats
		const parsePuzzleScl = async puzzleId => saveJsonUnzip(decompressPuzzleId(puzzleId));
		const parsePuzzleFpuz = async puzzleId => saveJsonUnzip(parseFPuzzle(saveJsonUnzip(decompressPuzzleId(puzzleId))));
		const parsePuzzleScf = async puzzleId => saveJsonUnzip(PuzzleTools.decodeSCF(decompressPuzzleId(puzzleId)));
		[
			{prefix: 'scl', alias: ['ctc'], parse: parsePuzzleScl},
			{prefix: 'fpuz', alias: ['fpuzzles'], parse: parsePuzzleFpuz},
			{prefix: 'scf', parse: parsePuzzleScf},
		].forEach(addPuzzleFormat);
	
	return {
		apiEncodePuzzleId,
		apiPuzzleUrlLocal, apiPuzzleUrlLegacyProxy, apiPuzzleUrlLegacy,
		cache, clearCache, updateCache, cacheRaw, updateCacheRaw, clearCacheRaw, getPuzzleRaw,
		addPuzzleFormat, getPuzzleFormat, stripPuzzleFormat, splitPuzzleFormat, isRemotePuzzleId,
		saveDecompress, saveJsonUnzip, decompressPuzzleId,
		parsePuzzleData, resolvePuzzleData,
		createPuzzleId,
		fetchPuzzle,
	};
})();