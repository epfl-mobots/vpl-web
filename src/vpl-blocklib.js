/*
	Copyright 2018-2023 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Definition of VPL3 blocks in JavaScript stored in array
A3a.vpl.BlockTemplate.lib. An alternative to definitions with SVG for the block
appearance and JSON for the block interactive controls and code generation.
Only Aseba code generation is defined; generation for other programming
languages is defined elsewhere.

*/

/**
	@param {A3a.vpl.Canvas.buttonShape} shape
	@param {A3a.vpl.BlockParamAccessibility.Control.OnAction} onSelect
	@param {A3a.vpl.BlockParamAccessibility.Control.OnAction} onUp
	@param {A3a.vpl.BlockParamAccessibility.Control.OnAction} onDown
	@return {A3a.vpl.BlockParamAccessibility.Control}
*/
A3a.vpl.BlockTemplate.buttonToAccessibilityControl = function (shape, onSelect, onUp, onDown) {
	var sz = (shape.size || 1) * 0.1;
	return new A3a.vpl.BlockParamAccessibility.Control(0.5 - shape.y - sz, 0.5 + shape.x - sz,
		0.5 - shape.y + sz, 0.5 + shape.x + sz,
		onSelect,
		onUp,
		onDown);
};

/** Return next value in an array of possible values
	@param {*} currentValue
	@param {Array.<*>} valueSet
	@return {*}
*/
A3a.vpl.BlockTemplate.nextCheckboxState = function (currentValue, valueSet) {
	var currentIndex = valueSet.indexOf(currentValue);
	return valueSet[(currentIndex + 1) % valueSet.length];
};

/**
	@param {Array.<A3a.vpl.Canvas.buttonShape>} shapes
	@param {Array.<*>} valueSet
	@return {Array.<A3a.vpl.BlockParamAccessibility.Control>}
*/
A3a.vpl.BlockTemplate.checkboxesToAccessibilityControls = function (shapes, valueSet) {
	return shapes.map(function (shape, i) {
		return A3a.vpl.BlockTemplate.buttonToAccessibilityControl(shape,
			function (block) {
				block.param[i] = A3a.vpl.BlockTemplate.nextCheckboxState(block.param[i], valueSet);
			},
			null, null);
	});
};

/**
	@param {Array.<A3a.vpl.Canvas.buttonShape>} shapes
	@return {Array.<A3a.vpl.BlockParamAccessibility.Control>}
*/
A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls = function (shapes) {
	return shapes.map(function (shape, i) {
		return A3a.vpl.BlockTemplate.buttonToAccessibilityControl(shape,
			function (block) {
				block.param[0] = i;
			},
			null, null);
	});
};

/**
	@param {number} i
	@param {number} top top of the slider (between 0 and bottom, 0=top)
	@param {number} left left of the slider (between 0 and right, 0=left)
	@param {number} bottom bottom of the slider (between top and 1, 1=bottom)
	@param {number} right right of the slider (between left and 1, 1=right)
	@param {number} min
	@param {number} max
	@param {number} num
	@return {A3a.vpl.BlockParamAccessibility.Control}
*/
A3a.vpl.BlockTemplate.sliderToAccessibilityControl = function (i, top, left, bottom, right, min, max, num) {
	// rounding factor to get rid of numerical error drift
	var sc = Math.pow(10, Math.round(Math.log10(Math.abs(max - min) / num / 10)));
	return new A3a.vpl.BlockParamAccessibility.Control(top, left, bottom, right,
		null,
		function (block) {
			block.param[i] = sc * Math.round(Math.min(max, block.param[i] + (max - min) / (num - 1)) / sc);
		},
		function (block) {
			block.param[i] = sc * Math.round(Math.max(min, block.param[i] - (max - min) / (num - 1)) / sc);
		});
};

/**
	@param {number} i
	@param {number} n
	@param {A3a.vpl.BlockParamAccessibility.Control.OnAction} onSelect
	@param {A3a.vpl.BlockParamAccessibility.Control.OnAction} onUp
	@param {A3a.vpl.BlockParamAccessibility.Control.OnAction} onDown
	@return {A3a.vpl.BlockParamAccessibility.Control}
*/
A3a.vpl.BlockTemplate.stateButtonToAccessibilityControl = function (i, n, onSelect, onUp, onDown) {
	var x1 = 0.5 + 0.37 * Math.cos(Math.PI * (0.5 - 2 * (i - 0.3) / n));
	var y1 = 0.5 - 0.37 * Math.sin(Math.PI * (0.5 - 2 * (i - 0.3) / n));
	var x2 = 0.5 + 0.37 * Math.cos(Math.PI * (0.5 - 2 * (i + 0.3) / n));
	var y2 = 0.5 - 0.37 * Math.sin(Math.PI * (0.5 - 2 * (i + 0.3) / n));
	return new A3a.vpl.BlockParamAccessibility.Control(
		Math.min(y1, y2) - 0.1,
		Math.min(x1, x2) - 0.1,
		Math.max(y1, y2) + 0.1,
		Math.max(x1, x2) + 0.1,
		onSelect, onUp, onDown);
};

/**
	@param {Array.<*>} valueSet
	@return {Array.<A3a.vpl.BlockParamAccessibility.Control>}
*/
A3a.vpl.BlockTemplate.state4ToAccessibilityControls = function (valueSet) {
	/** @type {Array.<A3a.vpl.BlockParamAccessibility.Control>} */
	var c = [];
	/** @const */
	var map = [1, 3, 2, 0];
	for (var i = 0; i < 4; i++) {
		c.push(A3a.vpl.BlockTemplate.stateButtonToAccessibilityControl(i + 0.5, 4,
			(function (i) {
				return function (block) {
					block.param[map[i]] = A3a.vpl.BlockTemplate.nextCheckboxState(block.param[map[i]], valueSet);
				};
			})(i),
			null, null));
	}
	return c;
};

/**
	@return {Array.<A3a.vpl.BlockParamAccessibility.Control>}
*/
A3a.vpl.BlockTemplate.state8ToAccessibilityControls = function () {
	/** @type {Array.<A3a.vpl.BlockParamAccessibility.Control>} */
	var c = [];
	for (var i = 0; i < 8; i++) {
		c.push(A3a.vpl.BlockTemplate.stateButtonToAccessibilityControl(i, 8,
			(function (i) {
				return function (block) {
					block.param[0] = i;
				};
			})(i),
			function (block) {
				block.param[0] = (block.param[0] + 1) % 8;
			},
			function (block) {
				block.param[0] = (block.param[0] + 7) % 8;
			}));
	}
	return c;
};

/**
	@param {number} left
	@param {number} right
	@param {number} low
	@param {number} high
	@param {number} numNotes
	@param {number} numHeights
	@return {Array.<A3a.vpl.BlockParamAccessibility.Control>}
*/
A3a.vpl.BlockTemplate.notesToAccessibilityControls = function (left, right, low, high, numNotes, numHeights) {
	/** @type {Array.<A3a.vpl.BlockParamAccessibility.Control>} */
	var c = [];
	for (var i = 0; i < numNotes; i++) {
		(function (i) {
			c.push(new A3a.vpl.BlockParamAccessibility.Control(0.1, left + i * (right - left) / numNotes,
				0.9, left + (i + 1) * (right - left) / numNotes,
				function (block) {
					// select: change duration
					block.param[2 * i + 1] = A3a.vpl.BlockTemplate.nextCheckboxState(block.param[2 * i + 1], [0, 1, 2]);
				},
				function (block) {
					// up
					if (block.param[2 * i + 1] === 0) {
						block.param[2 * i] = 0;
						block.param[2 * i + 1] = 1;
					} else {
						block.param[2 * i] =  Math.min(block.param[2 * i] + 1, numHeights - 1);
					}
				},
				function (block) {
					// down
					if (block.param[2 * i + 1] === 0) {
						block.param[2 * i] = 0;
						block.param[2 * i + 1] = 1;
					} else {
						block.param[2 * i] =  Math.max(block.param[2 * i] - 1, 0);
					}
				},
				function (block, x, y) {
					// click (nodrag accessibility mode)
					var pitch = numHeights - 1 - Math.floor(y * numHeights * 0.9999);
					if (block.param[2 * i + 1] === 0) {
						block.param[2 * i] = pitch;
						block.param[2 * i + 1] = 1;
					} else if (block.param[2 * i] === pitch) {
						block.param[2 * i + 1] = A3a.vpl.BlockTemplate.nextCheckboxState(block.param[2 * i + 1], [0, 1, 2]);
					} else {
						block.param[2 * i] = pitch;
					}
				}));
		})(i);
	}
	return c;
};

