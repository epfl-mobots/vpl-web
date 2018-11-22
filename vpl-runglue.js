/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Interface to run a program on a robot or a simulator
	@constructor
	@param {{
		run: (function(string):void | undefined),
		init: (function():void | undefined),
		isEnabled: (function():boolean | undefined),
		languages: (Array.<string> | undefined),
		preferredLanguage: (string | undefined)
	}} options
*/
A3a.vpl.RunGlue = function (options) {
	this.runFun = options && options.run ? options.run : null;
	this.initFun = options && options.init ? options.init : null;
	this.isEnabledFun = options && options.isEnabled ? options.isEnabled : null;
	this.preferredLanguage = options && options.preferredLanguage ? options.preferredLanguage : "aseba";
	this.languages = options && options.languages ? options.languages : [this.preferredLanguage];

	/** @type {Object<string,string>} */
	this.stopCode = {};
};

/** Check if the RunGlue interface is enabled for a specific language
	@param {string} language
	@return {boolean}
*/
A3a.vpl.RunGlue.prototype.isEnabled = function (language) {
	return this.runFun != null && this.languages.indexOf(language) >= 0 ||
		(this.isEnabledFun == null || this.isEnabledFun());
};

/** Initialize the RunGlue interface
	@return {void}
*/
A3a.vpl.RunGlue.prototype.init = function () {
	if (this.initFun) {
		this.initFun();
	}
};

/** Run source code
	@param {string} code
	@param {string} language
	@return {void}
*/
A3a.vpl.RunGlue.prototype.run = function (code, language) {
	if (this.isEnabled(language)) {
		this.runFun(code);
	}
};

/** Add source code to stop the robot
	@param {string} code
	@param {string} language
	@return {void}
*/
A3a.vpl.RunGlue.prototype.setStopCode = function (code, language) {
	this.stopCode[language] = code;
};

/** Run stop code
	@param {string} language
	@return {void}
*/
A3a.vpl.RunGlue.prototype.stop = function (language) {
	if (this.isEnabled(language) && this.stopCode[language]) {
		this.runFun(this.stopCode[language]);
	}
};
