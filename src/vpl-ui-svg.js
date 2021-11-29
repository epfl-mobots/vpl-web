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

Support for buttons and widgets defined in SVG.

*/

/** Make a function which draws buttons with SVG
	@param {Object} gui
	@return {A3a.vpl.ControlBar.drawButton}
*/
A3a.vpl.drawButtonSVGFunction = function (gui) {
	/** @const */
	var defaultToJS = [
		"vpl:message-error",
		"vpl:message-warning",
		"vpl:filename"
	];

	return /** @type {A3a.vpl.ControlBar.drawButton} */(function (app, id, ctx, dims, css, cssClasses, box, i18n, isEnabled, isSelected, isPressed, state) {
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
					if (prop[i][0] === "=" && (state || "").toString() !== prop[i].slice(1)) {
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
					btn["draw"].forEach(function (el) {
						if (el["uri"]) {
							var d = A3a.vpl.Canvas.decodeURI(el["uri"]);
							ctx.save();
							if (el["alpha"]) {
								ctx.globalAlpha = el["alpha"];
							}
							var styles = {};
							if (btn["styles"]) {
								btn["styles"].forEach(function (style) {
									styles[(style["complement"] ? "!" : "") + style["id"]] = style["st"];
								});
							}
							gui.svg[d.f].draw(ctx, {
								elementId: d.id,
								style: styles
							});
							if (el["debug"]) {
								ctx.fillStyle = "black";
								ctx.textAlign = "center";
								ctx.textBaseline = "middle";
								ctx.fillText(el["debug"], box.width / 2, box.height / 2);
							}
							ctx.restore();
						}
						if (el["js"]) {
							var param = {
								"pressed": isPressed && isEnabled,
								"unpressed": !(isPressed && isEnabled),
								"selected": isSelected,
								"unselected": !isSelected,
								"disabled": !isEnabled,
								"enabled": isEnabled,
								"state": state
							};
							var fun = new Function("ctx", "$", el["js"]);
							ctx.save();
							ctx.scale(box.width / 1000, box.height / 1000);
							ctx.beginPath();
							fun(ctx, param);
							ctx.restore();
						}
					});
					return;
				}
			}
		}

		// default: js version for those enumerated in defaultToJS, else brown square
		if (defaultToJS.indexOf(id) >= 0) {
			// error message etc.
			A3a.vpl.Commands.drawButtonJS(app, id, ctx, dims, css, cssClasses, box, i18n, isEnabled, isSelected, isPressed, state);
		} else {
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
					var el = b["draw"][0];	// first SVG element
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
	@return {Object.<string,A3a.vpl.Canvas.drawWidget>}
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

	/** @type {Object.<string,A3a.vpl.Canvas.drawWidget>} */
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
			var d = A3a.vpl.Canvas.decodeURI(widget["draw"][0]["uri"]);
			var elBounds = gui.svg[d.f].getElementBounds(d.id);
			widgets[id] = /** @type {A3a.vpl.Canvas.drawWidget} */(function (ctx, id, dims, box) {
				widget["draw"].forEach(function (el) {
					if (el["uri"]) {
						var d = A3a.vpl.Canvas.decodeURI(el["uri"]);
						if (el["alpha"]) {
							ctx.globalAlpha = el["alpha"];
						}
						ctx.save();
						var sc = Math.min(box.width / (elBounds.xmax - elBounds.xmin),
							box.height / (elBounds.ymax - elBounds.ymin));
						ctx.scale(sc, sc);
						ctx.translate(-(elBounds.xmin + elBounds.xmax) / 2, -(elBounds.ymin + elBounds.ymax) / 2);
						gui.svg[d.f].draw(ctx, {elementId: d.id});
						ctx.restore();
						if (el["debug"]) {
							ctx.fillStyle = "black";
							ctx.textAlign = "center";
							ctx.textBaseline = "middle";
							ctx.fillText(el["debug"], 0, 0);
						}
					}
					if (el["js"]) {
						var fun = new Function("ctx", el["js"]);
						ctx.save();
						ctx.scale(box.width, box.height);
						ctx.beginPath();
						fun(ctx);
						ctx.restore();
					}
				});
			});
		}
	});
	return widgets;
};
