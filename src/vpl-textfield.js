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
	this.ref = options.ref;
	this.selBegin = 0;
	this.selEnd = this.str.length;
	this.displayCB = options.display || function () {};
	this.finishCB = options.finish || function () {};

	var self = this;

	this.app.keyboard.pushHandler(function (ev) {
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
			} else if (self.selBegin < self.str.length) {
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
			} else if (self.selBegin < self.str.length) {
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
	});
};

/** @typedef {function(string,number,number):void}
*/
A3a.vpl.TextField.DisplayCB;

/** @typedef {function(?string):void}
*/
A3a.vpl.TextField.FinishCB;

/** @typedef {{
	initialValue: (string | undefined),
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
