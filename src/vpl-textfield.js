/*
	Copyright 2020-2021 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Definition of class A3a.vpl.TextField to manage text field editing
with the keyboard.

*/

/**
	@param {A3a.vpl.Application} app
	@param {A3a.vpl.TextField.Options} options
	@constructor
*/
A3a.vpl.TextField = function (app, options) {
	this.app = app;
	this.str = options.initialValue || "";
	this.suffix = options.suffix || "";	// displayed but cannot be edited
	if (this.suffix && this.suffix !== this.str.slice(-this.suffix.length)) {
		// suffix doesn't match end of initial value: ignore it
		this.suffix = "";
	}
	this.ref = options.ref;
	this.selBegin = 0;
	this.selEnd = this.str.length - this.suffix.length;
	/** @type {?{top:number,left:number,bottom:number,right:number}} */
	this.frame = null;
	/** @type {Array.<number>} */
	this.rightPos = [];
	this.displayCB = options.display || function () {};
	this.finishCB = options.finish || function () {};

	var self = this;

	this.app.keyboard.pushHandler(function (ev) {
		if (ev.ctrlKey || ev.metaKey) {
			// ignore shortcuts
			return false;
		}

		switch (ev.key) {
		case "Escape":
			self.finish(false);
			break;
		case "Enter":
			self.finish(true);
			break;
		case "ArrowLeft":
			if (self.selEnd > self.selBegin) {
				self.selEnd = self.selBegin;
				self.display();
			} else if (self.selBegin > 0) {
				self.selBegin--;
				self.selEnd = self.selBegin;
				self.display();
			}
			break;
		case "ArrowRight":
			if (self.selEnd > self.selBegin) {
				self.selBegin = self.selEnd;
				self.display();
			} else if (self.selBegin < self.str.length - self.suffix.length) {
				self.selBegin++;
				self.selEnd = self.selBegin;
				self.display();
			}
			break;
		case "Backspace":
			if (self.selEnd > self.selBegin) {
				self.str = self.str.slice(0, self.selBegin) + self.str.slice(self.selEnd);
				self.selEnd = self.selBegin;
				self.display();
			} else if (self.selBegin > 0) {
				self.str = self.str.slice(0, self.selBegin - 1) + self.str.slice(self.selBegin);
				self.selBegin--;
				self.selEnd = self.selBegin;
				self.display();
			}
			break;
		case "Delete":
			if (self.selEnd > self.selBegin) {
				self.str = self.str.slice(0, self.selBegin) + self.str.slice(self.selEnd);
				self.selEnd = self.selBegin;
				self.display();
			} else if (self.selBegin < self.str.length - self.suffix.length) {
				self.str = self.str.slice(0, self.selBegin) + self.str.slice(self.selBegin + 1);
				self.display();
			}
			break;
		default:
			var isPrintable = !/^\w{2,}$/.test(ev.key);
			if (isPrintable) {
				self.str = self.str.slice(0, self.selBegin) + ev.key + self.str.slice(self.selEnd);
				self.selBegin += ev.key.length;
				self.selEnd = self.selBegin;
				self.display();
			}
			break;
		}
		return true;
	}, true);
};

/** @typedef {function(string,number,number):void}
*/
A3a.vpl.TextField.DisplayCB;

/** @typedef {function(?string):void}
*/
A3a.vpl.TextField.FinishCB;

/** @typedef {{
	initialValue: (string | undefined),
	suffix: (string | undefined),
	ref: (* | undefined),
	display: (A3a.vpl.TextField.DisplayCB | undefined),
	finish: (A3a.vpl.TextField.FinishCB | undefined)
}}
*/
A3a.vpl.TextField.Options;

/** Display text field
	@return {void}
*/
A3a.vpl.TextField.prototype.display = function () {
	this.displayCB(this.str, this.selBegin, this.selEnd);
};

/** Finish editing
	@param {boolean} ok true to confirm changes, false to cancel
	@return {void}
*/
A3a.vpl.TextField.prototype.finish = function (ok) {
	this.finishCB(ok ? this.str : null);
	this.app.keyboard.popHandler();
};

/** Set the rendering position of bounds and of the the cursor at the
	right of the specified char (the with of the first n characters for n
	from 1 to len(str)); should be consistent with findIndexByPos
	@param {{top:number,left:number,bottom:number,right:number}} frame
	@param {Array.<number>} rightPos
	@return {void}
*/
A3a.vpl.TextField.prototype.setRenderingPos = function (frame, rightPos) {
	this.frame = frame;
	this.rightPos = rightPos;
};

/** Find the cursor index from a position, based on the array
	specified by setRightPos
	@param {number} x
	@param {number} y
	@return {?number}
*/
A3a.vpl.TextField.prototype.findCursorByPos = function (x, y) {
	if (this.frame &&
		x >= this.frame.left && x < this.frame.right &&
		y >= this.frame.top && y < this.frame.bottom) {
		var xr = x - this.frame.left;
		var i;
		for (i = 0; i < this.rightPos.length && xr > this.rightPos[i]; i++) {}
		return i === 0
			? this.rightPos.length === 0 || xr < this.rightPos[0] / 2 ? 0 : 1
			: i >= this.rightPos.length ? this.rightPos.length
			: xr < (this.rightPos[i - 1] + this.rightPos[i]) / 2 ? i : i + 1;
	} else {
		return null;
	}
};
