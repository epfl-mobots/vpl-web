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

Modal box for selecting a file.

*/

/** Load modal box
	@param {A3a.vpl.Application} app
	@param {?{
		noCloseWidget: (boolean | undefined),
		otherWidgets: (Array.<{title:string,htmlElement:?string,fun:function():void}> | undefined),
		scroll: (boolean | undefined),
		onShow: ((function():void) | null | undefined),
		onHide: ((function():void) | null | undefined)
	}=} options options
	(onShow: function called when showing the panel (can install keyboard handler);
	onHide: function called when hiding the panel (can remove keyboard handler))
	@constructor
*/
A3a.vpl.Load = function (app, options) {
	var self = this;

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
	this.div.style.width = "40em";
	this.div.style.position = "fixed";
	this.div.style.top = "50%";
	this.div.style.left = "50%";
	this.div.style.backgroundColor = "white";
	this.div.style.padding = "2em";
	this.backgroundDiv.appendChild(this.div);
	document.body.appendChild(this.backgroundDiv);

	var el = document.createElement("p");
	this.titleElement = el;
	this.div.appendChild(el);
	el = document.createElement("table");
	el.style.width = "100%";
	this.div.appendChild(el);
	var tr = document.createElement("tr");
	el.appendChild(tr);
	var td = document.createElement("td");
	tr.appendChild(td);
	this.input = document.createElement("input");
	this.input.setAttribute("type", "file");
	this.input.style.width = "35em";
	td.appendChild(this.input);

	td = document.createElement("td");
	td.align = "right";
	tr.appendChild(td);
	var button = document.createElement("input");
	button.setAttribute("type", "button");
	button.setAttribute("value", app.i18n.translate("OK"));
	button.addEventListener("click", function () {
		var file = self.input.files[0];
		if (file) {
			self.loadFun(file);
		}
		self.hide();
	}, false);
	td.appendChild(button);

	td.appendChild(document.createTextNode("\u00a0\u00a0"));	// nbsp

	button = document.createElement("input");
	button.setAttribute("type", "button");
	button.setAttribute("value", app.i18n.translate("Cancel"));
	button.addEventListener("click", function () {
		self.hide();
	}, false);
	td.appendChild(button);

	// close box
	var closebox = document.createElement("div");
	closebox.style.position = "absolute";
	closebox.style.width = "32px";
	closebox.style.height = "32px";
	closebox.style.top = "0";
	closebox.style.left = "0";
	closebox.textContent = "\u00d7";	// times
	closebox.style.font = "bold 30px sans-serif";
	closebox.style.textAlign = "left";
	closebox.style.padding = "5px";
	closebox.style.paddingLeft = "10px";
	closebox.addEventListener("click", function () {
		self.hide();
	}, false);
	el.appendChild(closebox);

	this.i18n = app.i18n;
	this.loadFun = null;

	this.onShow = options && options.onShow || null;
	this.onHide = options && options.onHide || null;
};

/** Show Load modal box
	@param {string} title
	@param {string} accept file input attribute "accept"
	(comma-separated dotted file extensions
	@param {function(File):void} loadFun
	@return {void}
*/
A3a.vpl.Load.prototype.show = function (title, accept, loadFun) {
	this.titleElement.textContent = this.i18n.translate(title);
	this.input.setAttribute("accept", accept);
	this.loadFun = loadFun;

	this.backgroundDiv.style.display = "block";
	var boundingBox = this.div.getBoundingClientRect();
	this.div.style.marginLeft = (-boundingBox.width / 2) + "px";
	this.div.style.marginTop = (-boundingBox.height / 2) + "px";

	if (this.onShow) {
		this.onShow();
	}
};

/** Hide Load modal box
	@return {void}
*/
A3a.vpl.Load.prototype.hide = function () {
	this.backgroundDiv.style.display = "none";
	if (this.onHide) {
		this.onHide();
	}
};
