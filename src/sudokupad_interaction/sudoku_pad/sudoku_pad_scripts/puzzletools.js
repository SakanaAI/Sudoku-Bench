const PuzzleTools = (() => {
	const encode70Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz()[]-.~:@!$&\'*,;=_';
	const reEncode70Chars = new RegExp(`^[123456789${encode70Chars.replace(/./g, '\\$&')}]+$`);
	const encode70CharsMax = encode70Chars.length - 1;
	const encode70 = num => encode70Chars[num];
	const decode70 = char => encode70Chars.indexOf(char);

	const blankEncodes = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwx';
	const reBlankEncodes = new RegExp(`^[${blankEncodes}]+$`);
	const blanksMap = ['', '0', '00', '000', '0000', '00000'];


	function PuzzleTools() {}
	const PT = PuzzleTools, P = Object.assign(PuzzleTools.prototype, {constructor: PuzzleTools});

	// classic codec
		PT.reEncode70Chars = reEncode70Chars;
		PT.reBlankEncodes = reBlankEncodes;
		PT.rePuzzlePrefix = /^(scf|fpuz(?:zles)?|scl|ctc|classic)?(.*)$/;
		PT.MaxRemoteIdLength = 60;
		PT.zipClassicSudoku = (givens) => {
			let blanks = 0, data = '';
			const encodeBlanks = () => {
				while(blanks > 0) {
					data += encode70(Math.min(encode70CharsMax, blanks));
					blanks = Math.max(0, blanks - encode70CharsMax);
				}
			};
			for(let i = 0; i < givens.length; i++) {
				if(givens[i] === '_') blanks++
				else {
					encodeBlanks();
					data += givens[i];
				}
			}
			encodeBlanks();
			return data;
		};
		PT.unzipClassicSudoku = (zipped) => {
			zipped = zipped.split('');
			let unzipped = '', decoded;
			for(let i = 0; i < zipped.length; i++) {
				decoded = decode70(zipped[i]);
				if(decoded === -1) unzipped += zipped[i]
				else while(decoded-- > 0) unzipped += '_';
			}
			return unzipped;
		};
		PT.zipClassicSudoku2 = (puzzle = '') => {
			if(puzzle.length === 0) return '';
			let charCode = puzzle[0].charCodeAt(0), digit = (charCode >= 49 && charCode <= 57) ? puzzle[0] : '0';
			let res = '', blanks = 0;
			for(let i = 1; i < puzzle.length; i++) {
				let charCode = puzzle[i].charCodeAt(0), next = (charCode >= 49 && charCode <= 57) ? puzzle[i] : '0';
				if(blanks === 5 || next !== '0') {
					res += blankEncodes[Number(digit) + blanks * 10];
					digit = next;
					blanks = 0;
				}
				else blanks++;
			}
			res += blankEncodes[Number(digit) + blanks * 10];
			return res;
		};
		PT.unzipClassicSudoku2 = zipped => {
			let res = [];
			for(let i = 0; i < zipped.length; i++) {
				let dec = blankEncodes.indexOf(zipped[i]);
				res.push(String(Number(dec % 10)), blanksMap[Math.floor(dec / 10)]);
			}
			return res.join('');
		};
		PT.zip = puzzle => {
			return PT.zipClassicSudoku2(puzzle);
		};
		PT.unzip = (zipped = '') => {
			// Warning: Since formats aren't keyed, and can be valid in either format, this is a best guess algo
			zipped = zipped.replace(/^classic/, '');
			let match1 = reEncode70Chars.test(zipped), match2 = reBlankEncodes.test(zipped);
			if(!match1 && !match2) return; // Unknown chars
			if(match1 && !match2) return PT.unzipClassicSudoku(zipped); // Chars only valid for classic1
			if(match2 && !match1) return PT.unzipClassicSudoku2(zipped); // Chars only valid for classic2
			let unzipped2 = PT.unzipClassicSudoku2(zipped);
			if(Math.sqrt(unzipped2.length) % 1 === 0) return unzipped2; // is NxN in classic2, high probability
			let unzipped1 = PT.unzipClassicSudoku(zipped);
			if(Math.sqrt(unzipped1.length) % 1 === 0) return unzipped1; // is NxN in classic1, high probability
			return unzipped2; // Finally return classic2 format
		};
	// format checking
		PT.isJson = data => {
			try { JSON.parse(data); return true; }
			catch(err) { return false; }
		};
		PT.isPZZipped = data => {
			try { return !PT.isJson(data) && PT.isJson(PuzzleZipper.unzip(data)); }
			catch(err) { return false; }
		};
		PT.isFPuzzZipped = data => {
			const {saveDecodeURIComponent, decompressPuzzle} = loadFPuzzle;
			try {
				if(typeof data !== 'string') return false;
				data = data.replace(/^fpuzzles/, '');
				data = saveDecodeURIComponent(data);
				let decomp = decompressPuzzle(data);
				if(decomp === null) return false;
				return PT.isJson(decomp);
			}
			catch(err) { return false; }
		};
		PT.isClassic = (data = '') => {
			data = data.replace(/^classic/, '');
			let unzipped = PT.unzipClassicSudoku(data);
			return unzipped.length === 81;
		};
		PT.isClassic2 = (data = '') => {
			if(!reBlankEncodes.test(data)) return false;
			let unzipped = PT.unzipClassicSudoku2(data);
			return unzipped.length === 81;
		};
		PT.isCTC = data => {
			if(PT.isPZZipped(data)) return true;
			if(!PT.isJson(data)) return false;
			let json = JSON.parse(data);
			return (
				(json.cellSize === 50)
				&& Array.isArray(json.cells)
				&& Array.isArray(json.arrows)
				&& Array.isArray(json.cages)
				&& Array.isArray(json.lines)
				&& Array.isArray(json.regions)
				&& Array.isArray(json.overlays)
				&& Array.isArray(json.underlays)
			);
		};
		PT.isFPuzz = data => {
			if(PT.isFPuzzZipped(data)) return true;
			if(!PT.isJson(data)) return false;
			let json = JSON.parse(data);
			return (
				(Number.isInteger(json.size))
				&& Array.isArray(json.grid)
			);
		};
		PT.reSCF = /^scf(.*)/;
		PT.isSCF = data => PT.reSCF.test(data);
		PT.getPuzzleFormat = data => {
			if(PT.isClassic(data)) return 'classic';
			if(PT.isPZZipped(data)) return 'ctc.pz';
			if(PT.isCTC(data)) return 'ctc';
			if(PT.isFPuzzZipped(data)) return 'fpuzzles.lz';
			if(PT.isFPuzz(data)) return 'fpuzzles';
			if(PT.isSCF(data)) return 'scf';
			return 'unknown';
		};
	// tests
		PT.runTests = () => Promise.all([
				Promise.resolve('classic_M'),
				Promise.resolve('classicNOTVALID'),
				Promise.resolve('classicB6B91D7C2E15F4D9C3K6D4B3D25D4F8F87B4C5B7C3B'),
				fetch(PuzzleLoader.apiPuzzleUrlLegacy('ddGfd499G7')).then(res => res.text()),
				fetch(PuzzleLoader.apiPuzzleUrlLegacy('4FN8RN9LfN')).then(res => res.text()),
				fetch(PuzzleLoader.apiPuzzleUrlLocal('ddGfd499G7')).then(res => res.text()),
				fetch(PuzzleLoader.apiPuzzleUrlLocal('4FN8RN9LfN')).then(res => res.text()),
				loadFPuzzle.fpuzzlesFetchRawId('fpuzzlesyhkyz63b'),
				Promise.resolve('N4IgzglgXgpiBcBOANCA5gJwgEwQbT2AF9ljSSzKLryBdZQmq8l54+x1p7rjtn/nQaCR3PgIm9hk0UM6zR4rssW0iQA='),
				Promise.resolve('fpuzzlesN4IgzglgXgpiBcBmANCA5gJwgEwQbT2AF9ljSiBdZQks4qm88iiooA=='),
				Promise.resolve('N4IgzglgXgpiBcBmANCA5gJwgEwQbT2AF9ljSiBdZQks4qm88iiooA=='),
				Promise.resolve('{"size":3,"grid":[[{},{},{}],[{},{},{}],[{},{},{}]]}'),
			])
			.then(testData => {
				testData.forEach(data => {
					console.log('getPuzzleFormat("%s..."):', data.slice(0, 30), PuzzleTools.getPuzzleFormat(data));
				});
			});
	// Images
		PT.dataToBlobUrl = (data, type) => window.URL.createObjectURL(new Blob([data], {type}));
		PT.blobToBlobUrl = blob => window.URL.createObjectURL(blob);
		PT.svgToBlob = async svg => await (await fetch(PT.svgToDataUri(svg))).blob();
		PT.imgUriToBlob = async (src, type, quality) => {
			if(type === undefined) return (await fetch(src)).blob();
			const img = Object.assign(new Image(), {src});
			await img.decode();
			const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
			ctx.drawImage(img, 0, 0);
			return canvasToBlob(canvas, type, quality);
		};
		PT.base64DataUrlToBlob = dataUrl => {
			let [m, mime, base64Data] = (dataUrl.match(/^data:(.*?);base64,(.*)$/) || []),
					bstr = atob(base64Data), n = bstr.length, u8arr = new Uint8Array(n);
			while(n--) u8arr[n] = bstr.charCodeAt(n);
			return new Blob([u8arr], {type: mime});
		};
		PT.urlToImg = (url, timeoutMs = 3000) => new Promise((resolve, reject) => {
			let img = document.createElement('img'), timeoutId;
			const handleOnload = () => {
				clearTimeout(timeoutId);
				resolve(img);
			};
			const handleOnerror = (err) => {
				clearTimeout(timeoutId);
				reject(err);
			};
			const handleTimeout = () => reject(new Error(`urlToImg timed out for url: ${JSON.stringify(url)}`));
			timeoutId = setTimeout(handleTimeout, timeoutMs);
			img.onload = handleOnload;
			img.error = handleOnerror;
			img.src = url;
		});
		PT.svgToImg = data => new Promise((resolve, reject) => {
			let img = document.createElement('img');
			img.onload = () => resolve(img);
			img.error = reject;
			img.src = PT.dataToBlobUrl(data, 'image/svg+xml');
		});
		PT.imgToCanvas = img => {
			const {width, height} = img;
			let canvas = Object.assign(document.createElement('canvas'), {width, height}), ctx = canvas.getContext('2d');
			ctx.drawImage(img, 0, 0);
			return canvas;
		};
		PT.imgToPngUrl = (img, opts = {}) => new Promise((resolve, reject) => {
			let {width = 64, height = 64, background = 'var(--body-bg)', type = 'image/png', quality, canvas} = opts;
			if(canvas === undefined) {
				canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				canvas.style.cssText = `
					image-rendering: -moz-crisp-edges;
					image-rendering: -webkit-crisp-edges;
					image-rendering: pixelated;
					image-rendering: crisp-edges;
				`;
			}
			let ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, width, height);
			if(background) {
				ctx.fillStyle = background;
				ctx.fillRect(0, 0, width, height);
			}
			let drawScale = scaleToFit(img, canvas);
			let w = img.width * drawScale, h = img.height * drawScale;
			let x = 0.5 * (canvas.width - w), y = 0.5 * (canvas.height - h);
			ctx.drawImage(img, x, y, w, h);
			resolve(canvas.toDataURL(type, quality));
		});
		PT.svgToDataUri = (() => {
			const reHex = /%[\dA-F]{2}/g, reWs = /\s+/g, reQuotes = /"/g,
						hexEncode = {'%20':' ','%3D':'=','%3A':':','%2F':'/'},
						hexEnc = str => hexEncode[str] || str.toLowerCase();
			return svg => {
				if(svg.charCodeAt(0) === 0xfeff) svg = svg.slice(1);
				svg = svg.trim().replace(reWs, ' ').replace(reQuotes, `'`);
				return `data:image/svg+xml,${encodeURIComponent(svg).replace(reHex, hexEnc)}`;
			};
		})();
		PT.decodeHTMLEntities = (str, ents = {'amp': '&', 'apos': '\'', 'lt': '&#x3c;', 'gt': '&#x3e;', 'nbsp': ' ', 'quot': '"'}) =>
			str.replace(new RegExp(`&(${Object.keys(ents).join('|')});`, 'g'), (_, m) => ents[m]);
		PT.svgToDataUriBase64 = svg => `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(PT.decodeHTMLEntities(svg))))}`;
	// Screenshots
		PT.ThumbStaticStyles = `
			* {font-family: Roboto, Arial, sans-serif; vector-effect: none !important;}
			#cell-highlights { display: none; }`;
		PT.reSvgCssRule = /^([.](pm|cell|puzzle|colou?r|box|killer|cage|fog(?:ofwar)?|pen(hint|color|)?)-|[#]svgrenderer|[#](fog(?:ofwar)?)|[:](root)|\.setting-(nogrid|dashedgrid)|@font-face)/;
		PT.ThumbSettingsExclude = ['darkmode'];
		PT.reSettingClassName = /^setting-(.+)$/;
		PT.getSvgCSS = async (styleSheets = document.styleSheets) => {
			const reStyleFilters = [PT.reSvgCssRule];
			for(const setting of PT.ThumbSettingsExclude)
				if(Framework.getSetting(setting))
					reStyleFilters.push(new RegExp(`\.setting-${setting}`));
			const layerEls = [...document.querySelectorAll('#svgrenderer > g:not(.defs)')];
			reStyleFilters.push(new RegExp(`^#(?:${layerEls.map(el => el.id).join('|')})`));
			const styleRules = [...styleSheets]
				.flatMap(style => [...(style.rules || style.cssRules)])
				.map(rule => rule.cssText)
				.filter(r => reStyleFilters.some(re => re.test(r)));
			/*
			// Inline font data
			const fontUrlToBase64 = url => new Promise(async resolve => {
				const reader = new FileReader();
				reader.onloadend = () => resolve(reader.result);
				reader.readAsDataURL(await (await fetch(url)).blob());
			});
			const reCssFontUrl = /(?<=@font-face.*url\(\"?)([^)"]*)(?=\"?\))/m;
			let fontRules = await Promise.all(styleRules
				.filter(r => reCssFontUrl.test(r))
				.map(r => new Promise(async resolve => resolve([r, await fontUrlToBase64(r.match(reCssFontUrl)[1])])))
			);
			for(const [r, fontData] of fontRules) {
				styleRules[styleRules.indexOf(r)] = r.replace(reCssFontUrl, fontData);
			}
			*/
			return styleRules
				.map(r => r.replace(/#svgrenderer/g, 'svg')) // Convert #svgrenderer selectors
				.join('\n')
				+ PT.ThumbStaticStyles;
		};
		PT.injectSvgStyles = (svgElem, styles, selector = 'defs') => {
			const xmldoc = new DOMParser().parseFromString('<xml></xml>', 'application/xml');
			const styleElem = Object.assign(document.createElement('style'), {type: 'text/css'});
			styleElem.append(xmldoc.createCDATASection(styles));
			svgElem.querySelector(selector).prepend(styleElem);
			return styleElem;
		};
		PT.puzzleToSvg = async (opts = {}) => {
			const {app: {svgRenderer: {svgElem}}} = Framework;
			const serializer = new XMLSerializer();
			const styleElem = PT.injectSvgStyles(svgElem, await PT.getSvgCSS());
			const {width = 64, height = 64, background = 'var(--body-bg)'} = opts;
			const attrsToSave = ['viewBox', 'width', 'height', 'style', 'class', 'id'], savedAttrs = {};
			attrsToSave.forEach(attr => {
				savedAttrs[attr] = svgElem.getAttribute(attr);
				svgElem.removeAttribute(attr);
			});
			if(opts.trim) {
				let b = Framework.app.svgRenderer.getContentBounds();
				svgElem.setAttribute('viewBox', `${b.left - 1.5} ${b.top - 1.5} ${b.width + 3} ${b.height + 3}`);
			}
			else {
				svgElem.setAttribute('viewBox', savedAttrs['viewBox']);
			}
			svgElem.setAttribute('width', width);
			svgElem.setAttribute('height', height);
			svgElem.setAttribute('style', `background: ${background};`);
			const thumbSettings = [...document.body.classList].filter(c=>PT.ThumbSettingsExclude.includes(c.replace(PT.reSettingClassName, '$1')));
			svgElem.setAttribute('class', thumbSettings.join(' '));
			const res = serializer.serializeToString(svgElem);
			styleElem.remove();
			attrsToSave.forEach(attr => savedAttrs[attr]
				? svgElem.setAttribute(attr, savedAttrs[attr])
				: svgElem.removeAttribute(attr)
			);
			return res;
		};
		PT.startDownload = (dataUrl, opts = {}) => {
			let {downloadA} = opts;
			if(opts.downloadA === undefined) {
				downloadA = opts.downloadA = document.createElement('a');
				downloadA.style.display = 'none';
				document.body.appendChild(downloadA);
			}
			downloadA.href = dataUrl;
			downloadA.setAttribute('download', opts.filename);
			downloadA.click();
		};
		PT.convertSvgToFormat = (svg, opts = {}) => Promise.resolve()
			.then(() => {
				switch(opts.format) {
					case 'svg': return svg;
					case 'img': return PT.svgToImg(svg);
					default: return PT.svgToImg(svg).then(img => PT.imgToPngUrl(img, opts));
				}
			});
		PT.downloadSvgToFormat = (svg, opts = {}) => Promise.resolve()
			.then(() => (opts.download === undefined) ? null : Promise.resolve()
					.then(() => {
					switch(opts.download) {
						case 'svg': return Promise.resolve(PT.dataToBlobUrl(svg, 'image/svg+xml'));
						case 'png': return PT.svgToImg(svg).then(img => PT.imgToPngUrl(img, opts));
						default: throw Error(`Invalid download format: "${opts.download}"`);
					}
				})
				.then(data => PT.startDownload(data, Object.assign({}, opts, {filename: `${opts.filename}.${opts.ext || opts.download}`})))
			);
		PT.createThumbnail = (opts = {}) => Promise.resolve(Framework.app)
			.then(app => Promise.resolve()
				.then(() => opts.puzzleId ? app.loadRemoteCTCPuzzle(opts.puzzleId) : null)
				.then(() => opts.clearProgress ? app.clearPuzzle() : null)
				.then(() => PT.puzzleToSvg(opts))
				.then(svg => Promise.all([
					PT.downloadSvgToFormat(svg, Object.assign({filename: `${app.puzzle.puzzleId}_thumb`}, opts)),
					PT.convertSvgToFormat(svg, opts)
				]))
				.then(([dl, res]) => res)
			);
		PT.createThumbnails = (puzzleIds, opts = {}) => {
			let thumbImgs = [], format = opts.format || 'png';
			const thumbExists = opts.checkExists
				? puzzleId => fetch(`/api/thumbnails/${puzzleId}_thumb.png`).then(res => res.status !== 404)
				: () => Promise.resolve(false);
			const fetchNextThumbnail = (puzzleIds) => Promise.resolve(puzzleIds.pop())
				.then(puzzleId => thumbExists(puzzleId).then(exists => exists ? null
					: PT.createThumbnail(Object.assign({puzzleId}, opts)).then(res => thumbImgs.push({id: puzzleId, res}))
				))
				.then(() => puzzleIds.length > 0
					? new Promise((resolve, reject) => setTimeout(resolve, 10)).then(() => fetchNextThumbnail(puzzleIds))
					: null
				)
				.then(() => thumbImgs);
			return fetchNextThumbnail(puzzleIds)
				.catch(err => console.error(err));
		};
		PT.createLinkedThumbnail = (filename, opts = {}) =>
			PuzzleTools.createThumbnail(Object.assign({width: 256, height: 256, format: 'png'}, opts))
			.then(PuzzleTools.urlToImg)
			.then(img => PuzzleTools.imgToCanvas(img))
			.then(canvas => Stegosaur.encode(canvas, document.location.pathname.replace(/^.*sudoku\/(.*)/, '$1')))
			.then(canvas => PuzzleTools.startDownload(canvas.toDataURL('image/png'), {filename}));
		PT.listenForLinkedThumbnailDrop = () => {
			window.addEventListener('dragenter', event => event.preventDefault());
			window.addEventListener('dragover', event => event.preventDefault());
			window.addEventListener('drop', event => {
				if(event.dataTransfer.types.includes('Files') && event.dataTransfer.files.length > 0 && event.dataTransfer.files[0].type === 'image/png') {
					event.preventDefault();
					Object.assign(new FileReader(), {onload: event => 
						PuzzleTools.urlToImg(event.target.result)
							.then(PuzzleTools.imgToCanvas)
							.then(canvas => document.location.pathname = `/sudoku/${Stegosaur.decode(canvas)}`)})
					.readAsDataURL(event.dataTransfer.files[0]);
				}
			});
		};
	// Cell iteration
		PT.A_NINE = [...Array(9).keys()];
		PT.indexToRegion = {
			row: idx => ~~(idx / 9),
			col: idx => (idx % 9),
			box: idx => ~~(idx / 27) * 3 + (~~(idx / 3) % 3)
		};
		PT.regionToIdx = {
			row: i => i * 9,
			col: i => i,
			box: i => ~~(i / 3) * 27 + i * 3 % 9
		};
		PT.regionToSeen = {
			row: r => PT.A_NINE.map(n => r * 9 + n),
			col: r => PT.A_NINE.map(n => r + n * 9),
			box: r => PT.A_NINE.map(n => (~~(r / 3) * 27 + r * 3 % 9) + ~~(n / 3) * 9 + n % 3)
		};
		PT.idxToSeen = {
			row: idx => PT.A_NINE.map(n => ~~(idx / 9) * 9 + n),
			col: idx => PT.A_NINE.map(n => (idx % 9) + n * 9),
			box: idx => PT.A_NINE.map(n => ~~(idx / 27) * 27 + ~~((idx % 9) / 3) * 3 + ~~(n / 3) * 9 + n % 3)
		};
		PT.idxAligned = {
			row: (idxList, row = PT.idxToSeen.row(idxList[0])) => idxList.every(i => row.includes(i)),
			col: (idxList, col = PT.idxToSeen.col(idxList[0])) => idxList.every(i => col.includes(i)),
			box: (idxList, box = PT.idxToSeen.box(idxList[0])) => idxList.every(i => box.includes(i))
		};
		PT.getClassicSeenCells = idx => {
			let seen = [], row, col, box;
			for(let i = 0; i < 9; i++) {
				row = ~~(idx / 9) * 9 + i;
				col = (idx % 9) + i * 9;
				box = ~~(~~(idx / 9) / 3) * 3 * 9 + ~~((idx % 9) / 3) * 3 +	~~(i / 3) * 9 + i % 3;
				seen.push(row, col, box);
			}
			return [...new Set(seen)];
		};
		// idxSeen
			const idxToRow = (idx, rows = 9, cols = 9) => (idx / cols) | 0;
			const idxToCol = (idx, rows = 9, cols = 9) => idx % cols;
			const idxSeenRow = (idx, rows = 9, cols = 9) => {
				let seen = [], row = (idx / cols) | 0;
				for(let c = 0; c < cols; c++) seen.push(row * cols + c);
				return seen;
			};
			const idxSeenCol = (idx, rows = 9, cols = 9) => {
				let seen = [], col = idx % cols;
				for(let r = 0; r < rows; r++) seen.push(r * cols + col);
				return seen;
			};
			const idxIsRowAligned = (idxList, rows = 9, cols = 9) => {
				if(idxList.length === 0) return false;
				let len = idxList.length, row = (idxList[0] / cols) | 0;
				for(let i = 1; i < len; i++) {
					if(row !== ((idxList[i] / cols) | 0)) return false;
				}
				return true;
			};
			const idxIsColAligned = (idxList, rows = 9, cols = 9) => {
				if(idxList.length === 0) return false;
				let len = idxList.length, col = idxList[0] % cols;
				for(let i = 1; i < len; i++) {
					if(col !== (idxList[i] % cols)) return false;
				}
				return true;
			};
			const idxFilterSeen = (marked, seen) => [...new Set(seen.filter(idx => !marked.includes(idx)))];
			const idxSeenByPencilMarks = (marked, rows = 9, cols = 9) => {
				let seen = [];
				if(marked.length === 0) return seen;
				if(marked.length > 1) {
					if(idxIsRowAligned(marked, rows, cols)) seen.push.apply(seen, idxSeenRow(marked[0], rows, cols));
					if(idxIsColAligned(marked, rows, cols)) seen.push.apply(seen, idxSeenCol(marked[0], rows, cols));
				}
				return seen;
			};
		Object.assign(PT, {
			idxToRow, idxToCol,
			idxSeenRow, idxSeenCol,
			idxIsRowAligned, idxIsColAligned,
			idxFilterSeen, idxSeenByPencilMarks,
		});

		const unionCageCells = PT.unionCageCells = cages => {
			let res = [];
			cages
				.forEach(cells => cells
					.forEach(cell => res.includes(cell) ? null : res.push(cell))
				);
			return res;
		};
		const intersectCageCells = PT.intersectCageCells = ([first, ...rest]) => first.filter(cell => rest.every(cells => cells.includes(cell)));
		const seenByMatrix = (rows, cols, idx, matrix) => {
			let res = [];
			let cellR = ~~(idx / cols), cellC = idx % cols
			matrix.forEach(([r, c]) => {
				r += cellR; c += cellC;
				if(r >= 0 && r < rows && c >= 0 && c < cols) res.push(r * cols + c);
			});
			return res;
		};
		const seenKingMatrix = [
			[-1, -1], [-1,  0], [-1,  1],
			[ 0, -1],         , [ 0,  1],
			[ 1, -1], [ 1,  0], [ 1,  1],
		];
		const seenKnightMatrix = [
			[-2, -1], [-2,  1],
			[-1, -2], [-1,  2],
			[ 1, -2], [ 1,  2],
			[ 2, -1], [ 2,  1],
		];
		const seenKing = (rows, cols, idx) => seenByMatrix(rows, cols, idx, seenKingMatrix);
		const seenKnight = (rows, cols, idx) => seenByMatrix(rows, cols, idx, seenKnightMatrix);
		PT.seenCageCells = (cell, {rows, cols, cells, cages = [], antiking, antiknight}, ignorefog = false) => {
			cages = cages.filter(cells => cells.includes(cell));
			if(antiking) cages.push(seenKing(rows, cols, cells.indexOf(cell)).map(i => cells[i]));
			if(antiknight) cages.push(seenKnight(rows, cols, cells.indexOf(cell)).map(i => cells[i]));
			let seenCells = unionCageCells(cages);
			if(!ignorefog) seenCells = seenCells.filter(cell => !cell.hideclue);
			return seenCells;
		};
	// SCF
		PT.codoku = p=>p.replace(/.0{0,5}/g,d=>String.fromCharCode((d=+d[0]+10*d.length)+(d<20?38:d<46?45:51)));
		PT.dedoku = p=>p.replace(/./g,d=>(d=d.charCodeAt()-(d>'Z'?61:d>'9'?55:48),d%10+'0'.repeat(d/10)));
		PT.decodeSCF = scf => {
			const {codoku, dedoku} = PT;
			const addGivens = (puz, givens = '') => {
				let cells = puz.cells = [], regions = puz.regions = [];
				for(var r = 0; r < 9; r++) {
					cells[r] = [];
					regions[r] = [];
					for(var c = 0; c < 9; c++) {
						cells[r][c] = {};
						regions[r][c] = [~~(r / 3) * 3 + ~~(c / 3), (r * 3) % 9 + c % 3];
						let given = givens[r * 9 + c];
						if(given === undefined) continue;
						let digit = Number(given);
						if(digit !== 0) cells[r][c].value = digit;
					}
				}
				return puz;
			};
			const addMetaData = (puz, key, val) => {
				if(val !== undefined) {
					let md = puz.metadata = puz.metadata || {};
					if(md[key] === undefined) md[key] = val
					else {
						if(!Array.isArray(md[key])) md[key] = [md[key]];
						md[key].push(val);
					}
				}
				return puz;
			};
			const addRuleText = (puz, ruleText) => {
				puz.metadata = puz.metadata || [];
				puz.metadata.rules = puz.metadata.rules || [];
				puz.metadata.rules.push(ruleText);
				return puz;
			};
			const getPuzTypes = puz => {
				let dpos = puz['diagonal+'] === true,
						dneg = puz['diagonal-'] === true,
						diagonal = dpos || dneg,
						xsudoku = dpos && dneg,
						windoku = puz.windoku === true,
						x4q = windoku && xsudoku,
						classic = !windoku && !diagonal;
				return {xsudoku, diagonal, dpos, dneg, windoku, x4q, classic};
			};
			const getPuzType = puz => {
				let dpos = puz['diagonal+'] === true,
						dneg = puz['diagonal-'] === true,
						diagonal = dpos || dneg,
						xsudoku = dpos && dneg,
						windoku = puz.windoku === true,
						x4q = windoku && xsudoku,
						classic = !windoku && !diagonal;
				return false
					|| (x4q && 'x4q')
					|| (windoku && !diagonal && 'windoku')
					|| (xsudoku && !windoku && 'xsudoku')
					|| (diagonal && 'diagonal')
					|| (classic && 'classic')
					;
			};
			const TypeTitles = {
				x4q: 'X4Q-Sudoku',
				windoku: 'Windoku',
				xsudoku: 'X-Sudoku',
				diagonal: 'Diagonal Sudoku',
				classic: 'Classic Sudoku',
			};
			const addTitle = (puz) => {
				addMetaData(puz, 'title', TypeTitles[getPuzType(puz)]);
				return puz;
			};
			const stringVals = {t:'title',a:'author'};
			const addConstraints = (puz, c = '') => {
				let i = 0, len = c.length;
				while(i < len) {
					let l = c[i++];
					switch(l) {
						case 'w': // windoku
							puz.underlays = puz.underlays || [];
							[[2.5, 2.5], [2.5, 6.5], [6.5, 2.5], [6.5, 6.5]].forEach(center => puz.underlays.push({center, width: 3, height: 3, backgroundColor: '#CFCFCF'}));
							addMetaData(puz, 'rules', 'Windoku: there are 4 indicated additional 3x3 regions.');
							puz.windoku = true;
							break;
						case 'x': // x-sudoku
							puz.lines = puz.lines || [];
							[[[0, 0], [9, 9]], [[0, 9], [9, 0]]].forEach(wayPoints => puz.lines.push({color: '#34BBE6', thickness: 2, wayPoints}));
							addMetaData(puz, 'rules', 'X-sudoku: digits cannot repeat along major diagonals.');
							puz['diagonal+'] = true
							puz['diagonal-'] = true
							break;
						case 'a': case 't':
							let j = i - 1;
							while(j++ < len) {
								if(c[j] === '*' && c[j + 1] === '*') {
									j++;
									continue;
								}
								if(c[j] === '*') break;
							}
							let val = c.slice(i, j).replace(/\*\*/g, '*');
							addMetaData(puz, stringVals[c[i - 1]], val);
							i += val.length + 1;
							break;
					}
				}
				return puz;
			};
			const addSolution = (puz) => {
				if(typeof createSolver === 'function') {
					if(getPuzType(puz) === 'classic') {
						let p81 = puz.cells.flat().map(({value}) => value || '.').join('');
						let sols = createSolver(p81).findSolutions(2);
						if(sols.length === 1) addMetaData(puz, 'solution', sols[0]);
					}
				}
				return puz;
			};
			const reSCFFormat = /^(?:scf)?([^*]*)\*?(.*)$/;
			let puz = {id: scf};
			let [scfData, constraints] = (scf.match(reSCFFormat)||[]).slice(1);
			let givens = dedoku(scfData);
			if(!scf.includes('*')) {
				givens = givens.slice(0, 81);
				constraints = scfData.replace(new RegExp(`^${codoku(givens)}`), '');
			}
			addGivens(puz, givens);
			addMetaData(puz, 'rules', 'Normal sudoku rules apply.');
			addConstraints(puz, constraints);
			if(puz.metadata.author === undefined) addMetaData(puz, 'author', 'SCF import');
			if(puz.metadata.title === undefined) addTitle(puz);
			if(puz.metadata.solution === undefined) addSolution(puz);
			return puz;
		};
		PT.encodeSCF = (args = {}) => {
			const {codoku, dedoku} = PT;
			let scf = 'scf';
			let {givens, constraints, title, author} = args;
			if(typeof givens === 'string') scf += codoku(givens.replace(/[.?]/g, '0'));
			if(typeof constraints === 'string'
				|| typeof title === 'string'
				|| typeof author === 'string') scf += '*';
			if(typeof constraints === 'string') scf += constraints;
			if(typeof title === 'string') scf += `t${title.replace(/\*/g,'**')}`;
			if(typeof author === 'string') scf += `*a${author.replace(/\*/g,'**')}`;
			return scf;
		};
	return PT;
})();