/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Error
	@constructor
	@struct
	@param {string} msg
*/
epfl.mobots.vpl.Error = function (msg) {
	this.msg = msg;
	this.eventError = false;
	this.eventErrorIndices = [];
	this.actionErrorIndices = [];
	/** @type {epfl.mobots.vpl.EventHandler} */
	this.conflictEventHandler = null;
};

/** Specify that the event (and state) is the cause of the error
	@param {Array.<number>} eventIndices index of events causing the error, or
	empty for all
	@return {void}
*/
epfl.mobots.vpl.Error.prototype.addEventError = function (eventIndices) {
	this.eventError = true;
	this.eventErrorIndices = eventIndices;
};

/** Specify that the event (and state) is the cause of a conflict error
	@param {epfl.mobots.vpl.EventHandler} conflictEventHandler other event handler which conflicts
	@return {void}
*/
epfl.mobots.vpl.Error.prototype.addEventConflictError = function (conflictEventHandler) {
	this.eventError = true;
	this.conflictEventHandler = conflictEventHandler;
};

/** Add index of the action causing the error (can be called multiple times)
	@param {number} i
	@return {void}
*/
epfl.mobots.vpl.Error.prototype.addActionError = function (i) {
	this.actionErrorIndices.push(i);
};
