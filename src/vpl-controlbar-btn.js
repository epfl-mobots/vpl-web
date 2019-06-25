/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Definition of methods for A3a.vpl.ControlBar which add support for buttons.

*/

/**
	@typedef {function (
		string,
		CanvasRenderingContext2D,
		A3a.vpl.Canvas.dims,
		CSSParser.VPL,
		Array.<string>,
		boolean,
		boolean,
		boolean,
		Object): void}
	Function to draw buttons (arguments: id, ctx, dims, css, cssClasses, isEnabled,
	isSelected, isPressed, obj)
*/
A3a.vpl.ControlBar.drawButton;

/**
	@typedef {function (
		string,
		A3a.vpl.Canvas.dims
	): A3a.vpl.ControlBar.Bounds}
	Function to get button bounds (arguments: id, dims)
*/
A3a.vpl.ControlBar.getButtonBounds;

/** Add a control button, taking care of disabled ones
	@param {A3a.vpl.Application} app
	@param {string} id
	@param {Array.<string>} cssClasses
	@param {A3a.vpl.ControlBar.drawButton} drawButton
	@param {A3a.vpl.ControlBar.Bounds} buttonBounds
	@return {void}
*/
A3a.vpl.ControlBar.prototype.addButton = function (app, id, cssClasses, drawButton, buttonBounds) {
	var disabled = app.uiConfig.isDisabled(id);
	if (app.commands.find(id).isAvailable() && (app.uiConfig.customizationMode || !disabled)) {
		var canvas = this.canvas;
		var cmd = app.commands.find(id);
		var keepAvailable = cmd.keep;
		var obj = cmd.obj;

		this.addControl(
			function (ctx, box, isPressed) {
				drawButton(id, ctx, canvas.dims, canvas.css, cssClasses,
					app.commands.isEnabled(id),
					app.commands.isSelected(id),
					isPressed,
					app.commands.getState(id));
				if (disabled) {
					canvas.disabledMark(0, 0, box.width, box.height, ["button"], ["button"]);
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
	@param {Array.<string>} cssClasses
	@param {A3a.vpl.ControlBar.drawButton} drawButton
	@param {function(string,A3a.vpl.Canvas.dims,Object):A3a.vpl.ControlBar.Bounds} getButtonBounds
	@return {void}
*/
A3a.vpl.ControlBar.prototype.setButtons = function (app, buttons, cssClasses, drawButton, getButtonBounds) {
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
			this.addButton(app,
				buttons[i], cssClasses,
				drawButton,
				getButtonBounds(buttons[i], this.canvas.dims, app.commands.find(buttons[i]).obj));
			break;
		}
	}
};

/** Check if any button is available
	@param {A3a.vpl.Application} app
	@param {Array.<string>} buttons button id, "!space" for space, "!stretch" for stretch
	@return {boolean}
*/
A3a.vpl.ControlBar.hasAvailableButtons = function (app, buttons) {
	for (var i = 0; i < buttons.length; i++) {
		if (buttons[i][0] !== "!" && app.commands.find(buttons[i]).isAvailable()) {
			return true;
		}
	}
	return false;
};

/** Find the button boxes
	@param {A3a.vpl.Application} app
	@param {Array.<string>} buttons button id, "!space" for space, "!stretch" for stretch
	@param {Array.<string>} cssClasses
	@return {Object.<string,CSSParser.VPL.Box>}
*/
A3a.vpl.ControlBar.buttonBoxes = function (app, buttons, cssClasses) {
	/** @type {Object.<string,CSSParser.VPL.Box>} */
	var boxes = {};
	for (var i = 0; i < buttons.length; i++) {
		if (buttons[i][0] !== "!" && app.commands.find(buttons[i]).isAvailable()) {
			var buttonBox = app.css.getBox({tag: "button", id: buttons[i].replace(/:/g, "-"), clas: cssClasses});
			boxes[buttons[i]] = buttonBox;
		}
	}
	return boxes;
};

/** Find the maximum button height based on button box, incl. padding and margin
	@param {Object.<string,CSSParser.VPL.Box>} boxes
	@return {number}
*/
A3a.vpl.ControlBar.maxBoxHeight = function (boxes) {
	var maxHeight = 0;
	for (var key in boxes) {
		if (boxes.hasOwnProperty(key)) {
			maxHeight = Math.max(maxHeight, boxes[key].totalHeight());
		}
	}
	return maxHeight;
};
