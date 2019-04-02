/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/**
	@constructor
	@param {A3a.vpl.Canvas} canvas
*/
A3a.vpl.ControlBar = function (canvas) {
	this.canvas = canvas;
	/** @type {Array.<{
		draw: A3a.vpl.Canvas.controlDraw,
		action: ?A3a.vpl.Canvas.controlAction,
		doDrop: ?A3a.vpl.CanvasItem.doDrop,
		canDrop: ?A3a.vpl.CanvasItem.canDrop,
		bounds: A3a.vpl.ControlBar.Bounds
	}>} */
	this.controls = [];
	/** layout description: "X" = item, " " = separator, "s" = stretch,
 		"_" amd "S" = non-discardable sep and stretch respectively */
	this.layout = "";
	// top-left position of toolbar content, as specified by calcLayout
	this.x = 0;
	this.y = 0;
};

/** @typedef {{
		xmin: number,
		xmax: number,
		ymin: number,
		ymax: number
	}}
*/
A3a.vpl.ControlBar.Bounds;

/** Reset control bar
	@return {void}
*/
A3a.vpl.ControlBar.prototype.reset = function () {
	this.controls = [];
	this.layout = "";
};

/** Add the definition of a control button
	@param {A3a.vpl.Canvas.controlDraw} draw
	@param {A3a.vpl.ControlBar.Bounds} bounds
	@param {?A3a.vpl.Canvas.controlAction=} action
	@param {?A3a.vpl.CanvasItem.doDrop=} doDrop
	@param {?A3a.vpl.CanvasItem.canDrop=} canDrop
	@param {string=} id
	@return {void}
*/
A3a.vpl.ControlBar.prototype.addControl = function (draw, bounds, action, doDrop, canDrop, id) {
	this.controls.push({
		draw: draw,
		action: action || null,
		doDrop: doDrop || null,
		canDrop: canDrop || null,
		id: id || "",
		bounds: bounds,
		pos: 0
	});
	this.layout += "X";
};

/** Add a small space
	@param {boolean=} nonDiscardable
	@return {void}
*/
A3a.vpl.ControlBar.prototype.addSpace = function (nonDiscardable) {
	this.layout += nonDiscardable ? "_" : " ";
};

/** Add a stretching space, evenly distributed to fill the horizontal space
	@param {boolean=} nonDiscardable
	@return {void}
*/
A3a.vpl.ControlBar.prototype.addStretch = function (nonDiscardable) {
	this.layout += nonDiscardable ? "S" : "s";
};

/** Calculate block position based on a layout with items, fixed intervals, separators,
	and stretch elements
	@param {CSSParser.VPL.Box} toolbarBox
	@param {CSSParser.VPL.Box} itemBox
	@param {CSSParser.VPL.Box} separatorBox box used for separators
 	@return {void}
*/
A3a.vpl.ControlBar.prototype.calcLayout = function (toolbarBox, itemBox, separatorBox) {
	this.x = toolbarBox.x;
	this.y = toolbarBox.y;
	// remove leading and duplicate optional spaces and stretches
	var layout = this.layout
		.replace(/^[s ]+/, "")
		.replace(/[s ]+$/, "")
		.replace(/ +/g, " ")
		.replace(/s +/g, "s").replace(/ +s/g, "s")
		.replace(/s+/g, "s");
	// calc. sum of fixed sizes and count stretches
	var itemsTotalWidth = 0;
	var sepCount = 0;
	var stretchCount = 0;
	var controlIx = 0;
	var itemAdditionalWidth = itemBox.nonContentWidth();
	var itemOffset = itemBox.offsetLeft();
	for (var i = 0; i < layout.length; i++) {
		switch (layout[i]) {
		case "X":
			var bounds = this.controls[controlIx].bounds;
			itemsTotalWidth += bounds.xmax - bounds.xmin + itemAdditionalWidth;
			controlIx++;
			break;
		case " ":
		case "_":
			sepCount++;
			break;
		case "s":
		case "S":
			stretchCount++;
			break;
		}
	}
	// nominal separator gap
	var separatorGap = separatorBox.totalWidth();
	// calc. stretch size
	var stretchSize = 0;
	if (itemsTotalWidth >= toolbarBox.width) {
		// not enough room for controls without spacing
		separatorGap = 0;
	} else {
		while (true) {
			var s = itemsTotalWidth + separatorGap * sepCount;
			stretchSize = (toolbarBox.width - s) / stretchCount;
			if (stretchSize >= separatorGap || !(separatorGap > 0)) {
				break;
			}
			separatorGap /= 2;
		}
	}
	// calc. positions
	controlIx = 0;
	var p = toolbarBox.x;
	for (var i = 0; i < layout.length; i++) {
		switch (layout[i]) {
		case "X":
			var control = this.controls[controlIx++];
			if (layout[i - 1] === "X") {
				control.x = p + itemOffset;
				p += control.bounds.xmax - control.bounds.xmin + itemAdditionalWidth;
			} else {
				control.x = p + itemOffset;
				p += control.bounds.xmax - control.bounds.xmin + itemAdditionalWidth;
			}
			control.y = toolbarBox.y + toolbarBox.height / 2 - (control.bounds.ymax - control.bounds.ymin) / 2;
			break;
		case " ":
		case "_":
			p += separatorGap;
			break;
		case "s":
		case "S":
			p += stretchSize;
			break;
		}
	}
};

/** Add all controls to the canvas (should follow calcLayout)
	@param {CSSParser.VPL.Box} toolbarBox
	@param {CSSParser.VPL.Box} itemBox
	@return {void}
*/
A3a.vpl.ControlBar.prototype.addToCanvas = function (toolbarBox, itemBox) {
	var self = this;
	this.canvas.addDecoration(function (ctx) {
		toolbarBox.drawAt(ctx, self.x, self.y);
	});
	this.controls.forEach(function (control) {
		var itemBox1 = itemBox.copy();
		itemBox1.width = control.bounds.xmax - control.bounds.xmin;
		this.canvas.addControl(control.x, control.y,
			itemBox1,
			control.bounds.xmin !== 0 || control.bounds.ymin !== 0
				? function (ctx, box, isPressed) {
					ctx.save();
					ctx.translate(-control.bounds.xmin, -control.bounds.ymin);
					control.draw(ctx, box, isPressed);
					ctx.restore();
				}
				: control.draw,
			control.action,
			control.doDrop, control.canDrop,
			control.id);
	}, this);
};
