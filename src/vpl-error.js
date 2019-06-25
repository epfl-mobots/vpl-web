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

Implementation of class A3a.vpl.Error, which describes a VPL3 error or warning.

*/

/** Error
	@constructor
	@struct
	@param {string} msg
	@param {boolean=} isWarning
*/
A3a.vpl.Error = function (msg, isWarning) {
	this.msg = msg;
	/** @type {boolean} */
	this.isWarning = isWarning || false;
	this.eventError = false;
	this.eventErrorIndices = [];
	this.actionErrorIndices = [];
	/** @type {A3a.vpl.Rule} */
	this.conflictEventHandler = null;
};

/** Specify that the event (and state) is the cause of the error
	@param {Array.<number>} eventIndices index of events causing the error, or
	empty for all
	@return {void}
*/
A3a.vpl.Error.prototype.addEventError = function (eventIndices) {
	this.eventError = true;
	this.eventErrorIndices = eventIndices;
};

/** Specify that the event (and state) is the cause of a conflict error
	@param {A3a.vpl.Rule} conflictEventHandler other event handler which conflicts
	@return {void}
*/
A3a.vpl.Error.prototype.addEventConflictError = function (conflictEventHandler) {
	this.eventError = true;
	this.conflictEventHandler = conflictEventHandler;
};

/** Add index of the action causing the error (can be called multiple times)
	@param {number} i
	@return {void}
*/
A3a.vpl.Error.prototype.addActionError = function (i) {
	this.actionErrorIndices.push(i);
};
