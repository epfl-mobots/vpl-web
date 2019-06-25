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

Definition of additional A3a.vpl.BlockTemplate methods related to
block library in array A3a.vpl.BlockTemplate.lib.

*/

/** Find a block template specified by name
	@param {string} name
	@return {A3a.vpl.BlockTemplate}
*/
A3a.vpl.BlockTemplate.findByName = function (name) {
	for (var i = 0; i < A3a.vpl.BlockTemplate.lib.length; i++) {
		if (A3a.vpl.BlockTemplate.lib[i].name === name) {
			return A3a.vpl.BlockTemplate.lib[i];
		}
	}
	return null;
};

/** Filter block names, keeping only those defined in A3a.vpl.BlockTemplate.lib
	@param {Array.<string>} a
	@return {Array.<string>}
*/
A3a.vpl.BlockTemplate.filterBlocks = function (a) {
	/** @type {Array.<string>} */
	var af = [];
	a.forEach(function (name) {
		if (A3a.vpl.BlockTemplate.findByName(name)) {
			af.push(name);
		}
	});
	return af;
};

/** Get all blocks defined for the specified mode
	@param {A3a.vpl.mode} mode
	@return {Array.<A3a.vpl.BlockTemplate>}
*/
A3a.vpl.BlockTemplate.getBlocksByMode = function (mode) {
	var a = [];
	(A3a.vpl.BlockTemplate.lib || []).forEach(function (b) {
		if (b.type !== A3a.vpl.blockType.hidden && b.modes.indexOf(mode) >= 0) {
			a.push(b);
		}
	});
	return a;
};
