/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/**
	@constructor
*/
A3a.vpl.UIConfig = function () {
	/** @type {Array.<string>} */
	this.disabledUI = [];
};

/** Reset UI
	@return {void}
*/
A3a.vpl.UIConfig.prototype.reset = function () {
	this.disabledUI = [];
};

/** Check if a feature is disabled
	@param {string} featureName
	@return {boolean}
*/
A3a.vpl.UIConfig.prototype.isDisabled = function (featureName) {
	return this.disabledUI.indexOf(featureName) >= 0;
};

/** Set all disable features
	@param {Array.<string>} featureList
	@return {void}
*/
A3a.vpl.UIConfig.prototype.setDisabledFeatures = function (featureList) {
	this.disabledUI = featureList.slice();
};

/** Disable a feature
	@param {string} featureName
	@return {void}
*/
A3a.vpl.UIConfig.prototype.disable = function (featureName) {
	if (this.disabledUI.indexOf(featureName) < 0) {
		this.disabledUI.push(featureName);
	}
};

/** Enable a feature
	@param {string} featureName
	@return {void}
*/
A3a.vpl.UIConfig.prototype.enable = function (featureName) {
	var ix = this.disabledUI.indexOf(featureName);
	if (ix >= 0) {
		this.disabledUI.splice(ix, 1);
	}
};

/** Toggle a feature
	@param {string} featureName
	@return {void}
*/
A3a.vpl.UIConfig.prototype.toggle = function (featureName) {
	var ix = this.disabledUI.indexOf(featureName);
	if (ix >= 0) {
		this.disabledUI.splice(ix, 1);
	} else {
		this.disabledUI.push(featureName);
	}
};
