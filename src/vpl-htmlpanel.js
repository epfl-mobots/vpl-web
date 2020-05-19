/*
	Copyright 2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Modal box for HTML content.

*/

/** HTML panel
	@constructor
	@param {string} html html content
	@param {boolean=} noCloseWidget true to suppress close widget
	@param {Array.<{title:string,fun:function():void}>=} otherWidgets other widgets displayed on the top right
*/
A3a.vpl.HTMLPanel = function (html, noCloseWidget, otherWidgets) {
	this.html = html;

	this.backgroundDiv = document.createElement("div");
	this.backgroundDiv.style.width = "100%";
	this.backgroundDiv.style.height = "100%";
	this.backgroundDiv.style.position = "fixed";
	this.backgroundDiv.style.top = "0";
	this.backgroundDiv.style.left = "0";
	this.backgroundDiv.style.zIndex = "1000";
	this.backgroundDiv.style.backgroundColor = "rgba(1,1,1,0.5)";
	this.backgroundDiv.style.display = "none";
	this.div = document.createElement("div");
	this.div.style.width = "80%";
	this.div.style.height = "80%";
	this.div.style.position = "fixed";
	this.div.style.top = "50%";
	this.div.style.left = "50%";
	this.div.style.backgroundColor = "white";
	this.div.style.padding = "2em";
	this.backgroundDiv.appendChild(this.div);
	document.body.appendChild(this.backgroundDiv);

	/** @type {Array.<Element>} */
	this.widgets = [];

	var self = this;
	var left = 0;
	var right = 0;
	function addWidget(title, rightSide, fun) {
		var widget = document.createElement("div");
		widget.style.position = "absolute";
		widget.style.width = "32px";
		widget.style.height = "32px";
		widget.style.top = "0";
		if (rightSide) {
			widget.style.right = right.toString(10) + "px";
			right += 40;
		} else {
			widget.style.left = left.toString(10) + "px";
			left += 40;
		}
		widget.textContent = title;
		widget.style.font = "bold 30px sans-serif";
		widget.style.textAlign = "left";
		widget.style.padding = "5px";
		widget.style.paddingLeft = "10px";
		widget.addEventListener("click", function () {
			fun();
		}, false);
		self.widgets.push(widget);
	}

	// widgets
	if (!noCloseWidget) {
		addWidget("\u00d7",	// times
			false,
			function () { self.hide(); });
	}
	if (otherWidgets) {
		otherWidgets.forEach(function (w) {
			addWidget(w.title, true, w.fun);
		});
	}
};

/** Show panel
	@return {void}
*/
A3a.vpl.HTMLPanel.prototype.show = function () {
	this.div.innerHTML = this.html;	// do it here to restart from the desired starting point
	this.widgets.forEach(function (element) {
		this.div.appendChild(element);
	}, this);
	this.backgroundDiv.style.display = "block";
	this.center();
};

/** Hide about box
	@return {void}
*/
A3a.vpl.HTMLPanel.prototype.hide = function () {
	this.backgroundDiv.style.display = "none";
};

/** Center about box
	@return {void}
*/
A3a.vpl.HTMLPanel.prototype.center = function () {
	var boundingBox = this.div.getBoundingClientRect();
	this.div.style.marginLeft = (-boundingBox.width / 2) + "px";
	this.div.style.marginTop = (-boundingBox.height / 2) + "px";
};
