/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Program rendition state (scroll, zoom, etc.)
	@constructor
	@struct
*/
A3a.vpl.Program.CanvasRenderingState = function () {
	this.vertScroll = 0;	// scroll up
	this.y0 = 0;	// mousedown vertical position, to calculate vertical movements
};

/** Add a block to a canvas
	@param {A3a.vpl.Canvas} canvas
	@param {A3a.vpl.Block} block
	@param {number} x
	@param {number} y
	@param {{
		notInteractive:(boolean|undefined),
		notDropTarget:(boolean|undefined),
		notClicable:(boolean|undefined),
		notDraggable:(boolean|undefined),
		scale:(number|undefined),
		disabled: (boolean|undefined)
	}=} opts
	@return {A3a.vpl.CanvasItem}
*/
A3a.vpl.Program.prototype.addBlockToCanvas = function (canvas, block, x, y, opts) {
	/** Check if block type is for blocks on the action side (right)
		@param {A3a.vpl.blockType} type
		@return {boolean}
	*/
	function isActionSide(type) {
		return type === A3a.vpl.blockType.action ||
			type === A3a.vpl.blockType.comment;
	}
	var self = this;
	var item = new A3a.vpl.CanvasItem(block,
		canvas.dims.blockSize * (opts && opts.scale || 1),
		canvas.dims.blockSize * (opts && opts.scale || 1),
		x, y,
		// draw
		function (ctx, item, dx, dy) {
			canvas.ctx.save();
			if (opts && opts.scale) {
				var dims0 = canvas.dims;
				canvas.dims = A3a.vpl.Canvas.calcDims(canvas.dims.blockSize * opts.scale, canvas.dims.controlSize * opts.scale);
				block.blockTemplate.renderToCanvas(canvas,
					/** @type {A3a.vpl.Block} */(item.data),
					item.x + dx, item.y + dy,
					item.zoomOnLongPress != null);
				if (block.locked) {
					canvas.lockedMark(item.x + dx, item.y + dy, canvas.dims.blockSize, canvas.dims.blockSize, true);
				}
				if (block.disabled || opts.disabled) {
					canvas.disabledMark(item.x + dx, item.y + dy, canvas.dims.blockSize, canvas.dims.blockSize);
				}
				canvas.dims = dims0;
			} else {
				block.blockTemplate.renderToCanvas(canvas,
					/** @type {A3a.vpl.Block} */(item.data),
					item.x + dx, item.y + dy,
					item.zoomOnLongPress != null);
				if (block.locked) {
					canvas.lockedMark(item.x + dx, item.y + dy, canvas.dims.blockSize, canvas.dims.blockSize, true);
				}
				if (block.disabled) {
					canvas.disabledMark(item.x + dx, item.y + dy, canvas.dims.blockSize, canvas.dims.blockSize);
				}
			}
			canvas.ctx.restore();
		},
		// interactiveCB
		opts && opts.notInteractive ||
			block.disabled ||
			block.locked || (block.eventHandlerContainer && block.eventHandlerContainer.locked) ||
			!block.blockTemplate.mousedown
			? opts && opts.mousedown
				? {
					mousedown: opts.mousedown
				}
				: null
			: {
				mousedown: /** @type {?A3a.vpl.CanvasItem.mousedown} */(block.blockTemplate.mousedown),
				mousedrag: /** @type {?A3a.vpl.CanvasItem.mousedrag} */(block.blockTemplate.mousedrag)
			},
		// doDrop: for block in event handler, be replaced by dropped block
		opts && opts.notDropTarget ? null : function (targetBlockItem, newBlockItem) {
			if (targetBlockItem.data.eventHandlerContainer) {
				self.saveStateBeforeChange();
				targetBlockItem.data.eventHandlerContainer.setBlock(newBlockItem.data,
					targetBlockItem.data.positionInContainer,
					function () {
						self.saveStateBeforeChange();
					});
			}
			canvas.onUpdate && canvas.onUpdate();
		},
		// canDrop
		opts && opts.notDropTarget ? null : function (targetItem, droppedItem) {
			return droppedItem.data instanceof A3a.vpl.Block &&
				(isActionSide(targetItem.data.blockTemplate.type) ===
					isActionSide(droppedItem.data.blockTemplate.type)
 					|| droppedItem.data.blockTemplate.type === A3a.vpl.blockType.comment) &&
				targetItem.data !== droppedItem.data;
		}
	);
	var canvasSize = canvas.getSize();
	if (!(opts && opts.notInteractive || !block.blockTemplate.mousedown)
		&& canvas.dims.blockSize < 60) {
		item.zoomOnLongPress = function (zoomedItem) {
			return canvas.makeZoomedClone(zoomedItem);
		};
	}
	item.clicable = !(opts && opts.notClicable);
	item.draggable = !(opts && opts.notDraggable);
	var index = canvas.itemIndex(block);
	canvas.setItem(item, index);
	return item;
};

/** Add a block template on a canvas
	@param {A3a.vpl.Canvas} canvas
	@param {A3a.vpl.BlockTemplate} blockTemplate
	@param {number} x
	@param {number} y
	@return {void}
*/
A3a.vpl.Program.prototype.addBlockTemplateToCanvas = function (canvas, blockTemplate, x, y) {
	var block = new A3a.vpl.Block(blockTemplate, null, null);
	var disabled = this.disabledBlocks.indexOf(blockTemplate.name) >= 0;
	var self = this;
	this.addBlockToCanvas(canvas, block, x, y,
		{
			notInteractive: true,
			notDropTarget: true,
			scale: canvas.dims.templateScale,
			disabled: disabled,
			mousedown: this.customizationMode
				? function (canvas, data, width, height, x, y, downEvent) {
					if (self.disabledBlocks.indexOf(blockTemplate.name) >= 0) {
						self.disabledBlocks.splice(self.disabledBlocks.indexOf(blockTemplate.name), 1);
					} else {
						self.disabledBlocks.push(blockTemplate.name);
					}
					return 1;
				}
				: null
		});
};

