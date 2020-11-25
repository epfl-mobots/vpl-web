/*
	Copyright 2019-2020 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
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
	@param {?{
		noCloseWidget: (boolean | undefined),
		otherWidgets: (Array.<{title:string,htmlElement:?string,fun:function():void}> | undefined),
		scroll: (boolean | undefined),
		onShow: ((function():void) | null | undefined),
		onHide: ((function():void) | null | undefined)
	}=} options options (noCloseWidget: true to suppress close widget;
	otherWidgets: other widgets displayed on the top right;
	scroll: true to have a vertical scrollbar;
	onShow: function called when showing the panel (can install keyboard handler);
	onHide: function called when hiding the panel (can remove keyboard handler))
*/
A3a.vpl.HTMLPanel = function (html, options) {
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

	this.panelDiv = document.createElement("div");
	this.panelDiv.style.width = "80%";
	this.panelDiv.style.height = "80%";
	this.panelDiv.style.position = "fixed";
	this.panelDiv.style.top = "50%";
	this.panelDiv.style.left = "50%";
	this.panelDiv.style.backgroundColor = "white";
	this.backgroundDiv.appendChild(this.panelDiv);
	document.body.appendChild(this.backgroundDiv);

	var container = document.createElement("div");
	container.style.width = "100%";
	container.style.height = "100%";
	if (options && options.scroll) {
		container.style.overflowY = "scroll";
	}
	this.panelDiv.appendChild(container);

	this.div = document.createElement("div");
	this.div.style.backgroundColor = "white";
	this.div.style.width = "100%";
	this.div.style.height = "100%";
	container.appendChild(this.div);

	/** @type {Array.<Element>} */
	this.widgets = [];

	var self = this;
	var left = 0;
	var right = 30;
	function addWidget(title, htmlElement, rightSide, fun) {
		var widget = document.createElement("div");
		if (htmlElement != null) {
			widget.innerHTML = htmlElement;
		} else {
			widget.textContent = title;
			widget.style.font = "bold 30px sans-serif";
			widget.style.textAlign = "left";
			widget.style.padding = "5px";
			widget.style.paddingLeft = "10px";
		}
		widget.style.position = "absolute";
		widget.style.width = "32px";
		widget.style.height = "32px";
		widget.style.top = "0";
		widget.style.cursor = "default";
		if (rightSide) {
			widget.style.right = right.toString(10) + "px";
			right += 40;
		} else {
			widget.style.left = left.toString(10) + "px";
			left += 40;
		}
		widget.addEventListener("click", function () {
			fun();
		}, false);
		self.widgets.push(widget);
	}

	// widgets
	if (!options || !options.noCloseWidget) {
		addWidget("\u00d7",	// times
			null,
			false,
			function () { self.hide(); });
	}
	if (options && options.otherWidgets) {
		options.otherWidgets.forEach(function (w) {
			addWidget(w.title, w.htmlElement, true, w.fun);
		});
	}

	this.onShow = options && options.onShow || null;
	this.onHide = options && options.onHide || null;
};

/** Show panel
	@return {void}
*/
A3a.vpl.HTMLPanel.prototype.show = function () {
	this.widgets.forEach(function (element) {
		this.panelDiv.appendChild(element);
	}, this);
	this.div.innerHTML = this.html;	// do it here to restart from the desired starting point
	this.backgroundDiv.style.display = "block";
	this.center();
	if (this.onShow) {
		this.onShow();
	}
};

/** Hide about box
	@return {void}
*/
A3a.vpl.HTMLPanel.prototype.hide = function () {
	this.backgroundDiv.style.display = "none";
	if (this.onHide) {
		this.onHide();
	}
};

/** Center content
	@return {void}
*/
A3a.vpl.HTMLPanel.prototype.center = function () {
	var boundingBox = this.panelDiv.getBoundingClientRect();
	this.panelDiv.style.marginLeft = (-boundingBox.width / 2) + "px";
	this.panelDiv.style.marginTop = (-boundingBox.height / 2) + "px";
};
