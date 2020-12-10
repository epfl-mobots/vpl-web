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

Definition of class A3a.vpl.UIConfig which stores which GUI items (toolbar
buttons and blocks) are displayed or hidden.

*/

/**
	@constructor
*/
A3a.vpl.UIConfig = function () {
	/** @type {Array.<string>} */
	this.disabledUI = [];
	this.toolbarCustomizationMode = false;
	this.toolbarCustomizationDisabled = false;
		// true to disable buttons which could be customized if toolbarCustomizationMode were true
	this.blockCustomizationMode = false;
	this.keyboardShortcutsEnabled = true;
	this.keyboardAccessibility = false;
	this.nodragAccessibility = false;
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
