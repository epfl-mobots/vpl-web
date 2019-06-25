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

Implementation of a generic text editor with support for line numbers.

*/

/** Text editor in a textarea HTML element with line numbers and
	widgets for breakpoints and current execution position
	@constructor
	@param {string} textareaId id of textarea element, which should be
	enclosed in a div and follow a pre
	@param {?string} preId id of pre element for line numbers (element before textarea), or null if none
	@param {number=} topMargin
	@param {number=} leftMargin
*/
A3a.vpl.TextEditor = function (textareaId, preId, topMargin, leftMargin) {
	this.textarea = document.getElementById(textareaId);
	this.textarea.value = "";

	this.div = this.textarea.parentElement;
    this.pre = preId ? null : document.getElementById(/** @type {string} */(preId));

    // style
	this.topMargin = topMargin || 0;
	this.leftMargin = leftMargin || 0;
    var width = window.innerWidth - this.leftMargin;
	var height = window.innerHeight - this.topMargin;
    var taStyle = window.getComputedStyle(this.textarea);
	var taWidth = width - (this.pre ? this.pre.getBoundingClientRect().width : 0) - 10 -
		parseInt(taStyle.paddingLeft, 10) - parseInt(taStyle.paddingRight, 10);

    this.textarea.style.width = taWidth + "px";
    this.textarea.style.border = "0px";
    this.textarea.style.outline = "none";
    this.textarea.style.resize = "none";
    this.textarea.style.whiteSpace = "pre";
    this.textarea.setAttribute("wrap", "off");    // required in WebKit

	if (this.pre) {
	    this.pre.style.height = height + "px";
	    this.pre.style.fontFamily = taStyle.fontFamily;
	    this.pre.style.fontSize = taStyle.fontSize;
	    this.pre.style.height = taStyle.height;
	    this.pre.style.maxHeight = taStyle.height;

		var self = this;
	    this.textarea.addEventListener("scroll", function (e) {
	        self.pre.scrollTop = this.scrollTop;
	    }, false);
	    this.textarea.addEventListener("input", function (e) {
	        self.updateLineNumbers();
	    }, false);

    	this.textarea.style.overflowX = "hidden";    // scrollbar would break sync with pre
	}

	this.breakpointsEnabled = false;

	/** @type {Array.<number>} */
	this.breakpoints = [];
	this.currentLine = -1;

	/** @type {?A3a.vpl.TextEditor.OnBreakpointChanged} */
	this.onBreakpointChanged = null;

	this.updateLineNumbers();
};

/** Set window resize listener to resize this
	@return {void}
*/
A3a.vpl.TextEditor.prototype.addResizeListener = function () {
	var self = this;
	window.addEventListener("resize", function (e) {
		self.resize();
	}, true);
};

/** @typedef {function(Array.<number>):void} */
A3a.vpl.TextEditor.OnBreakpointChanged;

/** Set readonly attribute
	@param {boolean} ro true for readonly, false for editable
	@return {void}
*/
A3a.vpl.TextEditor.prototype.setReadOnly = function (ro) {
	this.textarea.readOnly = ro;
};

/** Select a text range
	@param {number} begin
	@param {number} end
*/
A3a.vpl.TextEditor.prototype.selectRange = function (begin, end) {
	this.textarea.setSelectionRange(begin, end);
};

/** Clear all breakpoints
	@return {void}
*/
A3a.vpl.TextEditor.prototype.clearBreakpoints = function () {
	this.breakpoints = [];
	this.updateLineNumbers();
	this.onBreakpointChanged && this.onBreakpointChanged(this.breakpoints);
};

/** Toggle breakpoint
	@param {number} line
	@return {void}
*/
A3a.vpl.TextEditor.prototype.toggleBreakpoint = function (line) {
	if (this.breakpoints.indexOf(line) >= 0) {
		this.breakpoints.splice(this.breakpoints.indexOf(line), 1);
	} else {
		this.breakpoints.push(line);
	}
	this.updateLineNumbers();
	this.onBreakpointChanged && this.onBreakpointChanged(this.breakpoints);
};

/** Resize elements
	@return {void}
*/
A3a.vpl.TextEditor.prototype.resize = function () {
	var parentBB = this.div.getBoundingClientRect();
    // style
    var width = parentBB.width - this.leftMargin;
	var height = window.innerHeight - this.topMargin;
    var taStyle = window.getComputedStyle(this.textarea);
	var taWidth = width - (this.pre ? this.pre.getBoundingClientRect().width : 0) - 10 -
		parseInt(taStyle.paddingLeft, 10) - parseInt(taStyle.paddingRight, 10);

    this.textarea.style.width = taWidth + "px";
	if (this.pre) {
	    this.pre.style.height = height + "px";
	    this.pre.style.maxHeight = height + "px";
	}
};

/** Update the line number text in the pre element if it exists
    @return {void}
*/
A3a.vpl.TextEditor.prototype.updateLineNumbers = function () {
	if (this.pre) {
	    var lineCount = this.textarea.value.split("\n").length;
	    var preLineCount = this.pre.textContent.split("\n").length;
		/** @type {Array.<string>} */
	    var txt = [];
	    for (var i = 0; i < lineCount; i++) {
			txt.push((i + 1 === this.currentLine ? "\u25b6 "
				: this.breakpoints.indexOf(i + 1) >= 0 ? "\u25ce " : "  ") +
					(i + 1).toString(10));
	    }
		while (this.pre.firstElementChild) {
			this.pre.removeChild(this.pre.firstElementChild);
		}
		var self = this;
	    txt.forEach(function (t, i) {
			var el = document.createElement("span");
			el.textContent = t + "\n";
			if (this.breakpointsEnabled) {
				el.addEventListener("click", function () {
					self.toggleBreakpoint(i + 1);
				});
			}
			this.pre.appendChild(el);
		}, this);
	}
}

/** Change text editor content
	@param {string} text
	@return {void}
*/
A3a.vpl.TextEditor.prototype.setContent = function (text) {
	this.textarea.value = text;
    var height = this.div.clientHeight;
    var taStyle = window.getComputedStyle(this.textarea);
	if (this.pre) {
	    this.pre.style.height = taStyle.height;
	    this.pre.style.maxHeight = taStyle.height;
	    this.updateLineNumbers();
	}
}
