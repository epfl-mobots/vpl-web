/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** @const */
A3a.vpl.BlockTemplate.initStatesDecl8 =
	"var state[8]\n";

/** @const */
A3a.vpl.BlockTemplate.initStatesInit8 =
	"state = [0, 0, 0, 0, 0, 0, 0, 0]\n";

A3a.vpl.BlockTemplate.svgDict = {};

/** Draw svg
	@param {string} svgSrc
	@param {SVG.Options=} options
	@return {void}
*/
A3a.vpl.Canvas.prototype.drawSVG = function (svgSrc, options) {
	if (!this.clientData.svg) {
		this.clientData.svg = new SVG(svgSrc);
	}
	this.ctx.save();
	options.globalTransform = function (ctx, viewBox) {
		this.clientData.blockViewBox = viewBox;
		ctx.translate(-viewBox[0], -viewBox[1]);
		ctx.scale(this.dims.blockSize / (viewBox[2] - viewBox[0]),
			this.dims.blockSize / (viewBox[3] - viewBox[1]));
	}.bind(this);
	this.clientData.svg.draw(this.ctx, options);
	this.ctx.restore();
};

/** Convert x or y coordinate from event (pixel), relative to top left
	corner, to svg
	@param {number} clickX
	@param {number} clickY
	@return {{x:number,y:number}}
*/
A3a.vpl.Canvas.prototype.canvasToSVGCoord = function (clickX, clickY) {
	return {
		x: (this.clientData.blockViewBox[2] - this.clientData.blockViewBox[0]) /
			this.dims.blockSize * (clickX + this.clientData.blockViewBox[0]),
		y: (this.clientData.blockViewBox[3] - this.clientData.blockViewBox[1]) /
			this.dims.blockSize * (clickY + this.clientData.blockViewBox[1])
	};
};

/** Handle a mousedown event on block buttons (typically called from
	A3a.vpl.BlockTemplate.mousedownFun)
	@param {A3a.vpl.Block} block
	@param {number} left
	@param {number} top
	@param {Event} ev
	@param {Array.<string>} buttonIds
	@param {?function(*):*=} funSep function for separate states (null if funAll)
	@param {?function(number,Array.<*>):Array.<*>=} funAll function handling the whole state vector (null if funSep)
	@return {?number} index of the button in buttonIds, or null if click
	is outside the SVG shape
*/
A3a.vpl.Canvas.prototype.mousedownSVGButton = function (block, left, top, ev, buttonIds, funSep, funAll) {
	var pt = this.canvasToSVGCoord(ev.clientX - left, ev.clientY - top);
	for (var i = 0; i < buttonIds.length; i++) {
		var id = buttonIds[i];
		if (this.clientData.svg.isInside(id, pt.x, pt.y)) {
			block.prepareChange();
			if (funSep) {
				block.param[i] = funSep(block.param[i]);
			} else if (funAll) {
				block.param = funAll(i, block.param);
			}
			return i;
		}
	}
	return null;
};

