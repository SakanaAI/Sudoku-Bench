const Framework = (() => {

	function Framework() {}
	const F = Framework, P = Object.assign(F.prototype, {constructor: F});
	PortableEvents.mixin(F);
	F.SettingsKey = 'settings';
	F.icons = {
		toolNormal: `<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M18 19H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1zm1-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/><g transform="translate(7.75 17.5) scale(0.0075 -0.0075)"><path d="M832 877q0 152 -28 247.5t-77 147.5q-44 48 -89 66t-99 18q-123 0 -196 -88t-73 -255q0 -94 24 -155t78 -105q38 -31 86 -41.5t103 -10.5q64 0 138 22.5t129 59.5q1 15 2.5 39.5t1.5 54.5zM67 1005q0 115 37.5 210t102.5 164q62 66 151.5 103t181.5 37q103 0 186.5 -34.5 t144.5 -99.5q77 -82 119.5 -215t42.5 -336q0 -185 -41.5 -350.5t-122.5 -274.5q-86 -116 -206.5 -177t-297.5 -61q-40 0 -85 4.5t-84 16.5v191h10q25 -14 78 -27t108 -13q196 0 308 129t127 369q-80 -54 -152.5 -79t-157.5 -25q-83 0 -151 18t-137 70q-80 61 -121 154.5 t-41 225.5z" /></g></svg>`,
		toolCorner: `<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="currentColor"><path d="M18 19H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1zm1-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/><path transform="translate(6.2 11.2) scale(0.0035 -0.0035)" d="M1179 0h-984v260h314v787h-314v243q69 0 137 9t109 29q48 24 74.5 64.5t30.5 100.5h326v-1233h307v-260z" /><path transform="translate(13.2 11.2) scale(0.0035 -0.0035)" d="M1245 0h-1094v243q139 110 249.5 208t194.5 186q109 115 158 202t49 179q0 104 -62 159.5t-173 55.5q-57 0 -107.5 -14t-102.5 -36q-51 -23 -87 -47l-54 -36h-29v325q63 30 197 61.5t258 31.5q265 0 401.5 -118t136.5 -332q0 -132 -62 -258.5t-206 -271.5 q-90 -89 -175 -158.5t-123 -98.5h631v-281z" /><path transform="translate(6.2 18) scale(0.0035 -0.0035)" d="M1208 451q0 -109 -40.5 -199t-118.5 -153q-79 -63 -185.5 -96.5t-259.5 -33.5q-174 0 -298.5 29t-202.5 65v323h36q82 -52 192.5 -90t201.5 -38q54 0 117.5 9.5t106.5 41.5q34 25 54.5 61.5t20.5 103.5q0 66 -29 101.5t-77 51.5q-48 17 -115 19t-118 2h-64v262h59 q68 0 125 6t97 24q40 19 62.5 53t22.5 92q0 45 -21 73.5t-52 44.5q-36 18 -84 24t-82 6q-55 0 -112 -13t-111 -33q-42 -16 -88 -41.5t-68 -38.5h-31v319q77 33 207.5 63.5t266.5 30.5q133 0 230.5 -23t166.5 -67q76 -47 114 -119.5t38 -163.5q0 -127 -73.5 -222.5 t-193.5 -123.5v-14q53 -8 103.5 -27t98.5 -62q45 -39 74.5 -100.5t29.5 -146.5z" /></svg>`,
		toolCenter: `<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="currentColor"><path d="M18 19H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1zm1-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/><path transform="translate(7.6, 14.5) scale(0.0035 -0.0035)" d="M1179 0h-984v260h314v787h-314v243q69 0 137 9t109 29q48 24 74.5 64.5t30.5 100.5h326v-1233h307v-260z" /><path transform="translate(11.6, 14.5) scale(0.0035 -0.0035)" d="M1245 0h-1094v243q139 110 249.5 208t194.5 186q109 115 158 202t49 179q0 104 -62 159.5t-173 55.5q-57 0 -107.5 -14t-102.5 -36q-51 -23 -87 -47l-54 -36h-29v325q63 30 197 61.5t258 31.5q265 0 401.5 -118t136.5 -332q0 -132 -62 -258.5t-206 -271.5 q-90 -89 -175 -158.5t-123 -98.5h631v-281z" /></svg>`,
		toolColour: `<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="currentColor"><g stroke="#0003" stroke-width=".3"><path d="m12 12 3.36-7.2h3.84v3.84l-7.2 3.36" fill="#e6e6e6"/><path d="m12 12 7.2-3.36v5.29l-7.2-1.93" fill="#b0b0b0"/><path d="m12 12 7.2 1.93v5.27h-2.16l-5.04-7.2" fill="#505050"/><path d="m12 12 5.04 7.2h-5.67l0.63-7.2" fill="#d1efa5"/><path d="m12 12-0.63 7.2h-6.57l7.2-7.2" fill="#f1b0f6"/><path d="m12 12-7.2 7.2v-6.57l7.2-0.63" fill="#f3b48f"/><path d="m12 12-7.2 0.63v-5.67l7.2 5.04" fill="#f39390"/><path d="m12 12-7.2-5.04v-2.16h5.27l1.93 7.2" fill="#fae799"/><path d="m12 12-1.93-7.2h5.29l-3.36 7.2" fill="#8ac1f9"/></g><path d="M18 19H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1zm1-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>`,
		toolSelect: `<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8.5 8.5h-5.2v-4.2c0-.55.45-1 1-1h4.2v5.2zM3.3 9.3h5.2v5.2h-5.2v-5.2zM8.5 20.5h-4.2c-.55 0-1-.45-1-1v-4.2h5.2v5.2zM9.3 3.3h5.2v5.2h-5.2v-5.2zM9.3 9.3h5.2v5.2h-5.2v-5.2zM9.3 15.3h5.2v5.2h-5.2v-5.2zM20.5 8.5h-5.2v-5.2h4.2c.55 0 1 .45 1 1v4.2zM15.3 9.3h5.2v5.2h-5.2v-5.2zM19.5 20.5h-4.2v-5.2h5.2v4.2c0 .55-.45 1-1 1z"/><path transform="translate(2.9, 2.9) scale(0.0935)" fill="rgba(255, 215, 0, 0.5)" stroke="rgba(0, 126, 255, 1)" stroke-width="15" stroke-linecap="butt" stroke-linejoin="round" d="M138 10L182 10L182 118L138 118 ZM10 74L54 74L54 118L10 118 ZM74 138L118 138L118 182L74 182 Z"></path></svg>`,
		toolPen: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M18 19H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1zm1-16H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"></path><path d="M12 12 L20 12" stroke="currentColor" stroke-linecap="round" stroke-width="2"></path><path d="M12 12 L12 20" stroke="currentColor" stroke-linecap="round" stroke-width="2"></path><circle cx="12" cy="12" r="5" stroke-width="1" stroke="currentColor" fill="none"></circle></svg>`,
		back: '<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 24 24" fill="currentColor"><path d="M16.88,2.88L16.88,2.88c-0.49-0.49-1.28-0.49-1.77,0l-8.41,8.41c-0.39,0.39-0.39,1.02,0,1.41l8.41,8.41 c0.49,0.49,1.28,0.49,1.77,0l0,0c0.49-0.49,0.49-1.28,0-1.77L9.54,12l7.35-7.35C17.37,4.16,17.37,3.37,16.88,2.88z"/></svg>',
		forward: '<svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 24 24" fill="currentColor"><path d="M24 24H0V0h24v24z" fill="none" opacity=".87"/><path d="M7.38 21.01c.49.49 1.28.49 1.77 0l8.31-8.31c.39-.39.39-1.02 0-1.41L9.15 2.98c-.49-.49-1.28-.49-1.77 0s-.49 1.28 0 1.77L14.62 12l-7.25 7.25c-.48.48-.48 1.28.01 1.76z"/></svg>',
		settings: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="25" height="25"><path fill="currentColor" d="M487.4 315.7l-42.6-24.6c4.3-23.2 4.3-47 0-70.2l42.6-24.6c4.9-2.8 7.1-8.6 5.5-14-11.1-35.6-30-67.8-54.7-94.6-3.8-4.1-10-5.1-14.8-2.3L380.8 110c-17.9-15.4-38.5-27.3-60.8-35.1V25.8c0-5.6-3.9-10.5-9.4-11.7-36.7-8.2-74.3-7.8-109.2 0-5.5 1.2-9.4 6.1-9.4 11.7V75c-22.2 7.9-42.8 19.8-60.8 35.1L88.7 85.5c-4.9-2.8-11-1.9-14.8 2.3-24.7 26.7-43.6 58.9-54.7 94.6-1.7 5.4.6 11.2 5.5 14L67.3 221c-4.3 23.2-4.3 47 0 70.2l-42.6 24.6c-4.9 2.8-7.1 8.6-5.5 14 11.1 35.6 30 67.8 54.7 94.6 3.8 4.1 10 5.1 14.8 2.3l42.6-24.6c17.9 15.4 38.5 27.3 60.8 35.1v49.2c0 5.6 3.9 10.5 9.4 11.7 36.7 8.2 74.3 7.8 109.2 0 5.5-1.2 9.4-6.1 9.4-11.7v-49.2c22.2-7.9 42.8-19.8 60.8-35.1l42.6 24.6c4.9 2.8 11 1.9 14.8-2.3 24.7-26.7 43.6-58.9 54.7-94.6 1.5-5.5-.7-11.3-5.6-14.1zM256 336c-44.1 0-80-35.9-80-80s35.9-80 80-80 80 35.9 80 80-35.9 80-80 80z"></path></svg>',
		undo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L3.71 8.71C3.08 8.08 2 8.52 2 9.41V15c0 .55.45 1 1 1h5.59c.89 0 1.34-1.08.71-1.71l-1.91-1.91c1.39-1.16 3.16-1.88 5.12-1.88 3.16 0 5.89 1.84 7.19 4.5.27.56.91.84 1.5.64.71-.23 1.07-1.04.75-1.72C20.23 10.42 16.65 8 12.5 8z"/></svg>',
		redo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.16 0-7.74 2.42-9.44 5.93-.32.67.04 1.47.75 1.71.59.2 1.23-.08 1.5-.64 1.3-2.66 4.03-4.5 7.19-4.5 1.95 0 3.73.72 5.12 1.88l-1.91 1.91c-.63.63-.19 1.71.7 1.71H21c.55 0 1-.45 1-1V9.41c0-.89-1.08-1.34-1.71-.71l-1.89 1.9z"/></svg>',
		restart: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><mask id="cutout"><rect width="100%" height="100%" fill="#fff"/><path d="M12 9c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1s-1-.45-1-1V10c0-.55.45-1 1-1zM12 21zm1-3h-2v-2h2v2z" stroke-width="1.5" stroke="#000" fill="#000"/></mask><path mask="url(#cutout)" d="M12 5V2.21c0-.45-.54-.67-.85-.35l-3.8 3.79c-.2.2-.2.51 0 .71l3.79 3.79c.32.31.86.09.86-.36V7c3.73 0 6.68 3.42 5.86 7.29-.47 2.27-2.31 4.1-4.57 4.57-3.57.75-6.75-1.7-7.23-5.01-.07-.48-.49-.85-.98-.85-.6 0-1.08.53-1 1.13.62 4.39 4.8 7.64 9.53 6.72 3.12-.61 5.63-3.12 6.24-6.24C20.84 9.48 16.94 5 12 5z"/><path d="M12 9c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1s-1-.45-1-1V10c0-.55.45-1 1-1zM12 21zm1-3h-2v-2h2v2z"/></svg>',
		check: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.17L5.53 12.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l4.18 4.18c.39.39 1.02.39 1.41 0L20.29 7.71c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0L9 16.17z"/></svg>',
		rules: '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm1 14H8c-.55 0-1-.45-1-1s.45-1 1-1h5c.55 0 1 .45 1 1s-.45 1-1 1zm3-4H8c-.55 0-1-.45-1-1s.45-1 1-1h8c.55 0 1 .45 1 1s-.45 1-1 1zm0-4H8c-.55 0-1-.45-1-1s.45-1 1-1h8c.55 0 1 .45 1 1s-.45 1-1 1z"/></svg>',
		info: '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2zm1.61-9.96c-2.06-.3-3.88.97-4.43 2.79-.18.58.26 1.17.87 1.17h.2c.41 0 .74-.29.88-.67.32-.89 1.27-1.5 2.3-1.28.95.2 1.65 1.13 1.57 2.1-.1 1.34-1.62 1.63-2.45 2.88 0 .01-.01.01-.01.02-.01.02-.02.03-.03.05-.09.15-.18.32-.25.5-.01.03-.03.05-.04.08-.01.02-.01.04-.02.07-.12.34-.2.75-.2 1.25h2c0-.42.11-.77.28-1.07.02-.03.03-.06.05-.09.08-.14.18-.27.28-.39.01-.01.02-.03.03-.04.1-.12.21-.23.33-.34.96-.91 2.26-1.65 1.99-3.56-.24-1.74-1.61-3.21-3.35-3.47z"/></svg>',
		fullscreenOn: '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M6 14c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h3c.55 0 1-.45 1-1s-.45-1-1-1H7v-2c0-.55-.45-1-1-1zm0-4c.55 0 1-.45 1-1V7h2c.55 0 1-.45 1-1s-.45-1-1-1H6c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1zm11 7h-2c-.55 0-1 .45-1 1s.45 1 1 1h3c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1s-1 .45-1 1v2zM14 6c0 .55.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1V6c0-.55-.45-1-1-1h-3c-.55 0-1 .45-1 1z"/></svg>',
		fullscreenOff: '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M6 16h2v2c0 .55.45 1 1 1s1-.45 1-1v-3c0-.55-.45-1-1-1H6c-.55 0-1 .45-1 1s.45 1 1 1zm2-8H6c-.55 0-1 .45-1 1s.45 1 1 1h3c.55 0 1-.45 1-1V6c0-.55-.45-1-1-1s-1 .45-1 1v2zm7 11c.55 0 1-.45 1-1v-2h2c.55 0 1-.45 1-1s-.45-1-1-1h-3c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1zm1-11V6c0-.55-.45-1-1-1s-1 .45-1 1v3c0 .55.45 1 1 1h3c.55 0 1-.45 1-1s-.45-1-1-1h-2z"/></svg>',
		youtube: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 121.4 85" width="35" height="25"><path fill="currentColor" d="M 118.9,13.3 C 117.5,8.1 113.4,4 108.2,2.6 98.7,0 60.7,0 60.7,0 60.7,0 22.7,0 13.2,2.5 8.1,3.9 3.9,8.1 2.5,13.3 0,22.8 0,42.5 0,42.5 0,42.5 0,62.3 2.5,71.7 3.9,76.9 8,81 13.2,82.4 22.8,85 60.7,85 60.7,85 c 0,0 38,0 47.5,-2.5 5.2,-1.4 9.3,-5.5 10.7,-10.7 2.5,-9.5 2.5,-29.2 2.5,-29.2 0,0 0.1,-19.8 -2.5,-29.3 z"/><polygon points="80.2,42.5 48.6,24.3 48.6,60.7" style="fill:#ffffff"/></svg>',
		patreon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 180 180"><path fill="#f96753" d="M109 26a48 48 0 1 0 0 96 48 48 0 0 0 0-96"/><path fill="#052a49" d="M23 154V26h24v128z"/></svg>',
		itchio: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 245 221"><path d="M32 1C21 8 0 32 0 38v11c0 13 12 25 24 25 13 0 25-11 25-25 0 14 11 25 24 25 14 0 24-11 24-25 0 14 12 25 26 25 13 0 25-11 25-25 0 14 11 25 24 25 14 0 25-11 25-25 0 14 11 25 25 25 11 0 23-12 23-25V38c0-6-21-30-32-37A2306 2306 0 0 0 32 1zm65 67a28 28 0 0 1-5 6c-5 5-12 8-20 8a28 28 0 0 1-19-8l-5-6-5 6a29 29 0 0 1-20 8l-3-1-1 30v12c0 24-3 78 10 91 20 5 57 7 94 7s73-2 93-7c13-13 11-67 11-91v-12l-2-30-3 1a29 29 0 0 1-20-8l-5-6-4 6a28 28 0 0 1-20 8c-8 0-15-3-20-8a28 28 0 0 1-5-6 28 28 0 0 1-5 6 28 28 0 0 1-19 8h-2a28 28 0 0 1-20-8 28 28 0 0 1-5-6zM77 94c8 0 15 0 24 10l22-1 21 1c9-10 17-10 25-10 4 0 19 0 30 30l11 41c9 31-3 32-17 32-20-1-32-16-32-31a244 244 0 0 1-77 0c0 15-11 30-32 31-14 0-25-1-17-32l12-41c11-30 26-30 30-30zm46 24s-22 20-26 27l14-1v13h23v-13l14 1c-3-7-25-27-25-27z"/></svg>',
		copy: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M15 20H5V7c0-.55-.45-1-1-1s-1 .45-1 1v13c0 1.1.9 2 2 2h10c.55 0 1-.45 1-1s-.45-1-1-1zm5-4V4c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2zm-2 0H9V4h9v12z"/></svg>',
		edit: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M3 17.46v3.04c0 .28.22.5.5.5h3.04c.13 0 .26-.05.35-.15L17.81 9.94l-3.75-3.75L3.15 17.1c-.1.1-.15.22-.15.36zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
		link: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M17 7h-3c-.55 0-1 .45-1 1s.45 1 1 1h3c1.65 0 3 1.35 3 3s-1.35 3-3 3h-3c-.55 0-1 .45-1 1s.45 1 1 1h3c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-9 5c0 .55.45 1 1 1h6c.55 0 1-.45 1-1s-.45-1-1-1H9c-.55 0-1 .45-1 1zm2 3H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h3c.55 0 1-.45 1-1s-.45-1-1-1H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h3c.55 0 1-.45 1-1s-.45-1-1-1z"/></svg>',
		opennew: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M18 19H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h5c.55 0 1-.45 1-1s-.45-1-1-1H5c-1.11 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6c0-.55-.45-1-1-1s-1 .45-1 1v5c0 .55-.45 1-1 1zM14 4c0 .55.45 1 1 1h2.59l-9.13 9.13c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L19 6.41V9c0 .55.45 1 1 1s1-.45 1-1V4c0-.55-.45-1-1-1h-5c-.55 0-1 .45-1 1z"/></svg>',
		share: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>',
		download: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 13v5c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-5c0-.55-.45-1-1-1s-1 .45-1 1v6c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-6c0-.55-.45-1-1-1s-1 .45-1 1zm-6-.33l1.88-1.88c.39-.39 1.02-.39 1.41 0 .39.39.39 1.02 0 1.41l-3.59 3.59c-.39.39-1.02.39-1.41 0L7.7 12.2c-.39-.39-.39-1.02 0-1.41.39-.39 1.02-.39 1.41 0L11 12.67V4c0-.55.45-1 1-1s1 .45 1 1v8.67z"/></svg>',
		loadingThumb: '<svg xmlns="http://www.w3.org/2000/svg" stroke="currentColor" viewBox="-10 -10 110 110"><path d="M0 10h90M0 20h90M0 30h90M0 40h90M0 50h90M0 60h90M0 70h90M0 80h90M10 0v90M20 0v90M30 0v90M40 0v90M50 0v90M60 0v90M70 0v90M80 0v90" opacity=".3"/><path stroke-width="1.5" d="M0 30h90M0 60h90M30 0v90M60 0v90"/><rect width="90" height="90" fill="none" stroke-width="3" rx="10" ry="10"/><g fill="currentColor" stroke="none" transform="matrix(2.3 0 0 2.3 -1.3 -1.3)"><path d="M20.2 5.17a14.95 14.95 0 1 0 0 29.9 14.95 14.95 0 0 0 0-29.9zm0 26.58a11.63 11.63 0 1 1 0-23.27 11.63 11.63 0 0 1 0 23.27z" opacity=".3"/><path d="m26.01 10.05 1.66-2.87a14.85 14.85 0 0 0-7.47-2.01v3.31c2.12 0 4.1.58 5.81 1.57z"><animateTransform attributeName="transform" calcMode="spline" dur="2s" from="0 20 20" keySplines="0.6,0.5,0,0.8" keyTimes="0;1" repeatCount="indefinite" to="360 20 20" type="rotate"/></path></g></svg>',
	};
	F.html = {
		dialogsupportlinks: {class: 'supportlinks', innerHTML: `<div>Support this app:<br/><a href="https://youtube.svencodes.com">Youtube <span class="icon" style="color: #c00; vertical-align: middle">${Framework.icons.youtube}</span></a> / <a href="https://patreon.svencodes.com/">Patreon <span class="icon" style="vertical-align: middle;"">${Framework.icons.patreon}</span></a></div>`, style: 'font-size: 0.8rem; padding: 0 1rem; text-align: center; margin: 1.2rem 0;'},
	};
	F.LocalDataPrefix = 'svencodes';
	F.saveSettingsMinDelay = 500;
	F.saveSettingsMaxDelay = 2000;
	F.settingsInitialized = false;
	// Utility
		F.isHTMLElement = function(elem) {
			return typeof elem === 'object' && elem.nodeType === 1;
		};
		F.aabbOverlap = (b1, b2) =>
			(b2.x < b1.x + b1.width) && (b2.x + b2.width > b1.x) &&
			(b2.y < b1.y + b1.height) && (b2.y + b2.height > b1.y);
	// Storage
		F.makeDataKey = name => F.LocalDataPrefix + '_' + name;
		F.setData = function(name, val) {
			let dataKey = F.makeDataKey(name);
			if(val !== null && typeof val === 'object') val = JSON.stringify(val);
			return localStorage.setItem(dataKey, val);
		};
		F.getData = function(name) {
			let dataKey = F.makeDataKey(name);
			let res = localStorage.getItem(dataKey);
			try { res = JSON.parse(res); } catch(err) {}
			return res;
		};
		F.removeData = function(name) {
			let dataKey = F.makeDataKey(name);
			return localStorage.removeItem(dataKey);
		};
		F.upgradeLegacyData = function(keys = []) {
			keys.forEach(key => {
				let val = localStorage.getItem(key);
				if(val === null) return;
				F.setData(key, val);
				localStorage.removeItem(key);
			});
		};
	// App
		let __app, handleResolveApp, handleRejectApp;
		F.pApp = new Promise((resolve, reject) => {
			handleResolveApp = resolve;
			handleRejectApp = reject;
		});
		F.setApp = function(app) {
			if(__app !== app) handleResolveApp(__app = app);
			return F.pApp;
		};
		F.getApp = () => F.pApp;
		F.withApp = doFunc => F.pApp = F.pApp.then(doFunc).then(() => __app);
		Object.defineProperty(F, 'app', {
			set(app) {
				F.setApp(app);
				return __app;
			},
			get() { return __app; }
		});
	// Dialog
		F.ExtraProps = ['tag', 'parent', 'children', 'handler', 'label', 'action', 'class', 'content', 'attributes', 'dataset', 'options'];
		F.tagAliases = {
			title: 'h1',
			text: 'p'
		};
		const getEventProp = (e, prop) => e[prop] || ([...(e.touches || []), ...(e.changedTouches || [])][0] || {})[prop];
		const reEventTypeSource = /^(mouse|touch)/;
		F.DupeEventMaxDt = 200;
		F.DupeEventMaxDxy = 2;
		F.cancelDupeEvent = function(e1, e2) {
			if(e1 === undefined || e2 === undefined) return false;
			let t1 = (e1.type.match(reEventTypeSource) || [])[0], t2 = (e2.type.match(reEventTypeSource) || [])[0];
			if(t1 === t2) return false;
			if(F.DupeEventMaxDt < Math.abs(e2.timeStamp - e1.timeStamp)) return false;
			if(F.DupeEventMaxDxy < getEventProp(e2, 'screenX') - getEventProp(e1, 'screenX')) return false;
			if(F.DupeEventMaxDxy < getEventProp(e2, 'screenY') - getEventProp(e1, 'screenY')) return false;
			//e2.preventDefault();
			e2.stopPropagation();
			return true;
		};
		F.handleWindowTouchstart = event => F.lastEventTouchstart = event;
		F.handleWindowMousedown = event => F.cancelDupeEvent(F.lastEventTouchstart, event);
		F.handleWindowTouchend = event => F.lastEventTouchend = event;
		F.handleWindowMouseup = event => F.cancelDupeEvent(F.lastEventTouchend, event);
		F.attachHandlers = function() {
			if(F.handlersAttached) return;
			F.handlersAttached = true;
			window.addEventListener('touchstart', F.handleWindowTouchstart, {capture: true});
			window.addEventListener('mousedown', F.handleWindowMousedown, {capture: true});
			window.addEventListener('touchend', F.handleWindowTouchend, {capture: true});
			window.addEventListener('mouseup', F.handleWindowMouseup, {capture: true});
		};
		F.handleButton = event => {
			const {onButton, autoClose} = F.dialogOpts;
			if(event) {
				event.stopPropagation();
				event.preventDefault();
				event.stopImmediatePropagation();
			}
			if(typeof onButton === 'function') onButton(event.target.textContent);
			if(autoClose !== false) F.closeDialog();
		};
		F.handleDialogCancel = event => {
			if(event) {
				event.stopPropagation();
				event.stopImmediatePropagation();
			}
			if(event.eventPhase === 2) {
				event.preventDefault();
				const {onCancel} = F.dialogOpts;
				F.closeDialog();
				if(typeof onCancel === 'function') onCancel();
			}
			return false;
		};
		F.dialogOptionButtons = (opts = {}) => {
			const {options, handler, parent} = opts;
			let optionsElem = F.createElem({tag: 'div', className: 'dialog-options', parent});
			options.forEach((opts = {}) => {
				if(typeof opts === 'string') opts = {content: opts};
				F.createElem(Object.assign(opts, {tag: 'button', parent: optionsElem, handler: F.handleButton}));
			});
			return optionsElem;
		};
		F.createToggle = (opts, extra) => {
			const {parent, handler} = extra;
			const labelOpts = {
				tag: 'label', title: opts.title, attributes: {for: opts.name},
				textContent: opts.textContent, innerHTML: opts.innerHTML
			};
			const checkOpts = Object.assign(
				{tag: 'input', type: 'checkbox',
					id: opts.name,
					checked: opts.value === true || undefined,
					title: extra.content || opts.title,
					className: 'setting-toggle'
				},
				opts,
				{value: undefined, textContent: undefined, innerHTML: undefined}
			);
			const toggleElem = F.createElem({parent, className: 'setting-item setting-toggle', children: [checkOpts, labelOpts]});
			const elem = toggleElem.children[0];
			if(typeof handler === 'function') {
				elem.addEventListener('change', handler, {passive: false});
			}
			return elem;
		};
		F.createMulti = (opts, extra) => {
			const {parent, handler} = extra;
			const labelOpts = {
				tag: 'label', title: opts.title, attributes: {for: opts.name},
				textContent: opts.textContent, innerHTML: opts.innerHTML
			};
			const selectOpts = Object.assign(
				{
					tag: 'select',
					value: opts.value,
					className: 'setting-multi',
					children: extra.options.map(opts => Object.assign({tag: 'option'}, opts, {style: undefined}))
				},
				Object.assign({}, opts, {style: undefined}),
				{value: undefined, textContent: undefined, innerHTML: undefined}
			);
			const multiOpts = {parent, className: 'setting-item setting-multi', children: [labelOpts, selectOpts]};
			if(opts.style) multiOpts.style = opts.style;
			const multiElem = F.createElem(multiOpts);
			const elem = multiElem.children[1];
			elem.value = opts.value;
			if(typeof handler === 'function') {
				elem.addEventListener('change', handler, {passive: false});
			}
			return elem;
		};
		F.createOptions = (opts, extra) => {
			const {parent, handler} = extra;
			let elemOpts = {
				tag: 'div', parent,
				className: 'dialog-options' + (opts.className ? ` ${opts.className}` : '')
			};
			if(opts.style) elemOpts.style = opts.style;
			let elem = F.createElem(elemOpts);
			extra.options.forEach((opts = {}) => {
				if(typeof opts === 'string') opts = {content: opts};
				F.createElem(Object.assign(opts, {tag: 'button', parent: elem, handler: opts.handler || F.handleButton}));
			});
			return elem;
		};
		F.createElem = opts => {
			// Handle native DOM element
			if(F.isHTMLElement(opts)) return opts;
			if(opts === null) return;
			opts = Object.assign({}, opts);
			Object.keys(opts).forEach(key => opts[key] === undefined ? delete opts[key] : null);
			const extra = F.ExtraProps.reduce((o, p) => {
				if(opts[p] !== undefined) o[p] = opts[p];
				delete opts[p];
				return o;
			}, {});
			let {tag = 'div', parent, handler, action} = extra;
			if(extra.class) opts.className = extra.class;
			if(extra.content) opts.textContent = extra.content;
			if(F.tagAliases[tag]) tag = F.tagAliases[tag];
			if(extra.label) {
				parent = F.createElem({tag: 'label', parent, title: extra.label, textContent: extra.label});
			}
			let elem = opts.elem;
			if(elem === undefined) {
				switch(tag) {
					case 'toggle':
						elem = F.createToggle(opts, extra);
						handler = parent = undefined;
						break;
					case 'multi':
						elem = F.createMulti(opts, extra);
						handler = parent = undefined;
						break;
					case 'options':
						elem = F.createOptions(opts, extra);
						break;
					default: elem = Object.assign(document.createElement(tag), opts);
				}
				if(typeof opts.onclick === 'function') elem.onclick = opts.onclick;
			}
			else {
				Object.assign(elem, opts);
			}
			if(extra.attributes) Object.keys(extra.attributes).forEach(key => elem.setAttribute(key, extra.attributes[key]));
			if(extra.dataset) Object.keys(extra.dataset).forEach(key => elem.dataset[key] = extra.dataset[key]);
			if(typeof parent === 'string') parent = document.querySelector(parent);
			if(parent) parent.appendChild(elem);
			if(action === 'close' && handler === undefined) handler = F.closeDialog;
			if(typeof handler === 'function') addDownEventHandler(elem, handler, {passive: false});
			if(Array.isArray(extra.children)) {
				extra.children.forEach(child => F.isHTMLElement(child)
					? elem.appendChild(child)
					: F.createElem(Object.assign({parent: elem}, child))
				);
			}
			return elem;
		};
		F.centerDialogOverBoard = () => {
			document.querySelector('.dialog-overlay').classList.add('centeroverboard');
		};
		F.handleKeyDown = event => {
			const cancelDialog = () => {
				const {onCancel} = F.dialogOpts;
				F.closeDialog();
				if(typeof onCancel === 'function') onCancel();
			};
			switch(event.code) {
				case 'Escape': cancelDialog(); break;
				case 'Space':
				case 'Enter':
				case 'NumpadEnter':
					let partOptions = F.dialogOpts.parts.find(part => part.tag === 'options') || {};
					if((partOptions.options || []).length === 1) cancelDialog();
					break;
			}
		};
		F.showDialog = (opts = {}) => {
			if(document.querySelectorAll('.dialog-overlay').length > 0) {
				return ;//console.warn('F.showDialog > Dialog already visible!');
			}
			F.dialogOpts = opts;
			let overlayElem, dialogElem;
			overlayElem = F.createElem({className: `dialog-overlay ${opts.overlayClass || ''}`});
			addDownEventHandler(overlayElem, F.handleDialogCancel, {passive: false});
			document.addEventListener('keydown', F.handleKeyDown, {passive: false});
			dialogElem = F.createElem({className: `dialog ${opts.dialogClass || ''}`, style: opts.style, parent: overlayElem});
			(opts.parts || [])
				.map(opts => F.createElem(Object.assign({parent: dialogElem}, opts)));
			document.body.appendChild(overlayElem);
			if(opts.overlayBlur) document.body.classList.add('overlay-visible');
			if(F.app) F.app.pauseInteractionHandlers();
			if(opts.centerOverBoard) F.centerDialogOverBoard();
			addHandler(window, 'resize', F.handleResize);
			F.handleResize();
			F.trigger('showdialog', F.dialogOpts);
		};
		F.closeDialog = event => {
			if(event) {
				event.stopPropagation();
				event.preventDefault();
				event.stopImmediatePropagation();
			}
			document.removeEventListener('keydown', F.handleKeyDown, {passive: false});
			let overlayElem = document.querySelector('.dialog-overlay');
			if(overlayElem === null) return;
			removeDownEventHandler(overlayElem, F.handleDialogCancel, {passive: false});
			document.body.classList.remove('overlay-visible');
			overlayElem.remove();
			// TODO: Clean up event handlers
			F.trigger('closedialog', F.dialogOpts);
			delete F.dialogOpts;
			if(F.app) F.app.unpauseInteractionHandlers();
			remHandler(window, 'resize', F.handleResize);
		};
		F.showAlert = (message, label = 'OK') => F.showDialog({parts: [
			{tag: 'text', content: message},
			{tag: 'options', options: [{tag: 'button', content: label, action: 'close'}]}
		]});
	// Buttons
		F.hasControlButton = name => {
			if(typeof name !== 'string' && (name || {}).name) name = name.name;
			return document.querySelectorAll(`#controls button[data-control="${name}"]`).length > 0;
		};
		F.addControlButton = (opts = {}) => {
			if(F.hasControlButton(opts)) return;// console.warn('F.addControlButton > button "%s" already exists.', opts.name);
			let btnElem = F.createElem({
				tag: 'button',
				id: `control-${opts.name}`,
				title: opts.title,
				innerHTML: opts.content,
				dataset: {control: opts.name},
				parent: opts.parent
			});
			return F.getApp()
				.then(app => {
					if(typeof opts.init === 'function') opts.init(app);
					if(typeof opts.onClick === 'function') {
						F.app.off(`control-${opts.name}`);
						F.app.on(`control-${opts.name}`, opts.onClick);
					}
					return btnElem;
				});
		};
		F.addButtons = (btns = []) => btns.forEach(F.addControlButton);
		F.removeControlButton = name => {
			if(typeof name !== 'string' && (name || {}).name) name = name.name;
			[...document.querySelectorAll(`#controls button[data-control="${name}"]`)].forEach(btn => btn.remove());
		};
		F.addAppButton = (opts = {}) => F.addControlButton(Object.assign({parent: '.controls-app'}, opts));
		F.addAppButtons = (btns = []) => btns.forEach(F.addAppButton);
		F.addAuxButton = (opts = {}) => F.addControlButton(Object.assign({parent: '.controls-aux'}, opts));
		F.addAuxButtons = (btns = []) => btns.forEach(F.addAuxButton);
		F.addToolButton = (opts = {}) => F.addControlButton(Object.assign({parent: '.controls-tool'}, opts));
		F.addToolButtons = (btns = []) => btns.forEach(F.addToolButton);
	// Tools
		F.addTool = function(opts) {
			if(opts.button) F.addToolButton(opts.button);
			if(opts.tool) F.app.addTool(opts.tool);
			F.app.refreshControls();
		};
		F.removeTool = function(name) {
			if(typeof name !== 'string' && (name || {}).tool) name = name.tool.name;
			F.removeControlButton(name);
			F.app.removeTool(name);
			F.app.refreshControls();
		};
		F.makeToolToggler = Tool => val => (val ? F.addTool : F.removeTool)(Tool);
	// Settings
		F.settingsOpts = [];
		let F__settings = {};
		Object.defineProperty(F, 'settings', {
			get: function() {
				console.warn('Do NOT get Framework.settings directly!');
				return F__settings;
			},
			set: function(val) {
				console.warn('Do NOT set Framework.settings directly!');
				F__settings = val;
				return F__settings;
			}
		});
		F.settingGroups = [];
		F.tempSettings = ['hidecolours']; // TODO: Ensure this is always temp
		F.getSettings = () => {
			return F__settings;
		};
		F.saveSettings = () => {
			const settings = F.getSettings();
			let currData = F.getData(F.SettingsKey) || {}
			let saveData = {};
			Object.entries(settings).forEach(([key, val]) => {
				saveData[key] = F.tempSettings.includes(key) ? currData[key] : val;
				if(saveData[key] === undefined) delete saveData[key];
			});
			F.setData(F.SettingsKey, saveData);
			return settings;
		};
		F.throttledSaveSettings = throttleFunc(F.saveSettings, F.saveSettingsMinDelay, F.saveSettingsMaxDelay);
		F.setSetting = (name, val) => {
			const settings = F.getSettings(), prevVal = settings[name];
			if(val === undefined) delete settings[name]
			else settings[name] = val;
			let opts = F.settingsOpts.find(({name: n}) => n === name);
			if(opts !== undefined && !opts.initialized && typeof opts.init === 'function') {
				opts.initialized = true;
				opts.init();
				val = settings[name];
			}
			if(val === prevVal) return; // Exit if value has not changed
			F.toggleSettingClass(name, val);
			F.trigger('togglesetting', name, val, prevVal);
			if(opts !== undefined && typeof opts.onToggle === 'function') opts.onToggle(val, prevVal);
			F.throttledSaveSettings();
		};
		F.getSetting = (name, optionalDefault) => {
			const settings = F.getSettings();
			if(!(name in settings)) return optionalDefault;
			return settings[name];
		};
		F.upgradeLegacySettings = () => {
			let settings = F.getData(F.SettingsKey) || {};
			if(settings['selection'] === undefined) {
				settings['selection'] = 'cage';
				if(settings['selectionlight'] === true) settings['selection'] = 'light';
				if(settings['selectiondark'] === true) settings['selection'] = 'dark';
			}
			delete settings['selectionlight'];
			delete settings['selectiondark'];
			delete settings['selectioncage'];
			F.setData(F.SettingsKey, settings);
		};
		F.getQuerySettings = () => {
			// TODO: Refactor this out of Framework and into App
			// TODO: Handle manual update of such settings (change URL or change temp status)
			let settings = {};
			[...new URLSearchParams(document.location.search)
				].forEach(([key, val]) => {
					if(key.match(/^setting-/)) {
						let settingName = key.replace(/^setting-/, '').replace(/(colo)r/i, '$1ur');
						let settingValue = ['true', 't', '1', ''].includes(val.toLowerCase());
						settings[settingName] = settingValue;
					}
				});
			return settings;
		};
		F.trimUnknownSettings = (settings, knownSettings) => {
			let knownKeys = Object.keys(knownSettings);
			Object.keys(settings)
				.filter(key => knownKeys.indexOf(key) === -1)
				.forEach(key => delete settings[key]);
			return settings;
		};
		F.initSettings = defaultSettings => {
			Framework.upgradeLegacyData([F.SettingsKey]);
			F.upgradeLegacySettings();
			const configuredSettings = Object.fromEntries(Framework.settingsOpts
				.filter(({name}) => typeof name === 'string')
				.map(({name}) => [name])
			);
			const querySettings = F.getQuerySettings();
			F.tempSettings.push(...Object.keys(querySettings));
			const settings = F.getSettings();
			for(let key in settings) delete settings[key]; // Clear settings
			Object.assign(settings, configuredSettings, defaultSettings);
			const savedSettings = F.trimUnknownSettings(F.getData(F.SettingsKey) || {}, settings);
			Object.assign(settings, savedSettings, querySettings);
			Object.entries(settings).forEach(([key, val]) => {
				settings[key] = null; // Ensure initialization triggers once
				F.setSetting(key, val);
			});
			F.settingsInitialized = true;
		};
		F.toggleSettingClass = (name, val) => {
			if(val === undefined) return;
			const reSetting = new RegExp(`setting-${name}(-|$)`);
			const bodyClassList = document.querySelector('body').classList;
			bodyClassList.remove(...[...bodyClassList].filter(className => className.match(reSetting)));
			if(typeof val === 'string') {
				bodyClassList.toggle(`setting-${name}-${val}`.trim(), true);
			}
			else {
				bodyClassList.toggle(`setting-${name}`, val);
			}
		};
		F.handleSettingsChange = event => {
			let elem = event.target, name = elem.name, val;
			if(elem.classList.contains('setting-toggle')) val = elem.checked;
			if(elem.classList.contains('setting-multi')) val = elem.value;
			F.setSetting(name, val);
		};
		F.addSetting = (opts = {}) => {
			// TODO: Handle this warning more elegantly
			if(F.settingsInitialized && opts.name !== 'fpuztool') {
				console.warn('Framework.addSetting("%s") Setting added after init!', opts.name);
				console.log('  settings:', JSON.stringify(F.getSettings(), null, '  '));
				console.log('  opts:', JSON.stringify(opts, null, '  '));
			}
			F.settingsOpts.push(opts);
		};
		F.addSettings = (items = []) => items.forEach(F.addSetting);
	// Groups
		F.addGroup = (group) => {
			F.settingGroups.push(Object.assign({items: []}, group));
		};
		F.addGroups = (items = []) => items.forEach(F.addGroup);
		F.settingToElem = (opts) => {
			const value = F.getSetting(opts.name), title = opts.content;
			let elem = Object.assign(
				{handler: F.handleSettingsChange},
				value ? {value} : null,
				title ? {title} : null,
				opts
			);
			if(opts.tag === 'button') elem = {className: 'setting-item setting-button', children: [elem]};
			return elem;
		};
		F.handleCollapseGroup = (event) => {
			event.preventDefault();
			event.stopPropagation();
			let groups = F.settingGroups;
			let groupDiv = event.target.closest('.setting-group');
			let groupIdx = [...document.querySelectorAll('.setting-group')].indexOf(groupDiv);
			let group = groups[groupIdx];
			group.closed = !(group.closed === true);
			groupDiv.classList.toggle('closed', group.closed);
			let closedState = groups.reduce((acc, cur) => Object.assign(acc, {[cur.name]: cur.closed === true}), {});
			F.setData('groupsclosed', closedState);
		};
		F.createGroup = (opts = {}) => {
			return ({
				className: 'setting-group' + (opts.closed === true ? ' closed' : ''),
				children: [
					{
						tag: 'label',
						content: opts.label || opts.name || 'Group',
						onclick: F.handleCollapseGroup,
						children: [{className: 'icon', innerHTML: F.icons.back}]
					},
					{className: 'setting-groupitems', children: opts.items || []}
				]
			});
		};
		F.showSettings = (opts) => {
			const capitalizeFirstLetter = (str = '') => str.charAt(0).toUpperCase() + str.slice(1);
			let groups = F.settingGroups;
			groups.forEach(({items}) => items.length = 0);
			F.settingsOpts.forEach(item => {
				let group = groups.find(({name}) => name === item.group);
				if(group === undefined) {
					group = {name: item.group, label: capitalizeFirstLetter(item.group), items: []};
					groups.push(group);
					let settingGroup = F.settingGroups.find(({name}) => name === item.group);
					if(settingGroup !== undefined) {
						Object.assign(group, settingGroup);
					}
				}
				group.items.push(F.settingToElem(item));
			});
			let settingsParts = [];
			let closedState = F.getData('groupsclosed') || {};
			groups.forEach(group => {
				if(group.name === undefined || group.name === 'hidden' || group.items.length === 0) return;
				if(closedState[group.name] !== undefined) group.closed = closedState[group.name];
				settingsParts.push(F.createGroup(group));
			});
			let undefinedGroup = groups.find(({name}) => name === undefined);
			if(undefinedGroup && undefinedGroup.items.length > 0) {
				settingsParts.push(...undefinedGroup.items);
			}
			settingsParts.push({tag: 'options', class: 'sticky', options: [{tag: 'button', innerHTML: `${F.icons.back}Back`, className: 'dialog-back', action: 'close'}]});
			const timerRunningState = F.app.timer.running;
			const handleCloseSettings = (...args) => {
				F.off('closedialog', handleCloseSettings);
				if(timerRunningState) F.app.timer.resume();
			};
			F.on('closedialog', handleCloseSettings);
			if(timerRunningState) F.app.timer.stop();
			return F.showDialog(Object.assign({parts: settingsParts, overlayClass: 'dialog-settings', centerOverBoard: true}, opts));
		};
	// Context Menu
		F.handleContextMenu = function(event) {
			event.preventDefault();
			return false;
		};
		F.enableContextMenu = function() {
			window.removeEventListener('contextmenu', F.handleContextMenu);
		};
		F.disableContextMenu = function() {
			F.enableContextMenu(); // Ensure only one event handler
			window.addEventListener('contextmenu', F.handleContextMenu);
		};
	// Handlers
		F.handleResize = function(event) {
			const overlayElem = document.querySelector('.dialog-overlay');
			const boardElem = document.querySelector('.boardsvg');
			const centeroverboard = overlayElem.classList.contains('centeroverboard');
			if(centeroverboard && boardElem !== null) {
				const dialogElem = overlayElem.querySelector('.dialog');
				dialogElem.style.removeProperty('margin-left');
				dialogElem.style.removeProperty('margin-right');
				const boardBB = bounds(boardElem), dialogBB = bounds(dialogElem);
				if(boardBB.width < dialogBB.width) return;
				if(boardBB.height < dialogBB.height) return;
				const {innerWidth, innerHeight} = window, winBB = {width: innerWidth, height: innerHeight, x: 0, y: 0};
				if(boardBB.width > winBB.width) return;
				if(!F.aabbOverlap(winBB, boardBB)) return;
				let offset = Math.round((boardBB.x + 0.5 * boardBB.width) - (dialogBB.x + 0.5 * dialogBB.width));
				dialogElem.style['margin-left'] = `${offset}px`;
				dialogElem.style['margin-right'] = `${-offset}px`;
			}
		};
	// Event Tracking
		F.getProgressCount = () => {
			const  reProgress = /^progress_/, ls = localStorage, len = ls.length;
			let cnt = 0;
			for(let i = 0; i < len; i++) if(reProgress.test(ls.key(i))) cnt++;
			return cnt;
		};
		F.getPrognum = cnt => cnt < 1 ? 0 : Math.ceil(Math.pow(1.12, Math.ceil(Math.log(cnt + 0.5) / Math.log(1.12))) - 1.5);
		F.checkDateRange = (start = '0-0-0', hours = 0, n = Date.now() - Date.UTC(...(start.match(/(\d+)-(\d+)-(\d+)(?:\s+(\d+)(?::(\d+))?(?::(\d+))?)?/)||[]).slice(1).map((n,i)=>(Number(n)||0)-1*(i==1?1:i==3?2:0)))) => n >= 0 && n <= hours * 3.6e6;
		F.isRealPause = () => undefined !== [...document.querySelectorAll('.dialog button')].find(el => el.textContent.trim() === 'Stay Paused');
		F.getSudokuPadConfig = async () => {
			// if(F.config === undefined) F.config = await(await fetch('./assets/sudokupad.config.json')).json();
			if(F.config === undefined) F.config = JSON.parse("{}");
			return F.config;
		};
		F.trackError = (msg) => {
			if('function' !== typeof plausible) console.error('Framework.trackError: function plausible() not found');
			plausible('error', {props: {msg}});
		};
		F.trackWhenReady = (name, customProps = {}) => {
			try {
				const reCleanStr = /[^a-z0-9+_\-&!?.,:;\/\\'"()]+/ig,
					u = document.location.href.slice(0, 1000);
					props = Object.assign({
						ver: App.VERSION,
						host: document.location.host,
						puzzle: F.app && F.app.sourcePuzzle ? F.app.sourcePuzzle.id : (getPuzzleId() || '').slice(0, 100),
					}, customProps);
				if(F.app) {
					const {app: {currentPuzzle = {}, timer = {}, puzzle = {}}} = F,
						{author, title} = currentPuzzle,
						{elapsedTime} = timer,
						{replayStack = []} = puzzle,
						progcount = F.getProgressCount();
					if(author) props.author = author;
					if(title) props.title = title;
					if(author || title) props.counterid = `${(author || '').replace(reCleanStr, '')}-${(title || '').replace(reCleanStr, '')}`.toLowerCase();
					props.time = Math.round(Math.max(0, Math.log(elapsedTime / 1000)) * 100);
					props.actions = Math.round(Math.max(0, Math.log(replayStack.length)) * 100);
					props.prognum = F.getPrognum(progcount);
				}
				plausible(name, {u, props});
			}
			catch(err) {
				console.error('Error in Framework.trackWhenReady:', err);
				F.trackError(`trackWhenReady: ${err}`);
			}
		};
		F.trackWhenNotReady = (name, props = {}) => {
			console.info('😔 No happy numbers for Sven (Perhaps analytics blocked by ad-blocker):', name, props);
		};
		F.trackQueue = [];
		F.track = function(...args) {
			F.trackQueue.push(args);
		};
		F.renderAd = async (slot, ad) => {
			try {
				const {html, campaign} = ad;
				let el = undefined, showAd = false;
				if(typeof html !== 'string') return false;
				if(!showAd && (el = document.querySelector('.supportlinks'))) {
					Object.assign(el, {style: '', innerHTML: ''});
					el.append(document.createRange().createContextualFragment(html));
					showAd = true;
				}
				if(!showAd && (el = document.querySelector('#solvedcounter')) && F.isRealPause()) {
					el.insertAdjacentHTML('beforeBegin', html);
					showAd = true;
				}
				if(showAd) {
					Framework.track('adshow', {msg: slot, slot, campaign});
					const handleAsLinkClick = async event => {
						event.preventDefault();
						Framework.track('adclick', {msg: slot, slot, campaign});
						if(el) {
							el.removeEventListener('click', handleAsLinkClick);
							await sleep(250);
							window.location = el.href;
						}
					};
					if(el = document.querySelector('#aslink')) el.addEventListener('click', handleAsLinkClick);
					showAd = false;
				}
				return true;
			}
			catch(err) {
				F.trackError(`renderAd: ${(err||{}).message}`);
			}
			return false;
		};
		F.isForceAd = () => ['true', 't', '1', ''].includes(new URLSearchParams(document.location.search).get('forcead'));
		F.pickAd = async (slot) => {
			const forceAd = F.isForceAd(),
						progressCount = F.getProgressCount(),
						configAds = (await F.getSudokuPadConfig())?.ads;
			const adPicked = ad => {
				if(forceAd) return true;
				if(Framework.app.timer.elapsedTime < 60000) return false;
				if(ad.progressmin !== undefined && ad.progressmin > progressCount) return false;
				if(ad.progressmax !== undefined && ad.progressmax < progressCount) return false;
				if(!F.checkDateRange(ad.start, ad.hours)) return false;
				return true;
			};
			if(Array.isArray(configAds)) {
				let adCandidates = [], prioSum = 0;
				for(const ad of configAds) {
					if(adPicked(ad)) {
						adCandidates.push(ad);
						prioSum += Number(ad.priority || 1);
					}
				}
				let prioPick = Math.floor(Math.random() * prioSum);
				for(let i = 0, n = 0; i < adCandidates.length; i++) {
					const ad = adCandidates[i];
					n += Number(ad.priority || 1);
					if(n > prioPick) return ad;
				}
			}
			return undefined;
		};
		F.showAd = async (slot) => {
			const ad = await F.pickAd(slot);
			if(ad === undefined) return;
			const {campaign} = ad;
			//Framework.track('ad', {msg: slot, slot, campaign});
			F.renderAd(slot, ad);
		};
		F.initTrack = async function() {
			try {
				F.track = 'function' === typeof plausible ? F.trackWhenReady : F.trackWhenNotReady;
				for(const args of F.trackQueue) F.track(...args);
				delete F.trackQueue;
				function handleFirstLoaded(...args) {
					F.app.puzzle.off('loaded', handleFirstLoaded);
					F.track('pageview');
					F.getSudokuPadConfig();
				};
				F.app.puzzle.on('loaded', handleFirstLoaded);
			}
			catch(err) {
				console.error('Error in Framework.initTrack:', err);
				F.trackError(`initTrack: ${err}`);
			}
		};
		F.withApp(F.initTrack);

	F.attachHandlers();
	return F;
})();
