/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/**
	@constructor
	@struct
	@param {*} data
	@param {number} width
	@param {number} height
	@param {number} x
	@param {number} y
	@param {?A3a.vpl.CanvasItem.draw} draw
	@param {?{
		mousedown:(A3a.vpl.CanvasItem.mousedown|null|undefined),
		mousedrag:(A3a.vpl.CanvasItem.mousedrag|null|undefined),
		mouseup:(A3a.vpl.CanvasItem.mouseup|null|undefined)
	}=} interactiveCB
	@param {?A3a.vpl.CanvasItem.doDrop=} doDrop
	@param {?A3a.vpl.CanvasItem.canDrop=} canDrop
	@param {string=} id identifier
*/
A3a.vpl.CanvasItem = function (data, width, height, x, y, draw, interactiveCB, doDrop, canDrop, id) {
	this.data = data;
	this.width = width;
	this.height = height;
	this.x = x;
	this.y = y;
	/** @type {?A3a.vpl.Canvas.ClippingRect} */
	this.clippingRect = null;
	/** @type {Array.<A3a.vpl.CanvasItem>} */
	this.attachedItems = [];
	this.drawContent = draw;
	/** @type {?A3a.vpl.CanvasItem.draw} */
	this.drawOverlay = null;
	this.clickable = true;
	this.draggable = true;
	this.interactiveCB = interactiveCB || null;
	this.doDrop = doDrop || null;
	this.canDrop = canDrop || null;
	this.noDropHint = false;	// true to avoid drawing a gray rect upon canDrop
	this.dropTarget = false;	// true when canDrop, when a hint would be drawn if !noDropHint
	/** @type {?A3a.vpl.CanvasItem.doScroll} */
	this.doScroll = null;
	this.id = id || "";
	/** @type {?function(A3a.vpl.CanvasItem):A3a.vpl.CanvasItem} */
	this.zoomOnLongPress = null;
	/** @type {?function():void} */
	this.onUpdate = null;
	/** @type {*} */
	this.dragging = null;
};

/** Attach another item which will follow this during a drag
	@param {A3a.vpl.CanvasItem} item
	@return {void}
*/
A3a.vpl.CanvasItem.prototype.attachItem = function (item) {
	this.attachedItems.push(item);
};

/** Make a clone of this
	@return {A3a.vpl.CanvasItem}
*/
A3a.vpl.CanvasItem.prototype.clone = function () {
	var c = new A3a.vpl.CanvasItem(this.data,
		this.width, this.height,
		this.x, this.y,
		this.drawContent,
		this.interactiveCB,
		this.doDrop,
		this.canDrop,
		this.id);
	c.drawOverlay = this.drawOverlay;
	return c;
};

/** Draw item
	@param {CanvasRenderingContext2D} ctx
	@param {number=} dx horizontal offset wrt original position, or not supplied
	to draw at the original position with clipping
	@param {number=} dy vertical offset wrt original position
	@param {boolean=} overlay true to call drawOverlay, false to call drawContent
	@return {void}
*/
A3a.vpl.CanvasItem.prototype.draw = function (ctx, dx, dy, overlay) {
	var clipped = this.clippingRect && dx === undefined;
	if (clipped) {
		ctx.save();
		ctx.beginPath();
		ctx.rect(this.clippingRect.x, this.clippingRect.y,
			this.clippingRect.w, this.clippingRect.h);
		ctx.clip();
		dx = this.clippingRect.xOffset;
		dy = this.clippingRect.yOffset;
	}
	if (overlay) {
		this.drawOverlay && this.drawOverlay(ctx, this, dx || 0, dy || 0);
	} else {
		this.drawContent && this.drawContent(ctx, this, dx || 0, dy || 0);
	}
	if (clipped) {
		ctx.restore();
	}
};

