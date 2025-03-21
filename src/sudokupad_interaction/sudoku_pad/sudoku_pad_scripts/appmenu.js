

function createAppMenu() {
	const closeMenu = event => {
		Framework.app.off('restarted', handleRestarted);
		document.querySelector('#appmenu').classList.toggle('open');
		removeMoveEventHandler('#appmenu.mdc-drawer', handleMoveOverlay);
		removeDownEventHandler('#appmenu.mdc-drawer', handleClickOverlay);
		removeMoveEventHandler('#appmenu .menu-link-home', handleClickLink);
		removeMoveEventHandler('#appmenu a.mdc-list-item', handleClickLink);
		removeDownEventHandler('#appmenu [data-control="restart"]', handleClickRestart);
		if(event) event.preventDefault(); // Prevent click-throughs on buttons
	};
	const handleClickOverlay = event => {
		event.stopPropagation();
		event.stopImmediatePropagation();
		if(event.target === document.querySelector('#appmenu')) closeMenu(event);
	};
	const handleMoveOverlay = event => {
		event.stopPropagation();
		event.stopImmediatePropagation();
	};
	const handleRestarted = () => {
		Framework.app.off('restarted', handleRestarted);
		closeMenu();
	};
	const handleClickLink = event => {
	};
	const handleClickRestart = event => {
		Framework.app.handleRestartPuzzle();
		Framework.app.off('restarted', handleRestarted);
		Framework.app.on('restarted', handleRestarted);
	};
	const handleOpenAppMenu = event => {
		document.querySelector('#appmenu').classList.toggle('open');
		addMoveEventHandler('#appmenu.mdc-drawer', handleMoveOverlay);
		addDownEventHandler('#appmenu.mdc-drawer', handleClickOverlay);
		addDownEventHandler('#appmenu .menu-link-home', handleClickLink);
		addDownEventHandler('#appmenu a.mdc-list-item', handleClickLink);
		addDownEventHandler('#appmenu [data-control="restart"]', handleClickRestart);
	};
	createAppMenu.closeMenu = closeMenu;
	addDownEventHandler('#appmenubtn', handleOpenAppMenu, {capture: true});
}
