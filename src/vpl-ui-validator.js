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

Validation of the json definition of the user interface.

*/

/** Validate ui (correct usage of blocks, control elements etc.)
	@param {Object} ui
	@return {?string} null if ok, or error messages (lf-terminated lines)
*/
A3a.vpl.validateUI = function (ui) {

	var msg = "";

	/** Validate block definition
		@param {Object} b block definition
		@return {number} number of errors (0 for success)
	*/
	function validateBlockDefinition(b) {
		var name = b["name"];
		if (name[0] === "!") {
			// special block
			return 0;
		}

		var errorCount = 0;

		if (!/^\w/.test(name)) {
			msg += "Bad block name \"" + name + "\"\n";
			errorCount++;
		}

		var defParam = b["defaultParameters"];
		var typicalParam = b["typicalParameters"];
		var buttons = b["buttons"];
		var radiobuttons = b["radiobuttons"];
		var sliders = b["sliders"];
		var rotating = b["rotating"];
		var diffwheelmotion = b["diffwheelmotion"];
		var score = b["score"];
		var otherParameters = b["otherParameters"] ? parseInt(b["otherParameters"], 10) : 0;
		var drawArr = b["draw"];
		/** @type {SVG} */
		var svg;

		/** Check if an element specified by its id belongs to a displayed element
			@param {string} id
			@return {boolean}
		*/
		function belongsToDisplayedElement(id) {
			for (var i = 0; i < drawArr.length; i++) {
				if (drawArr[i]["uri"]) {
					var uriDec = A3a.vpl.Canvas.decodeURI(drawArr[i]["uri"]);
					if (ui.svg[uriDec.f].hasAncestor(id, uriDec.id)) {
						return true;
					}
				}
			}
			return false;
		}

		// check that all svg elements exist in a single svg
		if (drawArr) {
			var f = null;
			for (var i = 0; i < drawArr.length; i++) {
				if (drawArr[i]["uri"]) {
					if (f == null) {
						f = A3a.vpl.Canvas.decodeURI(drawArr[i]["uri"]).f;
						svg = ui.svg[f];
					} else {
						var uriDec = A3a.vpl.Canvas.decodeURI(drawArr[i]["uri"]);
						if (uriDec.f !== f) {
							msg += "In block \"" + name + "\", multiple svg\n";
							errorCount++;
						} else {
							if (!svg.hasElement(uriDec.id)) {
								msg += "In block \"" + name + "\", uri \"" + drawArr[i]["uri"] + "\" not found\n";
								errorCount++;
							}
						}
					}
				}
			}
		}

		if (buttons) {
			buttons.forEach(function (button) {
				if (!svg.hasElement(button["id"])) {
					msg += "In block \"" + name + "\", button id \"" + button["id"] + "\" not found\n";
					errorCount++;
				} else if (!belongsToDisplayedElement(button["id"])) {
					msg += "In block \"" + name + "\", button id \"" + button["id"] + "\" not displayed\n";
					errorCount++;
				}
				if (button["val"] == undefined) {
					msg += "In block \"" + name + "\", missing property \"val\"\n";
					errorCount++;
				} else if (button["st"] == undefined) {
					msg += "In block \"" + name + "\", missing property \"st\"\n";
					errorCount++;
				} else if (button["val"].length !== button["st"].length) {
					msg += "In block \"" + name + "\", properties \"val\" and \"st\" have different lengths\n";
					errorCount++;
				}
			})
		}
		if (radiobuttons) {
			radiobuttons.forEach(function (radiobutton) {
				if (!svg.hasElement(radiobutton["id"])) {
					msg += "In block \"" + name + "\", radiobutton id \"" + radiobutton["id"] + "\" not found\n";
					errorCount++;
				} else if (!belongsToDisplayedElement(radiobutton["id"])) {
					msg += "In block \"" + name + "\", radiobutton id \"" + radiobutton["id"] + "\" not displayed\n";
					errorCount++;
				} else {
					if (radiobutton["val"] == undefined) {
						msg += "In block \"" + name + "\", missing property \"val\"\n";
						errorCount++;
					} else if (radiobutton["val"] instanceof Array) {
						msg += "In block \"" + name + "\", illegal array in property \"val\"\n";
						errorCount++;
					} else if (radiobutton["st"] == undefined) {
						msg += "In block \"" + name + "\", missing property \"st\"\n";
						errorCount++;
					} else if (radiobutton["st"].length !== 2) {
						msg += "In block \"" + name + "\", property \"st\" must have length 2\n";
						errorCount++;
					}
				}
			})
		}
		if (sliders) {
			sliders.forEach(function (slider) {
				if (!svg.hasElement(slider["id"])) {
					msg += "In block \"" + name + "\", slider id \"" + slider["id"] + "\" not found\n";
					errorCount++;
				} else if (!belongsToDisplayedElement(slider["id"])) {
					msg += "In block \"" + name + "\", slider id \"" + slider["id"] + "\" not displayed\n";
					errorCount++;
				}
				if (!svg.hasElement(slider["thumbId"])) {
					msg += "In block \"" + name + "\", slider thumbId \"" + slider["thumbId"] + "\" not found\n";
					errorCount++;
				} else if (!belongsToDisplayedElement(slider["thumbId"])) {
					msg += "In block \"" + name + "\", slider thumbId \"" + slider["thumbId"] + "\" not displayed\n";
					errorCount++;
				}
				if (slider["min"] == undefined) {
					msg += "In block \"" + name + "\", slider min undefined\n";
					errorCount++;
				}
				if (slider["max"] == undefined) {
					msg += "In block \"" + name + "\", slider max undefined\n";
					errorCount++;
				}
				if (slider["lowerPartId"]) {
					if (!svg.hasElement(slider["lowerPartId"])) {
						msg += "In block \"" + name + "\", slider lowerPartId \"" + slider["lowerPartId"] + "\" not found\n";
						errorCount++;
					}
				}
				if (slider["snap"]) {
					var snap = slider["snap"];
					if (snap instanceof Array) {
						for (var i = 0; i < snap.length; i++) {
							if (typeof snap[i] === "string") {
								if (!/^`.+`$/.test(snap[i])) {
									msg += "In block \"" + name + "\", invalid slider snap expression\n";
									errorCount++;
								}
							} else if (typeof snap[i] !== "number") {
								msg += "In block \"" + name + "\", slider snap must be a number or a string\n";
								errorCount++;
							}
						}
					}
				}
			})
		}
		if (rotating) {
			rotating.forEach(function (rot) {
				var id = rot["id"];
				var centerId = rot["centerId"];
				var thumbId = rot["thumbId"];
				var idFound = false;
				var centerIdFound = false;
				var thumbIdFound = false;
				if (!svg.hasElement(id)) {
					msg += "In block \"" + name + "\", rotating id \"" + id + "\" not found\n";
					errorCount++;
				} else if (!belongsToDisplayedElement(id)) {
					msg += "In block \"" + name + "\", rotating id \"" + id + "\" not displayed\n";
					errorCount++;
				}
				if (!svg.hasElement(centerId)) {
					msg += "In block \"" + name + "\", rotating centerId \"" + centerId + "\" not found\n";
					errorCount++;
				}
				if (!svg.hasElement(thumbId)) {
					msg += "In block \"" + name + "\", rotating thumbId \"" + thumbId + "\" not found\n";
					errorCount++;
				} else if (!belongsToDisplayedElement(thumbId)) {
					msg += "In block \"" + name + "\", rotating thumbId \"" + thumbId + "\" not displayed\n";
					errorCount++;
				}
				if (!svg.hasAncestor(thumbId, id)) {
					msg += "In block \"" + name + "\", rotating thumbId \"" + thumbId + "\" not a descendent of id \"" + id + "\"\n";
					errorCount++;
				}
			})
		}
		if (diffwheelmotion) {
			if (!svg.hasElement(diffwheelmotion["id"])) {
				msg += "In block \"" + name + "\", diffwheelmotion id \"" + diffwheelmotion["id"] + "\" not found\n";
				errorCount++;
			} else if (!belongsToDisplayedElement(diffwheelmotion["id"])) {
				msg += "In block \"" + name + "\", diffwheelmotion id \"" + diffwheelmotion["id"] + "\" not displayed\n";
				errorCount++;
			}
		}
		if (score) {
			if (!svg.hasElement(score["id"])) {
				msg += "In block \"" + name + "\", score id \"" + score["id"] + "\" not found\n";
				errorCount++;
			} else if (!belongsToDisplayedElement(score["id"])) {
				msg += "In block \"" + name + "\", score id \"" + score["id"] + "\" not displayed\n";
				errorCount++;
			}
			if (typeof score["numHeights"] !== "number" ||
				score["numHeights"] !== Math.round(score["numHeights"]) ||
				score["numHeights"] <= 0) {
				msg += "In block \"" + name + "\", score numHeights must be a strictly positive integer\n";
				errorCount++;
			}
		}

		if ((buttons || radiobuttons || sliders || rotating || score || otherParameters > 0) && !defParam) {
			msg += "In block \"" + name + "\", missing defaultParameters\n";
			errorCount++;
		}

		if (defParam) {
			var nParams = 0;
			if (buttons) {
				nParams += buttons.length;
			}
			if (radiobuttons) {
				nParams += 1;
			}
			if (sliders) {
				nParams += sliders.length;
			}
			if (rotating) {
				nParams += rotating.length;
			}
			if (score) {
				nParams += 2 * Math.floor((defParam.length - nParams) / 2);
			}
			nParams += otherParameters;
			if (nParams !== defParam.length) {
				msg += "In block \"" + name + "\", defaultParameters.length=" + defParam.length +
						", needs " + nParams + " parameters\n";
				errorCount++;
			} else if (typicalParam && typicalParam.length != nParams) {
				msg += "In block \"" + name + "\", typicalParameters.length=" + typicalParam.length +
						", needs " + nParams + " parameters\n";
				errorCount++;
			}
		}

		return errorCount;
	}

	var errorCount = 0;
	if (ui["blocks"]) {
		ui["blocks"].forEach(function (b) {
			errorCount += validateBlockDefinition(b);
		});
	}
	if (errorCount > 0) {
		msg += errorCount + " error" + (errorCount > 1 ? "s" : "") + "\n";
	}

	return msg || null;
};
