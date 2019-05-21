/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @const */
A3a.vpl.BlockTemplate.initOutputs =
	"call leds.top(0, 0, 0)\n" +
	"call leds.bottom.left(0, 0, 0)\n" +
	"call leds.bottom.right(0, 0, 0)\n" +
	"call leds.circle(0, 0, 0, 0, 0, 0, 0, 0)\n";

/** @const */
A3a.vpl.BlockTemplate.initStatesDecl =
	"var state[4]\n" +
	"var state0[4]\n";

/** @const */
A3a.vpl.BlockTemplate.initStatesInit =
	"state = [0, 0, 0, 0]\n";

/** @const */
A3a.vpl.BlockTemplate.clauseInitState =
	"state0 = state\n";

/** @const */
A3a.vpl.BlockTemplate.initState8Decl =
	"var state8\n" +
	"var state80\n";

/** @const */
A3a.vpl.BlockTemplate.initState8Init =
	"state8 = 0\n";

/** @const */
A3a.vpl.BlockTemplate.clauseInitState8 =
	"state80 = state8\n";

/** @const */
A3a.vpl.BlockTemplate.initCounterDecl =
	"var counter\n" +
	"var counter0\n";

/** @const */
A3a.vpl.BlockTemplate.initCounterInit =
	"counter = 0\n";

/** @const */
A3a.vpl.BlockTemplate.clauseInitCounter =
	"counter0 = counter\n";

/** @const */
A3a.vpl.BlockTemplate.initTopColorDecl =
	"# RGB color of the top led\n" +
	"var topColor[3]\n";

/** @const */
A3a.vpl.BlockTemplate.initTopColorStateDecl =
	"var topColor0[3]\n";

/** @const */
A3a.vpl.BlockTemplate.clauseInitTopColor =
	"topColor0 = topColor\n";

/** @const */
A3a.vpl.BlockTemplate.initTopColorInit =
	"topColor = [0, 0, 0]\n";

/** @const */
A3a.vpl.BlockTemplate.dispStates =
	"sub display_state\n" +
	"call leds.circle(0,state[1]*32,0,state[3]*32,0,state[2]*32,0,state[0]*32)\n";

/** @const */
A3a.vpl.BlockTemplate.dispState8 =
	"sub display_state8\n" +
	"call leds.circle((state8==0)*32, (state8==1)*32, (state8==2)*32, (state8==3)*32, (state8==4)*32, (state8==5)*32, (state8==6)*32, (state8==7)*32)\n";

/** @const */
A3a.vpl.BlockTemplate.dispCounter =
	"sub display_counter\n" +
	"call leds.circle((counter&1)<<5,(counter&2)<<4,(counter&4)<<3,(counter&8)<<2,(counter&16)<<1,counter&32,(counter&64)>>1,(counter&128)>>2)\n";

/** @const */
A3a.vpl.BlockTemplate.resetTimer =
	"# stop timer 0\n" +
	"timer.period[0] = 0\n";

