/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
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
		A3a.vpl.Canvas.dims,
		Object
	): A3a.vpl.ControlBar.Bounds}
	Function to get button width (arguments: id, dims, obj)
*/
A3a.vpl.ControlBar.getButtonBounds;

/** Add a control button, taking care of disabled ones
	@param {A3a.vpl.UIConfig} uiConfig
	@param {string} id
	@param {A3a.vpl.ControlBar.drawButton} drawButton
	@param {A3a.vpl.ControlBar.Bounds} buttonBounds
	@return {void}
*/
A3a.vpl.ControlBar.prototype.addButton = function (uiConfig, id, drawButton, buttonBounds) {
	var disabled = uiConfig.isDisabled(id);
	if (window["vplCommands"].find(id).isAvailable() && (uiConfig.customizationMode || !disabled)) {
		var canvas = this.canvas;
		var cmd = window["vplCommands"].find(id);
		var keepAvailable = cmd.keep;
		var obj = cmd.obj;

		this.addControl(
			function (ctx, width, height, isPressed) {
				drawButton(id, ctx, canvas.dims, width, height,
					window["vplCommands"].isEnabled(id),
					window["vplCommands"].isSelected(id),
					isPressed,
					obj);
				if (disabled) {
					canvas.disabledMark(0, 0, width, height);
				}
			},
			buttonBounds,
			uiConfig.customizationMode && !keepAvailable
				? function (downEvent) {
					uiConfig.toggle(id);
					return 1;
				}
				: window["vplCommands"].hasAction(id)
 					? function (downEvent) {
						window["vplCommands"].execute(id, downEvent.modifier);
					}
					: null,
			// doDrop
			uiConfig.customizationMode && !keepAvailable
        		? null
				: function (targetItem, droppedItem) {
					window["vplCommands"].doDrop(id, droppedItem);
				},
			// canDrop
			uiConfig.customizationMode && !keepAvailable
				? null
				: function (targetItem, droppedItem) {
					return window["vplCommands"].canDrop(id, droppedItem);
				},
			id);
	}
};

/** Set all the buttons
	@param {A3a.vpl.UIConfig} uiConfig
	@param {Array.<string>} buttons button id, "!space" for space, "!stretch" for stretch
	@param {A3a.vpl.ControlBar.drawButton} drawButton
	@param {function(string,A3a.vpl.Canvas.dims,Object):A3a.vpl.ControlBar.Bounds} getButtonBounds
	@return {void}
*/
A3a.vpl.ControlBar.prototype.setButtons = function (uiConfig, buttons, drawButton, getButtonBounds) {
	this.reset();
	for (var i = 0; i < buttons.length; i++) {
		switch (buttons[i]) {
		case "!space":
			this.addSpace();
			break;
		case "!stretch":
			this.addStretch();
			break;
		default:
			this.addButton(uiConfig, buttons[i], drawButton,
				getButtonBounds(buttons[i], this.canvas.dims, window["vplCommands"].find(buttons[i]).obj));
			break;
		}
	}
};
