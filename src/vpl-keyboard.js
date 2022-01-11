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
A3a.vpl.Keyboard.HandlerFun;

/**
	@typedef {{
		fun: A3a.vpl.Keyboard.HandlerFun,
		virtualKeyboard: boolean
	}}
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
			if (self.handlers[self.handlers.length - 1].fun(ev)) {
				ev.preventDefault();
			}
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
	@param {A3a.vpl.Keyboard.HandlerFun} handlerFun
	@param {boolean=} showVirtualKeyboard
	@return {void}
*/
A3a.vpl.Keyboard.prototype.pushHandler = function (handlerFun, showVirtualKeyboard) {
	this.handlers.push({
		fun: handlerFun,
		virtualKeyboard: showVirtualKeyboard === true
	});
	A3a.vpl.Keyboard.showVirtualKeyboard(showVirtualKeyboard === true);
};

/** Push a key handler for a single key
	@param {string} key
	@param {function():void} keyHandler
	@return {void}
*/
A3a.vpl.Keyboard.prototype.pushKeyHandler = function (key, keyHandler) {
	this.handlers.push({
		fun: function (ev) {
			if (key === ev.key) {
				keyHandler();
				return true;
			}
			return false;
		},
		virtualKeyboard: false
	});
	A3a.vpl.Keyboard.showVirtualKeyboard(false);
};

/** Extend the top handler
	@param {A3a.vpl.Keyboard.HandlerFun} extensionHandlerFun
	@param {boolean=} execFirst true if extensionHandler is executed first, false (default) if last
	@return {void}
*/
A3a.vpl.Keyboard.prototype.extendHandler = function (extensionHandlerFun, execFirst) {
	var topHandler = this.popHandler();
	this.pushHandler(execFirst
			? function (ev) {
				return extensionHandlerFun(ev) || topHandler.fun(ev);
			}
			: function (ev) {
				return topHandler.fun(ev) || extensionHandlerFun(ev);
			},
		topHandler.virtualKeyboard);
};

/** Pop last key handler which had been pushed
	@return {A3a.vpl.Keyboard.Handler}
*/
A3a.vpl.Keyboard.prototype.popHandler = function () {
	A3a.vpl.Keyboard.showVirtualKeyboard(this.handlers.length > 1 &&
		this.handlers[this.handlers.length - 2].virtualKeyboard);
	return this.handlers.pop();
};

/** Activate or deactivate virtual keyboard on touchscreen devices
	@param {boolean} on
	@return {void}
*/
A3a.vpl.Keyboard.showVirtualKeyboard = function (on) {
	if (on) {
		// focus invisible input element (created if required)
		if (A3a.vpl.Keyboard.showVirtualKeyboard.textfield == null) {
			var f = document.createElement("input");
			// place element outside the visible area
            f.setAttribute("style",
                "width:0;height:0;position:absolute;left:-10pt;top:-10pt;");
			A3a.vpl.Keyboard.showVirtualKeyboard.textfield = f;
            document.body.appendChild(f);
		}
		A3a.vpl.Keyboard.showVirtualKeyboard.textfield.focus();
	} else {
		// unfocus invisible input element if it exists
		if (A3a.vpl.Keyboard.showVirtualKeyboard.textfield != null) {
			A3a.vpl.Keyboard.showVirtualKeyboard.textfield.blur();
		}
	}
};
/** @type {Element} */
A3a.vpl.Keyboard.showVirtualKeyboard.textfield = null;