/** Apply the clipping rect of an item (should be bracketted by save/restore)
	@param {CanvasRenderingContext2D} ctx
	@return {void}
*/
A3a.vpl.CanvasItem.prototype.applyClipping = function (ctx) {
	if (this.clippingRect) {
		ctx.beginPath();
		ctx.rect(this.clippingRect.x, this.clippingRect.y,
			this.clippingRect.w, this.clippingRect.h);
		ctx.clip();
	}
};

/**
	@typedef {function(CanvasRenderingContext2D,A3a.vpl.CanvasItem,number,number):void}
*/
A3a.vpl.CanvasItem.draw;

/**
	@typedef {{x:number,y:number,modifier:boolean}}
*/
A3a.vpl.CanvasItem.mouseEvent;

/**
	@typedef {function(A3a.vpl.Canvas,*,number,number,number,number,A3a.vpl.CanvasItem.mouseEvent):?number}
*/
A3a.vpl.CanvasItem.mousedown;

/**
	@typedef {function(A3a.vpl.Canvas,*,number,number,number,number,number,A3a.vpl.CanvasItem.mouseEvent):void}
*/
A3a.vpl.CanvasItem.mousedrag;

/**
	@typedef {function(A3a.vpl.Canvas,*,number):void}
*/
A3a.vpl.CanvasItem.mouseup;

/**
	@typedef {function(A3a.vpl.CanvasItem,A3a.vpl.CanvasItem):void}
	(arguments: target item, dropped item)
*/
A3a.vpl.CanvasItem.doDrop;

/**
	@typedef {function(*,*):boolean} (arguments: target, dropped data)
*/
A3a.vpl.CanvasItem.canDrop;

/**
	@typedef {function(number,number):void} (arguments: dx, dy)
*/
A3a.vpl.CanvasItem.doScroll;

A3a.vpl.CanvasItem.prototype.getTranslation = function () {
	return this.clippingRect
		? {dx: this.clippingRect.xOffset, dy: this.clippingRect.yOffset}
		: {dx: 0, dy: 0};
};

/** Check if position is inside the clipping rect
	@param {number} x
	@param {number} y
	@return {boolean}
*/
A3a.vpl.CanvasItem.prototype.isInClip = function (x, y) {
	return !this.clippingRect
		|| (x >= this.clippingRect.x && x < this.clippingRect.x + this.clippingRect.w
			&& y >= this.clippingRect.y && y < this.clippingRect.y + this.clippingRect.h);
};

