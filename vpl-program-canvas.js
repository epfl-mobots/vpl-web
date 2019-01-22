/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Program rendition state (scroll, zoom, etc.)
	@constructor
	@struct
*/
A3a.vpl.Program.CanvasRenderingState = function () {
	this.programScroll = new A3a.vpl.VertScrollArea(1);
	this.eventScroll = new A3a.vpl.VertScrollArea(1);
	this.eventScroll.leftScrollbar = true;
	this.actionScroll = new A3a.vpl.VertScrollArea(1);
};

/** Add a block to a canvas
	@param {A3a.vpl.Canvas} canvas
	@param {A3a.vpl.Block} block
	@param {number} x
	@param {number} y
	@param {{
		notInteractive:(boolean|undefined),
		notDropTarget:(boolean|undefined),
		notClickable:(boolean|undefined),
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
					canvas.dims.blockLineWidth = dims0.blockLineWidth;    // unscaled line width for disabled mark
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
					/** @type {A3a.vpl.CanvasItem.mousedown} */
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
	if (!(opts && opts.notInteractive || !block.blockTemplate.mousedown) && self.zoomBlocks) {
		item.zoomOnLongPress = function (zoomedItem) {
			return canvas.makeZoomedClone(zoomedItem);
		};
	}
	item.clickable = !(opts && opts.notClickable);
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
	var disabled = (this.mode === A3a.vpl.mode.basic ? this.enabledBlocksBasic : this.enabledBlocksAdvanced)
		.indexOf(blockTemplate.name) < 0;
	var self = this;
	this.addBlockToCanvas(canvas, block, x, y,
		{
			notInteractive: true,
			notDropTarget: true,
			scale: canvas.dims.templateScale,
			disabled: disabled,
			/** @type {?A3a.vpl.CanvasItem.mousedown} */
			mousedown: this.uiConfig.customizationMode
				? function (canvas, data, width, height, x, y, downEvent) {
					var a = self.mode === A3a.vpl.mode.basic ? self.enabledBlocksBasic : self.enabledBlocksAdvanced;
					if (a.indexOf(blockTemplate.name) >= 0) {
						a.splice(a.indexOf(blockTemplate.name), 1);
					} else {
						a.push(blockTemplate.name);
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
			if (self.zoomBlocks) {
				ctx.strokeStyle = canvas.dims.ruleMarks;
				ctx.strokeRect(item.x + dx, item.y + dy, item.width, item.height);
			} else {
				ctx.fillStyle = canvas.dims.ruleBackground;
				ctx.fillRect(item.x + dx, item.y + dy, item.width, item.height);
			}
			// colon (two darker dots)
			ctx.fillStyle = canvas.dims.ruleMarks;
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
            return droppedItem.data instanceof A3a.vpl.EventHandler
                // event handler: ok to another one
                ? droppedItem.data !== targetItem.data
                // block: not in parent event handler
                : droppedItem.data.eventHandlerContainer !== targetItem.data &&
                    // ...and not a new event in basic mode
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
					notClickable: eventHandler.disabled
				});
		} else {
			childItem = this.addBlockToCanvas(canvas,
				new A3a.vpl.EmptyBlock(A3a.vpl.blockType.event, eventHandler,
					{eventSide: true, index: j}),
				eventX0 + step * j,
				y,
				{
					notDropTarget: eventHandler.disabled,
					notClickable: true,
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
					notClickable: eventHandler.disabled
				});
		} else {
			childItem = this.addBlockToCanvas(canvas,
				new A3a.vpl.EmptyBlock(A3a.vpl.blockType.action, eventHandler,
					{eventSide: false, index: j}),
				actionX0 + step * j,
				y,
				{notDropTarget: false, notClickable: true, notDraggable: true});
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
			ctx.fillText(eventHandler.error.isWarning ? "!" : "?", xc, yc);
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
	@param {string} view "vpl", "src" or "sim"
	@param {{noVpl:(boolean|undefined),unlocked:(boolean|undefined)}=} options
	noVpl:true to prevent vpl (default: false),
	unlocked:true (with "src") for source code editor in unlocked state (disconnected
	from vpl)
	@return {void}
*/
A3a.vpl.Program.prototype.setView = function (view, options) {
	this.noVpl = options && options.noVpl || false;
	document.getElementById("vpl-editor").style.display = view === "vpl" ? "block" : "none";
	document.getElementById("src-editor").style.display = view === "src" ? "block" : "none";
	document.getElementById("sim-view").style.display = view === "sim" ? "block" : "none";
	switch (view) {
	case "src":
		window["vplEditor"].lockWithVPL(!(options && options.unlocked));
		window["vplEditor"].focus();
		break;
	case "sim":
		window["vplSim"].sim.start(false);
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
	this.getCode(this.currentLanguage);

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
	// position of first event block in program (will be adjusted to make room for lists of events and actions)
	var eventX0 = (canvasSize.width - eventWidth) / 2;
	// position of first action block in program (will be adjusted to make room for lists of events and actions)
	var actionX0 = eventX0 +
		canvas.dims.blockSize * nMaxEventHandlerELength +
		canvas.dims.interBlockSpace * (nMaxEventHandlerELength - 1) +
		canvas.dims.interEventActionSpace;

	// zoom blocks if too small
	this.zoomBlocks = canvas.dims.blockSize < 60;

	// start with an empty canvas
	canvas.clearItems();

	// author
	canvas.addDecoration(function (ctx) {
		ctx.save();
		ctx.font = "9px sans-serif";
		ctx.textAlign = "start";
		ctx.textBaseline = "bottom";
		ctx.rotate(-Math.PI / 2);
		ctx.fillText("EPFL 2018-2019",
			-canvasSize.height + canvas.dims.blockLineWidth,
			canvasSize.width - canvas.dims.blockLineWidth);
		ctx.restore();
	});

	// top controls
	var controlBar = new A3a.vpl.ControlBar(canvas);
	controlBar.setButtons(this.uiConfig,
		this.toolbarConfig || [
			"vpl:new",
			"vpl:save",
			"vpl:upload",
			"vpl:text",
			"!space",
			"vpl:advanced",
			"!stretch",
			"vpl:undo",
			"vpl:redo",
			"!stretch",
			"vpl:run",
			"vpl:stop",
			"vpl:sim",
			"!stretch",
			"vpl:duplicate",
			"vpl:disable",
			"vpl:lock",
			"vpl:trashcan",
			"!stretch",
			"vpl:teacher-reset",
			"vpl:teacher-save",
			"vpl:teacher"
		],
		this.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS,
		this.toolbarGetButtonBounds || A3a.vpl.Commands.getButtonBoundsJS);
	var controlBarPos = {
		xmin: canvas.dims.margin,
		xmax: canvasSize.width - canvas.dims.margin,
		ymin: canvas.dims.margin,
		ymax: canvas.dims.margin + canvas.dims.controlSize
	};
	controlBar.calcLayout(controlBarPos,
		canvas.dims.interBlockSpace, 2 * canvas.dims.interBlockSpace);
	controlBar.addToCanvas();

	// scrolling area vertical span, used to choose the layout of templates
	var scrollingAreaY = canvas.dims.margin + canvas.dims.topControlSpace -
		2 * canvas.dims.blockLineWidth;
	var scrollingAreaH = canvasSize.height - scrollingAreaY - canvas.dims.margin + 2 * canvas.dims.blockLineWidth;

	// templates
	var nEvTemplates = 0;
	var nAcTemplates = 0;
	A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
		if (this.uiConfig.customizationMode ||
			(self.mode === A3a.vpl.mode.basic ? this.enabledBlocksBasic : this.enabledBlocksAdvanced)
				.indexOf(blockTemplate.name) >= 0) {
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
	var eventLibWidth = 0;
	var actionLibWidth = 0;
	if (canvas.dims.scrollingBlockLib) {
		eventLibWidth = canvas.dims.blockSize * canvas.dims.templateScale + canvas.dims.interBlockSpace;
		renderingState.eventScroll.setTotalHeight(nEvTemplates * step - canvas.dims.interBlockSpace);
		renderingState.eventScroll.resize(canvas.dims.margin,
			canvas.dims.margin + canvas.dims.topControlSpace,
			eventLibWidth,
			scrollingAreaH);
		renderingState.eventScroll.begin(canvas);
		var row = 0;
		A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
			if ((blockTemplate.type === A3a.vpl.blockType.event ||
					blockTemplate.type === A3a.vpl.blockType.state) &&
				(this.uiConfig.customizationMode ||
					(self.mode === A3a.vpl.mode.basic ? this.enabledBlocksBasic : this.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				self.addBlockTemplateToCanvas(canvas, blockTemplate,
					canvas.dims.margin + canvas.dims.interBlockSpace,
					canvas.dims.topControlSpace + canvas.dims.margin + row * step);
				row++;
			}
		}, this);
		renderingState.eventScroll.end();

		actionLibWidth = canvas.dims.blockSize * canvas.dims.templateScale + canvas.dims.interBlockSpace;
		renderingState.actionScroll.setTotalHeight(nAcTemplates * step - canvas.dims.interBlockSpace);
		renderingState.actionScroll.resize(canvasSize.width - canvas.dims.margin - actionLibWidth,
			canvas.dims.margin + canvas.dims.topControlSpace,
			actionLibWidth,
			scrollingAreaH);
		renderingState.actionScroll.begin(canvas);
		row = 0;
		A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
			if ((blockTemplate.type === A3a.vpl.blockType.action ||
					blockTemplate.type === A3a.vpl.blockType.comment) &&
				(this.uiConfig.customizationMode ||
					(self.mode === A3a.vpl.mode.basic ? this.enabledBlocksBasic : this.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				self.addBlockTemplateToCanvas(canvas, blockTemplate,
					canvasSize.width - actionLibWidth - canvas.dims.margin,
					canvas.dims.topControlSpace + canvas.dims.margin + row * step);
				row++;
			}
		}, this);
		renderingState.actionScroll.end();
	} else {
		var evCol = Math.ceil(nEvTemplates * step / scrollingAreaH);
		var acCol = Math.ceil(nAcTemplates * step / scrollingAreaH);

		eventLibWidth = evCol * step - canvas.dims.interBlockSpace;
		var colLen = Math.ceil(nEvTemplates / evCol);
		var row = 0;
		A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
			if ((blockTemplate.type === A3a.vpl.blockType.event ||
					blockTemplate.type === A3a.vpl.blockType.state) &&
				(this.uiConfig.customizationMode ||
					(self.mode === A3a.vpl.mode.basic ? this.enabledBlocksBasic : this.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				var x = canvas.dims.margin + Math.floor(row / colLen) * step;
				var y = canvas.dims.margin + canvas.dims.topControlSpace + step * (row % colLen);
				self.addBlockTemplateToCanvas(canvas, blockTemplate, x, y);
				row++;
			}
		}, this);

		actionLibWidth = acCol * step - canvas.dims.interBlockSpace;
		colLen = Math.ceil(nAcTemplates / acCol);
		row = 0;
		A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
			if ((blockTemplate.type === A3a.vpl.blockType.action ||
					blockTemplate.type === A3a.vpl.blockType.comment) &&
				(this.uiConfig.customizationMode ||
					(self.mode === A3a.vpl.mode.basic ? this.enabledBlocksBasic : this.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				var x = canvasSize.width - canvas.dims.margin + canvas.dims.interBlockSpace -
					(acCol - Math.floor(row / colLen)) * step;
				var y = canvas.dims.margin + canvas.dims.topControlSpace + step * (row % colLen);
				self.addBlockTemplateToCanvas(canvas, blockTemplate, x, y);
				row++;
			}
		}, this);
	}

	// program
	// scroll region
	renderingState.programScroll.setTotalHeight(this.program.length
		* (canvas.dims.blockSize + canvas.dims.interRowSpace));
	var scrollingAreaX = 2 * canvas.dims.margin + eventLibWidth;
	var scrollingAreaWidth = canvasSize.width - eventLibWidth - actionLibWidth - canvas.dims.scrollbarWidth - 4 * canvas.dims.margin;
	renderingState.programScroll.resize(scrollingAreaX, scrollingAreaY,
		scrollingAreaWidth,
		scrollingAreaH);
	renderingState.programScroll.begin(canvas);
	eventX0 += (eventLibWidth - actionLibWidth) / 2 - canvas.dims.scrollbarWidth / 2;
	actionX0 += (eventLibWidth - actionLibWidth) / 2 - canvas.dims.scrollbarWidth / 2;
	var errorMsg = "";
	this.program.forEach(function (eventHandler, i) {
		self.addEventHandlerToCanvas(canvas, eventHandler,
			displaySingleEvent,
			eventX0, actionX0, eventWidth,
			canvas.dims.margin + canvas.dims.topControlSpace
				+ (canvas.dims.blockSize + canvas.dims.interRowSpace) * i);
		if (eventHandler.error !== null && errorMsg === "") {
			errorMsg = eventHandler.error.msg;
			if (eventHandler.error.conflictEventHandler !== null) {
				for (var j = i + 1; j < self.program.length; j++) {
					if (self.program[j] === eventHandler.error.conflictEventHandler) {
						self.addEventHandlerConflictLinkToCanvas(canvas,
							eventX0,
							canvas.dims.margin + canvas.dims.topControlSpace
								+ (canvas.dims.blockSize + canvas.dims.interRowSpace) * i,
							canvas.dims.margin + canvas.dims.topControlSpace
								+ (canvas.dims.blockSize + canvas.dims.interRowSpace) * j);
						break;
					}
				}
			}
		}
	});
	renderingState.programScroll.end();
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
	renderingState.programScroll.scrollCanvas(dy);
};
