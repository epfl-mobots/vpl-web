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
*/
A3a.vpl.HTMLPanel = function (html, noCloseWidget) {
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

	// close widget
	/** @type {?Element} */
	this.closeWidget = null;
	if (!noCloseWidget) {
		this.closeWidget = document.createElement("div");
		this.closeWidget.style.position = "absolute";
		this.closeWidget.style.width = "32px";
		this.closeWidget.style.height = "32px";
		this.closeWidget.style.top = "0";
		this.closeWidget.style.left = "0";
		this.closeWidget.textContent = "\u00d7";	// times
		this.closeWidget.style.font = "bold 30px sans-serif";
		this.closeWidget.style.textAlign = "left";
		this.closeWidget.style.padding = "5px";
		this.closeWidget.style.paddingLeft = "10px";
		var self = this;
		this.closeWidget.addEventListener("click", function () {
			self.hide();
		}, false);
	}
};

/** Show panel
	@return {void}
*/
A3a.vpl.HTMLPanel.prototype.show = function () {
	this.div.innerHTML = this.html;	// do it here to restart from the desired starting point
	if (this.closeWidget) {
		this.div.appendChild(this.closeWidget);
	}
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
