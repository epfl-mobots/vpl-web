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
			notDraggable: this.noVPL,
			scale: canvas.dims.templateScale,
			disabled: disabled,
			/** @type {?A3a.vpl.CanvasItem.mousedown} */
			mousedown: this.uiConfig.customizationMode && !this.noVPL
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
		width + 2 * canvas.dims.stripHorMargin,
		canvas.dims.blockSize + 2 * canvas.dims.stripVertMargin,
		x - canvas.dims.stripHorMargin,
		y,
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
			// event/action separator
			var separatorBounds = canvas.getWidgetBounds("vpl:then");
			var separatorWidth = (separatorBounds.xmax - separatorBounds.xmin) ||
				canvas.dims.interEventActionSpace;
			canvas.drawWidget("vpl:then",
				actionX0 - separatorWidth / 2 + dx,
				y + canvas.dims.stripVertMargin + canvas.dims.blockSize * 0.5 + dy);
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
	if (this.noVPL) {
		item.draggable = false;
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
				y + canvas.dims.stripVertMargin,
				{
					notInteractive: eventHandler.disabled || this.noVPL,
					notClickable: eventHandler.disabled || this.noVPL,
					notDraggable: this.noVPL
				});
		} else {
			childItem = this.addBlockToCanvas(canvas,
				new A3a.vpl.EmptyBlock(A3a.vpl.blockType.event, eventHandler,
					{eventSide: true, index: j}),
				eventX0 + step * j,
				y + canvas.dims.stripVertMargin,
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
				y + canvas.dims.stripVertMargin,
				{
					notInteractive: eventHandler.disabled || this.noVPL,
					notClickable: eventHandler.disabled || this.noVPL,
					notDraggable: this.noVPL
				});
		} else {
			childItem = this.addBlockToCanvas(canvas,
				new A3a.vpl.EmptyBlock(A3a.vpl.blockType.action, eventHandler,
					{eventSide: false, index: j}),
				actionX0 + step * j,
				y + canvas.dims.stripVertMargin,
				{notDropTarget: false, notClickable: true, notDraggable: true});
		}
		item.attachItem(childItem);
	}, this);

	// error marks
	canvas.addDecoration(function (ctx) {
		if (eventHandler.error !== null) {
			var widgetBounds = canvas.getWidgetBounds(eventHandler.error.isWarning ? "vpl:warning" : "vpl:error");
			var widgetWidth = widgetBounds.xmax - widgetBounds.xmin;
			canvas.drawWidget(eventHandler.error.isWarning ? "vpl:warning" : "vpl:error",
				x - canvas.dims.stripHorMargin - widgetWidth / 2,
				y + canvas.dims.stripVertMargin + canvas.dims.blockSize * 0.5);

			ctx.strokeStyle = eventHandler.error.isWarning ? canvas.dims.warningColor : canvas.dims.errorColor;
			ctx.lineWidth = canvas.dims.blockSize * 0.05;
			ctx.beginPath();
			var ya = y + canvas.dims.stripVertMargin + canvas.dims.blockSize + canvas.dims.stripVertMargin + canvas.dims.interRowSpace * 0.2;
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
	@param {boolean} isWarning
	@return {void}
*/
A3a.vpl.Program.prototype.addEventHandlerConflictLinkToCanvas = function (canvas, x, y1, y2, isWarning) {
	canvas.addDecoration(function (ctx) {
		// pink line
		var widgetBounds = canvas.getWidgetBounds(isWarning ? "vpl:warning" : "vpl:error");
		var widgetWidth = widgetBounds.xmax - widgetBounds.xmin;
		var widgetHeight = widgetBounds.ymax - widgetBounds.ymin;
		var xc = x - canvas.dims.stripHorMargin - widgetWidth / 2;
		var yc1 = y1 + canvas.dims.blockSize * 0.5 + widgetHeight / 2;
		var yc2 = y2 + canvas.dims.blockSize * 0.5 - widgetHeight / 2;
		ctx.strokeStyle = isWarning ? canvas.dims.warningColor : canvas.dims.errorColor;
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

/** Render the program to a single canvas
	@return {void}
*/
A3a.vpl.Application.prototype.renderProgramToCanvas = function () {
	var uiConfig = this.uiConfig;
	var canvas = this.vplCanvas;
	var program = this.program;

	// make sure code is up-to-date to have error info
	program.getCode(program.currentLanguage);

	var canvasSize = canvas.getSize();
	var renderingState = /** @type {A3a.vpl.Program.CanvasRenderingState} */(canvas.state.vpl);
	var self = this;
	var showState = program.mode === A3a.vpl.mode.advanced;

	// find size
	var displaySingleEvent = program.displaySingleEvent();
	var nMaxEventHandlers = program.program.length;
	var nMaxEventHandlerELength = 0;
	var nMaxEventHandlerALength = 0;
	program.program.forEach(function (eventHandler) {
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
	var separatorBounds = canvas.getWidgetBounds("vpl:then");
	var separatorWidth = (separatorBounds.xmax - separatorBounds.xmin) ||
		canvas.dims.interEventActionSpace;
	var eventWidth = ((nMaxEventHandlerELength + nMaxEventHandlerALength) * canvas.dims.blockSize
		+ separatorWidth
		+ (nMaxEventHandlerELength + nMaxEventHandlerALength - 2) * canvas.dims.interBlockSpace);
	// position of first event block in program (will be adjusted to make room for lists of events and actions)
	var eventX0 = (canvasSize.width - eventWidth) / 2;
	// position of first action block in program (will be adjusted to make room for lists of events and actions)
	var actionX0 = eventX0 +
		canvas.dims.blockSize * nMaxEventHandlerELength +
		canvas.dims.interBlockSpace * (nMaxEventHandlerELength - 1) +
		separatorWidth;

	// zoom blocks if too small
	program.zoomBlocks = canvas.dims.blockSize < canvas.dims.minInteractiveBlockSize;

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
	controlBar.setButtons(this,
		program.toolbarConfig || [
			"vpl:new",
			"vpl:save",
			// "vpl:load",
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
		program.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS,
		program.toolbarGetButtonBounds || A3a.vpl.Commands.getButtonBoundsJS);
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
		if (uiConfig.customizationMode ||
			(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
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
				(uiConfig.customizationMode ||
					(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				program.addBlockTemplateToCanvas(canvas, blockTemplate,
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
				(uiConfig.customizationMode ||
					(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				program.addBlockTemplateToCanvas(canvas, blockTemplate,
					canvasSize.width - actionLibWidth - canvas.dims.margin,
					canvas.dims.topControlSpace + canvas.dims.margin + row * step);
				row++;
			}
		}, this);
		renderingState.actionScroll.end();

		// more high and low hints
		canvas.addDecoration(function (ctx) {
			var moreHighBounds = canvas.getWidgetBounds("vpl:moreHigh");
			var moreHighHeight = moreHighBounds.ymax - moreHighBounds.ymin;
			var moreLowBounds = canvas.getWidgetBounds("vpl:moreLow");
			var moreLowHeight = moreLowBounds.ymax - moreLowBounds.ymin;
			if (!renderingState.eventScroll.isTop()) {
				// more to see above
				canvas.drawWidget("vpl:moreHigh",
					canvas.dims.margin + canvas.dims.interBlockSpace + canvas.dims.blockSize * canvas.dims.templateScale / 2,
					canvas.dims.topControlSpace + canvas.dims.margin + moreHighHeight / 2);
			}
			if (!renderingState.eventScroll.isBottom()) {
				// more to see below
				canvas.drawWidget("vpl:moreLow",
					canvas.dims.margin + canvas.dims.interBlockSpace + canvas.dims.blockSize * canvas.dims.templateScale / 2,
					canvas.dims.topControlSpace + canvas.dims.margin + scrollingAreaH - moreLowHeight / 2);
			}
			if (!renderingState.actionScroll.isTop()) {
				// more to see above
				canvas.drawWidget("vpl:moreHigh",
					canvasSize.width - actionLibWidth - canvas.dims.margin + canvas.dims.blockSize * canvas.dims.templateScale / 2,
					canvas.dims.topControlSpace + canvas.dims.margin + moreHighHeight / 2);
			}
			if (!renderingState.actionScroll.isBottom()) {
				// more to see below
				canvas.drawWidget("vpl:moreLow",
					canvasSize.width - actionLibWidth - canvas.dims.margin + canvas.dims.blockSize * canvas.dims.templateScale / 2,
					canvas.dims.topControlSpace + canvas.dims.margin + scrollingAreaH - moreLowHeight / 2);
			}
		});
	} else {
		var evCol = Math.ceil(nEvTemplates * step / scrollingAreaH);
		var acCol = Math.ceil(nAcTemplates * step / scrollingAreaH);

		eventLibWidth = evCol * step - canvas.dims.interBlockSpace;
		var colLen = Math.ceil(nEvTemplates / evCol);
		var row = 0;
		A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
			if ((blockTemplate.type === A3a.vpl.blockType.event ||
					blockTemplate.type === A3a.vpl.blockType.state) &&
				(uiConfig.customizationMode ||
					(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				var x = canvas.dims.margin + Math.floor(row / colLen) * step;
				var y = canvas.dims.margin + canvas.dims.topControlSpace + step * (row % colLen);
				program.addBlockTemplateToCanvas(canvas, blockTemplate, x, y);
				row++;
			}
		}, this);

		actionLibWidth = acCol * step - canvas.dims.interBlockSpace;
		colLen = Math.ceil(nAcTemplates / acCol);
		row = 0;
		A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
			if ((blockTemplate.type === A3a.vpl.blockType.action ||
					blockTemplate.type === A3a.vpl.blockType.comment) &&
				(uiConfig.customizationMode ||
					(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				var x = canvasSize.width - canvas.dims.margin + canvas.dims.interBlockSpace -
					(acCol - Math.floor(row / colLen)) * step;
				var y = canvas.dims.margin + canvas.dims.topControlSpace + step * (row % colLen);
				program.addBlockTemplateToCanvas(canvas, blockTemplate, x, y);
				row++;
			}
		}, this);
	}

	// program scroll region
	renderingState.programScroll.setTotalHeight(program.program.length *
		(canvas.dims.blockSize + 2 * canvas.dims.stripVertMargin + canvas.dims.interRowSpace));
	var scrollingAreaX = 2 * canvas.dims.margin + eventLibWidth;
	var scrollingAreaWidth = canvasSize.width - eventLibWidth - actionLibWidth - canvas.dims.scrollbarWidth - 4 * canvas.dims.margin;

	// 2nd toolbar at bottom between templates
	var toolbar2Config = program.toolbar2Config || [
		// empty by default
	];
	if (toolbar2Config.length > 0) {
		var controlBar2 = new A3a.vpl.ControlBar(canvas);
		controlBar2.setButtons(this,
			toolbar2Config,
			program.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS,
			program.toolbarGetButtonBounds || A3a.vpl.Commands.getButtonBoundsJS);
		var controlBar2Pos = {
			xmin: scrollingAreaX,
			xmax: scrollingAreaX + scrollingAreaWidth,
			ymin: scrollingAreaY + scrollingAreaH - canvas.dims.controlSize,
			ymax: scrollingAreaY + scrollingAreaH
		};
		scrollingAreaH -= canvas.dims.controlSize + canvas.dims.margin;
		controlBar2.calcLayout(controlBar2Pos,
			canvas.dims.interBlockSpace, 2 * canvas.dims.interBlockSpace);
		controlBar2.addToCanvas();
	}

	// program
	renderingState.programScroll.resize(scrollingAreaX, scrollingAreaY,
		scrollingAreaWidth,
		scrollingAreaH);
	renderingState.programScroll.begin(canvas);
	eventX0 += (eventLibWidth - actionLibWidth) / 2 - canvas.dims.scrollbarWidth / 2;
	actionX0 += (eventLibWidth - actionLibWidth) / 2 - canvas.dims.scrollbarWidth / 2;
	var errorMsg = "";
	var isWarning = false;
	program.program.forEach(function (eventHandler, i) {
		program.addEventHandlerToCanvas(canvas, eventHandler,
			displaySingleEvent,
			eventX0, actionX0, eventWidth,
			canvas.dims.margin + canvas.dims.topControlSpace
				+ (canvas.dims.blockSize + 2 * canvas.dims.stripVertMargin + canvas.dims.interRowSpace) * i);
		if (eventHandler.error !== null && errorMsg === "") {
			errorMsg = eventHandler.error.msg;
			isWarning = eventHandler.error.isWarning;
			if (eventHandler.error.conflictEventHandler !== null) {
				for (var j = i + 1; j < program.program.length; j++) {
					if (program.program[j] === eventHandler.error.conflictEventHandler) {
						program.addEventHandlerConflictLinkToCanvas(canvas,
							eventX0,
							canvas.dims.margin + canvas.dims.topControlSpace
								+ canvas.dims.stripVertMargin
								+ (canvas.dims.blockSize + 2 * canvas.dims.stripVertMargin + canvas.dims.interRowSpace) * i,
							canvas.dims.margin + canvas.dims.topControlSpace
								+ canvas.dims.stripVertMargin
								+ (canvas.dims.blockSize + 2 * canvas.dims.stripVertMargin + canvas.dims.interRowSpace) * j,
							eventHandler.error.isWarning);
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
			ctx.fillStyle = isWarning ? canvas.dims.warningColor : canvas.dims.errorColor;
			ctx.font = Math.round(canvas.dims.blockSize * 0.22).toString() + "px sans-serif";
			ctx.textAlign = "left";
			ctx.textBaseline = "bottom";
			ctx.fillText(errorMsg, eventX0 - canvas.dims.blockSize * 0.6, scrollingAreaY);
			ctx.restore();
		});
	}

	if (program.noVPL) {
		canvas.addDecoration(function (ctx) {
			canvas.disabledMark(canvas.dims.margin, canvas.dims.margin,
				canvasSize.width - 2 * canvas.dims.margin, canvasSize.height - 2 * canvas.dims.margin,
				3);
		});
	}

	program.onUpdate && program.onUpdate();
	canvas.redraw();
};
