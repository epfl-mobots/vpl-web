/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/**
	@constructor
	@param {A3a.vpl.Canvas} canvas
*/
A3a.vpl.ControlBar = function (canvas) {
	this.canvas = canvas;
	/** @type {Array.<{
		draw: A3a.vpl.CanvasItem.draw,
		mousedown: ?A3a.vpl.CanvasItem.mousedown,
		doDrop: ?A3a.vpl.CanvasItem.doDrop,
		canDrop: ?A3a.vpl.CanvasItem.canDrop,
		pos: number
	}>} */
	this.controls = [];
	/** layout description: "X" = item, " " = separator, "s" = stretch */
	this.layout = "";
};

/** Reset control bar
	@return {void}
*/
A3a.vpl.ControlBar.prototype.reset = function () {
	this.controls = [];
	this.layout = "";
};

/** Add the definition of a control button
	@param {A3a.vpl.CanvasItem.draw} draw
	@param {?A3a.vpl.CanvasItem.mousedown=} mousedown
	@param {?A3a.vpl.CanvasItem.doDrop=} doDrop
	@param {?A3a.vpl.CanvasItem.canDrop=} canDrop
	@return {void}
*/
A3a.vpl.ControlBar.prototype.addControl = function (draw, mousedown, doDrop, canDrop) {
	this.controls.push({
		draw: draw,
		mousedown: mousedown || null,
		doDrop: doDrop || null,
		canDrop: canDrop || null,
		pos: 0
	});
	this.layout += "X";
};

/** Add a small space
	@return {void}
*/
A3a.vpl.ControlBar.prototype.addSpace = function () {
	this.layout += " ";
};

/** Add a stretching space, evenly distributed to fill the horizontal space
	@return {void}
*/
A3a.vpl.ControlBar.prototype.addStretch = function () {
	this.layout += "s";
};

/** Calculate block position based on a layout with items, fixed intervals, separators,
	and stretch elements
	@param {number} pMin min position (left margin)
	@param {number} pMax max position (right margin)
	@param {number} itemSize item size
	@param {number} gap normal gap
	@param {number} separatorGap large gap used for separators
 	@return {void}
*/
A3a.vpl.ControlBar.prototype.calcLayout = function (pMin, pMax, itemSize, gap, separatorGap) {
	// calc. sum of fixed sizes and count stretches
	var totalFixedSize = 0;
	var stretchCount = 0;
	var s = 0;
	for (var i = 0; i < this.layout.length; i++) {
		switch (this.layout[i]) {
		case "X":
			s += this.layout[i - 1] === "X" ? gap + itemSize : itemSize;
			break;
		case " ":
			s += separatorGap;
			break;
		case "s":
			stretchCount++;
			break;
		}
	}
	// calc. stretch size
	var stretchSize = (pMax - pMin - s) / stretchCount;
	// calc. positions
	var controlIx = 0;
	var p = pMin;
	for (var i = 0; i < this.layout.length; i++) {
		switch (this.layout[i]) {
		case "X":
			if (this.layout[i - 1] === "X") {
				this.controls[controlIx++].pos = p + gap;
				p += gap + itemSize;
			} else {
				this.controls[controlIx++].pos = p;
				p += itemSize;
			}
			break;
		case " ":
			p += separatorGap;
			break;
		case "s":
			p += stretchSize;
			break;
		}
	}
};

/** Add all controls to the canvas (should follow calcLayout)
	@return {void}
*/
A3a.vpl.ControlBar.prototype.addToCanvas = function () {
	for (var i = 0; i < this.controls.length; i++) {
		this.canvas.addControl(this.controls[i].pos, this.canvas.dims.margin,
			this.canvas.dims.controlSize, this.canvas.dims.controlSize,
			this.controls[i].draw, this.controls[i].mousedown, this.controls[i].doDrop, this.controls[i].canDrop);
	}
};
