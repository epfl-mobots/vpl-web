/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Make a function which draws buttons with SVG
	@param {Object} gui
	@return {A3a.vpl.ControlBar.drawButton}
*/
A3a.vpl.drawButtonSVGFunction = function (gui) {
	return /** @type {A3a.vpl.ControlBar.drawButton} */(function (id, ctx, dims, width, height, isEnabled, isSelected, isDown, obj) {
		/** Check if the requested state match the state in the definition
			@param {Array.<string>} state
			@return {boolean}
		*/
		function checkState(state) {
			if (state == undefined) {
				return true;
			}
			for (var i = 0; i < state.length; i++) {
				switch (state[i]) {
				case "pressed":
					if (!isDown) {
						return false;
					}
					break;
				case "unpressed":
					if (isDown) {
						return false;
					}
					break;
				case "selected":
					if (!isSelected) {
						return false;
					}
					break;
				case "unselected":
					if (isSelected) {
						return false;
					}
					break;
				case "disabled":
					if (isEnabled) {
						return false;
					}
					break;
				case "enabled":
					if (!isEnabled) {
						return false;
					}
					break;
				}
			}
			return true;
		}

		// find definition
		if (gui["buttons"]) {
			for (var i = 0; i < gui["buttons"].length; i++) {
				if (gui["buttons"][i]["name"] === id && checkState(gui["buttons"][i]["state"])) {
					var btn = gui["buttons"][i];
					btn["svg"].forEach(function (el) {
						var d = A3a.vpl.Canvas.decodeURI(el["uri"]);
						ctx.save();
						if (el["alpha"]) {
							ctx.globalAlpha = el["alpha"];
						}
						gui.svg[d.f].draw(ctx, {elementId: d.id});
						ctx.restore();
					});
					return;
				}
			}
		}

		// default: brown square
		ctx.fillStyle = "brown";
		ctx.fillRect(0, 0, width, height);
	});
};

/** Make a function which get the bounds of buttons defined in SVG
	@param {Object} gui
	@return {A3a.vpl.ControlBar.getButtonBounds}
*/
A3a.vpl.getButtonBoundsSVGFunction = function (gui) {
	return /** @type {A3a.vpl.ControlBar.getButtonBounds} */(function (id, dims, obj) {
		// find definition with neither "pressed", "selected", nor "disabled"
		if (gui["buttons"]) {
			for (var i = 0; i < gui["buttons"].length; i++) {
				var b = gui["buttons"][i];
				if (b["name"] === id &&
					(b["state"] == undefined ||
						(b["state"].indexOf("pressed") < 0 && b["state"].indexOf("selected") < 0 &&
							b["state"].indexOf("disabled") < 0))) {
					var el = b["svg"][0];	// first SVG element
					var d = A3a.vpl.Canvas.decodeURI(el["uri"]);
					var bnds = gui.svg[d.f].getElementBounds(d.id);
					return bnds;
				}
			}
		}

		// default: standard control size
		return {
			xmin: 0,
			xmax: dims.controlSize,
			ymin: 0,
			ymax: dims.controlSize
		};
	});
};
