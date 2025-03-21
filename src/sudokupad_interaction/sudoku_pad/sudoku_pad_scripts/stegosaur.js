/*!
Author: Sven Neumann <killroy@gmail.com>
*/

const Stegosaur = (() => {
	const strToData = str => LZipper.compact256(str).split('').map(c => c.charCodeAt(0) & 0xff);
	const dataToStr = dat => LZipper.expand256(dat.map(b => String.fromCharCode(b)).join(''));
	const bytesToBits = bytes => [].concat.apply([], bytes.map(b => b.toString(2).padStart(8).split('').map(Number)));
	const bitsToBytes = bits => bits.join('').match(/.{8}/g).map(s => parseInt(s, 2));
	const bitsToInt16 = bits => { let bytes = bitsToBytes(bits); return (bytes[0] << 8) | bytes[1]; };
	const int16ToBytes = num => [(num >> 8) & 0xff, num & 0xff];
	const setBit = (val, bit) => val & 0b11111000 | (bit === 1 ? 0b00000110 : 0b00000001);
	const getBit = val => (val & 0b111) > 2;
	const alphaThreshold = 128;
	const writeBytes = (d, data, start = 0) => {
		let bits = bytesToBits(data), pos = 0;
		for(var i = start, len = d.length; i < len; i++) {
			if(d[i | 0b11] > alphaThreshold) {
				d[i] = setBit(d[i], bits[pos]);
				pos++;
				if(pos >= bits.length) break;
			}
		}
		return i + 1;
	};
	const encodeData = (canvas, data) => {
		let ctx = canvas.getContext('2d'), id = ctx.getImageData(0, 0, canvas.width, canvas.height), d = id.data;
		let cur = 0;
		cur = writeBytes(d, int16ToBytes(data.length), cur);
		cur = writeBytes(d, data, cur);
		ctx.putImageData(id, 0, 0);
		return canvas;
	};
	const readBits = (d, count, bits = [], start = 0) => {
		for(var i = start, len = d.length; i < len; i++) {
			if(d[i | 0b11] > alphaThreshold) {
				let bit = getBit(d[i]) >= 1 && 1 || 0;
				bits.push(bit);
				if(bits.length >= count) break;
			}
		}
		return i + 1;
	};
	const decodeData = (canvas) => {
		let ctx = canvas.getContext('2d'), id = ctx.getImageData(0, 0, canvas.width, canvas.height), d = id.data;
		let bits = [], cur = 0;
		cur = readBits(d, 16, bits, cur);
		let dataLen = bitsToInt16(bits);
		bits.length = 0;
		cur = readBits(d, dataLen << 3, bits, cur);
		return bitsToBytes(bits);
	};

	return {
		encode: (canvas, str) => encodeData(canvas, strToData(str)),
		decode: (canvas) => dataToStr(decodeData(canvas)),
	};
})();