/**
	@type {Array.<A3a.vpl.BlockTemplate>}
*/
A3a.vpl.BlockTemplate.lib =	[
	new A3a.vpl.BlockTemplate({
		name: "!empty event",
		type: A3a.vpl.blockType.hidden,
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.clearBlockBackground();
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "!empty action",
		type: A3a.vpl.blockType.hidden,
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.clearBlockBackground();
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "!stop",
		type: A3a.vpl.blockType.hidden,
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				return {
					statement:
						"motor.left.target = 0\n" +
						"motor.right.target = 0\n" +
						"call sound.system(-1)\n"
				};
			}
		}
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
					block.prepareChange();
					block.param[0] = i;
				}
				return i;
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					return {
						sectionBegin: "onevent buttons\n",
						clause: "button." + ["center", "forward", "backward", "right", "left"][block.param[0]] + " != 0"
					};
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
			name: "horiz prox",
			modes: [A3a.vpl.mode.basic],
			type: A3a.vpl.blockType.event,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0, 0, 0, 0, 0, 0, 0]; },
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			typicalParam: function () { return [0, 1, -1, 1, -1, 0, 0]; },
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop();
				canvas.buttons(buttons, block.param, {cross: true});
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.prepareChange();
					block.param[i] = (block.param[i] + 2) % 3 - 1;
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
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					var cond = "";
					for (var i = 0; i < 7; i++) {
						if (block.param[i]) {
							cond += (cond.length === 0 ? "" : " and ") +
								"prox.horizontal[" + buttons[i].str + "] " +
								(block.param[i] > 0 ? ">= 2" : "<= 1") + "000";
						}
					}
					if (cond === "") {
						for (var i = 0; i < 7; i++) {
							cond += " or prox.horizontal[" + buttons[i].str + "] >= 2000";
						}
						cond = cond.slice(4);	// crop initial " or "
					}
					return {
						clause: cond
					};
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
					0.4, 0.1	// levels (700+0.4*3300 approx 2000, 700+0.1*3300 approx 1000)
				];
			},
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			typicalParam: function () {
				return [
					0, 1, -1, 1, -1, 0, 0,	// sensor modes
					0.4, 0.1	// levels (700+0.4*3300 approx 2000, 700+0.1*3300 approx 1000)
				];
			},
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop();
				canvas.buttons(buttons, block.param, {cross: true});
				canvas.slider(/** @type {number} */(block.param[7]), 0.02, false,
					"red", A3a.vpl.draw.levelType.high);
				canvas.slider(/** @type {number} */(block.param[8]), -0.2, false,
					"black", A3a.vpl.draw.levelType.low);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				// sensor click
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.prepareChange();
					block.param[i] = (block.param[i] + 2) % 3 - 1;
					return i;
				}
				// slider drag
				if (canvas.sliderCheck(0.02, false, width, height, left, top, ev)) {
					block.prepareChange();
					return 7;
				}
				if (canvas.sliderCheck(-0.2, false, width, height, left, top, ev)) {
					block.prepareChange();
					return 8;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				if (dragIndex >= 7) {
					var val = canvas.sliderDrag(false, width, height, left, top, ev);
					block.param[dragIndex] = Math.max(0, Math.min(1, val));
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
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					var cond = "";
					for (var i = 0; i < 7; i++) {
						if (block.param[i]) {
							cond += (cond.length === 0 ? "" : " and ") +
								"prox.horizontal[" + buttons[i].str + "] " +
								(block.param[i] > 0
									? ">= " + Math.round(7 + 33 * block.param[7])
									: "<= " + Math.round(7 + 33 * block.param[8])) +
								"00";
						}
					}
					if (cond === "") {
						for (var i = 0; i < 7; i++) {
							cond += " or prox.horizontal[" + buttons[i].str + "] >= 2000";
						}
						cond = cond.slice(5);	// crop initial " or "
					}
					return {
						sectionBegin: "onevent prox\n",
						clause: cond
					};
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
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop();
				canvas.buttons(buttons, block.param, {cross: true});
				canvas.slider(/** @type {number} */(block.param[7]), -0.1, false,
					"black", A3a.vpl.draw.levelType.low);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				// sensor click
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.prepareChange();
					block.param[i] = (block.param[i] + 2) % 3 - 1;
					return i;
				}
				// slider drag
				if (canvas.sliderCheck(-0.1, false, width, height, left, top, ev)) {
					block.prepareChange();
					return 7;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				if (dragIndex >= 7) {
					var val = canvas.sliderDrag(false, width, height, left, top, ev);
					block.param[dragIndex] = Math.max(0, Math.min(1, val));
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
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					var cond = "";
					for (var i = 0; i < 7; i++) {
						if (block.param[i]) {
							cond += (cond.length === 0 ? "" : " and ") +
								"prox.horizontal[" + buttons[i].str + "] " +
								(block.param[i] > 0 ? ">=" : "<") + " " +
								Math.round(7 + 33 * block.param[7]) + "00";
						}
					}
					if (cond === "") {
						for (var i = 0; i < 7; i++) {
							cond += " or prox.horizontal[" + buttons[i].str + "] >= 2000";
						}
						cond = cond.slice(5);	// crop initial " or "
					}
					return {
						sectionBegin: "onevent prox\n",
						clause: cond
					};
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
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop({withWheels: true});
				canvas.buttons(buttons, block.param, {cross: true});
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.prepareChange();
					block.param[i] = (block.param[i] + 2) % 3 - 1;
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
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					var cond = "";
					for (var i = 0; i < 2; i++) {
						if (block.param[i]) {
							cond += (cond.length === 0 ? "" : " and ") +
								"prox.ground.delta[" + buttons[i].str + "] " +
								(block.param[i] > 0 ? ">= 450" : "<= 400");
						}
					}
					if (cond === "") {
						for (var i = 0; i < 2; i++) {
							cond += " or prox.ground.delta[" + buttons[i].str + "] >= 450";
						}
						cond = cond.slice(4);	// crop initial " or "
					}
					return {
						sectionBegin: "onevent prox\n",
						clause: cond
					};
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
					0.6, 0.4	// levels (0.6*1000=600, 0.4*1000=400)
				];
			},
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			typicalParam: function () {
				return [
					1, -1,	// sensor modes
					0.6, 0.4	// levels (0.6*1000=600, 0.4*1000=400)
				];
			},
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop({withWheels: true});
				canvas.buttons(buttons, block.param, {cross: true});
				canvas.slider(/** @type {number} */(block.param[2]), 0.02, false,
					"red", A3a.vpl.draw.levelType.high);
				canvas.slider(/** @type {number} */(block.param[3]), -0.2, false,
					"black", A3a.vpl.draw.levelType.low);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				// sensor click
				if (i !== null) {
					block.prepareChange();
					block.param[i] = (block.param[i] + 2) % 3 - 1;
					return i;
				}
				// slider drag
				if (canvas.sliderCheck(0.02, false, width, height, left, top, ev)) {
					block.prepareChange();
					return 2;
				}
				if (canvas.sliderCheck(-0.2, false, width, height, left, top, ev)) {
					block.prepareChange();
					return 3;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				if (dragIndex >= 2) {
					var val = canvas.sliderDrag(false, width, height, left, top, ev);
					block.param[dragIndex] = Math.max(0, Math.min(1, val));
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
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					var cond = "";
					for (var i = 0; i < 2; i++) {
						if (block.param[i]) {
							cond += (cond.length === 0 ? "" : " and ") +
								"prox.ground.delta[" + buttons[i].str + "] " +
								(block.param[i] > 0
									? ">= " + 25 * Math.round(40 * block.param[2])
									: "<= " + 25 * Math.round(40 * block.param[3]));
						}
					}
					if (cond === "") {
						for (var i = 0; i < 2; i++) {
							cond += " or prox.ground.delta[" + buttons[i].str + "] >= 450";
						}
						cond = cond.slice(4);	// crop initial " or "
					}
					return {
						sectionBegin: "onevent prox\n",
						clause: cond
					};
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
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				canvas.robotTop({withWheels: true});
				canvas.buttons(buttons, block.param, {cross: true});
				canvas.slider(/** @type {number} */(block.param[2]), 0, false,
					"black", A3a.vpl.draw.levelType.low);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				// sensor click
				if (i !== null) {
					block.prepareChange();
					block.param[i] = (block.param[i] + 2) % 3 - 1;
					return i;
				}
				// slider drag
				if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
					block.prepareChange();
					return 2;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				if (dragIndex >= 2) {
					var val = canvas.sliderDrag(false, width, height, left, top, ev);
					block.param[dragIndex] = Math.max(0, Math.min(1, val));
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
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					var cond = "";
					for (var i = 0; i < 2; i++) {
						if (block.param[i]) {
							cond += (cond.length === 0 ? "" : " and ") +
								"prox.ground.delta[" + buttons[i].str + "] " +
								(block.param[i] > 0
									? ">= " : "< ") +
								25 * Math.round(40 * block.param[2]);
						}
					}
					if (cond === "") {
						for (var i = 0; i < 2; i++) {
							cond += " or prox.ground.delta[" + buttons[i].str + "] >= 450";
						}
						cond = cond.slice(4);	// crop initial " or "
					}
					return {
						sectionBegin: "onevent prox\n",
						clause: cond
					};
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
		},
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				return {
					initVarDecl: [
						"var tapped\n"
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.resetTimer,
						"tapped = 0\n"
					],
					sectionBegin: "onevent tap\ntapped = 1\n",
						// there must be a real tap event block in the program
					clause: "tapped != 0"
				};
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
					0,	// 0 for tap, 2 for roll, 1 for pitch
					0 // integer from -6 to 6
				];
			},
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
					canvas.robotAccelerometer(dir === 2, a);
				}
				canvas.buttons(buttons, [dir===0, dir===1, dir===2]);
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				if (block.param[0] !== 0 && canvas.accelerometerCheck(width, height, left, top, ev)) {
					block.prepareChange();
					return 1;
				}
				var i = canvas.buttonClick(buttons, width, height, left, top, ev);
				if (i !== null) {
					block.prepareChange();
					block.param[0] = i;
					return 2;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				if (dragIndex === 1) {
					var angle = canvas.accelerometerDrag(width, height, left, top, ev);
					block.param[1] = angle;
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
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					var dir = /** @type {number} */(block.param[0]);
					if (dir === 0) {
						// tap
						return {
							sectionBegin: "onevent tap\n"
						};
					} else {
						/** @type {number} */
						var a = (dir === 2 ? -1 : 1) * /** @type {number} */(block.param[1]);
						var name = dir === 1 ? "roll" : "pitch";
						/** @type {string} */
						var cond;
						if (a <= -6) {
							cond = name + "Angle < " + Math.round(2730.67 * a + 1365.33);
						} else if (a >= 6) {
							cond = name + "Angle >= " + Math.round(2730.67 * a - 1365.33);
						} else {
							cond = name + "Angle >= " + Math.round(2730.67 * a - 1365.33) +
								" and " + name + "Angle < " + Math.round(2730.67 * a + 1365.33);
						}
						return {
							initVarDecl: [
								"# " + name + " angle from accelerometer\nvar " + name + "Angle\n"
							],
							sectionBegin: "onevent acc\n",
							clauseInit:
								"call math.atan2(" + name + "Angle, acc[" + (dir === 2 ? "1" : "0") + "], acc[2])\n",
							clause: cond
						};
					}
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
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			/** @type {number} */
			var a = /** @type {number} */(block.param[0]);
			canvas.robotAccelerometer(false, a);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			if (canvas.accelerometerCheck(width, height, left, top, ev, true)) {
				block.prepareChange();
				return 1;
			}
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
			var angle = canvas.accelerometerDrag(width, height, left, top, ev, true);
			block.param[0] = angle;
		},
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				/** @type {number} */
				var a = /** @type {number} */(block.param[0]);
				return {
					initVarDecl: [
						"# roll angle from accelerometer\nvar rollAngle\n"
					],
					sectionBegin: "onevent acc\n",
					clauseInit:
						"call math.atan2(rollAngle, -acc[0], acc[2])\n",
					clause:
						a === -12
							? "rollAngle >= " + Math.round(2730.67 * 12 - 1365.33) +
								" or rollAngle < " + Math.round(2730.67 * a + 1365.33)
							: "rollAngle >= " + Math.round(2730.67 * a - 1365.33) +
								" and rollAngle < " + Math.round(2730.67 * a + 1365.33)
				};
			}
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
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			/** @type {number} */
			var a = /** @type {number} */(block.param[0]);
			canvas.robotAccelerometer(true, a);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			if (canvas.accelerometerCheck(width, height, left, top, ev, true)) {
				block.prepareChange();
				return 1;
			}
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
			var angle = canvas.accelerometerDrag(width, height, left, top, ev, true);
			block.param[0] = angle;
		},
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				/** @type {number} */
				var a = -/** @type {number} */(block.param[0]);
				return {
					initVarDecl: [
						"# pitch angle from accelerometer\nvar pitchAngle\n"
					],
					sectionBegin: "onevent acc\n",
					clauseInit:
						"call math.atan2(pitchAngle, acc[1], acc[2])\n",
					clause:
						a === -12
							? "pitchAngle >= " + Math.round(2730.67 * 12 - 1365.33) +
								" or pitchAngle < " + Math.round(2730.67 * a + 1365.33)
							: "pitchAngle >= " + Math.round(2730.67 * a - 1365.33) +
								" and pitchAngle < " + Math.round(2730.67 * a + 1365.33)
				};
			}
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
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			/** @type {number} */
			var a = /** @type {number} */(block.param[0]);
			canvas.robotYaw(a);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			if (canvas.accelerometerCheck(width, height, left, top, ev, true)) {
				block.prepareChange();
				return 1;
			}
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
			var angle = canvas.accelerometerDrag(width, height, left, top, ev, true);
			block.param[0] = angle;
		},
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				/** @type {number} */
				var a = -/** @type {number} */(block.param[0]);
				return {
					initVarDecl: [
						"# yaw angle from accelerometer\nvar yawAngle\n"
					],
					sectionBegin: "onevent acc\n",
					clauseInit:
						"call math.atan2(yawAngle, acc[0], acc[1])\n",
					clause:
						a === -12
							? "yawAngle >= " + Math.round(2730.67 * 12 - 1365.33) +
								" or yawAngle < " + Math.round(2730.67 * a + 1365.33)
							: "yawAngle >= " + Math.round(2730.67 * a - 1365.33) +
								" and yawAngle < " + Math.round(2730.67 * a + 1365.33)
				};
			}
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "clap",
		type: A3a.vpl.blockType.event,
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.microphone();
		},
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				return {
					initCodeExec: [
						"# setup threshold for detecting claps\n" +
						"mic.threshold = 250\n"
					],
					sectionBegin: "onevent mic\n",
					clause: "mic.intensity > mic.threshold",
					clauseOptional: true
				};
			}
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
		noState: true,
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				return {
					sectionBegin: "# initialization\n",
				};
			}
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "timer",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.event,
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawTimer(0, true, false);
		},
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				return {
					initVarDecl: [
						"var timerElapsed\n"
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.resetTimer,
						"timerElapsed = 0\n"
					],
					sectionBegin: "onevent timer0\ntimerElapsed = 1\ntimer.period[0] = 0\n",
						// there must be a real timer event block in the program
					clause: "timerElapsed != 0"
				};
			}
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "state",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.state,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 0, 0, 0]; },
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		typicalParam: function () { return [1, 0, 0, -1]; },
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.robotTop();
			canvas.drawState(block.param);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			var i = canvas.stateClick(width, height, left, top, ev);
			if (i !== null) {
				block.prepareChange();
				block.param[i] = (block.param[i] + 2) % 3 - 1;
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
		},
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				var cond = "";
				for (var i = 0; i < 4; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " and ") +
							"state0[" + i + "] == " + (block.param[i] > 0 ? "1" : "0");
					}
				}
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initStatesDecl
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initStatesInit
					],
					clauseInit: A3a.vpl.BlockTemplate.clauseInitState,
					clause: cond
				};
			}
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "state 8",
		modes: [A3a.vpl.mode.custom],
		type: A3a.vpl.blockType.state,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0]; },
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.robotTop();
			canvas.drawState8(block.param[0]);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			var i = canvas.state8Click(width, height, left, top, ev);
			if (i !== null) {
				block.prepareChange();
				block.param[0] = i;
			}
			return i;
		},
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initState8Decl
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initState8Init
					],
					clauseInit: A3a.vpl.BlockTemplate.clauseInitState8,
					clause: "state80 == " + block.param[0].toString(10)
				};
			}
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
					block.prepareChange();
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
				}
				return i;
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					var cond = "counter0 " +
						(block.param[0] === 0 ? "==" : block.param[0] > 0 ? ">=" : "<=") +
						" " + block.param[1];
					return {
						initVarDecl: [
							A3a.vpl.BlockTemplate.initCounterDecl
						],
						initCodeExec: [
							A3a.vpl.BlockTemplate.initCounterInit
						],
						clauseInit: A3a.vpl.BlockTemplate.clauseInitCounter,
						clause: cond
					};
				}
			}
		};
	})()),
	new A3a.vpl.BlockTemplate({
		name: "color state",
		modes: [A3a.vpl.mode.custom],
		type: A3a.vpl.blockType.state,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 0, 0]; },
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
				block.prepareChange();
				return 0;
			}
			if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
				block.prepareChange();
				return 1;
			}
			if (canvas.sliderCheck(-0.3, false, width, height, left, top, ev)) {
				block.prepareChange();
				return 2;
			}
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
			var val = canvas.sliderDrag(false, width, height, left, top, ev);
			block.param[dragIndex] = Math.max(0, Math.min(1, Math.round(val)));
		},
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				var cond = block.param
					.map(function (p, i) {
						return "topColor0[" + i + "] / 11 == " + Math.floor(p * 2.99);
					})
					.join(" and ");
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initTopColorDecl,
						A3a.vpl.BlockTemplate.initTopColorStateDecl
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initTopColorInit
					],
					clauseInit: A3a.vpl.BlockTemplate.clauseInitTopColor,
					clause: cond
				};
			}
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
					block.prepareChange();
					block.param = [i];
				}
				return i;
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					return {
						initVarDecl: [
							A3a.vpl.BlockTemplate.initTopColorDecl,
							A3a.vpl.BlockTemplate.initTopColorStateDecl
						],
						initCodeExec: [
							A3a.vpl.BlockTemplate.initTopColorInit
						],
						clauseInit: A3a.vpl.BlockTemplate.clauseInitTopColor,
						clause: "topColor0[0] " + (block.param[0] % 2 ? '>=' : '<') +
							" 16 and topColor0[1] " + (block.param[0] % 4 >= 2 ? '>=' : '<') +
 							" 16 and topColor0[2] " + (block.param[0] >= 4 ? '>=' : '<') + " 16"
					};
				}
			}
		};
	})()),
	new A3a.vpl.BlockTemplate({
		name: "motor state",
		modes: [A3a.vpl.mode.custom],
		type: A3a.vpl.blockType.state,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 0]; },
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
				block.prepareChange();
				return 0;
			}
			if (canvas.sliderCheck(0.4, true, width, height, left, top, ev)) {
				block.prepareChange();
				return 1;
			}
			if (canvas.robotTopCheck(width, height, left, top,
					0.5 * block.param[0], 0.5 * block.param[1], 0.21,
					ev)) {
				block.prepareChange();
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
		},
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				/** Clause for one of the motors
					@param {string} side
					@param {number} x
					@return {string}
				*/
				function clause1(side, x) {
					return x > 0 ? "motor." + side + ".target > 250"
						: x < 0 ? "motor." + side + ".target < -250"
						: "abs(motor." + side + ".target) < 250";
				}

				return {
					clause:
						clause1("left", block.param[0]) + " and " +
							clause1("right", block.param[1])
				};
			}
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "motor",
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 0]; },
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		typicalParam: function () { return [0.5, 0.2]; },
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
				block.prepareChange();
				return 0;
			}
			if (canvas.sliderCheck(0.4, true, width, height, left, top, ev)) {
				block.prepareChange();
				return 1;
			}
			if (canvas.robotTopCheck(width, height, left, top,
					0.5 * block.param[0], 0.5 * block.param[1], 0.21,
					ev)) {
				block.prepareChange();
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
		},
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputs
					],
					statement:
						"motor.left.target = " + Math.round(500 * block.param[0]) + "\n" +
						"motor.right.target = " + Math.round(500 * block.param[1]) + "\n"
				};
			}
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
					block.prepareChange();
					block.param[0] = i;
				}
				return i;
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					return {
						initCodeExec: [
							A3a.vpl.BlockTemplate.initOutputs
						],
						statement:
							"motor.left.target = " +
								[0, sp, -sp, sp-spt, sp+spt, -sp, sp][block.param[0]] + "\n" +
							"motor.right.target = " +
								[0, sp, -sp, sp+spt, sp-spt, sp, -sp][block.param[0]] + "\n"
					};
				}
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
					block.prepareChange();
					return 0;
				}
				if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
					block.prepareChange();
					return 1;
				}
				if (canvas.sliderCheck(-0.3, false, width, height, left, top, ev)) {
					block.prepareChange();
					return 2;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				var val = canvas.sliderDrag(false, width, height, left, top, ev);
				block.param[dragIndex] = Math.max(0, Math.min(1, val));
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					return {
						initVarDecl: [
							A3a.vpl.BlockTemplate.initTopColorDecl
						],
						initCodeExec: [
							A3a.vpl.BlockTemplate.initTopColorInit,
							A3a.vpl.BlockTemplate.initOutputs
						],
						statement:
							"call leds.top(" +
							block.param.map(function (x) { return Math.round(32 * x); }).join(", ") +
							")\n" +
							"topColor = [" +
							block.param.map(function (x) { return Math.round(32 * x); }).join(", ") +
							"]\n",
						statementWithoutInit:
							"call leds.top(" +
							block.param.map(function (x) { return Math.round(32 * x); }).join(", ") +
							")\n"
					};
				}
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
					block.prepareChange();
					block.param = [i];
				}
				return i;
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					var rgbStr = [(block.param & 1) * 32, (block.param & 2) * 16, (block.param & 4) * 8]
						.join(", ");
					return {
						initVarDecl: [
							A3a.vpl.BlockTemplate.initTopColorDecl
						],
						initCodeExec: [
							A3a.vpl.BlockTemplate.initTopColorInit,
							A3a.vpl.BlockTemplate.initOutputs
						],
						statement:
							"call leds.top(" + rgbStr + ")\n" +
							"topColor = [" + rgbStr + "]\n",
						statementWithoutInit:
							"call leds.top(" + rgbStr + ")\n"
					};
				}
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
					block.prepareChange();
					return 0;
				}
				if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
					block.prepareChange();
					return 1;
				}
				if (canvas.sliderCheck(-0.3, false, width, height, left, top, ev)) {
					block.prepareChange();
					return 2;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				var val = canvas.sliderDrag(false, width, height, left, top, ev);
				block.param[dragIndex] = Math.max(0, Math.min(1, val));
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					return {
						initCodeExec: [
							A3a.vpl.BlockTemplate.initOutputs
						],
						statement:
							"call leds.bottom.left(" +
							block.param.map(function (x) { return Math.round(32 * x); }).join(", ") +
							")\n" +
							"call leds.bottom.right(" +
							block.param.map(function (x) { return Math.round(32 * x); }).join(", ") +
							")\n"
					};
				}
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
					block.prepareChange();
					return 0;
				}
				if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
					block.prepareChange();
					return 1;
				}
				if (canvas.sliderCheck(-0.3, false, width, height, left, top, ev)) {
					block.prepareChange();
					return 2;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				var val = canvas.sliderDrag(false, width, height, left, top, ev);
				block.param[dragIndex] = Math.max(0, Math.min(1, val));
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					return {
						initCodeExec: [
							A3a.vpl.BlockTemplate.initOutputs
						],
						statement:
							"call leds.bottom.left(" +
							block.param.map(function (x) { return Math.round(32 * x); }).join(", ") +
							")\n"
					};
				}
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
					block.prepareChange();
					return 0;
				}
				if (canvas.sliderCheck(0, false, width, height, left, top, ev)) {
					block.prepareChange();
					return 1;
				}
				if (canvas.sliderCheck(-0.3, false, width, height, left, top, ev)) {
					block.prepareChange();
					return 2;
				}
				return null;
			},
			/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
			mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
				var val = canvas.sliderDrag(false, width, height, left, top, ev);
				block.param[dragIndex] = Math.max(0, Math.min(1, val));
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					return {
						initCodeExec: [
							A3a.vpl.BlockTemplate.initOutputs
						],
						statement:
							"call leds.bottom.right(" +
							block.param.map(function (x) { return Math.round(32 * x); }).join(", ") +
							")\n"
					};
				}
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
					block.prepareChange();
					block.param = [i];
				}
				return i;
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					var rgbStr = [(block.param & 1) * 32, (block.param & 2) * 16, (block.param & 4) * 8]
						.join(", ");
					return {
						initCodeExec: [
							A3a.vpl.BlockTemplate.initOutputs
						],
						statement:
							"call leds.bottom.left(" + rgbStr + ")\n" +
							"call leds.bottom.right(" + rgbStr + ")\n"
					};
				}
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
					block.prepareChange();
					block.param = [i];
				}
				return i;
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					var rgbStr = [(block.param & 1) * 32, (block.param & 2) * 16, (block.param & 4) * 8]
						.join(", ");
					return {
						initCodeExec: [
							A3a.vpl.BlockTemplate.initOutputs
						],
						statement:
							"call leds.bottom.left(" + rgbStr + ")\n"
					};
				}
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
					block.prepareChange();
					block.param = [i];
				}
				return i;
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					var rgbStr = [(block.param & 1) * 32, (block.param & 2) * 16, (block.param & 4) * 8]
						.join(", ");
					return {
						initCodeExec: [
							A3a.vpl.BlockTemplate.initOutputs
						],
						statement:
							"call leds.bottom.right(" + rgbStr + ")\n"
					};
				}
			}
		};
	})()),
	new A3a.vpl.BlockTemplate({
		name: "notes",
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 1, 1, 1, 2, 1, 0, 1, 2, 1, 4, 2]; },
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.notes(block.param);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			var note = canvas.noteClick(width, height, left, top, ev);
			if (note) {
				block.prepareChange();
				if (block.param[2 * note.index] === note.tone) {
					block.param[2 * note.index + 1] = (block.param[2 * note.index + 1] + 1) % 3;
				} else {
					block.param[2 * note.index] = note.tone;
					block.param[2 * note.index + 1] = 1;
				}
				return 0;
			}
			return null;
		},
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				/** @type {Array.<number>} */
				var notes = [];
				/** @type {Array.<number>} */
				var durations = [];
				for (var i = 0; i < 6; i++) {
					if (block.param[2 * i + 1] > 0) {
						notes.push([262, 311, 370, 440, 524, 370][/** @type {number} */(block.param[2 * i])]);
						durations.push(7 * block.param[2 * i + 1]);
					} else {
						notes.push(0);
						durations.push(28);
					}
				}
				return {
					initVarDecl: [
						"# variables for notes\n" +
						"var notes[6]\n" +
						"var durations[6]\n" +
						"var note_index\n" +
						"var note_count\n" +
						"var wave[142]\n" +
						"var i\n" +
						"var wave_phase\n" +
						"var wave_intensity\n",
					],
					initCodeExec: [
						"# init. variables for notes\n" +
						"note_index = 6\n" +
						"note_count = 6\n",
						"# compute a sinus wave for sound\n" +
						"for i in 0 : 141 do\n" +
						"wave_phase = (i - 70) * 468\n" +
						"call math.cos(wave_intensity, wave_phase)\n" +
						"wave[i] = wave_intensity / 256\n" +
						"end\n" +
						"call sound.wave(wave)\n",
						"call sound.system(-1)\n"
					],
					initCodeDecl: [
						"# when a note is finished, play the next one\n" +
						"onevent sound.finished\n" +
						"if note_index != note_count then\n" +
						"call sound.freq(notes[note_index], durations[note_index])\n" +
						"note_index++\n" +
						"end\n"
					],
					statement:
						"notes = [" + notes.join(", ") + "]\n" +
						"durations = [" + durations.join(", ") + "]\n" +
						"note_index = 1\n" +
						"note_count = 6\n" +
						"call sound.freq(notes[0], durations[0])\n"
				};
			}
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
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.robotTop();
			canvas.drawState(block.param);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			var i = canvas.stateClick(width, height, left, top, ev);
			if (i !== null) {
				block.prepareChange();
				block.param[i] = (block.param[i] + 2) % 3 - 1;
			}
			return i;
		},
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				var code = "";
				for (var i = 0; i < 4; i++) {
					if (block.param[i]) {
						code += "state[" + i + "] = " + (block.param[i] > 0 ? "1" : "0") + "\n";
					}
				}
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initStatesDecl
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initStatesInit
					],
					initCodeDecl: [
						A3a.vpl.BlockTemplate.dispStates
					],
					statement: code.length > 0
						? code + "callsub display_state\n"
						: "",
					statementWithoutInit:
						"call leds.circle(0," + (block.param[1] ? "32" : "0") +
							",0," + (block.param[3] ? "32" : "0") +
							",0," + (block.param[2] ? "32" : "0") +
							",0," + (block.param[0] ? "32" : "0") + ")\n"
				};
			}
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "toggle state",
		modes: [A3a.vpl.mode.custom],
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [false, false, false, false]; },
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
				block.prepareChange();
				block.param[i] = !block.param[i];
			}
			return i;
		},
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				var code = "";
				for (var i = 0; i < 4; i++) {
					if (block.param[i]) {
						code += "state[" + i + "] = 1 - state[" + i + "]\n";
					}
				}
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initStatesDecl
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initStatesInit
					],
					initCodeDecl: [
						A3a.vpl.BlockTemplate.dispStates
					],
					statement: code.length > 0
						? code + "callsub display_state\n"
						: "",
					statementWithoutInit:
						"call leds.circle(0," + (block.param[1] ? "32" : "0") +
							",0," + (block.param[3] ? "32" : "0") +
							",0," + (block.param[2] ? "32" : "0") +
							",0," + (block.param[0] ? "32" : "0") + ")\n"
				};
			}
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "set state 8",
		modes: [A3a.vpl.mode.custom],
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0]; },
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.robotTop();
			canvas.drawState8(block.param[0]);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			var i = canvas.state8Click(width, height, left, top, ev);
			if (i !== null) {
				block.prepareChange();
				block.param[0] = i;
			}
			return i;
		},
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initState8Decl
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initState8Init
					],
					initCodeDecl: [
						A3a.vpl.BlockTemplate.dispState8
					],
					statement:
						"state8 = " + block.param[0].toString(10) + "\n" +
						"callsub display_state8\n",
					statementWithoutInit:
						"call leds.circle(" + (block.param[0] === 0 ? "32" : "0") +
							"," + (block.param[0] === 1 ? "32" : "0") +
							"," + (block.param[0] === 2 ? "32" : "0") +
							"," + (block.param[0] === 3 ? "32" : "0") +
							"," + (block.param[0] === 4 ? "32" : "0") +
							"," + (block.param[0] === 5 ? "32" : "0") +
							"," + (block.param[0] === 6 ? "32" : "0") +
							"," + (block.param[0] === 7 ? "32" : "0") +
							")\n"
				};
			}
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
					block.prepareChange();
					block.param[0] = i === 0 ? -1 : 1;
				}
				return i;
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					return {
						initVarDecl: [
							A3a.vpl.BlockTemplate.initState8Decl
						],
						initCodeExec: [
							A3a.vpl.BlockTemplate.initState8Init
						],
						initCodeDecl: [
							A3a.vpl.BlockTemplate.dispState8
						],
						statement: "state8 = (state8 + " +
								(block.param[0] > 0 ? "1" : "7") +
								") % 8\n" +
								"callsub display_state8\n",
						statementWithoutInit:
							"call leds.circle(" + (block.param[0] === 0 ? "32" : "0") +
								"," + (block.param[0] === 1 ? "32" : "0") +
								"," + (block.param[0] === 2 ? "32" : "0") +
								"," + (block.param[0] === 3 ? "32" : "0") +
								"," + (block.param[0] === 4 ? "32" : "0") +
								"," + (block.param[0] === 5 ? "32" : "0") +
								"," + (block.param[0] === 6 ? "32" : "0") +
								"," + (block.param[0] === 7 ? "32" : "0") +
								")\n"
					};
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
			{sh: "t", x: 0, y: 0.3, r: 0},
			{sh: "t", x: 0, y: -0.3, r: Math.PI}
		];
		return {
			name: "set counter",
			modes: [A3a.vpl.mode.advanced],
			type: A3a.vpl.blockType.action,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0]; },
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
					block.prepareChange();
					switch (i) {
					case 0:
						block.param[0] = Math.min(1, block.param[0] + 1);
						break;
					case 1:
						block.param[0] = Math.max(-1, block.param[0] - 1);
						break;
					}
				}
				return i;
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					return {
						initVarDecl: [
							A3a.vpl.BlockTemplate.initCounterDecl,
						],
						initCodeExec: [
							A3a.vpl.BlockTemplate.initCounterInit
						],
						initCodeDecl: [
							A3a.vpl.BlockTemplate.dispCounter
						],
						statement:
							(block.param[0] === 0 ? "counter = 0" :
								block.param[0] > 0 ? "if counter < 255 then\ncounter++\nend" :
								"if counter > 0 then\ncounter--\nend") +
							"\n" +
							"callsub display_counter\n",
						statementWithoutInit:
							"call leds.circle(" + (block.param[0] > 0 ? "1" : "0") + ",0,0,0,0,0,0,0)\n"
					};
				}
			}
		};
	})()),
	new A3a.vpl.BlockTemplate({
		name: "set timer",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [1]; },
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawTimer(/** @type {number} */(block.param[0]), false, false);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			if (canvas.timerCheck(width, height, left, top, ev)) {
				block.prepareChange();
				return 1;
			}
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
			var t = canvas.timerDrag(width, height, left, top, false, ev);
			block.param[0] = t;
		},
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				return {
					initVarDecl: [
						"var timerElapsed\n"
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.resetTimer,
						"timerElapsed = 0\n"
					],
					statement: "timer.period[0] = " + Math.round(1000 * block.param[0]) + "\n" +
						"timerElapsed = 0\n"
				};
			}
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "set timer log",
		modes: [A3a.vpl.mode.custom],
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [1]; },
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawTimer(/** @type {number} */(block.param[0]), false, true);
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			if (canvas.timerCheck(width, height, left, top, ev)) {
				block.prepareChange();
				return 1;
			}
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
			var t = canvas.timerDrag(width, height, left, top, true, ev);
			block.param[0] = t;
		},
		/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
		genCode: {
			"aseba": function (block) {
				return {
					initVarDecl: [
						"var timerElapsed\n"
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.resetTimer,
						"timerElapsed = 0\n"
					],
					statement: "timer.period[0] = " + Math.round(1000 * block.param[0]) + "\n" +
						"timerElapsed = 0\n"
				};
			}
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
						block.prepareChange();
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
				}
				return i;
			},
			/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
			genCode: {
				"aseba": function (block) {
					return {};
				}
			}
		};
	})())
];

