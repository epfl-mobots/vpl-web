/*
	Copyright 2022 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Definition of class A3a.vpl.TextFieldInput to manage text field editing
with a phantom input HTML element. Required on Android only where keydown
events aren't produced if an input field has the focus.

*/

/**
	@param {A3a.vpl.Application} app
	@param {A3a.vpl.TextField.Options} options
	@constructor
	@extends {A3a.vpl.TextField}
*/
A3a.vpl.TextFieldInput = function (app, options) {
	A3a.vpl.TextField.call(this, app, options);

	// remove A3a.vpl.TextField keydown handler
	this.app.keyboard.popHandler();

	this.input = document.createElement("input");
	this.input.style.position = "absolute";
	this.input.style.left = "-1000px";	// outside view
	this.input.style.top = "-1000px";
	this.input.value = this.suffix ? this.str.slice(0, -this.suffix.length) : this.str;
	this.input.selectionStart = 0;
	this.input.selectionEnd = this.input.value.length;
	var self = this;
	this.input.addEventListener("input", function (ev) {
		self.str = self.input.value + self.suffix;
		self.selBegin = self.input.selectionStart;
		self.selEnd = self.input.selectionEnd;
		self.display();
	}, false);
	this.onSelectionChange = function (ev) {
		self.selBegin = self.input.selectionStart;
		self.selEnd = self.input.selectionEnd;
		self.display();
	};
	document.addEventListener("selectionchange", this.onSelectionChange, false);
	this.input.addEventListener("change", function (ev) {
		if (self.input) {
			self.finish(true);
		}
	}, false);
	document.body.appendChild(this.input);
	this.input.focus();

	// handle escape key, don't grab other keydown events
	this.app.keyboard.pushHandler(function (ev) {
		if (ev.key === "Escape") {
			self.finish(false);
			return true;
		}
		return false;
	});
};
A3a.vpl.TextFieldInput.prototype = Object.create(A3a.vpl.TextField.prototype);
A3a.vpl.TextFieldInput.prototype.constructor = A3a.vpl.TextFieldInput;

/**
	@inheritDoc
*/
A3a.vpl.TextFieldInput.prototype.finish = function (ok) {
	this.finishCB(ok ? this.input.value + this.suffix : null);
	document.removeEventListener("selectionchange", this.onSelectionChange, false);
	var input = this.input;	// avoid reentrant call via "change" listener
	this.input = null;
	document.body.removeChild(input);
	this.app.keyboard.popHandler();
};
