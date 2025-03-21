
const ToolNormal = {
	button: {
		name: 'normal', title: 'Digit',
		content: `<div class="icon">${Framework.icons.toolNormal}</div>Digit`,
	},
	tool: {
		name: 'normal',
		isTool: true,
		actionLong: 'value',
		actionShort: 'vl',
	}
};
const ToolCorner = {
	button: {
		name: 'corner', title: 'Corner',
		content: `<div class="icon">${Framework.icons.toolCorner}</div>Corner`,
	},
	tool: {
		name: 'corner',
		isTool: true,
		actionLong: 'pencilmarks',
		actionShort: 'pm',
		tempKey: (event, app) => (!app.controlPressed && (app.altPressed || app.shiftPressed))
	}
};
const ToolCentre = {
	button: {
		name: 'centre', title: 'Centre',
		content: `<div class="icon">${Framework.icons.toolCenter}</div>Centre`,
	},
	tool: {
		name: 'centre',
		isTool: true,
		actionLong: 'candidates',
		actionShort: 'cd',
		tempKey: (event, app) => (app.controlPressed && !(app.altPressed || app.shiftPressed)),
	}
};
/*
const __ToolColour = {
	button: {
		name: 'colour', title: 'Colour',
		content: `<div class="icon">${Framework.icons.toolColour}</div>Colour`,
	},
	tool: {
		name: 'colour',
		isTool: true,
		actionLong: 'colour',
		actionShort: 'co',
		tempKey: (event, app) => (app.controlPressed && (app.altPressed || app.shiftPressed)),
	}
};
*/

const createToolButtons = () => {
	Framework.addTool(ToolNormal);
	Framework.addTool(ToolCorner);
	Framework.addTool(ToolCentre);
	Framework.addTool(ToolColor);
};
