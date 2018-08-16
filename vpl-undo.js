/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/**
	@constructor
	@struct
*/
A3a.vpl.Undo = function () {
	/** @type {Array.<A3a.vpl.Undo.MarkedState>} */
	this.undoStack = [];
	/** @type {Array.<A3a.vpl.Undo.MarkedState>} */
	this.redoStack = [];
};

/** User state with boolean to mark a single state in the undo stacks
	@constructor
	@param {Object} state user state
	@param {boolean=} mark
*/
A3a.vpl.Undo.MarkedState = function (state, mark) {
	this.state = state;
	this.mark = mark || false;
};

/** Reset undo
	@return {void}
*/
A3a.vpl.Undo.prototype.reset = function () {
	this.undoStack = [];
	this.redoStack = [];
};

/** Clear mark in the whole undo and redo stacks
	@return {void}
*/
A3a.vpl.Undo.prototype.clearMark = function () {
	this.undoStack.forEach(function (markedState) {
		markedState.mark = false;
	});
	this.redoStack.forEach(function (markedState) {
		markedState.mark = false;
	});
};

/** Save current state before modifying it
	@param {Object} state
	@param {boolean=} mark
	@return {void}
*/
A3a.vpl.Undo.prototype.saveStateBeforeChange = function (state, mark) {
	if (mark) {
		this.clearMark();
	}
	this.undoStack.push(new A3a.vpl.Undo.MarkedState(state, mark));
	this.redoStack = [];
};

/** Undo last change, saving current state and retrieving previous one
	@param {Object} state current state
	@param {boolean=} mark
	@return {A3a.vpl.Undo.MarkedState} previous marked state
*/
A3a.vpl.Undo.prototype.undo = function (state, mark) {
	if (mark) {
		this.clearMark();
	}
	if (this.undoStack.length > 0) {
		this.redoStack.push(new A3a.vpl.Undo.MarkedState(state, mark));
		return this.undoStack.pop();
	} else {
		return new A3a.vpl.Undo.MarkedState(state, mark);
	}
};

/** Redo last undone change, saving current state and retrieving next one
	@param {Object} state current state
	@param {boolean=} mark
	@return {A3a.vpl.Undo.MarkedState} next marked state
*/
A3a.vpl.Undo.prototype.redo = function (state, mark) {
	if (mark) {
		this.clearMark();
	}
	if (this.redoStack.length > 0) {
		this.undoStack.push(new A3a.vpl.Undo.MarkedState(state, mark));
		return this.redoStack.pop();
	} else {
		return new A3a.vpl.Undo.MarkedState(state, mark);
	}
};

/** Check if undo is possible
	@return {boolean}
*/
A3a.vpl.Undo.prototype.canUndo = function () {
	return this.undoStack.length > 0;
};

/** Check if redo is possible
	@return {boolean}
*/
A3a.vpl.Undo.prototype.canRedo = function () {
	return this.redoStack.length > 0;
};