/**
	@constructor
	@struct
	@param {Element} canvas
*/
A3a.vpl.Canvas = function (canvas) {
	var backingScale = "devicePixelRatio" in window ? window["devicePixelRatio"] : 1;
	this.canvas = canvas;
	this.width = canvas.width / backingScale;
	this.height = canvas.height / backingScale;
	/** @type {?Array.<number>} */
	this.transform = null;
	/** @type {CanvasRenderingContext2D} */
	this.ctx = this.canvas.getContext("2d");
	/** @type {Object} */
	this.state = null;	// client data used by callbacks (scroll positions etc.)
	/** @type {?function(number,number):void} */
	this.wheel = null;

	this.clickTimestamp = 0;
	this.zoomedItemIndex = -1;
	/** @type {A3a.vpl.CanvasItem} */
	this.zoomedItemProxy = null;

	/** @type {{id:(string|undefined),rect:({x:number,y:number,w:number,h:number}|undefined),isInside:(boolean|undefined)}} */
	this.downControl = {};

	this.clientData = {};	// can be used to store client data

	/** @type {A3a.vpl.Canvas.dims} */
	this.dims = /** @type {A3a.vpl.Canvas.dims} */(null);
	this.resize(this.width, this.height);	// force set this.dims

	var self = this;

	/** Handle mousedown event
		@param {Event} downEvent
		@return {void}
	*/
	function mousedown(downEvent) {
		var mouseEvent = self.makeMouseEvent(downEvent);

		function startInteraction(item) {
			var canvasBndRect = self.canvas.getBoundingClientRect();
			item.dragging = item.interactiveCB.mousedown(self, item.data,
				item.width, item.height,
				canvasBndRect.left + item.x,
				canvasBndRect.top + item.y,
				mouseEvent);
			if (item.dragging !== null) {
				// call immediately
				item.interactiveCB.mousedrag
					&& item.interactiveCB.mousedrag(self, item.data,
						/** @type {number} */(item.dragging),
						item.width, item.height,
						canvasBndRect.left + item.x,
						canvasBndRect.top + item.y,
						mouseEvent);
				self.onUpdate && self.onUpdate();
				// continue with window-level handler
				A3a.vpl.dragFun = item.interactiveCB.mousedrag
					? function (e, isUp) {
						if (!isUp) {
							item.interactiveCB.mousedrag(self, item.data,
								/** @type {number} */(item.dragging),
								item.width, item.height,
								canvasBndRect.left + item.x,
								canvasBndRect.top + item.y,
								self.makeMouseEvent(e));
							self.onUpdate && self.onUpdate();
						} else if (item.interactiveCB.mouseup) {
							item.interactiveCB.mouseup(self, item.data,
								/** @type {number} */(item.dragging));
							self.onUpdate && self.onUpdate();
						}
					}
					: null;
				self.onUpdate && self.onUpdate();
				return true;
			}
			return false;
		}

		if (self.isZoomedItemProxyClicked(mouseEvent)) {
			var item = self.zoomedItemProxy;
			if (item.interactiveCB) {
				startInteraction(item);
			}
			return;
		} else if (self.zoomedItemProxy) {
			self.zoomedItemIndex = -1;
			self.zoomedItemProxy = null;
			self.onUpdate && self.onUpdate();
			return;
		}

		var indices = self.clickedItemIndex(mouseEvent, true);
		if (indices.length > 0) {
			var item = self.items[indices[0]];
			if (self.zoomedItemIndex >= 0 && self.zoomedItemIndex !== indices[0]) {
				self.zoomedItemIndex = -1;
				self.zoomedItemProxy = null;
			}
			self.clickTimestamp = Date.now();
			if (item.interactiveCB) {
				if (item.zoomOnLongPress && self.zoomedItemIndex !== indices[0]) {
					// continue with item drag callback
				} else {
					if (startInteraction(item)) {
						return;	// no item drag if intercepted by mousedown
					}
				}
			}
			if (item.draggable) {
				// drag item itself
				/** @type {A3a.vpl.CanvasItem} */
				var dropTargetItem = null;
				var d = item.getTranslation();
				var x0 = mouseEvent.x - d.dx;
				var y0 = mouseEvent.y - d.dy;
				A3a.vpl.dragFun = function (dragEvent, isUp) {
					var mouseEvent = self.makeMouseEvent(dragEvent);
					if (isUp) {
						if (item.zoomOnLongPress && item === self.items[self.clickedItemIndex(mouseEvent, false)[0]]) {
							self.zoomedItemIndex = indices[0];
							self.zoomedItemProxy = item.zoomOnLongPress(item);
						} else if (dropTargetItem && dropTargetItem.doDrop
							&& (!dropTargetItem.canDrop || dropTargetItem.canDrop(dropTargetItem, item))) {
							dropTargetItem.doDrop(dropTargetItem, item);
						}
						self.redraw();
						self.canvas.style.cursor = "default";
					} else {
						var targetIndices = self.clickedItemIndex(mouseEvent, false);
						dropTargetItem = null;
						var canDrop = false;
						for (var i = 0; !canDrop && i < targetIndices.length; i++) {
							dropTargetItem = self.items[targetIndices[i]];
							canDrop = dropTargetItem.doDrop
								&& (!dropTargetItem.canDrop || dropTargetItem.canDrop(dropTargetItem, item));
						}
						if (dropTargetItem != null) {
							dropTargetItem.dropTarget = true;
							self.redraw();
							dropTargetItem.dropTarget = false;
						} else {
							self.redraw();
						}
						var ctx = self.ctx;
						if (canDrop && !dropTargetItem.noDropHint) {
							// draw frame around target
							ctx.save();
							if (self.transform) {
								ctx.translate(self.width / 2, self.height / 2);
								CanvasRenderingContext2D.prototype.transform.apply(ctx, self.transform);
								ctx.translate(-self.width / 2, -self.height / 2);
							}
							dropTargetItem.applyClipping(ctx);
							ctx.lineWidth = 2 * self.dims.blockLineWidth;
							ctx.strokeStyle = "#aaa";
							var d = dropTargetItem.getTranslation();
							ctx.strokeRect(dropTargetItem.x + d.dx, dropTargetItem.y + d.dy,
								dropTargetItem.width, dropTargetItem.height);
							ctx.restore();
						}
						ctx.save();
						if (self.transform) {
							ctx.translate(self.width / 2, self.height / 2);
							CanvasRenderingContext2D.prototype.transform.apply(ctx, self.transform);
							ctx.translate(-self.width / 2, -self.height / 2);
						}
						ctx.globalAlpha = 0.5;
						item.draw(ctx, mouseEvent.x - x0, mouseEvent.y - y0);
						item.attachedItems.forEach(function (attachedItem) {
							attachedItem.draw(ctx, mouseEvent.x - x0, mouseEvent.y - y0);
							attachedItem.draw(ctx, mouseEvent.x - x0, mouseEvent.y - y0, true);
						});
						item.draw(ctx, mouseEvent.x - x0, mouseEvent.y - y0, true);
						ctx.restore();
						self.canvas.style.cursor = canDrop ? "copy" : "default";
					}
				};
			}
		} else if (self.zoomedItemIndex >= 0) {
			self.zoomedItemIndex = -1;
			self.zoomedItemProxy = null;
			self.redraw();
		}
	}

	canvas.addEventListener("mousedown", mousedown, false);
	canvas.addEventListener("touchstart", function (ev) {
		var touches = ev.targetTouches;
		if (touches.length === 1) {
			ev.preventDefault();
			mousedown(touches[0]);
			A3a.vpl.lastTouch = touches[0];
		}
	}, false);

	canvas.addEventListener("wheel", function (wheelEvent) {
		function doScroll(item) {
			if (item.doScroll) {
				wheelEvent.preventDefault();
				var dx = wheelEvent["deltaMode"] === 0 ? wheelEvent["deltaX"]
					: wheelEvent["deltaMode"] === 1 ? wheelEvent["deltaX"] * 10
					: wheelEvent["deltaX"] * 30;
				var dy = wheelEvent["deltaMode"] === 0 ? wheelEvent["deltaY"]
					: wheelEvent["deltaMode"] === 1 ? wheelEvent["deltaY"] * 10
					: wheelEvent["deltaY"] * 30;
				item.doScroll(dx, dy);
			}
		}

		var mouseEvent = self.makeMouseEvent(wheelEvent);
		if (self.isZoomedItemProxyClicked(mouseEvent)) {
			self.zoomedItemProxy && doScroll(self.zoomedItemProxy);
		} else if (self.zoomedItemIndex < 0) {
			var indices = self.clickedItemIndex(mouseEvent, true);
			// pick the top-most item with doScroll
			for (var i = 0; i < indices.length; i++) {
				if (self.items[indices[i]].doScroll != null) {
					doScroll(self.items[indices[i]]);
					break;
				}
			}
		}
	}, false);

	/** @type {Array.<A3a.vpl.CanvasItem>} */
	this.items = [];
	/** @type {Array.<A3a.vpl.Canvas.ClippingRect>} */
	this.clipStack = [];
	/** @type {?function():void} */
	this.onUpdate = null;
};

