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

Definition of class A3a.vpl.Keyboard to manage keyoard usage in tools and subpanels.

*/

/**
	@constructor
*/
A3a.vpl.Keyboard = function () {
	/** @type {Array.<A3a.vpl.Keyboard.Handler>} */
	this.handlers = [];
};

/**
	@typedef {function(Event):boolean}
*/
A3a.vpl.Keyboard.Handler;

/** Attach to document's keyboard events
	@return {void}
*/
A3a.vpl.Keyboard.prototype.attach = function () {
	var self = this;

	/**
		@return {void}
	*/
	function handleEvent(ev) {
		if (self.handlers.length > 0) {
			self.handlers[self.handlers.length - 1](ev);
		}
	}

	window.addEventListener("keydown", function (ev) {
		handleEvent(ev);
	});
	window.addEventListener("message", function (ev) {
		if (ev.origin === window["origin"]) {
			handleEvent(ev.data);
		}
	}, false);
};

/** Push a key handler
	@param {A3a.vpl.Keyboard.Handler} handler
	@return {void}
*/
A3a.vpl.Keyboard.prototype.pushHandler = function (handler) {
	this.handlers.push(handler);
};

/** Push a key handler for a single key
	@param {string} key
	@param {function():void} keyHandler
	@return {void}
*/
A3a.vpl.Keyboard.prototype.pushKeyHandler = function (key, keyHandler) {
	this.handlers.push(function (ev) {
		if (key === ev.key) {
			keyHandler();
			return true;
		}
		return false;
	});
};

/** Extend the top handler
	@param {A3a.vpl.Keyboard.Handler} extensionHandler
	@param {boolean=} execFirst true if extensionHandler is executed first, false (default) if last
	@return {void}
*/
A3a.vpl.Keyboard.prototype.extendHandler = function (extensionHandler, execFirst) {
	var topHandler = this.popHandler();
	if (execFirst) {
		this.pushHandler(function (ev) {
			return extensionHandler(ev) || topHandler(ev);
		});
	} else {
		this.pushHandler(function (ev) {
			return topHandler(ev) || extensionHandler(ev);
		});
	}
};

/** Pop last key handler which had been pushed
	@return {A3a.vpl.Keyboard.Handler}
*/
A3a.vpl.Keyboard.prototype.popHandler = function () {
	return this.handlers.pop();
};