/** Add an event handler to a canvas
	@param {A3a.vpl.Canvas} canvas
	@param {A3a.vpl.EventHandler} eventHandler
	@param {boolean} displaySingleEvent
	@param {number} eventX0
	@param {number} actionX0
	@param {number} width
	@param {number} y
	@return {void}
*/
A3a.vpl.Program.prototype.addEventHandlerToCanvas =
	function (canvas, eventHandler, displaySingleEvent, eventX0, actionX0, width, y) {
	var canvasSize = canvas.getSize();
	var x = eventX0;
	var step = canvas.dims.blockSize + canvas.dims.interBlockSpace;

	var self = this;
	var item = new A3a.vpl.CanvasItem(eventHandler,
		width + 2 * canvas.dims.stripVertMargin,
		canvas.dims.blockSize + 2 * canvas.dims.stripVertMargin,
		x - canvas.dims.stripHorMargin,
		y - canvas.dims.stripVertMargin,
		// draw
		function (ctx, item, dx, dy) {
			// gray strip
			ctx.fillStyle = "#ddd";
			ctx.fillRect(item.x + dx, item.y + dy, item.width, item.height);
			// colon (two darker dots)
			ctx.fillStyle = "#bbb";
			ctx.beginPath();
			ctx.arc(actionX0 - canvas.dims.interEventActionSpace / 2 + dx,
				y + canvas.dims.blockSize * 0.3 + dy,
				canvas.dims.interEventActionSpace / 6,
				0, 2 * Math.PI);
			ctx.arc(actionX0 - canvas.dims.interEventActionSpace / 2 + dx,
				y + canvas.dims.blockSize * 0.7 + dy,
				canvas.dims.interEventActionSpace / 6,
				0, 2 * Math.PI);
			ctx.fill();
			if (eventHandler.locked) {
				canvas.lockedMark(item.x, item.y, item.width, item.height,
					false, eventHandler.disabled ? "#ddd" : "");
			}
		},
		// interactiveCB
		null,
		// doDrop: reorder event handler or add dropped block
		function (targetItem, droppedItem) {
			if (droppedItem.data instanceof A3a.vpl.EventHandler) {
				var targetIndex = self.program.indexOf(/** @type {A3a.vpl.EventHandler} */(targetItem.data));
				var droppedIndex = self.program.indexOf(droppedItem.data);
				if (targetIndex >= 0 && droppedIndex >= 0) {
					self.saveStateBeforeChange();
					self.program.splice(droppedIndex, 1);
					self.program.splice(targetIndex, 0, droppedItem.data);
				}
			} else if (droppedItem.data instanceof A3a.vpl.Block) {
				self.saveStateBeforeChange();
				targetItem.data.setBlock(droppedItem.data,
					null,
					function () {
						self.saveStateBeforeChange();
					});
			}
			canvas.onUpdate && canvas.onUpdate();
		},
		// canDrop
		function (targetItem, droppedItem) {
			// not event handler on itself, or child block, or event block in basic mode
			return droppedItem.data !== targetItem.data &&
				(!(droppedItem.data instanceof A3a.vpl.Block) ||
					droppedItem.data.eventHandlerContainer !== targetItem.data) &&
				(self.mode === A3a.vpl.mode.advanced ||
					targetItem.data.events.length === 0 ||
					(droppedItem.data instanceof A3a.vpl.Block &&
						droppedItem.data.blockTemplate.type === A3a.vpl.blockType.action));
		}
	);
	if (eventHandler.disabled) {
		item.drawOverlay = function (ctx, item, dx, dy) {
			canvas.disabledMark(item.x + dx, item.y + dy, item.width, item.height);
		};
	}
	canvas.setItem(item);

	/** @type {A3a.vpl.CanvasItem} */
	var childItem;

	var events = eventHandler.events;
	if (events.length === 0 || (!displaySingleEvent && events[events.length - 1] !== null)) {
		events = events.concat(null);
	}
	events.forEach(function (event, j) {
		if (event) {
			childItem = this.addBlockToCanvas(canvas, event,
				eventX0 + step * j,
				y,
				{
					notInteractive: eventHandler.disabled,
					notClicable: eventHandler.disabled
				});
		} else {
			childItem = this.addBlockToCanvas(canvas,
				new A3a.vpl.EmptyBlock(A3a.vpl.blockType.event, eventHandler,
					{eventSide: true, index: j}),
				eventX0 + step * j,
				y,
				{
					notDropTarget: eventHandler.disabled,
					notClicable: true,
					notDraggable: true
				});
		}
		item.attachItem(childItem);
	}, this);
	var actions = eventHandler.actions;
	if (actions.length === 0 || actions[actions.length - 1] !== null) {
		actions = actions.concat(null);
	}
	actions.forEach(function (action, j) {
		if (action) {
			childItem = this.addBlockToCanvas(canvas, action,
				actionX0 + step * j,
				y,
				{
					notInteractive: eventHandler.disabled,
					notClicable: eventHandler.disabled
				});
		} else {
			childItem = this.addBlockToCanvas(canvas,
				new A3a.vpl.EmptyBlock(A3a.vpl.blockType.action, eventHandler,
					{eventSide: false, index: j}),
				actionX0 + step * j,
				y,
				{notDropTarget: false, notClicable: true, notDraggable: true});
		}
		item.attachItem(childItem);
	}, this);

	// error marks
	canvas.addDecoration(function (ctx) {
		if (eventHandler.error !== null) {
			// pink circled question mark
			var xc = x - canvas.dims.stripHorMargin -
				canvas.dims.blockSize * 0.3;
			var yc = y + canvas.dims.blockSize * 0.5;
			ctx.fillStyle = "white";
			ctx.strokeStyle = "#f88";
			ctx.lineWidth = canvas.dims.blockSize * 0.05;
			ctx.beginPath();
			ctx.arc(xc, yc,
				canvas.dims.blockSize * 0.2,
				0, 2 * Math.PI);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = "#f88";
			ctx.font = Math.round(canvas.dims.blockSize * 0.3).toString() + "px sans-serif";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("?", xc, yc);
			ctx.beginPath();
			var ya = y + canvas.dims.blockSize + canvas.dims.stripVertMargin + canvas.dims.interRowSpace * 0.2;
			if (eventHandler.error.eventError) {
				if (eventHandler.error.eventErrorIndices.length === 0) {
					ctx.moveTo(eventX0, ya);
					ctx.lineTo(eventX0 + step * events.length - canvas.dims.interBlockSpace, ya);
				} else {
					for (var i = 0; i < eventHandler.error.eventErrorIndices.length; i++) {
						var xe = eventX0 +
								step * eventHandler.error.eventErrorIndices[i];
						ctx.moveTo(xe, ya);
						ctx.lineTo(xe + canvas.dims.blockSize, ya);
					}
				}
			}
			for (var i = 0; i < eventHandler.error.actionErrorIndices.length; i++) {
				var xa = actionX0 + step * eventHandler.error.actionErrorIndices[i];
				ctx.moveTo(xa, ya);
				ctx.lineTo(xa + canvas.dims.blockSize, ya);
			}
			ctx.stroke();
		}
	});
};

