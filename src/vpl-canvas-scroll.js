/*
	Copyright 2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** Rectangular area with vertical scrollbar
	@constructor
	@param {number} hTotal
	@param {number=} x
	@param {number=} y
	@param {number=} w
	@param {number=} hView
*/
A3a.vpl.VertScrollArea = function (hTotal, x, y, w, hView) {
	this.hTotal = hTotal;
	/** @type {number} */
	this.x = x || 0;
	/** @type {number} */
	this.y = y || 0;
	/** @type {number} */
	this.w = w || 0;
	/** @type {number} */
	this.hView = hView || 0;

	// options
	this.leftScrollbar = false;
	this.backgroundStyle = "";

	// state
	this.vertScroll = 0;
	this.y0 = 0;
	/** @type {A3a.vpl.Canvas} */
	this.canvas = null;
};

/** Set total height
	@param {number} hTotal
	@return {void}
*/
A3a.vpl.VertScrollArea.prototype.setTotalHeight = function (hTotal) {
	this.hTotal = hTotal;

	this.vertScroll = Math.max(0, Math.min(this.vertScroll, this.hTotal - this.hView));
};

/** Resize scroll area
	@param {number} x
	@param {number} y
	@param {number} w
	@param {number} hView
	@return {void}
*/
A3a.vpl.VertScrollArea.prototype.resize = function (x, y, w, hView) {
	this.x = x;
	this.y = y;
	this.w = w;
	this.hView = hView;

	this.vertScroll = Math.max(0, Math.min(this.vertScroll, this.hTotal - this.hView));
};

/** Begin adding items to the scrolling area
	@param {A3a.vpl.Canvas} canvas
	@return {void}
*/
A3a.vpl.VertScrollArea.prototype.begin = function (canvas) {
	this.canvas = canvas;
	var self = this;
	var item = new A3a.vpl.CanvasItem(null,
		this.w, this.hView, this.x, this.y,
		null,
		this.hTotal > this.hView
			? {
				/** @type {A3a.vpl.CanvasItem.mousedown} */
				mousedown: function (canvas, data, width, height, x, y, downEvent) {
					self.y0 = downEvent.y;
					return 0;
				},
				/** @type {A3a.vpl.CanvasItem.mousedrag} */
				mousedrag: function (canvas, data, dragging, width, height, x, y, dragEvent) {
					var delta = Math.max(Math.min(
						dragEvent.y - self.y0,	// mouse-specified shift
						self.vertScroll),	// min
						self.vertScroll - self.hTotal + self.hView);	// max
					self.vertScroll -= delta;
					self.y0 += delta;
				}
			}
			: null,
		null,
		null);
	item.draggable = false;
	item.doScroll = function (dx, dy) {
		self.scrollCanvas(dy);
		canvas.onUpdate();
	};
	canvas.setItem(item);

	// background
	if (this.backgroundStyle) {
		canvas.addDecoration(function (ctx) {
			ctx.save();
			ctx.fillStyle = self.backgroundStyle;
			ctx.fillRect(self.x, self.y, self.w, self.hView);
			ctx.restore();
		});
	}

	// scrollbar
	if (this.hTotal > this.hView) {
		canvas.addDecoration(function (ctx) {
			var scrollbarRelLength = self.hView / self.hTotal;
			var scrollbarAbsLength = Math.max(scrollbarRelLength * self.hView,
				Math.min(20, self.hView));
			var scrollbarMaxMotion = self.hView - scrollbarAbsLength;
			var scrollbarRelMotion = self.vertScroll / (self.hTotal - self.hView);
			var scrollbarMotion = scrollbarRelMotion * scrollbarMaxMotion;
			ctx.save();
			ctx.fillStyle = canvas.dims.scrollbarBackgroundColor;
			ctx.fillRect(self.leftScrollbar ? self.x - 2 - canvas.dims.scrollbarWidth : self.x + self.w + 2,
				self.y,
				canvas.dims.scrollbarWidth, self.hView);
			ctx.fillStyle = canvas.dims.scrollbarThumbColor;
			ctx.fillRect(self.leftScrollbar ? self.x - 2 - canvas.dims.scrollbarWidth : self.x + self.w + 2,
				self.y + scrollbarMotion,
				canvas.dims.scrollbarWidth, scrollbarAbsLength);
			ctx.restore();
		});
	}

	canvas.beginClip(this.x, this.y, this.w, this.hView,
		0, -this.vertScroll);
};

/** End adding items to the scrolling area
	@return {void}
*/
A3a.vpl.VertScrollArea.prototype.end = function () {
	this.canvas.endClip();
};

/** Scroll canvas, typically because of wheel or keyboard event
	@param {number} dy
	@return {void}
*/
A3a.vpl.VertScrollArea.prototype.scrollCanvas = function (dy) {
	this.vertScroll += dy;
};

/** Check if scroll is commpletely up
	@return {boolean}
*/
A3a.vpl.VertScrollArea.prototype.isTop = function () {
	return this.vertScroll <= this.hView * 0.001;
};

/** Check if scroll is commpletely down
	@return {boolean}
*/
A3a.vpl.VertScrollArea.prototype.isBottom = function () {
	return this.vertScroll >= this.hTotal - this.hView * 1.001;
};
