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

Definition of class A3a.vpl.EmptyBlock (an A3a.cpl.Block subclass) which
represents empty slots in the VPL program user interface.

*/

/**
	@constructor
	@extends {A3a.vpl.Block}
	@param {A3a.vpl.blockType} blockType
	@param {A3a.vpl.Rule} ruleContainer
	@param {A3a.vpl.positionInContainer} positionInContainer
*/
A3a.vpl.EmptyBlock = function (blockType, ruleContainer, positionInContainer) {
	A3a.vpl.Block.call(this,
		A3a.vpl.EmptyBlock.templates[blockType],
		ruleContainer,
		positionInContainer);
};
A3a.vpl.EmptyBlock.prototype = Object.create(A3a.vpl.Block.prototype);
A3a.vpl.EmptyBlock.prototype.constructor = A3a.vpl.EmptyBlock;

/** @const */
A3a.vpl.EmptyBlock.templates = {
 	"e": new A3a.vpl.BlockTemplate({
		name: "empty e",
		type: A3a.vpl.blockType.event,
		draw: function (canvas, block, box, isZoomed) {
			var blockTemplate = A3a.vpl.BlockTemplate.findByName("!empty event");
			if (blockTemplate) {
				blockTemplate.draw(canvas, block, box, isZoomed);
			}
		}
	}),
	"a": new A3a.vpl.BlockTemplate({
		name: "empty a",
		type: A3a.vpl.blockType.action,
		draw: function (canvas, block, box, isZoomed) {
			var blockTemplate = A3a.vpl.BlockTemplate.findByName("!empty action");
			if (blockTemplate) {
				blockTemplate.draw(canvas, block, box, isZoomed);
			}
		}
	}),
	"s": new A3a.vpl.BlockTemplate({
		name: "empty s",
		type: A3a.vpl.blockType.state,
		draw: function (canvas, block, box, isZoomed) {
			var blockTemplate = A3a.vpl.BlockTemplate.findByName("!empty state") ||
				A3a.vpl.BlockTemplate.findByName("!empty event");
			if (blockTemplate) {
				blockTemplate.draw(canvas, block, box, isZoomed);
			}
		}
	})
};

/**
	@inheritDoc
*/
A3a.vpl.EmptyBlock.prototype.generateCode = function () {
	return {};
};