/**
	@type {Array.<A3a.vpl.BlockTemplate>}
*/
A3a.vpl.BlockTemplate.lib =	[
	new A3a.vpl.BlockTemplate({
		name: "!stop",
		type: A3a.vpl.blockType.hidden,
	}),
	new A3a.vpl.BlockTemplate({
		name: "!stop and blink",
		type: A3a.vpl.blockType.hidden,
	}),
	new A3a.vpl.BlockTemplate({
		name: "!init",
		type: A3a.vpl.blockType.hidden,
	}),
	new A3a.vpl.BlockTemplate({
		name: "!volume",
		type: A3a.vpl.blockType.hidden,
	}),
	new A3a.vpl.BlockTemplate({
		name: "!trace",
		type: A3a.vpl.blockType.hidden,
	}),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "c", x: 0, y: 0, r: 0},
			{sh: "t", x: 0, y: 0.3, r: 0},
			{sh: "t", x: 0, y: -0.3, r: Math.PI},
			{sh: "t", x: 0.3, y: 0, r: Math.PI / 2},
			{sh: "t", x: -0.3, y: 0, r: -Math.PI / 2},
		];
		return {
			name: "button 1",
			type: A3a.vpl.blockType.event,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0]; },
			paramAccessibility:
				new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls(buttons)),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop();
				var i = block.param[0];
				canvas.buttons(buttons, [i == 0, i == 1, i == 2, i == 3, i == 4]);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					block.param[0] = i;
					block.endChange();
				}
				return i;
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "c", x: 0, y: 0, r: 0},
			{sh: "t", x: 0, y: 0.3, r: 0},
			{sh: "t", x: 0, y: -0.3, r: Math.PI},
			{sh: "t", x: 0.3, y: 0, r: Math.PI / 2},
			{sh: "t", x: -0.3, y: 0, r: -Math.PI / 2},
		];
		return {
			name: "button",
			modes: [A3a.vpl.mode.custom],
			type: A3a.vpl.blockType.event,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [false, false, false, false, false]; },
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			typicalParam: function () { return [false, false, true, false, true]; },
			paramAccessibility:
				new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.checkboxesToAccessibilityControls(buttons, [false, true])),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop();
				canvas.buttons(buttons, block.param);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					block.param[i] = !block.param[i];
					block.endChange();
				}
				return i;
			},
			/** @type {A3a.vpl.BlockTemplate.validateFun} */
			validate: function (block) {
				for (var i = 0; i < 5; i++) {
					if (block.param[i]) {
						return null;
					}
				}
				return new A3a.vpl.Error("No button specified", true);
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "r", x: 0, y: 0.4, r: 0, str: "2"},
			{sh: "r", x: -0.22, y: 0.35, r: -0.45, str: "1"},
			{sh: "r", x: 0.22, y: 0.35, r: 0.45, str: "3"},
			{sh: "r", x: -0.4, y: 0.22, r: -0.8, str: "0"},
			{sh: "r", x: 0.4, y: 0.22, r: 0.8, str: "4"},
			{sh: "r", x: -0.2, y: -0.4, str: "5"},
			{sh: "r", x: 0.2, y: -0.4, str: "6"},
		];
		return {
			name: "horiz prox",
			modes: [A3a.vpl.mode.basic],
			type: A3a.vpl.blockType.event,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0, 0, 0, 0, 0, 0, 0]; },
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			typicalParam: function () { return [0, 1, -1, 1, -1, 0, 0]; },
			paramAccessibility:
				new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.checkboxesToAccessibilityControls(buttons, [0, 1, -1])),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop();
				canvas.buttons(buttons, block.param, {cross: -1});
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					block.param[i] = (block.param[i] + 2) % 3 - 1;
					block.endChange();
				}
				return i;
			},
			/** @type {A3a.vpl.BlockTemplate.validateFun} */
			validate: function (block) {
				for (var i = 0; i < 7; i++) {
					if (block.param[i]) {
						return null;
					}
				}
				return new A3a.vpl.Error("No proximity sensor specified", true);
			},
			/** @type {A3a.vpl.BlockTemplate.changeModeFun} */
			changeMode: function (block, mode) {
				switch (mode) {
				case A3a.vpl.mode.advanced:
					var newBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("horiz prox adv"),
						null, null);
					newBlock.param = block.param.concat(newBlock.param.slice(7));
					return newBlock;
				default:
					return block;
				}
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "r", x: 0, y: 0.4, r: 0, str: "2"},
			{sh: "r", x: -0.22, y: 0.35, r: -0.45, str: "1"},
			{sh: "r", x: 0.22, y: 0.35, r: 0.45, str: "3"},
			{sh: "r", x: -0.4, y: 0.22, r: -0.8, str: "0"},
			{sh: "r", x: 0.4, y: 0.22, r: 0.8, str: "4"},
			{sh: "r", x: -0.2, y: -0.4, str: "5"},
			{sh: "r", x: 0.2, y: -0.4, str: "6"},
		];
		return {
			name: "horiz prox adv",
			modes: [A3a.vpl.mode.custom],
			type: A3a.vpl.blockType.event,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () {
				return [
					0, 0, 0, 0, 0, 0, 0,	// sensor modes
					0.1, 0.4	// levels (700+0.1*3300 approx 1000, 700+0.4*3300 approx 2000)
				];
			},
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			typicalParam: function () {
				return [
					0, 1, 2, 1, 2, 3, 3,	// sensor modes
					0.1, 0.4	// levels (700+0.1*3300 approx 1000, 700+0.4*3300 approx 2000)
				];
			},
			paramAccessibility:
				new A3a.vpl.BlockParamAccessibility(
					A3a.vpl.BlockTemplate.checkboxesToAccessibilityControls(buttons, [0, 1, 2, 3])
						.concat(
							A3a.vpl.BlockTemplate.sliderToAccessibilityControl(7,
								0.6, -0.05, 0.8, 1.05,
								0.25, 0.75, 3),
							A3a.vpl.BlockTemplate.sliderToAccessibilityControl(8,
								0.38, -0.05, 0.58, 1.05,
								0.25, 0.75, 3)
						)
				),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop();
				canvas.buttons(buttons, block.param,
					{
						fillColors: ["white", "red", "#333", "#888"],
						strokeColors: ["#aaa", "black", "black", "black"],
						cross: 2
					}
				);
				canvas.slider(/** @type {number} */(block.param[8]), 0.02, false,
					"red", A3a.vpl.draw.levelType.high);
				canvas.slider(/** @type {number} */(block.param[7]), -0.2, false,
					"black", A3a.vpl.draw.levelType.low);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				// sensor click
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					block.param[i] = (block.param[i] + 1) % 4;
					block.endChange();
					return i;
				}
				// slider drag
				if (canvas.sliderCheck(0.02, false, width, height, left, top, ev)) {
					block.beginChange();
					return 8;
				}
				if (canvas.sliderCheck(-0.2, false, width, height, left, top, ev)) {
					block.beginChange();
					return 7;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				if (dragIndex >= 7) {
					var val = canvas.sliderDrag(false, width, height, left, top, ev);
					block.param[dragIndex] = Math.max(0, Math.min(1, val));
					block.endChange();
				}
			},
			/** @type {A3a.vpl.BlockTemplate.validateFun} */
			validate: function (block) {
				for (var i = 0; i < 7; i++) {
					if (block.param[i]) {
						return null;
					}
				}
				return new A3a.vpl.Error("No sensor specified", true);
			},
			/** @type {A3a.vpl.BlockTemplate.changeModeFun} */
			changeMode: function (block, mode) {
				switch (mode) {
				case A3a.vpl.mode.basic:
					var defParam = block.blockTemplate.defaultParam();
					if (block.param[7] === defParam[7] && block.param[8] === defParam[8]) {
						var newBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("horiz prox"),
							null, null);
						newBlock.param = block.param.slice(0, 7);
						return newBlock;
					}
					// fallthrough
				default:
					return block;
				}
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "r", x: 0, y: 0.4, r: 0, str: "2"},
			{sh: "r", x: -0.22, y: 0.35, r: -0.45, str: "1"},
			{sh: "r", x: 0.22, y: 0.35, r: 0.45, str: "3"},
			{sh: "r", x: -0.4, y: 0.22, r: -0.8, str: "0"},
			{sh: "r", x: 0.4, y: 0.22, r: 0.8, str: "4"},
			{sh: "r", x: -0.2, y: -0.4, str: "5"},
			{sh: "r", x: 0.2, y: -0.4, str: "6"},
		];
		return {
			name: "horiz prox 1",
			modes: [A3a.vpl.mode.advanced],
			type: A3a.vpl.blockType.event,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () {
				return [
					0, 0, 0, 0, 0, 0, 0,	// sensor modes
					0.25	// levels (700+0.25*3300 approx 1500)
				];
			},
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			typicalParam: function () {
				return [
					0, 1, -1, 1, -1, 0, 0,	// sensor modes
					0.25	// levels (700+0.25*3300 approx 1500)
				];
			},
			paramAccessibility:
				new A3a.vpl.BlockParamAccessibility(
					A3a.vpl.BlockTemplate.checkboxesToAccessibilityControls(buttons, [0, 1, -1])
						.concat(A3a.vpl.BlockTemplate.sliderToAccessibilityControl(7,
							0.4, -0.05, 0.6, 1.05,
							0.25, 0.75, 3))
				),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop();
				canvas.buttons(buttons, block.param, {cross: -1});
				canvas.slider(/** @type {number} */(block.param[7]), -0.1, false,
					"black", A3a.vpl.draw.levelType.low);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				// sensor click
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					block.param[i] = (block.param[i] + 2) % 3 - 1;
					block.endChange();
					return i;
				}
				// slider drag
				if (canvas.sliderCheck(-0.1, false, width, height, left, top, ev)) {
					block.beginChange();
					return 7;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				if (dragIndex >= 7) {
					var val = canvas.sliderDrag(false, width, height, left, top, ev);
					block.param[dragIndex] = Math.max(0.25, Math.min(0.75, Math.round(val * 4) / 4));
					block.endChange();
				}
			},
			/** @type {A3a.vpl.BlockTemplate.validateFun} */
			validate: function (block) {
				for (var i = 0; i < 7; i++) {
					if (block.param[i]) {
						return null;
					}
				}
				return new A3a.vpl.Error("No sensor specified", true);
			},
			/** @type {A3a.vpl.BlockTemplate.changeModeFun} */
			changeMode: function (block, mode) {
				switch (mode) {
				case A3a.vpl.mode.basic:
					var defParam = block.blockTemplate.defaultParam();
					if (block.param[7] === defParam[7]) {
						var newBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("horiz prox"),
							null, null);
						newBlock.param = block.param.slice(0, 7);
						return newBlock;
					}
					// fallthrough
				default:
					return block;
				}
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "r", x: -0.15, y: 0.35, str: "0"},
			{sh: "r", x: 0.15, y: 0.35, str: "1"},
		];
		return {
			name: "ground",
			modes: [A3a.vpl.mode.basic],
			type: A3a.vpl.blockType.event,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0, 0]; },
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			typicalParam: function () { return [1, -1]; },
			paramAccessibility:
				new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.checkboxesToAccessibilityControls(buttons, [0, 1, -1])),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop({withWheels: true});
				canvas.buttons(buttons, block.param, {cross: -1});
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					block.param[i] = (block.param[i] + 2) % 3 - 1;
					block.endChange();
				}
				return i;
			},
			/** @type {A3a.vpl.BlockTemplate.validateFun} */
			validate: function (block) {
				if (block.param[0] || block.param[1]) {
					return null;
				}
				return new A3a.vpl.Error("No ground sensor specified", true);
			},
			/** @type {A3a.vpl.BlockTemplate.changeModeFun} */
			changeMode: function (block, mode) {
				switch (mode) {
				case A3a.vpl.mode.advanced:
					var newBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("ground adv"),
						null, null);
					newBlock.param = block.param.concat(newBlock.param.slice(2));
					return newBlock;
				default:
					return block;
				}
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "r", x: -0.15, y: 0.35, str: "0"},
			{sh: "r", x: 0.15, y: 0.35, str: "1"},
		];
		return {
			name: "ground adv",
			modes: [A3a.vpl.mode.custom],
			type: A3a.vpl.blockType.event,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () {
				return [
					0, 0,	// sensor modes
					0.4, 0.6	// levels (0.4*1000=400, 0.6*1000=600)
				];
			},
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			typicalParam: function () {
				return [
					1, 2,	// sensor modes
					0.4, 0.6	// levels (0.4*1000=400, 0.6*1000=600)
				];
			},
			paramAccessibility:
				new A3a.vpl.BlockParamAccessibility(
					A3a.vpl.BlockTemplate.checkboxesToAccessibilityControls(buttons, [0, 1, 2, 3])
						.concat(
							A3a.vpl.BlockTemplate.sliderToAccessibilityControl(2,
								0.6, -0.05, 0.8, 1.05,
								0.25, 0.75, 3),
							A3a.vpl.BlockTemplate.sliderToAccessibilityControl(3,
								0.38, -0.05, 0.58, 1.05,
								0.25, 0.75, 3)
						)
				),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop({withWheels: true});
				canvas.buttons(buttons, block.param,
					{
						fillColors: ["white", "red", "#333", "#888"],
						strokeColors: ["#aaa", "black", "black", "black"],
						cross: 2
					}
				);
				canvas.slider(/** @type {number} */(block.param[3]), 0.02, false,
					"red", A3a.vpl.draw.levelType.high);
				canvas.slider(/** @type {number} */(block.param[2]), -0.2, false,
					"black", A3a.vpl.draw.levelType.low);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				// sensor click
				if (i !== null) {
					block.beginChange();
					block.param[i] = (block.param[i] + 1) % 4;
					block.endChange();
					return i;
				}
				// slider drag
				if (canvas.sliderCheck(0.02, false, width, height, left, top, ev)) {
					block.beginChange();
					return 3;
				}
				if (canvas.sliderCheck(-0.2, false, width, height, left, top, ev)) {
					block.beginChange();
					return 2;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				if (dragIndex >= 2) {
					var val = canvas.sliderDrag(false, width, height, left, top, ev);
					block.param[dragIndex] = Math.max(0, Math.min(1, val));
					block.endChange();
				}
			},
			/** @type {A3a.vpl.BlockTemplate.validateFun} */
			validate: function (block) {
				if (block.param[0] || block.param[1]) {
					return null;
				}
				return new A3a.vpl.Error("No ground sensor specified", true);
			},
			/** @type {A3a.vpl.BlockTemplate.changeModeFun} */
			changeMode: function (block, mode) {
				switch (mode) {
				case A3a.vpl.mode.basic:
					var defParam = block.blockTemplate.defaultParam();
					if (block.param[2] === defParam[2] && block.param[3] === defParam[3]) {
						var newBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("ground"),
							null, null);
						newBlock.param = block.param.slice(0, 2);
						return newBlock;
					}
					// fallthrough
				default:
					return block;
				}
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "r", x: -0.15, y: 0.35, str: "0"},
			{sh: "r", x: 0.15, y: 0.35, str: "1"},
		];
		return {
			name: "ground 1",
			modes: [A3a.vpl.mode.advanced],
			type: A3a.vpl.blockType.event,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () {
				return [
					0, 0,	// sensor modes
					0.5	// levels (0.5*1000=500)
				];
			},
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			typicalParam: function () {
				return [
					1, -1,	// sensor modes
					0.5	// levels (0.5*1000=500)
				];
			},
			paramAccessibility:
				new A3a.vpl.BlockParamAccessibility(
					A3a.vpl.BlockTemplate.checkboxesToAccessibilityControls(buttons, [0, 1, -1])
						.concat(A3a.vpl.BlockTemplate.sliderToAccessibilityControl(2,
							0.4, -0.05, 0.6, 1.05,
							0.25, 0.75, 3))
				),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop({withWheels: true});
				canvas.buttons(buttons, block.param, {cross: -1});
				canvas.slider(/** @type {number} */(block.param[2]), 0, false,
					"black", A3a.vpl.draw.levelType.low);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				// sensor click
				if (i !== null) {
					block.beginChange();
					block.param[i] = (block.param[i] + 2) % 3 - 1;
					block.endChange();
					return i;
				}
				// slider drag
				if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
					block.beginChange();
					return 2;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				if (dragIndex >= 2) {
					var val = canvas.sliderDrag(false, width, height, left, top, ev);
					block.param[dragIndex] = Math.max(0.25, Math.min(0.75, Math.round(4 * val) / 4));
					block.endChange();
				}
			},
			/** @type {A3a.vpl.BlockTemplate.validateFun} */
			validate: function (block) {
				if (block.param[0] || block.param[1]) {
					return null;
				}
				return new A3a.vpl.Error("No ground sensor specified", true);
			},
			/** @type {A3a.vpl.BlockTemplate.changeModeFun} */
			changeMode: function (block, mode) {
				switch (mode) {
				case A3a.vpl.mode.basic:
					var defParam = block.blockTemplate.defaultParam();
					if (block.param[2] === defParam[2]) {
						var newBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("ground"),
							null, null);
						newBlock.param = block.param.slice(0, 2);
						return newBlock;
					}
					// fallthrough
				default:
					return block;
				}
			}
		};
	})()),
	new A3a.vpl.BlockTemplate({
		name: "tap",
		modes: [A3a.vpl.mode.basic, A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.event,
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.ctx.translate(canvas.dims.blockSize * 0.05, 0);
			canvas.robotSide(0.7);
			canvas.tap(0.7);
		},
		/** @type {A3a.vpl.BlockTemplate.changeModeFun} */
		changeMode: function (block, mode) {
			switch (mode) {
			case A3a.vpl.mode.advanced:
				return new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("accelerometer"),
					null, null);
			default:
				return block;
			}
		}
	}),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "c", x: -0.33, y: -0.3, r: 0},
			{sh: "c", x: 0, y: -0.3, r: 0},
			{sh: "c", x: 0.33, y: -0.3, r: 0}
		];
		return {
			name: "accelerometer",
			modes: [A3a.vpl.mode.custom],
			type: A3a.vpl.blockType.event,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () {
				return [
					0,	// 0 for tap, 1 for roll, 2 for pitch
					0 // integer from -6 to 6
				];
			},
			paramAccessibility:
			 	new A3a.vpl.BlockParamAccessibility(
						A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls(buttons)
						.concat(
							new A3a.vpl.BlockParamAccessibility.Control(0.1, 0.1, 0.9, 0.9,
								null,
								function (block) {
									block.param[1] = block.param[0] === 0 ? 0
										: block.param[0] === 1
											? Math.min(block.param[1] + 1, 6)
											: Math.max(block.param[1] - 1, -6);
								},
								function (block) {
									block.param[1] = block.param[0] === 0 ? 0
										: block.param[0] === 1
											? Math.max(block.param[1] - 1, -6)
											: Math.min(block.param[1] + 1, 6);
								})
							)
					),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				/** @type {number} */
				var dir = /** @type {number} */(block.param[0]);
				/** @type {number} */
				var a = /** @type {number} */(block.param[1]);
				if (dir === 0) {
					canvas.ctx.save();
					canvas.ctx.translate(0.08 * canvas.dims.blockSize,
						-0.2 * canvas.dims.blockSize);
					canvas.robotSide(0.7);
					canvas.tap(0.7);
					canvas.ctx.restore();
				} else {
					canvas.robotAccelerometer(dir === 2, dir === 2 ? -a : a);
				}
				canvas.buttons(buttons, [dir===0, dir===1, dir===2]);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				if (block.param[0] !== 0 && canvas.accelerometerCheck(width, height, left, top, ev)) {
					block.beginChange();
					return 1;
				}
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					block.param[0] = i;
					block.endChange();
					return 2;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				if (dragIndex === 1) {
					var angle = canvas.accelerometerDrag(width, height, left, top, ev);
					block.param[1] = block.param[0] === 2 ? -angle : angle;
					block.endChange();
				}
			},
			/** @type {A3a.vpl.BlockTemplate.changeModeFun} */
			changeMode: function (block, mode) {
				switch (mode) {
				case A3a.vpl.mode.basic:
					if (block.param[0] === 0) {
						return new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("tap"),
							null, null);
					}
					// fallthrough
				default:
					return block;
				}
			}
		};
	})()),
	new A3a.vpl.BlockTemplate({
		name: "roll",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.event,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () {
			return [
				0 // integer from -12 to 11
			];
		},
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		typicalParam: function () {
			return [
				2 // integer from -12 to 11
			];
		},
		paramAccessibility: new A3a.vpl.BlockParamAccessibility([
			new A3a.vpl.BlockParamAccessibility.Control(0.1, 0.1, 0.9, 0.9,
				null,
				function (block) { block.param[0] = (block.param[0] + 13) % 24 - 12; },
				function (block) { block.param[0] = (block.param[0] + 11) % 24 - 12; })
		]),
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			/** @type {number} */
			var a = /** @type {number} */(block.param[0]);
			canvas.robotAccelerometer(false, a);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			if (canvas.accelerometerCheck(width, height, left, top, ev, true)) {
				block.beginChange();
				return 1;
			}
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
			var angle = canvas.accelerometerDrag(width, height, left, top, ev, true);
			block.param[0] = angle;
			block.endChange();
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "pitch",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.event,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () {
			return [
				0 // integer from -12 to 11
			];
		},
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		typicalParam: function () {
			return [
				2 // integer from -12 to 11
			];
		},
		paramAccessibility: new A3a.vpl.BlockParamAccessibility([
			new A3a.vpl.BlockParamAccessibility.Control(0.1, 0.1, 0.9, 0.9,
				null,
				function (block) { block.param[0] = (block.param[0] + 13) % 24 - 12; },
				function (block) { block.param[0] = (block.param[0] + 11) % 24 - 12; })
		]),
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			/** @type {number} */
			var a = /** @type {number} */(block.param[0]);
			canvas.robotAccelerometer(true, a);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			if (canvas.accelerometerCheck(width, height, left, top, ev, true)) {
				block.beginChange();
				return 1;
			}
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
			var angle = canvas.accelerometerDrag(width, height, left, top, ev, true);
			block.param[0] = angle;
			block.endChange();
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "yaw",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.event,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () {
			return [
				0 // integer from -12 to 11
			];
		},
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		typicalParam: function () {
			return [
				2 // integer from -12 to 11
			];
		},
		paramAccessibility: new A3a.vpl.BlockParamAccessibility([
			new A3a.vpl.BlockParamAccessibility.Control(0.1, 0.1, 0.9, 0.9,
				null,
				function (block) { block.param[0] = (block.param[0] + 13) % 24 - 12; },
				function (block) { block.param[0] = (block.param[0] + 11) % 24 - 12; })
		]),
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			/** @type {number} */
			var a = /** @type {number} */(block.param[0]);
			canvas.robotYaw(a);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			if (canvas.accelerometerCheck(width, height, left, top, ev, true)) {
				block.beginChange();
				return 1;
			}
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
			var angle = canvas.accelerometerDrag(width, height, left, top, ev, true);
			block.param[0] = angle;
			block.endChange();
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "clap",
		type: A3a.vpl.blockType.event,
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.microphone();
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "init",
		modes: [A3a.vpl.mode.basic, A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.event,
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawInit();
		},
		noState: true
	}),
	new A3a.vpl.BlockTemplate({
		name: "timer",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.event,
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawTimer(0, true, false);
		}
	}),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "c", x: 0.3, y: 0.2},
			{sh: "c", x: 0.3, y: -0.2}
		];
		return {
			name: "clock",
			modes: [],
			type: A3a.vpl.blockType.event,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [10]; },
			paramAccessibility: new A3a.vpl.BlockParamAccessibility([
				A3a.vpl.BlockTemplate.buttonToAccessibilityControl(buttons[0], function (block) { block.param[0] = 10; }, null, null),
				A3a.vpl.BlockTemplate.buttonToAccessibilityControl(buttons[1], function (block) { block.param[0] = 20; }, null, null)
			]),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop();
				var s = canvas.dims.blockSize;
				A3a.vpl.Canvas.drawClock(canvas.ctx,
					s * 0.1, s * 0.6, s * 0.3, s * 0.15, 4,
					{
						style: block.param[0] === 10 ? "black" : "#222",
						lineWidth: canvas.dims.blockLineWidth
					});
				A3a.vpl.Canvas.drawClock(canvas.ctx,
					s * 0.1, s * 0.6, s * 0.70, s * 0.15, 8,
					{
						style: block.param[0] === 20 ? "black" : "#222",
						lineWidth: canvas.dims.blockLineWidth
					});
				canvas.buttons(buttons, [
					block.param[0] === 10,
					block.param[0] === 20
				]);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					block.param[0] = i === 0 ? 10 : 20;
					block.endChange();
				}
				return i;
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "t", x: -0.25, y: 0, r: -Math.PI / 2},
			{sh: "t", x: 0, y: 0.25, r: 0},
			{sh: "t", x: 0, y: -0.25, r: Math.PI},
			{sh: "t", x: 0.25, y: 0, r: Math.PI / 2},
			{sh: "c", x: 0, y: 0, r: 0},
		];
		return {
			name: "remote control arrows",
			modes: [],
			type: A3a.vpl.blockType.event,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0]; },
			paramAccessibility:
				new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls(buttons)),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.remoteControl();
				var i = block.param[0];
				canvas.buttons(buttons, [i == 0, i == 1, i == 2, i == 3, i == 4]);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					block.param[0] = i;
					block.endChange();
				}
				return i;
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "t", x: -0.3, y: 0.3, r: 0},
			{sh: "t", x: -0.3, y: -0.3, r: Math.PI}
		];
		return {
			name: "user event",
			modes: [A3a.vpl.mode.advanced],
			type: A3a.vpl.blockType.event,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0]; },
			paramAccessibility: new A3a.vpl.BlockParamAccessibility([
				new A3a.vpl.BlockParamAccessibility.Control(0, 0, 1, 0.4,
					null,
					function (block) { block.param[0] = Math.min(9, block.param[0] + 1); },
					function (block) { block.param[0] = Math.max(0, block.param[0] - 1); })
			]),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.text(block.param[0].toString(10),
					{x: -0.3 * canvas.dims.blockSize, fillStyle: "black"});
				canvas.buttons(buttons, [
					block.param[0] < 9 ? -2 : 0,
					block.param[0] > 0 ? -2 : 0
				]);
				canvas.robotTop({
					scale: 0.45,
					translation: [
						-0.15 * canvas.dims.blockSize,
						-0.1 * canvas.dims.blockSize
					]
				});
				A3a.vpl.Canvas.drawArcArrow(canvas.ctx,
					canvas.dims.blockSize * 0.75, canvas.dims.blockSize * 0.05,
					canvas.dims.blockSize * 0.375,
					2.2, 2.8,
					{
						arrowAtStart: true,
						style: "black",
						lineWidth: canvas.dims.blockLineWidth,
						arrowSize: 5 * canvas.dims.blockLineWidth
					});
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					switch (i) {
					case 0:
						block.param[0] = Math.min(9, block.param[0] + 1);
						break;
					case 1:
						block.param[0] = Math.max(0, block.param[0] - 1);
						break;
					}
					block.endChange();
				}
				return i;
			}
		};
	})()),
	new A3a.vpl.BlockTemplate({
		name: "state",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.state,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 0, 0, 0]; },
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		typicalParam: function () { return [1, 0, 0, -1]; },
		paramAccessibility:
			new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.state4ToAccessibilityControls([0, 1, -1])),
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.robotTop();
			canvas.drawState(block.param);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			var i = canvas.stateClick(width, height, left, top, ev);
			if (i !== null) {
				block.beginChange();
				block.param[i] = (block.param[i] + 2) % 3 - 1;
				block.endChange();
			}
			return i;
		},
		/** @type {A3a.vpl.BlockTemplate.changeModeFun} */
		changeMode: function (block, mode) {
			if (mode === A3a.vpl.mode.basic
				&& block.param[0] === 0
				&& block.param[1] === 0
				&& block.param[2] === 0
				&& block.param[3] === 0) {
				// no state block in basic mode if empty
				return null;
			}
			return block;
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "state 8",
		modes: [A3a.vpl.mode.custom],
		type: A3a.vpl.blockType.state,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0]; },
		paramAccessibility:
			new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.state8ToAccessibilityControls()),
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.robotTop();
			canvas.drawState8(block.param[0]);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			var i = canvas.state8Click(width, height, left, top, ev);
			if (i !== null) {
				block.beginChange();
				block.param[0] = i;
				block.endChange();
			}
			return i;
		}
	}),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "t", x: -0.3, y: 0.3, r: 0},
			{sh: "t", x: -0.3, y: -0.3, r: Math.PI},
			{sh: "t", x: 0.1, y: 0.3, r: 0},
			{sh: "t", x: 0.1, y: -0.3, r: Math.PI},
			{sh: "c", x: 0.35, y: -0.3, r: 0}
		];
		return {
			name: "counter comparison",
			modes: [A3a.vpl.mode.advanced],
			type: A3a.vpl.blockType.state,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0, 0]; },
			paramAccessibility: new A3a.vpl.BlockParamAccessibility([
				new A3a.vpl.BlockParamAccessibility.Control(0, 0, 1, 0.4,
					null,
					function (block) { block.param[0] = Math.min(1, block.param[0] + 1); },
					function (block) { block.param[0] = Math.max(-1, block.param[0] - 1); }),
				new A3a.vpl.BlockParamAccessibility.Control(0, 0.4, 1, 0.8,
					null,
					function (block) { block.param[1] = Math.min(255, block.param[1] + 1); },
					function (block) { block.param[1] = Math.max(0, block.param[1] - 1); }),
				A3a.vpl.BlockTemplate.buttonToAccessibilityControl(buttons[4],
					function (block) {
						block.param[1] = 0;
					},
					null, null)
			]),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.text(block.param[0] === 0 ? "=" : block.param[0] > 0 ? "≥" : "≤",
					{x: -0.3 * canvas.dims.blockSize, fillStyle: "black"});
				canvas.text(block.param[1].toString(10),
					{x: 0.1 * canvas.dims.blockSize, fillStyle: "black"});
				canvas.buttons(buttons, [
					block.param[0] < 1 ? -2 : 0,
					block.param[0] > -1 ? -2 : 0,
					block.param[1] < 255 ? -2 : 0,
					block.param[1] > 0 ? -2 : 0,
					block.param[1] !== 0 ? -2 : 0
				]);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					switch (i) {
					case 0:
						block.param[0] = Math.min(1, block.param[0] + 1);
						break;
					case 1:
						block.param[0] = Math.max(-1, block.param[0] - 1);
						break;
					case 2:
						block.param[1] = Math.min(255, block.param[1] + 1);
						break;
					case 3:
						block.param[1] = Math.max(0, block.param[1] - 1);
						break;
					case 4:
						block.param[1] = 0;
						break;
					}
					block.endChange();
				}
				return i;
			}
		};
	})()),
	new A3a.vpl.BlockTemplate({
		name: "color state",
		modes: [A3a.vpl.mode.custom],
		type: A3a.vpl.blockType.state,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 0, 0]; },
		paramAccessibility: new A3a.vpl.BlockParamAccessibility([
			A3a.vpl.BlockTemplate.sliderToAccessibilityControl(0,
				0.1, -0.05, 0.3, 1.05,
				0, 1, 2),
			A3a.vpl.BlockTemplate.sliderToAccessibilityControl(1,
				0.4, -0.05, 0.6, 1.05,
				0, 1, 2),
			A3a.vpl.BlockTemplate.sliderToAccessibilityControl(2,
				0.7, -0.05, 0.9, 1.05,
				0, 1, 2)
		]),
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.robotTop({rgb: block.param});
			canvas.slider(/** @type {number} */(block.param[0]), 0.3, false, "red");
			canvas.slider(/** @type {number} */(block.param[1]), 0, false, "#0c0");
			canvas.slider(/** @type {number} */(block.param[2]), -0.3, false, "#08f");
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			if (canvas.sliderCheck(0.3, false, width, height, left, top, ev)) {
				block.beginChange();
				return 0;
			}
			if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
				block.beginChange();
				return 1;
			}
			if (canvas.sliderCheck(-0.3, false, width, height, left, top, ev)) {
				block.beginChange();
				return 2;
			}
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
			var val = canvas.sliderDrag(false, width, height, left, top, ev);
			block.param[dragIndex] = Math.max(0, Math.min(1, Math.round(val)));
			block.endChange();
		}
	}),
	new A3a.vpl.BlockTemplate((function () {
		var sz = 1.4;
		var buttons = [
			{sh: "r", x: -0.15, y: 0.3, size: sz, str: "black", fillStyle: "#666", strokeStyle: "white"},
			{sh: "r", x: -0.3, y: 0, size: sz, str: "red", fillStyle: "red", strokeStyle: "white"},
			{sh: "r", x: 0, y: 0, size: sz, str: "green", fillStyle: "#0c0", strokeStyle: "white"},
			{sh: "r", x: 0.3, y: 0, size: sz, str: "yellow", fillStyle: "yellow", strokeStyle: "silver"},
			{sh: "r", x: -0.3, y: -0.3, size: sz, str: "blue", fillStyle: "blue", strokeStyle: "white"},
			{sh: "r", x: 0, y: -0.3, size: sz, str: "magenta", fillStyle: "magenta", strokeStyle: "white"},
			{sh: "r", x: 0.3, y: -0.3, size: sz, str: "cyan", fillStyle: "cyan", strokeStyle: "white"},
			{sh: "r", x: 0.15, y: 0.3, size: sz, str: "white", fillStyle: "white", strokeStyle: "silver"},
		];
		return {
			name: "color 8 state",
			modes: [A3a.vpl.mode.advanced],
			type: A3a.vpl.blockType.state,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0]; },
			paramAccessibility:
				new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls(buttons)),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop({rgb: [block.param & 1, (block.param & 2) / 2, (block.param & 4) / 4]});
				canvas.buttons(buttons, [
					block.param[0] < 1 ? -2 : 0,
					block.param[0] > -1 ? -2 : 0
				]);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					block.param = [i];
					block.endChange();
				}
				return i;
			}
		};
	})()),
	new A3a.vpl.BlockTemplate({
		name: "motor state",
		modes: [A3a.vpl.mode.custom],
		type: A3a.vpl.blockType.state,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 0]; },
		paramAccessibility: new A3a.vpl.BlockParamAccessibility([
			A3a.vpl.BlockTemplate.sliderToAccessibilityControl(0,
				-0.05, 0, 1.05, 0.2,
				-1, 1, 3),
			A3a.vpl.BlockTemplate.sliderToAccessibilityControl(1,
				-0.05, 0.8, 1.05, 1,
				-1, 1, 3)
		]),
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			var rw = 0.19;
			var tr = canvas.traces(2.4 * block.param[0], 2.4 * block.param[1], rw);
			canvas.robotTop({
				withWheels: true,
				scale: 0.45,
				rotation: tr.phi,
				translation: [
					tr.x * rw * canvas.dims.blockSize + 0.13 * canvas.dims.blockSize * Math.sin(tr.phi),
					tr.y * rw * canvas.dims.blockSize + 0.13 * canvas.dims.blockSize * Math.cos(tr.phi)
				]
			});
			canvas.ctx.save();
			canvas.ctx.globalAlpha = 0.2;
			canvas.traces(2.4 * block.param[0], 2.4 * block.param[1], rw);
			canvas.ctx.restore();
			canvas.slider(0.5 + 0.5 * /** @type {number} */(block.param[0]), -0.4, true,
				block.param[0] === 0 ? "white" :
					block.param[0] === block.param[1] ? "#0c0" :
					block.param[0] === -block.param[1] ? "#f70" :
					"#fd0");
			canvas.slider(0.5 + 0.5 * /** @type {number} */(block.param[1]), 0.4, true,
				block.param[1] === 0 ? "white" :
					block.param[0] === block.param[1] ? "#0c0" :
					block.param[0] === -block.param[1] ? "#f70" :
					"#fd0");
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			if (canvas.sliderCheck(-0.4, true, width, height, left, top, ev)) {
				block.beginChange();
				return 0;
			}
			if (canvas.sliderCheck(0.4, true, width, height, left, top, ev)) {
				block.beginChange();
				return 1;
			}
			if (canvas.robotTopCheck(width, height, left, top,
					0.5 * block.param[0], 0.5 * block.param[1], 0.21,
					ev)) {
				block.beginChange();
				return 2;
			}
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
			if (dragIndex < 2) {
				// slider
				var val = canvas.sliderDrag(true, width, height, left, top, ev);
				val = val < 0.25 ? -1 : val > 0.75 ? 1 : 0;
				block.param[dragIndex] = val;
			} else {
				// robot (move forward)
				var val = canvas.sliderDrag(true, width, height, left, top, ev);
				val = val < 0.25 ? -1 : val > 0.75 ? 1 : 0;
				block.param[0] = val;
				block.param[1] = val;
			}
			block.endChange();
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "motor",
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 0]; },
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		typicalParam: function () { return [0.5, 0.2]; },
		paramAccessibility: new A3a.vpl.BlockParamAccessibility([
			A3a.vpl.BlockTemplate.sliderToAccessibilityControl(0,
				-0.05, 0, 1.05, 0.2,
				-1, 1, 11),
			A3a.vpl.BlockTemplate.sliderToAccessibilityControl(1,
				-0.05, 0.8, 1.05, 1,
				-1, 1, 11)
		]),
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			var rw = 0.19;
			var tr = canvas.traces(2.4 * block.param[0], 2.4 * block.param[1], rw);
			canvas.robotTop({
				withWheels: true,
				scale: 0.45,
				rotation: tr.phi,
				translation: [
					tr.x * rw * canvas.dims.blockSize + 0.13 * canvas.dims.blockSize * Math.sin(tr.phi),
					tr.y * rw * canvas.dims.blockSize + 0.13 * canvas.dims.blockSize * Math.cos(tr.phi)
				]
			});
			canvas.ctx.save();
			canvas.ctx.globalAlpha = 0.2;
			canvas.traces(2.4 * block.param[0], 2.4 * block.param[1], rw);
			canvas.ctx.restore();
			canvas.slider(0.5 + 0.5 * /** @type {number} */(block.param[0]), -0.4, true,
				block.param[0] === 0 ? "white" :
					block.param[0] === block.param[1] ? "#0c0" :
					block.param[0] === -block.param[1] ? "#f70" :
					"#fd0");
			canvas.slider(0.5 + 0.5 * /** @type {number} */(block.param[1]), 0.4, true,
				block.param[1] === 0 ? "white" :
					block.param[0] === block.param[1] ? "#0c0" :
					block.param[0] === -block.param[1] ? "#f70" :
					"#fd0");
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			if (canvas.sliderCheck(-0.4, true, width, height, left, top, ev)) {
				block.beginChange();
				return 0;
			}
			if (canvas.sliderCheck(0.4, true, width, height, left, top, ev)) {
				block.beginChange();
				return 1;
			}
			if (canvas.robotTopCheck(width, height, left, top,
					0.5 * block.param[0], 0.5 * block.param[1], 0.21,
					ev)) {
				block.beginChange();
				return 2;
			}
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
			if (dragIndex < 2) {
				// slider
				var val = 2 * canvas.sliderDrag(true, width, height, left, top, ev) - 1;
				var val2 = block.param[1 - dragIndex];
				if (Math.abs(val) < 0.1) {
					val = 0;
				} else if (Math.abs(val - val2) < 0.1) {
					val = val2;
				} else if (Math.abs(val + val2) < 0.1) {
					val = -val2;
				}
				block.param[dragIndex] = Math.max(-1, Math.min(1, val));
			} else {
				// robot (move forward)
				var val = 2 * canvas.sliderDrag(true, width, height, left, top, ev) - 1;
				if (Math.abs(val) < 0.1) {
					val = 0;
				} else {
					val = Math.max(-1, Math.min(1, val));
				}
				if (Math.abs(block.param[0] - block.param[1]) < 0.05) {
					block.param[0] = val;
					block.param[1] = val;
				} else if (Math.abs(block.param[0]) > Math.abs(block.param[1])) {
					block.param[1] *= val / block.param[0];
					block.param[0] = val;
				} else {
					block.param[0] *= val / block.param[1];
					block.param[1] = val;
				}
			}
			block.endChange();
		}
	}),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "c", x: 0, y: 0, r: 0},	// stop
			{sh: "t", x: 0, y: 0.35, r: 0},	// forward
			{sh: "t", x: 0, y: -0.35, r: Math.PI},	// backward
			{sh: "t", x: -0.3, y: 0.32, r: -0.4},	// left
			{sh: "t", x: 0.3, y: 0.32, r: 0.4},	// right
			{sh: "t", x: -0.35, y: 0.05, r: -Math.PI / 2},	// rotate left
			{sh: "t", x: 0.35, y: 0.05, r: Math.PI / 2}	// rotate right
		];
		/** @const */
		var sp = 100;
		/** @const */
		var spt = 25;

		return {
			name: "move",
			modes: [A3a.vpl.mode.custom],
			type: A3a.vpl.blockType.action,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0]; },
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop({withWheels: true, scale: 0.45});
				canvas.buttons(buttons, [
					block.param[0] === 0 ? 1 : -2,
					block.param[0] === 1 ? 1 : -2,
					block.param[0] === 2 ? 1 : -2,
					block.param[0] === 3 ? 1 : -2,
					block.param[0] === 4 ? 1 : -2,
					block.param[0] === 5 ? 1 : -2,
					block.param[0] === 6 ? 1 : -2
				]);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					block.param[0] = i;
					block.endChange();
				}
				return i;
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		return {
			name: "nn obstacles",
			modes: [],
			type: A3a.vpl.blockType.action,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0, 0, 0, 0]; },
			typicalParam: function () { return [0.3, 0.2, 0.1, 0.3]; },
			paramAccessibility: new A3a.vpl.BlockParamAccessibility([
				new A3a.vpl.BlockParamAccessibility.Control(0, 0, 0.25, 1,
					null,
					function (block) { block.param[0] = Math.min(1, block.param[0] + 0.1); },
					function (block) { block.param[0] = Math.max(0, block.param[0] - 0.1); },
					function (block, x, y) {
						console.info(x);
					}),
				new A3a.vpl.BlockParamAccessibility.Control(0.25, 0, 0.5, 1,
					null,
					function (block) { block.param[1] = Math.min(1, block.param[1] + 0.1); },
					function (block) { block.param[1] = Math.max(0, block.param[1] - 0.1); },
					function (block, x, y) {
						console.info(x);
					}),
				new A3a.vpl.BlockParamAccessibility.Control(0.5, 0, 0.75, 1,
					null,
					function (block) { block.param[2] = Math.min(1, block.param[2] + 0.1); },
					function (block) { block.param[2] = Math.max(0, block.param[2] - 0.1); },
					function (block, x, y) {
						console.info(x);
					}),
				new A3a.vpl.BlockParamAccessibility.Control(0.75, 0, 1, 1,
					null,
					function (block) { block.param[3] = Math.min(1, block.param[3] + 0.1); },
					function (block) { block.param[3] = Math.max(0, block.param[3] - 0.1); },
					function (block, x, y) {
						console.info(x);
					}),
			]),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block, box, isZoomed) {
				var sc = isZoomed ? 0.5 : 1;
				var ctx = canvas.ctx;
				var dims = canvas.dims;
				ctx.save();
				if (isZoomed) {
					ctx.scale(sc, sc);
				}
				ctx.fillStyle = "white";
				ctx.font = dims.blockFont;
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				ctx.translate(0.5 * dims.blockSize,
					0.5 * dims.blockSize);
				ctx.translate(-0.5 * dims.blockSize,
					-0.5 * dims.blockSize);

				if (isZoomed) {
					ctx.fillText("\u21d1", 0.25 * dims.blockSize, 0.35 * dims.blockSize);
					ctx.fillText(block.param[0].toFixed(1), 0.6 * dims.blockSize, 0.35 * dims.blockSize);

					ctx.fillText("\u21a7", 0.25 * dims.blockSize, 0.81 * dims.blockSize);
					ctx.fillText(block.param[1].toFixed(1), 0.6 * dims.blockSize, 0.81 * dims.blockSize);

					ctx.fillText("+", 0.25 * dims.blockSize, 1.27 * dims.blockSize);
					ctx.fillText(block.param[2].toFixed(1), 0.6 * dims.blockSize, 1.27 * dims.blockSize);

					ctx.fillText("\u2212", 0.25 * dims.blockSize, 1.69 * dims.blockSize);
					ctx.fillText(block.param[3].toFixed(1), 0.6 * dims.blockSize, 1.69 * dims.blockSize);

					ctx.translate(dims.blockSize, 0);
					canvas.slider(/** @type {number} */(block.param[0]), 0.15, false, "white");
					canvas.slider(/** @type {number} */(block.param[1]), -0.30, false, "white");
					canvas.slider(/** @type {number} */(block.param[2]), -0.75, false, "white");
					canvas.slider(/** @type {number} */(block.param[3]), -1.20, false, "white");
				} else {
					ctx.fillText("\u21d1", 0.25 * dims.blockSize, 0.17 * dims.blockSize);
					ctx.fillText(block.param[0].toFixed(1), 0.6 * dims.blockSize, 0.17 * dims.blockSize);

					ctx.fillText("\u21a7", 0.25 * dims.blockSize, 0.4 * dims.blockSize);
					ctx.fillText(block.param[1].toFixed(1), 0.6 * dims.blockSize, 0.4 * dims.blockSize);

					ctx.fillText("+", 0.25 * dims.blockSize, 0.63 * dims.blockSize);
					ctx.fillText(block.param[2].toFixed(1), 0.6 * dims.blockSize, 0.63 * dims.blockSize);

					ctx.fillText("\u2212", 0.25 * dims.blockSize, 0.87 * dims.blockSize);
					ctx.fillText(block.param[3].toFixed(1), 0.6 * dims.blockSize, 0.87 * dims.blockSize);
				}

				ctx.restore();
			},
			alwaysZoom: true,
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				if (canvas.sliderCheck(0.35, false, width / 2, height, left + width / 2, top, ev)) {
					block.beginChange();
					return 0;
				}
				if (canvas.sliderCheck(0.12, false, width / 2, height, left + width / 2, top, ev)) {
					block.beginChange();
					return 1;
				}
				if (canvas.sliderCheck(-0.12, false, width / 2, height, left + width / 2, top, ev)) {
					block.beginChange();
					return 2;
				}
				if (canvas.sliderCheck(-0.35, false, width / 2, height, left + width / 2, top, ev)) {
					block.beginChange();
					return 3;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				var val = canvas.sliderDrag(false, width / 2, height, left + width / 2, top, ev);
				block.param[dragIndex] = Math.max(0, Math.min(1, Math.round(20 * val) / 20));
				block.endChange();
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		return {
			name: "top color",
			modes: [A3a.vpl.mode.advanced],
			type: A3a.vpl.blockType.action,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0, 0, 0]; },
			paramAccessibility: new A3a.vpl.BlockParamAccessibility([
				A3a.vpl.BlockTemplate.sliderToAccessibilityControl(0,
					0.1, -0.05, 0.3, 1.05,
					0, 1, 11),
				A3a.vpl.BlockTemplate.sliderToAccessibilityControl(1,
					0.4, -0.05, 0.6, 1.05,
					0, 1, 11),
				A3a.vpl.BlockTemplate.sliderToAccessibilityControl(2,
					0.7, -0.05, 0.9, 1.05,
					0, 1, 11)
			]),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop({rgb: block.param});
				canvas.slider(/** @type {number} */(block.param[0]), 0.3, false, "red");
				canvas.slider(/** @type {number} */(block.param[1]), 0, false, "#0c0");
				canvas.slider(/** @type {number} */(block.param[2]), -0.3, false, "#08f");
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				if (canvas.sliderCheck(0.3, false, width, height, left, top, ev)) {
					block.beginChange();
					return 0;
				}
				if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
					block.beginChange();
					return 1;
				}
				if (canvas.sliderCheck(-0.3, false, width, height, left, top, ev)) {
					block.beginChange();
					return 2;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				var val = canvas.sliderDrag(false, width, height, left, top, ev);
				block.param[dragIndex] = Math.max(0, Math.min(1, val));
				block.endChange();
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		var sz = 1.4;
		var buttons = [
			{sh: "r", x: -0.15, y: 0.3, size: sz, str: "black", fillStyle: "#666", strokeStyle: "white"},
			{sh: "r", x: -0.3, y: 0, size: sz, str: "red", fillStyle: "red", strokeStyle: "white"},
			{sh: "r", x: 0, y: 0, size: sz, str: "green", fillStyle: "#0c0", strokeStyle: "white"},
			{sh: "r", x: 0.3, y: 0, size: sz, str: "yellow", fillStyle: "yellow", strokeStyle: "silver"},
			{sh: "r", x: -0.3, y: -0.3, size: sz, str: "blue", fillStyle: "blue", strokeStyle: "white"},
			{sh: "r", x: 0, y: -0.3, size: sz, str: "magenta", fillStyle: "magenta", strokeStyle: "white"},
			{sh: "r", x: 0.3, y: -0.3, size: sz, str: "cyan", fillStyle: "cyan", strokeStyle: "white"},
			{sh: "r", x: 0.15, y: 0.3, size: sz, str: "white", fillStyle: "white", strokeStyle: "silver"},
		];
		return {
			name: "top color 8",
			modes: [A3a.vpl.mode.basic],
			type: A3a.vpl.blockType.action,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0]; },
			paramAccessibility:
				new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls(buttons)),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop({rgb: [block.param & 1, (block.param & 2) / 2, (block.param & 4) / 4]});
				canvas.buttons(buttons, [
					block.param[0] < 1 ? -2 : 0,
					block.param[0] > -1 ? -2 : 0
				]);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					block.param = [i];
					block.endChange();
				}
				return i;
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		return {
			name: "bottom color",
			modes: [A3a.vpl.mode.advanced],
			type: A3a.vpl.blockType.action,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0, 0, 0]; },
			paramAccessibility: new A3a.vpl.BlockParamAccessibility([
				A3a.vpl.BlockTemplate.sliderToAccessibilityControl(0,
					0.1, -0.05, 0.3, 1.05,
					0, 1, 11),
				A3a.vpl.BlockTemplate.sliderToAccessibilityControl(1,
					0.4, -0.05, 0.6, 1.05,
					0, 1, 11),
				A3a.vpl.BlockTemplate.sliderToAccessibilityControl(2,
					0.7, -0.05, 0.9, 1.05,
					0, 1, 11)
			]),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop({withWheels: true, rgb: block.param});
				canvas.slider(/** @type {number} */(block.param[0]), 0.3, false, "red");
				canvas.slider(/** @type {number} */(block.param[1]), 0, false, "#0c0");
				canvas.slider(/** @type {number} */(block.param[2]), -0.3, false, "#08f");
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				if (canvas.sliderCheck(0.3, false, width, height, left, top, ev)) {
					block.beginChange();
					return 0;
				}
				if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
					block.beginChange();
					return 1;
				}
				if (canvas.sliderCheck(-0.3, false, width, height, left, top, ev)) {
					block.beginChange();
					return 2;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				var val = canvas.sliderDrag(false, width, height, left, top, ev);
				block.param[dragIndex] = Math.max(0, Math.min(1, val));
				block.endChange();
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		return {
			name: "bottom-left color",
			modes: [A3a.vpl.mode.custom],
			type: A3a.vpl.blockType.action,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0, 0, 0]; },
			paramAccessibility: new A3a.vpl.BlockParamAccessibility([
				A3a.vpl.BlockTemplate.sliderToAccessibilityControl(0,
					0.1, -0.05, 0.3, 1.05,
					0, 1, 11),
				A3a.vpl.BlockTemplate.sliderToAccessibilityControl(1,
					0.4, -0.05, 0.6, 1.05,
					0, 1, 11),
				A3a.vpl.BlockTemplate.sliderToAccessibilityControl(2,
					0.7, -0.05, 0.9, 1.05,
					0, 1, 11)
			]),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop({withWheels: true, rgb: block.param, side: "left"});
				canvas.slider(/** @type {number} */(block.param[0]), 0.3, false, "red");
				canvas.slider(/** @type {number} */(block.param[1]), 0, false, "#0c0");
				canvas.slider(/** @type {number} */(block.param[2]), -0.3, false, "#08f");
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				if (canvas.sliderCheck(0.3, false, width, height, left, top, ev)) {
					block.beginChange();
					return 0;
				}
				if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
					block.beginChange();
					return 1;
				}
				if (canvas.sliderCheck(-0.3, false, width, height, left, top, ev)) {
					block.beginChange();
					return 2;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				var val = canvas.sliderDrag(false, width, height, left, top, ev);
				block.param[dragIndex] = Math.max(0, Math.min(1, val));
				block.endChange();
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		return {
			name: "bottom-right color",
			modes: [A3a.vpl.mode.custom],
			type: A3a.vpl.blockType.action,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0, 0, 0]; },
			paramAccessibility: new A3a.vpl.BlockParamAccessibility([
				A3a.vpl.BlockTemplate.sliderToAccessibilityControl(0,
					0.1, -0.05, 0.3, 1.05,
					0, 1, 11),
				A3a.vpl.BlockTemplate.sliderToAccessibilityControl(1,
					0.4, -0.05, 0.6, 1.05,
					0, 1, 11),
				A3a.vpl.BlockTemplate.sliderToAccessibilityControl(2,
					0.7, -0.05, 0.9, 1.05,
					0, 1, 11)
			]),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop({withWheels: true, rgb: block.param, side: "right"});
				canvas.slider(/** @type {number} */(block.param[0]), 0.3, false, "red");
				canvas.slider(/** @type {number} */(block.param[1]), 0, false, "#0c0");
				canvas.slider(/** @type {number} */(block.param[2]), -0.3, false, "#08f");
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				if (canvas.sliderCheck(0.3, false, width, height, left, top, ev)) {
					block.beginChange();
					return 0;
				}
				if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
					block.beginChange();
					return 1;
				}
				if (canvas.sliderCheck(-0.3, false, width, height, left, top, ev)) {
					block.beginChange();
					return 2;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				var val = canvas.sliderDrag(false, width, height, left, top, ev);
				block.param[dragIndex] = Math.max(0, Math.min(1, val));
				block.endChange();
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		var sz = 1.4;
		var buttons = [
			{sh: "r", x: -0.15, y: 0.3, size: sz, str: "black", fillStyle: "#666", strokeStyle: "white"},
			{sh: "r", x: -0.3, y: 0, size: sz, str: "red", fillStyle: "red", strokeStyle: "white"},
			{sh: "r", x: 0, y: 0, size: sz, str: "green", fillStyle: "#0c0", strokeStyle: "white"},
			{sh: "r", x: 0.3, y: 0, size: sz, str: "yellow", fillStyle: "yellow", strokeStyle: "silver"},
			{sh: "r", x: -0.3, y: -0.3, size: sz, str: "blue", fillStyle: "blue", strokeStyle: "white"},
			{sh: "r", x: 0, y: -0.3, size: sz, str: "magenta", fillStyle: "magenta", strokeStyle: "white"},
			{sh: "r", x: 0.3, y: -0.3, size: sz, str: "cyan", fillStyle: "cyan", strokeStyle: "white"},
			{sh: "r", x: 0.15, y: 0.3, size: sz, str: "white", fillStyle: "white", strokeStyle: "silver"},
		];
		return {
			name: "bottom color 8",
			modes: [A3a.vpl.mode.basic],
			type: A3a.vpl.blockType.action,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0]; },
			paramAccessibility:
				new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls(buttons)),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop({withWheels: true, rgb: [block.param & 1, (block.param & 2) / 2, (block.param & 4) / 4]});
				canvas.buttons(buttons, [
					block.param[0] < 1 ? -2 : 0,
					block.param[0] > -1 ? -2 : 0
				]);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					block.param = [i];
					block.endChange();
				}
				return i;
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		var sz = 1.4;
		var buttons = [
			{sh: "r", x: -0.15, y: 0.3, size: sz, str: "black", fillStyle: "#666", strokeStyle: "white"},
			{sh: "r", x: -0.3, y: 0, size: sz, str: "red", fillStyle: "red", strokeStyle: "white"},
			{sh: "r", x: 0, y: 0, size: sz, str: "green", fillStyle: "#0c0", strokeStyle: "white"},
			{sh: "r", x: 0.3, y: 0, size: sz, str: "yellow", fillStyle: "yellow", strokeStyle: "silver"},
			{sh: "r", x: -0.3, y: -0.3, size: sz, str: "blue", fillStyle: "blue", strokeStyle: "white"},
			{sh: "r", x: 0, y: -0.3, size: sz, str: "magenta", fillStyle: "magenta", strokeStyle: "white"},
			{sh: "r", x: 0.3, y: -0.3, size: sz, str: "cyan", fillStyle: "cyan", strokeStyle: "white"},
			{sh: "r", x: 0.15, y: 0.3, size: sz, str: "white", fillStyle: "white", strokeStyle: "silver"},
		];
		return {
			name: "bottom-left color 8",
			modes: [A3a.vpl.mode.custom],
			type: A3a.vpl.blockType.action,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0]; },
			paramAccessibility:
				new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls(buttons)),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop({withWheels: true, rgb: [block.param & 1, (block.param & 2) / 2, (block.param & 4) / 4], side: "left"});
				canvas.buttons(buttons, [
					block.param[0] < 1 ? -2 : 0,
					block.param[0] > -1 ? -2 : 0
				]);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					block.param = [i];
					block.endChange();
				}
				return i;
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		var sz = 1.4;
		var buttons = [
			{sh: "r", x: -0.15, y: 0.3, size: sz, str: "black", fillStyle: "#666", strokeStyle: "white"},
			{sh: "r", x: -0.3, y: 0, size: sz, str: "red", fillStyle: "red", strokeStyle: "white"},
			{sh: "r", x: 0, y: 0, size: sz, str: "green", fillStyle: "#0c0", strokeStyle: "white"},
			{sh: "r", x: 0.3, y: 0, size: sz, str: "yellow", fillStyle: "yellow", strokeStyle: "silver"},
			{sh: "r", x: -0.3, y: -0.3, size: sz, str: "blue", fillStyle: "blue", strokeStyle: "white"},
			{sh: "r", x: 0, y: -0.3, size: sz, str: "magenta", fillStyle: "magenta", strokeStyle: "white"},
			{sh: "r", x: 0.3, y: -0.3, size: sz, str: "cyan", fillStyle: "cyan", strokeStyle: "white"},
			{sh: "r", x: 0.15, y: 0.3, size: sz, str: "white", fillStyle: "white", strokeStyle: "silver"},
		];
		return {
			name: "bottom-right color 8",
			modes: [A3a.vpl.mode.custom],
			type: A3a.vpl.blockType.action,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0]; },
			paramAccessibility:
				new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.radiobuttonsToAccessibilityControls(buttons)),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop({withWheels: true, rgb: [block.param & 1, (block.param & 2) / 2, (block.param & 4) / 4], side: "right"});
				canvas.buttons(buttons, [
					block.param[0] < 1 ? -2 : 0,
					block.param[0] > -1 ? -2 : 0
				]);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					block.param = [i];
					block.endChange();
				}
				return i;
			}
		};
	})()),
	new A3a.vpl.BlockTemplate({
		name: "notes",
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 1, 1, 1, 2, 1, 0, 1, 2, 1, 4, 2]; },
		paramAccessibility:
			new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.notesToAccessibilityControls(0.1, 0.9, 0.9, 0.1, 6, 5)),
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.notes(block.param);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			var note = canvas.noteClick(width, height, left, top, ev);
			if (note) {
				block.beginChange();
				if (block.param[2 * note.index] === note.tone) {
					block.param[2 * note.index + 1] = (block.param[2 * note.index + 1] + 1) % 3;
				} else {
					block.param[2 * note.index] = note.tone;
					block.param[2 * note.index + 1] = 1;
				}
				block.endChange();
				return 0;
			}
			return null;
		}
	}),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "t", x: -0.3, y: 0.3, r: 0},
			{sh: "t", x: -0.3, y: -0.3, r: Math.PI}
		];
		return {
			name: "play",
			modes: [A3a.vpl.mode.custom],
			type: A3a.vpl.blockType.action,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0]; },
			paramAccessibility: new A3a.vpl.BlockParamAccessibility([
				new A3a.vpl.BlockParamAccessibility.Control(0, 0, 1, 0.4,
					null,
					function (block) { block.param[0] = (block.param[0] + 1) % 100; },
					function (block) { block.param[0] = (block.param[0] + 99) % 100; })
			]),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.playSDFile(block.param[0]);
				canvas.buttons(buttons, [-2, -2]);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					switch (i) {
					case 0:	// up
						block.param[0] = (block.param[0] + 1) % 100;
						break;
					case 1:	// down
						block.param[0] = (block.param[0] + 99) % 100;
						break;
					}
					block.endChange();
				}
				return i;
			}
		};
	})()),
	new A3a.vpl.BlockTemplate({
		name: "play stop",
		modes: [A3a.vpl.mode.custom],
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.playSDFile(null);
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "set state",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 0, 0, 0]; },
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		typicalParam: function () { return [0, 1, -1, 0]; },
		paramAccessibility:
			new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.state4ToAccessibilityControls([0, 1, -1])),
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.robotTop();
			canvas.drawState(block.param);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			var i = canvas.stateClick(width, height, left, top, ev);
			if (i !== null) {
				block.beginChange();
				block.param[i] = (block.param[i] + 2) % 3 - 1;
				block.endChange();
			}
			return i;
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "toggle state",
		modes: [A3a.vpl.mode.custom],
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [false, false, false, false]; },
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		typicalParam: function () { return [true, false, false, false]; },
		paramAccessibility:
			new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.state4ToAccessibilityControls([false, true])),
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.robotTop();
			canvas.drawState(block.param.map(function (b) { return b ? 2 : 0; }));
			A3a.vpl.Canvas.drawArcArrow(canvas.ctx, canvas.dims.blockSize / 2, canvas.dims.blockSize / 2,
				canvas.dims.blockSize * 0.2,
				-1.4, 1.4,
				{
					style: "black",
					lineWidth: canvas.dims.blockLineWidth,
					arrowSize: 5 * canvas.dims.blockLineWidth
				});
			A3a.vpl.Canvas.drawArcArrow(canvas.ctx, canvas.dims.blockSize / 2, canvas.dims.blockSize / 2,
				canvas.dims.blockSize * 0.2,
				Math.PI - 1.4, Math.PI + 1.4,
				{
					style: "black",
					lineWidth: canvas.dims.blockLineWidth,
					arrowSize: 5 * canvas.dims.blockLineWidth
				});
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			var i = canvas.stateClick(width, height, left, top, ev);
			if (i !== null) {
				block.beginChange();
				block.param[i] = !block.param[i];
				block.endChange();
			}
			return i;
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "set state 8",
		modes: [A3a.vpl.mode.custom],
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0]; },
		paramAccessibility:
			new A3a.vpl.BlockParamAccessibility(A3a.vpl.BlockTemplate.state8ToAccessibilityControls()),
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.robotTop();
			canvas.drawState8(block.param[0]);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			var i = canvas.state8Click(width, height, left, top, ev);
			if (i !== null) {
				block.beginChange();
				block.param[0] = i;
				block.endChange();
			}
			return i;
		}
	}),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "c", x: -0.2, y: 0},
			{sh: "c", x: 0.2, y: 0}
		];
		return {
			name: "change state 8",
			modes: [A3a.vpl.mode.custom],
			type: A3a.vpl.blockType.action,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [1]; },
			paramAccessibility: new A3a.vpl.BlockParamAccessibility([
				A3a.vpl.BlockTemplate.buttonToAccessibilityControl(buttons[0], function (block) { block.param[0] = -1; }, null, null),
				A3a.vpl.BlockTemplate.buttonToAccessibilityControl(buttons[1], function (block) { block.param[0] = 1; }, null, null)
			]),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop();
				canvas.drawState8Change();
				A3a.vpl.Canvas.drawArcArrow(canvas.ctx, canvas.dims.blockSize / 2, canvas.dims.blockSize / 2,
					canvas.dims.blockSize * 0.375,
					-0.8, 0.8,
					{
						style: "black",
						lineWidth: canvas.dims.blockLineWidth,
						arrowSize: 5 * canvas.dims.blockLineWidth
					});
				A3a.vpl.Canvas.drawArcArrow(canvas.ctx, canvas.dims.blockSize / 2, canvas.dims.blockSize / 2,
					canvas.dims.blockSize * 0.375,
					Math.PI - 0.8, Math.PI + 0.8,
					{
						arrowAtStart: true,
						style: "black",
						lineWidth: canvas.dims.blockLineWidth,
						arrowSize: 5 * canvas.dims.blockLineWidth
					});
				canvas.buttons(buttons, [
					block.param[0] < 0,
					block.param[0] > 0
				]);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					block.param[0] = i === 0 ? -1 : 1;
					block.endChange();
				}
				return i;
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "t", x: 0, y: 0.3, r: 0},
			{sh: "t", x: 0, y: -0.3, r: Math.PI}
		];
		return {
			name: "set counter",
			modes: [A3a.vpl.mode.advanced],
			type: A3a.vpl.blockType.action,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0]; },
			paramAccessibility: new A3a.vpl.BlockParamAccessibility([
				new A3a.vpl.BlockParamAccessibility.Control(0.1, 0.25, 0.9, 0.75,
					null,
					function (block) { block.param[0] = Math.min(1, block.param[0] + 1); },
					function (block) { block.param[0] = Math.max(-1, block.param[0] - 1); })
			]),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.text(block.param[0] === 0 ? "= 0" : block.param[0] > 0 ? "+1" : "−1");
				canvas.buttons(buttons, [
					block.param[0] < 1 ? -2 : 0,
					block.param[0] > -1 ? -2 : 0
				]);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					switch (i) {
					case 0:
						block.param[0] = Math.min(1, block.param[0] + 1);
						break;
					case 1:
						block.param[0] = Math.max(-1, block.param[0] - 1);
						break;
					}
					block.endChange();
				}
				return i;
			}
		};
	})()),
	new A3a.vpl.BlockTemplate({
		name: "set timer",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [1]; },
		paramAccessibility: new A3a.vpl.BlockParamAccessibility([
			new A3a.vpl.BlockParamAccessibility.Control(0.13, 0.14, 0.93, 0.96,	// "horizontal" control
				null,
				function (block) { block.param[0] = Math.min(block.param[0] + 0.1, 4); },
				function (block) { block.param[0] = Math.max(block.param[0] - 0.1, 0); })
		]),
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawTimer(/** @type {number} */(block.param[0]), false, false);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			if (canvas.timerCheck(width, height, left, top, ev)) {
				block.beginChange();
				return 1;
			}
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
			var t = canvas.timerDrag(width, height, left, top, false, ev);
			block.param[0] = t;
			block.endChange();
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "set timer log",
		modes: [A3a.vpl.mode.custom],
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [1]; },
		paramAccessibility: new A3a.vpl.BlockParamAccessibility([
			new A3a.vpl.BlockParamAccessibility.Control(0.13, 0.14, 0.93, 0.96,	// "horizontal" control
				null,
				function (block) { block.param[0] = Math.round(100 * Math.min(block.param[0] * 1.05, 10)) / 100; },
				function (block) { block.param[0] = Math.round(100 * Math.max(block.param[0] * 0.95, 0.1)) / 100; })
		]),
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawTimer(/** @type {number} */(block.param[0]), false, true);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			if (canvas.timerCheck(width, height, left, top, ev)) {
				block.beginChange();
				return 1;
			}
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
			var t = canvas.timerDrag(width, height, left, top, true, ev);
			block.param[0] = t;
			block.endChange();
		}
	}),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "c", x: -0.33, y: -0.3, r: 0}
		];

		/** Update image in block
			@param {A3a.vpl.Block} block
			@param {function():void=} loadedFun called once done
			@return {void}
		*/
		function updateImage(block, loadedFun) {
			if (block.param[1]) {
				// block.param[1] contains a url: load it into a new Image
				var im = new Image();
				im.src = block.param[1];
				im.addEventListener("load", function () {
					// once loaded, store the image and redraw everything
					block.param[2] = im;
					loadedFun && loadedFun();
				}, false);
			}
		}

		return {
			name: "picture comment",
			modes: [A3a.vpl.mode.advanced],
			type: A3a.vpl.blockType.comment,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () {
				return [
					false,	// true for live preview
					"",	// url ("data:" png)
					null	// image
				];
			},
			/** @type {A3a.vpl.BlockTemplate.exportParam} */
			exportParam: function (block) {
				return block.param.length >= 2 ? [false, block.param[1]] : [false, ""];
			},
			/** @type {A3a.vpl.BlockTemplate.importParam} */
			importParam: function (block, param, readyFun) {
				block.param = param.length >= 2 ? [false, param[1]] : [false, ""];
				updateImage(block, readyFun);
			},
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				if (block.param[2]) {
					canvas.ctx.drawImage(block.param[2],
						0, 0, 240, 240,
						0, 0, canvas.dims.blockSize, canvas.dims.blockSize);
				}
				canvas.buttons(buttons,  [block.param[0]]);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons,
					width, height, left, top, ev);
				if (i === 0) {
					if (block.param[0]) {
						// live preview: stop
						if (A3a.webcamVideo) {
							A3a.webcamVideo["pause"] && A3a.webcamVideo["pause"]();
							A3a.webcamStream.getTracks().forEach(function(track) {
								track["stop"]();
							});
							A3a.webcamVideo = null;
						}
					} else {
						// start preview
						block.beginChange();
						navigator.mediaDevices
							.getUserMedia({"audio": false, "video": {"width": 320, "height": 240}})
							.then(function (stream) {
								A3a.webcamStream = stream;
								A3a.webcamVideo = document.createElement("video");
								A3a.webcamVideo["srcObject"] = stream;
								A3a.webcamVideo.addEventListener("loadedmetadata", function (e) {
									var id;
									function grab() {
										if (!A3a.webcamVideo) {
											clearInterval(id);
										} else {
											if (!A3a.webcamCanvas) {
												A3a.webcamCanvas = document.createElement("canvas");
												A3a.webcamCanvas.width = 240;
												A3a.webcamCanvas.height = 240;
											}
											A3a.webcamCanvas.getContext("2d")
												.drawImage(A3a.webcamVideo,
													0, 0, 240, 240, 0, 0, 240, 240);
											block.param[1] = A3a.webcamCanvas.toDataURL("image/png");
											updateImage(block,
												function () {
													// redraw once the image has been loaded
													canvas.onUpdate && canvas.onUpdate();
													canvas.redraw();
												});
										}
									}
									A3a.webcamVideo["play"]();
									id = setInterval(grab, 100);
								}, false);
							});
					}
					block.param[0] = !block.param[0];
					block.endChange();
				}
				return i;
			}
		};
	})()),
	new A3a.vpl.BlockTemplate((function () {
		/**
			@const
			@type {Array.<A3a.vpl.Canvas.buttonShape>}
		*/
		var buttons = [
			{sh: "t", x: -0.3, y: 0.3, r: 0},
			{sh: "t", x: -0.3, y: -0.3, r: Math.PI}
		];
		return {
			name: "send user event",
			modes: [A3a.vpl.mode.advanced],
			type: A3a.vpl.blockType.action,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0]; },
			paramAccessibility: new A3a.vpl.BlockParamAccessibility([
				new A3a.vpl.BlockParamAccessibility.Control(0, 0, 1, 0.4,
					null,
					function (block) { block.param[0] = Math.min(9, block.param[0] + 1); },
					function (block) { block.param[0] = Math.max(0, block.param[0] - 1); })
			]),
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.text(block.param[0].toString(10),
					{x: -0.3 * canvas.dims.blockSize, fillStyle: "black"});
				canvas.buttons(buttons, [
					block.param[0] < 9 ? -2 : 0,
					block.param[0] > 0 ? -2 : 0
				]);
				canvas.robotTop({
					scale: 0.45,
					translation: [
						-0.15 * canvas.dims.blockSize,
						-0.1 * canvas.dims.blockSize
					]
				});
				A3a.vpl.Canvas.drawArcArrow(canvas.ctx,
					canvas.dims.blockSize * 0.65, canvas.dims.blockSize * 0.05,
					canvas.dims.blockSize * 0.375,
					0.5, 1.1,
					{
						arrowAtStart: true,
						style: "black",
						lineWidth: canvas.dims.blockLineWidth,
						arrowSize: 5 * canvas.dims.blockLineWidth
					});
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.beginChange();
					switch (i) {
					case 0:
						block.param[0] = Math.min(9, block.param[0] + 1);
						break;
					case 1:
						block.param[0] = Math.max(0, block.param[0] - 1);
						break;
					}
					block.endChange();
				}
				return i;
			}
		};
	})())
];
