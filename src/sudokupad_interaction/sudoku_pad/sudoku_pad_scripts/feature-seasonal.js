
const FeatureSeasonal = (() => {
	
	function FeatureSeasonal() {
		bindHandlers(this);
		PortableEvents.mixin(this);
		this.featureEnabled = false;
	}
	const C = FeatureSeasonal, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'seasonal';
	C.SettingName = C.Name;
	C.featureStyle = `
		.season-helloween2023 #svenpeek {
			background-image: url(/images/svenpeek_helloween.png);
		}
		#sudokuconstream {
			display: none;
			text-align: center;
			margin: 1rem 2rem;
			padding: 0.5rem;
			line-height: 1.7rem;
			border: 0.5rem solid rgba(255, 40, 40, 0.5);
			border-radius: 1rem;
			text-decoration: 1px underline solid; 
			background:
				no-repeat url(/images/sudokucon-profile-70x70.png) 0.5rem center,
				no-repeat url(/images/sudokucon-profile-70x70.png) right 0.5rem center
			;
			background-size: 2.5rem 2.5rem;
		}
		#sudokuconstream:hover { text-decoration: auto underline solid; }
		#sudokuconstream .flip { display: inline-block; transform: scale(-1, 1); }
		#sudokuconstream span { display: block; }
		#sudokuconstream .line1 {
			font-weight: 400;
			font-size: 1.6rem;
			line-height: 2.5rem;
		}
		.season-sudokuconstream .supportlinks { display: none; }
		.season-sudokuconstream #sudokuconstream { display: block; }
		.setting-hidesupportlinks #sudokuconstream { display: none; }
		#sudokuconsurvey {
			display: none;
			text-align: center;
			padding: 0.6rem;
			margin: 0.5rem auto;
			max-width: 18rem;
			font-size: 1rem;
			line-height: 1.4rem;
			border-radius: 1rem;
			text-decoration: 1px underline solid;
			background:
				no-repeat url(/images/sudokucon_logo_sm.png) left 0.5rem center,
				no-repeat url(/images/sudokucon_logo_sm.png) right 0.5rem center
			;
			background-color: rgba(255, 40, 40, 0.1);
			background-size: 2.5rem 2.5rem;
		}
		#sudokuconsurvey span { display: block; }
		#sudokuconsurvey .line2 { font-size: smaller; }
		.season-sudokuconsurvey #sudokuconsurvey { display: block; }
		.setting-hidesupportlinks #sudokuconsurvey { display: none; }
	`;
	C.sudokuconInfoHtml = () => `
		<a id="sudokuconstream" href="https://link.sudokupad.app/sudokuconstream" target="_blank">
		<span class="line1"><span class="flip"></span>SudokuCon</span>
		<span class="line2">24hr Puzzle Livestream</span>
		<span class="line3">LIVE RIGHT NOW!</span>
		<span class="line4">twitch.tv/sudokucon</span>
		</a>
	`;
	C.sudokuconSurveyHtml = () => `
		<a id="sudokuconsurvey" href="https://sudokucon.com/survey" target="_blank">
		<span class="line1">SudokuCon 2025 Survey</span>
		<span class="line2">Please fill if Interested</span>
		</a>
	`;
	// API
		C.create = async function() {
			const feature = new C();
			Framework.withApp(() => feature.addFeature());
		};
		P.init = async function() {
			Framework.features = Framework.features || {};
			if(Framework.features[C.Name] !== undefined) {
				console.error('Feature "%s" already exists.', C.Name);
			}
			else {
				Framework.features[C.Name] = this;
			}
			const proto = Object.getPrototypeOf(this);
			for await (const prop of Object.getOwnPropertyNames(proto)) {
				if('function' !== typeof this[prop] || !/^handleInit.*/.test(prop)) continue;
				await this[prop]();
			}
			if(C.featureStyle) this.featureStylesheet = await attachStylesheet(C.featureStyle);
		};
		P.addFeature = async function() {
			this.init();
		};
		P.removeFeature = async function() {
			this.featureEnabled = false;
			if(this.featureStylesheet) this.featureStylesheet.remove();
		};
	// Feature
		P.attachSudokuconinfo = async function() {
			let supportElem = document.querySelector('.dialog .supportlinks');
			if(supportElem !== null) {
				supportElem.insertAdjacentHTML('afterend', C.sudokuconInfoHtml());
			}
			else {
				let rulesElem = document.querySelector('.dialog .rulestext');
				if(rulesElem !== null) {
					rulesElem.insertAdjacentHTML('afterend', C.sudokuconInfoHtml());
				}
			}
		};
		P.attachSudokuconsurvey = async function() {
			let supportElem = document.querySelector('.dialog .supportlinks');
			if(supportElem === null) return;
			supportElem.insertAdjacentHTML('afterend', C.sudokuconSurveyHtml());
			let el = document.querySelector('#sudokuconsurvey');
			const handleSudokuconsurveyClick = () => {
				Framework.track('consurveyclick');
				if(el) el.removeEventListener('click', handleSudokuconsurveyClick);
			};
			el.addEventListener('click', handleSudokuconsurveyClick);
			Framework.track('consurveyshow');
		};
		P.handleDialogShow = async function() {
			//this.attachSudokuconsurvey();
		};
		P.handleInit = async function() {
			//document.body.classList.add('season-helloween2023');
			//document.body.classList.add('season-sudokuconstream');
			//document.body.classList.add('season-sudokuconsurvey');
			//Framework.on('showdialog', this.handleDialogShow);
		};
	
	return C;
})();

FeatureSeasonal.create();