/** Set the css filter of the canvas element
	@param {string} filter
	@return {void}
*/
A3a.vpl.Canvas.prototype.setFilter = function (filter) {
	this.canvas["style"]["filter"] = filter;
};

/** Apply transform to point
	@param {Array.<number>} p point in R^2
	@return {Array.<number>} transformed point in R^2
*/
A3a.vpl.Canvas.prototype.applyTransform = function (p) {
	var T = this.transform;
	if (T) {
		// T -> translate(w/2,h/2) T translate(-w/2,-h/2)
		var w2 = this.width / 2;
		var h2 = this.height / 2;
		T = T.slice(0, 4).concat(
			T[4] - w2 * T[0] - h2 * T[2] + w2,
			T[5] - w2 * T[1] - h2 * T[3] + h2
		);

		return [
			T[0] * p[0] + T[2] * p[1] + T[4],
			T[1] * p[0] + T[3] * p[1] + T[5]
		];
	} else {
		return p;
	}
};

/** Apply inverse transform to point
	@param {Array.<number>} p point in R^2
	@return {Array.<number>} inverse-transformed point in R^2
*/
A3a.vpl.Canvas.prototype.applyInverseTransform = function (p) {
	var T = this.transform;
	if (T) {
		// T -> translate(w/2,h/2) T translate(-w/2,-h/2)
		var w2 = this.width / 2;
		var h2 = this.height / 2;
		T = T.slice(0, 4).concat(
			T[4] - w2 * T[0] - h2 * T[2] + w2,
			T[5] - w2 * T[1] - h2 * T[3] + h2
		);

		var det = T[0] * T[3] - T[1] * T[2];
		return [
			(T[3] * p[0] - T[2] * p[1] + T[2] * T[5] - T[3] * T[4]) / det,
			(-T[1] * p[0] + T[0] * p[1] + T[1] * T[4] - T[0] * T[5]) / det
		];
	} else {
		return p;
	}
};

