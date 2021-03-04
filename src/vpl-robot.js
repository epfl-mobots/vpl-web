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

Implementation of A3a.vpl.Robot, the base class representing the robot
in the simulator.

*/

/** Robot base class
	@constructor
*/
A3a.vpl.Robot = function () {
	this.speedupFactor = 1;
};

/** Reset robot
	@param {number} t0
	@return {void}
*/
A3a.vpl.Robot.prototype["reset"] = function (t0) {
};

/** Change the speedup factor
	@param {number} f
	@return {void}
*/
A3a.vpl.Robot.prototype.setSpeedupFactor = function (f) {
	this.speedupFactor = f;
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
	@return {void}
*/
A3a.vpl.Robot.prototype["start"] = function () {
	this["sendEvent"]("init", null);
};

/** Set a timer
	@param {number} id
	@param {string} name
	@param {number} period period in s, or -1 to stop it
	@param {boolean=} isPeriodic
	@return {void}
*/
A3a.vpl.Robot.prototype["setTimer"] = function (id, name, period, isPeriodic) {
};

/** Get a timer
	@param {number} id
	@return {?number} remaining time in s, or -1 if elapsed or nonexisting
*/
A3a.vpl.Robot.prototype["getTimer"] = function (id) {
	return -1;
};

/** Load source code
	@param {string} language
	@param {string} code
	@return {void}
*/
A3a.vpl.Robot.prototype["loadCode"] = function (language, code) {
};

/** Check if should run "continuously" (at screen refresh rate)
	@return {boolean} true if method "run" should be called frequently
	(typically at the display refresh rate to handle motion, timers etc.),
	false if method "run" should be called only upon external events
*/
A3a.vpl.Robot.prototype["shouldRunContinuously"] = function () {
	return false;
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
