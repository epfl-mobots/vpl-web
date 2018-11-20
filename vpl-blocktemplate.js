/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
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
	this.draw = blockParams.draw || function (canvas, block) {
		canvas.text(block.blockTemplate.name);
	};
	/** @type {A3a.vpl.BlockTemplate.mousedownFun|null} */
	this.mousedown = blockParams.mousedown || null;
	/** @type {A3a.vpl.BlockTemplate.mousedragFun|null} */
	this.mousedrag = blockParams.mousedrag || null;
	/** @type {A3a.vpl.BlockTemplate.changeModeFun|null} */
	this.changeMode = blockParams.changeMode || null;
};

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
	@typedef {function(A3a.vpl.Block):A3a.vpl.compiledCode}
*/
A3a.vpl.BlockTemplate.genCodeFun;

/**
	@typedef {function(A3a.vpl.Canvas,A3a.vpl.Block):void}
*/
A3a.vpl.BlockTemplate.drawFun;

/**
	@typedef {function(A3a.vpl.Canvas,A3a.vpl.Block,number,number,number,number,Event):?number}
*/
A3a.vpl.BlockTemplate.mousedownFun;

/**
	@typedef {function(A3a.vpl.Canvas,A3a.vpl.Block,number,number,number,number,number,Event):void}
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
		modes: (Array.<A3a.vpl.mode>|undefined),
		noState: (boolean|undefined),
		defaultParam: (A3a.vpl.BlockTemplate.defaultParam|undefined),
		exportParam: (A3a.vpl.BlockTemplate.exportParam|undefined),
		validate: (A3a.vpl.BlockTemplate.validateFun|undefined),
		genCode: (Object<string,A3a.vpl.BlockTemplate.genCodeFun>|undefined),
		draw: (A3a.vpl.BlockTemplate.drawFun|undefined),
		mousedown: (A3a.vpl.BlockTemplate.mousedownFun|undefined),
		mousedrag: (A3a.vpl.BlockTemplate.mousedragFun|undefined),
		changeMode: (A3a.vpl.BlockTemplate.changeModeFun|undefined),
		sectionPriority: (A3a.vpl.BlockTemplate.sectionPriFun|undefined)
	}}
*/
A3a.vpl.BlockTemplate.params;

/** Render block on a canvas
	@param {A3a.vpl.Canvas} canvas
	@param {A3a.vpl.Block} block
	@param {number} x0 position of left side
	@param {number} y0 position of top side
	@param {boolean} doesZoomOnLongPress true to display hint that a long
	press is needed to zoom the block before control widgets can be manipulated
	@return {void}
*/
A3a.vpl.BlockTemplate.prototype.renderToCanvas = function (canvas, block, x0, y0, doesZoomOnLongPress) {
	canvas.ctx.save();
	canvas.ctx.translate(x0, y0);
	canvas.blockBackground(this.type, doesZoomOnLongPress);
	this.draw(canvas, block);
	canvas.ctx.restore();
};

/** Substitute inline expressions `expr` in input string, where expr is a
	JavaScript expression; variable $ contains the block parameters
	@param {string} fmt
	@param {A3a.vpl.Block} block
	@param {number=} i parameter index in clauseAnd fragments
	@return {string}
*/
A3a.vpl.BlockTemplate.substInline = function (fmt, block, i) {
	while (true) {
		var r = /`([^`]*)`/.exec(fmt);
		if (r == null) {
			break;
		}
		var result = new Function("$", "i", "return " + r[1] + ";")(block.param, i);
		fmt = fmt.slice(0, r.index) + result + fmt.slice(r.index + r[0].length);
	}
	return fmt;
};
