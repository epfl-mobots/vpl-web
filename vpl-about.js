/*
	Copyright 2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** About box
	@constructor
	@param {string} textareaId id of textarea element, which should be
	enclosed in a div and follow a pre
	@param {string} preId id of pre element for line numbers (element before textarea)
	@param {number=} topMargin
	@param {number=} leftMargin
*/
A3a.vpl.About = function (html) {
	this.html = html;

	this.backgroundDiv = document.createElement("div");
	this.backgroundDiv.style.width = "100%";
	this.backgroundDiv.style.height = "100%";
	this.backgroundDiv.style.position = "fixed";
	this.backgroundDiv.style.top = "0";
	this.backgroundDiv.style.left = "0";
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

	var self = this;
	this.backgroundDiv.addEventListener("click", function () {
		self.hide();
	}, false);
};

A3a.vpl.About.prototype.show = function () {
	this.div.innerHTML = this.html;	// do it here to restart from the desired starting point
	this.backgroundDiv.style.display = "block";
	var boundingBox = this.div.getBoundingClientRect();
	this.div.style.marginLeft = (-boundingBox.width / 2) + "px";
	this.div.style.marginTop = (-boundingBox.height / 2) + "px";
};

A3a.vpl.About.prototype.hide = function () {
	this.backgroundDiv.style.display = "none";
};
