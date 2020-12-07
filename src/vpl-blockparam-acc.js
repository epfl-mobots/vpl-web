/*
	Copyright 2020 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Implementation of class A3a.vpl.BlockParamAccessibility,
which provide support for keyboard manipulation of block parameters,
and associated classes and types.

*/

/**
	@constructor
	@param {?Array.<A3a.vpl.BlockParamAccessibility.Control>=} controls
*/
A3a.vpl.BlockParamAccessibility = function (controls) {
	/** @type {Array.<A3a.vpl.BlockParamAccessibility.Control>} */
	this.controls = controls || [];
};

/**
	@param {A3a.vpl.BlockParamAccessibility.Control} control
	@return {void}
*/
A3a.vpl.BlockParamAccessibility.prototype.addControl = function (control) {
	this.controls.push(control);
};

/**
	@constructor
	@param {number} top
	@param {number} left
	@param {number} bottom
	@param {number} right
	@param {A3a.vpl.BlockParamAccessibility.Control.OnAction} onSelect
	@param {A3a.vpl.BlockParamAccessibility.Control.OnAction} onUp
	@param {A3a.vpl.BlockParamAccessibility.Control.OnAction} onDown
*/
A3a.vpl.BlockParamAccessibility.Control = function (top, left, bottom, right,
	onSelect, onUp, onDown) {
	this.top = top;
	this.left = left;
	this.bottom = bottom;
	this.right = right;
	this.onSelect = onSelect;
	this.onUp = onUp;
	this.onDown = onDown;
};

/**
	@typedef {(function(A3a.vpl.Block):void | null)}
*/
A3a.vpl.BlockParamAccessibility.Control.OnAction;
