/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/**
	@typedef {function (
		string,
		CanvasRenderingContext2D,
		A3a.vpl.Canvas.dims,
		number,
		number,
		boolean,
		boolean,
		boolean,
		Object): void}
	Function to draw buttons (arguments: id, ctx, dims, width, height, isEnabled,
	isSelected, isPressed, obj)
*/
A3a.vpl.ControlBar.drawButton;

/**
	@typedef {function (
		string,
		A3a.vpl.Canvas.dims
	): A3a.vpl.ControlBar.Bounds}
	Function to get button width (arguments: id, dims)
*/
A3a.vpl.ControlBar.getButtonBounds;

/** Add a control button, taking care of disabled ones
	@param {A3a.vpl.Application} app
	@param {string} id
	@param {A3a.vpl.ControlBar.drawButton} drawButton
	@param {A3a.vpl.ControlBar.Bounds} buttonBounds
	@return {void}
*/
A3a.vpl.ControlBar.prototype.addButton = function (app, id, drawButton, buttonBounds) {
	var disabled = app.uiConfig.isDisabled(id);
	if (app.commands.find(id).isAvailable() && (app.uiConfig.customizationMode || !disabled)) {
		var canvas = this.canvas;
		var cmd = app.commands.find(id);
		var keepAvailable = cmd.keep;
		var obj = cmd.obj;

		this.addControl(
			function (ctx, width, height, isPressed) {
				drawButton(id, ctx, canvas.dims, width, height,
					app.commands.isEnabled(id),
					app.commands.isSelected(id),
					isPressed,
					app.commands.getState(id));
				if (disabled) {
					canvas.disabledMark(0, 0, width, height);
				}
			},
			buttonBounds,
			app.uiConfig.customizationMode && !keepAvailable
				? function (downEvent) {
					app.uiConfig.toggle(id);
					return 1;
				}
				: app.commands.hasAction(id)
 					? function (downEvent) {
						app.commands.execute(id, downEvent.modifier);
					}
					: null,
			// doDrop
			app.uiConfig.customizationMode && !keepAvailable
        		? null
				: function (targetItem, droppedItem) {
					app.commands.doDrop(id, droppedItem);
				},
			// canDrop
			app.uiConfig.customizationMode && !keepAvailable
				? null
				: function (targetItem, droppedItem) {
					return app.commands.canDrop(id, droppedItem);
				},
			id);
	}
};

/** Set all the buttons
	@param {A3a.vpl.Application} app
	@param {Array.<string>} buttons button id, "!space" for space, "!stretch" for stretch
	@param {A3a.vpl.ControlBar.drawButton} drawButton
	@param {function(string,A3a.vpl.Canvas.dims,Object):A3a.vpl.ControlBar.Bounds} getButtonBounds
	@return {void}
*/
A3a.vpl.ControlBar.prototype.setButtons = function (app, buttons, drawButton, getButtonBounds) {
	this.reset();
	for (var i = 0; i < buttons.length; i++) {
		switch (buttons[i]) {
		case "!space":
			this.addSpace();
			break;
		case "!!space":
			this.addSpace(true);
			break;
		case "!stretch":
			this.addStretch();
			break;
		case "!!stretch":
			this.addStretch(true);
			break;
		default:
			this.addButton(app, buttons[i], drawButton,
				getButtonBounds(buttons[i], this.canvas.dims, app.commands.find(buttons[i]).obj));
			break;
		}
	}
};
