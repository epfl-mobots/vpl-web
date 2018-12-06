/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/**
	@constructor
	@extends {A3a.vpl.Block}
	@param {A3a.vpl.blockType} blockType
	@param {A3a.vpl.EventHandler} eventHandlerContainer
	@param {A3a.vpl.positionInContainer} positionInContainer
*/
A3a.vpl.EmptyBlock = function (blockType, eventHandlerContainer, positionInContainer) {
	A3a.vpl.Block.call(this,
		A3a.vpl.EmptyBlock.templates[blockType],
		eventHandlerContainer,
		positionInContainer);
};
A3a.vpl.EmptyBlock.prototype = Object.create(A3a.vpl.Block.prototype);
A3a.vpl.EmptyBlock.prototype.constructor = A3a.vpl.EmptyBlock;

/** @const */
A3a.vpl.EmptyBlock.templates = {
 	"e": new A3a.vpl.BlockTemplate({
		name: "empty e",
		type: A3a.vpl.blockType.event,
		draw: function (canvas, block) {
			canvas.clearBlockBackground();
		}
	}),
	"a": new A3a.vpl.BlockTemplate({
		name: "empty a",
		type: A3a.vpl.blockType.action,
		draw: function (canvas, block) {
			canvas.clearBlockBackground();
		}
	}),
	"s": new A3a.vpl.BlockTemplate({
		name: "empty s",
		type: A3a.vpl.blockType.state,
		draw: function (canvas, block) {
			canvas.clearBlockBackground();
		}
	})
};

/**
	@inheritDoc
*/
A3a.vpl.EmptyBlock.prototype.generateCode = function () {
	return {};
};
