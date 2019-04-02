/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** Make a function which draws buttons with SVG
	@param {Object} gui
	@return {A3a.vpl.ControlBar.drawButton}
*/
A3a.vpl.drawButtonSVGFunction = function (gui) {
	return /** @type {A3a.vpl.ControlBar.drawButton} */(function (id, ctx, dims, css, box, isEnabled, isSelected, isPressed, state) {
		/** Check if the requested state match the state in the definition
			@param {Array.<string>} prop
			@return {boolean}
		*/
		function checkState(prop) {
			if (prop == undefined) {
				return true;
			}
			for (var i = 0; i < prop.length; i++) {
				switch (prop[i]) {
				case "pressed":
					if (!isPressed || !isEnabled) {
						return false;
					}
					break;
				case "unpressed":
					if (isPressed && isEnabled) {
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
				default:
					if (prop[i][0] === "=" && state.toString() !== prop[i].slice(1)) {
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
						if (el["debug"]) {
							ctx.fillStyle = "black";
							ctx.textAlign = "center";
							ctx.textBaseline = "middle";
							ctx.fillText(el["debug"], box.width / 2, box.height / 2);
						}
						ctx.restore();
					});
					return;
				}
			}
		}

		// default: brown square
		ctx.fillStyle = "brown";
		ctx.fillRect(0, 0, box.width, box.height);
		ctx.fillStyle = "white";
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.font = Math.round(box.height / 6).toString(10) + "px sans-serif";
		ctx.fillText(id, 0.02 * box.width, 0.02 * box.height);
		ctx.fillText((isPressed ? "pr " : "") +
			(isSelected ? "sel " : "") +
			(isEnabled ? "" : "dis"),
			0.02 * box.width, 0.22 * box.height);
		if (state) {
			ctx.fillText("=" + state, 0.02 * box.width, 0.42 * box.height);
		}
	});
};

/** Make a function which gets the bounds of buttons defined in SVG
	@param {Object} gui
	@return {A3a.vpl.ControlBar.getButtonBounds}
*/
A3a.vpl.getButtonBoundsSVGFunction = function (gui) {
	return /** @type {A3a.vpl.ControlBar.getButtonBounds} */(function (id, dims) {
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

/** Make a function which draws widgets with SVG
	@param {Object} gui
	@return {Object.<string,A3a.vpl.Canvas.Widget>}
*/
A3a.vpl.makeSVGWidgets = function (gui) {
	if (gui["widgets"] == undefined) {
		return {};
	}

	/** Find definition
		@param {string} id
		@return {?Object}
	*/
	function find(id) {
		for (var i = 0; i < gui["widgets"].length; i++) {
			if (gui["widgets"][i]["name"] === id) {
				return gui["widgets"][i];
			}
		}
		return null;
	}

	// reference size: "vpl:block0"
	var block0 = find("vpl:block0");
	if (block0 == null) {
		return {};
	}
	var block0DecURI = A3a.vpl.Canvas.decodeURI(block0["svg"][0]["uri"]);
	var block0Bnds = gui.svg[block0DecURI.f].getElementBounds(block0DecURI.id);
	var block0Size = Math.max(block0Bnds.xmax - block0Bnds.xmin, block0Bnds.ymax - block0Bnds.ymin);

	/** @type {Object.<string,A3a.vpl.Canvas.Widget>} */
	var widgets = {};
	[
		"vpl:then",
		"vpl:error",
		"vpl:warning",
		"vpl:moreHigh",
		"vpl:moreLow"
	].forEach(function (id) {
		var widget = find(id);
		if (widget) {
			var d = A3a.vpl.Canvas.decodeURI(widget["svg"][0]["uri"]);
			var elBounds = gui.svg[d.f].getElementBounds(d.id);
			widgets[id] = {
				draw: /** @type {A3a.vpl.Canvas.drawWidget} */(function (ctx, id, dims) {
					widget["svg"].forEach(function (el) {
						var d = A3a.vpl.Canvas.decodeURI(el["uri"]);
						if (el["alpha"]) {
							ctx.globalAlpha = el["alpha"];
						}
						ctx.save();
						var scale = dims.blockSize / block0Size;
						ctx.scale(scale, scale);
						ctx.translate(-0.5 * (elBounds.xmin + elBounds.xmax),
							-0.5 * (elBounds.ymin + elBounds.ymax));
						gui.svg[d.f].draw(ctx, {elementId: d.id});
						ctx.restore();
						if (el["debug"]) {
							ctx.fillStyle = "black";
							ctx.textAlign = "center";
							ctx.textBaseline = "middle";
							ctx.fillText(el["debug"], 0, 0);
						}
					});
				}),
				bounds: /** @type {A3a.vpl.Canvas.getWidgetBounds} */(function (id, dims) {
					var scale = dims.blockSize / block0Size;
					return {
						xmin: elBounds.xmin * scale,
						xmax: elBounds.xmax * scale,
						ymin: elBounds.ymin * scale,
						ymax: elBounds.ymax * scale
					};
				})
			};
		}
	});
	return widgets;
};
