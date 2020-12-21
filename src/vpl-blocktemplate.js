/*
	Copyright 2018-2020 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Implementation of class A3a.vpl.BlockTemplate and auxiliary types,
which describes the different types of blocks.

*/

/** @enum {string} */
A3a.vpl.blockType = {
	event: "e",
	action: "a",
	state: "s",
	comment: "c",
	hidden: "h",
	undef: "?"
};

/** @enum {string} */
A3a.vpl.mode = {
	basic: "b",
	advanced: "a",
	custom: "c"
};

/** @const */
A3a.vpl.defaultLanguage = "aseba";

/**
	@constructor
	@struct
	@param {A3a.vpl.BlockTemplate.params} blockParams
*/
A3a.vpl.BlockTemplate = function (blockParams) {
	this.name = blockParams.name;
	this.type = blockParams.type;
	this.modes = blockParams.modes
		|| [A3a.vpl.mode.basic, A3a.vpl.mode.advanced];
	this.noState = blockParams.noState || false;
	this.defaultParam = blockParams.defaultParam || null;
	this.typicalParam = blockParams.typicalParam || null;
	this.typicalParamSet = blockParams.typicalParamSet || null;
	this.paramAccessibility = blockParams.paramAccessibility;
	this.exportParam = blockParams.exportParam || null;
	this.importParam = blockParams.importParam || null;
	this.validate = blockParams.validate || null;
 	this.genCode = blockParams.genCode
		|| {
			"aseba": this.type === A3a.vpl.blockType.event
				? function (block) {
					return {
						begin: "# onevent " + block.blockTemplate.name + "\n"
					};
				}
				: function (block) {
					return {
						statement: "# " + block.blockTemplate.name + "\n"
					};
				}
		};
	/** @type {A3a.vpl.BlockTemplate.drawFun} */
	this.draw = blockParams.draw || function (canvas, block, box, isZoomed) {
		canvas.text(block.blockTemplate.name);
	};
	/** @type {boolean} */
	this.alwaysZoom = blockParams.alwaysZoom || false;
	/** @type {A3a.vpl.BlockTemplate.mousedownFun|null} */
	this.mousedown = blockParams.mousedown || null;
	/** @type {A3a.vpl.BlockTemplate.mousedragFun|null} */
	this.mousedrag = blockParams.mousedrag || null;
	/** @type {A3a.vpl.BlockTemplate.changeModeFun|null} */
	this.changeMode = blockParams.changeMode || null;
};

/**
	@typedef {{
		aeslName: string,
		condition: ?string,
		blockName: string,
		parameters:?string,
		stringParam: boolean
	}}
*/
A3a.vpl.BlockTemplate.aeslImportRule;

/**
	@type {Array.<A3a.vpl.BlockTemplate.aeslImportRule>}
*/
A3a.vpl.BlockTemplate.aeslImportRules = [];

/**
	@typedef {(Array|null)}
*/
A3a.vpl.BlockTemplate.param;

/**
	@typedef {function():A3a.vpl.BlockTemplate.param}
*/
A3a.vpl.BlockTemplate.defaultParam;

/**
	@typedef {function(A3a.vpl.Block):A3a.vpl.BlockTemplate.param}
*/
A3a.vpl.BlockTemplate.exportParam;

/**
	@typedef {function(A3a.vpl.Block,A3a.vpl.BlockTemplate.param,function():void=):void}
*/
A3a.vpl.BlockTemplate.importParam;

/**
	@typedef {function(A3a.vpl.Block):?A3a.vpl.Error}
*/
A3a.vpl.BlockTemplate.validateFun;

/**
	@typedef {function(?A3a.vpl.Block,?A3a.vpl.Program):A3a.vpl.compiledCode}
*/
A3a.vpl.BlockTemplate.genCodeFun;

/**
	@typedef {function(A3a.vpl.Canvas,A3a.vpl.Block,CSSParser.VPL.Box,(boolean|undefined)):void}
*/
A3a.vpl.BlockTemplate.drawFun;

/**
	@typedef {function(A3a.vpl.Canvas,A3a.vpl.Block,number,number,number,number,A3a.vpl.CanvasItem.mouseEvent):?number}
*/
A3a.vpl.BlockTemplate.mousedownFun;

