/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** Validate ui (correct usage of blocks, control elements etc.)
	@param {Object} ui
	@return {boolean}
*/
A3a.vpl.validateUI = function (ui) {

	var info = window["console"] && window["console"]["info"]
 		? window["console"]["info"]
		: function () {};

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
			info("Bad block name \"" + name + "\"");
			errorCount++;
		}

		var defParam = b["defaultParameters"];
		var buttons = b["buttons"];
		var radiobuttons = b["radiobuttons"];
		var sliders = b["sliders"];
		var rotating = b["rotating"];
		var diffwheelmotion = b["diffwheelmotion"];
		var score = b["score"];
		var otherParameters = b["otherParameters"] ? parseInt(b["otherParameters"], 10) : 0;
		var svgArr = b["svg"];
		/** @type {SVG} */
		var svg;

		/** Check if an element specified by its id belongs to a displayed element
			@param {string} id
			@return {boolean}
		*/
		function belongsToDisplayedElement(id) {
			for (var i = 0; i < svgArr.length; i++) {
				var uriDec = A3a.vpl.Canvas.decodeURI(svgArr[i]["uri"]);
				if (ui.svg[f].hasAncestor(id, uriDec.id)) {
					return true;
				}
			}
			return false;
		}

		// check that all svg elements exist in a single svg
		if (svgArr) {
			var f = A3a.vpl.Canvas.decodeURI(svgArr[0]["uri"]).f;
			svg = ui.svg[f];
			for (var i = 0; i < svgArr.length; i++) {
				var uriDec = A3a.vpl.Canvas.decodeURI(svgArr[i]["uri"]);
				if (uriDec.f !== f) {
					info("In block \"" + name + "\", multiple svg");
					errorCount++;
				} else {
					if (!svg.hasElement(uriDec.id)) {
						info("In block \"" + name + "\", uri \"" + svgArr[i]["uri"] + "\" not found");
						errorCount++;
					}
				}
			}
		}

		if (buttons) {
			buttons.forEach(function (button) {
				if (!svg.hasElement(button["id"])) {
					info("In block \"" + name + "\", button id \"" + button["id"] + "\" not found");
					errorCount++;
				} else if (!belongsToDisplayedElement(button["id"])) {
					info("In block \"" + name + "\", button id \"" + button["id"] + "\" not displayed");
					errorCount++;
				}
				if (button["val"] == undefined) {
					info("In block \"" + name + "\", missing property \"val\"");
					errorCount++;
				} else if (button["st"] == undefined) {
					info("In block \"" + name + "\", missing property \"st\"");
					errorCount++;
				} else if (button["val"].length !== button["st"].length) {
					info("In block \"" + name + "\", properties \"val\" and \"st\" have different lengths");
					errorCount++;
				}
			})
		}
		if (radiobuttons) {
			radiobuttons.forEach(function (radiobutton) {
				if (!svg.hasElement(radiobutton["id"])) {
					info("In block \"" + name + "\", radiobutton id \"" + radiobutton["id"] + "\" not found");
					errorCount++;
				} else if (!belongsToDisplayedElement(radiobutton["id"])) {
					info("In block \"" + name + "\", radiobutton id \"" + radiobutton["id"] + "\" not displayed");
					errorCount++;
				} else {
					if (radiobutton["val"] == undefined) {
						info("In block \"" + name + "\", missing property \"val\"");
						errorCount++;
					} else if (radiobutton["val"] instanceof Array) {
						info("In block \"" + name + "\", illegal array in property \"val\"");
						errorCount++;
					} else if (radiobutton["st"] == undefined) {
						info("In block \"" + name + "\", missing property \"st\"");
						errorCount++;
					} else if (radiobutton["st"].length !== 2) {
						info("In block \"" + name + "\", property \"st\" must have length 2");
						errorCount++;
					}
				}
			})
		}
		if (sliders) {
			sliders.forEach(function (slider) {
				if (!svg.hasElement(slider["id"])) {
					info("In block \"" + name + "\", slider id \"" + slider["id"] + "\" not found");
					errorCount++;
				} else if (!belongsToDisplayedElement(slider["id"])) {
					info("In block \"" + name + "\", slider id \"" + slider["id"] + "\" not displayed");
					errorCount++;
				}
				if (!svg.hasElement(slider["thumbId"])) {
					info("In block \"" + name + "\", slider thumbId \"" + slider["thumbId"] + "\" not found");
					errorCount++;
				} else if (!belongsToDisplayedElement(slider["thumbId"])) {
					info("In block \"" + name + "\", slider thumbId \"" + slider["thumbId"] + "\" not displayed");
					errorCount++;
				}
				if (slider["min"] == undefined) {
					info("In block \"" + name + "\", slider min undefined");
					errorCount++;
				}
				if (slider["max"] == undefined) {
					info("In block \"" + name + "\", slider max undefined");
					errorCount++;
				}
				if (slider["lowerPartId"]) {
					if (!svg.hasElement(slider["lowerPartId"])) {
						info("In block \"" + name + "\", slider lowerPartId \"" + slider["lowerPartId"] + "\" not found");
						errorCount++;
					}
				}
				if (slider["snap"]) {
					var snap = slider["snap"];
					if (snap instanceof Array) {
						for (var i = 0; i < snap.length; i++) {
							if (typeof snap[i] === "string") {
								if (!/^`.+`$/.test(snap[i])) {
									info("In block \"" + name + "\", invalid slider snap expression");
									errorCount++;
								}
							} else if (typeof snap[i] !== "number") {
								info("In block \"" + name + "\", slider snap must be a number or a string");
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
					info("In block \"" + name + "\", rotating id \"" + id + "\" not found");
					errorCount++;
				} else if (!belongsToDisplayedElement(id)) {
					info("In block \"" + name + "\", rotating id \"" + id + "\" not displayed");
					errorCount++;
				}
				if (!svg.hasElement(centerId)) {
					info("In block \"" + name + "\", rotating centerId \"" + centerId + "\" not found");
					errorCount++;
				}
				if (!svg.hasElement(thumbId)) {
					info("In block \"" + name + "\", rotating thumbId \"" + thumbId + "\" not found");
					errorCount++;
				} else if (!belongsToDisplayedElement(thumbId)) {
					info("In block \"" + name + "\", rotating thumbId \"" + thumbId + "\" not displayed");
					errorCount++;
				}
				if (!svg.hasAncestor(thumbId, id)) {
					info("In block \"" + name + "\", rotating thumbId \"" + thumbId + "\" not a descendent of id \"" + id + "\"");
					errorCount++;
				}
			})
		}
		if (diffwheelmotion) {
			if (!svg.hasElement(diffwheelmotion["id"])) {
				info("In block \"" + name + "\", diffwheelmotion id \"" + diffwheelmotion["id"] + "\" not found");
				errorCount++;
			} else if (!belongsToDisplayedElement(diffwheelmotion["id"])) {
				info("In block \"" + name + "\", diffwheelmotion id \"" + diffwheelmotion["id"] + "\" not displayed");
				errorCount++;
			}
		}
		if (score) {
			if (!svg.hasElement(score["id"])) {
				info("In block \"" + name + "\", score id \"" + score["id"] + "\" not found");
				errorCount++;
			} else if (!belongsToDisplayedElement(score["id"])) {
				info("In block \"" + name + "\", score id \"" + score["id"] + "\" not displayed");
				errorCount++;
			}
			if (typeof score["numHeights"] !== "number" ||
				score["numHeights"] !== Math.round(score["numHeights"]) ||
				score["numHeights"] <= 0) {
				info("In block \"" + name + "\", score numHeights must be a strictly positive integer");
				errorCount++;
			}
		}

		if ((buttons || radiobuttons || sliders || rotating || score || otherParameters > 0) && !defParam) {
			info("In block \"" + name + "\", missing defaultParameters");
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
				info("In block \"" + name + "\", defaultParameters.length=" + defParam.length +
						", needs " + nParams + " parameters");
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
		info(errorCount + " error" + (errorCount > 1 ? "s" : ""));
	}

	return errorCount === 0;
};
