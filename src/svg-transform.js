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

Support for transforms defined in SVG with transform stack,
and direct and inverse application to points and vectors.

*/

/** SVG transaform state
	@constructor
	@param {Array.<number>=} mat
*/
SVG.Transform = function (mat) {
	this.mat = mat || [1, 0, 0, 0, 1, 0];
};

/** Copy this
	@return {SVG.Transform}
*/
SVG.Transform.prototype.copy = function () {
	return new SVG.Transform(this.mat);
};

/** Apply transform to a point
	@param {SVG.Transform.Point} pt
	@return {SVG.Transform.Point}
*/
SVG.Transform.prototype.apply = function (pt) {
	return new SVG.Transform.Point(
		this.mat[0] * pt.x + this.mat[1] * pt.y + this.mat[2],
		this.mat[3] * pt.x + this.mat[4] * pt.y + this.mat[5]
	);
};

/** Apply transform to a vector (don't apply translation)
	@param {SVG.Transform.Point} pt
	@return {SVG.Transform.Point}
*/
SVG.Transform.prototype.applyToVector = function (pt) {
	return new SVG.Transform.Point(
		this.mat[0] * pt.x + this.mat[1] * pt.y,
		this.mat[3] * pt.x + this.mat[4] * pt.y
	);
};

/** Get geometric mean scale
	@return {number}
*/
SVG.Transform.prototype.getScale = function () {
	return Math.sqrt(Math.abs(this.mat[0] * this.mat[4]));
};

/** Apply inverse transform to a point
	@param {SVG.Transform.Point} pt
	@return {SVG.Transform.Point}
*/
SVG.Transform.prototype.applyInverse = function (pt) {
	var det = this.mat[0] * this.mat[4] - this.mat[3] * this.mat[1];
	return new SVG.Transform.Point(
		(this.mat[4] * pt.x - this.mat[1] * pt.y + this.mat[1] * this.mat[5] - this.mat[4] * this.mat[2]) / det,
		(-this.mat[3] * pt.x + this.mat[0] * pt.y + this.mat[3] * this.mat[2] - this.mat[0] * this.mat[5]) / det
	);
};

/** Apply inverse transform to a vector (don't apply translation)
	@param {SVG.Transform.Point} pt
	@return {SVG.Transform.Point}
*/
SVG.Transform.prototype.applyInverseToVector = function (pt) {
	var det = this.mat[0] * this.mat[4] - this.mat[3] * this.mat[1];
	return new SVG.Transform.Point(
		(this.mat[4] * pt.x - this.mat[1] * pt.y) / det,
		(-this.mat[3] * pt.x + this.mat[0] * pt.y) / det
	);
};

/** Translate
	@param {number} dx
	@param {number} dy
	@return {void}
*/
SVG.Transform.prototype.translate = function (dx, dy) {
	// this.mat = this.mat * [1, 0, dx, 0, 1, dy]
	this.mat = [
		this.mat[0],
		this.mat[1],
		this.mat[0] * dx + this.mat[1] * dy + this.mat[2],
		this.mat[3],
		this.mat[4],
		this.mat[3] * dx + this.mat[4] * dy + this.mat[5]
	];
};

/** Scale
	@param {number} sx
	@param {number} sy
	@return {void}
*/
SVG.Transform.prototype.scale = function (sx, sy) {
	// this.mat = this.mat * [sx, 0, 0, 0, sy, 0]
	this.mat = [
		this.mat[0] * sx,
		this.mat[1] * sy,
		this.mat[2],
		this.mat[3] * sx,
		this.mat[4] * sy,
		this.mat[5]
	];
};

/** Rotate
	@param {number} angle
	@return {void}
*/
SVG.Transform.prototype.rotate = function (angle) {
	// this.mat = this.mat * [cos, -sin, 0, sin, cos, 0]
	var c = Math.cos(angle);
	var s = Math.sin(angle);
	this.mat = [
		c * this.mat[0] + s * this.mat[1],
		-s * this.mat[0] + c * this.mat[1],
		this.mat[2],
		c * this.mat[3] + s * this.mat[4],
		-s * this.mat[3] + c * this.mat[4],
		this.mat[5]
	];
};

/** Apply matrix transform
	@param {number} a
	@param {number} b
	@param {number} c
	@param {number} d
	@param {number} e
	@param {number} f
	@return {void}
*/
SVG.Transform.prototype.matrix = function (a, b, c, d, e, f) {
	this.mat = [
		a * this.mat[0] + c * this.mat[1],
		b * this.mat[0] + d * this.mat[1],
		a * this.mat[2] + c * this.mat[3],
		b * this.mat[2] + d * this.mat[3],
		a * this.mat[4] + c * this.mat[5] + e,
		b * this.mat[4] + d * this.mat[5] + f
	];
};

/** SVG point
	@constructor
	@param {number=} x
	@param {number=} y
*/
SVG.Transform.Point = function (x, y) {
	this.x = x || 0;
	this.y = y || 0;
};

/** Transform stack
	@constructor
*/
SVG.Transform.Stack = function () {
	this.stack = [new SVG.Transform()];
};

/** Apply transform to a point
	@param {SVG.Transform.Point} pt
	@return {SVG.Transform.Point}
*/
SVG.Transform.Stack.prototype.apply = function (pt) {
	return this.stack[this.stack.length - 1].apply(pt);
};

/** Clear
	@return {void}
*/
SVG.Transform.Stack.prototype.clear = function () {
	this.stack = [new SVG.Transform()];
};

/** Save
	@return {void}
*/
SVG.Transform.Stack.prototype.save = function () {
	this.stack.push(this.stack[this.stack.length - 1].copy());
};

/** Restore
	@return {void}
*/
SVG.Transform.Stack.prototype.restore = function () {
	if (this.stack.length < 2) {
		throw "restore doesn't match save";
	}
	this.stack.pop();
};

/** Translate
	@param {number} dx
	@param {number} dy
	@return {void}
*/
SVG.Transform.Stack.prototype.translate = function (dx, dy) {
	this.stack[this.stack.length - 1].translate(dx, dy);
};

/** Scale
	@param {number} sx
	@param {number} sy
	@return {void}
*/
SVG.Transform.Stack.prototype.scale = function (sx, sy) {
	this.stack[this.stack.length - 1].scale(sx, sy);
};

/** Rotate
	@param {number} angle
	@return {void}
*/
SVG.Transform.Stack.prototype.rotate = function (angle) {
	this.stack[this.stack.length - 1].rotate(angle);
};

/** Matrix product
	@param {number} a
	@param {number} b
	@param {number} c
	@param {number} d
	@param {number} e
	@param {number} f
	@return {void}
*/
SVG.Transform.Stack.prototype.matrix = function (a, b, c, d, e, f) {
	this.stack[this.stack.length - 1].matrix(a, b, c, d, e, f);
};