/**
	@typedef {function(A3a.vpl.Canvas,A3a.vpl.Block,number,number,number,number,number,A3a.vpl.CanvasItem.mouseEvent):void}
*/
A3a.vpl.BlockTemplate.mousedragFun;

/**
	@typedef {function(A3a.vpl.Block,A3a.vpl.mode):A3a.vpl.Block}
*/
A3a.vpl.BlockTemplate.changeModeFun;

/**
	@typedef {function(A3a.vpl.Block):number}
*/
A3a.vpl.BlockTemplate.sectionPriFun;

/**
	@typedef {{
		name: string,
		type: A3a.vpl.blockType,
		modes: (Array.<A3a.vpl.mode> | undefined),
		noState: (boolean | undefined),
		defaultParam: (A3a.vpl.BlockTemplate.defaultParam | null | undefined),
		typicalParam: (A3a.vpl.BlockTemplate.defaultParam | null | undefined),
		typicalParamSet: (Array.<A3a.vpl.BlockTemplate.param> | undefined),
		paramAccessibility: (A3a.vpl.BlockParamAccessibility | null | undefined),
		exportParam: (A3a.vpl.BlockTemplate.exportParam | null | undefined),
		validate: (A3a.vpl.BlockTemplate.validateFun | null | undefined),
		genCode: (Object<string,A3a.vpl.BlockTemplate.genCodeFun> | null | undefined),
		draw: (A3a.vpl.BlockTemplate.drawFun | null | undefined),
		alwaysZoom: (boolean | undefined),
		mousedown: (A3a.vpl.BlockTemplate.mousedownFun | null | undefined),
		mousedrag: (A3a.vpl.BlockTemplate.mousedragFun | null | undefined),
		changeMode: (A3a.vpl.BlockTemplate.changeModeFun | null | undefined),
		sectionPriority: (A3a.vpl.BlockTemplate.sectionPriFun | undefined)
	}}
*/
A3a.vpl.BlockTemplate.params;

/** Render block on a canvas
	@param {A3a.vpl.Canvas} canvas
	@param {A3a.vpl.Block} block
	@param {CSSParser.VPL.Box} box
	@param {number} x0 position of left side
	@param {number} y0 position of top side
	@param {(boolean | undefined)} isZoomed
	@return {void}
*/
A3a.vpl.BlockTemplate.prototype.renderToCanvas = function (canvas, block, box, x0, y0, isZoomed) {
	canvas.ctx.save();
	canvas.ctx.translate(x0, y0);
	this.draw(canvas, block, box, isZoomed);
	canvas.ctx.restore();
};

/** Substitute inline expressions `expr` in input string, where expr is a
	JavaScript expression; variable $ contains params, typically the block parameters
	@param {string} fmt
	@param {Array} params
	@param {{i:number,slowdown:number}=} options i=parameter index in clauseAnd fragments,
	slowdown=factor applied to slow down the execution (1 for normal speed, <1 for
	slowdown, >1 for speedup)
	@param {boolean=} keepResult true to return last result instead of string
	@return {*}
*/
A3a.vpl.BlockTemplate.substInline = function (fmt, params, options, keepResult) {
	/** @type {*} */
	var result = null;
	options = options || {i: 0, slowdown: 1};
	while (true) {
		var r = /`([^`]*)`/.exec(fmt);
		if (r == null) {
			break;
		}
		result = new Function("$", "i", "slowdown", "rgb", "toFixed",
			"return " + r[1] + ";"
		)(
			params,
			options.i,
			options.slowdown,
			function (rgb) {
				rgb = [
					rgb[0],
					Math.max(0.2 + 0.8 * rgb[1], rgb[2] / 2),
					rgb[2]
				];
				var max = Math.max(rgb[0], Math.max(rgb[1], rgb[2]));
				return rgb.map(function (x) {
					return 0.88 * (1 - max) + (0.12 + 0.88 * max) * x;
				});
			},
			function (x, nDigits) {
				return parseFloat(x.toFixed(nDigits === undefined ? 2 : nDigits)).toString();
			}
		);
		fmt = fmt.slice(0, r.index) + result + fmt.slice(r.index + r[0].length);
	}
	return keepResult ? result : fmt;
};
