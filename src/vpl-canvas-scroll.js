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

Definition of class A3a.vpl.ScrollArea which adds area with scrolling
capability along horizontal and/or vertical axes and scrollbars to
A3a.vpl.Canvas.

*/

/** Rectangular area with horizontal and/or vertical scrollbar
	@constructor
	@param {number} wTotal
	@param {number} hTotal
	@param {number=} x
	@param {number=} y
	@param {number=} wView
	@param {number=} hView
*/
A3a.vpl.ScrollArea = function (wTotal, hTotal, x, y, wView, hView) {
	this.wTotal = wTotal;
	this.hTotal = hTotal;
	/** @type {number} */
	this.x = x || 0;
	/** @type {number} */
	this.y = y || 0;
	/** @type {number} */
	this.wView = wView || 0;
	/** @type {number} */
	this.hView = hView || 0;

	// options
	this.topScrollbar = false;
	this.leftScrollbar = false;
	this.backgroundStyle = "";

	// state
	this.horScroll = 0;
	this.x0 = 0;
	this.vertScroll = 0;
	this.y0 = 0;
	/** @type {A3a.vpl.Canvas} */
	this.canvas = null;
};

/** Set total width
	@param {number} wTotal
	@return {void}
*/
A3a.vpl.ScrollArea.prototype.setTotalWidth = function (wTotal) {
	this.wTotal = wTotal;

	this.horScroll = Math.max(0, Math.min(this.horScroll, this.wTotal - this.wView));
};

/** Set total height
	@param {number} hTotal
	@return {void}
*/
A3a.vpl.ScrollArea.prototype.setTotalHeight = function (hTotal) {
	this.hTotal = hTotal;

	this.vertScroll = Math.max(0, Math.min(this.vertScroll, this.hTotal - this.hView));
};

/** Resize scroll area
	@param {number} x
	@param {number} y
	@param {number} wView
	@param {number} hView
	@return {void}
*/
A3a.vpl.ScrollArea.prototype.resize = function (x, y, wView, hView) {
	this.x = x;
	this.y = y;
	this.wView = wView;
	this.hView = hView;

	this.horScroll = Math.max(0, Math.min(this.horScroll, this.wTotal - this.wView));
	this.vertScroll = Math.max(0, Math.min(this.vertScroll, this.hTotal - this.hView));
};