/** Convert browser's mouse Event object to
	@param {Event} e
	@return {A3a.vpl.CanvasItem.mouseEvent}
*/
A3a.vpl.Canvas.prototype.makeMouseEvent = function (e) {
	var mouseEvent = {
		x: e.clientX,
		y: e.clientY,
		modifier: e.ctrlKey
	};
	if (this.transform) {
		var p1 = this.applyInverseTransform([mouseEvent.x, mouseEvent.y]);
		mouseEvent.x = p1[0];
		mouseEvent.y = p1[1];
	}
	return mouseEvent;
};

/** Update
	@return {void}
*/
A3a.vpl.Canvas.prototype["update"] = function () {
	this.onUpdate && this.onUpdate();
};

/**
	@typedef {{
		blockSize: number,
		blockLineWidth: number,
		thinLineWidth: number,
		blockFont: string,
		blockLargeFont: string,
		templateScale: number,
		scrollingBlockLib: boolean,
		margin: number,
		interRowSpace: number,
		interEventActionSpace: number,
		interBlockSpace: number,
		controlColor: string,
		controlDownColor: string,
		controlActiveColor: string,
		controlSize: number,
		controlFont: string,
		topControlSpace: number,
		scrollbarThumbColor: string,
		scrollbarBackgroundColor: string,
		scrollbarWidth: number,
		stripHorMargin: number,
		stripVertMargin: number,
		eventStyle: string,
		stateStyle: string,
		actionStyle: string,
		commentStyle: string,
		background: string,
		ruleBackground: string,
		ruleMarks: string,

	}}
*/
A3a.vpl.Canvas.dims;

