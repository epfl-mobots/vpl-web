/*
	Copyright 2018-2021 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Definition of class A3a.vpl.Block, instances of VPL blocks in a program
based on the block definiton in A3a.vpl.BlockTemplate.

*/

/**
	@constructor
	@struct
	@param {A3a.vpl.BlockTemplate} blockTemplate
	@param {A3a.vpl.Rule} ruleContainer
	@param {?A3a.vpl.positionInContainer} positionInContainer
*/
A3a.vpl.Block = function (blockTemplate, ruleContainer, positionInContainer) {
	this.blockTemplate = blockTemplate;
	this.ruleContainer = ruleContainer;
	this.positionInContainer = positionInContainer;
	this.disabled = false;
	this.locked = false;
	/** @type {Object.<?,?>} */
	this.marks = {};
	/** @type {A3a.vpl.BlockTemplate.param} */
	this.param = blockTemplate.defaultParam ? blockTemplate.defaultParam() : null;
	/** @type {?function():void} */
	this.onPrepareChange = null;
	/** @type {?function():void} */
	this.onChanged = null;
	/** @type {?number} */
	this.dragging = null;	// dragged data during a mouse drag inside the block
};

/**
	@typedef {{
		eventSide: boolean,
		index: number
	}}
*/
A3a.vpl.positionInContainer;

/** Make a copy of this
	@param {A3a.vpl.Rule} ruleContainer
	@param {?A3a.vpl.positionInContainer} positionInContainer
	@param {?function():void} onPrepareChange
	@param {?function():void} onChanged
	@return {A3a.vpl.Block}
*/
A3a.vpl.Block.prototype.copy = function (ruleContainer, positionInContainer, onPrepareChange, onChanged) {
	var newBlock = new A3a.vpl.Block(this.blockTemplate,
		ruleContainer, positionInContainer);
	newBlock.disabled = this.disabled;
	newBlock.onPrepareChange = onPrepareChange;
	newBlock.onChanged = onChanged;
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
A3a.vpl.Block.prototype.beginChange = function () {
	this.onPrepareChange && this.onPrepareChange();
};

/** Call onChanged callback if it exists
	(no need to match beginChange)
	@return {void}
*/
A3a.vpl.Block.prototype.endChange = function () {
	this.onChanged && this.onChanged();
};

/** Compiled code fragments
	@typedef {{
		initVarDecl: (Array.<string>|undefined),
		initCodeDecl: (Array.<string>|undefined),
		initCodeExec: (Array.<string>|undefined),
		sectionBegin: (string|undefined),
		sectionEnd: (string|undefined),
		sectionPreamble: (string|undefined),
		auxSectionBegin: (Array.<string>|undefined),
		auxSectionEnd: (Array.<string>|undefined),
		auxSectionPreamble: (Array.<string>|undefined),
		clauseInit: (string|undefined),
		clause: (string|undefined),
		clauseOptional: (boolean|undefined),
		clauseAsCondition: (string|undefined),
		auxClausesInit: (Array.<string>|undefined),
		auxClauses: (string|undefined),
		statement: (string|undefined),
		error: (A3a.vpl.Error|undefined)
	}}
*/
A3a.vpl.compiledCode;

/** Generate code
	@param {string} language
	@param {A3a.vpl.Program} program
	@return {A3a.vpl.compiledCode}
*/
A3a.vpl.Block.prototype.generateCode = function (language, program) {
	return this.disabled
		? {}
		: this.blockTemplate.genCode[language]
			? this.blockTemplate.genCode[language](this, program)
			: A3a.vpl.Program.codeGenerator[language].generateMissingCodeForBlock(this, program);
};
