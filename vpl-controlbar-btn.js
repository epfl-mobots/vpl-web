/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Add a control button, taking care of disabled ones
	@param {A3a.vpl.UIConfig} uiConfig
	@param {string} id
	@return {void}
*/
A3a.vpl.ControlBar.prototype.addButton = function (uiConfig, id) {
	var disabled = uiConfig.isDisabled(id);
	if (window["vplCommands"].find(id).isAvailable() && (uiConfig.customizationMode || !disabled)) {
		var canvas = this.canvas;
		var cmd = window["vplCommands"].find(id);
		var keepAvailable = cmd.keep;
		var obj = cmd.obj;

		this.addControl(
			function (ctx, width, height, isDown) {
				A3a.vpl.Commands.drawButtonJS(id, ctx, canvas.dims, width, height,
					window["vplCommands"].isEnabled(id),
					window["vplCommands"].isSelected(id),
					isDown,
					obj);
				if (disabled) {
					canvas.disabledMark(0, 0, width, height);
				}
			},
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
