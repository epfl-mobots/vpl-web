/*
	Copyright 2018-2020 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Definition of class A3a.vpl.ControlBar, a generic toolbar for A3a.vpl.Canvas.

*/

/**
	@constructor
	@param {A3a.vpl.Canvas} canvas
*/
A3a.vpl.ControlBar = function (canvas) {
	this.canvas = canvas;
	/** @type {Array.<{
		id: string,
		draw: A3a.vpl.ControlBar.controlBarItemDraw,
		cb: ?A3a.vpl.Canvas.controlCallbacks,
		bounds: A3a.vpl.ControlBar.Bounds,
		x: number,
		y: number
	}>} */
	this.controls = [];
	/** layout description: "X" = item, " " = separator, "s" = stretch,
 		"_" amd "S" = non-discardable sep and stretch respectively */
	this.layout = "";
	// top-left position of toolbar content, as specified by calcLayout
	this.x = 0;
	this.y = 0;
};

/** Function drawing control button with origin at (0,0);
	args are ctx, box, isPressed, return value is true to display a disabled mark
	@typedef {function(CanvasRenderingContext2D,CSSParser.VPL.Box,boolean):boolean}
*/
A3a.vpl.ControlBar.controlBarItemDraw;

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
	@param {A3a.vpl.ControlBar.controlBarItemDraw} draw
	@param {A3a.vpl.ControlBar.Bounds} bounds (to scale and center drawing to fill button box)
	@param {?A3a.vpl.Canvas.controlCallbacks=} cb
	@param {string=} id
	@return {void}
*/
A3a.vpl.ControlBar.prototype.addControl = function (draw, bounds, cb, id) {
	this.controls.push({
		draw: draw,
		cb: cb || null,
		id: id || "",
		bounds: bounds,
		x: 0,
		y: 0
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
	@param {Object.<string,CSSParser.VPL.Box>} itemBoxes
	@param {CSSParser.VPL.Box=} separatorBox box used for separators
 	@return {void}
*/
A3a.vpl.ControlBar.prototype.calcLayout = function (toolbarBox, itemBoxes, separatorBox) {
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
	for (var i = 0; i < layout.length; i++) {
		switch (layout[i]) {
		case "X":
			itemsTotalWidth += itemBoxes[this.controls[controlIx].id].totalWidth();
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
	var separatorGap = separatorBox ? separatorBox.totalWidth() : 0;
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
			var control = this.controls[controlIx];
			control.x = p + itemBoxes[control.id].offsetLeft();
			p += itemBoxes[control.id].totalWidth();
			control.y = toolbarBox.y + itemBoxes[control.id].offsetTop();
			controlIx++;
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
	@param {Object.<string,CSSParser.VPL.Box>} itemBoxes
	@param {?function(string):void=} doOver
	@return {void}
*/
A3a.vpl.ControlBar.prototype.addToCanvas = function (toolbarBox, itemBoxes, doOver) {
	var self = this;
	this.canvas.addDecoration(function (ctx) {
		toolbarBox.drawAt(ctx, self.x, self.y);
	});
	this.controls.forEach(function (control) {
		this.canvas.addControl(control.x, control.y,
			itemBoxes[control.id],
			function (ctx, box, isPressed) {
				var sc = Math.min(box.width / (control.bounds.xmax - control.bounds.xmin),
					box.height / (control.bounds.ymax - control.bounds.ymin));
				ctx.save();
				ctx.translate(-control.bounds.xmin, -control.bounds.ymin);
				if (sc !== 1) {
					ctx.scale(sc, sc);
					// inverse scale box, so that control.draw can use it to position drawings
					box = box.copy();
					box.width /= sc;
					box.height /= sc;
				}
				var disableMark = control.draw(ctx, box, isPressed);
				if (disableMark) {
					self.canvas.disabledMark(0, 0, box.width, box.height, ["button"], ["button"]);
				}
				ctx.restore();
			},
			{
				action: control.cb.action || null,
				doDrop: control.cb.doDrop || null,
				canDrop: control.cb.canDrop || null,
				doOver: doOver
					? function () {
						doOver(control.id);
					}
					: null
			},
			control.id);
	}, this);
};