/** Calculate optimal dims
	@param {number} blockSize size of VPL blocks
	@param {number} controlSize size of controls
	@return {A3a.vpl.Canvas.dims}
*/
A3a.vpl.Canvas.calcDims = function (blockSize, controlSize) {
	return {
		blockSize: blockSize,
		blockLineWidth: Math.max(1, Math.min(3, blockSize / 40)),
		thinLineWidth: 1,
		blockFont: Math.round(blockSize / 4).toString(10) + "px sans-serif",
		blockLargeFont: Math.round(blockSize / 3).toString(10) + "px sans-serif",
		templateScale: Math.max(0.666, 32 / blockSize),
		scrollingBlockLib: false,
		margin: Math.min(Math.round(blockSize / 4), 20),
		interRowSpace: Math.round(blockSize / 2),
		interEventActionSpace: blockSize / 2,
		interBlockSpace: Math.round(blockSize / 6),
		controlColor: "navy",
		controlDownColor: "#37f",
		controlActiveColor: "#06f",
		controlSize: controlSize,
		controlFont: "bold 15px sans-serif",
		topControlSpace: 2 * controlSize,
		scrollbarThumbColor: "navy",
		scrollbarBackgroundColor: "#ccc",
		scrollbarWidth: 5,
		stripHorMargin: Math.min(Math.max(blockSize / 15, 2), 6),
		stripVertMargin: Math.min(Math.max(blockSize / 15, 2), 6),
		eventStyle: "#f70",
		stateStyle: "#0c0",
		actionStyle: "#38f",
		commentStyle: "#aaa",
		background: "",
		ruleBackground: "#ddd",
		ruleMarks: "#bbb"
	};
};

/** Resize canvas
	@param {number} width new width
	@param {number} height new height
	@return {void}
*/
A3a.vpl.Canvas.prototype.resize = function (width, height) {
	this.width = width;
	this.height = height;
	var backingScale = "devicePixelRatio" in window ? window["devicePixelRatio"] : 1;
	this.canvas.width  = width * backingScale;
	this.canvas.height = height * backingScale;
	this.ctx = this.canvas.getContext("2d");
	if (backingScale != 1) {
		this.ctx.scale(backingScale, backingScale);
	}

	var cw = Math.min(width, height);
	var blockSize = Math.min(Math.round(width / 12), 90);
	var controlSize = Math.min(Math.max(Math.round(blockSize / 1.3), 32), 60);
	this.dims = A3a.vpl.Canvas.calcDims(blockSize, controlSize);
};

/** @typedef {{x:number,y:number,w:number,h:number,xOffset:number,yOffset:number}} */
A3a.vpl.Canvas.ClippingRect;

/** Get the index of the item specified by its data
	@param {*} data
	@return {number} index, or -1 if not found
*/
A3a.vpl.Canvas.prototype.itemIndex = function (data) {
	for (var i = 0; i < this.items.length; i++) {
		if (this.items[i].data === data) {
			return i;
		}
	}
	return -1;
};

/** Get the index of the item under the position specified by a mouse event
	@param {A3a.vpl.CanvasItem.mouseEvent} mouseEvent
	@param {boolean} clickableOnly
	@return {Array.<number>} indices from top-most (last) element, or empty if none found
*/
A3a.vpl.Canvas.prototype.clickedItemIndex = function (mouseEvent, clickableOnly) {
	var canvasBndRect = this.canvas.getBoundingClientRect();
	var x = mouseEvent.x - canvasBndRect.left;
	var y = mouseEvent.y - canvasBndRect.top;
	/** @type {Array.<number>} */
	var indices = [];
	for (var i = this.items.length - 1; i >= 0; i--) {
		var d = this.items[i].getTranslation();
		if ((!clickableOnly || this.items[i].clickable) &&
			x >= this.items[i].x + d.dx && x <= this.items[i].x + d.dx + this.items[i].width &&
			y >= this.items[i].y + d.dy && y <= this.items[i].y + d.dy + this.items[i].height &&
			this.items[i].isInClip(x, y)) {
			indices.push(i);
		}
	}
	return indices;
};

/** Make a zoomed clone of an item
	@param {A3a.vpl.CanvasItem} item
	@return {A3a.vpl.CanvasItem}
*/
A3a.vpl.Canvas.prototype.makeZoomedClone = function (item) {
	var c = item.clone();
	var canvasSize = this.getSize();
	var sc = Math.min(canvasSize.width, canvasSize.height) / 1.5 / c.width;
	c.width *= sc;
	c.height *= sc;
	c.x = (canvasSize.width - c.width) / 2;
	c.y = (canvasSize.height - c.height) / 2;
	c.zoomOnLongPress = null;
	var self = this;
	c.drawContent = function (ctx, item1, dx, dy) {
		ctx.save();
		ctx.translate(item1.x, item1.y);
		ctx.scale(sc, sc);
		ctx.translate(-item1.x, -item1.y);
		item.drawContent(ctx, c, item1.x - c.x, item1.y - c.y);
		ctx.restore();
	};
	if (item.drawOverlay) {
		c.drawOverlay = function (ctx, item1, dx, dy) {
			ctx.save();
			ctx.translate(item1.x, item1.y);
			ctx.scale(sc, sc);
			ctx.translate(-item1.x, -item1.y);
			item.drawOverlay(ctx, c, item1.x - c.x, item1.y - c.y);
			ctx.restore();
		};
	}
	return c;
};

