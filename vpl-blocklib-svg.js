/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

A3a.vpl.BlockTemplate.svgDict = {};

/** Draw svg
	@param {string} svgSrc
	@param {SVG.Options=} options
	@return {void}
*/
A3a.vpl.Canvas.prototype.drawSVG = function (svgSrc, options) {
	this.ctx.save();
	var sc = this.dims.blockSize / 85;
	var o = -5.5 * sc;
	this.ctx.translate(o, o);
	// this.ctx.fillRect(0, 0, this.dims.blockSize, this.dims.blockSize);
	this.ctx.scale(sc, sc);
	SVG.draw(svgSrc, this.ctx, options);
	this.ctx.restore();
};

/**
	@const
	@type {Array.<A3a.vpl.BlockTemplate>}
*/
A3a.vpl.BlockTemplate.libSVG =	[
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
		/**
			@const
			@type {Array.<number>}
		*/
		var order = [2, 1, 3, 0, 4, 5, 6];
		return {
			name: "horiz prox",
			modes: [A3a.vpl.mode.basic],
			type: A3a.vpl.blockType.event,
			/** @type {A3a.vpl.BlockTemplate.defaultParam} */
			defaultParam: function () { return [0, 0, 0, 0, 0, 0, 0]; },
			/** @type {A3a.vpl.BlockTemplate.drawFun} */
			draw: function (canvas, block) {
				// canvas.drawSVGFromURI("svg/Th_Top_Big_NoWheels.svg");
				canvas.drawSVG(textfiles["svg/Th_Top_Big_NoWheels.svg"]);
				for (var i = 0; i < 7; i++) {
					var fill = block.param[i] > 0 ? "black" : block.param[i] < 0 ? "red" : "white";
					var stroke = block.param[i] != 0 ? "black" : "silver";
					canvas.drawSVG(textfiles["svg/ProxH_" + order[i] + "_red.svg"],
						{"fill": fill, "stroke": stroke});
				}
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
							"prox.horizontal[" + buttons[i].str + "] " +
							(block.param[i] > 0 ? ">= 2" : "<= 1") + "000";
					}
				}
				if (cond === "") {
					for (var i = 1; i < 7; i++) {
						cond += " or prox.horizontal[" + buttons[i] + "] >= 2000";
					}
					cond = cond.slice(4);	// crop initial " or "
				}
				return {
					sectionBegin: "onevent prox\n",
					sectionPriority: 1,
					clause: cond
				};
			}
		};
	})())
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