/**
	@const
	@type {Array.<A3a.vpl.BlockTemplate>}
*/
A3a.vpl.BlockTemplate.libSVG =	[
	new A3a.vpl.BlockTemplate({
		name: "button",
		type: A3a.vpl.blockType.event,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [false, false, false, false, false]; },
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			/** Button style for drawSVG
				@param {number} p button state (1, 0 or -1)
				@return {string}
			*/
			function style(p) {
				return "fill:" + (p > 0 ? "#f33" : "#ddd");
			}

			canvas.drawSVG(textfiles["Blocks_test4.svg"],
				{
					"elementId": "Ev_Buttons",
					"style": {
						"Btn2_Center": style(block.param[0]),
						"Btn2_Forward": style(block.param[1]),
						"Btn2_Backward": style(block.param[2]),
						"Btn2_Right": style(block.param[3]),
						"Btn2_Left": style(block.param[4])
					}
				});
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			return canvas.mousedownSVGButton(block, left, top, ev,
				[
					"Btn2_Center",
					"Btn2_Forward",
					"Btn2_Backward",
					"Btn2_Right",
					"Btn2_Left"
				],
				function (p) { return !p; });
		},
		/** @type {A3a.vpl.BlockTemplate.validateFun} */
		validate: function (block) {
			for (var i = 0; i < 5; i++) {
				if (block.param[i]) {
					return null;
				}
			}
			return new A3a.vpl.Error("No button specified");
		},
		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		genCode: function (block) {
			var cond = "";
			for (var i = 0; i < 5; i++) {
				if (block.param[i]) {
					cond += (cond.length === 0 ? "" : " and ") +
						"button." + ["center", "forward", "backward", "right", "left"][i] +
						" == 1";
				}
			}
			if (cond === "") {
				cond = "button.center == 1 or button.forward == 1 or button.backward == 1 or button.right == 1 or button.left == 1";
			}
			return {
				sectionBegin: "onevent buttons\n",
				sectionPriority: 10,
				clause: cond
			};
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "horiz prox",
		modes: [A3a.vpl.mode.basic],
		type: A3a.vpl.blockType.event,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 0, 0, 0, 0, 0, 0]; },
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			/** Button style for drawSVG
				@param {number} p button state (1, 0 or -1)
				@return {string}
			*/
			function style(p) {
				return "" +
					"fill:" + (p > 0 ? "#f66" : p < 0 ? "white" : "#ddd") + ";" +
					"stroke:" + (p > 0 ? "#700" : p < 0 ? "black" : "#aaa");
			}

			canvas.drawSVG(textfiles["Blocks_test4.svg"],
				{
					"elementId": "Ev_Prox",
					"style": {
						"Btn3_Prox0": style(block.param[0]),
						"Btn3_Prox1": style(block.param[1]),
						"Btn3_Prox2": style(block.param[2]),
						"Btn3_Prox3": style(block.param[3]),
						"Btn3_Prox4": style(block.param[4]),
						"Btn3_Prox5": style(block.param[5]),
						"Btn3_Prox6": style(block.param[6])
					}
				});
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			return canvas.mousedownSVGButton(block, left, top, ev,
				[
					"Btn3_Prox0",
					"Btn3_Prox1",
					"Btn3_Prox2",
					"Btn3_Prox3",
					"Btn3_Prox4",
					"Btn3_Prox5",
					"Btn3_Prox6"
				],
				function (p) { return (p + 2) % 3 - 1; });
		},
		/** @type {A3a.vpl.BlockTemplate.validateFun} */
		validate: function (block) {
			for (var i = 0; i < 7; i++) {
				if (block.param[i]) {
					return null;
				}
			}
			return new A3a.vpl.Error("No proximity sensor specified");
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
		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		genCode: function (block) {
			var cond = "";
			for (var i = 0; i < 7; i++) {
				if (block.param[i]) {
					cond += (cond.length === 0 ? "" : " and ") +
						"prox.horizontal[" + [0,1,2,3,4,5,6][i].toString(10) + "] " +
						(block.param[i] > 0 ? ">= 2" : "<= 1") + "000";
				}
			}
			if (cond === "") {
				for (var i = 1; i < 7; i++) {
					cond += " or prox.horizontal[" + [0,1,2,3,4,5,6][i].toString(10) + "] >= 2000";
				}
				cond = cond.slice(4);	// crop initial " or "
			}
			return {
				sectionBegin: "onevent prox\n",
				sectionPriority: 1,
				clause: cond
			};
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "ground",
		modes: [A3a.vpl.mode.basic],
		type: A3a.vpl.blockType.event,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 0]; },
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			/** Button style for drawSVG
				@param {number} p button state (1, 0 or -1)
				@return {string}
			*/
			function style(p) {
				return "" +
					"fill:" + (p > 0 ? "#f66" : p < 0 ? "white" : "#ddd") + ";" +
					"stroke:" + (p > 0 ? "#700" : p < 0 ? "black" : "#aaa");
			}

			canvas.drawSVG(textfiles["Blocks_test4.svg"],
				{
					"elementId": "Ev_ProxGround",
					"style": {
						"Btn2_ProxGd1": style(block.param[0]),
						"Btn2_ProxGd0": style(block.param[1])
					}
				});
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			return canvas.mousedownSVGButton(block, left, top, ev,
				[
					"Btn2_ProxGd1",
					"Btn2_ProxGd0"
				],
				function (p) { return (p + 2) % 3 - 1; });
		},
		/** @type {A3a.vpl.BlockTemplate.validateFun} */
		validate: function (block) {
			if (block.param[0] || block.param[1]) {
				return null;
			}
			return new A3a.vpl.Error("No ground sensor specified");
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
		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		genCode: function (block) {
			var cond = "";
			for (var i = 0; i < 2; i++) {
				if (block.param[i]) {
					cond += (cond.length === 0 ? "" : " and ") +
						"prox.ground.delta[" + i.toString(10) + "] " +
						(block.param[i] > 0 ? ">= 450" : "<= 400");
				}
			}
			if (cond === "") {
				for (var i = 1; i < 2; i++) {
					cond += " or prox.ground.delta[" + i.toString(10) + "] >= 450";
				}
				cond = cond.slice(4);	// crop initial " or "
			}
			return {
				sectionBegin: "onevent prox\n",
				sectionPriority: 1,
				clause: cond
			};
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "init",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.event,
		noState: true,
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawSVG(textfiles["Blocks_test4.svg"], {"elementId": "Ev_Start"});
		},
		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		genCode: function (block) {
			return {
				sectionBegin: "# initialization\n",
				sectionPriority: 10000
			};
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "timer",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.event,
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawSVG(textfiles["Blocks_test4.svg"], {"elementId": "Ev_TimersUp"});
		},
		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		genCode: function (block) {
			return {
				initCodeExec: [
					A3a.vpl.BlockTemplate.resetTimer
				],
				sectionBegin: "onevent timer0\n",
				sectionPriority: 1000
			};
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "pitch",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.event,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () {
			return [
				0 // integer from -6 to 6
			];
		},
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawSVG(textfiles["Blocks_test4.svg"],
				{
					"elementId": "Ev_Acc0",
					"transform": {
						"Rot180_Acc0": function (ctx) {
							var ox = 50;
							var oy = 50;
							ctx.translate(ox, oy);
							ctx.rotate(block.param[0] * Math.PI / 12);
							ctx.translate(-ox, -oy);
						}
					}
				});
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			if (canvas.accelerometerCheck(width, height, left, top, ev)) {
				block.prepareChange();
				return 1;
			}
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
			var angle = canvas.accelerometerDrag(width, height, left, top, ev);
			block.param[0] = angle;
		},
		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		genCode: function (block) {
			/** @type {number} */
			var a = /** @type {number} */(block.param[1]);
			/** @type {string} */
			var cond;
			if (a <= -6) {
				cond = "pitchAngle < " + Math.round(2730.67 * a + 1365.33);
			} else if (a >= 6) {
				cond = "pitchAngle >= " + Math.round(2730.67 * a - 1365.33);
			} else {
				cond = "pitchAngle >= " + Math.round(2730.67 * a - 1365.33) +
					" and pitchAngle < " + Math.round(2730.67 * a + 1365.33);
			}
			return {
				initVarDecl: [
					"# pitch angle from accelerometer\nvar pitchAngle\n"
				],
				sectionBegin: "onevent acc\n",
				sectionPriority: 1,
				clauseInit:
					"call math.atan2(pitchAngle, acc[0], acc[2])\n",
				clause: cond
			};
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "roll",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.event,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () {
			return [
				0 // integer from -6 to 6
			];
		},
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawSVG(textfiles["Blocks_test4.svg"],
				{
					"elementId": "Ev_Acc1",
					"transform": {
						"Rot180_Acc1": function (ctx) {
							var ox = 50;
							var oy = 50;
							ctx.translate(ox, oy);
							ctx.rotate(block.param[0] * Math.PI / 12);
							ctx.translate(-ox, -oy);
						}
					}
				});
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			if (canvas.accelerometerCheck(width, height, left, top, ev)) {
				block.prepareChange();
				return 1;
			}
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
			var angle = canvas.accelerometerDrag(width, height, left, top, ev);
			block.param[0] = angle;
		},
		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		genCode: function (block) {
			/** @type {number} */
			var a = -/** @type {number} */(block.param[1]);
			/** @type {string} */
			var cond;
			if (a <= -6) {
				cond = "rollAngle < " + Math.round(2730.67 * a + 1365.33);
			} else if (a >= 6) {
				cond = "rollAngle >= " + Math.round(2730.67 * a - 1365.33);
			} else {
				cond = "rollAngle >= " + Math.round(2730.67 * a - 1365.33) +
					" and rollAngle < " + Math.round(2730.67 * a + 1365.33);
			}
			return {
				initVarDecl: [
					"# roll angle from accelerometer\nvar rollAngle\n"
				],
				sectionBegin: "onevent acc\n",
				sectionPriority: 1,
				clauseInit:
					"call math.atan2(rollAngle, acc[1], acc[2])\n",
				clause: cond
			};
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
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawSVG(textfiles["Blocks_test4.svg"],
				{
					"elementId": "Ev_Acc2",
					"transform": {
						"Rot180_Acc2": function (ctx) {
							var ox = 50;
							var oy = 50;
							ctx.translate(ox, oy);
							ctx.rotate(block.param[0] * Math.PI / 12);
							ctx.translate(-ox, -oy);
						}
					}
				});
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			if (canvas.accelerometerCheck(width, height, left, top, ev)) {
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
		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		genCode: function (block) {
			/** @type {number} */
			var a = -/** @type {number} */(block.param[1]);
			/** @type {string} */
			var cond;
			if (a <= -6) {
				cond = "yawAngle < " + Math.round(2730.67 * a + 1365.33);
			} else if (a >= 6) {
				cond = "yawAngle >= " + Math.round(2730.67 * a - 1365.33);
			} else {
				cond = "yawAngle >= " + Math.round(2730.67 * a - 1365.33) +
					" and yawAngle < " + Math.round(2730.67 * a + 1365.33);
			}
			return {
				initVarDecl: [
					"# yaw angle from accelerometer\nvar rollAngle\n"
				],
				sectionBegin: "onevent acc\n",
				sectionPriority: 1,
				clauseInit:
					"call math.atan2(yawAngle, acc[0], acc[1])\n",
				clause: cond
			};
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "state",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.state,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 0, 0, 0, 0, 0, 0, 0]; },
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			/** Button style for drawSVG
				@param {number} p button state (1, 0 or -1)
				@return {string}
			*/
			function style(p) {
				return "" +
					"fill:" + (p > 0 ? "#f66" : p < 0 ? "white" : "#ddd") + ";" +
					"stroke:" + (p > 0 ? "#700" : p < 0 ? "black" : "#aaa");
			}

			canvas.drawSVG(textfiles["Blocks_test4.svg"],
				{
					"elementId": "Ev_States",
					"style": {
						"Btn2_State0": style(block.param[0]),
						"Btn2_State1": style(block.param[1]),
						"Btn2_State2": style(block.param[2]),
						"Btn2_State3": style(block.param[3]),
						"Btn2_State4": style(block.param[4]),
						"Btn2_State5": style(block.param[5]),
						"Btn2_State6": style(block.param[6]),
						"Btn2_State7": style(block.param[7])
					}
				});
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			return canvas.mousedownSVGButton(block, left, top, ev,
				[
					"Btn2_State0",
					"Btn2_State1",
					"Btn2_State2",
					"Btn2_State3",
					"Btn2_State4",
					"Btn2_State5",
					"Btn2_State6",
					"Btn2_State7"
				],
				function (p) { return (p + 2) % 3 - 1; });
		},
		/** @type {A3a.vpl.BlockTemplate.changeModeFun} */
		changeMode: function (block, mode) {
			if (mode === A3a.vpl.mode.basic
				&& block.param[0] === 0
				&& block.param[1] === 0
				&& block.param[2] === 0
				&& block.param[3] === 0
				&& block.param[4] === 0
				&& block.param[5] === 0
				&& block.param[6] === 0
				&& block.param[7] === 0) {
				// no state block in basic mode if empty
				return null;
			}
			return block;
		},
		sectionPriority: function () { return 1; },
		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		genCode: function (block) {
			var cond = "";
			for (var i = 0; i < 8; i++) {
				if (block.param[i]) {
					cond += (cond.length === 0 ? "" : " and ") +
						"state[" + i + "] == " + (block.param[i] > 0 ? "1" : "0");
				}
			}
			return {
				initVarDecl: [
					A3a.vpl.BlockTemplate.initStatesDecl8
				],
				initCodeExec: [
					A3a.vpl.BlockTemplate.initStatesInit8
				],
				clause: cond
			};
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "color state",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.state,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 0, 0]; },
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawSVG(textfiles["Blocks_test4.svg"],
				{
					"elementId": "Ev_Color_Top",
					"style": {
					}
				});
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
		},
		sectionPriority: function () { return 1; },
		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		genCode: function (block) {
			var cond = block.param
				.map(function (p, i) {
					return "topColor[" + i + "] / 11 == " + Math.floor(p * 2.99);
				})
				.join(" and ");
			return {
				initVarDecl: [
					A3a.vpl.BlockTemplate.initTopColorDecl
				],
				initCodeExec: [
					A3a.vpl.BlockTemplate.initTopColorInit
				],
				clause: cond
			};
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "color bottom state",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.state,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 0, 0]; },
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawSVG(textfiles["Blocks_test4.svg"],
				{
					"elementId": "Ev_Color_Bottom",
					"style": {
					}
				});
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
		},
		sectionPriority: function () { return 1; },
		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		genCode: function (block) {
			var cond = block.param
				.map(function (p, i) {
					return "bottomColor[" + i + "] / 11 == " + Math.floor(p * 2.99);
				})
				.join(" and ");
			return {
				initVarDecl: [
					A3a.vpl.BlockTemplate.initTopColorDecl
				],
				initCodeExec: [
					A3a.vpl.BlockTemplate.initTopColorInit
				],
				clause: cond
			};
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "tap",
		modes: [A3a.vpl.mode.basic, A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.event,
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawSVG(textfiles["Blocks_test4.svg"], {"elementId": "Ev_Acc_Hit"});
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
		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		genCode: function (block) {
			return {
				sectionBegin: "onevent tap\n",
				sectionPriority: 1000
			};
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "clap",
		type: A3a.vpl.blockType.event,
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawSVG(textfiles["Blocks_test4.svg"], {"elementId": "Ev_Clap"});
		},
		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		genCode: function (block) {
			return {
				initCodeExec: [
					"# setup threshold for detecting claps\n" +
					"mic.threshold = 250\n"
				],
				sectionBegin: "onevent mic\n",
				sectionPriority: 1,
				clause: "mic.intensity > mic.threshold",
				clauseOptional: true
			};
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "motor",
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 0]; },
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawSVG(textfiles["Blocks_test4.svg"],
				{
					"elementId": "Ac_Wheels",
					"transform": {
						"HandleLeft": function (ctx) {
							ctx.translate(0, -0.4 * canvas.dims.blockSize * block.param[0]);
						},
						"HandleRight": function (ctx) {
							ctx.translate(0, -0.4 * canvas.dims.blockSize * block.param[1]);
						}
					}
				});
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
			return null;
		},
		/** @type {A3a.vpl.BlockTemplate.mousedragFun} */
		mousedrag: function (canvas, block, dragIndex, width, height, left, top, ev) {
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
		},
		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		genCode: function (block) {
			return {
				initCodeExec: [
					A3a.vpl.BlockTemplate.initOutputs
				],
				statement:
					"motor.left.target = " + Math.round(500 * block.param[0]) + "\n" +
					"motor.right.target = " + Math.round(500 * block.param[1]) + "\n"
			};
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
				/** Button style for drawSVG
					@param {Array.<number>} param block state
					@param {number} i
					@return {string}
				*/
				function style(param, i) {
					return "fill:" + (param[0] === i ? "#f33" : "#ddd");
				}

				canvas.drawSVG(textfiles["Blocks_test4.svg"],
					{
						"elementId": "Ac_Directions",
						"style": {
							"Btn2_Stop": style(block.param, 0),
							"Btn2_Fwd": style(block.param, 1),
							"Btn2_FwdRight": style(block.param, 2),
							"Btn2_Right-2": style(block.param, 3),
							"Btn2_BwdRight": style(block.param, 4),
							"Btn2_Bwd": style(block.param, 5),
							"Btn2_BwdLeft": style(block.param, 6),
							"Btn2_Left-2": style(block.param, 7),
							"Btn2_FwdLeft": style(block.param, 8),
						}
					});
			},
			/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
			mousedown: function (canvas, block, width, height, left, top, ev) {
				return canvas.mousedownSVGButton(block, left, top, ev,
					[
						"Btn2_Stop",
						"Btn2_Fwd",
						"Btn2_FwdRight",
						"Btn2_Right-2",
						"Btn2_BwdRight",
						"Btn2_Bwd",
						"Btn2_BwdLeft",
						"Btn2_Left-2",
						"Btn2_FwdLeft"
					],
					null,
					function (i, state) {
						return [i];
					});
			},
			/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
			genCode: function (block) {
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
		};
	})()),
	new A3a.vpl.BlockTemplate({
		name: "top color 8",
		modes: [A3a.vpl.mode.basic, A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 0, 0]; },
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
				canvas.drawSVG(textfiles["Blocks_test4.svg"],
					{
						"elementId": "Ac_ColorTop",
						"style": {
							"Gradient_Top-2": "fill:#" +
								block.param.map(function (c) { return Math.floor(15.999 * c).toString(16); }).join("")
						}
					});
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
				return canvas.mousedownSVGButton(block, left, top, ev,
					[
						"Btn2_NoColor",
						"Btn2_White_Select",
						"Btn2_Red",
						"Btn2_Green",
						"Btn2_Yellow",
						"Btn2_Blue",
						"Btn2_Magenta",
						"Btn2_Cyan"
					],
					null,
					function (i, state) {
						switch (i) {
						case 0:
							return [0, 0, 0];
						case 1:
							return [1, 1, 1];
						case 2:
							return [1, 0, 0];
						case 3:
							return [0, 1, 0];
						case 4:
							return [1, 1, 0];
						case 5:
							return [0, 0, 1];
						case 6:
							return [1, 0, 1];
						case 7:
							return [0, 1, 1];
						}
						return state;
					});
		},
		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		genCode: function (block) {
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
	}),
	new A3a.vpl.BlockTemplate({
		name: "bottom color 8",
		modes: [A3a.vpl.mode.basic, A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [0, 0, 0]; },
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
				canvas.drawSVG(textfiles["Blocks_test4.svg"],
					{
						"elementId": "Ac_ColorBottom",
						"style": {
							"Gradient_Bottom-2": "fill:#" +
								block.param.map(function (c) { return Math.floor(15.999 * c).toString(16); }).join("")
						}
					});
		},
		/** @type {A3a.vpl.BlockTemplate.mousedownFun} */
		mousedown: function (canvas, block, width, height, left, top, ev) {
				return canvas.mousedownSVGButton(block, left, top, ev,
					[
						"Btn2_NoColor-2",
						"Btn2_White_Select-2",
						"Btn2_Red-2",
						"Btn2_Green-2",
						"Btn2_Yellow-2",
						"Btn2_Blue-2",
						"Btn2_Magenta-2",
						"Btn2_Cyan-2"
					],
					null,
					function (i, state) {
						switch (i) {
						case 0:
							return [0, 0, 0];
						case 1:
							return [1, 1, 1];
						case 2:
							return [1, 0, 0];
						case 3:
							return [0, 1, 0];
						case 4:
							return [1, 1, 0];
						case 5:
							return [0, 0, 1];
						case 6:
							return [1, 0, 1];
						case 7:
							return [0, 1, 1];
						}
						return state;
					});
		},
		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		genCode: function (block) {
			return {
				initVarDecl: [
					A3a.vpl.BlockTemplate.initTopColorDecl
				],
				initCodeExec: [
					A3a.vpl.BlockTemplate.initTopColorInit,
					A3a.vpl.BlockTemplate.initOutputs
				],
				statement:
					"call leds.bottom(" +
					block.param.map(function (x) { return Math.round(32 * x); }).join(", ") +
					")\n",
				statementWithoutInit:
					"call leds.bottom(" +
					block.param.map(function (x) { return Math.round(32 * x); }).join(", ") +
					")\n"
			};
		}
	}),
	new A3a.vpl.BlockTemplate({
		name: "set timer",
		modes: [A3a.vpl.mode.advanced],
		type: A3a.vpl.blockType.action,
		/** @type {A3a.vpl.BlockTemplate.defaultParam} */
		defaultParam: function () { return [1]; },
		/** @type {A3a.vpl.BlockTemplate.drawFun} */
		draw: function (canvas, block) {
			canvas.drawSVG(textfiles["Blocks_test4.svg"], {"elementId": "Ac_Timer"});
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
		/** @type {A3a.vpl.BlockTemplate.genCodeFun} */
		genCode: function (block) {
			return {
				initCodeExec: [
					A3a.vpl.BlockTemplate.resetTimer
				],
				statement: "timer.period[0] = " + Math.round(1000 * block.param[0]) + "\n"
			};
		}
	}),
];

