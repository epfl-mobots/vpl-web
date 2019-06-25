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

Modal box for the About panel, with content provided as HTML.

*/

/** About box
	@constructor
	@param {string} html html content of the about box
*/
A3a.vpl.About = function (html) {
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

	// close box
	this.closebox = document.createElement("div");
	this.closebox.style.position = "absolute";
	this.closebox.style.width = "32px";
	this.closebox.style.height = "32px";
	this.closebox.style.top = "0";
	this.closebox.style.left = "0";
	this.closebox.textContent = "\u00d7";	// times
	this.closebox.style.font = "bold 30px sans-serif";
	this.closebox.style.textAlign = "left";
	this.closebox.style.padding = "5px";
	this.closebox.style.paddingLeft = "10px";
	var self = this;
	this.closebox.addEventListener("click", function () {
		self.hide();
	}, false);
};

/** Show about box
	@return {void}
*/
A3a.vpl.About.prototype.show = function () {
	this.div.innerHTML = this.html;	// do it here to restart from the desired starting point
	this.div.appendChild(this.closebox);
	this.backgroundDiv.style.display = "block";
	this.center();
};

/** Hide about box
	@return {void}
*/
A3a.vpl.About.prototype.hide = function () {
	this.backgroundDiv.style.display = "none";
};

/** Center about box
	@return {void}
*/
A3a.vpl.About.prototype.center = function () {
	var boundingBox = this.div.getBoundingClientRect();
	this.div.style.marginLeft = (-boundingBox.width / 2) + "px";
	this.div.style.marginTop = (-boundingBox.height / 2) + "px";
};
