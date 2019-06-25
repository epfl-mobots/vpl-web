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

Implementation of A3a.vpl.RunGlue, the interface to what runs the source code
produced by VPL3 or entered directly in the source code editor: a Thymio II
robot connected via asebahttp or the Thymio Device Manager or the simulator.

*/

/** Interface to run a program on a robot or a simulator
	@constructor
	@param {{
		run: (function(string,string):void | undefined),
		init: (function(string):void | undefined),
		isConnected: (function():boolean | undefined),
		isEnabled: (function(string):boolean | undefined),
		languages: (Array.<string> | undefined),
		preferredLanguage: (string | undefined),
		state: (Object | undefined)
	}} options
*/
A3a.vpl.RunGlue = function (options) {
	this.runFun = options && options.run ? options.run : null;
	this.initFun = options && options.init ? options.init : null;
	this.isConnectedFun = options && options.isConnected ? options.isConnected : null;
	this.isEnabledFun = options && options.isEnabled ? options.isEnabled : null;
	this.preferredLanguage = options && options.preferredLanguage ? options.preferredLanguage : "aseba";
	this.languages = options && options.languages ? options.languages : [this.preferredLanguage];
	this.state = options && options.state ? options.state : null;
};

/** Check if the RunGlue interface is enabled for a specific language
	@param {string} language
	@return {boolean}
*/
A3a.vpl.RunGlue.prototype.isConnected = function (language) {
	return this.isConnectedFun == null || this.isConnectedFun();
};

/** Check if the RunGlue interface is enabled for a specific language
	@param {string} language
	@return {boolean}
*/
A3a.vpl.RunGlue.prototype.isEnabled = function (language) {
	return this.runFun != null && this.languages.indexOf(language) >= 0 &&
		(this.isEnabledFun == null || this.isEnabledFun(language));
};

/** Initialize the RunGlue interface
	@param {string} language
	@return {void}
*/
A3a.vpl.RunGlue.prototype.init = function (language) {
	if (this.initFun) {
		this.initFun(language);
	}
};

/** Run source code
	@param {string} code
	@param {string} language
	@return {void}
*/
A3a.vpl.RunGlue.prototype.run = function (code, language) {
	if (this.isEnabled(language)) {
		this.runFun(language, code);
	}
};
