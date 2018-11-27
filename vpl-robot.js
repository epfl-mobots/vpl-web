/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Robot base class
	@constructor
*/
A3a.vpl.Robot = function () {
};

/** Reset robot
	@param {number} t0
	@return {void}
*/
A3a.vpl.Robot.prototype["reset"] = function (t0) {
};

/** Reset event listeners
	@return {void}
*/
A3a.vpl.Robot.prototype["resetEventListeners"] = function () {
};

/** Set a robot value (or send an event)
	@param {string} name
	@param {*} val
	@return {void}
*/
A3a.vpl.Robot.prototype["set"] = function (name, val) {
};

/** Get a robot value
	@param {string} name
	@return {*}
*/
A3a.vpl.Robot.prototype["get"] = function (name) {
	return null;
};

/** Set a robot client state
	@param {string} name
	@param {*} val
	@return {void}
*/
A3a.vpl.Robot.prototype["setClientState"] = function (name, val) {
};

/** Get a robot client state
	@param {string} name
	@return {*}
*/
A3a.vpl.Robot.prototype["getClientState"] = function (name) {
	return null;
};

/** Add an event listener
	@param {string} name
	@param {function(string,*=):void} fun
	@return {void}
*/
A3a.vpl.Robot.prototype["addEventListener"] = function (name, fun) {
};

/** Send an event
	@param {string} name
	@param {*} val
	@return {void}
*/
A3a.vpl.Robot.prototype["sendEvent"] = function (name, val) {
};

/** Start or restart simulation, sending an init event
	@param {number} t0
	@return {void}
*/
A3a.vpl.Robot.prototype["start"] = function (t0) {
	this["reset"](t0);
	this["sendEvent"]("init", null);
};

/** Set a timer
	@param {number} id
	@param {number} period period in s, or -1 to stop it
	@return {void}
*/
A3a.vpl.Robot.prototype["setTimer"] = function (id, period) {
};

/** Get a timer
	@param {number} id
	@return {?number} remaining time in s, or -1 if elapsed or nonexisting
*/
A3a.vpl.Robot.prototype["getTimer"] = function (id) {
	return -1;
};

/** Load source code
	@param {string} code
	@return {void}
*/
A3a.vpl.Robot.prototype["loadCode"] = function (code) {
};

/** Run robot over the specified interval (tStart, tStop]
	@param {number} tStop final time
	@param {A3a.vpl.Robot.TraceFun} traceFun
	@return {void}
*/
A3a.vpl.Robot.prototype["run"] = function (tStop, traceFun) {
};

/** @typedef {function(A3a.vpl.Robot.TraceShape,Array.<number>):void}
*/
A3a.vpl.Robot.TraceFun;

/** @enum {string} */
A3a.vpl.Robot.TraceShape = {
	line: "l",	// param: [x0,y0,x1,y1]
	arc: "a"	// param: [x0,y0,r,a1,a2]
};

/** Suspend running
	@return {void}
*/
A3a.vpl.Robot.prototype["suspend"] = function () {
};

/** Suspend running
	@param {number} t
	@return {void}
*/
A3a.vpl.Robot.prototype["resume"] = function (t) {
};