/** Begin adding items to the scrolling area
	@param {A3a.vpl.Canvas} canvas
	@return {void}
*/
A3a.vpl.ScrollArea.prototype.begin = function (canvas) {
	this.canvas = canvas;
	var self = this;
	var item = new A3a.vpl.CanvasItem(null,
		this.wView, this.hView, this.x, this.y,
		null,
		this.wTotal > this.wView || this.hTotal > this.hView
			? {
				/** @type {A3a.vpl.CanvasItem.mousedown} */
				mousedown: function (canvas, data, width, height, x, y, downEvent) {
					self.x0 = downEvent.x;
					self.y0 = downEvent.y;
					return 0;
				},
				/** @type {A3a.vpl.CanvasItem.mousedrag} */
				mousedrag: function (canvas, data, dragging, width, height, x, y, dragEvent) {
					var deltaX = Math.max(Math.min(
						dragEvent.x - self.x0,	// mouse-specified shift
						self.horScroll),	// min
						self.horScroll - self.wTotal + self.wView);	// max
					self.horScroll -= deltaX;
					self.x0 += deltaX;

					var deltaY = Math.max(Math.min(
						dragEvent.y - self.y0,	// mouse-specified shift
						self.vertScroll),	// min
						self.vertScroll - self.hTotal + self.hView);	// max
					self.vertScroll -= deltaY;
					self.y0 += deltaY;
				}
			}
			: null,
		null,
		null);
	item.draggable = false;
	item.doScroll = function (dx, dy) {
		self.scrollCanvas(dx, dy);
		canvas.onUpdate();
	};
	canvas.setItem(item);

	// background
	if (this.backgroundStyle) {
		canvas.addDecoration(function (ctx) {
			ctx.save();
			ctx.fillStyle = self.backgroundStyle;
			ctx.fillRect(self.x, self.y, self.wView, self.hView);
			ctx.restore();
		});
	}

	// scrollbar(s)
	if (this.wTotal > this.wView || this.hTotal > this.hView) {
		canvas.addDecoration(function (ctx) {
			ctx.save();

			// horizontal scrollbar
			if (self.wTotal > self.wView) {
				var scrollbarRelLength = self.wView / self.wTotal;
				var scrollbarAbsLength = Math.max(scrollbarRelLength * self.wView,
					Math.min(20, self.wView));
				var scrollbarMaxMotion = self.wView - scrollbarAbsLength;
				var scrollbarRelMotion = self.horScroll / (self.wTotal - self.wView);
				var scrollbarMotion = scrollbarRelMotion * scrollbarMaxMotion;
				ctx.fillStyle = canvas.dims.scrollbarBackgroundColor;
				ctx.fillRect(self.x,
					self.topScrollbar ? self.y - 2 - canvas.dims.scrollbarWidth : self.y + self.hView + 2,
					self.wView, canvas.dims.scrollbarWidth);
				ctx.fillStyle = canvas.dims.scrollbarThumbColor;
				ctx.fillRect(self.x + scrollbarMotion,
					self.topScrollbar ? self.y - 2 - canvas.dims.scrollbarWidth : self.y + self.hView + 2,
					scrollbarAbsLength, canvas.dims.scrollbarWidth);
			}

			// vertical scrollbar
			if (self.hTotal > self.hView) {
				var scrollbarRelLength = self.hView / self.hTotal;
				var scrollbarAbsLength = Math.max(scrollbarRelLength * self.hView,
					Math.min(20, self.hView));
				var scrollbarMaxMotion = self.hView - scrollbarAbsLength;
				var scrollbarRelMotion = self.vertScroll / (self.hTotal - self.hView);
				var scrollbarMotion = scrollbarRelMotion * scrollbarMaxMotion;
				ctx.save();
				ctx.fillStyle = canvas.dims.scrollbarBackgroundColor;
				ctx.fillRect(self.leftScrollbar ? self.x - 2 - canvas.dims.scrollbarWidth : self.x + self.wView + 2,
					self.y,
					canvas.dims.scrollbarWidth, self.hView);
				ctx.fillStyle = canvas.dims.scrollbarThumbColor;
				ctx.fillRect(self.leftScrollbar ? self.x - 2 - canvas.dims.scrollbarWidth : self.x + self.wView + 2,
					self.y + scrollbarMotion,
					canvas.dims.scrollbarWidth, scrollbarAbsLength);
			}

			ctx.restore();
		});
	}

	canvas.beginClip(this.x, this.y, this.wView, this.hView,
		-this.horScroll, -this.vertScroll);
};

/** End adding items to the scrolling area
	@return {void}
*/
A3a.vpl.ScrollArea.prototype.end = function () {
	this.canvas.endClip();
};

/** Scroll canvas, typically because of wheel or keyboard event
	@param {number} dx
	@param {number} dy
	@return {void}
*/
A3a.vpl.ScrollArea.prototype.scrollCanvas = function (dx, dy) {
	this.horScroll += dx;
	this.vertScroll += dy;
};

/** Minimum scroll to show entirely a rectangle, or at least top left corner
	@param {number} left
	@param {number} right
	@return {void}
*/
A3a.vpl.ScrollArea.prototype.scrollToShowHorSpan = function (left, right) {
	if (right - this.horScroll > this.wView) {
		this.horScroll = right - this.wView;
	}
	if (left < this.horScroll) {
		this.horScroll = left;
	}
};

/** Minimum scroll to show entirely a rectangle, or at least top left corner
	@param {number} top
	@param {number} bottom
	@return {void}
*/
A3a.vpl.ScrollArea.prototype.scrollToShowVertSpan = function (top, bottom) {
	if (bottom - this.vertScroll > this.hView) {
		this.vertScroll = bottom - this.hView;
	}
	if (top < this.vertScroll) {
		this.vertScroll = top;
	}
};

/** Check if scroll is commpletely left
	@return {boolean}
*/
A3a.vpl.ScrollArea.prototype.isLeft = function () {
	return this.horScroll <= this.wView * 0.001;
};

/** Check if scroll is commpletely right
	@return {boolean}
*/
A3a.vpl.ScrollArea.prototype.isRight = function () {
	return this.horScroll >= this.wTotal - this.wView * 1.001;
};

/** Check if scroll is commpletely up
	@return {boolean}
*/
A3a.vpl.ScrollArea.prototype.isTop = function () {
	return this.vertScroll <= this.hView * 0.001;
};

/** Check if scroll is commpletely down
	@return {boolean}
*/
A3a.vpl.ScrollArea.prototype.isBottom = function () {
	return this.vertScroll >= this.hTotal - this.hView * 1.001;
};