/** Check if the zoomed item is under the position specified by a mouse event
	@param {A3a.vpl.CanvasItem.mouseEvent} mouseEvent
	@return {boolean}
*/
A3a.vpl.Canvas.prototype.isZoomedItemProxyClicked = function (mouseEvent) {
	if (this.zoomedItemProxy == null) {
		return false;
	}
	var canvasBndRect = this.canvas.getBoundingClientRect();
	var x = mouseEvent.x - canvasBndRect.left;
	var y = mouseEvent.y - canvasBndRect.top;
	return x >= this.zoomedItemProxy.x && x <= this.zoomedItemProxy.x + this.zoomedItemProxy.width
		&& y >= this.zoomedItemProxy.y && y <= this.zoomedItemProxy.y + this.zoomedItemProxy.height;
};

/** Get the canvas size
	@return {{width:number,height:number}}
*/
A3a.vpl.Canvas.prototype.getSize = function () {
	return {
		width: this.width,
		height: this.height
	};
};

/** Clear items
	@return {void}
*/
A3a.vpl.Canvas.prototype.clearItems = function () {
	this.items = [];
};

/** Clear canvas
	@return {void}
*/
A3a.vpl.Canvas.prototype.erase = function () {
	if (this.dims && this.dims.background) {
		this.ctx.save();
		this.ctx.fillStyle = this.dims.background;
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.restore();
	} else {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}
};

/** Begin clipping rect (can be nested)
	@param {number} x
	@param {number} y
	@param {number} width
	@param {number} height
	@param {number=} xOffset
	@param {number=} yOffset
	@return {void}
*/
A3a.vpl.Canvas.prototype.beginClip = function (x, y, width, height, xOffset, yOffset) {
	xOffset = xOffset || 0;
	yOffset = yOffset || 0;
	if (this.clipStack.length > 0) {
		// intersect with previous clip
		var c0 = this.clipStack[this.clipStack.length - 1];
		if (c0.x > x) {
			width -= c0.x - x;
			x = c0.x;
		}
		if (c0.x + c0.w < x + width) {
			width = c0.x + c0.w - x;
		}
		if (c0.y > y) {
			height -= c0.y - y;
			y = c0.y;
		}
		if (c0.y + c0.h < y + height) {
			height = c0.y + c0.h - y;
		}
		xOffset += c0.xOffset;
		yOffset += c0.yOffset;
	}
	this.clipStack.push({x: x, y: y, w: width, h: height, xOffset: xOffset, yOffset: yOffset});
};

/** End clipping rect (should match beginClip)
	@return {void}
*/
A3a.vpl.Canvas.prototype.endClip = function () {
	this.clipStack.pop();
};

/** Set or append item
	@param {A3a.vpl.CanvasItem} item
	@param {number=} index index of item to replace, or -1 to append (default)
	@return {void}
*/
A3a.vpl.Canvas.prototype.setItem = function (item, index) {
	if (this.clipStack.length > 0) {
		item.clippingRect = this.clipStack[this.clipStack.length - 1];
	}
	if (index >= 0) {
		this.items[/** @type {number} */(index)] = item;
	} else {
		this.items.push(item);
	}
};

