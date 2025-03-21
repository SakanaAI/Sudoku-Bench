
const FeatureGifting = (() => {
	// Helpers
		const {compressPuzzle} = loadFPuzzle,
					{zip} = PuzzleZipper,
					{parsePuzzleData, fetchPuzzle} = PuzzleLoader,
					{icons} = Framework;

	function FeatureGifting() {
		bindHandlers(this);
		this.featureEnabled = false;
		this.currentMessage = '';
		this.currentSolvedMsg = '';
	}
	const C = FeatureGifting, P = Object.assign(C.prototype, {constructor: C});
	C.Name = 'gifting';
	C.SettingName = C.Name;
	C.featureStyle = ``;
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
	// Update Puzzle
		C.apiCreateShortId = async function(puzzle) {
			const res = await fetch('/admin/createlink', {method: 'post', 'Content-Type': 'application/json', body: JSON.stringify({puzzle})});
			if(res.status !== 200) throw (await res.json());
			return res.json();
		};
		C.RulesUpdate = {
			re: /^([\s\S]*)$/igm,
			template: '<MESSAGE>\n\n$1'
		};
		C.MaxMessageLength = 200;
		C.filterRulesCage = cage => (String(cage.value || '').match(App.reMetaTags) || [])[1] !== 'rules';
		P.makeRulesText = function(message) {
			const {app: {puzzle, sourcePuzzle: {metadata = {}}}} = Framework,
						rulesText = puzzle.getRules(),
						{re, template} = C.RulesUpdate,
						rulesMatch = template.replace('$1', '').replace('<MESSAGE>', metadata.giftmessage);
			return rulesText.replace(rulesMatch, '').replace(re, template.replace('<MESSAGE>', message));
		};
		P.createGiftedPuzzle = async function() {
			const {app} = Framework, {reMetaTags} = App;
			const puzzleData = await parsePuzzleData(await fetchPuzzle(getPuzzleId()))
			puzzleData.metadata = app.extractPuzzleMeta(puzzleData);
			if(Array.isArray(puzzleData.cages)) puzzleData.cages = puzzleData.cages.filter(C.filterRulesCage);
			puzzleData.metadata.rules = this.makeRulesText(this.currentMessage);
			puzzleData.metadata.giftmessage = this.currentMessage;
			if(this.currentSolvedMsg !== '') puzzleData.metadata['msgcorrect'] = this.currentSolvedMsg;
			const puzzlePayload = `scl${compressPuzzle(zip(puzzleData))}`;
			const newPuzzleUrl = new URL(document.location);
			const {shortid} = await C.apiCreateShortId(puzzlePayload);
			newPuzzleUrl.pathname = `/${shortid}`;
			const linkEl = document.querySelector('#gifting_link');
			linkEl.value = newPuzzleUrl;
			linkEl.focus();
			linkEl.select();
			document.querySelector('#gifting-closebtn').textContent = 'Close';
			const createBtn = document.querySelector('#gifting-createbtn');
			createBtn.innerHTML = createBtn.innerHTML.replace(/Create Link/, 'Update Link');
			document.querySelector('#gifting_output').innerHTML =
	`<div>
	<a id="gifting-openlink" style="cursor: pointer; margin-right: 1rem;" title="Open link">
	Open Link <span style="vertical-align: middle;">${icons.opennew}</span></a>
	<a id="gifting-clipboardcopy" style="cursor: pointer; margin-right: 1rem;" title="Copy to clipboard">
	Copy to clipboard <span style="vertical-align: middle;">${icons.copy}</span></a>
	<a id="gifting-share" style="cursor: pointer; margin-right: 1rem;" title="Share Puzzle">
	Share Link <span style="vertical-align: middle;">${icons.share}</span></a>
	</div>`;
			const handleOpen = event => window.open(newPuzzleUrl, '_blank');
			const handleShare = event => navigator.share({
				url: newPuzzleUrl,
				title: 'Gifted Puzzle',
				text: 'A Gifted Puzzle',
			});
			const handleCopy = event => event.target.innerHTML = event.target.innerHTML.replace(/Copy to clipboard <span/, 'Copy to clipboard (copied) <span');
			addHandler('#gifting-openlink', 'click', handleOpen);
			addHandler('#gifting-share', 'click', handleShare);
			addHandler('#gifting-clipboardcopy', 'click', handleCopy);
		};
	// Dialog
		P.handleUpdatePreview = function() {
			const {app, app: {puzzle, sourcePuzzle}} = Framework,
						messageVal = document.querySelector('#gifting_message').value || '',
						solvedVal = document.querySelector('#gifting_solved').value || '';
			this.currentMessage = sanitizeHTML(messageVal).slice(0, C.MaxMessageLength);
			this.currentSolvedMsg = sanitizeHTML(solvedVal).slice(0, C.MaxMessageLength);
			const rulesPreviewText = this.makeRulesText(`<strong>${this.currentMessage || 'Recipient'}</strong>`);
			document.querySelector('#preview_rules').innerHTML = `<p>${rulesPreviewText.replace(/(\n|\\n)/gm, '</p>\n<p>')}</p>`;
			document.querySelector('#preview_solved').innerHTML = this.currentSolvedMsg || app.getDialogParts('correct')[1].innerHTML;
		};
		P.handleRecipientInput = function(event) {
			this.updatePreviewText(event.target.value);
		};
		P.handleDialogButton = function(button) {
			if(['Cancel', 'Close'].includes(button)) Framework.closeDialog();
		};
		P.handleSubmit = function(event) {
			event.preventDefault();
			this.createGiftedPuzzle();
		};
		P.handleOpenGiftingDialog = function() {
			const {app: {sourcePuzzle: {metadata = {}}}} = Framework;
			Framework.closeDialog();
			Framework.showDialog({
				parts: [
					{tag: 'form', id: 'gifting_form', children: [
						{tag: 'title', innerHTML: 'Gift Puzzle', style: 'text-align: center'},
						{tag: 'label', content: 'Recipient Message:', style: 'margin-bottom: 0;'},
						{tag: 'input', value: 'A puzzle for Recipient:', id: 'gifting_message', maxlength: C.MaxMessageLength, autofocus: true, style: 'width: 12rem; margin: 1rem; border-style: solid;'},
						{tag: 'label', content: 'Solved Message:', style: 'margin-bottom: 0;'},
						{tag: 'input', value: metadata.msgcorrect || '', id: 'gifting_solved', maxlength: C.MaxMessageLength, autofocus: true, style: 'width: 12rem; margin: 1rem; border-style: solid;'},
						{tag: 'label', content: 'Rules Preview:', style: 'margin-bottom: 0;'},
						{id: 'preview_rules', style: 'max-height: 12rem; overflow: auto; margin: 1rem; font-size: 80%; background: #a5e08e;'},
						{tag: 'label', content: 'Solved Message Preview:', style: 'margin-bottom: 0;'},
						{id: 'preview_solved', innerHTML: '', style: 'max-height: 12rem; overflow: auto; margin: 1rem; padding: 1rem; font-size: 80%; border: 10px solid #ccc; border-radius: 0.5rem;'},
						{tag: 'options', options: [{tag: 'button', id: 'gifting-createbtn', innerHTML: `Create Link <span>${Framework.icons.link}</span>`}], style: 'padding: 0;'},
						{tag: 'label', content: 'Puzzle Link:', style: 'margin-bottom: 0;'},
						{tag: 'input', id: 'gifting_link', style: 'width: calc(100% - 4rem); overflow: auto; margin: 1rem;border-style: solid;'},
						{id: 'gifting_output', style: 'margin: 1rem; border: 0.5rem;'},
						{tag: 'options', options: [{type: 'button', id: 'gifting-closebtn', content: 'Cancel'}], style: 'flex-direction: row; justify-content: center;'},
					]}
				],
				onButton: this.handleDialogButton,
				autoClose: false,
				centerOverBoard: true
			});
			addHandler('#gifting_form', 'submit', this.handleSubmit);
			addHandler('#gifting_message', 'input', this.handleUpdatePreview);
			addHandler('#gifting_solved', 'input', this.handleUpdatePreview);
			// Wait for browser pre-fill recall
			setTimeout(this.handleUpdatePreview, 100);
			this.handleUpdatePreview();
		};
	// Setting
		P.handleInit = function() {
			Framework.addSetting({
				tag: 'button', group: 'experimental', name: 'giftpuzzle',
				content: 'Create Gift Puzzle',
				handler: this.handleOpenGiftingDialog,
			});
		};
	
	return C;
})();

FeatureGifting.create();