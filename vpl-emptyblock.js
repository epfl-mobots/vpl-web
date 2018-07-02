/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/**
	@constructor
	@extends {epfl.mobots.vpl.Block}
	@param {epfl.mobots.vpl.blockType} blockType
	@param {epfl.mobots.vpl.EventHandler} eventHandlerContainer
	@param {epfl.mobots.vpl.positionInContainer} positionInContainer
*/
epfl.mobots.vpl.EmptyBlock = function (blockType, eventHandlerContainer, positionInContainer) {
	epfl.mobots.vpl.Block.call(this,
		epfl.mobots.vpl.EmptyBlock.templates[blockType],
		eventHandlerContainer,
		positionInContainer);
};
epfl.mobots.vpl.EmptyBlock.prototype = Object.create(epfl.mobots.vpl.Block);
epfl.mobots.vpl.EmptyBlock.prototype.constructor = epfl.mobots.vpl.EmptyBlock;

/** @const */
epfl.mobots.vpl.EmptyBlock.templates = {
 	"e": new epfl.mobots.vpl.BlockTemplate({
		name: "empty e",
		type: epfl.mobots.vpl.blockType.event,
		draw: function (canvas, block) {
			canvas.clearBlockBackground();
		}
	}),
	"a": new epfl.mobots.vpl.BlockTemplate({
		name: "empty a",
		type: epfl.mobots.vpl.blockType.action,
		draw: function (canvas, block) {
			canvas.clearBlockBackground();
		}
	}),
	"s": new epfl.mobots.vpl.BlockTemplate({
		name: "empty s",
		type: epfl.mobots.vpl.blockType.state,
		draw: function (canvas, block) {
			canvas.clearBlockBackground();
		}
	})
};

/**
	@inheritDoc
*/
epfl.mobots.vpl.EmptyBlock.prototype.generateCode = function () {
	return {};
};