/** Find a block template specified by name
	@param {string} name
	@return {A3a.vpl.BlockTemplate}
*/
A3a.vpl.BlockTemplate.findByName = function (name) {
	for (var i = 0; i < A3a.vpl.BlockTemplate.lib.length; i++) {
		if (A3a.vpl.BlockTemplate.lib[i].name === name) {
			return A3a.vpl.BlockTemplate.lib[i];
		}
	}
	return null;
};

/** Filter block names, keeping only those defined in A3a.vpl.BlockTemplate.lib
	@param {Array.<string>} a
	@return {Array.<string>}
*/
A3a.vpl.BlockTemplate.filterBlocks = function (a) {
	/** @type {Array.<string>} */
	var af = [];
	a.forEach(function (name) {
		if (A3a.vpl.BlockTemplate.findByName(name)) {
			af.push(name);
		}
	});
	return af;
};

/** Get all blocks defined for the specified mode
	@param {A3a.vpl.mode} mode
	@return {Array.<A3a.vpl.BlockTemplate>}
*/
A3a.vpl.BlockTemplate.getBlocksByMode = function (mode) {
	var a = [];
	A3a.vpl.BlockTemplate.lib.forEach(function (b) {
		if (b.type !== A3a.vpl.blockType.hidden && b.modes.indexOf(mode) >= 0) {
			a.push(b);
		}
	});
	return a;
};