/** Add to a canvas a link between error marks for conflicting events
	@param {A3a.vpl.Canvas} canvas
	@param {number} x
	@param {number} y1
	@param {number} y2
	@return {void}
*/
A3a.vpl.Program.prototype.addEventHandlerConflictLinkToCanvas = function (canvas, x, y1, y2) {
	canvas.addDecoration(function (ctx) {
		// pink line
		var xc = x - canvas.dims.stripHorMargin -
			canvas.dims.blockSize * 0.3;
		var yc1 = y1 + canvas.dims.blockSize * 0.5 + canvas.dims.blockSize * 0.2;
		var yc2 = y2 + canvas.dims.blockSize * 0.5 - canvas.dims.blockSize * 0.2;
		ctx.strokeStyle = "#f88";
		ctx.lineWidth = canvas.dims.blockSize * 0.05;
		ctx.setLineDash([canvas.dims.blockSize * 0.2, canvas.dims.blockSize * 0.1]);
		ctx.beginPath();
		ctx.moveTo(xc, yc1);
		ctx.lineTo(xc, yc2);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(xc, yc1, ctx.lineWidth, 0, Math.PI);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(xc, yc2, ctx.lineWidth, -Math.PI, 0);
		ctx.stroke();
	});
};

/** Change current view
	@param {string} view "vpl" or "src"
	@param {boolean=} noVpl true to prevent vpl (default: false)
	@return {void}
*/
A3a.vpl.Program.prototype.setView = function (view, noVpl) {
	this.noVpl = noVpl || false;
	document.getElementById("vpl-editor").style.display = view === "vpl" ? "block" : "none";
	document.getElementById("src-editor").style.display = view === "src" ? "block" : "none";
	switch (view) {
	case "src":
		document.getElementById("editor").focus();
		break;
	}
};