/** Draw static stuff
	@param {function(CanvasRenderingContext2D):void} fun drawing function
	@return {void}
*/
A3a.vpl.Canvas.prototype.addDecoration = function (fun) {
	var item = new A3a.vpl.CanvasItem(null,
		-1, -1, 0, 0,
		function(ctx, item, dx, dy) {
			ctx.save();
			ctx.translate(dx, dy);
			fun(ctx);
			ctx.restore();
		});
	this.setItem(item);
};

/** Function drawing control button with origin at (0,0); args are ctx, width, height, isPressed
	@typedef {function(CanvasRenderingContext2D,number,number,boolean):void}
*/
A3a.vpl.Canvas.controlDraw;

/** Function implementung the control button action
	@typedef {function(A3a.vpl.CanvasItem.mouseEvent):void}
*/
A3a.vpl.Canvas.controlAction;

/** Add active control (new)
	@param {number} x
	@param {number} y
	@param {number} width
	@param {number} height
	@param {A3a.vpl.Canvas.controlDraw} draw
	@param {?A3a.vpl.Canvas.controlAction=} action
	@param {?A3a.vpl.CanvasItem.doDrop=} doDrop
	@param {?A3a.vpl.CanvasItem.canDrop=} canDrop
	@param {string=} id
	@return {void}
*/
A3a.vpl.Canvas.prototype.addControl = function (x, y, width, height, draw, action, doDrop, canDrop, id) {
	/** @type {A3a.vpl.CanvasItem.mouseEvent} */
	var downEvent;
	var self = this;
	var item = new A3a.vpl.CanvasItem(null,
		width, height, x, y,
		/** @type {A3a.vpl.CanvasItem.draw} */
		(function (ctx, item, dx, dy) {
			ctx.save();
			ctx.translate(item.x + dx, item.y + dy);
			draw(ctx, item.width, item.height,
				(self.downControl.id === id && /** @type {boolean} */(self.downControl.isInside)) ||
					item.dropTarget);
			ctx.restore();
		}),
		action ? {
			/** @type {A3a.vpl.CanvasItem.mousedown} */
			mousedown: function (canvas, data, width, height, left, top, ev) {
				self.downControl = {
					id: id,
					rect: {
						x: x,
						y: y,
						w: width,
						h: height
					},
					isInside: true
				};
				downEvent = ev;
				self.redraw();
				return 0;
			},
			/** @type {A3a.vpl.CanvasItem.mousedrag} */
			mousedrag: function (canvas, data, dragIndex, width, height, left, top, ev) {
				self.downControl.isInside = ev.x >= self.downControl.rect.x &&
					ev.x < self.downControl.rect.x + self.downControl.rect.w &&
					ev.y >= self.downControl.rect.y &&
					ev.y < self.downControl.rect.y + self.downControl.rect.h;
				canvas.redraw();
			},
			/** @type {A3a.vpl.CanvasItem.mouseup} */
			mouseup: function (canvas, data, dragIndex) {
				if (self.downControl.isInside) {
					action(downEvent);
				}
				self.downControl = {};
				self.redraw();
			}
		} : null,
		doDrop,
		canDrop,
		id);
	item.draggable = false;
	item.noDropHint = true;	// drawn with isPressed=true for better control on appearance
	this.setItem(item);
};

/** Redraw the underlying canvas with all the items
	@return {void}
*/
A3a.vpl.Canvas.prototype.redraw = function () {
	this.erase();
	if (this.transform) {
		this.ctx.save();
		this.ctx.translate(this.width / 2, this.height / 2);
		CanvasRenderingContext2D.prototype.transform.apply(this.ctx, this.transform);
		this.ctx.translate(-this.width / 2, -this.height / 2);
	}
	this.items.forEach(function (item) {
		item.draw(this.ctx);
	}, this);
	this.items.forEach(function (item) {
		item.draw(this.ctx, 0, 0, true);
	}, this);
	if (this.zoomedItemProxy) {
		this.zoomedItemProxy.draw(this.ctx);
		this.zoomedItemProxy.draw(this.ctx, 0, 0, true);
	}
	if (this.transform) {
		this.ctx.restore();
	}
};
