/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Definition of class A3a.vpl.Undo which implements generic support for
multi-level undo/redo.

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
	this.maxDepth = 20;
};

/** User state with boolean to mark a single state in the undo stacks
	@constructor
	@param {Object} state user state
	@param {Object=} marks
*/
A3a.vpl.Undo.MarkedState = function (state, marks) {
	this.state = state;
	this.marks = marks || {};
};

/** Reset undo
	@return {void}
*/
A3a.vpl.Undo.prototype.reset = function () {
	this.undoStack = [];
	this.redoStack = [];
};

/** Clear marks in the whole undo and redo stacks
	@param {Object=} marks marks to clear (default: all)
	@return {void}
*/
A3a.vpl.Undo.prototype.clearMarks = function (marks) {

	/** Clear specified markedState in a state
		@param {A3a.vpl.Undo.MarkedState} markedState
		@return {void}
	*/
	function clearMarksInState(markedState) {
		if (marks) {
			if (markedState.marks) {
				for (var key in markedState.marks) {
					if (markedState.marks.hasOwnProperty(key) && marks[key]) {
						markedState.marks[key] = false;
					}
				}
			}
		} else {
			markedState.marks = {};
		}
	}

	this.undoStack.forEach(clearMarksInState);
	this.redoStack.forEach(clearMarksInState);
};

/** Save current state before modifying it
	@param {Object} state
	@param {Object=} marks
	@return {void}
*/
A3a.vpl.Undo.prototype.saveStateBeforeChange = function (state, marks) {
	if (marks) {
		this.clearMarks(marks);
	}
	this.undoStack.push(new A3a.vpl.Undo.MarkedState(state, marks));
	if (this.undoStack.length > this.maxDepth) {
		this.undoStack = this.undoStack.slice(-this.maxDepth);
	}
	this.redoStack = [];
};

/** Undo last change, saving current state and retrieving previous one
	@param {Object} state current state
	@param {Object=} marks
	@return {A3a.vpl.Undo.MarkedState} previous marked state
*/
A3a.vpl.Undo.prototype.undo = function (state, marks) {
	if (marks) {
		this.clearMarks(marks);
	}
	if (this.undoStack.length > 0) {
		this.redoStack.push(new A3a.vpl.Undo.MarkedState(state, marks));
		return this.undoStack.pop();
	} else {
		return new A3a.vpl.Undo.MarkedState(state, marks);
	}
};

/** Redo last undone change, saving current state and retrieving next one
	@param {Object} state current state
	@param {Object=} marks
	@return {A3a.vpl.Undo.MarkedState} next marked state
*/
A3a.vpl.Undo.prototype.redo = function (state, marks) {
	if (marks) {
		this.clearMarks(marks);
	}
	if (this.redoStack.length > 0) {
		this.undoStack.push(new A3a.vpl.Undo.MarkedState(state, marks));
		return this.redoStack.pop();
	} else {
		return new A3a.vpl.Undo.MarkedState(state, marks);
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
