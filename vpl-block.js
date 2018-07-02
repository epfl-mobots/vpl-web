/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/**
	@constructor
	@struct
	@param {epfl.mobots.vpl.BlockTemplate} blockTemplate
	@param {epfl.mobots.vpl.EventHandler} eventHandlerContainer
	@param {?epfl.mobots.vpl.positionInContainer} positionInContainer
*/
epfl.mobots.vpl.Block = function (blockTemplate, eventHandlerContainer, positionInContainer) {
	this.blockTemplate = blockTemplate;
	this.eventHandlerContainer = eventHandlerContainer;
	this.positionInContainer = positionInContainer;
	/** @type {epfl.mobots.vpl.BlockTemplate.param} */
	this.param = blockTemplate.defaultParam ? blockTemplate.defaultParam() : null;
	/** @type {?function():void} */
	this.onPrepareChange = null;
	/** @type {?number} */
	this.dragging = null;	// dragged data during a mouse drag inside the block
};

/**
	@typedef {{
		eventSide: boolean,
		index: number
	}}
*/
epfl.mobots.vpl.positionInContainer;

/** Make a copy of this
	@param {epfl.mobots.vpl.EventHandler} eventHandlerContainer
	@param {?epfl.mobots.vpl.positionInContainer} positionInContainer
	@param {?function():void} onPrepareChange
	@return {epfl.mobots.vpl.Block}
*/
epfl.mobots.vpl.Block.prototype.copy = function (eventHandlerContainer, positionInContainer, onPrepareChange) {
	var newBlock = new epfl.mobots.vpl.Block(this.blockTemplate,
		eventHandlerContainer, positionInContainer);
	newBlock.onPrepareChange = onPrepareChange;
	if (this.param) {
		var newParam = /*this.blockTemplate.exportParam
			? this.blockTemplate.exportParam(this)
			:*/ this.param.slice();
		newBlock.param = newParam;
	}
	return newBlock;
};

/** Call onPrepareChange callback if it exists
	@return {void}
*/
epfl.mobots.vpl.Block.prototype.prepareChange = function () {
	this.onPrepareChange && this.onPrepareChange();
};

/** Compiled code fragments
	@typedef {{
		initVarDecl: (Array.<string>|undefined),
		initCodeDecl: (Array.<string>|undefined),
		initCodeExec: (Array.<string>|undefined),
		sectionBegin: (string|undefined),
		sectionEnd: (string|undefined),
		sectionPriority: (number|undefined),
		clauseInit: (string|undefined),
		clause: (string|undefined),
		clauseOptional: (boolean|undefined),
		statement: (string|undefined),
		error: (epfl.mobots.vpl.Error|undefined)
	}}
*/
epfl.mobots.vpl.compiledCode;

/** Generate code
	@return {epfl.mobots.vpl.compiledCode}
*/
epfl.mobots.vpl.Block.prototype.generateCode = function () {
	return this.blockTemplate.genCode(this);
};
