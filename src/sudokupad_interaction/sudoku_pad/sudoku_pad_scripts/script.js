/*!
Author: Sven Neumann <sven@svencodes.com>
Contributors:
	Mark Langezaal (MarkTekfan / MarkTekfan#8907)
		1. Undo statestack bug fix (v0.59.1)
		2. Improved diagonal drag selecting (v0.63.0)
		3. Redo/select bug fix (v0.64.0)
		4. Inspired/encouraged the multi-colour mode (v0.66.0)
		5. UI animation for dialogs (v0.111.0)
		6. Smart corner marks (v0.114.0)
		7. Pause dialog (v0.125.0)
		8. Fixes to undo/redo states (v0.137.0)
		9. Timer pause on browser/tab hide (v0.138.0)
		10. Letter tool (v0.142.0)
		11. Feature checking for sudoku-x diagonals (v0.149.0)
		12. Auto-repeat on undo/redo (v0.168.0)
		13. Cosmetic smart select (v0.169.0)
		14. Diagonal pen lines (v0.170.0)
		15. Fixed calculator <-> fog interaction (v0.222.1)
		16. Fixed fog / pencilmark conflict checker interaction (v0.228.0)
		17. Added fog cage splitting (v0.237.0)
		18. Added partial solution checking (v0.357.0)
		19. Implement marks on fogged givens (v0.358.0)
		20. Fix fpuz extraregion import(v0.362.0)
		21. Update cell group checking for disjoint cages (v0.363.0)
	David Clamage (Rangsk / https://github.com/dclamage)
		1. Inspired the f-puzzles format import (v0.68.0)
		2. Contributed conflict checker functionality (v0.69.0)
		3. Un-spoil solved puzzles & fix solution check bug (v0.140.0)
		4. Add uniqueness check to f-puzzles imported killer cages (v0.148.0)
		5. Larger fpuzzles import size and better default meta data (v0.154.0)
		6. Adjust fpuzzles text color import (v0.163.29)
		7. Add markings to fpuz link (v0.316.0)
		8. Keep values on f-puzzles export (v0.336.0)
	hAndyman
		1. Rules popup
		2. Various bug reports
	Ogress
		1. Suggested CSS print style
	Vidar Madsen (vidarino / vidarino#9152)
		1. Edge lines in pen tool (v0.132.0)
	BremSter
		1. Custom style import from f-puzzles data (v0.139.0)
	Scoob & fgeva
		1. Add copy time to clipboard in end dialog (v0.157.0)
	Memristor/purpl
		1. Improved f-puzzle import for fractional positions (v0.158.0)
	Phrancko
		1. Improved red/orange/yellow colour contrast (v0.163.28)
	Chameleon
		1. Added feature-gridrules (v0.547.0)
	giusb3.0
		1. Added feature-copycells (v0.556.0)

TODO:
	- Refactor unpause/wait as a matching pair
	- Move time res calc from Puzzle into Replay and store in replay data
	- Refactor FPuzzles helpers into seperate lib (utilities)
	- Implement a "start" action to avoid stacked unpause actions
*/

const rePuzzleId = /^([0-9A-Za-z]+|classic(.*)|.+)$/;
const reCompactClassicSudoku = /^classic(.*)/;
const reSclPrefix = /^(scl|ctc)(.*)/;
const reFpuzPrefix = loadFPuzzle.reFPuzPrefix;

const colorScheme = {

	cell_grid: '#000',
	cell_highlight: 'rgba(255, 215, 0, 0.5)',
	cell_givens: '#000',
	cell_values: '#1d6ae5',
	cell_candidates: '#1d6ae5',
	cell_pencilmarks: '#1d6ae5',

	import_00000000: '#0000', // color 0
	import_000000: '#000000', // color 1
	import_cfcfcf: '#cfcfcf', // color 2
	import_ffffff: '#ffffff', // color 3
	import_eb7532: '#eb7532', // color 6
	import_a3e048: '#a3e048', // color 4
	import_d23be7: '#d23be7', // color 5
	import_e6261f: '#e6261f', // color 7
	import_f7d038: '#f7d038', // color 8
	import_34bbe6: '#34bbe6', // color 9

	color_0: 'rgba(255, 255, 255, 0.6)',
	color_1: 'rgba(214, 214, 214, 0.6)',
	color_2: 'rgba(124, 124, 124, 0.6)',
	color_3: 'rgba(-36, -36, -36, 0.6)',
	color_4: 'rgba(179, 229, 106, 0.6)',
	color_5: 'rgba(232, 124, 241, 0.6)',
	color_6: 'rgba(228, 150, 50, 0.6)', // Phrancko Orange
	color_7: 'rgba(245, 58, 55, 0.6)', // Phrancko Red
	color_8: 'rgba(252, 235, 63, 0.6)', // Phrancko Yellow

	color_9: 'rgba(61, 153, 245, 0.6)',
};

const isExperimentalMode = () => document.location.hash.indexOf('experimental') !== -1;
const checkSetting = setting => document.querySelector(`[data-control="setting-${setting}"]`).classList.contains('toggle-on');
const sortTopLeftRC = ([r1, c1], [r2, c2]) => r1 === r2 ? c2 - c1 : r2 - r1;

// Replay Tools
	var dec = data => { data = JSON.parse(data); return Object.assign({}, data, {data: Replay.replayC2A(loadFPuzzle.decompressPuzzle(data.data)).split(',').map(a => app.puzzle.parseAction(a))}); };
	var enc = data => JSON.stringify(Object.assign({}, data, {data: loadFPuzzle.compressPuzzle(Replay.replayA2C(data.data.map(a => Framework.app.puzzle.actionToString(a)).join(',')))}));
	var cmp = (a, b) => JSON.parse(a).data === JSON.parse(enc(dec(b))).data
	var slice = (data, start, end) => { data = dec(data); data.data = data.data.slice(start, end); return enc(data); };
	var play = data => Framework.app.puzzle.replayPlay({actions: Replay.replayC2A(loadFPuzzle.decompressPuzzle(JSON.parse(data).data)).split(',')}, {speed: -1, skipRestart: true});