/** Calculate block position based on a layout with items, fixed intervals, separators,
	and stretch elements
	@param {number} pMin min position (left margin)
	@param {number} pMax max position (right margin)
	@param {number} itemSize item size
	@param {number} gap normal gap
	@param {number} separatorGap large gap used for separators
	@param {string} layout layout description: "X" = item, " " = separator, "s" = stretch
 	@return {Array.<number>} array of item positions (length: number of "X" in layout)
*/
A3a.vpl.Program.blockLayout = function (pMin, pMax, itemSize, gap, separatorGap, layout) {
	// calc. sum of fixed sizes and count stretches
	var totalFixedSize = 0;
	var stretchCount = 0;
	var s = 0;
	for (var i = 0; i < layout.length; i++) {
		switch (layout[i]) {
		case "X":
			s += layout[i - 1] === "X" ? gap + itemSize : itemSize;
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
	/** @type {Array.<number>} */
	var pos = [];
	var p = pMin;
	for (var i = 0; i < layout.length; i++) {
		switch (layout[i]) {
		case "X":
			if (layout[i - 1] === "X") {
				pos.push(p + gap);
				p += gap + itemSize;
			} else {
				pos.push(p);
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
	return pos;
};

/** Render the program to a single canvas
	@param {A3a.vpl.Canvas} canvas
	@return {void}
*/
A3a.vpl.Program.prototype.renderToCanvas = function (canvas) {
	// make sure code is up-to-date to have error info
	this.getCode();

	var canvasSize = canvas.getSize();
	var renderingState = /** @type {A3a.vpl.Program.CanvasRenderingState} */(canvas.state);
	var self = this;
	var showState = this.mode === A3a.vpl.mode.advanced;

	// find size
	var displaySingleEvent = this.displaySingleEvent();
	var nMaxEventHandlers = this.program.length;
	var nMaxEventHandlerELength = 0;
	var nMaxEventHandlerALength = 0;
	this.program.forEach(function (eventHandler) {
		var blocks = eventHandler.events;
		nMaxEventHandlerELength = Math.max(nMaxEventHandlerELength,
			blocks.length
				+ (blocks.length === 0 || blocks[blocks.length - 1] !== null ? 1 : 0));
		blocks = eventHandler.actions;
		nMaxEventHandlerALength = Math.max(nMaxEventHandlerALength,
			blocks.length
				+ (blocks.length === 0 || blocks[blocks.length - 1] !== null ? 1 : 0));
	});
	if (displaySingleEvent) {
		nMaxEventHandlerELength = 1;
	}
	var eventWidth = ((nMaxEventHandlerELength + nMaxEventHandlerALength) * canvas.dims.blockSize
		+ canvas.dims.interEventActionSpace
		+ (nMaxEventHandlerELength + nMaxEventHandlerALength - 2) * canvas.dims.interBlockSpace);
	var eventX0 = (canvasSize.width - eventWidth) / 2;
	var actionX0 = eventX0 +
		canvas.dims.blockSize * nMaxEventHandlerELength +
		canvas.dims.interBlockSpace * (nMaxEventHandlerELength - 1) +
		canvas.dims.interEventActionSpace;

	// start with an empty canvas
	canvas.clearItems();

	// author
	canvas.addDecoration(function (ctx) {
		ctx.save();
		ctx.font = "9px sans-serif";
		ctx.textAlign = "start";
		ctx.textBaseline = "bottom";
		ctx.rotate(-Math.PI / 2);
		ctx.fillText("EPFL 2018",
			-canvasSize.height + canvas.dims.blockLineWidth,
			canvasSize.width - canvas.dims.blockLineWidth);
		ctx.restore();
	});

	// top controls
	var layout = "XX" +
		(window["vplStorageSetFunction"] ? "X" : "") +
		"X X " +
		(this.teacherRole ? "X " : "") +
		"sXX" +
		(window["vplRunFunction"] ? "sXXs" : "s") +
		(this.experimentalFeatures
			? this.teacherRole ? "XXX" : "XX"
			: "") +
		"X";
	var controlPos = A3a.vpl.Program.blockLayout(canvas.dims.margin, canvasSize.width - canvas.dims.margin,
		canvas.dims.controlSize,
		canvas.dims.interBlockSpace, 2 * canvas.dims.interBlockSpace,
		layout);
	var controlIx = 0;

	// new
	canvas.addControl(controlPos[controlIx++], canvas.dims.margin,
		canvas.dims.controlSize, canvas.dims.controlSize,
		// draw
		function (ctx, item, dx, dy) {
			ctx.fillStyle = "navy";
			ctx.fillRect(item.x + dx, item.y + dy,
				canvas.dims.controlSize, canvas.dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.25,
				item.y + dy + canvas.dims.controlSize * 0.2);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.25,
				item.y + dy + canvas.dims.controlSize * 0.8);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.75,
				item.y + dy + canvas.dims.controlSize * 0.8);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.75,
				item.y + dy + canvas.dims.controlSize * 0.3);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.65,
				item.y + dy + canvas.dims.controlSize * 0.2);
			ctx.closePath();
			ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.65,
				item.y + dy + canvas.dims.controlSize * 0.2);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.65,
				item.y + dy + canvas.dims.controlSize * 0.3);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.75,
				item.y + dy + canvas.dims.controlSize * 0.3);
			ctx.strokeStyle = "white";
			ctx.lineWidth = canvas.dims.blockLineWidth;
			ctx.stroke();
		},
		// mousedown
		function (data, x, y, ev) {
			self.new();
			return 0;
		},
		// doDrop
		null,
		// canDrop
		null);

	// save
	canvas.addControl(controlPos[controlIx++], canvas.dims.margin,
		canvas.dims.controlSize, canvas.dims.controlSize,
		// draw
		function (ctx, item, dx, dy) {
			ctx.fillStyle = "navy";
			ctx.fillRect(item.x + dx, item.y + dy,
				canvas.dims.controlSize, canvas.dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.25,
				item.y + dy + canvas.dims.controlSize * 0.2);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.25,
				item.y + dy + canvas.dims.controlSize * 0.7);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.67,
				item.y + dy + canvas.dims.controlSize * 0.7);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.67,
				item.y + dy + canvas.dims.controlSize * 0.27);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.6,
				item.y + dy + canvas.dims.controlSize * 0.2);
			ctx.closePath();
			ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.6,
				item.y + dy + canvas.dims.controlSize * 0.2);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.6,
				item.y + dy + canvas.dims.controlSize * 0.27);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.67,
				item.y + dy + canvas.dims.controlSize * 0.27);
			ctx.strokeStyle = self.isEmpty() ? "#777" : "white";
			ctx.lineWidth = canvas.dims.blockLineWidth;
			ctx.stroke();
			ctx.lineWidth = 2 * canvas.dims.blockLineWidth;
			ctx.beginPath();
			ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.8,
				item.y + dy + canvas.dims.controlSize * 0.5);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.8,
				item.y + dy + canvas.dims.controlSize * 0.8);
			ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.7,
				item.y + dy + canvas.dims.controlSize * 0.7);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.8,
				item.y + dy + canvas.dims.controlSize * 0.8);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.9,
				item.y + dy + canvas.dims.controlSize * 0.7);
			ctx.stroke();
		},
		// mousedown
		function (data, x, y, ev) {
			if (!self.isEmpty()) {
				var aesl = self.exportAsAESLFile();
				A3a.vpl.Program.downloadXML(aesl, "vpl.aesl");
			}
			return 0;
		},
		// doDrop
		null,
		// canDrop
		null);

	if (window["vplStorageSetFunction"]) {
		// upload
		canvas.addControl(controlPos[controlIx++], canvas.dims.margin,
			canvas.dims.controlSize, canvas.dims.controlSize,
			// draw
			function (ctx, item, dx, dy) {
				ctx.fillStyle = "navy";
				ctx.fillRect(item.x + dx, item.y + dy,
					canvas.dims.controlSize, canvas.dims.controlSize);
				ctx.beginPath();
				ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.25,
					item.y + dy + canvas.dims.controlSize * 0.3);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.25,
					item.y + dy + canvas.dims.controlSize * 0.8);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.67,
					item.y + dy + canvas.dims.controlSize * 0.8);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.67,
					item.y + dy + canvas.dims.controlSize * 0.37);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.6,
					item.y + dy + canvas.dims.controlSize * 0.3);
				ctx.closePath();
				ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.6,
					item.y + dy + canvas.dims.controlSize * 0.3);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.6,
					item.y + dy + canvas.dims.controlSize * 0.37);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.67,
					item.y + dy + canvas.dims.controlSize * 0.37);
				ctx.strokeStyle = self.isEmpty() ? "#777" : "white";
				ctx.lineWidth = canvas.dims.blockLineWidth;
				ctx.stroke();
				ctx.lineWidth = 2 * canvas.dims.blockLineWidth;
				ctx.beginPath();
				ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.8,
					item.y + dy + canvas.dims.controlSize * 0.5);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.8,
					item.y + dy + canvas.dims.controlSize * 0.2);
				ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.7,
					item.y + dy + canvas.dims.controlSize * 0.3);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.8,
					item.y + dy + canvas.dims.controlSize * 0.2);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.9,
					item.y + dy + canvas.dims.controlSize * 0.3);
				ctx.stroke();
			},
			// mousedown
			function (data, x, y, ev) {
				if (!self.isEmpty()) {
					var aesl = self.exportAsAESLFile();
					A3a.vpl.Program.downloadXML(aesl, "vpl.aesl");
				}
				return 0;
			},
			// doDrop
			null,
			// canDrop
			null);
	}

	// text
	canvas.addControl(controlPos[controlIx++], canvas.dims.margin,
		canvas.dims.controlSize, canvas.dims.controlSize,
		// draw
		function (ctx, item, dx, dy) {
			ctx.fillStyle = "navy";
			ctx.fillRect(item.x + dx, item.y + dy,
				canvas.dims.controlSize, canvas.dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.25,
				item.y + dy + canvas.dims.controlSize * 0.2);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.25,
				item.y + dy + canvas.dims.controlSize * 0.8);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.75,
				item.y + dy + canvas.dims.controlSize * 0.8);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.75,
				item.y + dy + canvas.dims.controlSize * 0.3);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.65,
				item.y + dy + canvas.dims.controlSize * 0.2);
			ctx.closePath();
			ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.65,
				item.y + dy + canvas.dims.controlSize * 0.2);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.65,
				item.y + dy + canvas.dims.controlSize * 0.3);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.75,
				item.y + dy + canvas.dims.controlSize * 0.3);
			for (var y = 0.2; y < 0.6; y += 0.1) {
				ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.3,
					item.y + dy + canvas.dims.controlSize * (0.2 + y));
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.7,
					item.y + dy + canvas.dims.controlSize * (0.2 + y));
			}
			ctx.strokeStyle = "white";
			ctx.lineWidth = canvas.dims.blockLineWidth;
			ctx.stroke();
		},
		// mousedown
		function (data, x, y, ev) {
			self.setView("src");
			return 0;
		},
		// doDrop
		null,
		// canDrop
		null);

	// advanced mode (toggle)
	canvas.addControl(controlPos[controlIx++], canvas.dims.margin,
		canvas.dims.controlSize, canvas.dims.controlSize,
		// draw
        function (ctx, item, dx, dy) {
            var isOn = self.mode === A3a.vpl.mode.advanced;
            ctx.fillStyle = isOn ? "#06f" : "navy";
            ctx.fillRect(item.x + dx, item.y + dy,
                canvas.dims.controlSize, canvas.dims.controlSize);
            ctx.fillStyle = "white";
            for (var i = 0; i < 4; i++) {
                for (var j = 0; j < 5; j++) {
                    ctx.fillRect(item.x + dx + canvas.dims.controlSize * 0.1 * (1 + i) +
                            (i < 2 ? 0 : canvas.dims.controlSize * 0.43),
                        item.y + dy + canvas.dims.controlSize * 0.1 * (2 + j),
                        canvas.dims.controlSize * 0.07,
                        canvas.dims.controlSize * 0.07);
                }
            }
            ctx.fillStyle = isOn ? "white" : "#44a";
            ctx.fillRect(item.x + dx + canvas.dims.controlSize * 0.1,
                item.y + dy + canvas.dims.controlSize * 0.8,
                canvas.dims.controlSize * 0.8,
                canvas.dims.controlSize * 0.1);
        },
		// mousedown
		function (data, x, y, ev) {
			self.setMode(self.mode === A3a.vpl.mode.basic
				? A3a.vpl.mode.advanced
				: A3a.vpl.mode.basic);
			return 0;
		},
		// doDrop
		null,
		// canDrop
		null);

	if (this.teacherRole) {
		canvas.addControl(controlPos[controlIx++], canvas.dims.margin,
			canvas.dims.controlSize, canvas.dims.controlSize,
			// draw
			function (ctx, item, dx, dy) {
				ctx.fillStyle = self.customizationMode ? "#06f" : "navy";
				ctx.fillRect(item.x + dx, item.y + dy,
					canvas.dims.controlSize, canvas.dims.controlSize);
				ctx.fillStyle = "white";
				var x0 = item.x + dx + canvas.dims.controlSize * 0.5;
				var y0 = item.y + dy + canvas.dims.controlSize * 0.4;
				var r = canvas.dims.controlSize * 0.27;
				ctx.beginPath();
				ctx.moveTo(x0 + r * Math.cos(0.1), y0 + r * Math.sin(0.2));
				for (var i = 1; i < 6; i++) {
					ctx.lineTo(x0 + r * Math.cos(i * Math.PI / 3 + 0.2), y0 + r * Math.sin(i * Math.PI / 3 + 0.2));
				}
				ctx.closePath();
				ctx.arc(x0, y0, r * 0.5, 0, 2 * Math.PI, true);
				ctx.fill();
				ctx.fillStyle = self.customizationMode ? "white" : "#44a";
				ctx.fillRect(item.x + dx + canvas.dims.controlSize * 0.1,
					item.y + dy + canvas.dims.controlSize * 0.8,
					canvas.dims.controlSize * 0.8,
					canvas.dims.controlSize * 0.1);
			},
			// mousedown
			function (data, x, y, ev) {
				self.customizationMode = !self.customizationMode;
				return 0;
			},
			// doDrop
			null,
			// canDrop
			null);
	}

	/** Draw control for undo (back arrow) or redo (flipped)
		@param {CanvasRenderingContext2D} ctx canvas 2d context
		@param {number} x
		@param {number} y
		@param {boolean} flipped
		@param {boolean} enabled
		@return {void}
	*/
	function drawUndo(ctx, x, y, flipped, enabled) {
		ctx.save();
		if (flipped) {
			ctx.scale(-1, 1);
			ctx.translate(-2 * x - canvas.dims.controlSize, 0);
		}
		ctx.fillStyle = "navy";
		ctx.fillRect(x, y,
			canvas.dims.controlSize, canvas.dims.controlSize);
		ctx.fillStyle = enabled ? "white" : "#777";
		ctx.beginPath();
		ctx.moveTo(x + canvas.dims.controlSize * 0.1,
			y + canvas.dims.controlSize * 0.6);
		ctx.lineTo(x + canvas.dims.controlSize * 0.4,
			y + canvas.dims.controlSize * 0.6);
		ctx.lineTo(x + canvas.dims.controlSize * 0.25,
			y + canvas.dims.controlSize * 0.34);
		ctx.closePath();
		ctx.fill();
		ctx.beginPath();
		ctx.arc(x + canvas.dims.controlSize * 0.5,
			y + canvas.dims.controlSize * 0.83,
			canvas.dims.controlSize * 0.4,
			4.2, 5.6);
		ctx.strokeStyle = ctx.fillStyle;
		ctx.lineWidth = canvas.dims.controlSize * 0.08;
		ctx.stroke();
		ctx.restore();
	}

	// undo
	canvas.addControl(controlPos[controlIx++], canvas.dims.margin,
		canvas.dims.controlSize, canvas.dims.controlSize,
		// draw
		function (ctx, item, dx, dy) {
			drawUndo(ctx, item.x + dx, item.y + dy, false, self.undoState.canUndo());
		},
		// mousedown
		function (data, x, y, ev) {
			self.undo(function () { self.renderToCanvas(canvas); });
			return 0;
		},
		// doDrop
		null,
		// canDrop
		null);

	// redo
	canvas.addControl(controlPos[controlIx++], canvas.dims.margin,
		canvas.dims.controlSize, canvas.dims.controlSize,
		// draw
		function (ctx, item, dx, dy) {
			drawUndo(ctx, item.x + dx, item.y + dy, true, self.undoState.canRedo());
		},
		// mousedown
		function (data, x, y, ev) {
			self.redo(function () { self.renderToCanvas(canvas); });
			return 0;
		},
		// doDrop
		null,
		// canDrop
		null);

	if (window["vplRunFunction"]) {
		canvas.addControl(controlPos[controlIx++], canvas.dims.margin,
			canvas.dims.controlSize, canvas.dims.controlSize,
			// draw
			function (ctx, item, dx, dy) {
				ctx.fillStyle = "navy";
				ctx.fillRect(item.x + dx, item.y + dy,
					canvas.dims.controlSize, canvas.dims.controlSize);
				ctx.beginPath();
				ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.3,
					item.y + dy + canvas.dims.controlSize * 0.25);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.3,
					item.y + dy + canvas.dims.controlSize * 0.75);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.8,
					item.y + dy + canvas.dims.controlSize * 0.5);
				ctx.closePath();
				ctx.fillStyle = window["vplNode"] ? "white" : "#777";
				ctx.fill();
				ctx.fillStyle = window["vplNode"] ? self.uploaded ? "white" : "#44a" : "#777";
				ctx.fillRect(item.x + dx + canvas.dims.controlSize * 0.1,
					item.y + dy + canvas.dims.controlSize * 0.8,
					canvas.dims.controlSize * 0.8,
					canvas.dims.controlSize * 0.1);
			},
			// mousedown
			function (data, x, y, ev) {
				if (window["vplNode"]) {
					var code = self.getCode();
					window["vplRunFunction"](code);
					self.uploaded = true;
				}
				return 0;
			},
			// doDrop: compile code fragment and play it
			function (targetItem, draggedItem) {
				if (draggedItem.data instanceof A3a.vpl.Block) {
					if (draggedItem.data.eventHandlerContainer) {
						// action from an event handler: just send it
						var code = self.codeForBlock(/** @type {A3a.vpl.Block} */(draggedItem.data));
						window["vplRunFunction"](code);
					} else {
						// action from the templates: display in a zoomed state to set the parameters
						// (disabled by canDrop below)
						canvas.zoomedItemProxy = canvas.makeZoomedClone(draggedItem);
					}
				} else if (draggedItem.data instanceof A3a.vpl.EventHandler) {
					var code = self.codeForActions(/** @type {A3a.vpl.EventHandler} */(draggedItem.data));
					window["vplRunFunction"](code);
				}
			},
			// canDrop: accept event handler or action block in event handler or in template
			function (targetItem, draggedItem) {
				return window["vplNode"] &&
					draggedItem.data instanceof A3a.vpl.EventHandler &&
 						/** @type {A3a.vpl.EventHandler} */(draggedItem.data).hasBlockOfType(A3a.vpl.blockType.action) ||
					draggedItem.data instanceof A3a.vpl.Block &&
						/** @type {A3a.vpl.Block} */(draggedItem.data).eventHandlerContainer != null &&
						/** @type {A3a.vpl.Block} */(draggedItem.data).blockTemplate.type ===
							A3a.vpl.blockType.action;
			});

		canvas.addControl(controlPos[controlIx++], canvas.dims.margin,
			canvas.dims.controlSize, canvas.dims.controlSize,
			// draw
			function (ctx, item, dx, dy) {
				ctx.fillStyle = "navy";
				ctx.fillRect(item.x + dx, item.y + dy,
					canvas.dims.controlSize, canvas.dims.controlSize);
				ctx.fillStyle = window["vplNode"] ? "white" : "#777";
				ctx.fillRect(item.x + dx + canvas.dims.controlSize * 0.28,
					item.y + dy + canvas.dims.controlSize * 0.28,
					canvas.dims.controlSize * 0.44, canvas.dims.controlSize * 0.44);
				ctx.fill();
			},
			// mousedown
			function (data, x, y, ev) {
				if (window["vplNode"]) {
					window["vplRunFunction"]("motor.left.target = 0\nmotor.right.target = 0\n");
					self.uploaded = false;
				}
				return 0;
			},
			// doDrop
			null,
			// canDrop
			null);
	}

	if (this.experimentalFeatures) {
        // duplicate
        canvas.addControl(controlPos[controlIx++],
            canvas.dims.margin,
            canvas.dims.controlSize, canvas.dims.controlSize,
            // draw
            function (ctx, item, dx, dy) {
                ctx.fillStyle = "navy";
                ctx.fillRect(item.x + dx, item.y + dy,
                    canvas.dims.controlSize, canvas.dims.controlSize);
                ctx.strokeStyle = "white";
                ctx.lineWidth = canvas.dims.blockLineWidth;
                ctx.strokeRect(item.x + dx + canvas.dims.controlSize * 0.3,
                    item.y + dy + canvas.dims.controlSize * 0.3,
                    canvas.dims.controlSize * 0.4, canvas.dims.controlSize * 0.15);
                ctx.strokeRect(item.x + dx + canvas.dims.controlSize * 0.3,
                    item.y + dy + canvas.dims.controlSize * 0.55,
                    canvas.dims.controlSize * 0.4, canvas.dims.controlSize * 0.15);
            },
            // mousedown
            null,
            // doDrop: duplicate event handler
            function (targetItem, draggedItem) {
                    if (draggedItem.data instanceof A3a.vpl.EventHandler) {
                    var i = self.program.indexOf(draggedItem.data);
                    if (i >= 0) {
                        self.saveStateBeforeChange();
                        self.program.splice(i + 1, 0, draggedItem.data.copy());
                        canvas.onUpdate && canvas.onUpdate();
                    }
                }
            },
            // canDrop: accept event handler
            function (targetItem, draggedItem) {
                return !(draggedItem.data instanceof A3a.vpl.Block);
            });

		// disable
		canvas.addControl(controlPos[controlIx++],
			canvas.dims.margin,
			canvas.dims.controlSize, canvas.dims.controlSize,
			// draw
			function (ctx, item, dx, dy) {
				ctx.fillStyle = "navy";
				ctx.fillRect(item.x + dx, item.y + dy,
					canvas.dims.controlSize, canvas.dims.controlSize);
				ctx.strokeStyle = "white";
				ctx.lineWidth = canvas.dims.blockLineWidth;
				ctx.strokeRect(item.x + dx + canvas.dims.controlSize * 0.3,
					item.y + dy + canvas.dims.controlSize * 0.3,
					canvas.dims.controlSize * 0.4, canvas.dims.controlSize * 0.4);
				ctx.beginPath();
				ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.2,
					item.y + dy + canvas.dims.controlSize * 0.6);
				ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.8,
					item.y + dy + canvas.dims.controlSize * 0.4);
				ctx.stroke();
			},
			// mousedown
			null,
			// doDrop: disable or reenable block or event handler
			function (targetItem, draggedItem) {
				if (draggedItem.data instanceof A3a.vpl.Block) {
					self.saveStateBeforeChange();
					draggedItem.data.disabled = !draggedItem.data.disabled;
					canvas.onUpdate && canvas.onUpdate();
				} else if (draggedItem.data instanceof A3a.vpl.EventHandler) {
					self.saveStateBeforeChange();
					draggedItem.data.toggleDisable();
					canvas.onUpdate && canvas.onUpdate();
				}
			},
			// canDrop: accept event handler or block in event handler
			function (targetItem, draggedItem) {
				return !(draggedItem.data instanceof A3a.vpl.Block)
					|| draggedItem.data.eventHandlerContainer !== null;
			});

		if (this.teacherRole) {
			// lock
			canvas.addControl(controlPos[controlIx++],
				canvas.dims.margin,
				canvas.dims.controlSize, canvas.dims.controlSize,
				// draw
				function (ctx, item, dx, dy) {
					ctx.fillStyle = "navy";
					ctx.fillRect(item.x + dx, item.y + dy,
						canvas.dims.controlSize, canvas.dims.controlSize);
					ctx.strokeStyle = "white";
					ctx.fillStyle = "white";
					ctx.lineWidth = canvas.dims.blockLineWidth;
					ctx.strokeRect(item.x + dx + canvas.dims.controlSize * 0.3,
						item.y + dy + canvas.dims.controlSize * 0.3,
						canvas.dims.controlSize * 0.4, canvas.dims.controlSize * 0.4);
					A3a.vpl.Canvas.lock(ctx,
						item.x + dx + canvas.dims.controlSize * 0.5,
						item.y + dy + canvas.dims.controlSize * 0.52,
						canvas.dims.controlSize * 0.04,
						"white");
				},
				// mousedown
				null,
				// doDrop: lock or unlock block or event handler
				function (targetItem, draggedItem) {
					if (draggedItem.data instanceof A3a.vpl.Block) {
						self.saveStateBeforeChange();
						draggedItem.data.locked = !draggedItem.data.locked;
						canvas.onUpdate && canvas.onUpdate();
					} else if (draggedItem.data instanceof A3a.vpl.EventHandler) {
						self.saveStateBeforeChange();
						draggedItem.data.locked = !draggedItem.data.locked;
						canvas.onUpdate && canvas.onUpdate();
					}
				},
				// canDrop: accept event handler or block in event handler
				function (targetItem, draggedItem) {
					return !(draggedItem.data instanceof A3a.vpl.Block)
						|| draggedItem.data.eventHandlerContainer !== null;
				});
		}
	}

	// trashcan
	canvas.addControl(controlPos[controlIx++],
		canvas.dims.margin,
		canvas.dims.controlSize, canvas.dims.controlSize,
		// draw
		function (ctx, item, dx, dy) {
			ctx.fillStyle = "navy";
			ctx.fillRect(item.x + dx, item.y + dy,
				canvas.dims.controlSize, canvas.dims.controlSize);
			ctx.beginPath();
			ctx.moveTo(item.x + dx + canvas.dims.controlSize * 0.25,
				item.y + dy + canvas.dims.controlSize * 0.2);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.32,
				item.y + dy + canvas.dims.controlSize * 0.8);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.68,
				item.y + dy + canvas.dims.controlSize * 0.8);
			ctx.lineTo(item.x + dx + canvas.dims.controlSize * 0.75,
				item.y + dy + canvas.dims.controlSize * 0.2);
			ctx.closePath();
			ctx.strokeStyle = "white";
			ctx.lineWidth = canvas.dims.blockLineWidth;
			ctx.stroke();
		},
		// mousedown
		null,
		// doDrop: remove block or event handler
		function (targetItem, draggedItem) {
			if (draggedItem.data instanceof A3a.vpl.Block) {
				if (draggedItem.data.eventHandlerContainer !== null) {
					self.saveStateBeforeChange();
					draggedItem.data.eventHandlerContainer.removeBlock(
						/** @type {A3a.vpl.positionInContainer} */(draggedItem.data.positionInContainer));
					canvas.onUpdate && canvas.onUpdate();
				}
			} else if (draggedItem.data instanceof A3a.vpl.EventHandler) {
				var i = self.program.indexOf(draggedItem.data);
				if (i >= 0) {
					self.saveStateBeforeChange();
					self.program.splice(i, 1);
					canvas.onUpdate && canvas.onUpdate();
				}
			}
		},
		// canDrop: accept event handler or block in event handler
		function (targetItem, draggedItem) {
			return draggedItem.data instanceof A3a.vpl.Block
				? draggedItem.data.eventHandlerContainer !== null && !draggedItem.data.locked
				: !draggedItem.data.locked;
		});

	// scrolling area vertical span, used to choose the layout of templates
	var scrollingAreaY = canvas.dims.margin + canvas.dims.topControlSpace -
		2 * canvas.dims.blockLineWidth;
	var scrollingAreaH = canvasSize.height - scrollingAreaY - canvas.dims.margin + 2 * canvas.dims.blockLineWidth;

	// templates
	var nEvTemplates = 0;
	var nAcTemplates = 0;
	A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
		if (this.customizationMode ||
			((blockTemplate.modes.indexOf(this.mode) >= 0 || this.disabledBlocks.length > 0) &&
				this.disabledBlocks.indexOf(blockTemplate.name) < 0)) {
			switch (blockTemplate.type) {
 			case A3a.vpl.blockType.event:
			case A3a.vpl.blockType.state:
				nEvTemplates++;
				break;
			case A3a.vpl.blockType.action:
			case A3a.vpl.blockType.comment:
				nAcTemplates++;
				break;
			}
		}
	}, this);
	var step = canvas.dims.blockSize * canvas.dims.templateScale +
		canvas.dims.interBlockSpace;
	var evCol = Math.ceil(nEvTemplates * step / scrollingAreaH);
	var acCol = Math.ceil(nAcTemplates * step / scrollingAreaH);
	var colLen = Math.ceil(nEvTemplates / evCol);
	var row = 0;
	A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
		if ((blockTemplate.type === A3a.vpl.blockType.event ||
				blockTemplate.type === A3a.vpl.blockType.state) &&
			(this.customizationMode ||
				((blockTemplate.modes.indexOf(this.mode) >= 0 || this.disabledBlocks.length > 0) &&
					this.disabledBlocks.indexOf(blockTemplate.name) < 0))) {
			var x = canvas.dims.margin + Math.floor(row / colLen) * step;
			var y = canvas.dims.margin + canvas.dims.topControlSpace + step * (row % colLen);
			self.addBlockTemplateToCanvas(canvas, blockTemplate, x, y);
			row++;
		}
	}, this);
	colLen = Math.ceil(nAcTemplates / acCol);
	row = 0;
	A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
		if ((blockTemplate.type === A3a.vpl.blockType.action ||
				blockTemplate.type === A3a.vpl.blockType.comment) &&
			(this.customizationMode ||
				((blockTemplate.modes.indexOf(this.mode) >= 0 || this.disabledBlocks.length > 0) &&
					this.disabledBlocks.indexOf(blockTemplate.name) < 0))) {
			var x = canvasSize.width - canvas.dims.margin + canvas.dims.interBlockSpace -
				step - Math.floor(row / colLen) * step;
			var y = canvas.dims.margin + canvas.dims.topControlSpace + step * (row % colLen);
			self.addBlockTemplateToCanvas(canvas, blockTemplate, x, y);
			row++;
		}
	}, this);

	// program
	// scroll region
	var scrollingAreaX = 2 * canvas.dims.margin - canvas.dims.interBlockSpace +
		step * evCol;
	var scrollingAreaW = canvasSize.width - 2 * scrollingAreaX + (evCol - acCol) * step;
	var scrollingTotalHeight = this.program.length
		* (canvas.dims.blockSize + canvas.dims.interRowSpace);
	renderingState.vertScroll = Math.max(0, Math.min(renderingState.vertScroll, scrollingTotalHeight - scrollingAreaH));
	var scrollingAreaItem = new A3a.vpl.CanvasItem(null,
		scrollingAreaW, scrollingAreaH, scrollingAreaX, scrollingAreaY,
		null,
		scrollingTotalHeight > scrollingAreaH
			? {
				mousedown: function (canvas, data, width, height, x, y, downEvent) {
					renderingState.y0 = downEvent.clientY;
					return 0;
				},
				mousedrag: function (canvas, data, dragging, width, height, x, y, dragEvent) {
					var delta = Math.max(Math.min(
						dragEvent.clientY - renderingState.y0,	// mouse-specified shift
						renderingState.vertScroll),	// min
						renderingState.vertScroll - scrollingTotalHeight + scrollingAreaH);	// max
					renderingState.vertScroll -= delta;
					renderingState.y0 += delta;
				}
			}
			: null,
		null,
		null);
	eventX0 += (evCol - acCol) * step / 2;
	actionX0 += (evCol - acCol) * step / 2;
	scrollingAreaItem.draggable = false;
	canvas.setItem(scrollingAreaItem);
	if (scrollingTotalHeight > scrollingAreaH) {
		canvas.addDecoration(function (ctx) {
			var scrollbarRelLength = scrollingAreaH / scrollingTotalHeight;
			var scrollbarAbsLength = Math.max(scrollbarRelLength * scrollingAreaH,
				Math.min(20, scrollingAreaH));
			var scrollbarMaxMotion = scrollingAreaH - scrollbarAbsLength;
			var scrollbarRelMotion = renderingState.vertScroll / (scrollingTotalHeight - scrollingAreaH);
			var scrollbarMotion = scrollbarRelMotion * scrollbarMaxMotion;
			ctx.save();
			ctx.fillStyle = "#ccc";
			ctx.fillRect(scrollingAreaX + scrollingAreaW + 2, scrollingAreaY,
				5, scrollingAreaH);
			ctx.fillStyle = "navy";
			ctx.fillRect(scrollingAreaX + scrollingAreaW + 2, scrollingAreaY + scrollbarMotion,
				5, scrollbarAbsLength);
			ctx.restore();
		});
	}
	canvas.beginClip(scrollingAreaX, scrollingAreaY,
		scrollingAreaW, scrollingAreaH);
	var errorMsg = "";
	this.program.forEach(function (eventHandler, i) {
		self.addEventHandlerToCanvas(canvas, eventHandler,
			displaySingleEvent,
			eventX0, actionX0, eventWidth,
			canvas.dims.margin + canvas.dims.topControlSpace
				+ (canvas.dims.blockSize + canvas.dims.interRowSpace) * i
				- renderingState.vertScroll);
		if (eventHandler.error !== null && errorMsg === "") {
			errorMsg = eventHandler.error.msg;
			if (eventHandler.error.conflictEventHandler !== null) {
				for (var j = i + 1; j < self.program.length; j++) {
					if (self.program[j] === eventHandler.error.conflictEventHandler) {
						self.addEventHandlerConflictLinkToCanvas(canvas,
							eventX0,
							canvas.dims.margin + canvas.dims.topControlSpace
								+ (canvas.dims.blockSize + canvas.dims.interRowSpace) * i
								- renderingState.vertScroll,
							canvas.dims.margin + canvas.dims.topControlSpace
								+ (canvas.dims.blockSize + canvas.dims.interRowSpace) * j
								- renderingState.vertScroll);
						break;
					}
				}
			}
		}
	});
	canvas.endClip();
	if (errorMsg) {
		// display first error message
		canvas.addDecoration(function (ctx) {
			ctx.save();
			ctx.fillStyle = "#f88";
			ctx.font = Math.round(canvas.dims.blockSize * 0.22).toString() + "px sans-serif";
			ctx.textAlign = "left";
			ctx.textBaseline = "bottom";
			ctx.fillText(errorMsg, eventX0 - canvas.dims.blockSize * 0.6, scrollingAreaY);
			ctx.restore();
		});
	}

	this.onUpdate && this.onUpdate();
	canvas.redraw();
};

/** Scroll canvas, typically because of wheel or keyboard event
	@param {A3a.vpl.Canvas} canvas
	@param {number} dy
	@return {void}
*/
A3a.vpl.Program.prototype.scrollCanvas = function (canvas, dy) {
	var renderingState = /** @type {A3a.vpl.Program.CanvasRenderingState} */(canvas.state);
	renderingState.vertScroll += dy;
};