/**
	@const
	@type {Array.<string>}
*/
A3a.vpl.BlockTemplate.libRemoveSVG = [
	"horiz prox adv",
	"ground adv",
	"accelerometer",
	"counter comparison",
	"top color",
	"bottom color",
	"notes",
	"set state",
	"set counter",
	"set timer",
	"set timer log",
	"picture comment"
];

/** Replace blocks defined in A3a.vpl.BlockTemplate.libSVG
	@return {void}
*/
A3a.vpl.patchSVG = function () {
	for (var i = 0; i < A3a.vpl.BlockTemplate.libSVG.length; i++) {
		var name = A3a.vpl.BlockTemplate.libSVG[i].name;
		var j = 0;
		while (j < A3a.vpl.BlockTemplate.lib.length &&
			A3a.vpl.BlockTemplate.lib[j].name !== name) {
			j++;
		}
		A3a.vpl.BlockTemplate.lib[j] = A3a.vpl.BlockTemplate.libSVG[i];
	}

	for (var i = 0; i < A3a.vpl.BlockTemplate.lib.length; ) {
		if (A3a.vpl.BlockTemplate.libRemoveSVG.indexOf(A3a.vpl.BlockTemplate.lib[i].name) >= 0) {
			A3a.vpl.BlockTemplate.lib.splice(i, 1);
		} else {
			i++;
		}
	}

	A3a.vpl.Canvas.calcDims = function (blockSize, controlSize) {
		return {
			blockSize: blockSize,
			blockLineWidth: Math.max(1, Math.min(3, blockSize / 40)),
			thinLineWidth: 1,
			blockFont: Math.round(blockSize / 4).toString(10) + "px sans-serif",
			blockLargeFont: Math.round(blockSize / 3).toString(10) + "px sans-serif",
			templateScale: Math.max(0.666, 32 / blockSize),
			margin: Math.min(Math.round(blockSize / 4), 20),
			interRowSpace: Math.round(blockSize / 2),
			interEventActionSpace: blockSize / 2,
			interBlockSpace: Math.round(blockSize / 6),
			controlSize: controlSize,
			controlFont: "bold 15px sans-serif",
			topControlSpace: 2 * controlSize,
			stripHorMargin: Math.min(Math.max(blockSize / 15, 2), 6),
			stripVertMargin: Math.min(Math.max(blockSize / 15, 2), 6),
			eventStyle: "#ff6e40",
			stateStyle: "#ff6e40",
			actionStyle: "#38f",
			commentStyle: "#aaa"
		};
	};
};