const SvgRenderer = (() => {
	// Helpers
		const attrCssToJs = attr => attr.split('-')
			.map((word, idx) => (idx === 0 ? word[0] : word[0].toUpperCase()) + word.slice(1))
			.join('');
	function SvgRenderer(opts = {}) {
		this.svgId = 0;
		this.svgElem = undefined;
		this.getElem(opts.svg);
	}
	const S = SvgRenderer, P = Object.assign(S.prototype, {constructor: S});
	S.DefaultSelector = 'svg#svgrenderer';
	S.CellSize = 64;
	S.styles = {
		cageValue: {
			width: 0.2, height: 0.2,
			fontSize: 13,
			textAnchor: 'start',
			backgroundColor: 'rgba(255,255,255,0.9)',
		},
		cageBorders: {
			killer: {
				offset: 0.08,
				border: {
					fill: 'none',
					//fill: 'rgba(230, 230, 230, 0.6)',
					stroke: 'rgba(0, 0, 0, 1)',
					'stroke-width': '1.5px',
					'stroke-dasharray': '5 3',
					//'stroke-dashadjust': 'stretch',
					'stroke-dashcorner': '4'
				}
			},
			box: {
				offset: 0,
				border: {
					fill: 'none',
					//fill: 'rgba(230, 230, 230, 0.6)',
					stroke: 'rgba(0, 0, 0, 1)',
					'stroke-width': '3px',
				}
			},
			windoku: {
				offset: 0.08,
				border: {
					fill: '#cfcfcf33',
					stroke: 'none',
					'stroke-width': '0',
				}
			},
			selectioncage: {
				offset: 0.0625,
				border: {
					fill: 'rgba(255, 255, 255, 0.4)',
					stroke: 'rgba(0, 126, 255, 0.7)',
					'stroke-width': '8px',
					'stroke-linecap': 'butt',
					'stroke-linejoin': 'round'
				}
			},
			extraregion: {
				offset: 0.09375,
				border: {
					fill: 'rgba(178, 178, 178, 0.4)',
					stroke: 'none',
					'stroke-width': '0'
				}
			},
			fpRowIndexer: {
				offset: 0.0390625,
				border: {fill: '#7CC77C33', stroke: '#7CC77C', 'stroke-opacity': '0.7', 'stroke-width': '4px'}
			},
			fpColumnIndexer: {
				offset: 0.0390625,
				border: {fill: '#C77C7C33', stroke: '#C77C7C', 'stroke-opacity': '0.7', 'stroke-width': '4px'}
			},
			fpBoxIndexer: {
				offset: 0.0390625,
				border: {fill: '#7C7CC733', stroke: '#7C7CC7', 'stroke-opacity': '0.7', 'stroke-width': '4px'}
			}
		}
	};
	// Workaround for issue: https://chromium.googlesource.com/chromium/blink/+/b87d44f/Source/core/svg/SVGAnimateElement.cpp#83
	S.isAttrValidOverride = {
		marker: ['orient']
	};
	S.validAttrLookup = {
		class: 'className'
	};
	S.AttrExclusionShared = '' +
		'target,center,rounded,thickness,text,feature,color,angle,' +
		'borderColor,borderSize,' + 
		'wayPoints,backgroundColor,textAnchor,fontSize,maxWidth,textStroke';
	S.AttrExclusion = {
		path: 'width,height',
		rect: '',
		text: 'width,height',
		g: 'width,height',
		marker: 'width,height',
	};
	Object.keys(S.AttrExclusion).forEach(key => S.AttrExclusion[key] = (S.AttrExclusion[key] + ',' + S.AttrExclusionShared).split(','));
	S.roundedAttrs = ['x', 'y', 'width', 'height'];
	S.roundedAttrsDigits = 1;
	S.reColorWhite = /^#fff(?:fff)?$/i;
	S.reColorBlack = /^#000(?:000)?$/i;
	S.bwColorAttrs = ['fill', 'stroke', 'backgroundColor'];
	S.normalizeAttr = [
		['textStroke', 'stroke'],
		['color', 'fill'],
		['textAnchor', 'text-anchor'],
	];
	S.attrsToStyle = ['fill', 'stroke', 'dominant-baseline', 'text-anchor', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset'];
	S.rcToPathData = function(rcs) {
		return rcs.map(([r, c], idx) => `${idx === 0 ? 'M' : 'L'}${c * SvgRenderer.CellSize} ${r * SvgRenderer.CellSize}`).join(' ');
	};
	S.centerPoint = p => { p[0] = Math.floor(p[0]) + 0.5; p[1] = Math.floor(p[1]) + 0.5; };
	S.getContentBounds = root => {
		const bbOpts = {fill: true, stroke: true, markers: true};
		let left = Number.POSITIVE_INFINITY, right = Number.NEGATIVE_INFINITY,
				top = Number.POSITIVE_INFINITY, bottom =  Number.NEGATIVE_INFINITY;
		root = resolveSelector(root)[0];
		for(const elem of [root, ...root.querySelectorAll('*')]) {
			if(!elem || typeof elem.getBBox !== 'function') continue;
			try {
				const {x, y, width, height} = elem.getBBox(bbOpts);
				left = Math.min(left, x);
				top = Math.min(top, y);
				right = Math.max(right, x + width);
				bottom = Math.max(bottom, y + height);
			} catch(e) {} // Ignore invisible items on FF52
		}
		return {left, right, top, bottom, width: right - left, height: bottom - top};
	};
	S.attrCssToJs = attrCssToJs;
	P.getElem = function(elem) {
		if(elem === undefined && this.svgElem !== undefined) return this.svgElem;
		if(elem === undefined) elem = S.DefaultSelector;
		if(typeof elem === 'string') elem = document.querySelector(elem);
		if(typeof elem === 'object' && elem.nodeType === 1) this.svgElem = elem;
		return this.svgElem;
	};
	P.isAttrValid = function(type, attr) {
		attr = S.validAttrLookup[attr] || attr;
		return !(S.AttrExclusion[type] || []).includes(attr);
	};
	P.getContentBounds = function(elem = this.getElem()) { return S.getContentBounds(elem); };
	P.adjustViewBox = function(left, top, width, height) {
		//console.info('SvgRenderer.adjustViewBox(%s, %s, %s, %s);', left, top, width, height);
		let svg = this.getElem();
		svg.style.width = `${width}px`;
		svg.style.height = `${height}px`;
		svg.style.margin = `${Math.round(top)}px 0 0 ${Math.round(left)}px`;
		svg.setAttribute('viewBox', `${Math.round(left)} ${Math.round(top)} ${Math.round(width)} ${Math.round(height)}`);
		svg.querySelectorAll('.viewboxsize').forEach(el => {
			el.setAttribute('x', Math.floor(left));
			el.setAttribute('y', Math.floor(top));
			el.setAttribute('width', Math.ceil(width));
			el.setAttribute('height', Math.ceil(height));
		});
	};
	P.addLayer = function(layerName) {
		let svg = this.getElem();
		let elem = document.createElementNS(svg.namespaceURI, 'g');
		elem.id = layerName;
		svg.appendChild(elem);
		return elem;
	};
	P.clearLayer = function(layerName) {
		this.getElem().querySelector(`#${layerName}`).innerHTML = '';
	};
	P.getLayers = function() {
		return [...this.getElem().querySelectorAll(':scope > g:not(.defs)')];
	};
	P.getNonLayers = function() {
		return [...this.getElem().querySelectorAll(':scope > *:not(g)')];
	};
	P.clearAllLayers = function() {
		//console.info('SvgRenderer.clearAllLayers();');
		this.getLayers().forEach(el => el.innerHTML = '');
		this.getNonLayers().forEach(el => el.remove());
	};
	P.renderPart = function(opts = {}) {
		let {target = 'underlay', type, attr = {}, content} = opts;
		//console.info('SvgRenderer.renderPart({target, type, attr, content});', target, type, attr, content);
		let svg = this.getElem();
		let part = document.createElementNS(svg.namespaceURI, type);
		attr = Object.assign({}, attr);
		/*
		if((attr.opacity === undefined || attr.opacity === 1) && (attr.stroke || '').toLowerCase() === '#cfcfcf') {
			attr.stroke = '#000';
			attr.opacity = 0.4;
		}
		*/
		Object.keys(attr).forEach(key => {
			let val = attr[key];
			if(key === 'className') key = 'class';
			if(val !== undefined && this.isAttrValid(type, key)) {
				if(typeof val === 'number' && S.roundedAttrs.includes(key)) {
					val = parseFloat(val.toFixed(S.roundedAttrsDigits));
				}
				part.setAttribute(key, val);
			}
		});
		if(content !== undefined) {
			if(/\n/.test(content)) {
				part.setAttribute('x', 0);
				part.setAttribute('y', 0);
				part.setAttribute('transform', `translate(${attr.x - 0 * attr.width * SvgRenderer.CellSize}, ${attr.y - 0.5 * attr.height * SvgRenderer.CellSize})`);
				content.split(/\n/).forEach((line, idx, arr) => {
					let linePart = document.createElementNS(svg.namespaceURI, 'tspan');
					linePart.setAttribute('x', 0);
					linePart.setAttribute('y', `${1.5 + ((-0.5 * arr.length) + idx) * 0.9}em`);
					linePart.setAttribute('dominant-baseline', 'middle');
					linePart.textContent = line;
					part.appendChild(linePart);
				})
			}
			else part.textContent = content;
		}
		svg.querySelector(`#${target}`).appendChild(part);
		return part;
	};
	P.renderLine = function(opts) {
		//console.info('SvgRenderer.renderLine(opts);', {target, color, thickness, wayPoints});
		const {target = 'arrows', color = 'none', thickness, wayPoints = [], className, d} = opts;
		const attr = Object.assign({
			'stroke': color,
			'fill': 'none',
			'stroke-linecap': 'round',
			'stroke-linejoin': 'round',
		}, opts);
		if(className !== undefined) attr.class = className;
		if(thickness !== undefined) attr['stroke-width'] = thickness;
		if(wayPoints.length > 0) attr.d = S.rcToPathData(wayPoints);
		return this.renderPart({target, type: 'path', attr});
	};
	P.pointsToPath = function(points, opts = {}) {
		const {close = false, digits = 2} = opts, fact = 10 ** digits;
		return points
			.map(([x, y], idx, arr) => `${idx === 0 ? 'M' : 'L'}${Math.round(x * fact) / fact} ${Math.round(y * fact) / fact}`)
			.join(' ')
			+ (close ? 'Z' : '');
	};
	S.ArrowHeadStyles = {
		stroke: {
			close: false,
			points: 3,
			attr: {
				'stroke-linejoin': 'miter',
				fill: 'none',
			}
		},
		fill: {
			close: true,
			points: 4,
			attr: {
				'stroke-linejoin': 'miter',
				'stroke-width': 0,
			}
		},
	};
	P.createArrowHead = function(opts = {}) {
		const {CellSize, ArrowHeadStyles} = S;
		const {thickness, headLength, headStyle, headAngle, headIndent, color} = opts;
		const style = ArrowHeadStyles[headStyle],
					size = headLength ? headLength * 2 * CellSize : thickness * 10,
					rad = (headAngle / 2) * (Math.PI / 180),
					ox = 0.9, oy = 1.0,
					hx = 0.5 * Math.cos(rad), hy = 0.5 * Math.sin(rad),
					retractHead = (headStyle === 'fill')
						? (2 * headLength) * ((1 - Math.max(0, headIndent)) * hx) * CellSize - 0.5
						: 0; // Overlap by 0.5 to remove seam
					headPoints = [[ox - hx, oy + hy], [ox, oy], [ox - hx, oy - hy], [ox - hx * (1 - headIndent), oy]];
		const marker = this.renderPart({type: 'marker', attr: {
			id: 'arrow_' + (this.svgId++),
			markerUnits: 'userSpaceOnUse',
			markerWidth: 2 * size, markerHeight: 2 * size,
			refX: size * ox - retractHead, refY: size,
			orient: 'auto'
		}});
		marker.appendChild(this.renderPart({type: 'path', attr: Object.assign({fill: color}, style.attr,
			{d: this.pointsToPath(headPoints.slice(0, style.points).map(([x, y]) => [x * size, y * size]), {close: style.close})}
		)}));
		const arrowHead = this.renderPart({type: 'defs'});
		arrowHead.appendChild(marker);
		arrowHead.retract = retractHead || thickness;
		arrowHead.markerId = marker.id;
		return arrowHead;
	};
	S.retractFinalPoint = (points, retract = 0) => {
		const {CellSize} = S;
		const p0 = points[points.length - 2], p1 = points[points.length - 1],
					dist = calcDistance(p0, p1),
					delta = [(p1[0] - p0[0]) / dist, dc = (p1[1] - p0[1]) / dist];
		let scale = retract / CellSize;
		p1[0] = p1[0] - delta[0] * scale;
		p1[1] = p1[1] - delta[1] * scale;
		if(dist - retract / CellSize <= 0) {
			scale -= (dist - 0.0001);
			p0[0] = p0[0] - delta[0] * scale;
			p0[1] = p0[1] - delta[1] * scale;
		}
		return points;
	};
	P.renderArrow = function(opts = {}) {
		const {CellSize} = S;
		let {target = 'arrows', color = 'none', opacity = 1, thickness, headLength, headStyle = 'stroke', headAngle = 90, headIndent = 0, wayPoints = []} = opts;
		//console.info('SvgRenderer.renderArrow({target, color, thickness, headLength, wayPoints});', target, color, thickness, headLength, wayPoints);
		if(wayPoints.length < 2) return console.warn('renderArrow requires at least two wayPoints:', opts);
		const arrowHead = this.createArrowHead({thickness, headLength, headStyle, headAngle, headIndent, color});
		const arrowLine = this.renderPart({
			type: 'path',
			attr: {
				'fill': 'none',
				'stroke-linecap': 'butt',
				'stroke-linejoin': 'round',
				'marker-end': `url(#${arrowHead.markerId})`,
				'd': this.pointsToPath(S.retractFinalPoint([...wayPoints], arrowHead.retract).map(([r, c]) => [c * CellSize, r * CellSize]))
			}
		});
		const g = this.renderPart({target, type: 'g', attr: {stroke: color, opacity, 'stroke-width': thickness}});
		g.appendChild(arrowHead);
		g.appendChild(arrowLine);
		return g;
	};
	P.renderRect = function(opts) {
		var {target, center, width, height, angle, borderSize = 0, thickness = 0, backgroundColor = 'none', borderColor = 'none', rounded, roundedRadius, opacity = 1, className} = opts;
		borderSize = borderSize || thickness || (borderColor !== 'none' ? 2 : 0);
		const attr = Object.assign({}, opts, {
			'fill': (backgroundColor === undefined) ? 'none' : backgroundColor,
			'stroke': (backgroundColor === borderColor) ? 'none' : borderColor,
			'stroke-width': borderSize,
		});
		if(className !== undefined) attr.class = className;
		Object.assign(attr, {
			'x': (center[1] - width * 0.5) * SvgRenderer.CellSize + 0.5 * borderSize,
			'y': (center[0] - height * 0.5) * SvgRenderer.CellSize + 0.5 * borderSize,
			'width': width * SvgRenderer.CellSize - 1 * borderSize,
			'height': height * SvgRenderer.CellSize - 1 * borderSize,
			opacity
		});
		if(angle) {
			let {x, y} = attr;
			attr.transform = `translate(${x + 0.5 * attr.width},${y + 0.5 * attr.height}) rotate(${angle}) translate(${-x - 0.5 * attr.width},${-y - 0.5 * attr.height}) `;
		}
		if(rounded && roundedRadius === undefined) {
			roundedRadius = 0.5 * (Math.min(width, height) * SvgRenderer.CellSize - 1 * borderSize);
		}
		if(rounded) {
			Object.assign(attr, {'rx': roundedRadius || 0, 'ry': roundedRadius || 0});
		}
		return this.renderPart({target, type: 'rect', attr});
	};
	P.renderText = function(opts) {
		const {reColorWhite, reColorBlack, bwColorAttrs, normalizeAttr, attrsToStyle} = S;
		//console.info('SvgRenderer.renderText:', target, center, width, height, color, fontSize, text, textStroke, textAnchor, backgroundColor);
		//const textOffsetX = 0.015, textOffsetY = 0.05;
		const textOffsetX = 0.00, textOffsetY = 0.06;
		const attr = Object.assign({style: ''}, opts);
		for(const [inAttr, outAttr] of normalizeAttr) {
			if(attr[inAttr] !== undefined) {
				attr[outAttr] = attr[inAttr];
				delete attr[inAttr];
			}
		}
		for(const colorAttr of bwColorAttrs) {
			if(reColorWhite.test(attr[colorAttr])) attr[colorAttr] = 'var(--color-white)';
			if(reColorBlack.test(attr[colorAttr])) attr[colorAttr] = 'var(--color-black)';
		}
		for(const key of attrsToStyle) {
			if(attr[key] !== undefined) {
				attr.style += `${key}:${attr[key]};`;
				delete attr[key];
			}
		}
		let {target, center, width, height, maxWidth, fontSize, text, className} = attr;
		if(className !== undefined) attr.class = className;
		if(fontSize !== undefined) attr.style += `font-size: ${fontSize}px;`;
		const textOpts = {
			target, type: 'text',
			attr: Object.assign({}, {
				x: (Number(center[1]) + textOffsetX * Number(width)) * SvgRenderer.CellSize,
				y: (Number(center[0]) + textOffsetY * Number(height)) * SvgRenderer.CellSize,
			}, attr),
			content: text,
		};
		if(attr.angle) {
			let {x, y} = textOpts.attr;
			Object.assign(textOpts.attr, {
				transform: `rotate(${attr.angle})`,
				'transform-origin': `${Number(x).toFixed(1)} ${Number(y).toFixed(1)}`,
			});
		}
		var textElem = this.renderPart(textOpts);
		var bbox = textElem.getBBox();
		if(maxWidth && bbox.width > maxWidth) {
			textElem.setAttribute('textLength', maxWidth);
			textElem.setAttribute('lengthAdjust', 'spacingAndGlyphs');
			bbox = textElem.getBBox();
		}
		if(attr.backgroundColor && fontSize <= 16) {
			var rectElem = this.renderPart({
				target, type: 'rect',
				attr: Object.assign({}, attr, {
					x: bbox.x - 0, y: bbox.y + 2,
					width: bbox.width + 0, height: bbox.height - 3,
					style: `fill:${attr.backgroundColor};stroke:none;`,
				}),
			});
			rectElem.parentNode.insertBefore(rectElem, textElem);
		}
		return textElem;
	};
	P.renderCellWedge = function(opts) {
		let {target = 'colours', a1, a2, color, center = [0.5, 0.5], width = 1, height = 1, className} = opts;
		let attr = Object.assign({}, opts, {
			fill: color,
			d: [[0.5, 0.5], ...squareSegment(a1, a2), [0.5, 0.5]]
				.map(([x, y]) => [center[0] + (y - 0.5) * height, center[1] + (x - 0.5) * width])
				.map(([r, c], idx) => `${idx === 0 ? 'M' : 'L'}${(c * SvgRenderer.CellSize).toFixed(2)} ${(r * SvgRenderer.CellSize).toFixed(2)}`)
				.join(' ')
		});
		return this.renderPart({target, className, type: 'path', attr});
	};
	P.getCellOutline = function(cells, os = 0) {
		//console.info('SvgRenderer.getCellOutline(cells, os);', cells);
		let edgePoints = [], grid = [], segs = [], shapes = [];
		const checkRC = (r, c) => ((grid[r] !== undefined) && (grid[r][c] !== undefined)) || false;
		const pointOS = {
			tl: [os, os], tr: [os, 1-os],
			bl: [1-os, os], br: [1-os, 1-os],
			tc: [os, 0.5], rc: [0.5, 1-os],
			bc: [1-os, 0.5], lc: [0.5, os],
		};
		const dirRC = {t: [-1, 0], r: [0, 1], b: [1, 0], l: [0, -1]};
		const flipDir = {t: 'b', r: 'l', b: 't', l: 'r'};
		const patterns = [
			{name: 'otl', bits: '_0_011_1_', enter: 'bl', exit: 'rt', points: 'tl'},
			{name: 'otr', bits: '_0_110_1_', enter: 'lt', exit: 'br', points: 'tr'},
			{name: 'obr', bits: '_1_110_0_', enter: 'tr', exit: 'lb', points: 'br'},
			{name: 'obl', bits: '_1_011_0_', enter: 'rb', exit: 'tl', points: 'bl'},
			{name: 'itl', bits: '01_11____', enter: 'lt', exit: 'tl', points: 'tl'},
			{name: 'itr', bits: '_10_11___', enter: 'tr', exit: 'rt', points: 'tr'},
			{name: 'ibr', bits: '____11_10', enter: 'rb', exit: 'br', points: 'br'},
			{name: 'ibl', bits: '___11_01_', enter: 'bl', exit: 'lb', points: 'bl'},
			{name: 'et', bits: '_0_111___', enter: 'lt', exit: 'rt', points: 'tc'},
			{name: 'er', bits: '_1__10_1_', enter: 'tr', exit: 'br', points: 'rc'},
			{name: 'eb', bits: '___111_0_', enter: 'rb', exit: 'lb', points: 'bc'},
			{name: 'el', bits: '_1_01__1_', enter: 'bl', exit: 'tl', points: 'lc'},
			{name: 'out', bits: '_0_010_1_', enter: 'bl', exit: 'br', points: 'tl,tr'},
			{name: 'our', bits: '_0_110_0_', enter: 'lt', exit: 'lb', points: 'tr,br'},
			{name: 'oub', bits: '_1_010_0_', enter: 'tr', exit: 'tl', points: 'br,bl'},
			{name: 'oul', bits: '_0_011_0_', enter: 'rb', exit: 'rt', points: 'bl,tl'},
			{name: 'solo', bits: '_0_010_0_', enter: '', exit: '', points: 'tl,tr,br,bl'},
		];
		const checkPatterns = (row, col) => patterns
			.filter(({name, bits}) => {
				let matches = true;
				bits.split('').forEach((b, i) => {
					let r = row + Math.floor(i / 3) - 1, c = col + i % 3 - 1, check = checkRC(r, c);
					matches = matches && ((b === '_') || (b === '1' && check) || (b === '0' && !check));
				});
				return matches;
			});
		const getSeg = (segs, rc, enter) => segs.find(([r, c, _, pat]) => r === rc[0] && c === rc[1] && pat.enter === enter);
		const followShape = segs => {
			let shape = [], seg = segs[0], nextSeg;
			const getNext = ([r, c, cell, pat]) => {
				if(pat.exit === '') return;
				let [exitDir, exitSide] = pat.exit.split('');
				let nextRC = [r + dirRC[exitDir][0], c + dirRC[exitDir][1]];
				let nextEnter = flipDir[exitDir] + exitSide;
				return getSeg(segs, nextRC, nextEnter);
			};
			do {
				shape.push(seg);
				segs.splice(segs.indexOf(seg), 1);
				seg = getNext(seg);
			} while (seg !== undefined && shape.indexOf(seg) === -1);
			return shape;
		};
		const shapeToPoints = shape => {
			let points = [];
			shape.forEach(([r, c, cell, pat]) => pat.points
				.split(',')
				.map(point => pointOS[point])
				.map(([ros, cos]) => [r + ros, c + cos])
				.forEach(rc => points.push(rc))
			);
			return points;
		};
		cells.forEach(cell => {
			let {row, col} = cell;
			grid[row] = grid[row] || [];
			grid[row][col] = {cell};
		});
		cells.forEach(cell => {
			let {row, col} = cell, matchedPatterns = checkPatterns(row, col);
			matchedPatterns.forEach(pat => segs.push([row, col, cell, pat]));
		});
		while(segs.length > 0) {
			let shape = followShape(segs);
			if(shape.length > 0) shapes.push(shape);
		}
		shapes.forEach(shape => {
			edgePoints = edgePoints.concat(shapeToPoints(shape).map(([r, c], idx) => [idx === 0 ? 'M' : 'L', r, c]));
			edgePoints.push(['Z']);
		});
		return edgePoints;
	};
	P.renderCageLabel = function(opts = {}) {
		let {target, cells = [], cageValue, style} = opts;
		let [r, c, val] = Puzzle.parseRCVal(cageValue);
		let i = 0;
		while(cells.find(({row, col}) => row === (r - 1) && col === (c - 1 + ++i)));
		let textOpts = Object.assign({}, SvgRenderer.styles.cageValue, {
			target,
			class: `cage-${style} cage-label`,
			center: [r - 1 + 0.15, c - 1 + 0.035],
			text: val,
			maxWidth: (Math.max(1, i) - 2 * 0.035) * SvgRenderer.CellSize
		});
		if(opts.textColor) textOpts.color = opts.textColor;
		return this.renderText(textOpts);
	};
	P.renderCage = function(opts = {}) {
		let {target, cells = [], cageValue, style} = opts;
		//console.info('SvgRenderer.renderCage({target, cells, cageValue, style});', target, cells.map(c => c.toRC()).join(','), cageValue, style);
		let cageElem, textElem;
		if(![undefined, 'hidden', ''].includes(style) && cells.length > 0) {
			let cageStyle = SvgRenderer.styles.cageBorders[style];
			let edgePoints = this.getCellOutline(cells, cageStyle.offset);
			let borderAttr = Object.assign({}, cageStyle.border, {
				class: `cage-${style}`,
				//'shape-rendering': 'crispedges',
				'shape-rendering': 'geometricprecision',
				'vector-effect': 'non-scaling-stroke',
				//'vector-effect': 'non-scaling-size',
				d: edgePoints.map(([t, r, c], idx) => t === 'Z' ? t : `${t}${c * SvgRenderer.CellSize} ${r * SvgRenderer.CellSize}`).join(' '),
			});
			if(opts.borderColor) borderAttr.stroke = opts.borderColor;
			cageElem = this.renderPart({target, type: 'path', attr: borderAttr});
		}
		if(cageValue !== undefined) {
			textElem = this.renderCageLabel(opts);
		}
		return cageElem || textElem;
	};
	P.renderThermo = function({bulb, line}) {
		const forward = isSameRC(roundCenter(bulb.center), roundCenter(line.wayPoints[0])), 
					start = forward ? 0 : 1, len = line.wayPoints.length - 1 + start;
		line.wayPoints.slice(start, len).forEach(SvgRenderer.centerPoint);
		return {
			line: this.renderLine(Object.assign({target: 'arrows', className: 'thermo-line'}, line)),
			rect: this.renderRect(Object.assign({target: 'arrows', className: 'thermo-bulb'}, bulb))
		};
	};
	P.renderArrowSum = function({bulb, arrow}) {
		this.renderArrow(Object.assign({target: 'arrows'}, arrow));
		this.renderRect(Object.assign({target: 'arrows'}, bulb));
	};
	P.renderKropki = function(part) {
		const attr = Object.assign({target: 'overlay'}, part);
		let elem = this.renderRect(attr);
		elem.classList.add('feature-kropki');
		if(part.text !== undefined && String(part.text).length > 0) {
			// Compansate for legacy font size hacks
			//if(part.fontSize !== undefined) part.fontSize += 4;
			elem.classList.add('textbg');
			let textElem = this.renderText(Object.assign({}, attr, {backgroundColor: undefined}));
			textElem.classList.add('feature-kropki');
		}
	};
	P.renderXV = function(part) {
		const attr = Object.assign({target: 'overlay'}, part);
		let rectElem = this.renderRect(attr);
		rectElem.classList.add('feature-xv');
		part.fontSize += 4;
		let textElem = this.renderText(Object.assign({}, part, {target: 'overlay', backgroundColor: undefined}));
	};
	P.renderLittleKiller = function({arrow, number}) {
		this.renderArrow(Object.assign({target: 'arrows'}, arrow));
		this.renderText(Object.assign({target: 'overlay'}, number, {backgroundColor: undefined, fontSize: number.fontSize + 4}));
	};
	P.renderPalindrome = function({line}) {
		return this.renderLine(Object.assign({target: 'arrows', className: 'palindrome'}, line));
	};
	P.renderSudokuX = function({line}) {
		return this.renderLine(Object.assign({target: 'overlay', className: 'sudokux'}, line));
	};
	P.renderPen = function(opts = {}) {
		const {row, col, className, value} = opts;
		const a = 0.3 * SvgRenderer.CellSize, b = 0.125 * SvgRenderer.CellSize;
		let attr = Object.assign({'class': className}, opts);
		switch(value) {
			case '1': Object.assign(attr, { // center h-line left-to-right
					d: SvgRenderer.rcToPathData([[row + 0.5, col + 0.5], [row + 0.5, col + 1.5]])
				}); break;
			case '2': Object.assign(attr, { // center v-line top-to-bottom
					d: SvgRenderer.rcToPathData([[row + 0.5, col + 0.5], [row + 1.5, col + 0.5]])
				}); break;
			case '3': Object.assign(attr, { // edge-x right
					d: SvgRenderer.rcToPathData([[row + 0.5, col + 1]]) + ` m ${-b},${-b} l${b * 2},${2 * b} m ${-2 * b},${0} l${b * 2},${-2 * b}`
				}); break;
			case '4': Object.assign(attr, { // edge-x bottom
					d: SvgRenderer.rcToPathData([[row + 1, col + 0.5]]) + ` m ${-b},${-b} l${b * 2},${2 * b} m ${-2 * b},${0} l${b * 2},${-2 * b}`
				}); break;
			case '5': Object.assign(attr, { // cell o
					d: SvgRenderer.rcToPathData([[row + 0.5, col + 0.5]]) + ` m ${-a},0 a ${a},${a} 0 1,0 ${a * 2},0 a ${a},${a} 0 1,0 ${-a * 2},0`
				}); break;
			case '6': Object.assign(attr, { // cell x
					d: SvgRenderer.rcToPathData([[row + 0.5, col + 0.5]]) + ` m ${-a},${-a} l${a * 2},${2 * a} m ${-2 * a},${0} l${a * 2},${-2 * a}`
				}); break;
			case '7': Object.assign(attr, { // edge v-line right edge
					d: SvgRenderer.rcToPathData([[row + 0, col + 1], [row + 1, col + 1]])
				}); break;
			case '8': Object.assign(attr, { // edge h-line bottom edge
					d: SvgRenderer.rcToPathData([[row + 1, col + 0], [row + 1, col + 1]])
				}); break;
			case '9': Object.assign(attr, { // edge v-line left edge
					d: SvgRenderer.rcToPathData([[row + 0, col + 0], [row + 1, col + 0]])
				}); break;
			case 'a': Object.assign(attr, { // edge h-line top edge
					d: SvgRenderer.rcToPathData([[row + 0, col + 0], [row + 0, col + 1]])
				}); break;
			case 'b': Object.assign(attr, { // edge-x left
					d: SvgRenderer.rcToPathData([[row + 0.5, col + 0]]) + ` m ${-b},${-b} l${b * 2},${2 * b} m ${-2 * b},${0} l${b * 2},${-2 * b}`
				}); break;
			case 'c': Object.assign(attr, { // edge-x top
					d: SvgRenderer.rcToPathData([[row + 0, col + 0.5]]) + ` m ${-b},${-b} l${b * 2},${2 * b} m ${-2 * b},${0} l${b * 2},${-2 * b}`
				}); break;
			case 'd': Object.assign(attr, { // center diagonal-line to top-right
					d: SvgRenderer.rcToPathData([[row + 0.5, col + 0.5], [row - 0.5, col + 1.5]])
				}); break;
			case 'e': Object.assign(attr, { // center diagonal-line to bottom-right
					d: SvgRenderer.rcToPathData([[row + 0.5, col + 0.5], [row + 1.5, col + 1.5]])
				}); break;
			case 'f': Object.assign(attr, { // edge diagonal-line bottom-left to top-right
					d: SvgRenderer.rcToPathData([[row + 0, col + 1], [row + 1, col + 0]])
				}); break;
			case 'g': Object.assign(attr, { // edge diagonal-line top-left to bottom-right
					d: SvgRenderer.rcToPathData([[row + 0, col + 0], [row + 1, col + 1]])
				}); break;
		}
		return this.renderPart({target: 'cell-pen', className, type: 'path', attr});
	};
	return S;
})();


const Cell = (() => {
	function Cell(opts = {}) {
		const {app, row, col, parent} = opts;
		this.app = app;
		this.row = row;
		this.col = col;
		this.elem = Framework.createElem({class: 'cell', parent, attributes: {row, col}});
		this.highlighted = false;
		this.given = undefined;
		this.value = undefined;
		this.cageValue = undefined;
		this.candidates = [];
		this.pencilmarks = [];
		this.colours = [];
		this.pen = [];
		this.givenCentremarks = [];
		this.givenCornermarks = [];
		this.childElems = {};
		this.renderedValues = {
			given: '',
			value: '',
			candidates: '',
			pencilmarks: '',
			colours: '',
			pen: '',
			highlighted: false,
			haserror: false
		};
		this.colorTarget = 'cell-colors';
	}
	const C = Cell, P = Object.assign(C.prototype, {constructor: C});
	C.ClassName = 'cell';
	C.Props = ['value', 'candidates', 'pencilmarks', 'colour', 'pen'];
	C.PropMap = {
		given: 'given',
		normal: 'value',
		centre: 'candidates',
		corner: 'pencilmarks',
		colour: 'colours',
		pen: 'pen'
	};
	C.PropHiddenBy = {
		given: [],
		normal: ['given'],
		centre: ['given', 'normal'],
		corner: ['given', 'normal'],
		colour: [],
	};
	C.StateKeys = ['v','c','pm','cl','hl', 'pe'];
	C.reStripSlashes = /\/+$/;
	// Rendering
		C.RenderProps = ['haserror', 'highlighted', 'given', 'value', 'candidates', 'pencilmarks', 'colours', 'pen'];
		C.RenderPropsClear = [
			{prop: 'given', clear: ['value', 'candidates', 'pencilmarks']},
			{prop: 'value', clear: ['candidates', 'pencilmarks']},
		];
		C.RenderPropsClearForHideClue = [
			{prop: 'value', clear: ['candidates', 'pencilmarks']},
		];
		P.getZeroIsTen = function() {
			if(this.rule_zeroisten === undefined) {
				const {app: {puzzle: {currentPuzzle: {rules = []} = {}}}} = this;
				this.rule_zeroisten = rules.includes('zeroisten');
			}
			return this.rule_zeroisten;
		};
		P.getChildElem = function(className, opts) {
			//console.info('Cell.getChildElem(%s);', className);
			if(this.childElems[className] === undefined) {
				var svg = this.app.svgRenderer;
				var target = className.replace(/^(cell-[^ ]+).*/, '$1s');
				var elem;
				if(['cell-color', 'cell-highlight', 'cell-grid', 'cell-error'].includes(className)) {
					elem = svg.renderRect(Object.assign({target, className,
						'vector-effect': 'non-scaling-stroke',
						'vector-effect': 'non-scaling-size',
						center: [this.row + 0.5, this.col + 0.5],
						width: 1, height: 1,
					}, opts));
				}
				else {
					elem = svg.renderText(Object.assign({target, className,
						center: [this.row + 0.5, this.col + 0.5],
						width: 1, height: 1,
						//text: this.value,
						//filter: `url(#filter-${className.replace(/.*?cell-([a-z]+).*/, '$1')})`,
					}, opts));
				}
				this.childElems[className] = elem;
			}
			return this.childElems[className];
		};
		P.clearChildElem = function(sel) {
			const {childElems} = this;
			if(typeof sel === 'string' && childElems[sel] !== undefined) {
				//console.warn('Cell[%s].clearChildElem(%s);', this.toRC(), sel, Object.keys(this.childElems), this.childElems[className], (this.childElems[className] !== undefined));
				childElems[sel].remove();
				delete childElems[sel];
			}
			else if(Array.isArray(sel)) {
				for(let i = 0, len = sel.len; i < len; i++) this.clearChildElem(sel[i]);
			}
			else if(sel instanceof RegExp) {
				let keys = Object.keys(childElems);
				for(let i = 0, len = keys.length; i < len; i++) {
					if(sel.test(keys[i])) this.clearChildElem(keys[i]);
				}
			}
		};
		P.getRenderVals = function() {
			let vals = {};
			C.RenderProps.forEach(prop => {
				let val = this[prop];
				if(val === undefined) val = '';
				else if(Array.isArray(val)) val = val.join('');
				vals[prop] = val;
			});
			(this.hideclue ? C.RenderPropsClearForHideClue : C.RenderPropsClear).forEach(({prop, clear}) => {
				if(vals[prop] !== '') clear.forEach(prop => vals[prop] = '');
			});
			return vals;
		};
		P.renderPropToggle = function(vals, prop, className) {
			const {renderedValues} = this;
			let val = vals[prop];
			if(val) this.getChildElem(className)
			else this.clearChildElem(className);
			renderedValues[prop] = val;
		};
		P.renderPropDefault = function(vals, prop) {
			const {renderedValues} = this;
			const rule_zeroisten = this.getZeroIsTen();
			let val = vals[prop];
			let sel = 'cell-' + prop.replace(/s$/, '');
			let elem = this.getChildElem(sel);
			elem.textContent = rule_zeroisten ? String(val).replace('0', '10') : val;
			if(Array.isArray(this[prop])) elem.dataset['count'] = elem.textContent.length;
			renderedValues[prop] = val;
			if(val === '') this.clearChildElem(sel);
		};
		P.renderPropPencilmarks = function(vals) {
			const {renderedValues, givenCornermarks = []} = this;
			const rule_zeroisten = this.getZeroIsTen();
			let prop = 'pencilmarks', val = vals[prop];
			let pms = val.split('').slice(0, 9), setVals = [];
			for(let i = 0, len = pms.length; i < len; i++) {
				let pm = pms[i];
				setVals[i] = i;
				let elem = this.getChildElem('cell-pencilmark pm-' + i);
				elem.dataset['val'] = pm;
				elem.textContent = rule_zeroisten ? String(pm).replace('0', '10') : pm;
				elem.classList.toggle('givenCornermark', givenCornermarks.indexOf(pm) !== -1);
			}
			this.clearChildElem(new RegExp(`^cell-pencilmark pm-([^${setVals.join('')}])$`));
			renderedValues[prop] = val;
		};
		P.renderPropCandidates = function(vals) {
			const {renderedValues, givenCentremarks = []} = this;
			const rule_zeroisten = this.getZeroIsTen();
			let prop = 'candidates', val = vals[prop];
			let key = 'cell-candidate';
			let elem = this.getChildElem(key);
			if(val === '') {
				this.clearChildElem(key);
			}
			else {
				const valToTspan = val => {
					let isGiven = givenCentremarks.includes(String(val));
					let valText = rule_zeroisten ? String(val).replace('0', '10') : val;
					return `<tspan data-val="${val}"${isGiven ? ' class="given"' : ''}>${valText}</tspan>`;
				};
				elem.innerHTML = this[prop].slice(0, 9).map(valToTspan).join('');
			}
			if(Array.isArray(this[prop])) elem.dataset['count'] = elem.textContent.length;
			renderedValues[prop] = val;
		};
		P.renderPropColor = function(vals) {
			const {renderedValues, app: {svgRenderer}, row, col, childElems, colorTarget} = this;
			const prop = 'colours', val = vals[prop];
			this.clearChildElem(/^cell-color/);
			let cols = this[prop];
			for(let i = 0, len = cols.length; i < len; i++) {
				let className = `cell-color color-${cols[i]}`;
				childElems[className] = svgRenderer.renderCellWedge({
					target: colorTarget, className,
					a1: 25 + i * (360 / len),
					a2: 25 + (i + 1) * (360 / len),
					center: [row + 0.5, col + 0.5],
				});
			}
			renderedValues[prop] = val;
		};
		P.renderPropPen = function(vals) {
			const {renderedValues, app: {svgRenderer}, row, col, childElems} = this;
			const prop = 'pen', val = vals[prop];
			//Object.keys(childElems).forEach(key => key.match(/^cell-pen\b/) ? this.clearChildElem(key) : null);
			this.clearChildElem(/^cell-pen\b/);
			(val.match(/../g) || []).forEach((valCol, i, vals) => {
				let [val, color] = valCol.split('');
				let className = `cell-pen pen-${val} pencolor-${color}`;
				childElems[className] = svgRenderer.renderPen({row, col, className, value: val});
			});
			renderedValues[prop] = val;
		};
		P.renderContent = function(force = false) {
			//console.info('Cell[%s].renderContent); cellRendering = %s', this.toRC(), this.app.cellRendering);
			if(!this.app.cellRendering) return;
			if(force) this.renderedValues = {};
			const {renderedValues} = this;
			const vals = this.getRenderVals(), props = C.RenderProps;
			for(let i = 0, len = props.length; i < len; i ++) {
				let prop = props[i];
				if(renderedValues[prop] === vals[prop]) continue;
				switch(prop) {
					case 'haserror': this.renderPropToggle(vals, 'haserror', 'cell-error'); break;
					case 'highlighted': this.renderPropToggle(vals, 'highlighted', 'cell-highlight'); break;
					case 'value':
					case 'given':
						this.renderPropDefault(vals, prop); break;
					case 'pencilmarks': this.renderPropPencilmarks(vals); break;
					case 'candidates': this.renderPropCandidates(vals); break;
					case 'colours': this.renderPropColor(vals); break;
					case 'pen': this.renderPropPen(vals); break;
					default:
						console.warn('Unknown Cell prop type:', prop);
						this.renderPropDefault(vals, prop); break;
				}
			}
		};
	P.error = function(val) {
		//console.info('Cell.error(%s);', val, this.haserror);
		if(val !== undefined) {
			this.haserror = val;
			this.renderContent();
		}
		return this.haserror;
	};
	P.propGetElem = function(prop, val) {
		switch(prop) {
			case 'given': return this.childElems['cell-given'];
			case 'normal': return this.childElems['cell-value'];
			case 'centre': return (
				this.childElems['cell-candidate'] &&
				this.childElems['cell-candidate'].querySelector(`tspan[data-val="${val}"]`)
				);
			case 'corner': return this.childElems[`cell-pencilmark pm-${this.propGet('corner').indexOf(val)}`]
			default: console.error('Cell.propGetElem NOT IMPLEMENTED for prop: ' + prop);
		}
	};
	P.hasProp = function(prop) {
		switch(prop) {
			case 'given': return this.given !== undefined;
			case 'normal': return this.value !== undefined;
			case 'centre': return this.candidates.length > 0;
			case 'corner': return this.pencilmarks.length > 0;
			case 'colour': return this.colours.length > 0;
			case 'pen': return this.pen.length > 0;
		}
	};
	P.propVisible = function(prop) {
		if((this.app.currentPuzzle || {}).foglight) return this.propVisibleForFogLight(prop);
		const hiddenBy = C.PropHiddenBy[prop] || [];
		for(let i = 0, len = hiddenBy.length; i < len; i++)
			if(this.hasProp(hiddenBy[i])) return false;
		return true;
	};
	P.propVisibleForFogLight = function(prop) {
		switch(prop) {
			case 'given': return !this.hideclue;
			case 'normal': return true; // Always available, even if hidden by a given
			case 'centre':
			case 'corner': return !this.hasProp('normal') && (this.hideclue || !this.hasProp('given'));
		}
		return true;
	};
	P.propContains = function(prop, val) {
		val = val.toLowerCase();
		switch(prop) {
			case 'given': return this.given === val;
			case 'normal': return this.value === val;
			case 'centre': return this.candidates.includes(val);
			case 'corner': return this.pencilmarks.includes(val);
			case 'colour': return this.colours.includes(val);
			case 'pen': return this.pen.includes(val);
		}
	};
	P.propGet = function(prop) {
		switch(prop) {
			case 'given': return this.given;
			case 'normal': return this.value;
			case 'centre': return this.candidates;
			case 'corner': return this.pencilmarks;
			case 'colour': return this.colours;
			case 'pen': return this.pen;
		}
	};
	P.propSet = function(prop, val) {
		val = val.toLowerCase();
		if(!this.propVisible(prop) || this.propContains(prop, val)) return;
		switch(prop) {
			case 'given': this.setGiven(val); break;
			case 'normal': this.setValue(val); break;
			case 'centre': this.toggleProp('centre', val); break;
			case 'corner': this.toggleProp('corner', val); break;
			case 'colour': this.toggleColour(val); break;
			case 'pen': this.togglePen(val); break;
			break;
		}
		this.renderContent();
	};
	P.propUnset = function(prop, val) {
		val = val.toLowerCase();
		if(!this.propVisible(prop) || !this.propContains(prop, val)) return;
		switch(prop) {
			case 'normal': this.setValue(); break;
			case 'centre': this.toggleProp('centre', val); break;
			case 'corner': this.toggleProp('corner', val); break;
			case 'colour': this.toggleColour(val); break;
			case 'pen': this.togglePen(val); break;
			break;
		}
		this.renderContent();
	};
	P.clearProp = function(prop, skipRender = false) {
		//console.info('Cell[%s].clearProp(%s);', this.toRC(), prop);
		if(!this.propVisible(prop)) return;
		switch(prop) {
			case 'normal': this.clearValue(); break;
			case 'centre': this.clearCandidates(); break;
			case 'corner': this.clearPencilmarks(); break;
			case 'colour': this.clearColours(); break;
			case 'pen': this.clearPen(); break;
		}
		if(!skipRender) this.renderContent();
	};
	P.toggleProp = function(prop, val, setVal) {
		//console.info('Cell.toggleProp(%s, %s);', prop, val);
		if(!this.propVisible(prop)) return;
		if(Array.isArray(val)) return val.forEach(v => this.toggleProp(prop, v, setVal));
		if(setVal === true && this.propContains(prop, val)) return;
		if(setVal === false && !this.propContains(prop, val)) return;
		let propLabel = C.PropMap[prop];
		let items = this[propLabel] || [], idx = items.indexOf(val);
		if(idx === -1) items.push(val)
		else items.splice(idx, 1);
		items.sort();
	};
	P.clear = function({tool = 'normal', levels = 0} = {}) {
		//console.info('Cell[%s].clear({levels = %s, tool = %s});', this.toRC(), levels, tool);
		switch(tool) {
			case 'normal': this.clearProp('normal') || this.clearProp('centre') || this.clearProp('corner') || this.clearProp('colour'); break;
			case 'corner': this.clearProp('normal') || this.clearProp('corner') || this.clearProp('centre') || this.clearProp('colour'); break;
			case 'centre': this.clearProp('normal') || this.clearProp('centre') || this.clearProp('corner') || this.clearProp('colour'); break;
			case 'colour': this.clearProp('colour') || this.clearProp('normal') || this.clearProp('centre') || this.clearProp('corner'); break;
			case 'pen': this.clearProp('pen'); break;
			case 'all': this.clearProp('normal') && this.clearProp('corner') && this.clearProp('centre') && this.clearProp('colour') && this.clearProp('pen'); break;
			default: console.error('Cell.clear > Invalid tool:', tool);
		}
		if(levels > 1) return this.clear({tool, levels: levels - 1});
		this.renderContent();
		return this;
	};
	P.clearAll = function(initialize = false) {
		//console.info('Cell.clearAll(initialize);');
		this.clearProp('normal', initialize);
		this.clearProp('centre', initialize);
		this.clearProp('corner', initialize);
		this.clearProp('colour', initialize);
		this.clearProp('pen', initialize);
		if(!initialize) {
			this.toggleProp('centre', (this.givenCentremarks || []), true);
			this.toggleProp('corner', (this.givenCornermarks || []), true);
		}
		this.renderContent();
	};
	P.getVal = function() {
		return (this.propVisible('given') && this.propGet('given') !== undefined)
			? this.propGet('given')
			: this.propVisible('normal') ? this.propGet('normal') : undefined;
	};
	// Highlight
		P.highlight = function(val) {
			//console.info('Cell.highlight(%s);', val);
			this.highlighted = val;
			this.renderContent();
		};
	// Styles
		P.addStyle = function(style) {
			this.getChildElem('cell-style ' + style);
		};
		P.addBorder = function(type, dir) {
			this.getChildElem(`cell-border border-${type} ${type}-${dir}`);
		};
	// Given
		P.setGiven = function(val) {
			//console.info('Cell[%s].setGiven(%s);', this.toRC(), val);
			this.given = val;
		};
	// Value
		P.clearValue = function() {
			if(!this.propVisible('normal')) return;
			if(this.value === undefined) return false;
			this.value = undefined;
			return true;
		};
		P.setValue = function(val) {
			if(!this.propVisible('normal')) return;
			if(this.value === val) return;
			this.value = val;
		};
	// Candidates
		P.clearCandidates = function() {
			if(this.candidates.length === 0) return false;
			this.candidates.length = 0;
			return true;
		};
	// Pencilmarks
		P.clearPencilmarks = function() {
			if(this.pencilmarks.length === 0) return false;
			this.pencilmarks.length = 0;
			return true;
		};
	// Colour
		P.clearColours = function() {
			if(this.colours.length === 0) return false;
			this.colours.length = 0;
			return true;
		};
		P.toggleColour = function(val) {
			//if(String(val) === '0') return this.clearColours();
			if(!Framework.getSetting('multicolour')) {
				// Single colour mode
				if(this.colours.length > 1 || !this.propContains('colour', val)) this.clearColours();
			}
			return this.toggleProp('colour', val);
		};
	// Pen
		P.clearPen = function() {
			if(this.pen.length === 0) return false;
			this.pen.length = 0;
			return true;
		};
		P.togglePen = function(valCol) {
			let [val, color] = valCol.split('');
			if(color === undefined) {
				let penTool = this.app.tools.pen;
				if(penTool) color = penTool.getStateColor();
				if(color === undefined) color = 1;
			}
			if(String(val) === '0') return this.clearPen();
			val = val;
			let deleted = false;
			for(let i = this.pen.length - 1; i >= 0; i--) {
				let [v, c] = this.pen[i].split('');
				if(v === val) {
					this.pen.splice(i, 1);
					deleted = true;
				}
			}
			if(!deleted) this.pen.push(val + color);
		};
	// Helpers
		P.toRC = function() {
			return `r${this.row + 1}c${this.col + 1}`;
		};
		P.fromJSON = function(json) {
			//console.info('Cell.fromJSON("%s");', JSON.stringify(json));
			this.clearAll(true);
			if(json.c !== undefined) json.c.split(',').forEach(val => this.toggleProp('centre', val, true));
			if(json.pm !== undefined) json.pm.split(',').forEach(val => this.toggleProp('corner', val, true));
			if(json.cl !== undefined) json.cl.split(',').forEach(val => this.toggleColour(val, true));
			if(json.pe !== undefined) json.pe.split(',').forEach(val => this.togglePen(val, true));
			if(json.hl === true) this.highlight(true);
			// Do these last to avoid visiblity issues
			if(json.v !== undefined) this.setValue(json.v);
			if(json.g !== undefined) this.setGiven(json.g);
			this.renderContent();
		};
		P.toJSON = function() {
			var json = {
				g: this.given,
				v: this.value,
				c: this.candidates.join(','),
				pm: this.pencilmarks.join(','),
				cl: this.colours.join(','),
				pe: this.pen.join(','),
				hl: this.highlighted,
			};
			Object.keys(json).forEach(key =>
				([undefined, '', false].includes(json[key]))
				 || (Array.isArray(json[key]) && json[key].length === 0)
				? delete json[key]
				: null
			);
			if(Object.keys(json).length > 0) {
				json.rc = this.toRC();
			};
			return json;
		};
		P.serialize = function() {
			var json = this.toJSON();
			return C.StateKeys
				.map(key => {
					var val = json[key];
					if(val === undefined) return '';
					if(val === true) return 1;
					if(val === false) return '';
					return val;
				})
				.join('/')
				.replace(C.reStripSlashes, '');
		};
		P.deserialize = function(data) {
			var json = {};
			var vals = data.split('/');
			C.StateKeys
				.forEach((key, idx) => {
					var val = vals[idx];
					if(key === 'hl' && val === '1') val = true;
					if(val !== '' && val !== undefined) json[key] = val;
				});
			this.fromJSON(json);
		};
	return Cell;
})();
const Grid = (() => {
	function Grid(opts = {}) {
		this.app = opts.app;
		this.elem = opts.parent.querySelector('.cells');
		this.cells = [];
		this.createCells(opts);
	}
	Grid.ClassName = 'grid';
	var P = Object.assign(Grid.prototype, {constructor: Grid});
	P.clearCells = function() {
		//console.info('Grid.clearCells();');
		[...this.elem.querySelectorAll('*')].forEach(elem => elem.remove());
		this.cells.length = 0;
	};
	P.createCells = function({rows = 9, cols = 9}) {
		//console.warn('Grid.createCells(%s, %s);', rows, cols);
		this.clearCells();
		this.rows = rows;
		this.cols = cols;
		for(var r = 0; r < rows; r++) {
			this.cells[r] = [];
			let rowElem = Framework.createElem({class: 'row', parent: this.elem});
			for(var c = 0; c < cols; c++) {
				this.cells[r][c] = new Cell({app: this.app, parent: rowElem, row: r, col: c});
			}
		}
	};
	P.renderGridLines = function() {
		let svg = this.app.svgRenderer;
		[...svg.getElem().querySelectorAll('.cell-grids .cell-grid')].forEach(elem => elem.remove());
		let lines = [];
		for(var r = 0; r <= this.rows; r++) lines.push([[r, 0],[r, this.cols]]);
		for(var c = 0; c <= this.cols; c++) lines.push([[0, c],[this.rows, c]]);
		this.gridElem = svg.renderPart({
			target: 'cell-grids',
			type: 'path',
			attr: {
				class: 'cell-grid',
				d: lines.map(SvgRenderer.rcToPathData).join(' '),
			}
		});
	};
	P.getCell = function(r, c) {
		return (this.cells[r] || [])[c];
	};
	P.elemToCell = function(elem) {
		if(!elem || typeof elem.getAttribute !== 'function') return undefined;
		var row = elem.getAttribute('row'), col = elem.getAttribute('col');
		return this.getCell(row, col);
	};
	P.getCellList = function() {
		var cells = this.cells, cellList = [];
		for(var r = 0; r < cells.length; r++) {
			var row = cells[r];
			for(var c = 0; c < row.length; c++) {
				cellList.push(row[c]);
			}
		}
		return cellList;
	};
	return Grid;
})();

const Replay = (() => {
	function Replay() {}
	const P = Object.assign(Replay.prototype, {constructor: Replay});
	const tSepA = '/', tSepB = 'T', tSepC = '_';
	Replay.actA = 'hl,vl,pm,cd,co,cl,ud,rd,sl,ds,pe,pc,gs,ge,up,wt'.split(',');
	Replay.reActA = new RegExp(`(${Replay.actA.join('|')})(?:\:([^${tSepA},]+))?(?:${tSepA}([0-9]+))?`, 'ig');
	Replay.reActC = new RegExp(`([A-Z])(?:([^${tSepC}]+))?(?:${tSepC}([0-9]+))?`, 'g');
	Replay.reRCVal = /[rR]([0-9]+)[cC]([0-9]+)(?:\s*[:=]\s*([a-zA-Z0-9]+))?/g;
	Replay.reCellArg = /^(hl|sl|ds)$/i;
	Replay.parseActA = function(str) {
		const reActA = Replay.reActA;
		reActA.lastIndex = 0;
		let res = reActA.exec(str) || [];
		reActA.lastIndex = 0;
		return res.slice(1);
	};
	Replay.parseActC = function(str) {
		const reActC = Replay.reActC;
		reActC.lastIndex = 0;
		let res = reActC.exec(str) || [];
		reActC.lastIndex = 0;
		return res.slice(1);
	};
	Replay.actA2C = (rows = 9, cols = 9) => {
		const hexPad = (rows * cols - 1).toString(16).length;
		const rcToNum = rcv => {
			reRCVal.lastIndex = 0;
			const [_, r, c, v] = [...(reRCVal.exec(rcv) || [])];
			const num = ((Number(r) - 1) * cols + (Number(c) - 1));
			return num.toString(16).padStart(hexPad, '0');
		};
		const listRcvToNum = rcvList => rcvList.match(reRCVal).map(rcToNum).join('');
		const reActA = Replay.reActA;
		return act => {
			try {
				reActA.lastIndex = 0;
				let [_, type, arg, dt] = reActA.exec(act) || [];
				var res = String.fromCodePoint(Replay.actA.indexOf(type) + 'A'.codePointAt(0));
				if(arg) {
					if(reCellArg.test(type)) arg = listRcvToNum(arg);
					res += arg;
				}
				res += tSepC + (dt || 0);
			} catch(err) {
				console.error(err);
				console.error('Error in Replay.actA2C for act:', act);
				//throw err;
				res = '';
			}
			reActA.lastIndex = 0;
			return res;
		};
	};
	Replay.actC2A = (rows = 9, cols = 9) => {
		const hexPad = (rows * cols - 1).toString(16).length;
		const reNum = new RegExp('[0-9a-fA-F]{' + hexPad + '}', 'g');
		const numToRc = hex => {
			const num = parseInt(hex, 16);
			return 'r' + (Math.floor(num / cols) + 1) + 'c' + (num % cols + 1);
		};
		const listNumToRcv = numList => numList.match(reNum).map(numToRc).join('');
		const reActC = Replay.reActC;
		return (act, idx) => {
			try {
				reActC.lastIndex = 0;
				let [_, type, arg, dt] = reActC.exec(act) || [];
				var res = Replay.actA[type.codePointAt(0) - 'A'.codePointAt(0)];
				if(arg) {
					if(reCellArg.test(res)) arg = listNumToRcv(arg);
					res += ':' + arg;
				}
				if(dt) res += tSepA + dt;
				res = res.toLowerCase();
			} catch(err) {
				console.error(err);
				console.error('Error in Replay.actC2A for act:', act, idx);
				//throw err;
				res = '';
			}
			reActC.lastIndex = 0;
			return res;
		};
	};
	// WARNING: These no longer use the internal methods, so beware of desync!
	Replay.replayA2C = (replay, rows = 9, cols = 9) => {
		const {reRCVal, reCellArg, reActA, actA} = Replay;
		const codePointA = 'A'.codePointAt(0);
		const hexPad = (rows * cols - 1).toString(16).length;
		const listRcvToNum = rcvList => {
			let res = [], m, num;
			reRCVal.lastIndex = 0;
			m = reRCVal.exec(rcvList);
			while(m !== null) {
				num = ((Number(m[1]) - 1) * cols + (Number(m[2]) - 1));
				res.push(num.toString(16).padStart(hexPad, '0'));
				m = reRCVal.exec(rcvList);
			}
			return res.join('');
		};
		let m, cStr, res = [], type, arg, dt;
		try {
			reActA.lastIndex = 0;
			m = reActA.exec(replay);
			while(m !== null) {
				type = m[1];
				arg = m[2];
				dt = m[3];
				cStr = String.fromCodePoint(actA.indexOf(type) + codePointA);
				if(arg) cStr += reCellArg.test(type) ? listRcvToNum(arg) : arg;
				cStr += tSepC + (dt || 0);
				res.push(cStr);
				m = reActA.exec(replay);
			}
		} catch(err) {
			console.error(err);
			console.error('Error in Replay.replayA2C for act:', m);
			//throw err;
		}
		reActA.lastIndex = 0;
		return res.join('');
	};
	Replay.replayC2A = (replay, rows = 9, cols = 9) => {
		const {reCellArg, reActC, actC} = Replay;
		const codePointA = 'A'.codePointAt(0);
		const hexPad = (rows * cols - 1).toString(16).length;
		const reNum = new RegExp('[0-9a-fA-F]{' + hexPad + '}', 'g');
		const numToRc = hex => {
			const num = parseInt(hex, 16);
			return 'r' + (Math.floor(num / cols) + 1) + 'c' + (num % cols + 1);
		};
		const listNumToRcv = numList => {
			let res = [], m, num;
			reNum.lastIndex = 0;
			m = reNum.exec(numList);
			while(m !== null) {
				num = parseInt(m[0], 16);
				res.push('r' + (Math.floor(num / cols) + 1) + 'c' + (num % cols + 1));
				m = reNum.exec(numList);
			}
			return res.join('');
		};
		let m, aStr, res = [], type, arg, dt;
		try {
			reActC.lastIndex = 0;
			m = reActC.exec(replay);
			while(m !== null) {
				type = m[1];
				arg = m[2];
				dt = m[3];
				aStr = Replay.actA[type.codePointAt(0) - codePointA];
				if(arg) aStr += ':' + (reCellArg.test(aStr) ? listNumToRcv(arg) : arg);
				if(dt) aStr += tSepA + dt;
				res.push(aStr);
				m = reActC.exec(replay);
			}
		} catch(err) {
			console.error(err);
			console.error('Error in Replay.actC2A for act:', act, idx);
			//throw err;
		}
		reActC.lastIndex = 0;
		return res.join(',');
	};
	Replay.decode = replay => {
		if(typeof replay === 'string') replay = JSON.parse(replay);
		const semverToNumber = ver => ver.split('.').reduce((acc, n, idx, arr) => acc + Number(n) * Math.pow(1000, arr.length - idx - 1), 0);
		const {puzzleId, version, type, rows, cols, data} = replay;
		const verNum = semverToNumber(version);
		let savedActs;
		if((verNum >= semverToNumber('0.78.0')) && (verNum <= semverToNumber('0.81.2'))) {
			savedActs = Replay.actA;
			Replay.actA = 'hl,vl,pm,cd,co,pe,cl,ud,rd,sl,ds,gs,ge'.split(',');
		}
		let actions;
		switch(type) {
			case 'clzw': actions = Replay.replayC2A(loadFPuzzle.decompressPuzzle(data), rows, cols).split(','); break;
			default: throw new Error('Unkown replay type: ' + replay.type);
		}
		if(savedActs !== undefined) Replay.actA = savedActs;
		if(actions.length === 1 && actions[0] === '') actions.length = 0;
		return {puzzleId, version, type, rows, cols, actions};
	};
	Replay.encode = (puzzle) => {
		let {puzzleId, type = 'clzw', version = App.VERSION, rows, cols, actions, replayStack = []} = puzzle;
		actions = actions || replayStack;
		return JSON.stringify({
			puzzleId, type, rows, cols, version,
			data: loadFPuzzle.compressPuzzle(Replay.replayA2C(actions.join(','), rows, cols))
		});
	};
	Replay.fixReplay = function(replay) {
		// Strip trailing unpause actions
		const {actions} = replay;
		const reTrimActions = /^(up|sl|ds):/;
		let lastA = actions.length - 1;
		while(lastA-- > 0 && reTrimActions.test(actions[lastA]));
		while(++lastA < actions.length && !actions[lastA].startsWith('up:'));
		actions.length = Math.min(actions.length, lastA + 1);
		return replay;
	};
	return Replay;
})();

const Timer = (() => {
	function Timer(opts = {}) {
		PortableEvents.mixin(this);
		bindHandlers(this);
		this.opts = opts;
		this.selector = opts.selector || '#timer';
		this.timerElem = opts.elem || document.querySelector(this.selector);
		this.tickIntervalMs = (opts.tickInterval !== undefined) ? opts.tickInterval : Timer.DefaultTickIntervalMs;
		this.running = false;
		this.lastPauseTime = undefined;
		this.lastPauseTime = Date.now();
		this.lastPlayTime = undefined;
		this.setStartTime(opts.startTime);
		this.firstStart = true;
	}
	Timer.DefaultTickIntervalMs = 250;
	Timer.MinPauseDurationMs = 1000;
	Timer.iconPlay = `<svg class="icon-play" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24px" height="24px"><path d="M10.8 15.9l4.67-3.5c.27-.2.27-.6 0-.8L10.8 8.1c-.33-.25-.8-.01-.8.4v7c0 .41.47.65.8.4zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>`;
	Timer.iconPause = `<svg class="icon-pause" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24px" height="24px"><path d="M10 16c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1s-1 .45-1 1v6c0 .55.45 1 1 1zm2-14C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm2-4c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1s-1 .45-1 1v6c0 .55.45 1 1 1z"/></svg>`;
	Timer.icons = Timer.iconPause + Timer.iconPlay;
	Timer.formatTime = function(timeMs) {
		return String(Math.floor(timeMs / 60000)).padStart(2, '0')+':'+String(Math.floor(timeMs / 1000) % 60).padStart(2, '0');
	};
	var P = Object.assign(Timer.prototype, {constructor: Timer});
	P.getTimerElem = function() {
		return this.timerElem || this.opts.elem || document.querySelector(this.selector);
	};
	P.handlePlayPause = function(event) {
		event.preventDefault();
		event.stopPropagation();
		this.playPause();
	};
	P.handleRender = function() {
		this.elapsedTime = Date.now() - this.startTime;
		let timerElem = this.getTimerElem();
		if(timerElem) timerElem.textContent = Timer.formatTime(this.elapsedTime);
	};
	P.createUI = function(parent) {
		if(parent == null) return;
		const {createElem} = Framework;
		this.timerElem = createElem({class: 'timer', content: '00:00', parent});
		createElem({class: 'timer-control', parent, children: [
			{tag: 'button', class: 'timer-playpause', innerHTML: Timer.icons, handler: this.handlePlayPause}
		]});
		this.updateUI();
		addDownEventHandler(parent, this.handlePlayPause);
	};
	P.updateUI = function() {
		let timerElem = this.getTimerElem();
		if(timerElem && timerElem.parentElement) {
			timerElem.parentElement.setAttribute('title', `Timer ${this.running ? 'Running' : 'Paused'}`);
			timerElem.parentElement.classList.toggle('paused', !this.running);
		}
	};
	P.setStartTime = function(startTime) {
		this.startTime = isNaN(startTime) ? Date.now() : startTime;
		this.handleRender();
	};
	P.runOpensetting = function() {
		// TODO: This should really not be here
		const opensetting = new URLSearchParams(document.location.search).get('opensetting'),
					settingHandler = Framework.settingsOpts.find(s => opensetting === s.name)?.handler;
		if('function' === typeof settingHandler) {
			settingHandler();
			this.firstStart = false;
			this.stop();
			return true;
		}
		return false;
	};
	P.start = function(startTime) {
		if(startTime) this.setStartTime(startTime);
		if(this.firstStart) this.runOpensetting();
		if(Framework.getSetting('nopauseonstart')) this.firstStart = false;
		if(this.firstStart) {
			this.firstStart = false;
			this.stop();
			setTimeout(() => this.showPauseDialog(true), 100);
		}
		else {
			this.resume();
		}
	};
	P.resume = function() {
		if(this.running) return;
		this.setStartTime(Date.now() - this.elapsedTime); // Update startTime after a pause
		this.stop();
		this.lastPlayTime = Date.now();
		if(this.lastPauseTime !== undefined) {
			const duration = this.lastPlayTime - this.lastPauseTime;
			if(duration >= Timer.MinPauseDurationMs) {
				this.trigger('unpause', {duration});
			}
		}
		this.running = true;
		this.intervalId = setInterval(this.handleRender, this.tickIntervalMs);
		this.updateUI();
		this.trigger('start');
	};
	P.stop = function() {
		if(!this.running) return;
		this.running = false;
		this.lastPauseTime = Date.now();
		clearInterval(this.intervalId);
		this.updateUI();
		this.trigger('stop');
	};
	P.showPauseDialog = function(gameStart = false) {
		const {showDialog, app, app: {puzzle: {replayStack}}} = Framework;
		const parts = [];
		if(gameStart) {
			const buttonLabel = replayStack.length > 1 ? 'Resume' : 'Start';
			parts.push(
				...app.getPuzzleMetaDialogParts(),
				{tag: 'options', class: 'sticky', options: [{innerHTML: `${buttonLabel} Puzzle ${Timer.iconPlay}`}]}
			);
		}
		else {
			parts.push(
				{tag: 'title', innerHTML: '<span class="emoji">⏱</span> Game paused <span class="emoji">⏱</span>', style: 'text-align: center'},
				...app.getPuzzleMetaDialogParts(),
				{tag: 'options', class: 'sticky', options: [
					{innerHTML: `Resume ${Timer.iconPlay}`},
					{innerHTML: `Stay Paused ${Timer.iconPause}`}
				], style: 'flex-direction: row; justify-content: center;'},
			);
		}
		showDialog({
			parts,
			onCancel: () => this.resume(),
			onButton: button => { if(button.match(/^(Resume|Start)/)) this.resume(); },
			overlayBlur: Framework.getSetting('hidesolved'),
			centerOverBoard: true
		});
		Framework.showAd('pause');
	};
	P.playPause = function(forcePlay) {
		if(this.running && forcePlay !== true) {
			this.stop();
			if(this.timerElem !== null) this.showPauseDialog();
		}
		else if(!this.running && forcePlay !== false) {
			this.resume();
		}
	};
	return Timer;
})();

const Checker = (() => {
	const seenCageCells = PuzzleTools.seenCageCells;
	function Checker() {}
	const P = Object.assign(Checker.prototype, {constructor: Checker});
	Checker.CheckPencilmarkProps = ['centre', 'corner'];
	Checker.clearPuzzleInfo = function() {
		delete Checker.PuzzleInfo_currentPuzzle;
		delete Checker.PuzzleInfo_currentPuzzleInfo;
	};
	Checker.createPuzzleInfo = function() {
		const {normalizeRules, hasAntiKnight, hasAntiKing} = RulesParser;
		const {puzzle: {rows, cols, cells}, currentPuzzle = {}} = Framework.app;
		const {metadata: {antiking, antiknight} = {}} = currentPuzzle;
		let rules = normalizeRules(currentPuzzle.rules);
		let puzzleInfo = {
			rows, cols, cells,
			antiking: !!(antiking !== undefined ? antiking : hasAntiKing(rules)),
			antiknight: !!(antiknight !== undefined ? antiknight : hasAntiKnight(rules)),
		};
		Checker.PuzzleInfo_currentPuzzle = currentPuzzle;
		Checker.PuzzleInfo_currentPuzzleInfo = puzzleInfo;
		return Checker.PuzzleInfo_currentPuzzleInfo;
	};
	Checker.getPuzzleInfo = function() {
		const {currentPuzzle = {}} = Framework.app;
		if(Checker.PuzzleInfo_currentPuzzle !== currentPuzzle) Checker.createPuzzleInfo();
		// Find cage disjoints
		(currentPuzzle.cages || []).forEach(cage => cage.disjoints === undefined ? Checker.FindCageDisjoints(cage) : null);
		// cages cannot be cached due to fog
		Checker.PuzzleInfo_currentPuzzleInfo.cages = Checker.GetCellGroups(currentPuzzle.cages);
		return Checker.PuzzleInfo_currentPuzzleInfo;
	};
	Checker.GetCellGroups = function(cages = [], forceGrouping = false) {
		const exclTypes = ['region', 'rowcol'];
		const areCellsOrtho = (c1, c2) => (c2.row === c1.row && (Math.abs(c2.col - c1.col) === 1)) || (c2.col === c1.col && (Math.abs(c2.row - c1.row) === 1));
		const areCellsDisjoint = (c1, c2, disjoints) => disjoints.some(([a, b]) => (a === c1 && b === c2) || (b === c1 && a === c2));
		const isCellConnectedToCells = (c1, cells, disjoints) => cells.some(c2 => areCellsOrtho(c1, c2) || areCellsDisjoint(c1, c2, disjoints));
		const groups = [];
		cages.forEach(({parsedCells: cells, unique, type, disjoints = []}) => {
			if(!unique) return;
			if(exclTypes.includes(type)) return groups.push(cells);
			let fogCount = 0;
			for(let i = 0, len = cells.length; i < len; i++) if(cells[i].hideclue) fogCount++;
			// No fog found, add cage
			if(fogCount === 0 && !forceGrouping) return groups.push(cells);
			// No visible cells found, ignore cage.
			// One visible cell found, it can never see any other cells, ignore cage.
			if(cells.length - fogCount <= 1) return;
			const cellGroups = [];
			cells.forEach(cell => {
				const {row, col, hideclue} = cell;
				if(hideclue) return;
				const newGroup = [cell];
				cellGroups.forEach(cells => {
					if(isCellConnectedToCells(cell, cells, disjoints)) {
						newGroup.push(...cells);
						cells.length = 0;
					}
				});
				cellGroups.push(newGroup);
			});
			groups.push(...cellGroups.filter(cellGroup => cellGroup.length > (forceGrouping ? 0 : 1)));
		});
		return groups;
	};
	Checker.FindCageDisjoints = function(cage) {
		const isCellDiagonal = (r, c) => ({row, col}) => Math.abs(row - r) === 1 && Math.abs(col - c) === 1;
		let cellGroups = Checker.GetCellGroups([cage], true); // Split cells into disjoint groups
		if(cellGroups.length <= 1) return;
		cage.disjoints = [];
		cellGroups.forEach((group1, i) => {
			cellGroups.forEach((group2, j) => {
				if(i >= j) return;
				group1.forEach(cell1 => {
					const {row, col} = cell1;
					// Add cage.disjoints where any disjoint groups touch diagonally
					group2.filter(isCellDiagonal(row, col)).forEach(cell2 => cage.disjoints.push([cell1, cell2]));
				});
			});
		});
	};
	Checker.checkCell = function(errors, cell) {
		const cellVal = cell.getVal();
		if(cellVal !== undefined) return;
		errors.push({
			type: 'missing', expected: 'any value', found: cellVal, part: 'cell', cells: [cell],
			message: `Error in cell ${cell.toRC()}. Expected "${'any value'}" and found "${cellVal || ''}"`,
		});
	};
	Checker.checkPencilmarks = function(errors, cell, seenCells) {
		const props = Checker.CheckPencilmarkProps;
		for(let p = 0, plen = props.length; p < plen; p++) {
			const prop = props[p];
			if(!cell.propVisible(prop)) continue;
			const propVals = cell.propGet(prop);
			if(propVals.length === 0) continue;
			for(let i = 0, len = seenCells.length; i < len; i++) {
				const seencell = seenCells[i];
				const cellVal = seencell.getVal();
				if(propVals.includes(cellVal)) {
					errors.push({
						type: 'pencilmark-conflict', expected: 'no pencilmark', found: cellVal, part: 'pencilmark', prop, val: cellVal, cells: [cell],
						message: `Conflict in pencilmark in cell ${cell.toRC()}. Found "${cellVal}" in ${prop} mark, conflicting with value "${cellVal}" in cell"${seencell.toRC()}"`,
					});
				}
			}
		}
	};
	Checker.checkCellConflicts = function(errors, cell, seenCells) {
		const cellVal = cell.getVal();
		let visibleGiven = !cell.hideclude && cell.propVisible('given') && cell.propGet('given') !== undefined;
		let visibleNormal = cell.propVisible('normal') && cell.propGet('normal') !== undefined;
		if(!(visibleGiven || visibleNormal)) return;
		for(let i = 0, len = seenCells.length; i < len; i++) {
			const seencell = seenCells[i];
			if(cell === seencell) continue;
			if(cellVal !== seencell.getVal()) continue;
			errors.push({
				type: 'cell-conflict', expected: 'no matching value', found: cellVal, part: 'cell', val: cellVal, cells: [seencell],
				message: `Conflict in cell ${seencell.toRC()} conflicting with value "${cellVal}" in cell"${cell.toRC()}"`,
			});
		}
	};
	Checker.checkCellSolution = function(errors, cell, expected) {
		const found = cell.getVal() || '.';
		if(expected === '?' || found === expected) return;
		errors.push({
			type: 'incorrect', expected, found, part: 'cell', cells: [cell],
			message: `Error in cell ${cell.toRC()}. Expected "${expected}" and found "${found}"`,
		});
	};
	Checker.checkCages = function(puzzle, cages = [], errors = []) {
		//console.info('Checker.checkCages(cages, errors);', cages);
		const maxCageSum = size => {
			var sum = 0, num = 9;
			while(size-- > 0) sum += num--;
			return sum;
		};
		const cageUniqueCheck = (errors, cage, cells, cellValues) => {
			let uniqueValues = [...new Set(cellValues)];
			// Skip cages without cage.sum as they may be exotic
			if(cellValues.length !== uniqueValues.length && cage.sum !== undefined) {
				errors.push({
					type: 'unique', expected: cells.length, found: uniqueValues.length, part: 'cage', cage: cage,
					cells: cells.filter(cell => cellValues.filter(val => val === (cell.given || cell.value)).length > 1),
					message: `Error in cage uniqueness in cage ${cage.cells}. Expected "${cells.length}" and found "${uniqueValues.length}"`,
				});
			}
		};
		cages.forEach(cage => {
			let cells = puzzle.parseCells(cage.cells);
			let cellValues = cells.map(cell => cell.getVal()).filter(val => val !== undefined);
			if(cage.unique === true) cageUniqueCheck(errors, cage, cells, cellValues);
			// Exclude killer cages from checker
			if(cage.style === 'killer' || (cage.feature && cage.feature.type !== 'killercage')) return;
			if(cells.length !== cellValues.length) {
				errors.push({
					type: 'count', expected: cells.length, found: cellValues.length, part: 'cage', cage: cage,
					cells: cells.map(cell => cell.given || cell.value).filter(val => val !== undefined),
					message: `Error in cage cell count in cage ${cage.cells}. Expected "${cells.length}" and found "${cellValues.length}"`,
				});
			}
			// WHY THIS?
			//if(cage.unique === undefined) cageUniqueCheck(errors, cage, cells, cellValues);
			if(cage.sum !== undefined) {
				let cellSum = cellValues.map(val => Number(val)).reduce((cur, acc) => cur + acc, 0);
				// Only check cages with "valid" sums to skip exotic rule sets
				if(cellSum !== cage.sum && cage.sum <= maxCageSum(cells.length)) {
					errors.push({
						type: 'sum', expected: cage.sum, found: cellSum, part: 'cage', cage: cage, cells: cells,
						message: `Error in cage sum in cage ${cage.cells}. Expected "${cage.sum}" and found "${cellSum}"`,
					});
				}
			}
		});
		return errors;
	};
	Checker.check = function(puzzle, features = []) {
		//console.info('Checker.check(puzzle, %s);', JSON.stringify(features));
		const errors = [];
		if(puzzle === undefined) return errors;
		const {currentPuzzle = {}} = puzzle;
		if(currentPuzzle === undefined) return errors;
		const {cages = [], solution = ''} = currentPuzzle;
		let checks = {};
		features.forEach(feature => checks[feature] = true);
		if(checks.solution) {
			if(!currentPuzzle.solution && !currentPuzzle.hiddenSolution) delete checks.solution;
		}
		/*
		// TODO: Implement hidden solution API
		if(currentPuzzle.solution) {
			currentPuzzle.hiddenSolution = HideSol.hideSol(currentPuzzle.solution);
			delete currentPuzzle.solution;
		}
		if(checks.solution && currentPuzzle.hiddenSolution) {
			let hiddenSolCheckRes = HideSol.check(currentPuzzle.hiddenSolution, puzzle.toP81());
			if(!hiddenSolCheckRes) errors.push({
				type: 'incorrect', part: 'hiddensolution', message: `Error in hidden solution check.`
			});
		}
		*/
		const [minRC, maxRC] = puzzle.getMinMaxRC();
		const {cells = []} = puzzle, puzzleInfo = this.getPuzzleInfo();

		if(Framework.getSetting('conflictchecker') === 'simple') {
			// Remove all but row/col/box checks
			// Re-create cellgroups on filtered cages (row/col/box) only
			puzzleInfo.cages = Checker.GetCellGroups((currentPuzzle.cages || [])
				.filter(({type}) => ['region', 'rowcol'].includes(type)));
			delete puzzleInfo.antiknight;
			delete puzzleInfo.antiking;
		}
		for(let i = 0, len = cells.length; i < len; i++) {
			const cell = cells[i];
			const {row, col} = cell;
			if(!(row >= minRC[0] && row <= maxRC[0] && col >= minRC[1] && col <= maxRC[1])) continue;
			const seenCells = seenCageCells(cell, puzzleInfo, true);
			//if(checks.cells && solution[i] !== '?') this.checkCell(errors, cell);
			if(checks.pencilmarks) Checker.checkPencilmarks(errors, cell, seenCells);
			if(checks.cellconflicts) Checker.checkCellConflicts(errors, cell, seenCells);
			if(checks.solution && currentPuzzle.solution) Checker.checkCellSolution(errors, cell, currentPuzzle.solution[i]);
		}
		if(checks.cages) this.checkCages(puzzle, cages, errors);
		return errors;
	};
	return Checker;
})();

const Puzzle = (() => {
	function Puzzle(opts = {}) {
		PortableEvents.mixin(this);
		bindHandlers(this);
		this.throttledSaveProgress = throttleFunc(this.handleSaveProgress,
			Puzzle.shortSaveDelayMs, Puzzle.longSaveDelayMs
		);
		this.app = opts.app;
		this.grid = this.app.grid;
		this.currentPuzzle = undefined;
		this.replayStack = [];
		this.inGroup = false;
		this.undoStack = [];
		this.redoStack = [];
		this.stateStack = [];
		this.cells = [];
		this.selectedCells = [];
		//this.highlightedCells = [];
		this.replayTimeoutId = undefined;
		this.replayPlaying = false;
		this.errorsVisible = false;
		Object.defineProperties(this, {
			currentPuzzle: {get: () => this.app.currentPuzzle, set: (val) => this.app.currentPuzzle = val},
			//highlightedCells: {get: () => this.app.highlightedCells, set: (val) => this.app.highlightedCells = val},
			highlightedCells: {get: () => console.error('Puzzle.highlightedCells GET DEPRECATED!'), set: (val) => console.error('Puzzle.highlightedCells SET DEPRECATED!')},
			rows: {get: () => this.grid.rows, set: (val) => this.grid.rows = val},
			cols: {get: () => this.grid.cols, set: (val) => this.grid.cols = val},
		});
	}
	const C = Puzzle, P = Object.assign(C.prototype, {constructor: C});
	C.reRCRange = /^r([0-9]+)c([0-9]+)(?:-r([0-9]+)c([0-9]+))?$/;
	C.reRCVal = /^r([0-9]+)c([0-9]+)(?:\s*[:=]\s*(.+?))?$/;
	C.reRCSplit = /(?=r[0-9]+c[0-9]+)/;
	C.reIsSelection = /^(sl|ds|hl|select|deselect|highlight|up|unpause)$/i;
	C.reActWithTime = /(?:\/([0-9]+))$/;
	C.ActionLongToShort = {
		highlight: 'sl',
		select: 'sl',
		deselect: 'ds',
		value: 'vl',
		pencilmarks: 'pm',
		candidates: 'cd',
		colour: 'co',
		pen: 'pe',
		pencolor: 'pc',
		clear: 'cl',
		undo: 'ud',
		redo: 'rd',
		groupstart: 'gs',
		groupend: 'ge',
		unpause: 'up',
		wait: 'wt',
	};
	C.ActionShortToLong = {
		hl: 'select',
		sl: 'select',
		ds: 'deselect',
		vl: 'value',
		pm: 'pencilmarks',
		cd: 'candidates',
		co: 'colour',
		pe: 'pen',
		pc: 'pencolor',
		cl: 'clear',
		ud: 'undo',
		rd: 'redo',
		gs: 'groupstart',
		ge: 'groupend',
		up: 'unpause',
		wt: 'wait',
	};
	C.Tools = ['normal', 'corner', 'centre', 'colour', 'pen'];
	C.ToolToAction = {
		'normal': 'value',
		'corner': 'pencilmarks',
		'centre': 'candidates',
		'colour': 'colour',
		'pen': 'pen',
	};
	C.SolutionBlanks = ['.', '?'];
	C.parseRCVal = function(rcv) {
		const [_, r, c, val] = Puzzle.reRCVal.exec(rcv);
		const res = [Number(r), Number(c)];
		if(val !== undefined) res.push(val)
		return res;
	};
	C.shortSaveDelayMs = 1000;
	C.longSaveDelayMs = 10000;
	C.logTimeResolutionMs = 50;
	C.ActionsPerState = 100;
	C.MaxShortidLength = 200;
	C.isSelection = actType => C.reIsSelection.test(actType);
	C.resolveRC = query => {
		const res = [];
		query
			.replace(/[, ]+/g, '')
			.split(/(r[0-9]+c[0-9]+(?:-r[0-9]+c[0-9]+)?)/)
			.filter((item, idx) => idx % 2 === 1)
			.map(rc => {
				if(rc.match(/-/) === null) {
					res.push(Puzzle.parseRCVal(rc));
				}
				else {
					var [_, r1, c1, r2, c2] = Puzzle.reRCRange.exec(rc);
					r1 = parseInt(r1); c1 = parseInt(c1);
					r2 = parseInt(r2 || r1); c2 = parseInt(c2 || c1);
					for(var c = c1; c <= c2; c++) for(var r = r1; r <= r2; r++) res.push([r, c]);
				}
			});
		return res;
	};
	C.cageToRCs = (cage = {}) => cage.parsedCells
		? cage.parsedCells.map(({row, col}) => [row + 1, col + 1])
		: Puzzle.resolveRC(cage.cells);
	C.getMinMaxRCFromRegions = function(puz) {
		const {regions = []} = puz;
		const rcs = [].concat(...regions).filter(rc => Array.isArray(rc)),
					rows = rcs.map(([r, c]) => r),
					cols = rcs.map(([r, c]) => c);
		return [
			[
				rows.length === 0 ? 0 : Math.min(...rows),
				cols.length === 0 ? 0 : Math.min(...cols)
			],
			[
				rows.length === 0 ? puz.cells.length - 1 : Math.max(...rows),
				cols.length === 0 ? puz.cells[0].length - 1 : Math.max(...cols)
			],
		];
	};
	C.DefaultRules = 'No rules provided for this puzzle. Please check with the associated CTC video, or enquire with the source of the puzzle.';
	C.replayLength = function(replay = {}, opts = {}) {
		return (replay.actions || []).reduce((replayTime, action) => {
			let [_, type, arg, time = 0] = (action.match(/([^/:]+)(?:\:([^/]+))?(?:\/(.+))?/) || []);
			replayTime += Number(time || 0);
			if(type === 'up') replayTime = Math.max(0, replayTime - Number(arg));
			return replayTime;
		}, 0) * Puzzle.logTimeResolutionMs;
	};
	// Cells
		P.parseCells = function(cells) {
			//console.info('Puzzle.parseCells(cells);', cells);
			if(['none', '-', ''].includes(cells)) cells = [];
			if(['highlighted', 'selected', undefined].includes(cells)) cells = this.selectedCells;
			if(typeof cells === 'string') {
				cells = Puzzle.resolveRC(cells)
					.map(([r,c]) => this.grid.getCell(r - 1, c - 1))
					.filter(c => c !== undefined);
			}
			if(!Array.isArray(cells)) cells = [cells];
			if(cells === this.selectedCells) cells = [...cells];
			return cells;
		};
	// Board
		P.createPuzzle = function({rows = this.rows, cols = this.cols}) {
			//console.warn('Puzzle.createPuzzle({rows: %s, col: %s});', rows, cols);
			const svgRenderer = this.app.svgRenderer;
			this.grid.createCells({rows, cols});
			svgRenderer.clearAllLayers();
			this.cells = this.grid.getCellList();
			this.grid.renderGridLines();
			this.resetPuzzle();
		};
		P.clearPuzzle = function() {
			//console.info('Puzzle.clearPuzzle();');
			this.clearSelection();
			this.cells.forEach(cell => cell.clearAll(true));
			this.clearErrors();
			this.cells.forEach(cell => cell.renderContent(true));
		};
		P.resetPuzzle = function() {
			//console.info('Puzzle.resetPuzzle();');
			const {replayStack, undoStack, redoStack, stateStack} = this;
			if(replayStack.length > 0) {
				replayStack.length = 0;
				this.inGroup = false;
				undoStack.length = 0;
				this.undoSelection = 0; //ML:
				redoStack.length = 0;
				stateStack.length = 0;
				this.clearPuzzle();
			}
			this.lastActTime = Date.now();
			this.app.timer.setStartTime();
			this.trigger('reset');
		};
		P.restartPuzzle = function() {
			//console.info('Puzzle.restartPuzzle();');
			this.resetPuzzle();
			this.trigger('start');
		};
	// Loading
		P.getMinMaxRC = function(puzzle = this.currentPuzzle ?? {}) {
			const {grid, grid: {rows, cols}} = this;
			const {cages = [], solution = ''} = puzzle;
			const rcs = [].concat(...cages.map(Puzzle.cageToRCs)),
						rs = rcs.map(([r, c]) => r),
						cs = rcs.map(([r, c]) => c);
			let minMaxRC = [
				[
					rs.length === 0 ? 0 : Math.min(...rs) - 1,
					cs.length === 0 ? 0 : Math.min(...cs) - 1
				],
				[
					rs.length === 0 ? this.rows - 1 : Math.max(...rs) - 1,
					cs.length === 0 ? this.cols - 1 : Math.max(...cs) - 1
				],
			];
			if(this.hasSolution(puzzle)) {
				let gridSize = rows * cols;
				if(gridSize !== solution.length) {
					// TODO: Report error to user
					console.error('Grid/solution size mismatch: grid = %s, solution = %s', gridSize, solution.length);
				}
				else {
					const blanks = Puzzle.SolutionBlanks;
					let left = (() => {
						let c = 0;
						for(; c < cols; c++) for(let r = 0; r < rows; r++)
							if(!blanks.includes(solution[r * cols + c])) return c;
						return c;
					})();
					let right = (() => {
						let c = cols - 1;
						for(; c >= 0; c--) for(let r = 0; r < rows; r++)
							if(!blanks.includes(solution[r * cols + c])) return c;
						return c;
					})();
					let top = (() => {
						let r = 0;
						for(; r < rows; r++) for(let c = 0; c < cols; c++) 
							if(!blanks.includes(solution[r * cols + c])) return r;
						return r;
					})();
					let bottom = (() => {
						let r = rows - 1;
						for(; r >= 0; r--) for(let c = 0; c < cols; c++) 
							if(!blanks.includes(solution[r * cols + c])) return r;
						return r;
					})();
					minMaxRC[0][0] = Math.min(minMaxRC[0][0], top);
					minMaxRC[0][1] = Math.min(minMaxRC[0][1], left);
					minMaxRC[1][0] = Math.max(minMaxRC[1][0], bottom);
					minMaxRC[1][1] = Math.max(minMaxRC[1][1], right);
				}
			}
			return minMaxRC;
		};
		P.loadPuzzle = function(puzzle, opts = {}) {
			//console.info('Puzzle.loadPuzzle(puzzle, opts);', puzzle, opts);
			this.currentPuzzle = puzzle;
			this.sudokuConflict = false;
			const rows = this.grid.rows, cols = this.grid.cols;
			const svgRenderer = this.app.svgRenderer;
			let [minRC, maxRC] = this.getMinMaxRC();
			
			if(minRC[0] > maxRC[0] && minRC[1] > maxRC[1]) { minRC = [0, 0]; maxRC = [rows - 1, cols - 1]; }
			let activeRows = maxRC[0] - minRC[0] + 1;
			let activeCols = maxRC[1] - minRC[1] + 1;
			let nativeCageCount = (puzzle.cages || []).length;
			if((puzzle.metadata || {}).norowcol !== true) {
				// Generate row cages
				for(var r = minRC[0]; r <= maxRC[0]; r++) puzzle.cages.push({
					cells: `r${r + 1}c${minRC[1] + 1}-r${r + 1}c${maxRC[1] + 1}`,
					sum: triangularNumber(activeCols),
					unique: true,
					type: 'rowcol',
				});
				// Generate col cages
				for(var c = minRC[1]; c <= maxRC[1]; c++) puzzle.cages.push({
					cells: `r${minRC[0] + 1}c${c + 1}-r${maxRC[0] + 1}c${c + 1}`,
					sum: triangularNumber(activeRows),
					unique: true,
					type: 'rowcol',
				});
			}
			// Generate sudokuX cages
			(puzzle.sudokuX || []).forEach(feature => {
				try {
					let rc0 = [], rc1 = [];
					if(feature.type === 'sudokux+') {
						rc0[0] = maxRC[0] + 1; rc0[1] = minRC[1] + 1;
						rc1[0] = minRC[0] + 1; rc1[1] = maxRC[1] + 1;
					}
					else if(feature.type === 'sudokux-') {
						rc0[0] = minRC[0] + 1; rc0[1] = minRC[1] + 1;
						rc1[0] = maxRC[0] + 1; rc1[1] = maxRC[1] + 1;
					}
					else {
						return;
					}
					let cells = getLinePoints(rc0[0], rc0[1], rc1[0], rc1[1]).map(([r, c]) => `r${r}c${c}`);
					puzzle.cages.push({
						cells: cells.join(','),
						sum: triangularNumber(cells.length),
						unique: true,
						type: 'rowcol',
					});
				}
				catch (err) {
					console.error('Error adding sudoku-x feature');
					console.log('  feature:', feature);
				}
			});
			// Generate windoku cages
			(puzzle.windoku || []).forEach(feature => {
				const {center, width, height} = feature.underlay;
				puzzle.cages.push({
					cells: `r${center[0] - 0.5 * width + 1}c${center[1] - 0.5 * height + 1}-r${center[0] + 0.5 * width}c${center[1] + 0.5 * height}`,
					sum: 45,
					unique: true,
					style: 'windoku',
					type: 'region',
				});
			});
			// Generate X/V/XV cages
			const xvTotals = {'v': 5, 'x': 10, 'xv': 15};
			const cellsToRcRange = ([a, b]) => `r${a[0] + 1}c${a[1] + 1}-r${b[0]+1}c${b[1] + 1}`;
			(puzzle.xvs || []).forEach(({center: c, text}) => {
				let cells = [
					[Math.floor(c[0] - 0.5), Math.floor(c[1] - 0.5)],
					[Math.ceil(c[0] - 0.5), Math.ceil(c[1] - 0.5)],
				];
				// Check both cells are inside grid
				if(cells[0][0] < minRC[0] || cells[1][0] > maxRC[0] ||
					 cells[0][1] < minRC[1] || cells[1][1] > maxRC[1]) {
					return;
				}
				puzzle.cages.push({
					cells: cellsToRcRange(cells),
					sum: xvTotals[text.toLowerCase()],
					unique: true,
				});
			});
			(puzzle.cages || []).forEach(cage => cage.parsedCells = this.parseCells(cage.cells));
			this.resetPuzzle();
			//this.cells.forEach(cell => cell.clear());
			(puzzle.givens || []).forEach(given => {
				let [r, c, val] = Puzzle.parseRCVal(given);
				this.grid.getCell(r - 1, c - 1).propSet('given', val);
			});
			let cageErrors = this.check(['cages']);
			let cageErrorsUnique = cageErrors.filter(({type}) => type === 'unique');
			if(cageErrorsUnique.length > 0) {
				console.warn('Cage conflict with givens, removing generated row/col/x-cages');
				this.sudokuConflict = true;
				// Remove automatic row/col-cages
				puzzle.cages.length = nativeCageCount;
			}
			(puzzle.centremarks || []).forEach(centremark => {
				let [r, c, val] = Puzzle.parseRCVal(centremark);
				let cell = this.grid.getCell(r - 1, c - 1);
				cell.givenCentremarks = String(val).toLowerCase().split(',');
				cell.toggleProp('centre', cell.givenCentremarks);
				cell.renderContent();
			});
			(puzzle.pencilmarks || []).forEach(pencilmark => {
				let [r, c, val] = Puzzle.parseRCVal(pencilmark);
				let cell = this.grid.getCell(r - 1, c - 1);
				cell.givenCornermarks = String(val).toLowerCase().split(',');
				cell.toggleProp('corner', cell.givenCornermarks);
				cell.renderContent();
			});
			const {solution} = puzzle;
			const hasDupes = arr => {
				for(let i = 0, len = arr.length; i < len; i++)
					for(let j = i + 1; j < len; j++)
						if(arr[j] === arr[i]) return true;
				return false;
			};
			(puzzle.cages || []).forEach(cage => {
				if((cage.cells || []).length === 0) return;
				if(cage.hidden === true) return;
				if(cage.unique && solution) {
					const cellSol = cage.parsedCells
						.map(cell => solution[this.cells.indexOf(cell)])
						.filter(v => !Puzzle.SolutionBlanks.includes(v));
					if(hasDupes(cellSol)) cage.unique = false;
				}
				const cageTarget = cage.style === 'box' ? 'cell-grids' : 'cages';
				const cageOpts = Object.assign({}, cage, {
					target: cageTarget,
					cells: this.parseCells(cage.cells),
					cageValue: cage.cageValue,
					//cageValue: String(cage.cageValue === undefined ? cage.sum : cage.cageValue),
					style: cage.style
				});
				svgRenderer.renderCage(cageOpts);
			});
			this.app.resize();
			this.trigger('loaded');
			return Promise.resolve()
				.then(sleep(0))
				.then(() => opts.skipProgress ? null : this.loadProgress())
				.then(() => this.trigger('start'));
		};
		P.createState = function() {
			let state = {
				id: this.puzzleId,
				time: Date.now() - this.app.timer.startTime,
				actions: this.undoStack.length,
				cells: this.cells.map(cell => cell.serialize()),
			};
			this.app.handleToolEventForwarding('Createstate', state);
			return state;
		};
		P.applyState = function(state) {
			if(this.id !== state.puzzleId) {
				throw new Error('Cannot applyState on different puzzle. (Use Puzzle.deserializeState(), instead)');
			}
			this.clearPuzzle();
			state.cells.forEach((data, idx) => {
				let cell = this.cells[idx];
				cell.deserialize(data);
				if(cell.highlighted) this.selectedCells.push(cell);
			});
			this.app.handleToolEventForwarding('Applystate', state);
		};
		P.serializeState = function() {
			return JSON.stringify(this.createState());
		};
		P.deserializeState = function(state) {
			if(typeof state === 'string') state = JSON.parse(state);
			if(this.id === state.puzzleId) return this.applyState(state);
			return this.loadRemoteCTCPuzzle(state.id)
				.then(() => {
					this.applyState(state);
					this.app.renderCells();
				});
		};
		P.loadCTCPuzzle = function(ctcPuzzle) {
			//console.info('Puzzle.loadCTCPuzzle(ctcPuzzle);', ctcPuzzle);
			var puzzle = this.app.convertPuzzle(ctcPuzzle);
			return this.loadPuzzle(puzzle);
		};
		P.loadRemoteCTCPuzzle = function(puzzleId) {
			//console.info('Puzzle.loadRemoteCTCPuzzle("%s");', puzzleId);
			this.puzzleId = puzzleId;
			return PuzzleLoader.fetchPuzzle(puzzleId, {timeout: 10000})
				.then(ctcPuzzle => this.loadCTCPuzzle(ctcPuzzle))
				.catch(reportAndRethrow('Error in Puzzle.loadRemoteCTCPuzzle:'));
		};
		P.getRules = function(asHTML, puzzle = this.currentPuzzle) {
			let rulesText = (puzzle || {}).rules || Puzzle.DefaultRules;
			if(Array.isArray(rulesText)) rulesText = rulesText.join('\n');
			rulesText = rulesText.replace(/(\n)+$/, ''); // Trim trailing blank lines
			if(asHTML) rulesText = textToHtml(rulesText);
			if(puzzle === this.currentPuzzle && !this.hasSolution(puzzle)) {
				rulesText += `\n<div class="puzzlenotes">Note: This puzzle does not have <strong>solution checking</strong>.</div>`
			}
			return rulesText;
		};
	// Selection
		P.clearSelection = function() {
			//console.info('Puzzle.clearSelection();');
			this.selectedCells.forEach(cell => cell.highlight(false));
			this.selectedCells.length = 0;
		};
		P.select = function(cells) {
			var selectedCells = this.selectedCells;
			if(cells === undefined) throw new Error('Select requires cells');
			if(!Array.isArray(cells)) cells = [cells];
			//console.info('Puzzle.select([%s]);', this.cellsToString(cells));
			cells = cells.filter(cell => !selectedCells.includes(cell));
			if(cells.length > 0) this.act({type: 'select', arg: cells});
		};
		P.deselect = function(cells, skipAct) {
			if(skipAct !== undefined) console.error('DEPRCATED argument "skipAct" in Puzzle.deselect(..., skipAct);');
			this.act({type: 'deselect', arg: cells});
		};
		C.SmartSelectToolOrder = {
			normal: ['normal', 'colour', 'centre', 'corner', 'cagecosmetic', 'thermocosmetic', 'arrowsumcosmetic', 'cellcosmetic'],
			centre: ['normal', 'centre', 'corner', 'colour', 'cagecosmetic', 'thermocosmetic', 'arrowsumcosmetic', 'cellcosmetic'],
			corner: ['normal', 'corner', 'centre', 'colour', 'cagecosmetic', 'thermocosmetic', 'arrowsumcosmetic', 'cellcosmetic'],
			colour: ['colour', 'normal', 'centre', 'corner', 'cagecosmetic', 'thermocosmetic', 'arrowsumcosmetic', 'cellcosmetic'],
		};
		C.cosmeticEqual = ({cosmetic: c1, type: t1}) => ({cosmetic: c2, type: t2}) => {
			if(t1 !== t2) return false;
			if(typeof c1 === 'string' && typeof c2 === 'string') return c1 === c2;
			if(t1 === 'thermocosmetic') return c1.thermo === c2.thermo;
			return true
				&& c1.rounded === c2.rounded
				&& c1.backgroundColor === c2.backgroundColor
				&& c1.borderColor === c2.borderColor
				&& c1.width === c2.width
				&& c1.height === c2.height
				&& c1.text === c2.text;
		};
		C.getCosmetics = (puzzle, c, type) => (puzzle.cosmetic || []).filter(co => co.type === type && c.row === co.rc[0] && c.col === co.rc[1]);
		C.selectPropNormal = (cell, tool) => {
			let selVal = (!cell.hideclue && cell.propGet('given')) || cell.propGet(tool) || undefined;
			return (selVal !== undefined) && (c => c.getVal() === selVal);
		};
		C.selectPropEvery = (cell, tool) => {
			let selVal = [...cell.propGet(tool)];
			return (selVal.length > 0) && (c => c.propVisible(tool) && selVal.every(val => c.propContains(tool, val)));
		};
		C.selectPropSome = (cell, tool) => {
			let selVal = [...cell.propGet(tool)];
			return (selVal.length > 0) && (c => c.propVisible(tool) && selVal.some(val => c.propContains(tool, val)));
		};
		C.selectCosmetics = (puzzle, cell1, type) => {
			const sel1 = C.getCosmetics(puzzle, cell1, type),
						hiddenCells = cell1.app.grid.getCellList().filter(c => c.hideclue),
						hiddenCosmetics = (puzzle.cosmetic || [])
							.filter(({type: t, rc}) => type === t && hiddenCells.some(({row: r, col: c}) => isSameRC(rc, [r, c])));
			return (sel1.length > 0)
				&& (cell2 => {
					if(cell1.hideclue || cell2.hideclue) return false;
					const sel2 = C.getCosmetics(puzzle, cell2, type)
						.filter(co => !hiddenCosmetics.some(co2 => co2.cosmetic === co.cosmetic));
					return !sel1.some(cc1 => sel2.find(C.cosmeticEqual(cc1)) === undefined);
				});
		};
		C.makeSelector = (puzzle, cell, tool) => {
			if(Array.isArray(tool)) return tool.reduce((acc, cur) => acc || C.makeSelector(puzzle, cell, cur), undefined);
			switch(tool) {
				case 'normal':
					return C.selectPropNormal(cell, tool);
				case 'centre':
					return C.selectPropEvery(cell, tool);
				case 'corner':
				case 'colour':
					return C.selectPropSome(cell, tool);
				case 'cagecosmetic':
				case 'arrowsumcosmetic':
				case 'thermocosmetic':
				case 'cellcosmetic':
					return C.selectCosmetics(puzzle, cell, tool);
			}
		};
		P.smartSelectCell = function(cell, tool, skipDeselect = false) {
			//console.info('Puzzle.smartSelectCell(cell, tool, skipDeselect = %s);', cell, tool, skipDeselect === true);
			const {currentPuzzle: puzzle, grid} = this, ToolOrder = C.SmartSelectToolOrder;
			let selector = C.makeSelector(puzzle, cell, ToolOrder[tool] || ToolOrder.normal);
			let cells = typeof selector === 'function'
				? grid.getCellList().filter(selector)
				: [];
			if(cells.length > 0) {
				if(!skipDeselect) this.deselect();
				this.select(cells);
			}
		};
	// Progress
		P.getProgress = function() {
			const {isRemotePuzzleId} = PuzzleLoader;
			const progress = {
				puzzleId: this.puzzleId,
				time: Date.now(),
				replay: this.app.getReplay({noStates: true})
			};
			let shortid = getPuzzleId();
			if(isRemotePuzzleId(shortid) && shortid.length <= C.MaxShortidLength) {
				progress.shortid = shortid;
			}
			return JSON.stringify(progress);
		};
		P.handleSaveProgress = function() {
			//console.info('Puzzle.handleSaveProgress();');
			const storageKey = `progress_${this.puzzleId}`;
			if(this.replayStack.length > 1) {
				localStorage.setItem(storageKey, this.getProgress());
			}
			else {
				localStorage.removeItem(storageKey);
			}
			this.trigger('progresssaved');
		};
		P.saveProgress = function(force) {
			if(this.replayPlaying) return;
			//console.info('Puzzle.saveProgress(%s);', !!force);
			if(force) return this.throttledSaveProgress.force();
			this.throttledSaveProgress();
		};
		P.loadProgress = function(progress) {
			return Promise.resolve()
				.then(() => {
					if(progress === undefined) {
						progress = localStorage.getItem(`progress_${this.puzzleId}`);
					}
					if(!progress) return;
					if(typeof progress === 'string') progress = JSON.parse(progress);
					if(progress.replay === undefined) return;
					let replay = Replay.decode(progress.replay);
					replay = Replay.fixReplay(replay);
					return this.app.loadReplay(replay, {speed: -1})
						.then(() => {
							let replayLen = Puzzle.replayLength(replay);
							if(!isNaN(replayLen)) this.app.timer.setStartTime(Date.now() - replayLen);
						});
				})
				.then(() => this.trigger('progressloaded'));
		};
		P.isCompleted = function() {
			if(this.hasSolution()) return (this.check(['solution']) || []).length === 0;
			return this.cells.every(cell => cell.hasProp('given') || cell.hasProp('normal'))
				&& (this.check(['cells', 'cages', 'solution']) || []).length === 0;
		};
	// Actions
		P.cellsToString = function(cells) {
			//console.info('Puzzle.cellsToString(cells);', cells);
			if(cells === undefined) cells = 'none';
			if(cells === 'none') cells = [];
			if(!Array.isArray(cells)) cells = [cells];
			cells = cells.map(cell => cell.toRC()).join('');
			return cells || '-';
		};
		P.actionToString = function(action) {
			if(typeof action === 'string') return action;
			const type = Puzzle.ActionLongToShort[action.type] || '-';
			var arg = '-';
			switch(type) {
				case 'hl':
				case 'sl':
				case 'ds':
					arg = this.cellsToString(action.arg); break;
				case 'cl':
					//console.warn('actionToString CLEAR:', action, type, action.arg, Puzzle.Tools, Puzzle.Tools.indexOf(action.arg));
					arg = Puzzle.Tools.indexOf(action.arg); break;
				default:
					if(action.arg !== undefined) arg = action.arg;
			}
			var act = type + (arg !== '-' ? ':' + arg : '');
			if(action.time) act += '/' + action.time;
			return act;
		};
		P.parseAction = function(action) {
			//console.info('Puzzle.parseAction(action);', action);
			if(typeof action === 'string') {
				const [type, arg, time] = Replay.parseActA(action);
				action = {
					type: Puzzle.ActionShortToLong[type] || 'unknown',
					time: parseInt(time) * Puzzle.logTimeResolutionMs
				};
				switch(type) {
					case 'hl':
					case 'sl':
					case 'ds':
						action.arg = this.parseCells(arg);
						break;
					case 'cl': action.arg = Puzzle.Tools[arg]; break;
					default:
						if(arg !== undefined && arg !== '-') action.arg = arg;
				}
			}
			return action;
		};
		P.findHighestCellProp = function(cells, tool = 'normal') {
			var props = [];
			switch(tool) {
				case 'normal': props = ['normal', 'centre', 'corner', 'colour', 'pen']; break;
				case 'corner': props = ['corner', 'normal', 'centre', 'colour', 'pen']; break;
				case 'centre': props = ['centre', 'normal', 'corner', 'colour', 'pen']; break;
				case 'colour': props = ['colour', 'normal', 'centre', 'corner', 'pen']; break;
				case 'pen': props = ['pen', 'normal', 'centre', 'corner', 'colour']; break;
			}
			var firstProp = props.length;
			cells.forEach(cell => {
				var idx = props.findIndex(prop => cell.hasProp(prop) && cell.propVisible(prop));
				if(idx > -1) firstProp = Math.min(firstProp, idx);
			});
			return props[firstProp];
		};
		P.findCageValueCells = function(cells) {
			var cageValueCells = [];
			this.currentPuzzle.cages
				.forEach((cage = {}) => {
					if(cage.cageValue === undefined) return;
					var [r, c, val] = Puzzle.parseRCVal(cage.cageValue);
					var cageValueCell = this.grid.getCell(r - 1, c - 1);
					if(cells.indexOf(cageValueCell) !== -1) cageValueCells.push(cageValueCell);
				});
			return cageValueCells;
		};
		P.clearCells = function({cells = this.selectedCells, tool = 'normal'}) {
			//console.info('Puzzle.clearCells({cells = [%s], tool = "%s"});', this.cellsToString(cells), tool);
			var clearProp = this.findHighestCellProp(cells, tool);
			cells.forEach(cell => cell.clearProp(clearProp));
		};
		P.toggleGroup = function(cells, tool = 'normal', value) {
			//console.info('Puzzle.toggleGroup(cells, %s, %s);', tool, value);
			cells = cells.filter(cell => cell.propVisible(tool));
			var cellsContain = cells.filter(cell => cell.propContains(tool, value));
			if(cellsContain.length < cells.length) {
				cells.forEach(cell => cell.propSet(tool, value));
			}
			else {
				cells.forEach(cell => cell.propUnset(tool, value));
			}
		};
		P.getLastStateActions = function() {
			const {stateStack} = this;
			return stateStack.length < 1 ? 0 : stateStack[stateStack.length - 1].actions;
		};
		P.logReplayAct = function(act, elapsedTime) {
			let time = Date.now(), logAct = act, et = elapsedTime;
			if(Puzzle.reActWithTime.test(logAct)) {
				if(et === undefined) et = parseInt(logAct.match(Puzzle.reActWithTime)[1]);
				logAct = logAct.replace(Puzzle.reActWithTime, '');
			}
			else if(et === undefined) et = time - this.lastActTime;
			this.lastActTime = time;
			logAct = logAct + '/' + Math.round(et / Puzzle.logTimeResolutionMs);
			//console.info('Puzzle.logReplayAct("%s", %s);', act, elapsedTime, logAct);
			this.replayStack.push(logAct);
			if(!Puzzle.isSelection(this.parseAction(act).type)) this.saveProgress();
		};
		P.logUndoAct = function(act) {
			this.undoStack.push(act);
			let nextStateAt = (Math.floor(this.getLastStateActions() / Puzzle.ActionsPerState) + 1) * Puzzle.ActionsPerState;
			if(!this.inGroup && this.undoStack.length >= nextStateAt) this.stateStack.push(this.createState());
		};
		P.execUndo = function() {
			if(this.undoStack.length === 0) {
				if(this.app.preRestartSavedProgress !== undefined) {
					const savedReplayStack = this.replayStack.slice(0); // Preserve replayStack
					const savedRedoStack = this.redoStack.slice(0); // Preserve redoStack
					this.app.puzzle.loadProgress(this.app.preRestartSavedProgress)
						.then(() => {
							this.replayStack.push(...savedReplayStack);
							this.redoStack.push(...savedRedoStack);
							this.app.puzzle.saveProgress(true); // Ensure a page reload doesn't loose this state
						});
					this.app.preRestartSavedProgress = undefined;
				}
				return false;
			}
			let isFirst = true;
			do {
				var undoAct = this.undoStack.pop();
				var actStr = Replay.parseActA(undoAct)[0];
				if(actStr === 'ge') this.inGroup = true;
				if(actStr === 'gs') this.inGroup = false;
				//this.redoStack.push(undoAct);
				//ML: When undoSelection > 0 then undo only these intermediate selections.
				if(this.undoSelection === 0) this.redoStack.push(undoAct); //ML Normal undo action
				else if(this.undoSelection-- === 1) break; //ML Always stop when undoSelection becomes 0
				if(isFirst && actStr === 'ds') break; // SN undo most recent deselect seperately
				isFirst = false;
			} while(this.undoStack.length > 0 && (this.inGroup || Puzzle.isSelection(actStr)));

			this.app.disableRendering();
			this.clearPuzzle();

			const {undoStack, stateStack} = this;
			let undoRest = undoStack;
			if(stateStack.length > 0) {
				let lastState = stateStack[stateStack.length - 1];
				// Unwind saved states until we get to a state before the action we require
				while(lastState.actions > undoStack.length) {
					stateStack.pop();
					if(stateStack.length <= 0) break;
					lastState = stateStack[stateStack.length - 1];
				}
				if(stateStack.length > 0) {
					this.applyState(lastState);
					undoRest = undoRest.slice(lastState.actions);
				}
			}
			undoRest.forEach(act => this.exec(act));
			this.app.renderCells();
			return true;
		};
		P.execRedo = function() {
			if(this.redoStack.length === 0) return false;

			//ML: When undoSelection > 0 then undo these intermediate selections before applying the redo.
			if(this.undoSelection > 0) this.execUndo();
			let redoAct, actStr;
			do {
				redoAct = this.redoStack.pop();
				this.exec(redoAct);
				this.logUndoAct(redoAct);
				actStr = Replay.parseActA(redoAct)[0];
			} while(this.redoStack.length > 0 && (this.inGroup || Puzzle.isSelection(actStr)));
			return true;
		};
		P.exec = function(action) {
			var {type, arg} = this.parseAction(action), selectedCells = this.selectedCells;
			//console.info('Puzzle.exec("%s");', this.actionToString(action));
			var res = true;
			switch(type) {
				case 'highlight':
				case 'select':
					if(typeof arg === 'string') arg = this.parseCells(arg);
					if(arg === undefined) console.error('Cannot select UNDEFINED cells!');
					arg.forEach(cell => {
						if(cell.highlighted !== true) {
							cell.highlight(true);
							selectedCells.push(cell);
						}
					});
					break;
				case 'deselect':
					res = false;
					if(typeof arg === 'string') arg = this.parseCells(arg);
					else if(arg === undefined) arg = [...selectedCells];
					else if(arg === selectedCells) arg = [...selectedCells];
					else if(!Array.isArray(arg)) arg = [arg];
					arg.forEach(cell => {
						if(cell.highlighted === true) {
							cell.highlight(false);
							this.selectedCells.splice(this.selectedCells.indexOf(cell), 1);
							res = true;
						}
					});
					break;
				case 'clear':
					let prevCellState = JSON.stringify(selectedCells);
					this.clearCells({tool: arg, cells: selectedCells});
					let nextCellState = JSON.stringify(selectedCells);
					let cellsHaveChanged = prevCellState !== nextCellState;
					res = cellsHaveChanged;
					break;
				case 'value': this.toggleGroup(selectedCells, 'normal', arg); break;
				case 'candidates': this.toggleGroup(selectedCells, 'centre', arg); break;
				case 'pencilmarks': this.toggleGroup(selectedCells, 'corner', arg); break;
				case 'colour': this.toggleGroup(selectedCells, 'colour', arg); break;
				case 'pen': this.toggleGroup(selectedCells, 'pen', arg); break;
				case 'pencolor':
					let penTool = this.app.tools.pen;
					if(penTool) penTool.setStateColor(arg);
					break;
				case 'groupstart': this.inGroup = true; break;
				case 'groupend': this.inGroup = false; break;
				case 'unpause':
				case 'wait':
					break; // Used for replayLength calculation
				default:
					res = false;
					console.error('Puzzle.act: unkown action type:', type, action);
					break;
			}
			return res;
		};
		P.act = function(action) {
			try {
				action = this.parseAction(action);
				var act = this.actionToString(action);
			}
			catch (err) {
				console.error('Puzzle.act > action parse error:', err);
				console.info('  action:', action);
				return;
			}
			//console.info('Puzzle.act("%s");', act, action);
			if(action.type === 'undo') {
				if(this.execUndo()) this.logReplayAct(act);
			}
			else if(action.type === 'redo') {
				if(this.execRedo()) this.logReplayAct(act);
			}
			else {
				if(this.exec(action)) {
					this.logReplayAct(act);
					let actStr = Replay.parseActA(act)[0];
					//this.redoStack.length = 0;
					//ML: When the redoStack is filled, then any selection should not clear the redoStack.
					// Instead count the 'temporary' selections for later undo.
					if(this.redoStack.length > 0 && Puzzle.isSelection(actStr))
						this.undoSelection++;
					else {
						this.redoStack.length = 0;
						this.undoSelection = 0;
					}
					this.logUndoAct(act);
				}
			}
			this.trigger('act', act, action);
		};
		P.testUndo = function(opts = {}) {
			//console.group('Puzzle.testUndo();', this.undoStack.slice(-3));
			const undoSteps = Math.max(1, (isNaN(opts.undoSteps) ? 1 : opts.undoSteps) || 1);
			const timelessState = state => JSON.stringify(Object.assign(JSON.parse(state), {time: 0}));
			const serializeGame = game => JSON.stringify({
				state: timelessState(game.serializeState()),
				selectedCells: game.cellsToString(game.selectedCells).split(Puzzle.reRCSplit).sort().join(''),
				replayStack: game.replayStack,
				undoStack: game.undoStack,
				redoStack: game.redoStack,
				stateStackLen: game.stateStack.length,
				//stateStack: game.stateStack.map(state => timelessState(state)),
				cellsJson: this.cells.map(cell => cell.toJSON()),
				cellsSer: this.cells.map(cell => cell.serialize())
			});
			const gameStates = [];
			gameStates.push(serializeGame(this));
			var undoStackLength = this.undoStack.length;
			var redoStackLength = this.redoStack.length;
			for(var i = 0; i < undoSteps; i++) this.execUndo();
			gameStates.push(serializeGame(this));
			while(this.undoStack.length < undoStackLength) this.execRedo();
			while(this.redoStack.length < redoStackLength) this.execUndo();
			gameStates.push(serializeGame(this));
			if(gameStates[0] !== gameStates[2]) {
				console.error('testUndo FAILED!');
				for(var i = 0; i < gameStates[0].length; i++) {
					if(gameStates[0][i] !== gameStates[2][i]) {
						console.log(gameStates[0].substr(Math.max(0, i - 100), 100));
						console.log(gameStates[0].substr(Math.max(0, i - 10), 100));
						console.log(gameStates[1].substr(Math.max(0, i - 10), 100));
						console.log(gameStates[2].substr(Math.max(0, i - 10), 100));
						break;
					}
				}
				gameStates.forEach((state, idx) => {
					console.log('replayStack[%s]:', idx, JSON.parse(gameStates[idx]).replayStack.length, JSON.parse(gameStates[idx]).replayStack.slice(-14));
					console.log('  undoStack[%s]:', idx, JSON.parse(gameStates[idx]).undoStack.length, JSON.parse(gameStates[idx]).undoStack.slice(-14));
					console.log('  redoStack[%s]:', idx, JSON.parse(gameStates[idx]).redoStack.length, JSON.parse(gameStates[idx]).redoStack.slice(-14));
				});
				gameStates.forEach((state, idx) => {
					console.groupCollapsed('gameState ' + idx);
					console.log(JSON.parse(state));
					console.groupEnd('gameState ' + idx);
				});
				const cgp = JSON.parse(gameStates[0]), rgp = JSON.parse(gameStates[2]);
				Object.keys(rgp).forEach(key => {
					if(JSON.stringify(rgp[key]) !== JSON.stringify(cgp[key])) {
						console.warn(key, JSON.stringify(rgp[key]) === JSON.stringify(cgp[key]));
						console.warn(  'cgp:', JSON.stringify(cgp[key]));
						console.warn('  rgp:', JSON.stringify(rgp[key]));
						if(Array.isArray(cgp[key])) {
							cgp[key].forEach((cell, idx) => {
								if(JSON.stringify(cgp[key][idx]) !== JSON.stringify(rgp[key][idx])) {
									console.log('[%s] %s <=> %s', idx, JSON.stringify(cgp[key][idx]), JSON.stringify(rgp[key][idx]));
								}
							});
						}
					}
				});
			}
			//console.groupEnd('Puzzle.testUndo();');
			//return currentGame === redoGame;
			return gameStates[0] === gameStates[2];
		};
	// Replay
		P.replayStop = function() {
			clearTimeout(this.replayTimeoutId);
			this.replayPlaying = false;
		};
		P.replayPlay = function(replay, opts = {}) {
			//console.info('Puzzle.replayPlay(replay, opts);', replay, opts);
			//console.time('Puzzle.replayPlay');
			const replayPlayingState = this.replayPlaying;
			const handleReplayDone = () => {
				//console.timeEnd('Puzzle.replayPlay');
				this.replayPlaying = replayPlayingState;
				this.app.renderCells();
				this.trigger('replaystep');
				this.trigger('replaydone');
				if(typeof opts.onCompleted === 'function') opts.onCompleted();
			};
			return new Promise((resolve, reject) => {
					var actions = [...replay.actions],
							maxDelay = opts.maxDelay || 5000,
							speed = opts.speed || 1,
							playToTime = (opts.playToTime !== undefined) ? opts.playToTime : -1,
							playFromTime = (opts.playFromTime !== undefined) ? opts.playFromTime : 0,
							step = 0,
							playTime = 0,
							doAction = undefined,
							replayStart = Date.now();
					const nextStep = () => {
						while(step <= actions.length) {
							if(doAction !== undefined) {
								this.act(doAction);
								if((opts.testUndo !== undefined) && (this.testUndo({undoSteps: opts.testUndo}) === false)) {
									console.log('  step:', step);
									console.log('  actions[step]:', actions[step]);
									//console.log('  actions.slice(step - 5, step + 5):', actions.slice(step - 5, step + 5));
									for(var i = step - 5; i < step +5; i++) console.log('  actions[%s]:', i, actions[i]);
									return reject(`Undo failed at action[${step - 1}]: ${doAction}`);
								}
							}
							if(step >= actions.length) return resolve();
							doAction = actions[step++];
							const [type, arg, time] = Replay.parseActA(doAction);
							const stepTime = Number(time) * Puzzle.logTimeResolutionMs;
							playTime += stepTime;
							if(type === 'up') playTime -= Number(arg) * Puzzle.logTimeResolutionMs;
							if(playToTime !== -1 && playTime - stepTime > playToTime) {
								return resolve(`Exiting replay at step ${step}/${actions.length} time ${playTime} due to limit ${playToTime}`);
							}
							if(speed === -1 || (playTime - stepTime <= playFromTime)) continue;
							const delay = Math.min(maxDelay, stepTime) / speed;
							this.replayTimeoutId = setTimeout(nextStep, delay);
							this.app.check({checkConflicts: true}); // check conflicts after each replay animation step
							this.trigger('replaystep');
							return;
						}
						resolve();
					};
					this.replayStop();
					if(opts.skipRestart !== true) this.resetPuzzle();
					//console.log('actions:', actions);
					// Handle parsed empty strings
					// TODO: Better parsing should return empty array instead
					if(actions.length === 1 && actions[0] === '') return;
					this.replayPlaying = true;
					if(speed === -1) this.app.disableRendering();
					nextStep();
				})
				.finally(handleReplayDone);
		};
	// Checker
		P.hasSolution = function(puzzle = this.currentPuzzle) {
			return (puzzle !== undefined) && (puzzle.solution !== undefined);
		};
		P.clearErrors = function(action) {
			if(!this.errorsVisible) return;
			//console.info('Puzzle.clearErrors(action);', action);
			if(action === undefined || !Puzzle.isSelection(action.type)) {
				this.errorsVisible = false;
				this.cells.forEach(cell => cell.error(false));
				// Clear pencilmark conflicts
				let {svgRenderer} = this.app;
				svgRenderer.svgElem.querySelectorAll('.conflict')
					.forEach(elem => elem.classList.remove('conflict'));
			}
		};
		P.check = function(features = []) {
			//console.info('Puzzle.check("%s");', JSON.stringify(features));
			return Checker.check(this, features);
		};
		P.toP81 = function() {
			return this.cells.map(c => c.getVal() || '.').join('');
		};
	return Puzzle;
})();

const PuzzleFeatures = (() => {
	const featureCheckMinMax = ({width: w, height: h}, {min: i, max: a}) => (
		(i?(w?w>=i:true)&&(h?h>=i:true):true)&&(a?(w?w<=a:true)&&(h?h<=a:true):true)
	);
	const featureCheckSize = (part, sizes) => (
		sizes.length === 1 && (sizes[0].min || sizes[0].max)
			?	featureCheckMinMax(part, sizes[0])
			: sizes.includes(part.height) && sizes.includes(part.width)
	);
	const cellsMatch = (cellsA, cellsB) => {
		var matchA = true;
		for(var a = 0; a < cellsA.length; a++) {
			var rcA = [Math.floor(cellsA[a][0]), Math.floor(cellsA[a][1])];
			var matchB = false;
			for(var b = 0; b < cellsB.length; b++) {
				var rcB = [Math.floor(cellsB[b][0]), Math.floor(cellsB[b][1])];
				if(isSameRC(rcA, rcB)) {
					matchB = true;
					break;
				}
			}
			matchA = matchA && matchB;
		}
		return matchA;
	};
	const cageContainsLine = ({cells = []}, {wayPoints = []}) => {
		var matchA = true;
		for(var a = 0; a < wayPoints.length; a++) {
			var rcA = [Math.floor(wayPoints[a][0]), Math.floor(wayPoints[a][1])];
			var matchB = false;
			for(var b = 0; b < cells.length; b++) {
				var rcB = [Math.floor(cells[b][0]), Math.floor(cells[b][1])];
				if(isSameRC(rcA, rcB)) {
					matchB = true;
					break;
				}
			}
			matchA = matchA && matchB;
		}
		return matchA;
	};
	const isOnEdge = ([r, c]) => ((Math.abs(r % 1) === 0) || (Math.abs(c % 1) === 0)) && (Math.abs(r % 1) !== Math.abs(c % 1));
	const isInCell = (rc) => Array.isArray(rc) && (Math.abs(rc[0] % 1) !== 0) && (Math.abs(rc[1] % 1) !== 0);
	const isLineInCell = (points = []) => {
		for(let i = 0, len = points.length; i < len; i++) if(!isInCell(points[i])) return false;
		return true;
	};
	const featureCheck = (part, checks) => {
		var res = true;
		Object.keys(checks).forEach(key => {
			const check = Array.isArray(checks[key]) ? checks[key] : [checks[key]];
			switch(key) {
				case 'size': res = res && featureCheckSize(part, check); break;
				case 'sizeMin': res = res && (part.width >= check[0] && part.height >= check[0]); break;
				case 'sizeMax': res = res && (part.width <= check[0] && part.height <= check[0]); break;
				case 'center': res = res && ((typeof check[0] === 'number' ? [check] : check).find(center => isSameRC(part.center, center)) !== undefined); break;
				case 'centerRounded': res = res && ((typeof check[0] === 'number' ? [check] : check).find(center => isSameRC(roundCenter(part.center), roundCenter(center))) !== undefined); break;
				case 'isOnEdge': res = res && (isOnEdge(part.center) === check[0]); break;
				case 'isInCell': res = res && (isInCell(part.center) === check[0]); break;
				case 'isLineInCell': res = res && (isLineInCell(part.wayPoints) === check[0]); break;
				case 'wayPointsCount': res = res && (part.wayPoints || []).length === check[0]; break;
				case 'wayPointsCountMin': res = res && (part.wayPoints || []).length >= check[0]; break;
				case 'wayPointsCountMax': res = res && (part.wayPoints || []).length <= check[0]; break;
				case 'wayPointsLenMin': res = res && (pathLength(part.wayPoints) >= check[0]); break;
				case 'wayPointsLenMax': res = res && (pathLength(part.wayPoints) <= check[0]); break;
				case 'textMatch': res = res && (String(part.text || '').match(check[0]) !== null); break;
				case 'cellsMin': res = res && (part.cells || []).length >= check[0]; break;
				case 'minThickness': res = res && part.thickness >= check[0]; break;
				case 'hasFeature': res = res && (part.feature !== undefined) === check[0]; break;
				case 'colorNoAlpha': res = res && (part.color.length === 5
						? part.color.slice(0, 4) === check[0].slice(0, 4)
						: part.color.slice(0, 7) === check[0].slice(0, 7)
					);
					break;
				case 'color':
				case 'borderColor':
					res = res && (part[key] !== undefined && check.includes(part[key])
						|| check.includes(String(part[key]).toUpperCase())
						|| check.includes(String(part[key]).toLowerCase()));
					break;
				default: res = res && check.includes(part[key]); break;
			}
		});
		return res;
	};
	const partChecker = checks => part => featureCheck(part, checks);
	const extractFeature = (type, parts, features) => {
		//console.info('extractFeature("%s", parts, features);', type);
		return parts
			//.filter(part => part.feature === undefined && featureCheck(part, features))
			.filter(part => featureCheck(part, features))
			.map(part => (part.feature = {type, part}, part));
	};
	const thermos = ({lines = [], overlays = [], underlays = []}) => {
		//console.info('PuzzleFeatures.thermos(puzzle);');
		//const lineFeatures = {color: ['#CFCFCF', '#FFFFFF'], wayPointsCountMin: 2, minThickness: 4};
		//const bulbFeatures = {size: [0.65, 0.7], borderColor: ['#CFCFCF', '#FFFFFF'], center: []};
		const lineFeatures = {wayPointsCountMin: 2, minThickness: 4};
		const bulbFeatures = {size: [0.65, 0.7]};
		let res = [];
		/*
		lines.forEach(line => {
			if(featureCheck(line, lineFeatures)) {
				bulbFeatures.center = [roundCenter(line.wayPoints[0]), roundCenter(line.wayPoints[line.wayPoints.length - 1])];
				[].concat(overlays, underlays).forEach(bulb => {
					if(featureCheck(bulb, bulbFeatures)) {
						// Skip feature assign to correct rendering
						//res.push(line.feature = bulb.feature = {type: 'thermo', line, bulb});
						res.push({type: 'thermo', line, bulb});
					}
				});
			}
		});
		*/
		let segs = {};
		lines
			.filter(line => featureCheck(line, lineFeatures))
			.forEach(line => line.wayPoints.forEach((p, idx, arr) => {
				if(idx > 0) {
					let rc1 = toRC(arr[idx - 1]), rc2 = toRC(p);
					let seg = [];
					stepPoints(rc1[0], rc1[1], rc2[0], rc2[1], (r, c) => {
						seg.push([r, c]);
						if(seg.length >= 2) {
							let points = [...seg], key = JSON.stringify(points);
							if(segs[key] === undefined) segs[key] = {line, points: [points[1], points[0]]};
							seg.shift();
						}
					});
				}
			}));
		segs = Object.values(segs);
		let bulbs = [].concat(overlays, underlays)
			.filter(bulb => featureCheck(bulb, bulbFeatures))
			.filter(bulb => segs.find(({points: [p1, p2]}) => isSameRC(p1, toRC(bulb.center)) || isSameRC(p2, toRC(bulb.center))) !== undefined);
		if(bulbs.length === 0) return [];
		const findThermos = (segs, sources) => {
			if(segs.length === 0 || sources.length === 0) return;
			let source = sources.shift();
			segs
				.filter(({points: [p1, p2]}) => isSameRC(p1, source) || isSameRC(p2, source))
				.forEach(seg => {
					if(isSameRC(seg.points[1], source)) seg.points = [seg.points[1], seg.points[0]];
					sources.push(seg.points[1]);
					segs.splice(segs.indexOf(seg), 1);
				});
			findThermos(segs, sources);
		};
		findThermos([...segs], bulbs.map(({center}) => toRC(center)));
		
		res = segs;
		return res;
	};
	const arrowSums = ({arrows = [], underlays = [], overlays = []}) => {
		const arrowsumColors = ['#000000', '#CFCFCF', '#a1a1a1'];
		const arrowFeatures = {color: arrowsumColors, thickness: [2, 3, 5], headLength: 0.3, wayPointsCountMin: 2,};
		const bulbFeatures = {sizeMin: 0.60, sizeMax: 2.90, borderColor: arrowsumColors, rounded: true, borderSize: [3,4,5,6,7,8,9,10]};
		const res = [];
		const bulbs = [].concat(underlays, overlays);
		const findArrowBulb = arrow => {
			bulbFeatures.center = [roundCenter(arrow.wayPoints[0]), roundCenter(arrow.wayPoints[arrow.wayPoints.length - 1])];
			for(const bulb of [].concat(underlays, overlays)) {
				const w = Math.floor(bulb.width) + 1, h = Math.floor(bulb.height) + 1;
				for(let x = 0; x < w; x++) for(let y = 0; y < h; y++) {
					let center = [bulb.center[0] - (h - 1) * 0.5 + y, bulb.center[1] - (w - 1) * 0.5 + x];
					if(featureCheck(Object.assign({}, bulb, {center}), bulbFeatures)) {
						res.push({arrow, bulb});
						arrow.feature = bulb.feature = {type: 'arrowsum', part: res[res.length - 1]};
						return;
					}
				}
			}
		};
		for(const arrow of arrows) {
			if(featureCheck(arrow, arrowFeatures)) findArrowBulb(arrow);
		}
		return res;
	};
	const kropkis = ({overlays = []}) => extractFeature('kropki', overlays,  {
		size: [0.25, 0.3, 0.35],
		rounded: true,
		borderColor: '#000000',
		backgroundColor: ['#FFFFFF', '#000000'],
		isOnEdge: true,
	});
	const xvs = ({overlays = []}) => extractFeature('xv', overlays, {
		size: [0.25],
		text: ['X', 'V', 'XV'],
		isOnEdge: true,
	});
	const littleKiller = ({overlays = [], arrows = [], cells = []}) => {
		const arrowFeatures = {thickness: [2, 3, 4, 5], headLength: 0.3, color: ['#000000', '#CFCFCF'], wayPointsCount: 2, wayPointsLenMax: 1};
		const numFeatures = {size: [0.25, 0.65], fontSize: [20, 24, 28], textMatch: /[0-9]+/};
		const rows = cells.length, cols = (cells[0] || []).length;
		const isOutside = p => (p[0] < 0) || (p[0] > rows) || (p[1] < 0) || (p[1] > cols);
		const res = [];
		arrows.forEach(arrow => {
			if(featureCheck(arrow, arrowFeatures) && isOutside(arrow.wayPoints[0])) {
				numFeatures.centerRounded = arrow.wayPoints[0];
				const dx = arrow.wayPoints[1][1] - arrow.wayPoints[0][1]; // cols
				const dy = arrow.wayPoints[1][0] - arrow.wayPoints[0][0]; // rows
				overlays.find(number => {
					if(featureCheck(number, numFeatures)) {
						res.push(arrow.feature = number.feature = {type: 'littlekiller', arrow, number, dir: `${dx > 0 ? 'rt' : 'lt'}${dy > 0 ? 'dn' : 'up'}`});
						return true;
					}
				});
			}
		});
		return res;
	};
	const inequality = ({lines = [], overlays = [], cells = []}) => {
		const lineFeatures = {thickness: [1], color: '#000000', wayPointsCount: 3, wayPointsLenMin: 1, wayPointsLenMax: 2};
		const overlayFeatures = {textMatch: /[<>^v]/, width: 0.25, height: 0.25, isOnEdge: true};
		const rows = cells.length, cols = (cells[0] || []).length;
		const isInside = p => (p[0] >= 0) || (p[0] < rows) || (p[1] >= 0) || (p[1] < cols);
		const res = [];
		lines.forEach(line => {
			if(!featureCheck(line, lineFeatures)) return;
			var ps = line.wayPoints;
			const angle = calcAngle(ps[1], ps[0], ps[1], ps[2]);
			if(true
				&& (angle > 35 && angle < 55)
				&& (isInside(ps[0]) && isInside(ps[1]) && isInside(ps[2]))
				&& isSameRC(toRC(ps[0]), toRC(ps[2]))
				&& !isSameRC(toRC(ps[0]), toRC(ps[1]))
			) {
				const feature = {type: 'inequality', line, fromCell: toRC(ps[0]), toCell: toRC(ps[1])};
				res.push(feature);
				line.feature = feature;
			}
		});
		overlays.forEach(part => {
			if(!featureCheck(part, overlayFeatures)) return;
				const feature = {type: 'inequality', part};
				res.push(feature);
				part.feature = feature;
		});
		return res;
	};
	const sandwichCages = ({cages = [], lines = []}) => {
		//console.info('PuzzleFeatures.sandwichCages(puzzle);');
		const cageFeatures = {cellsMin: 2};
		const lineFeatures = {thickness: 1, color: '#D23BE7'};
		const res = [];
		cages.forEach(cage => {
			if(featureCheck(cage, cageFeatures)) {
				const line = lines.find(line => featureCheck(line, lineFeatures) && cageContainsLine(cage, line));
				if(line !== undefined) {
					const feature = {type: 'sandwichcage', cage, line};
					res.push(feature);
					cage.feature = feature;
					line.feature = feature;
				}
			}
		});
		return res;
	};
	const palindrome = ({lines = []}) => {
		const res = [];
		const lineFeatures = {hasFeature: false, color: '#CFCFCF', wayPointsCountMin: 2, thickness: [11, 12]};
		lines.forEach(line => {
			if(featureCheck(line, lineFeatures)) {
				res.push(line.feature = {type: 'palindrome', line: line});
			}
		});
		return res;
	};
	const sudokuX = (puz) => {
		const {regions = [], lines = []} = puz;
		const res = [];
		const lineFeatures = {color: '#34BBE6', wayPointsCount: 2, thickness: [1, 2]};
		let [minRC, maxRC] = Puzzle.getMinMaxRCFromRegions(puz);
		const validPointsPos = [
			`[[${minRC[0]},${maxRC[1] + 1}],[${maxRC[0] + 1},${minRC[1]}]]`,
			`[[${maxRC[0] + 1},${minRC[1]}],[${minRC[0]},${maxRC[1] + 1}]]`,
		];
		const validPointsNeg = [
			`[[${minRC[0]},${minRC[1]}],[${maxRC[0] + 1},${maxRC[1] + 1}]]`,
			`[[${maxRC[0] + 1},${maxRC[1] + 1}],[${minRC[0]},${minRC[1]}]]`,
		];
		lines.forEach(line => {
			if(featureCheck(line, lineFeatures)) {
				if(validPointsPos.includes(JSON.stringify(line.wayPoints))) {
					res.push(line.feature = {type: 'sudokux+', line: line});
				}
				else if(validPointsNeg.includes(JSON.stringify(line.wayPoints))) {
					res.push(line.feature = {type: 'sudokux-', line: line});
				}
			}
		});
		return res;
	};
	const windoku = ({underlays = []}) => {
		const res = [];
		const matchCenter = ([r, c]) => ({center}) => center[0] === r && center[1] === c;
		const windokuFeatures = {backgroundColor: '#CFCFCF', width: 3, height: 3};
		const windokuCenters = [[2.5, 2.5], [2.5, 6.5], [6.5, 2.5], [6.5, 6.5]];
		let windows = underlays.filter(underlay => featureCheck(underlay, windokuFeatures));
		if(windows.length === 4
			&& windokuCenters.filter(rc => windows.find(matchCenter(rc))).length === 4) {
			windows.forEach(underlay => res.push(underlay.feature = {type: 'windoku', underlay: underlay}));
		}
		return res;
	};
	const cellCosmetic = (puzzle) => {
		const {underlays = [], overlays = [], lines = []} = puzzle;
		const res = [];
		const cellCosmeticFeatures = {hasFeature: false, isInCell: true, sizeMax: 1};
		[].concat(underlays, overlays)
			.filter(cosmetic => featureCheck(cosmetic, cellCosmeticFeatures))
			.forEach(cosmetic => {
				let filterFeatures = {minThickness: 4};
				if(cosmetic.backgroundColor) filterFeatures.colorNoAlpha = cosmetic.backgroundColor;
				let probableThermo = cosmetic.rounded && lines
					.filter(partChecker(filterFeatures))
					.some(line => (line.wayPoints || []).some(wp => isSameRC(wp, cosmetic.center)));
				if(!probableThermo) res.push({type: 'cellcosmetic', rc: toRC(cosmetic.center), cosmetic: cosmetic});
			});
		return res;
	};
	const thermoCosmetic = ({underlays = [], overlays = [], lines = []}) => {
		const LineFeatures = {wayPointsCountMin: 2, minThickness: 4, isLineInCell: true};
		const BulbFeatures = {size: {min: 0.6, max: 0.85}};
		const cells = {};
		const rcToStr = rc => rc && `r${rc[0]}c${rc[1]}` || 'n/a';
		const pToStr = p => p && rcToStr(toRC(p)) || 'n/a';
		const getCell = rc => cells[pToStr(rc)];
		const initCells = (cells) => {
			// Clear cells
			Object.keys(cells).forEach(key => delete cells[key]);
			const addNext = (rc, next) => {
				const id = pToStr(rc);
				const c = cells[id] || (cells[id] = {rc, bulbDist: undefined, tipDist: undefined, next: []});
				if(!c.next.includes(next)) c.next.push(next);
			};
			const addSeg = (rc1, rc2) => (addNext(rc1, rc2), addNext(rc2, rc1));
			// Init cells
			let segs = {};
			const processBulb = (bulbRC, dist = 0) => {
				const c = getCell(bulbRC), tips = [];
				if(c.bulbDist === undefined || c.bulbDist > dist) {
					c.bulbDist = dist;
					tips.length = 0;
					for(let n = 0, nlen = c.next.length; n < nlen; n++) {
						const res = processBulb(c.next[n], dist + 1);
						if(res !== undefined) tips.push(res);
					}
					c.tipDist = (tips.length === 0) ? 0 : Math.max(...tips) + 1;
				}
				return c.tipDist;
			};
			// Init segs
			lines
				.filter(line => featureCheck(line, LineFeatures))
				.forEach(line => line.wayPoints.forEach((p, idx, arr) => {
					if(idx > 0) {
						let rc1 = toRC(arr[idx - 1]), rc2 = toRC(p);
						let seg = [];
						stepPoints(rc1[0], rc1[1], rc2[0], rc2[1], (r, c) => {
							seg.push([r, c]);
							if(seg.length >= 2) {
								let points = [...seg], key = JSON.stringify(points);
								if(segs[key] === undefined) segs[key] = [toRC(points[1]), toRC(points[0])];
								seg.shift();
							}
						});
					}
				}));
			segs = Object.values(segs);
			segs.forEach(([rc1, rc2]) => addSeg(rc1, rc2));
			// Init bulbs
			const bulbs = 
			[].concat(overlays, underlays)
				.filter(bulb => Array.isArray(bulb.center) && featureCheck(bulb, BulbFeatures))
				.map(({center}) => toRC(center))
				.filter(rc => segs.some(([rc1, rc2]) => isSameRC(rc, rc1) || isSameRC(rc, rc2)));
			bulbs.forEach(rc => processBulb(rc));
			if(bulbs.length === 0) Object.keys(cells).forEach(key => delete cells[key]); // No thermo bulbs found
		};
		initCells(cells);
		return Object.values(cells).map(c => ({
			type: 'thermocosmetic', rc: c.rc, cosmetic: {thermo: `${c.bulbDist}-${c.tipDist}`}
		}));
	};
	const arrowsumCosmetic = (puzzle) => {
		let res = [];
		let arrowsums = (puzzle.arrows || [])
			.filter(a => (a.feature || {}).type === 'arrowsum')
			.map(a => (a.feature || {}).part);
		arrowsums.forEach(({arrow: {wayPoints = []}, bulb: {center = []}}) => {
			let bulbRc = toRC(center), arrowRcs = getCellsAlongPoints(wayPoints).filter(rc => !isSameRC(rc, bulbRc));
			res.push(
				{type: 'arrowsumcosmetic', rc: bulbRc, cosmetic: `bulb-${arrowRcs.length}`},
				...arrowRcs.map(rc => ({type: 'arrowsumcosmetic', rc, cosmetic: `arrow-${arrowRcs.length}`}))
			);
		});
		return res;
	};
	const cageCosmetic = ({cages = []}) => {
		let res = [];
		for(const {value, cells = []} of cages) {
			for(const cell of cells) {
				res.push({type: 'cagecosmetic', rc: toRC(cell), cosmetic: `cage-${cells.length}-${value !== undefined ? value : ''}`});
			}
		}
		return res;
	};
	const cloneCosmetic = (puzzle) => {
		// TODO: Handle other sizes besies 9x9
		// TODO: Handle several distinct clones
		// TODO: Handle clones with non-unique digits
		const colCount = 9;
		const filterClonePart = ({width, height, backgroundColor}) => width === 1 && height === 1 && backgroundColor === '#0003';
		const partToClone = part => {
			let idx = Math.floor(part.center[0]) * colCount + Math.floor(part.center[1]);
			return [solution[idx], idx, part];
		};
		const getCells = (val, cells) => cells.filter(([v]) => v === val).sort((a, b) => a[1] - b[1]);
		const makeCloneId = (val, cells) => JSON.stringify(cells.map(([v, idx], i, arr) => idx - arr[0][1]));
		const {underlays = []} = puzzle,
					{solution = ''} = Framework.app.extractPuzzleMeta(puzzle);
		let res = [],
				cloneParts = underlays.filter(filterClonePart),
				cloneCells = cloneParts.map(partToClone),
				cloneVals = [...new Set(cloneCells.map(([val]) => val))],
				clones = cloneVals.map(val => makeCloneId(val, getCells(val, cloneCells))),
				clonesValid = clones.length > 0 && !clones.some((cur, idx, arr) => cur !== arr[0]);
		if(clonesValid) {
			for(let [val, idx, part] of cloneVals.flatMap(val => getCells(val, cloneCells))) {
				res.push({type: 'cellcosmetic', rc: toRC(part.center), cosmetic: `clone-${val}`});
			}
		}
		return res;
	};
	const cosmetic = puzzle => [cellCosmetic, thermoCosmetic, arrowsumCosmetic, cageCosmetic, cloneCosmetic].flatMap(fn => fn(puzzle));

	return {thermos, arrowSums, kropkis, xvs, littleKiller, inequality, sandwichCages, palindrome, sudokuX, windoku, cosmetic};
})();

const App = (() => {
	function App(opts = {}) {
		let appString = `SudokuPad.app (v${App.VERSION} &copy;2020-2023 by <a href="https://svencodes.com">Sven</a>)`;
		console.info('Starting app:', sanitizeHTML(appString));
		document.querySelectorAll('#menu-app-version').forEach(elem => elem.innerHTML = appString);
		PortableEvents.mixin(this);
		bindHandlers(this);
		this.handlersAttached = false;
		this.interactionHandlersAttached = false;
		this.isVisible = true;
		this.cellRendering = true;
		this.currentInput = 'none';
		this.currentInputTimeoutId = undefined;
		this.doubleTaps = {};
		this.move = 'none';
		this.paintState = 'none';
		this.paintStateVal = false;
		this.selecting = undefined;
		// <ML-SMARTCORNERMARKS>
			this.startSelectedCellCount = undefined;
		// </ML-SMARTCORNERMARKS>
		this.keys = {};
		this.tools = {};
		this.tool = undefined;
		this.timer = new Timer({selector: '.timer', tickInterval: 250});
		this.timer.on('unpause', this.handleTimerUnpause);
		this.timer.createUI(document.querySelector('.game-clock'));
		this.svgRenderer = new SvgRenderer();
		this.grid = new Grid({app: this, parent: document.getElementById('board'), rows: 9, cols: 9});
		this.puzzle = new Puzzle({app: this});
		this.puzzle.on('start', this.handlePuzzleStart);
		this.puzzle.on('loaded', this.handledPuzzleOnLoaded);
		this.disableYoutubeButton = opts.disableYoutubeButton === true;
		this.initKeyboardLayoutMap();
		Framework.upgradeLegacyData(['tool']);
	}
	var P = Object.assign(App.prototype, {constructor: App});
	App.VERSION = '0.589.0';
	App.colorHexToRGB = (hex) => {
		hex = parseInt(hex.replace(/^#/, ''), 16);
		return {r: hex>>16&255, g: hex>>8&255, b: hex>>0&255};
	};
	App.colorHexToRGBA = (hex, alpha) => {
		hex = parseInt(hex.replace(/^#/, ''), 16);
		return `rgba(${hex>>16&255},${hex>>8&255},${hex>>0&255},${alpha})`;
	};
	App.opaqueColors = ['#000000', '#CFCFCF', '#FFFFFF', 'none'];
	App.CurrentInputTimeoutMs = 500;
	App.LongInputTimeout = 500;
	App.DoubleInputTimeout = 500;
	App.DoubleInputDistance = 6;
	App.MinCellCountDelayedDeselect = 4;
	App.tempSettings = ['hidecolours'];
	App.toolHotkeys = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM'];
	App.SettingsDefaults = {
		selection: 'cage',
		largedigits: false,
		multicolour: true,
		conflictchecker: 'on',
		autocheck: true,
		digitoutlines: false,
		hidesvenpeek: false,
		hidesupportlinks: false,
		hidesolved: true,
		repeatundodelay: 700,
		repeatundointerval: 100,
		checkpencilmarks: true,
		showplayinsudokupad: true,
	};
	App.reMetaTags = /^(.+?):\s*([\s\S]+)/m;
	// App
		P.init = function() {
			Framework.initSettings(App.SettingsDefaults);
			let savedTool = Framework.getData('tool');
			let toolNames = this.getToolNames();
			this.changeTool(savedTool);
			this.attachHandlers();
			const RepeatUndoDelay = Framework.getSetting('repeatundodelay');
			const RepeatUndoInterval = Framework.getSetting('repeatundointerval');
			P.undo = autoRepeatFunc(P.undoOnce, RepeatUndoDelay, RepeatUndoInterval);
			P.redo = autoRepeatFunc(P.redoOnce, RepeatUndoDelay, RepeatUndoInterval);
		};
		P.handleTimerUnpause = function(arg) {
			const {puzzle: {replayStack: rs}} = this;
			// If last action is already unpause, skip!
			if(rs.length > 0 && rs[rs.length - 1].startsWith('up:')) return;
			let action = {type: 'unpause', arg: Math.round(arg.duration / Puzzle.logTimeResolutionMs).toString()};
			let act = this.puzzle.actionToString(action);
			this.puzzle.logReplayAct(act, arg.duration);
		};
		P.initKeyboardLayoutMap = function() {
			return Promise.resolve(
				(typeof navigator !== 'undefined' && navigator
				&& typeof navigator.keyboard !== 'undefined' && navigator.keyboard
				&& typeof navigator.keyboard.getLayoutMap === 'function')
					? Promise.resolve(navigator.keyboard.getLayoutMap()).then(layoutMap => [...layoutMap.entries()].reduce((acc, [code, key]) => Object.assign(acc, {[code]: key}), {}))
					: {}
				)
				.then(layoutMap => this.keyboardLayoutMap = layoutMap);
		};
		App.rePuzzleTitle = ((v = App.VERSION.replaceAll('.', '\\.')) => new RegExp(`(^SudokuPad v${v} - by | \\(Sven's SudokuPad v${v}\\)$)`))();
		App.createDocTitle = (puzzle = {}) => `${puzzle.title ? puzzle.title : 'Untitled Puzzle'}${puzzle.author ? ` by ${puzzle.author}` : ''} (Sven's SudokuPad v${App.VERSION})`;
		App.updateDocTitle = puzzle => App.rePuzzleTitle.test(document.title) && (document.title = App.createDocTitle(puzzle)) || false;
	// Tools
		P.getToolNames = function() {
			return Object.keys(this.tools).filter(tool => this.tools[tool].isTool);
		};
		P.hasTool = function(name) {
			return this.getToolNames().includes(name);
		};
		P.toolExecHandler = function(handlerName, args) {
			this.trigger(`tool-${handlerName}`, args);
			let tool = this.tools[this.tool];
			if(!(tool && typeof tool[handlerName] === 'function')) return false;
			return tool[handlerName].call(tool, args);
		};
		P.addTool = function(tool = {}) {
			//console.info('App.addTool("%s");', tool.name,  JSON.stringify(tool));
			const {name, buttonLabel} = tool;
			if(this.hasTool(name)) return;// console.warn('App.addTool > tool "%s" already exists.', name);
			this.tools[name] = tool;
			if(typeof tool.init === 'function') tool.init({app: this});
		};
		P.removeTool = function(name) {
			//console.info('App.removeTool("%s");', name);
			if(this.tool === name) this.changeToolNext();
			let tool = this.tools[name];
			if(tool !== undefined) {
				delete this.tools[name];
				if(typeof tool.done === 'function') tool.done({app: this});
			}
		};
		P.changeTool = function(tool, tempChange) {
			//console.info('App.changeTool(%s, %s);', JSON.stringify(tool), tempChange === true, JSON.stringify(this.tool), JSON.stringify(this.prevTool));
			if(!this.hasTool(tool)) tool = undefined;
			if(tempChange && this.prevTool === undefined) this.prevTool = this.tool;
			if(tool === undefined && this.prevTool !== undefined) {
				tool = this.prevTool;
				this.prevTool = undefined;
			}
			if(tool === undefined && this.tool === undefined) tool = this.getToolNames()[0];
			if(tool === undefined) return;
			if(tempChange && (this.prevTool === tool)) return;
			if(!tempChange) this.prevTool = undefined;
			[...document.querySelectorAll(`.controls-tool button.selected`)].forEach(btn => btn.classList.remove('selected'));
			[...document.querySelectorAll(`.controls-tool button[data-control="${tool}"]`)].forEach(elem => elem.classList.add('selected'));
			[...document.querySelectorAll('.controls-main')].forEach(elem => {
				elem.className = elem.className.replace(/\btool-[^\s]+\b/g, '');
				elem.classList.add(`tool-${tool}`);
			});
			this.toolExecHandler('handleToolExit');
			this.tool = tool;
			this.toolExecHandler('handleToolEnter');
			this.toolExecHandler('handleToolUpdate');
			if(!tempChange) Framework.setData('tool', this.tool);
		};
		P.changeToolPrev = function() {
			let toolNames = this.getToolNames(),
					toolIndex = toolNames.indexOf(this.prevTool || this.tool),
					nextToolIndex = (toolIndex + (toolNames.length - 1)) % toolNames.length;
			return this.changeTool(toolNames[nextToolIndex]);
		};
		P.changeToolNext = function() {
			let toolNames = this.getToolNames(),
					toolIndex = toolNames.indexOf(this.prevTool || this.tool),
					nextToolIndex = (toolIndex + 1) % toolNames.length;
			return this.changeTool(toolNames[nextToolIndex]);
		};
		P.isKey = function(key, event) {
			//console.info('App.isKey(key, event);', key, event.type, event.code, event.key);
			if(key === undefined) return false;
			if(typeof key === 'function') return key(event, this);
			if(key instanceof RegExp) return key.test(event.code) || key.test(event.key);
			if(event.code === key) return true;
			if(event.key === key) return true;
			return false;
		};
		P.toolTempKey = function(event) {
			return Object.values(this.tools).find(({name, tempKey}) => this.isKey(tempKey, event));
		};
	// Puzzle
		P.handlePuzzleStart = function() {
			if(!this.puzzle.isCompleted()) this.timer.start();
		};
		P.clearPuzzle = function() { return this.puzzle.clearPuzzle(); };
		P.restartPuzzle = function(keepTime = false) {
			const {tools, puzzle, puzzle: {cells}} = this;
			const currentDuration = Date.now() - this.timer.startTime;
			const filledCells = cells.filter(cell => puzzle.findHighestCellProp([cell]));
			if(puzzle.replayStack.length > 0) {
				this.act({type: 'groupstart'});
				puzzle.select(filledCells);
				Object.keys(tools).forEach(tool => this.act({type: 'clear', arg: tool}));
				puzzle.deselect(puzzle.selectedCells);
				// Restore all given pencilmarks
				cells.forEach(cell => {
					const givenCornermarks = cell.givenCornermarks || [];
					const givenCentremarks = cell.givenCentremarks || [];
					if(0 === (givenCornermarks.length + givenCentremarks.length)) return;
					this.act({type: 'select', arg: [cell]});
					givenCornermarks.forEach(mark => this.act({type: 'pencilmarks', arg: mark}));
					givenCentremarks.forEach(mark => this.act({type: 'candidates', arg: mark}));
					this.act({type: 'deselect'});
				});
				this.act({type: 'groupend'});
				this.preRestartSavedProgress = this.puzzle.getProgress();
			}
			this.puzzle.restartPuzzle();
			if(keepTime) this.insertWait(currentDuration);
			this.puzzle.saveProgress(true);
			this.trigger('restarted');
		};
		P.loadPuzzle = function(puzzle) {
			return Promise.resolve()
				.then(() => this.puzzle.loadPuzzle(puzzle))
				.then(() => this.resize());
		};
		P.loadCTCPuzzle = function(ctcPuzzle) {
			return this.puzzle.loadCTCPuzzle(ctcPuzzle);
		};
		P.loadRemoteCTCPuzzle = function(puzzleId) {
			return this.puzzle.loadRemoteCTCPuzzle(puzzleId)
				.then(() => this.resize());
		};
		P.showOpenExternalLinkDialog = function(title, url) {
			Framework.closeDialog();
			Framework.showDialog({
				parts: [
					{tag: 'text', content: title},
					{tag: 'options', options: [{content: 'Open Link', title: url}, 'Cancel']},
				],
				onButton: btn => btn === 'Open Link' ? window.open(url, '_blank') : null,
				centerOverBoard: true
			});
		}
		P.showYoutubeButton = function(puzzle) {
			//console.info('showYoutubeButton(puzzle);', puzzle);
			document.querySelectorAll('#appmenu nav.mdc-list a.menu-link-video').forEach(elem => elem.remove());
			if(this.disableYoutubeButton) return;
			if((puzzle.videos || []).length > 0) {
				const handleOpenVideo = ({id, title}) => () => this.showOpenExternalLinkDialog(
					`Open YouTube video:\n"${title}"`,
					`https://www.youtube.com/watch?v=${id}`
				);
				(puzzle.videos || []).slice(0, 3).forEach(video => {
					let title = `Featured in video: "${video.title}"`;
					let ytLink = Framework.createElem({
						tag: 'a', class: 'mdc-list-item menu-link-video', href: '#', 'data-control': 'video',
						title,
						handler: handleOpenVideo(video),
						children: [
							{class: 'icon', style: 'color:#f00', innerHTML: Framework.icons.youtube},
							{tag: 'span', class: 'mdc-list-item-text', content: title}
						],
						parent: '#appmenuitems'
					});
				});
			}
		};
		P.openYoutubeVideo = function() {
			let videoBtn = document.querySelector('button[data-videoid]');
			if(!videoBtn) return;
			this.showOpenExternalLinkDialog(
				`Open YouTube video:\n"${(videoBtn.title.match(/.*\"(.+)\".*/) || [])[1]}"`,
				`https://www.youtube.com/watch?v=${videoBtn.dataset['videoid']}`
			);
		};
		P.extractPuzzleMeta = function(puzzle = {}) {
			const {reMetaTags} = App;
			const metadata = {};
			(puzzle.cages || []).forEach(cage => {
				if((cage.cells || []).length === 0) {
					let [_, metaName, metaVal] = (String(cage.value || '').match(reMetaTags) || []);
					if(metaName && metaVal) {
						if(metaName === 'rules') {
							metadata.rules = metadata.rules || [];
							metadata.rules.push(sanitizeHTML(metaVal));
						}
						else {
							metadata[metaName] = metaVal;
						}
					}
					return;
				}
			});
			Object.assign(metadata, puzzle.metaData, puzzle.metadata);
			if(typeof metadata.solution === 'number') metadata.solution = String(metadata.solution);
			return metadata;
		};
		P.showMetaInfoUI = function(puzzle) {
			let infoElem = document.querySelector('.controls-info');
			let titleElem = document.querySelector('.puzzle-title');
			let authorElem = document.querySelector('.puzzle-author');
			let rulesElem = document.querySelector('.puzzle-rules');
			if(infoElem === null) return;
			infoElem.style.display = 'none';
			titleElem.textContent = titleElem.title = '';
			authorElem.textContent = '';
			rulesElem.textContent = '';
			if(puzzle.title) {
				titleElem.textContent = titleElem.title = puzzle.title;
				infoElem.style.display = 'block';
			}
			if(puzzle.author) {
				authorElem.textContent = puzzle.author;
				authorElem.innerHTML = `&nbsp;by ${authorElem.innerHTML}`;
				infoElem.style.display = 'block';
			}
			if(puzzle.rules && puzzle.rules.length > 0) {
				rulesElem.innerHTML = this.puzzle.getRules(true, puzzle);
				infoElem.style.display = 'block';
				rulesElem.style.display = 'block';
			}
			App.updateDocTitle(puzzle);
			this.handleRulesScroll = SudokuPadUtilities.attachScrollHandler(rulesElem, this.handleRulesScroll);
			addDownEventHandler(rulesElem, SudokuPadUtilities.cancelEventHandler);
			function handleRulesCopy(event) {
				navigator.clipboard.writeText(`${titleElem.textContent}\n${authorElem.textContent.slice(1)}\n${rulesElem.textContent}`);
			}
			addDownEventHandler(infoElem.querySelector('.rules-copy'), handleRulesCopy);
		};
		P.initMetadata = function(sourcePuzzle, convertedPuzzle) {
			const reSudokueMakerId = /^sxsm_/,
						{rows, cols} = this.puzzle,
						metadata = convertedPuzzle.metadata = this.extractPuzzleMeta(sourcePuzzle);
			for(const key of 'title,author,rules,solution'.split(',')) {
				if(metadata[key]) convertedPuzzle[key] = metadata[key];
			}
			if(convertedPuzzle.solution) {
				if(convertedPuzzle.solution.length > (rows * cols) &&
					convertedPuzzle.solution.trim().length === (rows * cols)) {
					convertedPuzzle.solution = convertedPuzzle.solution.trim();
					console.warn('Solution seems to contain extra whitespace and was trimmed to length', convertedPuzzle.solution.length);
				}
			}
			if(metadata.source === undefined && reSudokueMakerId.test(sourcePuzzle.id)) {
				metadata.source = 'Sudoku Maker pre-version';
			}
		};
		P.convertPuzzle = function(puzzle) {
			//console.info('App.convertPuzzle(puzzle);', puzzle);
			const {normalizeRules, hasAntiKnight, hasAntiKing, hasKillerCage, hasXV} = RulesParser;
			this.sourcePuzzle = JSON.parse(JSON.stringify(puzzle));
			if(puzzle.id !== undefined && this.puzzle.puzzleId === undefined) {
				this.puzzle.puzzleId = puzzle.id;
			}
			const svgRenderer = this.svgRenderer;
			const {givens, cages} = convertedPuzzle = {
				id: puzzle.id,
				givens: [],
				cages: [],
			};
			const reLegacySxsm = /^Sudoku Maker pre-version$/;
			const useLegacyOpacity = color => {
				const forceOpaque = App.opaqueColors.includes(color),
							isLegacy = reLegacySxsm.test((convertedPuzzle.metadata || {}).source),
							hasAlpha = cssColorHasAlpha(color);
				return !(forceOpaque || (!isLegacy && hasAlpha));
			};
			const applyLegacyOpacity = attr => {
				if(useLegacyOpacity(attr && attr.backgroundColor)) {
					attr['fill-opacity'] = 0.5;
					attr['stroke-opacity'] = 0.5;
				}
				return attr;
			};
			try {
				this.showYoutubeButton(puzzle);
				const rows = (puzzle.cells || []).length, cols = Math.max.apply(Math, (puzzle.cells || []).map(row => row.length));
				this.puzzle.createPuzzle({rows, cols});
				this.initMetadata(puzzle, convertedPuzzle);
				if(isExperimentalMode()) {
					if(this.puzzle.puzzleId === 'jh6RDHdBmq') {
						// Test/demo
						svgRenderer.renderPart({target: 'background', type: 'image', attr: {href: '/images/puzzles/jh6RDHdBmq.png', width: 580, height: 580, opacity: 0.2, x: '-2', y: '-2', preserveAspectRatio: 'none'}});
					}
					if(this.puzzle.puzzleId === 'R9h8LBHngd') {
						// Test/demo
						svgRenderer.renderPart({target: 'background', type: 'image', attr: {href: '/images/puzzles/R9h8LBHngd.png', width: 626, height: 623, opacity: 0.2, x: '-25', y: '-18', preserveAspectRatio: 'none'}});
					}
					if(this.puzzle.puzzleId === 'TmMBJj8jbr') {
						// Test/demo
						svgRenderer.renderPart({target: 'background', type: 'image', attr: {href: '/images/puzzles/TmMBJj8jbr.png', width: 600, height: 601, opacity: 1, x: '-15', y: '-13', preserveAspectRatio: 'none'}});
					}
					if(this.puzzle.puzzleId === 'R68bTRmnrP') {
						// Test/demo
						svgRenderer.renderPart({target: 'background', type: 'image', attr: {href: '/images/puzzles/R68bTRmnrP.png', width: 550, height: 550, opacity: 0.2, x: '20', y: '-50', preserveAspectRatio: 'none'}});
					}
					if(this.puzzle.puzzleId === 'p27QN9Ldtj') {
						// Test/demo
						svgRenderer.renderPart({target: 'background', type: 'image', attr: {href: '/images/puzzles/p27QN9Ldtj.jpg', width: 960 * 0.7, height: 1025 * 0.7, opacity: 0.3, x: '-48', y: '-18', preserveAspectRatio: 'none'}});
					}
				}
				if(this.puzzle.puzzleId === 'NJbPwMVNwZ') {
					svgRenderer.renderPart({target: 'background', type: 'image', attr: {href: '/images/puzzles/NJbPwMVNwZ.png', width: 1024 * 0.566, height: 1024 * 0.566, opacity: 0.4, x: '-2', y: '-2', preserveAspectRatio: 'none'}});
				}
				if(this.puzzle.puzzleId === 'MONOPOLYSUDOKU') {
					svgRenderer.renderPart({target: 'background', type: 'image', attr: {href: '/images/puzzles/monopolysudoku.png', width: 1024 * 0.66, height: 1024 * 0.66, opacity: 0.4, x: '-50', y: '-50', preserveAspectRatio: 'none'}});
				}
				
				const handleArrowFeature = part => {
					if(part.feature) {
						switch(part.feature.type) {
							case 'arrowsum':
								applyLegacyOpacity((part.feature.part || {}).bulb);
								svgRenderer.renderArrowSum(part.feature.part);
								break;
							case 'littlekiller': svgRenderer.renderLittleKiller(part.feature); break;
							default: console.error('Unhandled feature in convertPuzzle > puzzle.arrows:', part.feature);
						}
						return;
					}
					//console.info('Unhandled feature in arrows:', part);
					svgRenderer.renderArrow(Object.assign({target: 'arrows'}, part));
				};
				const handleLineFeature = part => {
					// TODO: Revisit this hack when implementing the "lunchbox" feature (see: 3RJ9dFJpM9)
					if(part.thickness === 1) part.thickness = 2;
					if(part.feature) {
						switch(part.feature.type) {
							//case 'thermo': part.svgElem = svgRenderer.renderThermo(part.feature); break;
							case 'inequality': svgRenderer.renderLine(Object.assign({target: 'arrows'}, part)); break;
							case 'sandwichcage': svgRenderer.renderLine(Object.assign({target: 'arrows'}, part.feature.line)); break;
							case 'palindrome': svgRenderer.renderPalindrome(part.feature); break;
							case 'sudokux': case 'sudokux+': case 'sudokux-': svgRenderer.renderSudokuX(part.feature); break;
							default: console.error('Unhandled feature in convertPuzzle > puzzle.lines:', part.feature);
						}
						return;
					}
					//console.info('Unhandled feature in lines:', part);
					svgRenderer.renderLine(Object.assign({target: 'arrows'}, part));
				};
				const handleOverlayFeature = part => {
					if(part.feature) {
						switch(part.feature.type) {
							case 'kropki': return svgRenderer.renderKropki(part.feature.part); break;
							case 'xv': return svgRenderer.renderXV(part.feature.part); break;
							//case 'thermo': return;
							case 'littlekiller': return;
							case 'arrowsum':
								// If skipping this causes issues, just remove the "return;" in the next line
								return;
								break;
							case 'inequality': console.warn('implement text-to-line conversions for inequality feature.'); break;
							case 'windoku': break;
							default: console.error('Unhandled feature in convertPuzzle > puzzle.under/overlays:', part.feature);
						}
					}
					//console.info('Unhandled feature in overlay/underlay:', part);
					var target = (puzzle.underlays || []).indexOf(part) !== -1 ? 'underlay' : 'overlay';
					var attr = Object.assign({target}, part);
					attr.borderColor = attr.borderColor || 'none';
					attr.backgroundColor = attr.backgroundColor || 'none';
					if(attr.backgroundColor === attr.borderColor) delete attr.borderColor;
					applyLegacyOpacity(attr);
					//if((backgroundColor || '').toLowerCase() === '#cfcfcf' && (opacity === 1)) backgroundColor = 'rgba(0,0,0,0.2)';
					//if(borderColor !== 'none') borderColor = App.colorHexToRGBA(borderColor, 0.5);
					//if(backgroundColor !== 'none') backgroundColor = App.colorHexToRGBA(backgroundColor, 0.5);
					//console.log('rect colours:', part, backgroundColor, borderColor, opacity);
					//svgRenderer.renderRect(Object.assign({}, part, {target, borderColor, backgroundColor}));
					
					/*
					// Try to detect cell-sized squares only
					// WHY THIS?!
					if(attr.backgroundColor === '#CFCFCF' && attr.width === 1 && attr.height === 1) {
						attr.backgroundColor = '#a0a0a0';
						attr['fill-opacity'] = 0.5;
					}
					*/
					let bgElem = svgRenderer.renderRect(attr);
					if(part.text !== undefined) {
						// Compansate for legacy font size hacks
						if(part.fontSize !== undefined) part.fontSize += 4;
						let textOpts = Object.assign({}, part, {target, backgroundColor: undefined});
						if(part.textColor) Object.assign(textOpts, {color: part.textColor, textStroke: '#0000'});
						svgRenderer.renderText(textOpts);
						bgElem.classList.add('textbg');
					}
				};
				const handleCellFeature = ([r, c, cell]) => {
					if(cell.value !== undefined && !Number.isNaN(cell.value)) givens.push(`r${1 + r}c${1 + c}=${cell.value}`);
					if((cell.pencilMarks || []).length > 0) {
						convertedPuzzle.pencilmarks = convertedPuzzle.pencilmarks || [];
						convertedPuzzle.pencilmarks.push(`r${1 + r}c${1 + c}=${cell.pencilMarks.join(',')}`);
					}
					if((cell.centremarks || []).length > 0) {
						convertedPuzzle.centremarks = convertedPuzzle.centremarks || [];
						convertedPuzzle.centremarks.push(`r${1 + r}c${1 + c}=${cell.centremarks.join(',')}`);
					}
				};
				const handleRegionFeature = cells => {
					let cage = {
						cells: (cells || []).filter(item => Array.isArray(item)).map(([r, c]) => `r${1 + r}c${1 + c}`).join(','),
						sum: triangularNumber(cells.length),
						unique: true,
						style: 'box',
						type: 'region',
					};
					if(cells.length === this.puzzle.cells.length) cage.unique = false;
					cages.push(cage);
				};
				const handleCageFeature = cage => {
					const DefaultCageStyle = 'killer',
								DefaultCageStyleByType = {
									rowcol: undefined,
									disjoint: undefined,
								},
								getCageStyle = ({type, style, hidden}) => style ?? (
									DefaultCageStyleByType.hasOwnProperty(type)
									? DefaultCageStyleByType[type]
									: DefaultCageStyle
								);
					if((cage.cells || []).length === 0) return;
					const labelCell = [...cage.cells].sort(sortTopLeftRC).pop();
					const outCage = Object.assign({}, cage, {
						style: getCageStyle(cage),
						cells: cage.cells.map(([r, c]) => `r${1 + r}c${1 + c}`).join(',')
					});
					if(cage.fontC) outCage.textColor = cage.fontC;
					if(cage.outlineC) outCage.borderColor = cage.outlineC;
					if(cage.value !== undefined && !/^\s*$/.test(cage.value)) {
						outCage.cageValue = `r${1 + labelCell[0]}c${1 + labelCell[1]}: ${cage.value}`;
						if(cage.feature) outCage.feature = cage.feature;
					}
					if(cage.unique !== undefined) outCage.unique = cage.unique;
					if(cage.style && SvgRenderer.styles.cageBorders[cage.style]) outCage.style = cage.style;
					cages.push(outCage);
				};

				this.handleArrowFeature = handleArrowFeature;
				this.handleLineFeature = handleLineFeature;
				this.handleOverlayFeature = handleOverlayFeature;
				this.handleCellFeature = handleCellFeature;
				this.handleRegionFeature = handleRegionFeature;
				if(typeof this.handleFogFeature === 'function') this.handleFogFeature(puzzle, convertedPuzzle);
				
				const handleFeatures = (parts, partHandler) => {
					for(const part of (parts ?? [])) {
						try {
							partHandler(part);
						}
						catch(err) {
							console.error('Error handling feature part:', part, err);
						}
					}
				}

				// Extract puzzle features
				handleFeatures(Object.keys(PuzzleFeatures), feature => convertedPuzzle[feature] = PuzzleFeatures[feature](puzzle) || []);

				if(!Framework.getSetting('arrowsabovelines')) {
					handleFeatures(puzzle.arrows, handleArrowFeature);
					handleFeatures(puzzle.lines, handleLineFeature);
				}
				else {
					handleFeatures(puzzle.lines, handleLineFeature);
					handleFeatures(puzzle.arrows, handleArrowFeature);
				}
				handleFeatures([].concat(puzzle.underlays ?? [], puzzle.overlays ?? []), handleOverlayFeature);
				const cellFeatures = (puzzle.cells ?? []).flatMap((row = [], r) => row.map((cell = {}, c) => [r, c, cell]));
				handleFeatures(cellFeatures, handleCellFeature);
				handleFeatures(puzzle.cages, handleCageFeature);
				handleFeatures(puzzle.regions, handleRegionFeature);

				let infoElem = document.querySelector('.controls-info');
				if(infoElem !== null) {
					infoElem.style.display = 'none';
					Object.assign(document.querySelector('.puzzle-header').style, {
						height: '4em',
						opacity: '1'
					});
				}
				if(isExperimentalMode() && this.puzzle.puzzleId === 'TmMBJj8jbr') {
					[...document.querySelectorAll('.thermo-line, .thermo-bulb, svg rect[fill="#a0a0a0"]')].forEach(part => part.setAttribute('opacity', 0));
				}
				// Special Solutionfor "3DBNbtLfdp"
					let badSol = '000000000000000000000012356403142560416235045632102563140325461054123606251430561324036241501436250234156063514204615320642513021465305324610153642000000000000000000000041365204632150532641062514301254630614235054132605421360425163023651403165420361452016423502316540256314035246106543210143526000000000000000000000';
					let goodSol = '.......................123564.314256.416235..456321.256314.325461..541236.625143.561324..362415.143625.234156..635142.461532.642513..214653.532461.153642........................413652.463215.532641..625143.125463.614235..541326.542163.425163..236514.316542.361452..164235.231654.256314..352461.654321.143526.......................';
					if(puzzle.id === '3DBNbtLfdp' && convertedPuzzle.solution === badSol) {
						convertedPuzzle.solution = goodSol;
					}

				// Parse rules from metadata for additional annotations
				const rules = normalizeRules(convertedPuzzle.rules);
				const withKiller = hasKillerCage(rules) !== undefined;
				[...cages].forEach(cage => {
					if(withKiller && cage.unique === undefined && cage.style === 'killer') {
						cage.unique = true;
						let numVal = Number(cage.value);
						if(Number.isInteger(numVal) && numVal > 0) cage.sum = numVal;
					}
				});
				
				// Check for XV rules to detect indefinite rules
				const withXV = hasXV(convertedPuzzle.rules);
				if(!withXV) delete convertedPuzzle.xvs;

				this.showMetaInfoUI(convertedPuzzle);
			}
			catch(err) { reportAndRethrow('Error in Puzzle.convertPuzzle:')(err); }
			
			// Show thermos
			// (convertedPuzzle.thermos || []).forEach(seg => svgRenderer.renderArrow({color: 'blue', thickness: 3, headLength: 0.5, wayPoints: seg.points.map(([r, c]) => [r + 0.5, c + 0.5])}));
			/*
			Object.keys(convertedPuzzle).forEach(key => {
				if((convertedPuzzle[key] || []).length > 0) {
					console.log('Found puzzle feature "%s" x%s:', key, convertedPuzzle[key].length, convertedPuzzle[key]);
				}
			});
			*/
			this.initSudorkle(convertedPuzzle);
			return convertedPuzzle;
		};
		P.handleRestartPuzzle = function() {
			if(event && event.preventDefault) event.preventDefault(); // Prevent touch/click to cancel confirm dialog
			document.querySelectorAll('[data-control="restart"]')
				.forEach(elem => {
					elem.disabled = true;
					elem.classList.toggle('confirm', true);
				});
			const handleCancel = () => {
				document.querySelectorAll('[data-control="restart"]')
					.forEach(elem => {
						elem.disabled = false;
						elem.classList.toggle('confirm', false);
					});
			};
			const handleOption = selected => {
				handleCancel();
				if(/keep time/i.test(selected)) this.restartPuzzle(true);
				else if(/restart/i.test(selected)) this.restartPuzzle();
			};
			Framework.closeDialog();
			Framework.showDialog({
				parts: [
					{tag: 'text', innerHTML: '<span class="emoji">⟲</span> Confirm Restart <span class="emoji">⟲</span>', style: 'text-align: center; font-weight: bolder;'},
					{tag: 'text', innerHTML: 'Are you sure you want to restart? All progress will be lost!'},
					{tag: 'options', options: [
						{tag: 'button', innerHTML: '<span class="emoji">⟲</span> Restart'},
						{tag: 'button', innerHTML: '<span class="emoji">⟲</span> + <span class="emoji">⏱</span> Keep Time'},
						{tag: 'button', innerHTML: '<span class="emoji">❌</span> Cancel', style: 'margin-top: 1rem'}
					], style: 'display: grid;'},
				],
				onCancel: handleCancel,
				onButton: handleOption,
				overlayBlur: Framework.getSetting('hidesolved'),
				centerOverBoard: true,
			});
		};
	// Actions
		P.act = function(action) {
			if(this.puzzle.errorsVisible) {
				this.puzzle.clearErrors(action);
				if(action.type === 'undo' && this.lastErrorsCheckConflicts !== true) return;
				this.lastErrorsCheckConflicts = false;
			}
			let res = this.puzzle.act(action);
			this.trigger('act', action);
			return res;
		};
		P.replayPlay = function(replay, opts) { return this.puzzle.replayPlay(replay, opts); };
		P.getDialogParts = function(type) {
			const {currentPuzzle: {metadata = {}}} = this;
			const getMsg = (type, def) => metadata[`msg${type}`] !== undefined ? textToHtml(sanitizeHTML(metadata[`msg${type}`])) : def;
			switch(type) {
				case 'correct': return [
					{tag: 'title', innerHTML: '<span class="emoji icon-sven">🎉</span> Yey, Congrats! <span class="emoji icon-toby">🎉</span>', style: 'text-align: center'},
					{tag: 'text', innerHTML: getMsg(type, 'You solved the puzzle!<br>The solution is correct.'), style: 'text-align: center; line-height: 2em; margin: 2em 0;'}
				];
				case 'partial': return [
					{tag: 'title', innerHTML: '<span class="emoji">👍</span> Looking good so far! <span class="emoji">👍</span>', style: 'text-align: center'},
					{tag: 'text', innerHTML: getMsg(type, 'Puzzle is not yet finished.<br>The digits you entered are correct.'), style: 'text-align: center; line-height: 2em; margin: 2em 0;'}
				];
				case 'incorrect': return [
					{tag: 'title', innerHTML: '<span class="emoji">😧</span> Uh, Oh! <span class="emoji">😧</span>', style: 'text-align: center'},
					{tag: 'text', innerHTML: getMsg(type, 'Darn, that\'s not the solution!<br><br>Did you miss some rules?'), style: 'text-align: center'},
				];
				case 'valid': return [
					{tag: 'title', innerHTML: '<span class="emoji icon-sven">🎉</span> Yey, Congrats! <span class="emoji icon-toby">🎉</span>', style: 'text-align: center'},
					{tag: 'text', innerHTML: getMsg(type, 'Looks good as far as I can tell!'), style: 'text-align: center'},
					{tag: 'text', innerHTML: '<span class="emoji">⚠️</span>(Puzzle doesn\'t include solution)<span class="emoji">⚠️</span>', style: 'text-align: center; font-size: 100%;'},
					{tag: 'text', innerHTML: `<a href="#" onclick="handleNewLinkWithSolution()">Create new link with your solution</a>`, style: 'text-align: center; font-size: 100%;'},
				];
				case 'invalid': return [
					{tag: 'title', innerHTML: '<span class="emoji">😧</span> Bobbins! <span class="emoji">😧</span>', style: 'text-align: center'},
					{tag: 'text', innerHTML:getMsg(type, 'That doesn\'t look quite right.'), style: 'text-align: center; margin: 2em 0;'},
					{tag: 'text', innerHTML: '<span class="emoji">⚠️</span>(Puzzle doesn\'t include solution)<span class="emoji">⚠️</span>', style: 'text-align: center; font-size: 100%;'},
				];
				case 'unknown': return [
					{tag: 'title', innerHTML: '<span class="emoji">🔴</span> I\'m Sorry, Dave! <span class="emoji">🔴</span>', style: 'text-align: center'},
					{tag: 'text', innerHTML: getMsg(type, 'I can\'t let you do that!<div style="text-align: center; font-size: 70%; margin-top: 1rem;">(This puzzles doesn\'t conform to standard rules)</div>'), style: 'text-align: center'},
					{tag: 'text', innerHTML: '<span class="emoji">⚠️</span>(Puzzle doesn\'t include solution)<span class="emoji">⚠️</span>', style: 'text-align: center; font-size: 100%;'},
				];
			}
		};
		P.showPuzzleNoErrorsDialog = function() {
			let {timer, puzzle} = this, {elapsedTime} = timer;
			/*
			// Potential implementation to detect pending pause at finish
			if(!timer.running) {
				let nowTime = Date.now(), pauseDuration = nowTime - timer.lastPauseTime;
				console.log('  pauseDuration:', pauseDuration);
				let playTime = 0, pausedActs = 0;
				for(const act of puzzle.replayStack.reverse()) {
					let [_, type, arg, time] = (act.match(/([^/:]+)(?:\:([^/]+))?(?:\/(.+))?/) || []);
					let ms = Number(time ?? 0) * Puzzle.logTimeResolutionMs;
					playTime += ms;
					console.log('  act:', playTime, act, {type, arg, time, ms});
					if(playTime > pauseDuration) {
						console.warn('Pause occurred here!');
						console.log(`The game was paused while ${pausedActs} actions where made. Would you like to retroactively un-pause the game about ${Math.round(pauseDuration)} seconds ago?`);
						console.log('  Proposed pause time:', pauseDuration - playTime + ms);
						
						Framework.closeDialog();
						Framework.showAlert(`The game was paused while ${pausedActs} actions where made. Would you like to retroactively un-pause the game about ${Math.round(pauseDuration / 1000)} seconds ago?`);
						return;
						break;
					}
					pausedActs++;
				}
			}
			*/
			let dialogType = puzzle.hasSolution()
				? 'correct'
				: (
					!puzzle.sudokuConflict
						? 'valid'
						: 'unknown'
					);
			let dialogParts = [...this.getDialogParts(dialogType)];
			dialogParts.push(
				{tag: 'text', style: 'text-align: center; font-size: 120%;',
					innerHTML: `<a id="clipboardcopy" title="Copy to clipboard">Time: <span style="user-select: all">${Timer.formatTime(elapsedTime)}</span> <span style="vertical-align: middle;">${Framework.icons.copy}</span></a>`,
				},
				Framework.html.dialogsupportlinks,
				{tag: 'options', options: [{tag: 'button', content: 'OK', action: 'close'}]}
			);
			Framework.closeDialog();
			Framework.showDialog({parts: dialogParts, centerOverBoard: true});
			Framework.showAd('completed');
			let clipboardcopyElem = document.querySelector('#clipboardcopy');
			if(clipboardcopyElem) clipboardcopyElem.addEventListener('click', event => {
				let timeStr = formatHHMMSS(elapsedTime);
				console.info('Copied "%s" to the clipboard', timeStr);
				navigator.clipboard.writeText(timeStr);
				// Clear existing messages
				clipboardcopyElem
					.parentElement
					.querySelectorAll(':scope > a ~ div')
					.forEach(elem => elem.remove());
				// Short timeout to give feedback on re-copy
				setTimeout(
					() => clipboardcopyElem.insertAdjacentElement('afterend', Framework.createElem({
						type: 'div',
						content: 'Time copied to clipboard',
						style: 'font-size: smaller;'
					})),
					100
				);
			});
			this.trigger('dialognoerrors');
		};
		P.showPuzzleHasErrorsDialog = function(incorrectSolution, correctPartialSolution) {
			let dialogType = incorrectSolution ? (correctPartialSolution ? 'partial' : 'incorrect') : 'invalid';
			let dialogParts = [...this.getDialogParts(dialogType)];
			dialogParts.push({tag: 'options', options: [{tag: 'button', content: 'OK', action: 'close'}]});
			Framework.showDialog({parts: dialogParts, centerOverBoard: true});
		};
		P.showPuzzlePreviouslySolvedDialog = function() {
			Framework.showDialog({parts: [
				{tag: 'title', innerHTML: '<span class="emoji icon-sven">🎉</span> Yey! <span class="emoji icon-toby">🎉</span>', style: 'text-align: center'},
				{tag: 'text', innerHTML: 'You\'ve already solved this puzzle.', style: 'text-align: center'},
				Framework.html.dialogsupportlinks,
				{tag: 'options', options: [
					{tag: 'button', content: 'View Solution', action: 'close'},
					{tag: 'button', content: 'Restart', handler: this.handleRestartPuzzle}
				]},
			], overlayBlur: Framework.getSetting('hidesolved'), autoClose: true, centerOverBoard: true});
			this.trigger('dialogsolved');
		};
		P.check = function(opts = {}) {
			//console.info('App.check(%s);', JSON.stringify(opts));
			this.lastErrorsCheckConflicts = false;
			const conflictFound = () => {
				this.puzzle.errorsVisible = true;
				this.lastErrorsCheckConflicts = opts.checkConflicts === true;
			};
			let features = opts.checkConflicts ? ['pencilmarks', 'cellconflicts'] : ['cells', 'cages', 'solution', 'pencilmarks', 'cellconflicts'];
			let errors = this.puzzle.check(features);
			//puzzle.cells.forEach(cell => cell.error(false));
			this.puzzle.clearErrors();
			let incorrectSolution = errors.find(({type}) => type === 'incorrect') !== undefined;
			let correctPartialSolution = errors.find(({type, found}) => type === 'incorrect' && found !== '.') === undefined;
			let solved = this.puzzle.hasSolution()
				&& (features.includes('solution'))
				&& (incorrectSolution === false);
			if(solved) errors.length = 0;
			if(errors.length > 0) {
				if(opts.log) console.info('%s errors found:', errors.length, errors);
				let cellErrors = {};
				errors.forEach(err => {
					if(['missing', 'unique', 'cell-conflict'].includes(err.type)) {
						(err.cells || []).forEach(cell => {
							let rc = cell.toRC();
							cellErrors[rc] = cellErrors[rc] || {cell: cell, errors: []};
							cellErrors[rc].errors.push(err);
						});
					}
					if(['pencilmark-conflict'].includes(err.type)) {
						let elem = err.cells[0].propGetElem(err.prop, err.val);
						if(elem) elem.classList.add('conflict');
						conflictFound();
					}
				});
				Object.values(cellErrors).forEach(({cell, errors}) => {
					cell.error(true);
					conflictFound();
					if(opts.log) {
						console.log(
							errors.length === 1
							? errors[0].message
							: `${errors.length} errors in cell[${cell.toRC()}]:\n  ${errors.map(err => err.message).join('\n  ')}`
						);
					}
				});
				if(opts.alertOnError) {
					if(typeof opts.alertOnError === 'function') {
						opts.alertOnError(errors);
					}
					else {
						this.showPuzzleHasErrorsDialog(incorrectSolution, correctPartialSolution);
					}
				}
			}
			else {
				if(opts.alertOnNoError) {
					if(typeof opts.alertOnNoError === 'function') {
						opts.alertOnNoError();
					}
					else {
						this.timer.stop();
						this.showPuzzleNoErrorsDialog();
					}
				}
			}
			return errors;
		};
		P.insertWait = function(duration = 0) {
			//console.info('App.insertWait(%s);', duration);
			let newStartTime = this.timer.startTime - duration;
			let act = this.puzzle.actionToString({type: 'wait', time: duration});
			this.puzzle.logReplayAct(act);
			this.timer.setStartTime(newStartTime);
		};
	// Cell Actions
		P.select = function(cells) { return this.puzzle.select(cells); };
		P.deselect = function(cells) { return this.puzzle.deselect(cells); };
	// Actions
		P.undoOnce = function() {
			this.act({type: 'undo'});
		};
		P.redoOnce = function() {
			this.act({type: 'redo'});
		};
		P.undo = P.redo = () => console.error('Application: undo/redo not available before init!');
	// Replay
		P.getReplay = function(opts = {}) {
			//if(opts.noStates !== true) res.states = loadFPuzzle.compressPuzzle(JSON.stringify(this.puzzle.stateStack));
			return Replay.encode(this.puzzle);
		};
		P.loadReplay = function(replay, opts) {
			if(typeof replay === 'string') replay = Replay.decode(replay);
			return Promise.resolve()
				.then(() => replay.puzzleId !== this.puzzle.puzzleId ? this.loadRemoteCTCPuzzle(replay.puzzleId) : null)
				.then(() => this.puzzle.replayPlay(replay, opts));
		};
		P.runUndoTest = function(undoSteps = 3) {
			Framework.setData('execOnStartUp', JSON.stringify({
				message: `Running undo test on puzzle "${this.puzzle.puzzleId}" for ${undoSteps} steps`,
				target: 'app',
				action: 'function',
				function: 'loadReplay',
				args: [
					this.getReplay(),
					{speed: -1, testUndo: undoSteps}
				]
			}));
			this.puzzle.restartPuzzle();
			this.puzzle.saveProgress(true);
			window.location.reload(false);
		};
		P.execOnStartup = function() {
			//console.info('App.execOnStartup();');
			const data = Framework.getData('execOnStartUp') || {};
			if(data.action === undefined) return;
			console.group('execOnStartup');
			Object.keys(data).forEach(key => console.info({[key]: data[key]}));
			switch(data.action) {
				case 'function':
					const target = window[data.target];
					const func = target[data.function];
					setTimeout(
						() => Promise.resolve(func.apply(target, data.args))
							.then(res => removeData.removeData('execOnStartUp'))
						, 500
					);
					break;
				default: console.error('Invalid execOnStartup data:', data);
			}
			console.groupEnd('execOnStartup');
		};
		P.handledPuzzleOnLoaded = function() {
			this.execOnStartup();
		};
	// Rendering
		P.getDimensions = function() {
			const {CellSize: CS} = SvgRenderer;
			const {svgRenderer, puzzle: {rows, cols}} = this;
			const svg = svgRenderer.getElem();
			const [left, top, width, height] = svg.getAttribute('viewBox').split(' ').map(n => parseFloat(n));
			let padding = 0;//0.25 * SvgRenderer.CellSize
			return {
				width: cols * CS, height: rows * CS,
				marginTop: -top - padding,
				marginBottom: height + top - rows * CS - padding,
				marginLeft: -left - padding,
				marginRight: width + left - cols * CS - padding,
			};
		};
		P.getContentWidth = function(elem) {
			var style = window.getComputedStyle(elem),
				width = elem.offsetWidth,
				padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
			return width - padding;
		};
		P.resizeBoard = function(bounds, orientation) {
			//console.info('App.resizeBoard(bounds, orientation);', bounds, orientation);
			// Relax boardBounds to the nearest 0.25 * cellsize
			const boardElem = document.querySelector('.board');
			Object.assign(boardElem.style, {display: 'flex', transform: 'none'});
			let size = SvgRenderer.CellSize * 0.25;
			const bb = this.svgRenderer.getContentBounds();
			// Ensure box outlines are not clipped
			const MIN_PADDING = 4;
			bb.left -= MIN_PADDING; bb.right += MIN_PADDING;
			bb.top -= MIN_PADDING; bb.bottom += MIN_PADDING;
			bb.width += 2 * MIN_PADDING; bb.height += 2 * MIN_PADDING;
			let gridWidth = this.puzzle.cols * SvgRenderer.CellSize, gridHeight = this.puzzle.rows * SvgRenderer.CellSize;
			const boardBounds = {
				left: Math.floor(bb.left / size) * size, right: Math.ceil(bb.right / size) * size, 
				top: Math.floor(bb.top / size) * size, bottom: Math.ceil(bb.bottom / size) * size,
				right:  Math.ceil((bb.width + bb.left - gridWidth) / size) * size,
				bottom: Math.ceil((bb.height + bb.top - gridHeight) / size) * size,
				width: (Math.ceil(bb.right / size) - Math.floor(bb.left / size)) * size,
				height: (Math.ceil(bb.bottom / size) - Math.floor(bb.top / size)) * size,
			};
			let scale = scaleToFit(boardBounds, bounds, {h: 0, v: 0});
			let leftOffset = -2 * boardBounds.left - (boardBounds.width - this.puzzle.cols * SvgRenderer.CellSize);
			boardElem.style.transform = `translate(-50%,-50%) scale(${scale.toFixed(3)})`;
			let boardLeft = bounds.left + 0.5 * bounds.width + 0.5 * scale * leftOffset;
			let boardTop = 0;
			switch(orientation) {
				case 'portrait':
					let ctrlT = getTransform('#controls');
					let boardMargin = 0.25 * SvgRenderer.CellSize * scale;
					boardTop = ctrlT.top + ctrlT.ty - boardMargin - 0.5 * scale * boardBounds.height;
					break;
				case 'landscape':
					boardTop = bounds.top + 0.5 * bounds.height;
					break;
			}
			boardTop -= 0.5 * scale * (boardBounds.top + boardBounds.bottom);
			Object.assign(boardElem.style, {
				opacity: 1,
				left: Math.round(boardLeft)+'px',
				top: Math.round(boardTop)+'px',
				paddingTop: `${boardBounds.top}px`,
				width: Math.round(boardBounds.width)+'px',
				height: Math.round(boardBounds.height)+'px',
			});
			this.svgRenderer.adjustViewBox(boardBounds.left, boardBounds.top, boardBounds.width, boardBounds.height);
		};
		P.resize2 = function() {
			let boardPosition = {
				left: 10, top: 300,
				width: 300, height: 300
			};
			this.resizeBoard(boardPosition);
		};
		P.resize = function() {
			//console.info('App.resize();');
			const boardElem = $('.board');
			if(boardElem === null) return; // Cannot resize if there is no game

			const gameBounds = bounds('.game');
			const menuBounds = bounds('.topbar');
			const menuHeight = menuBounds.height;
			let minAspect = 1.7, maxAspect = 2.1;
			let orientation, aspect = 1;
			if(gameBounds.width > gameBounds.height) {
				orientation = 'landscape';
				aspect = Math.min(maxAspect, Math.max(minAspect, gameBounds.width / gameBounds.height));
			}
			else {
				orientation = 'portrait';
				minAspect = 1.5
				aspect = Math.max(1 / maxAspect, Math.min(1 / minAspect, gameBounds.width / gameBounds.height));
			}
			let w = Math.min(gameBounds.width, gameBounds.height * aspect), h = w / aspect;
			let x = (gameBounds.width - w) * 0.5, y = (gameBounds.height - h) * 0.5;
			let boardSize = Math.min(w, h);

			// Game
				document.querySelector('body').classList.toggle('orientation-portrait', orientation === 'portrait');
			
			const minMargin = orientation === 'landscape' ? boardSize * 0.05 : 5; // 5%/5px of boardSize

			// Controls:
				const controlsMaxScale = scale => Math.min(1.3, scale);
				const resizeControls = {
					landscape: () => {
						var res = {style: {}};
						res.width = Math.round(w - boardSize);
						res.height = Math.round(boardSize);
						res.left = Math.round(x + boardSize);
						res.top = Math.round(y + menuHeight);
						res.scale = controlsMaxScale(scaleToFit(controlsBounds, res, {h: minMargin, v: 5 * minMargin}));
						var left = 0.5 * minMargin;
						var top = 0.5 * (res.height - controlsBounds.height * res.scale) + 2 * minMargin;
						Object.assign(res.style, {
							transform: `translate(${Math.round(left)}px, ${Math.round(top)}px) scale(${res.scale.toFixed(3)})`
						});
						return res;
					},
					portrait: () => {
						var res = {style: {}};
						res.width = Math.round(boardSize);
						res.height = Math.round(h - boardSize);
						res.left = Math.round(x);
						res.top = Math.round(y + menuHeight + boardSize);
						res.scale = controlsMaxScale(scaleToFit(controlsBounds, res, {h: minMargin, v: minMargin}));
						var left = 0.5 * (res.width - controlsBounds.width * res.scale);
						var top = (res.height - controlsBounds.height * res.scale - 0.5 * minMargin);
						Object.assign(res.style, {
							transform: `translate(${Math.round(left)}px, ${Math.round(top)}px) scale(${res.scale.toFixed(3)})`
						});
						return res;
					}
				};
				const controlsElem = $('#controls');
				if(controlsElem !== null) {
					Object.assign(controlsElem.style, {display: 'flex', transform: 'none'});
					var controlsBounds = bounds(controlsElem);
					var controlsDims = resizeControls[orientation]();
					Object.assign(controlsElem.style, controlsDims.style, {
						left: controlsDims.left+'px', top: controlsDims.top+'px',
					});
				}
			// Board:
				this.resizeBoard({
					left: x + 0.5 * minMargin,
					top: y + menuHeight + 0.5 * minMargin,
					width: boardSize - minMargin,
					height: boardSize - minMargin,
				}, orientation);
			this.trigger('resize');
		};
		P.disableRendering = function() {
			//console.info('App.disableRendering(); cellRendering = %s', this.cellRendering);
			this.cellRendering = false;
		};
		P.renderCells = function(forceRedraw) {
			//console.info('App.renderCells(%s); cellRendering = %s', forceRedraw, this.cellRendering);
			this.cellRendering = true;
			this.puzzle.cells.forEach(cell => cell.renderContent(forceRedraw));
		};
	// Dialogs
		P.getPuzzleMetaDialogParts = function() {
			let {icons} = Framework, {puzzle, sourcePuzzle = {}} = this, {currentPuzzle} = puzzle;
			let {title, author} = currentPuzzle;
			let {videos = []} = sourcePuzzle;
			let parts = [];
			parts.push({tag: 'title', class: 'title', content: title ? `"${title}"` : 'Rules'});
			if(author) parts.push({tag: 'h2', class: 'author', content: `By ${author}`});
			parts.push({tag: 'text', class: 'rulestext', innerHTML: puzzle.getRules(true)});
			(videos || [])
				.slice(0, 3)
				.forEach(({id, title}) => parts
					.push({
						tag: 'a', class: 'videolink',
						href: `https://www.youtube.com/watch?v=${id}`,
						target: '_blank',
						'data-control': 'video',
						title: `Open YouTube video:\n"${title}"`,
						children: [
							{class: 'icon', style: 'color:#f00', innerHTML: icons.youtube},
							{tag: 'span', content: `Featured in video: \"${title}\"`}
						]
					})
				);
			return parts;
		};
	// Editor
		P.toP81 = function() {
			//console.info('App.toP81();');
			return this.puzzle.toP81();
		};
		P.toSCF = function() {
			//console.info('App.toSCF();');
			return PuzzleTools.zip(this.toP81());
		};
		P.openNewClassicSudoku = function() {
			//console.info('App.openNewClassicSudoku();');
			window.open(`/sudoku/classic${this.createClassicSudoku()}`, '_blank');
		};
		P.fromP81 = function(p81) {
			//console.info('App.fromP81("%s");', p81);
			let {selectedCells, cells} = this.puzzle;
			let len = Math.min(p81.length, cells.length);
			let savedSelection = [...selectedCells];
			this.changeTool('normal', true);
			for(let i = 0; i < len; i++) {
				if(p81[i] !== '0') {
					this.deselect();
					this.select(cells[i]);
					this.doPressDigit(p81[i]);
				}
			}
			this.select(savedSelection);
			this.changeTool();
		};
		P.createClassicSudoku = P.toSCF;
		P.loadCompactClassicSudoku = function(data = '') {
			//console.info('App.loadCompactClassicSudoku("%s");', data);
			const {getRegionShape} = loadFPuzzle;
			return Promise.resolve()
				.then(() => {
					data = data.replace(reCompactClassicSudoku, '$1');
					const puzzle = {id: 'classic' + data, cages: [], givens: []};
					let givens = (PuzzleTools.unzip(data) || '').replace(/[^1-9]/g, '0').split('');
					let area = givens.length > 0 ? givens.length : 9 * 9;
					let [rows, cols] = getRegionShape(area);
					let [regR, regC] = getRegionShape(cols);
					console.info('Puzzle area is %s (%sx%s) with %sx%s regions', area, rows, cols, regR, regC);
					this.puzzle.puzzleId = puzzle.id;
					for(var i = 0; i < cols * rows; i++) {
						if(givens[i] && givens[i] != '0') {
							var r = Math.floor(i / cols) + 1, c = i % cols + 1, val = givens[i];
							puzzle.givens.push(`r${r}c${c}=${val}`);
						}
					}
					for(let c = 0; c < cols / regC; c++) {
						for(let r = 0; r < rows / regR; r++) {
							let cells = [];
							for(var rr = 0; rr < regR; rr++) for(var cc = 0; cc < regC; cc++) {
								cells.push(`r${r * regR + rr + 1}c${c * regC + cc + 1}`)
							}
							let cage = {cells: cells.join(','), style: 'box', type: 'region'}, sum = triangularNumber(regR * regC);
							if(sum <= 45) cage.sum = sum;
							puzzle.cages.push(cage);
						}
					}
					for(var r = 1; r <= rows; r++) {
						let cage = {cells: `r${r}c1-r${r}c${cols}`, type: 'rowcol'}, sum = triangularNumber(cols);
						if(sum <= 45) cage.sum = sum;
						puzzle.cages.push(cage);
					}
					for(var c = 1; c <= cols; c++) {
						let cage = {cells: `r1c${c}-r${rows}c${c}`, type: 'rowcol'}, sum = triangularNumber(rows);
						if(sum <= 45) cage.sum = sum;
						puzzle.cages.push(cage);
					}
					this.puzzle.createPuzzle({rows, cols});
					return this.loadPuzzle(puzzle)
						//.then(() => this.puzzle.restartPuzzle())
						.then(() => puzzle);
				});
		};
	// Event Handlers
		P.attachHandlers = function() {
			if(this.handlersAttached) return;
			this.handlersAttached = true;
			addHandler(window, 'resize', this.handleResize, {passive: false});
			addHandler(window, 'beforeunload', this.handleBeforeunload, {passive: false});
			addHandler(document, 'touchcancel', this.handleCancel);
			addHandler(window, 'blur focusout', this.handleBlur);
			addHandler(document, VisChangeEventName, this.handleVisibilityChange);
			addHandler(window, 'pagehide pageshow', this.handleVisibilityChange);
			this._attachInteractionHandlers();
		};
		P.detachHandlers = function() {
			if(!this.handlersAttached) return;
			remHandler(window, 'resize', this.handleResize, {passive: false});
			remHandler(window, 'beforeunload', this.handleBeforeunload, {passive: false});
			remHandler(document, 'touchcancel', this.handleCancel);
			remHandler(window, 'blur focusout', this.handleBlur);
			remHandler(document, VisChangeEventName, this.handleVisibilityChange);
			remHandler(window, 'pagehide pageshow', this.handleVisibilityChange);
			this._detachInteractionHandlers();
			this.handlersAttached = false;
		};
		P.pauseInteractionHandlers = function() {
			if(!this.handlersAttached) return;
			this._detachInteractionHandlers();
		};
		P.unpauseInteractionHandlers = function() {
			if(!this.handlersAttached) return;
			this._attachInteractionHandlers();
		};
		P._attachInteractionHandlers = function() {
			if(this.interactionHandlersAttached) return;
			this.interactionHandlersAttached = true;
			const appElem = window;
			addDownEventHandler(appElem, this.handleInputdown, {passive: false});
			addUpEventHandler(appElem, this.handleInputup, {passive: false});
			addMoveEventHandler(appElem, this.handleInputmove, {passive: false});
			addHandler(document, 'keydown', this.handleKeydown, {capture: true});
			addHandler(document, 'keyup', this.handleKeyup, {capture: true});
			this.attachButtonHandlers();
		};
		P._detachInteractionHandlers = function() {
			if(!this.interactionHandlersAttached) return;
			const appElem = window;
			removeDownEventHandler(appElem, this.handleInputdown, {passive: false});
			removeUpEventHandler(appElem, this.handleInputup, {passive: false});
			removeMoveEventHandler(appElem, this.handleInputmove, {passive: false});
			remHandler(document, 'keydown', this.handleKeydown, {capture: true});
			remHandler(document, 'keyup', this.handleKeyup, {capture: true});
			this.detachButtonHandlers();
			this.interactionHandlersAttached = false;
		};
		P.handleVisibilityChange = function(event) { //ML-focus
			let visible = {
				pageshow: true,
				pagehide: false,
				visibilitychange: !document.hidden,
				webkitvisibilitychange: !document.webkitHidden
			}[event.type];
			if(visible === undefined) return console.error('Unexpected visibility event:', event.type, event);
			if(this.isVisible !== visible) {
				this.isVisible = visible;
				if(visible && this._timerWasRunning) this.timer.resume();
				if(!visible) {
					this._timerWasRunning = this.timer.running;
					this.timer.stop();
				}
			}
		}
		P.attachButtonHandlers = function() {
			if(!this.handlersAttached) return;
			let attachedButtons = this.attachedButtons || [];
			attachedButtons = [...document.querySelectorAll('button')];
			attachedButtons.forEach(btn => {
				addDownEventHandler(btn, this.handleButton, {passive: false});
				addUpEventHandler(btn, this.handleButtonUp);
			});
		};
		P.detachButtonHandlers = function() {
			let attachedButtons = this.attachedButtons || [];
			if(attachedButtons.length === 0) return;
			attachedButtons.forEach(btn => {
				removeDownEventHandler(btn, this.handleButton, {passive: false});
				removeUpEventHandler(btn, this.handleButtonUp);
			});
			attachedButtons.length = 0;
		};
		P.refreshControls = function() {
			if(this.currentPuzzle === undefined) return;
			this.detachButtonHandlers();
			this.attachButtonHandlers();
			this.handleResize();
		};
		P.getEventTarget = function(event) {
			//console.info('App.getEventTarget(event);');
			var point = (event.touches && event.touches[0]) || event;
			return document.elementFromPoint(point.clientX, point.clientY);
		};
		P.handleResize = function() {
			this.resize();
		};
		P.handleBeforeunload = function(event) {
			//console.info('App.handleBeforeunload();');
			this.timer.resume();
			this.puzzle.saveProgress(true);
			if(document.location.hostname === 'localhost') return;
			const nonSelectionActions = this.puzzle.replayStack.filter(action => !Puzzle.isSelection(Replay.parseActA(action)[0]));
			const errors = this.puzzle.check();
			if(errors.length > 0 && nonSelectionActions.length > 0) {
				event.preventDefault();
				event.returnValue = '';
			}
		};
		P.handleCancel = function(event) {
			if(this.isDragging === false) this.deselect();
		};
		P.handleBlur = function(event) {
			//console.info('App.handleBlur:', event.type, event, event.target);
			this.updateKeys(event);
			this.keys = {};
			this.changeTool();
			if(this.handleToolEventForwarding('Blur', event)) return;
		};
		P.xyToRCExact = function(x, y) {
			const grid = this.grid, tlCell = grid.getCell(0, 0);
			const tlRect = tlCell.elem.getBoundingClientRect();
			return {
				r: (y - tlRect.y) / tlRect.height,
				c: (x - tlRect.x) / tlRect.width
			};
		};
		P.xyToRC = function(x, y) {
			const rc = this.xyToRCExact(x,y);
			return {r: Math.floor(rc.r), c: Math.floor(rc.c)};
		};
		P.doPressDigit = function(digit) {
			digit = String(digit).toLowerCase();
			//console.log('App.doPressDigit(%s); tool: %s', digit, this.tool);
			if(this.toolExecHandler('handleToolButton', digit)) return;
			this.act({type: Puzzle.ToolToAction[this.tool], arg: digit});
		};
	// Mouse handlers
		P.eventToPos = function(event) {
			let {clientX: x, clientY: y} = (event.touches && event.touches[0]) || event;
			return {x, y};
		};
		P.handleInputTimeout = function() {
			//console.info('App.handleInputTimeout();', this.currentInput);
			this.currentInput = 'none';
		};
		P.checkInput = function(event) {
			if(event.scale !== undefined && event.scale !== 1) event.preventDefault();
			var eventType = event.type.replace(/^(mouse|touch|pointer).*/, '$1');
			var proceed = (this.currentInput === 'none' || this.currentInput === eventType);
			//console.info('  checkInput "%s": %s -> %s = %s', event.type, this.currentInput, eventType, proceed);
			clearTimeout(this.currentInputTimeoutId);
			this.currentInputTimeoutId = setTimeout(this.handleInputTimeout, App.CurrentInputTimeoutMs);
			if(proceed && this.currentInput !== eventType) this.currentInput = eventType;
			return proceed;
		};
		P.didInputMove = function() {
			var prevPos = this.specialInputPos, inputPos = this.inputPos;
			//this.specialInputPos = inputPos; // NOTSURE: Is this needed?
			return !(prevPos && App.DoubleInputDistance > calcDistance(prevPos, inputPos));
		};
		P.handleInputdown = function(event) {
			if(!this.checkInput(event)) return;
			//console.info('App.handleInputdown(event);', event.type, this.currentInput, this.waitingForDoubleInput);
			this.updateKeys(event);
			this.inputPos = this.eventToPos(event);
			let tool = this.tools[this.tool];
			if(this.toolExecHandler('handleInputdown', event)) return;
			clearTimeout(this.longInputTimoutId);
			clearTimeout(this.doubleInputTimoutId);
			if(this.waitingForDoubleInput && !this.didInputMove()) {
				this.waitingForDoubleInput = false;
				this.handleSpecialInput(event);
				return;
			}
			this.specialInputPos = this.inputPos;
			this.waitingForDoubleInput = true;
			this.doubleInputTimoutId = setTimeout(() => this.waitingForDoubleInput = false, App.DoubleInputTimeout);
			this.longInputTimoutId = setTimeout(() => {
				if(!this.didInputMove()) this.handleSpecialInput(event);
			}, App.LongInputTimeout);
			this.handleDragStart(event);
		};
		P.handleInputmove = function(event) {
			if(!this.checkInput(event)) return;
			//console.info('App.handleInputmove(event);', event.type, this.currentInput);
			this.inputPos = this.eventToPos(event);
			this.handleDragMove(event);
			let tool = this.tools[this.tool];
			if(tool && tool.handleInputMove && tool.handleInputMove(event)) return;
			//event.preventDefault();
		};
		P.handleInputup = function(event) {
			if(!this.checkInput(event)) return;
			//console.info('App.handleInputup(event);', event.type, this.currentInput);
			clearTimeout(this.longInputTimoutId);
			let tool = this.tools[this.tool];
			if(this.toolExecHandler('handleInputup', event)) return;
			this.handleDragEnd(event);
		};
		P.handleSpecialInput = function(event) { // double or long input
			//console.info('App.handleSpecialInput(event);', event);
			if(this.toolExecHandler('handleSpecialInput', event)) return;
			const pos = this.inputPos, prevRC = this.xyToRC(pos.x, pos.y);
			const cell = this.grid.getCell(prevRC.r, prevRC.c);
			if(cell) {
				this.puzzle.smartSelectCell(cell, this.tool, this.controlPressed);
			}
			else if(this.pendingDeselect) {
				this.deselect();
			}
			this.pendingDeselect = false;
		};
		P.handleDragStart = function(event) {
			if(event.target.nodeName === 'BUTTON') return; // If clicking button, don't drag
			//if(getComputedStyle(event.target).userSelect !== 'none') return;
			//console.info('App.handleDragStart(event);');
			// <ML-SMARTCORNERMARKS>
				//ML Release the 'smart'-select corner marks before any dragStart
				//except when a real tempKey is active (to prevent unnecessary visual tool changes)
				const toolTempKey = this.toolTempKey(event);
				if(toolTempKey === undefined) {
					this.changeTool();
				}
			// </ML-SMARTCORNERMARKS>
			this.pendingDeselect = false;
			this.isDragging = true;
			// If holding CTRL or SHIFT, don't deselect and modify current selection via select or deselect
			const selectContinue = this.controlPressed || this.shiftPressed;
			this.prevInputPos = Object.assign({}, this.inputPos);
			let tool = this.tools[this.tool];
			if(this.toolExecHandler('handleDragStart', event)) return;
			this.selecting = true;
			const pos = this.inputPos, prevRC = this.xyToRC(pos.x, pos.y);
			const cell = this.grid.getCell(prevRC.r, prevRC.c);
			const selectedCells = this.puzzle.selectedCells;
			this.lastSelectedCellCount = selectedCells.length;
			if(cell) {
				if(selectContinue) {
					this.selecting = !cell.highlighted;
					this.selecting ? this.select(cell) : this.deselect(cell);
				}
				else if(!cell.highlighted) {
					this.deselect(selectedCells.filter(c => c !== cell));
					this.select(cell);
					this.lastSelectedCellCount = 0;
				}
				else {
					let otherCells = selectedCells.filter(c => c !== cell);
					if(otherCells.length > 0) this.deselect(otherCells);
				}
			}
			else {
				const controlsHover = document.querySelectorAll(".controls-buttons:hover").length > 0;
				if(!controlsHover) {
					if(selectContinue && (selectedCells.length >= App.MinCellCountDelayedDeselect)) {
						this.pendingDeselect = true;
					}
					else {
						this.deselect();
					}
				}
			}
			// <ML-SMARTCORNERMARKS>
				this.startSelectedCellCount = selectedCells.length; //ML For detecting 'smart'-select corner marks
			// </ML-SMARTCORNERMARKS>
		};
		P.handleDragMove = function(event) {
			this.currentEvent = event;
			if(this.isDragging !== true) return;
			var tool = this.tools[this.tool];
			if(this.toolExecHandler('handleDragMove', event)) return;
			this.trigger('dragmove');
			//console.info('App.handleDragMove(event);', this.selecting);
			if(this.selecting !== undefined) {
				const cellRadius = 0.45,
							prevRC = this.xyToRC(this.prevInputPos.x, this.prevInputPos.y),
							nextRC = this.xyToRC(this.inputPos.x, this.inputPos.y),
							nextRCExact = this.xyToRCExact(this.inputPos.x, this.inputPos.y),
							dr = nextRCExact.r - nextRC.r - 0.5,
							dc = nextRCExact.c - nextRC.c - 0.5;
				if(dr * dr + dc * dc < cellRadius * cellRadius) { // Implement corner dead-zone
					stepPoints(prevRC.r, prevRC.c, nextRC.r, nextRC.c, (r, c) => {
						var cell = this.grid.getCell(r, c);
						if(cell) this.selecting ? this.select(cell) : this.deselect(cell);
					});
				}
				event.preventDefault();
			}
			this.prevInputPos = Object.assign({}, this.inputPos);
		};
		P.handleDragEnd = function(event) {
			this.currentEvent = event;
			if(this.isDragging !== true) return;
			//console.info('App.handleDragEnd(event);', event);
			this.isDragging = false;
			var tool = this.tools[this.tool];
			if(this.toolExecHandler('handleDragEnd', event)) return;
			// Handle single-cell deselect on drag-end
			if(!this.didInputMove()) {
				const selectedCells = this.puzzle.selectedCells;
				const selectContinue = this.controlPressed || this.shiftPressed;
				const pos = this.inputPos, prevRC = this.xyToRC(pos.x, pos.y), cell = this.grid.getCell(prevRC.r, prevRC.c);
				if(cell && cell.highlighted && !selectContinue && (this.lastSelectedCellCount === 1) && (selectedCells.length <= 1)) {
					this.deselect(cell);
				}
			}
			// <ML-SMARTCORNERMARKS>
				//ML 'smart'-select corner marks when drag-selecting multiple cells
				if(Framework.getSetting('smartcornermarks2') && this.puzzle.selectedCells.length > this.startSelectedCellCount && this.tool != 'colour') {
					this.changeTool('corner', true);
					this.startSelectedCellCount = undefined; // Detect 'smart'-select corner marks only once after DragEnd
				}
			// </ML-SMARTCORNERMARKS>
			this.trigger('dragend');
			this.selecting = undefined;
		};
	// Key handlers
		P.eventToDigit = function(event) {
			const reDigit = /^(?:Numpad|Digit|btn-)([0-9])$/;
			return (String(event.code).match(reDigit) || [])[1];
		};
		P.updateKeys = function(event) {
			//console.info('App.updateKeys:', event.type, event.code, event.shiftKey, event.ctrlKey, event.metaKey);
			if(!event.shiftKey) this.keys.Shift = this.keys.ShiftLeft = this.keys.ShiftRight = false;
			if(!event.ctrlKey) this.keys.Control = this.keys.ControlLeft = this.keys.ControlRight = false;
			if(!event.altKey) this.keys.Alt = this.keys.AltGraph = this.keys.AltLeft = this.keys.AltRight = false;
			if(!event.metaKey) this.keys.Meta = this.keys.MetaLeft = this.keys.MetaRight = false;
			this.keys[event.code] = (event.type === 'keydown');
			const shiftDown = this.keys.Shift || this.keys.ShiftLeft || this.keys.ShiftRight || false;
			const controlDown = this.keys.Control || this.keys.ControlLeft || this.keys.ControlRight || false;
			const altDown = this.keys.Alt || this.keys.AltGraph || this.keys.AltLeft || this.keys.AltRight || false;
			const metaDown = this.keys.Meta || this.keys.MetaLeft || this.keys.MetaRight || false;
			const ctrlMetaDown = (event.ctrlKey || event.metaKey) || false;
			const numlockDown = typeof event.getModifierState === 'function' && event.getModifierState('NumLock');
			//console.log(shiftDown ? 'shift' : '', controlDown ? 'control' : '', metaDown ? 'meta' : '', altDown ? 'alt' : '', ctrlMetaDown ? 'ctrlMeta' : '');
			this.shiftPressed = false || shiftDown || false;
			this.controlPressed = false || ctrlMetaDown || metaDown || controlDown || false;
			// TODO: Remove MacOS meta key aliasing (But keep ctrl+a behavior)
			//this.controlPressed = false || controlDown || false;
			this.altPressed = false || altDown || false;
			//console.log('shiftPressed: %s, controlPressed: %s, keys:', this.shiftPressed, this.controlPressed, Object.keys(this.keys).filter(key => this.keys[key]).sort().join(', '));
			// Workaround for rare X11 shift/ctrl/alt keyup handling
			if(event.type === 'keyup') {
				if(this.shiftPressed && /^Shift/.test(event.key)) this.shiftPressed = false;
				if(this.controlPressed && /^Control/.test(event.key)) this.controlPressed = false;
				if(this.altPressed && /^Alt/.test(event.key)) this.altPressed = false;
			}
			if(event.type === 'keyup' && ['ShiftLeft', 'ShiftRight'].includes(event.code) && numlockDown) {
				this.numlockShiftUpTime = Date.now();
			}
			if(event.type === 'keydown' && this.eventToDigit(event) && numlockDown) {
				//console.log('numlock+shift:', event.code.match(/[0-9]/)[0] !== event.key, event.key);
				// NOTE: We could also examine event.key for "PageUp", etc, to detect this situation
				if(Date.now() - this.numlockShiftUpTime < 30) {
					this.shiftPressed = true;
					const toolTempKey = this.toolTempKey(event);
					if(toolTempKey !== undefined) this.changeTool(toolTempKey.name, true);
				}
			}
		};
		P.handleToolKeyHandlers = function(event) {
			let abortEvent = false;
			(Object.values(this.tools) || []).forEach(tool => (tool.keyHandlers || []).forEach(({key, handler}) => {
				if(this.isKey(key, event)) {
					abortEvent = handler.call(tool, event) || abortEvent;
				}
			}));
			return abortEvent;
		};
		P.handleToolEventForwarding = function(eventName, ...args) {
			//console.info('App.handleToolEventForwarding:', eventName, ...args);
			let abortEvent = false;
			(Object.values(this.tools) || [])
				.forEach(tool => {
					let handler = tool[`handle${eventName}`];
					if(typeof handler === 'function') {
						abortEvent = handler.call(tool, ...args) || abortEvent;
					}
				});
			return abortEvent;
		};
		P.handleKeydown = function(event) {
			if(event.repeat) return;
			//console.info('App.handleKeydown:', event.type, event.code, event.key);
			this.currentEvent = event;
			this.updateKeys(event);
			if(this.handleToolEventForwarding('Keydown', event)) return;
			if(this.handleToolKeyHandlers(event)) return;
			const shiftPressed = this.shiftPressed, controlPressed = this.controlPressed;
			const toolTempKey = this.toolTempKey(event);
			const hotkeyTool = this.getToolNames().find((tool, idx) => this.isKey(App.toolHotkeys[idx], event));
			if(false) {
			}
			else if(controlPressed && event.code === 'KeyP') { // Pass-through print hotkey
			}
			else if(this.eventToDigit(event)) {
				let digit = this.eventToDigit(event)
				let btn = document.querySelector(`button[data-key="${digit}"]`);
				digit = btn.dataset.value;
				this.doPressDigit(digit);
				if(controlPressed || shiftPressed) event.preventDefault();
			}
			else if(controlPressed && event.keyCode === 90) { // CTRL+Z
				this.undo();
			}
			else if(controlPressed && event.keyCode === 89) { // CTRL+Y
				this.redo();
			}
			else if(controlPressed && event.keyCode === 65) { // CTRL+A
				if(shiftPressed) {
					this.deselect();
				}
				else {
					this.select(this.puzzle.cells);
				}
				event.preventDefault();
			}
			else if(controlPressed && event.keyCode === 73) { // CTRL+I
				let invertedSelection = this.grid.getCellList().filter(cell => !this.puzzle.selectedCells.includes(cell));
				this.deselect();
				this.select(invertedSelection);
				event.preventDefault();
			}
			else if(event.key === 'Escape') {
				this.deselect();
			}
			else if(event.code === 'Space') {
				shiftPressed ? this.changeToolPrev() : this.changeToolNext();
				event.preventDefault();
			}
			else if(!controlPressed && event.code === 'PageUp') {
				this.changeToolPrev();
				event.preventDefault();
			}
			else if(!controlPressed && event.code === 'PageDown') {
				this.changeToolNext();
				event.preventDefault();
			}
			else if(['Backspace', 'Delete'].includes(event.key)) {
				this.act({type: 'clear', arg: this.tool});
				event.preventDefault();
			}
			else if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
				var selectedCells = this.puzzle.selectedCells;
				if(selectedCells.length > 0) {
					var selectCell = selectedCells[selectedCells.length - 1];
					var {row, col} = selectCell;
					const {rows, cols} = this.grid;
					switch(event.code) {
						case 'ArrowUp': case 'KeyW': row = (row + rows - 1) % rows; break;
						case 'ArrowLeft': case 'KeyA': col = (col + cols - 1) % cols; break;
						case 'ArrowDown': case 'KeyS': row = (row + rows + 1) % rows; break;
						case 'ArrowRight': case 'KeyD': col = (col + cols + 1) % cols; break;
					}
					selectCell = this.grid.getCell(row, col);
					if(!(controlPressed || shiftPressed)) this.deselect();
					this.select(selectCell);
					event.preventDefault();
				}
			}
			else if(event.code === 'KeyP') {
				this.timer.playPause();
			}
			else if(hotkeyTool !== undefined && !shiftPressed && !controlPressed) {
				this.changeTool(hotkeyTool);
			}
			else if(toolTempKey !== undefined) {
				this.changeTool(toolTempKey.name, true);
				event.preventDefault();
			}
			else {
				//console.log('Unhandled keydown event: key, code, ctrl, alt, shift, meta:', event.key, event.code, event.ctrlKey, event.altKey, event.shiftKey, event.metaKey);
			}
		};
		P.handleKeyup = function(event) { // Cancel temp tool
			this.currentEvent = event;
			this.updateKeys(event);
			if(this.handleToolEventForwarding('Keyup', event)) return;
			//console.info('App.handleKeyup:', event.type, event.code, event.key, this.shiftPressed, this.controlPressed);
			const toolTempKey = this.toolTempKey(event);
			if(toolTempKey !== undefined) {
				this.changeTool(toolTempKey.name, true);
				event.preventDefault();
			}
			else if(event.key === 'Control' || event.key === 'Shift' || event.key === 'Alt' || event.key === 'Meta') {
				this.changeTool();
				event.preventDefault();
			}
		};
	// Button Handlers
		P.specialSelectAllSeen = function(digit) {
			const {
				idxToRow, idxToCol,
				idxSeenRow, idxSeenCol,
				idxIsRowAligned, idxIsColAligned,
				idxFilterSeen, idxSeenByPencilMarks,
			} = PuzzleTools
			const {cells, grid: {rows, cols}} = this.puzzle;
			const size = 9;
			if(rows !== size || cols !== size) {
				console.warn('specialSelectAllSeen currently only supported for 9x9 puzzles');
				return;
			}
			let seen = [];
			const getCenterMarked = (set, digit) => set.filter(idx => cells[idx].propVisible('centre') && cells[idx].propContains('centre', digit));
			const getCornerMarked = (set, digit) => set.filter(idx => cells[idx].propVisible('corner') && cells[idx].propContains('corner', digit));
			const setSub = (set, sub) => set.filter(d => !sub.includes(d));
			const findTuple = (set, digits) => {
				if(!Array.isArray(digits)) digits = [digits];
				let setCells = set.map(idx => cells[idx]);
				let nextDigits = [...new Set(digits.map(d => setCells.map(c =>
						(c.propVisible('centre') && c.propContains('centre', d)) && c.propGet('centre') || []
					).flat()).flat())];
				if(nextDigits.length > digits.length) return findTuple(set, nextDigits);
				if(nextDigits.length === digits.length) {
					let tupleCells = [...new Set(digits.map(d => set.filter(idx => cells[idx].propVisible('centre') && cells[idx].propContains('centre', d))).flat())];
					if(tupleCells.length === nextDigits.length) return true;
				}
				return false;
			};
			const seenByTuple = (set, digits) => {
				if(!findTuple(set, digit)) return [];
				return setSub(set, getCenterMarked(set, digit));
			};
			// see normal
			/*
			cells
				.map(cell => cell.getVal())
				.forEach((val, idx) => {
					if(val === digit) return seen.push.apply(seen, PuzzleTools.getClassicSeenCells(idx));
					if(val !== undefined) return seen.push(idx);
				});
			*/
			const {seenCageCells, unionCageCells, intersectCageCells} = PuzzleTools;
			const puzzleInfo = Checker.getPuzzleInfo();
			const filledCells = cells.filter(cell => undefined !== cell.getVal());
			seen = unionCageCells([
					filledCells,
					...filledCells
						.filter(cell => digit === cell.getVal())
						.map(cell => seenCageCells(cell, puzzleInfo))
				])
				.map(cell => cells.indexOf(cell));
			// see center-pairs by cols
			[...Array(size).keys()]
				.forEach(n => {
					seen.push.apply(seen, seenByTuple(PuzzleTools.regionToSeen.row(n), digit));
					seen.push.apply(seen, seenByTuple(PuzzleTools.regionToSeen.col(n), digit));
					seen.push.apply(seen, seenByTuple(PuzzleTools.regionToSeen.box(n), digit));
				});
			// see corner by boxes
			[...Array(size).keys()]
				.forEach(n => {
					let box = PuzzleTools.regionToSeen.box(n);
					let marked = box.filter(idx => cells[idx].propVisible('corner') && cells[idx].propContains('corner', digit));
					let newSeen = idxSeenByPencilMarks(marked);
					if(marked.length >= 1) newSeen.push.apply(newSeen, box);
					seen.push.apply(seen, idxFilterSeen(marked, newSeen));
				});
			seen = [...new Set(seen)];
			this.select(seen.map(idx => cells[idx]));
		};
		P.handleButton = function(event) {
			//console.info('App.handleButton(event);', event.type, event.target && event.target.dataset['control']);
			const prev = this.prevButtonEvent;
			if((prev !== undefined) &&
				(prev.target === event.target) &&
				(prev.type.match(/touch/) && event.type.match(/mouse/))) {
				return;
			}
			this.prevButtonEvent = event;
			if(event.clientX === 0 && event.clientY === 0) return; // Detect simulated clicks after spacebar on Firefox
			if(event.repeat) return;
			if(event.type === 'keydown' && event.code !== 'Enter') return;
			this.currentEvent = event;
			event.stopPropagation();
			event.preventDefault();
			let control = event.target.dataset['control'], controlValue = event.target.dataset['value'];

			// Special, select all options hotkey
			if(control === 'value' && this.puzzle.selectedCells.length === 0 && event.shiftKey && event.altKey) {
				return this.specialSelectAllSeen(controlValue);
			}

			if(this.getToolNames().includes(control)) {
				this.changeTool(control);
			}
			switch(control) {
				case 'value': this.doPressDigit(controlValue); break;
				case 'delete': this.act({type: 'clear', arg: this.tool}); break;
				case 'video': this.openYoutubeVideo(); break;
				case 'setting-back': this.closeSettings(event); break;
			}
			this.trigger(`control-${control}`, event);
		};
		P.handleButtonUp = function(event) {
			event.preventDefault();
		};
	// New Features
		P.loadColorScheme = function(colors = {}) {
			console.info('App.loadColorScheme(colors);', JSON.stringify(colors));
			console.log('  colors:', colors);
			// CSS
			let css = document.querySelector('style#colorSchemeStyle');
			if(css === null) {
				css = document.head.appendChild(Object.assign(document.createElement('style'), {id: 'colorSchemeStyle'}));
			}
			css.textContent = '';
			console.log(css);
			for(let i = 0; i <= 9; i++) {
				css.textContent += `.colour-${i} { fill: ${colors['color_' + i]}; }\n`;
			}
			console.log(css);
		};
		P.initSudorkle = function(puzzle) {
			const handleAct = (action) => {
				const {puzzle} = this;
				if(action.type !== 'value' || puzzle.errorsVisible || !puzzle.isCompleted()) {
					return this.sudorkleHide();
				}
				this.sudorkleShow();
			};
			if(puzzle.metadata.sudorkle) {
				this.on('act', handleAct)
			}
		};
		P.sudorkleParse = function() {
			//'r2c2#c9b458:T r2c3#69aa64:E r2c4#787c7e:S r2c5#787c7e:T'
			return this.currentPuzzle.metadata.sudorkle.split(/\s+/)
				.map(ref => ref.match(/r([0-9+])c([0-9+])(#[a-zA-Z0-9]+)(?:\:(\S+))?/))
				.map(([ref, row, col, bg, symb]) => [parseFloat(row) - 1, parseFloat(col) - 1, bg, symb]);
		};
		P.sudorkleHide = function() {
			let sudorkleElem = document.querySelector('#sudorkle');
			if(sudorkleElem === null) return;
			document.querySelectorAll('#sudorkle g[data-animation="flip-in"]')
				.forEach(elem => elem.dataset['animation'] = 'flip-out');
			setTimeout(() => document.querySelector('#sudorkle').remove(), 250);
		};
		P.sudorkleShow = function() {
			let sudorkleCells = this.sudorkleParse();
			let {svgRenderer} = this;
			let layer = svgRenderer.addLayer('sudorkle');
			let styleElem = document.createElementNS(svgRenderer.getElem().namespaceURI, 'style');
			layer.appendChild(styleElem);
			styleElem.textContent = `
				#sudorkle g * {
					transform-origin: ${0.5 * SvgRenderer.CellSize}px ${0.5 * SvgRenderer.CellSize}px;
					transform: rotateX(-90deg);
					animation-duration: 250ms;
					animation-timing-function: ease-in;
				}
				#sudorkle g[data-animation="flip-in"] * {
					animation-name: FlipIn;
					transform: rotateX(0);
				}
				#sudorkle g[data-animation="flip-out"] * {
					animation-name: FlipOut;
					transform: rotateX(-90deg);
				}
				@keyframes FlipIn {
					0% { transform: rotateX(-90deg); }
					100% { transform: rotateX(0); }
				}
				@keyframes FlipOut {
					0% { transform: rotateX(0); }
					100% { transform: rotateX(-90deg); }
				}
			`;
			const renderSudorkle = (opts) => {
				let {row, col, text, textColor, backgroundColor} = opts;
				if(text === undefined) {
					let cell = this.puzzle.grid.getCell(row, col);
					text = cell.getVal();
				}
				let part = svgRenderer.renderPart({
					target: 'sudorkle', type: 'g',
					attr: {
						transform: `translate(${Number(col) * SvgRenderer.CellSize}, ${Number(row) * SvgRenderer.CellSize})`
					}
				});
				let rectElem = svgRenderer.renderPart({
					target: 'sudorkle',
					type: 'rect',
					attr: {
						fill: backgroundColor,
						x: 0, y: 0,
						width: SvgRenderer.CellSize, height: SvgRenderer.CellSize,
						'stroke-width': 2, stroke: '#fff'
					}
				});
				let textElem = svgRenderer.renderText({
					target: 'sudorkle',
					class: 'cell-value',
					center: [0.5, 0.5],
					width: 1, height: 1,
					text: text,
					style: `fill: ${textColor}; color: ${textColor};`
				});
				part.appendChild(rectElem);
				part.appendChild(textElem);
				return part;
			};
			let staggerMs = 100;
			sudorkleCells.forEach(([row, col, backgroundColor, text], idx) => {
				let elem = renderSudorkle({row, col, text, backgroundColor, textColor: '#fff'});
				setTimeout(() => elem.dataset['animation'] = 'flip-in', idx * staggerMs);
			});
		};
	return App;
})();

function show404Error(err) {
	console.error('show404Error due to:', err);
	document.title === `404 Page Not Found - Sven's SudokuPad`;
	var appElem = document.querySelector('.app');
	if(appElem) appElem.parentElement.removeChild(appElem);
	var bodyElem = document.querySelector('body');
	bodyElem.innerHTML =
	`<div id="msgNotFound">
	<table class="cell-value">
		<tr><td></td><td></td><td></td></tr>
		<tr><td>4</td><td>0</td><td>4</td></tr>
		<tr><td></td><td></td><td></td></tr>
	</table>
	<p>Sorry, it looks like that puzzle doesn't exist!</p>
	</div>` + bodyElem.innerHTML;
}

function showErrorPage(opts) {
	let {
		code = 404,
		title = '404 Page Not Found',
		msg = 'Sorry, it looks like that puzzle doesn\'t exist!',
		err
	} = (opts || {});
	document.title = `${title} - Sven's SudokuPad`;
	var appElem = document.querySelector('.app');
	if(appElem) appElem.parentElement.removeChild(appElem);
	var bodyElem = document.querySelector('body');
	let codeDigits = String(code).padStart(3, ' ').split('');
	bodyElem.innerHTML =
	`<div id="msgNotFound">
	<h1 style="font-size:1.4rem">${title}</h1>
	<table class="cell-value">
		<tr><td></td><td></td><td></td></tr>
		<tr><td>${codeDigits[0]}</td><td>${codeDigits[1]}</td><td>${codeDigits[2]}</td></tr>
		<tr><td></td><td></td><td></td></tr>
	</table>
	<p>${msg}</p>
	</div>` + bodyElem.innerHTML;
	try {
		Framework.trackError(`showErrorPage: ${(err && err.message) || msg}`);
	}
	catch(err) {
		console.error('Error in track(error):', err);
	}
}

function getPuzzleId(puzzleId = '') {
	var urlQueryPuzzleId = decodeURIComponent(document.location.search.replace(/^\?.*puzzleid=([^&]+).*|.*/, '$1'));
	var urlPathPuzzleId = decodeURIComponent((document.location.pathname.match(/^\/(?:sudoku\/)?(.+)$/) || [])[1]);
	if(typeof puzzleId === 'string' && puzzleId !== '') {
		//Reading puzzleId from pre-set variable: puzzleid = <puzzleId>
	}
	else if(typeof urlQueryPuzzleId === 'string' && urlQueryPuzzleId !== '') {
		// Reading puzzleId from url query string: ?puzzleid=<puzzleId>
		puzzleId = urlQueryPuzzleId;
	}
	else if(typeof urlPathPuzzleId === 'string' && urlPathPuzzleId !== '') {
		// Reading puzzleId from url path: /sudoku/<puzzleId>
		puzzleId = urlPathPuzzleId;
	}
	puzzleId = (puzzleId.match(rePuzzleId) || [])[0];
	return puzzleId;
}

const RC = {
	isEqual: (a = {}, b = {}) => a.r === b.r && a.c === b.c,
	round: a => ({r: Math.floor(a.r), c: Math.floor(a.c)}),
	sign: a => ({r: Math.sign(a.r), c: Math.sign(a.c)}),
	add: (a, b) => ({r: a.r + b.r, c: a.c + b.c}),
	addScalar: (a, scalar) => ({r: a.r + scalar, c: a.c + scalar}),
	sub: (a, b) => ({r: a.r - b.r, c: a.c - b.c}),
	mulScalar: (a, scalar) => ({r: a.r * scalar, c: a.c * scalar}),
	mid: (a, b) => ({r: 0.5 * (a.r + b.r), c: 0.5 * (a.c + b.c)}),
	dist: (a, b) => calcDistanceArr([a.r, a.c], [b.r, b.c]),
	toArr: (a) => [a.r, a.c],
	toString: a => `R${a.r.toFixed(2)}C${a.c.toFixed(2)}`,
	fromCell: cell => ({r: cell.row, c: cell.col}),
	vh: (a, b) => {
		let dc = b.c - a.c, dr = b.r - a.r;
		if(Math.abs(dr) >= Math.abs(dc)) {
			dr = Math.sign(dr); dc = 0;
		}
		else {
			dr = 0; dc = Math.sign(dc);
		}
		return {r: dr, c: dc};
	},
	pathTowards: (start, end) => {
		let path = [start];
		let midDist, prevRC, nextRC;
		do {
			prevRC = path[path.length - 1];
			nextRC = RC.add(prevRC, getVH(prevRC, end));
			midDist = RC.dist(RC.mid(prevRC, nextRC), end);
			path.push(nextRC);
		} while (midDist > 0.5);
		return path;
	},
	segsTowards: (prevRC, targetRC) => {
		let segs = [], nextRC, vhRC, nextSeg, distSeg, prevDist, nextDist;
		nextRC = prevRC;
		nextDist = RC.dist(nextRC, targetRC);
		do {
			if(nextSeg) segs.push(nextSeg);
			prevRC = nextRC;
			vhRC = RC.mulScalar(RC.vh(prevRC, targetRC), 0.5);
			nextSeg = RC.add(prevRC, vhRC);
			nextRC = RC.add(nextSeg, vhRC);
			prevDist = nextDist;
			nextDist = RC.dist(nextRC, targetRC);
		}
		while(prevDist > nextDist);
		return segs;
	},
	containsRC: (path, rc) => {
		for(let i = 0, len = path.length; i < len; i++) {
			if(RC.isEqual(path[i], rc)) return true;
		}
		return false;
	},
};

function testSolver(puzzle81) {
	if(puzzle81 === undefined) {
		puzzle81 = PuzzleTools.unzip(app.createClassicSudoku()).replace(/[^1-9]/g, '.');
	}
	let solver = createSolver(puzzle81);

	console.time('find first solution');
	let firstSolution = solver.findSolutions(1).pop();
	console.timeEnd('find first solution');
	console.log('firstSolution:', firstSolution);
	
	console.time('check multiple solutions');
	let hasMoreThanOneSolution = solver.findSolutions(2).length > 1;
	console.timeEnd('check multiple solutions');
	console.log('hasMoreThanOneSolution:', hasMoreThanOneSolution);
	
	console.time('find all solutions');
	let solutions = solver.findSolutions();
	console.timeEnd('find all solutions');
	console.log('solutions:', solutions);
	
	solver.showState(app, firstSolution);

	window.solver = solver;
}

function ensureLocalStorageQuota() {
	const minStorageSize = 200000;
	let quotaAvailable = testLocalStorageQuota(minStorageSize);
	if(quotaAvailable) return;
	let progressData = [];
	let ls = localStorage;
	for(var i = 0, len = ls.length; i < len; i++) {
		let key = ls.key(i);
		if(key.match(/^progress_/) === null) continue;
		let item = ls.getItem(key);
		try {
			let json = JSON.parse(item);
			if(json.time) {
				let date = new Date(json.time || 0);
				progressData.push({key, size: key.length + item.length, date});
			}
		}
		catch(err) {
			Framework.trackError(`ensureLocalStorageQuota: ${(err||{}).message}`);
		}
	}
	progressData.sort((a, b) => a.date - b.date);
	let totalSize = 0;
	for(var i = 0, len = progressData.length; i < len; i++) {
		totalSize += progressData[i].size;
		if(totalSize > minStorageSize) break;
	}
	let oldData = progressData.slice(0, i + 1),
			oldestDate = oldData[0].date.toISOString().split('T')[0],
			newestDate = oldData[oldData.length - 1].date.toISOString().split('T')[0];
	const handleButton = button => {
		if(/^Save All/.test(button)) {
			Framework.features.replaysave.handleDownloadReplays();
			let btnEl = document.querySelectorAll('.dialog-options button')[1];
			btnEl.textContent = 'Saved!';
			btnEl.disabled = true;
		}
		else if(/^Delete/.test(button)) {
			Framework.trackError(`ensureLocalStorageQuota: free storage quota`);
			console.warn('Erasing old progress data from localStorage...');
			oldData.forEach(({key}) => localStorage.removeItem(key));
			Framework.closeDialog();
		}
		else {
			Framework.closeDialog();
		}
	};
	Framework.closeDialog();
	Framework.showDialog({
		parts: [
			{tag: 'title', innerHTML: '<span class="emoji">⚠</span> You have too many old puzzles! <span class="emoji">⚠</span>'},
			{tag: 'text', innerHTML: `We need to delete progress for <strong>${oldData.length} puzzles</strong> (out of ${progressData.length}).</br>From <strong>${oldestDate}</strong> to <strong>${newestDate}</strong>.`},
			{tag: 'text', innerHTML: `If you do not proceed, no new progress can be recorded.`},
			{tag: 'options', options: [`Delete Old Progress`, 'Save All Progress to File', 'Cancel']},
		],
		autoClose: false,
		onButton: handleButton,
		centerOverBoard: true
	});
}

async function createPuzzleWithSolution(puzzleId, solution) {
	const {app: {puzzle}} = Framework,
				{compressPuzzle, addSolution} = loadFPuzzle,
				{zip} = PuzzleZipper,
				{getPuzzleFormat, stripPuzzleFormat, fetchPuzzle, parsePuzzleData} = PuzzleLoader,
				reMetaSol = /^solution: /, reBlankSolution = /^[^0-9?]*$/;
	if(solution === undefined) solution = puzzle.toP81();
	if(reBlankSolution.test(solution)) throw new Error('Current solution doesn\'t appear to include any digits.');
	puzzleId = await fetchPuzzle(puzzleId || getPuzzleId());
	switch(getPuzzleFormat(puzzleId)) {
		case 'fpuz': return 'fpuz' + addSolution(stripPuzzleFormat(puzzleId), solution);
		default:
			const puzzle = await parsePuzzleData(puzzleId);
			return 'scl' + compressPuzzle(JSON.stringify(Object.assign(puzzle, {
				cages: [
					...(puzzle.cages || []).filter(({value}) => !reMetaSol.test(value)),
					{value: `solution: ${solution}`}
				],
				metadata: Object.assign({}, puzzle.metadata, {solution})
			})));
	}
	throw new Error('Unable to create new puzzle. Please try again, or contact support.');
};

async function openPuzzleWithSolution(puzzleId, solution) {
	try {
		let puzzleWithSolution = await createPuzzleWithSolution(puzzleId, solution);
		if(puzzleWithSolution === undefined) throw new Error('Unable to create new puzzle. Please try again, or contact support.');
		document.location = `${document.location.origin.replace('app.crackingthecryptic.com', 'sudokupad.app')}/${puzzleWithSolution}`;
	}
	catch(err) {
		console.error('openPuzzleWithSolution:', err);
		Framework.showAlert(`Error: ${err.message}`);
	}
}

function handleNewLinkWithSolution(event) {
	openPuzzleWithSolution();
}

async function handleDOMContentLoaded() {
	const loadPuzzle = async (puzzleId = '') => {
		const {parsePuzzleData, fetchPuzzle} = PuzzleLoader, {app} = Framework;
		puzzleId = await fetchPuzzle(puzzleId);
		let ctcPuzzle = await parsePuzzleData(puzzleId);
		await app.loadCTCPuzzle(ctcPuzzle);
	};
	try {
		const app = Framework.app = new App();
		createToolButtons();
		createAppButtons();
		createAuxButtons();
		createAppSettings();
		createAppMenu();
		// TODO: Implement loading of settings and features ahead of initialization!
		// Likely due to not all settings ready in time as loaded async in queue
		await sleep(0)();
		app.init();
		document.querySelector('.controls-info').style.display = 'none';
		await loadPuzzle(getPuzzleId());
		if(Framework.getSetting('hidesolved') && app.puzzle.isCompleted()) app.showPuzzlePreviouslySolvedDialog();
		setTimeout(ensureLocalStorageQuota, 100);
	}
	catch(err) {
		console.error('Error in handleDOMContentLoaded():', err);
		showErrorPage({code: 404, title: '404 Puzzle Not Found', err});
	}
}


//window.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
(() => {
	let intervalId = setInterval(() => {
		if(document.readyState !== 'complete') return;
		clearInterval(intervalId);
		handleDOMContentLoaded();
	}, 10);
})();