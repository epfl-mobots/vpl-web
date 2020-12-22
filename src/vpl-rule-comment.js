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

Implementation of A3a.vpl.Rule, a class which contains a VPL3 event
handler (a single rule). An event handler contains an array of event, state
and comment blocks, (the "left" part), and an array of actions and comment
blocks (the "right" part). A VPL program, as represented by an A3a.vpl.Program
object, is basically a collection of A3a.vpl.Rule objects.

*/

/** Peudo-rule for comment
	@constructor
	@extends {A3a.vpl.Rule}
	@param {string=} comment
*/
A3a.vpl.RuleComment = function (comment) {
	A3a.vpl.Rule.call(this);
	/** @type {string} */
	this.comment = comment || "";
};
A3a.vpl.RuleComment.prototype = Object.create(A3a.vpl.Rule.prototype);
A3a.vpl.RuleComment.prototype.constructor = A3a.vpl.RuleComment;

/**
	@inheritDoc
*/
A3a.vpl.RuleComment.prototype.copy = function () {
	return new A3a.vpl.RuleComment(this.comment);
};

/**
	@inheritDoc
*/
A3a.vpl.RuleComment.prototype.isEmpty = function () {
	return false;
};

/**
	@inheritDoc
*/
A3a.vpl.RuleComment.prototype.setBlock = function () {
	// no block here
	throw "internal";
};

/**
	@inheritDoc
*/
A3a.vpl.RuleComment.prototype.removeBlock = function () {
	// no block here
	throw "internal";
};

/**
	@inheritDoc
*/
A3a.vpl.RuleComment.prototype.checkConflicts = function () {
	// no conflict
	return false;
};
