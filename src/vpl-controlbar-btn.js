/*
	Copyright 2018-2021 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
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
		A3a.vpl.Application,
		string,
		CanvasRenderingContext2D,
		A3a.vpl.Canvas.dims,
		CSSParser.VPL,
		Array.<string>,
		CSSParser.VPL.Box,
		A3a.vpl.Translation,
		boolean,
		boolean,
		boolean,
		?string): boolean}
	Function to draw buttons (arguments: id, ctx, dims, css, cssClasses, cssBox, translation,
	isEnabled, isSelected, isPressed, obj; return true to draw a disable mark at the
	level of its css box)
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

/** Check if a control button is available (displayed)
	@param {string} id
	@return {boolean}
*/
A3a.vpl.Application.prototype.isButtonAvailable = function (id) {
	var disabled = this.uiConfig.isDisabled(id);
	return (this.forcedCommandState ? this.forcedCommandState.isAvailable : this.commands.isAvailable(id)) &&
		(this.uiConfig.toolbarCustomizationMode || !disabled);
};

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
	if (app.isButtonAvailable(id)) {
		var canvas = this.canvas;
		var cmd = app.commands.find(id);
		var keepAvailable = cmd.keep;
		var obj = cmd.obj;

		this.addControl(
			function (ctx, box, isPressed) {
				if (app.forcedCommandState) {
					drawButton(app, id, ctx, canvas.dims, canvas.css, cssClasses, box,
						app.i18n,
						app.forcedCommandState.isEnabled && (keepAvailable || !app.uiConfig.toolbarCustomizationDisabled),
						app.forcedCommandState.isSelected,
						app.forcedCommandState.isPressed,
						app.forcedCommandState.state);
				} else {
					var isEnabled = app.commands.isEnabled(id) && (keepAvailable || !app.uiConfig.toolbarCustomizationDisabled);
					if (!isEnabled && app.uiConfig.nodragAccessibility) {
						// drop target; test current selection against canDrop
						var targetObject = app.kbdControl.getTargetObject();
						isEnabled = app.commands.canDrop(id, {data: targetObject});
					}
					drawButton(app, id, ctx, canvas.dims, canvas.css, cssClasses, box,
						app.i18n,
						isEnabled,
						app.commands.isSelected(id),
						isPressed,
						app.commands.getState(id));
				}
				return app.forcedCommandState ? app.forcedCommandState.disabled : disabled;
			},
			buttonBounds,
			{
				action: app.uiConfig.toolbarCustomizationMode && !keepAvailable
					? function (downEvent) {
						app.uiConfig.toggle(id);
						return 1;
					}
					: app.commands.hasAction(id) && (keepAvailable || !app.uiConfig.toolbarCustomizationDisabled)
	 					? function (downEvent) {
							app.commands.execute(id, downEvent.modifier);
						}
						: app.uiConfig.nodragAccessibility && !(app.uiConfig.toolbarCustomizationMode && !keepAvailable && app.uiConfig.toolbarCustomizationDisabled)
							? function (downEvent) {
								app.kbdControl.executeCommand(cmd);
							}
							: null,
				doDrop: app.uiConfig.toolbarCustomizationMode && !keepAvailable && app.uiConfig.toolbarCustomizationDisabled
	        		? null
					: function (targetItem, droppedItem) {
						app.commands.doDrop(id, droppedItem);
					},
				canDrop: app.uiConfig.toolbarCustomizationMode && !keepAvailable && app.uiConfig.toolbarCustomizationDisabled
					? null
					: function (targetItem, droppedItem) {
						return app.commands.canDrop(id, droppedItem);
					}
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
		if (buttons[i][0] !== "!" && app.commands.isAvailable(buttons[i])) {
			return true;
		}
	}
	return false;
};

/** Find the button boxes
	@param {A3a.vpl.Application} app
	@param {Array.<string>} buttons button id, "!space" for space, "!stretch" for stretch
	@param {Array.<string>} cssClasses
	@param {?function(string):Array.<string>=} addClasses
	@param {?function(string):Array.<string>=} addPseudoClasses
	@return {Object.<string,CSSParser.VPL.Box>}
*/
A3a.vpl.ControlBar.buttonBoxes = function (app, buttons, cssClasses, addClasses, addPseudoClasses) {
	/** @type {Object.<string,CSSParser.VPL.Box>} */
	var boxes = {};
	for (var i = 0; i < buttons.length; i++) {
		if (buttons[i][0] !== "!") {
			var cssPseudoClasses = app.draggedItem && app.commands.canDrop(buttons[i], app.draggedItem)
				? ["possible-drop-target"]
				: [];
			var buttonBox = app.css.getBox({
				tag: "button",
				id: buttons[i].replace(/:/g, "-"),
				clas: addClasses ? cssClasses.concat(addClasses(buttons[i])) : cssClasses,
				pseudoClass: addPseudoClasses ? cssPseudoClasses.concat(addPseudoClasses(buttons[i])) : cssPseudoClasses
			});
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
