/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** @enum {string} */
epfl.mobots.vpl.blockType = {
	event: "e",
	action: "a",
	state: "s",
	comment: "c"
};

/** @enum {string} */
epfl.mobots.vpl.mode = {
	basic: "b",
	advanced: "a",
	custom: "c"
};

/**
	@constructor
	@struct
	@param {epfl.mobots.vpl.BlockTemplate.params} blockParams
*/
epfl.mobots.vpl.BlockTemplate = function (blockParams) {
	this.name = blockParams.name;
	this.type = blockParams.type;
	this.modes = blockParams.modes
		|| [epfl.mobots.vpl.mode.basic, epfl.mobots.vpl.mode.advanced];
	this.noState = blockParams.noState || false;
	this.defaultParam = blockParams.defaultParam || null;
	this.exportParam = blockParams.exportParam || null;
	this.importParam = blockParams.importParam || null;
	this.validate = blockParams.validate || null;
	/** @type {epfl.mobots.vpl.BlockTemplate.genCodeFun} */
	this.genCode = blockParams.genCode
		|| (this.type === epfl.mobots.vpl.blockType.event
			? function (block) {
				return {
					begin: "# onevent " + block.blockTemplate.name + "\n"
				};
			}
			: function (block) {
				return {
					statement: "# " + block.blockTemplate.name + "\n"
				};
			});
	/** @type {epfl.mobots.vpl.BlockTemplate.drawFun} */
	this.draw = blockParams.draw || function (canvas, block) {
		canvas.text(block.blockTemplate.name);
	};
	/** @type {epfl.mobots.vpl.BlockTemplate.mousedownFun|null} */
	this.mousedown = blockParams.mousedown || null;
	/** @type {epfl.mobots.vpl.BlockTemplate.mousedragFun|null} */
	this.mousedrag = blockParams.mousedrag || null;
	/** @type {epfl.mobots.vpl.BlockTemplate.changeModeFun|null} */
	this.changeMode = blockParams.changeMode || null;
};

/**
	@typedef {(Array|null)}
*/
epfl.mobots.vpl.BlockTemplate.param;

/**
	@typedef {function():epfl.mobots.vpl.BlockTemplate.param}
*/
epfl.mobots.vpl.BlockTemplate.defaultParam;

/**
	@typedef {function(epfl.mobots.vpl.Block):epfl.mobots.vpl.BlockTemplate.param}
*/
epfl.mobots.vpl.BlockTemplate.exportParam;

/**
	@typedef {function(epfl.mobots.vpl.Block,epfl.mobots.vpl.BlockTemplate.param,function():void=):void}
*/
epfl.mobots.vpl.BlockTemplate.importParam;

/**
	@typedef {function(epfl.mobots.vpl.Block):?epfl.mobots.vpl.Error}
*/
epfl.mobots.vpl.BlockTemplate.validateFun;

/**
	@typedef {function(epfl.mobots.vpl.Block):epfl.mobots.vpl.compiledCode}
*/
epfl.mobots.vpl.BlockTemplate.genCodeFun;

/**
	@typedef {function(epfl.mobots.vpl.Canvas,epfl.mobots.vpl.Block):void}
*/
epfl.mobots.vpl.BlockTemplate.drawFun;

/**
	@typedef {function(epfl.mobots.vpl.Canvas,epfl.mobots.vpl.Block,number,number,number,number,Event):?number}
*/
epfl.mobots.vpl.BlockTemplate.mousedownFun;

/**
	@typedef {function(epfl.mobots.vpl.Canvas,epfl.mobots.vpl.Block,number,number,number,number,number,Event):void}
*/
epfl.mobots.vpl.BlockTemplate.mousedragFun;

/**
	@typedef {function(epfl.mobots.vpl.Block,epfl.mobots.vpl.mode):epfl.mobots.vpl.Block}
*/
epfl.mobots.vpl.BlockTemplate.changeModeFun;

/**
	@typedef {function(epfl.mobots.vpl.Block):number}
*/
epfl.mobots.vpl.BlockTemplate.sectionPriFun;

/**
	@typedef {{
		name: string,
		type: epfl.mobots.vpl.blockType,
		modes: (Array.<epfl.mobots.vpl.mode>|undefined),
		noState: (boolean|undefined),
		defaultParam: (epfl.mobots.vpl.BlockTemplate.defaultParam|undefined),
		exportParam: (epfl.mobots.vpl.BlockTemplate.exportParam|undefined),
		validate: (epfl.mobots.vpl.BlockTemplate.validateFun|undefined),
		genCode: (epfl.mobots.vpl.BlockTemplate.genCodeFun|undefined),
		draw: (epfl.mobots.vpl.BlockTemplate.drawFun|undefined),
		mousedown: (epfl.mobots.vpl.BlockTemplate.mousedownFun|undefined),
		mousedrag: (epfl.mobots.vpl.BlockTemplate.mousedragFun|undefined),
		changeMode: (epfl.mobots.vpl.BlockTemplate.changeModeFun|undefined),
		sectionPriority: (epfl.mobots.vpl.BlockTemplate.sectionPriFun|undefined)
	}}
*/
epfl.mobots.vpl.BlockTemplate.params;

/** Render block on a canvas
	@param {epfl.mobots.vpl.Canvas} canvas
	@param {epfl.mobots.vpl.Block} block
	@param {number} x0 position of left side
	@param {number} y0 position of top side
	@return {void}
*/
epfl.mobots.vpl.BlockTemplate.prototype.renderToCanvas = function (canvas, block, x0, y0) {
	canvas.ctx.save();
	canvas.ctx.translate(x0, y0);
	canvas.blockBackground(this.type);
	this.draw(canvas, block);
	canvas.ctx.restore();
};
