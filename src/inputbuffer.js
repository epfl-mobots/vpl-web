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

Simple buffer class for receiving Aseba messages.

*/

/** Input buffer
	@constructor
*/
A3a.InputBuffer = function () {
	/** @type {?ArrayBuffer} */
	this.buffer = null;
	this.length = 0;
};

/** Reset
	@return {void}
*/
A3a.InputBuffer.prototype.reset = function () {
	this.buffer = null;
	this.length = 0;
};

/** Append data to input buffer
	@param {ArrayBuffer} data
	@param {number=} length number of bytes (default: data.byteLength)
	@param {number=} offset offset in data (default: 0)
	@return {void}
*/
A3a.InputBuffer.prototype.appendData = function (data, length, offset) {
	if (length === undefined) {
		length = data.byteLength;
	}
	if (length > 0) {
		if (this.length > 0) {
			var newArray = new Uint8Array(this.length + length);
			newArray.set(new Uint8Array(this.buffer, 0, this.length), 0);
			newArray.set(new Uint8Array(data, offset || 0, length), this.length);
			this.buffer = newArray.buffer;
			this.length += length;
		} else {
			this.buffer = data.slice(offset || 0, (offset || 0) + length);	// copy, don't share
			this.length = length;
		}
	}
};

/** Consume some initial bytes
	@param {number} n
	@return {void}
*/
A3a.InputBuffer.prototype.consume = function (n) {
	this.length -= n;
	this.buffer = this.length > 0
		? this.buffer.slice(n)
		: null;
};
