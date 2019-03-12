/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/*
General layout:

in a top-level view which fills the canvas area:
toolbar at top, full width
event block library on left, below top toolbar, down to bottom
action block library on right, below top toolbar, down to bottom
secondary toolbar at bottom, between event and action block libraries
vpl program in remaining area
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
	@param {CSSParser.Box.Rect} box
	@param {number} x horizontal block position (without box padding)
	@param {number} y vertical  block position (without box padding)
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
A3a.vpl.Program.prototype.addBlockToCanvas = function (canvas, block, box, x, y, opts) {
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
				box.drawAt(ctx, item.x + dx, item.y + dy);
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
				box.drawAt(ctx, item.x + dx, item.y + dy);
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
	@param {CSSParser.Box.Rect} box
	@param {number} x horizontal block template position (without box padding)
	@param {number} y vertical  block template position (without box padding)
	@return {void}
*/
A3a.vpl.Program.prototype.addBlockTemplateToCanvas = function (canvas, blockTemplate, box, x, y) {
	var block = new A3a.vpl.Block(blockTemplate, null, null);
	var disabled = (this.mode === A3a.vpl.mode.basic ? this.enabledBlocksBasic : this.enabledBlocksAdvanced)
		.indexOf(blockTemplate.name) < 0;
	var self = this;
	this.addBlockToCanvas(canvas, block, box, x, y,
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
	@param {number} y
	@param {CSSParser.Box.Rect} blockEventBox
	@param {CSSParser.Box.Rect} blockActionBox
	@param {CSSParser.Box.Rect} blockStateBox
	@param {CSSParser.Box.Rect} blockCommentBox
	@param {CSSParser.Box.Rect} ruleBox
	@param {CSSParser.Box.Rect} separatorBox
	@return {void}
*/
A3a.vpl.Program.prototype.addEventHandlerToCanvas =
	function (canvas, eventHandler, displaySingleEvent, eventX0, actionX0, y,
		blockEventBox, blockActionBox, blockStateBox, blockCommentBox, ruleBox, separatorBox) {

	/** Get block box for the specified type
		@param {A3a.vpl.Block} block
		@return {CSSParser.Box.Rect}
	*/
	function boxForBlockType(block) {
		switch (block.blockTemplate.type) {
		case A3a.vpl.blockType.event:
			return blockEventBox;
		case A3a.vpl.blockType.action:
			return blockActionBox;
		case A3a.vpl.blockType.state:
			return blockStateBox;
		case A3a.vpl.blockType.comment:
			return blockCommentBox;
		default:
			throw "internal";	// hidden or undef, shouldn't be in event handler
		}
	}

	var canvasSize = canvas.getSize();
	var x = eventX0;
	var step = blockEventBox.totalWidth();

	var self = this;
	var item = new A3a.vpl.CanvasItem(eventHandler,
		ruleBox.paddedWidth(),
		ruleBox.paddedHeight(),
		x - ruleBox.paddingLeft - blockEventBox.offsetLeft(),
		y - ruleBox.paddingTop - blockEventBox.offsetTop(),
		// draw
		function (ctx, item, dx, dy) {
			// strip
			ruleBox.drawAt(ctx, item.x + dx, item.y + dy, true);
			// event/action separator
			var widgetBounds = canvas.getWidgetBounds("vpl:then");
			var separatorWidth = (widgetBounds.xmax - widgetBounds.xmin) || 0;
			separatorBox.drawAt(ctx,
				actionX0 - separatorBox.width - separatorBox.marginRight - separatorBox.paddingRight - blockEventBox.offsetLeft() + dx,
				item.y + (ruleBox.paddedHeight() - separatorBox.height) / 2 + dy);
			canvas.drawWidget("vpl:then",
				actionX0 - separatorBox.totalWidth() / 2 - blockEventBox.offsetLeft() + dx,
				item.y + ruleBox.paddedHeight() / 2 + dy);
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
			childItem = this.addBlockToCanvas(canvas, event, boxForBlockType(event),
				eventX0 + step * j,
				y,
				{
					notInteractive: eventHandler.disabled || this.noVPL,
					notClickable: eventHandler.disabled || this.noVPL,
					notDraggable: this.noVPL
				});
		} else {
			childItem = this.addBlockToCanvas(canvas,
				new A3a.vpl.EmptyBlock(A3a.vpl.blockType.event, eventHandler,
					{eventSide: true, index: j}),
				blockEventBox,
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
			childItem = this.addBlockToCanvas(canvas, action, boxForBlockType(action),
				actionX0 + step * j,
				y,
				{
					notInteractive: eventHandler.disabled || this.noVPL,
					notClickable: eventHandler.disabled || this.noVPL,
					notDraggable: this.noVPL
				});
		} else {
			childItem = this.addBlockToCanvas(canvas,
				new A3a.vpl.EmptyBlock(A3a.vpl.blockType.action, eventHandler,
					{eventSide: false, index: j}),
				blockActionBox,
				actionX0 + step * j,
				y,
				{notDropTarget: false, notClickable: true, notDraggable: true});
		}
		item.attachItem(childItem);
	}, this);

	// error marks
	canvas.addDecoration(function (ctx) {
		if (eventHandler.error !== null) {
			var widgetBounds = canvas.getWidgetBounds(eventHandler.error.isWarning ? "vpl:warning" : "vpl:error");
			var errorBox = canvas.css.getBox({tag: "widget", id: "widget-error", pseudoClass: this.zoomBlocks ? ["small"] : []});
			errorBox.width = widgetBounds.xmax - widgetBounds.xmin;
			errorBox.height = widgetBounds.ymax - widgetBounds.ymin;
			canvas.drawWidget(eventHandler.error.isWarning ? "vpl:warning" : "vpl:error",
				x - ruleBox.paddingLeft - blockEventBox.offsetLeft() - errorBox.width / 2,
				y + blockEventBox.height * 0.5);

			ctx.strokeStyle = eventHandler.error.isWarning ? canvas.dims.warningColor : canvas.dims.errorColor;
			ctx.lineWidth = canvas.dims.blockSize * 0.05;
			ctx.beginPath();
			var ya = y + blockEventBox.height + blockEventBox.paddingBottom + blockEventBox.marginBottom;
			if (eventHandler.error.eventError) {
				if (eventHandler.error.eventErrorIndices.length === 0) {
					ctx.moveTo(eventX0, ya);
					ctx.lineTo(eventX0 + step * (events.length - 1) + blockEventBox.width, ya);
				} else {
					for (var i = 0; i < eventHandler.error.eventErrorIndices.length; i++) {
						var xe = eventX0 +
								step * eventHandler.error.eventErrorIndices[i];
						ctx.moveTo(xe, ya);
						ctx.lineTo(xe + blockEventBox.width, ya);
					}
				}
			}
			for (var i = 0; i < eventHandler.error.actionErrorIndices.length; i++) {
				var xa = actionX0 + step * eventHandler.error.actionErrorIndices[i];
				ctx.moveTo(xa, ya);
				ctx.lineTo(xa + blockEventBox.width, ya);
			}
			ctx.stroke();
		}
	});
};

/** Add to a canvas a link between error marks for conflicting events
	@param {A3a.vpl.Canvas} canvas
	@param {number} x left side of first event block
	@param {number} y1 top side of blocks in first rule
	@param {number} y2 top side of blocks in second rule (below)
	@param {CSSParser.Box.Rect} ruleBox
	@param {CSSParser.Box.Rect} blockBox
	@param {boolean} isWarning
	@return {void}
*/
A3a.vpl.Program.prototype.addEventHandlerConflictLinkToCanvas = function (canvas, x, y1, y2, ruleBox, blockBox, isWarning) {
	canvas.addDecoration(function (ctx) {
		// pink line
		var widgetBounds = canvas.getWidgetBounds(isWarning ? "vpl:warning" : "vpl:error");
		var errorBox = canvas.css.getBox({
			tag: "widget",
			id: isWarning ? "widget-warning" : "widget-error",
			pseudoClass: this.zoomBlocks ? ["small"] : []
		});
		errorBox.width = widgetBounds.xmax - widgetBounds.xmin;
		errorBox.height = widgetBounds.ymax - widgetBounds.ymin;
		var xc = x - ruleBox.paddingLeft - blockBox.offsetLeft() - errorBox.width / 2;
		var yc1 = y1 + (blockBox.height + errorBox.height) / 2;
		var yc2 = y2 + (blockBox.height - errorBox.height) / 2;
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

	// zoom blocks if too small
	program.zoomBlocks = canvas.dims.blockSize < canvas.dims.minInteractiveBlockSize;

	var canvasSize = canvas.getSize();
	var renderingState = /** @type {A3a.vpl.Program.CanvasRenderingState} */(canvas.state.vpl);
	var self = this;
	var showState = program.mode === A3a.vpl.mode.advanced;

	// 2nd toolbar at bottom between templates
	var toolbar2Config = program.toolbar2Config || [
		// empty by default
	];

	// program item counts
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

	// template counts
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

	// boxes
	var viewBox = canvas.css.getBox({tag: "view", clas: ["vpl"]});
	var buttonBox = canvas.css.getBox({tag: "button", clas: ["vpl", "top"]});
	var button2Box = canvas.css.getBox({tag: "button", clas: ["vpl", "bottom"]});
	var separatorBox = canvas.css.getBox({tag: "separator", clas: ["vpl", "top"]});
	var separator2Box = canvas.css.getBox({tag: "separator", clas: ["vpl", "bottom"]});
	var toolbarBox = canvas.css.getBox({tag: "toolbar", clas: ["vpl", "top"]});
	var toolbar2Box = canvas.css.getBox({tag: "toolbar", clas: ["vpl", "bottom"]});
	var vplBox = canvas.css.getBox({tag: "vpl", id: "scrolling-vpl"});
	var blockEventBox = canvas.css.getBox({tag: "block", clas: ["event"], pseudoClass: this.zoomBlocks ? ["small"] : []});
	var blockActionBox = canvas.css.getBox({tag: "block", clas: ["action"], pseudoClass: this.zoomBlocks ? ["small"] : []});
	var blockStateBox = canvas.css.getBox({tag: "block", clas: ["state"], pseudoClass: this.zoomBlocks ? ["small"] : []});
	var blockCommentBox = canvas.css.getBox({tag: "block", clas: ["comment"], pseudoClass: this.zoomBlocks ? ["small"] : []});
	var ruleBox = canvas.css.getBox({tag: "rule", pseudoClass: this.zoomBlocks ? ["small"] : []});
	var ruleSeparatorBox = canvas.css.getBox({tag: "widget", id: "widget-then", pseudoClass: this.zoomBlocks ? ["small"] : []});
	var blockEventLibItemBox = canvas.css.getBox({tag: "block", clas: ["library", "event"]});
	var blockActionLibItemBox = canvas.css.getBox({tag: "block", clas: ["library", "action"]});
	var blockStateLibItemBox = canvas.css.getBox({tag: "block", clas: ["library", "state"]});
	var blockCommentLibItemBox = canvas.css.getBox({tag: "block", clas: ["library", "comment"]});
	var blockEventLibBox = canvas.css.getBox({tag: "block-library", clas: ["event"]});
	var blockActionLibBox = canvas.css.getBox({tag: "block-library", clas: ["action"]});

	// box sizes
	viewBox.setTotalWidth(canvasSize.width);
	viewBox.setTotalHeight(canvasSize.height);
	viewBox.setPosition(0, 0);
	buttonBox.width = canvas.dims.controlSize;
	buttonBox.height = canvas.dims.controlSize;
	button2Box.width = canvas.dims.controlSize;
	button2Box.height = canvas.dims.controlSize;
	toolbarBox.setTotalWidth(viewBox.width);
	toolbarBox.height = buttonBox.totalHeight();
	toolbarBox.setPosition(viewBox.x, viewBox.y);
	blockEventLibItemBox.height = canvas.dims.blockSize * canvas.dims.templateScale;
	blockEventLibItemBox.width = canvas.dims.blockSize * canvas.dims.templateScale;
	blockActionLibItemBox.height = canvas.dims.blockSize * canvas.dims.templateScale;
	blockActionLibItemBox.width = canvas.dims.blockSize * canvas.dims.templateScale;
	blockStateLibItemBox.height = canvas.dims.blockSize * canvas.dims.templateScale;
	blockStateLibItemBox.width = canvas.dims.blockSize * canvas.dims.templateScale;
	blockCommentLibItemBox.height = canvas.dims.blockSize * canvas.dims.templateScale;
	blockCommentLibItemBox.width = canvas.dims.blockSize * canvas.dims.templateScale;
	blockEventLibBox.setTotalHeight(viewBox.height - toolbarBox.totalHeight());
	var evCol = canvas.dims.scrollingBlockLib
		? 1
		: Math.ceil(nEvTemplates * blockEventLibItemBox.totalHeight() / blockEventLibBox.height);
	blockEventLibBox.width = evCol * blockEventLibItemBox.totalWidth();
	blockEventLibBox.setPosition(viewBox.x, viewBox.y + toolbarBox.totalHeight());
	blockActionLibBox.setTotalHeight(viewBox.height - toolbarBox.totalHeight());
	var acCol = canvas.dims.scrollingBlockLib
		? 1
		: Math.ceil(nAcTemplates * blockActionLibItemBox.totalHeight() / blockActionLibBox.height);
	blockActionLibBox.width = acCol * blockActionLibItemBox.totalWidth();
	blockActionLibBox.setPosition(viewBox.x + viewBox.width - blockActionLibBox.totalWidth(),
		viewBox.y + toolbarBox.totalHeight());
	toolbar2Box.setTotalWidth(viewBox.width - blockEventLibBox.totalWidth() - blockActionLibBox.totalWidth());
	toolbar2Box.height = button2Box.totalHeight();
	toolbar2Box.setPosition(viewBox.x + blockEventLibBox.totalWidth(),
		viewBox.y + viewBox.height - toolbar2Box.totalHeight());
	vplBox.setTotalWidth(viewBox.width - blockEventLibBox.totalWidth() - blockActionLibBox.totalWidth());
	vplBox.setTotalHeight(viewBox.height - toolbarBox.totalHeight() -
		(toolbar2Config.length > 0 ? toolbar2Box.totalHeight() : 0));
	vplBox.setPosition(viewBox.x + blockEventLibBox.totalWidth(), viewBox.y + toolbarBox.totalHeight());
	blockEventBox.width = canvas.dims.blockSize;
	blockEventBox.height = canvas.dims.blockSize;
	blockActionBox.width = canvas.dims.blockSize;
	blockActionBox.height = canvas.dims.blockSize;
	blockStateBox.width = canvas.dims.blockSize;
	blockStateBox.height = canvas.dims.blockSize;
	blockCommentBox.width = canvas.dims.blockSize;
	blockCommentBox.height = canvas.dims.blockSize;
	var widgetBounds = canvas.getWidgetBounds("vpl:then");
	if (widgetBounds) {
		ruleSeparatorBox.width = widgetBounds.xmax - widgetBounds.xmin;
		ruleSeparatorBox.height = widgetBounds.ymax - widgetBounds.ymin;
	}
	var ruleSeparatorWidth = ruleSeparatorBox.totalWidth();
	var ruleWidth = (nMaxEventHandlerELength + nMaxEventHandlerALength) * blockEventBox.totalWidth()
		+ ruleSeparatorWidth;
	// position of first event block in program (will be adjusted to make room for lists of events and actions)
	var eventX0 = viewBox.x + (viewBox.width - ruleWidth) / 2;
	// position of first action block in program (will be adjusted to make room for lists of events and actions)
	var actionX0 = eventX0 +
		blockActionBox.totalWidth() * nMaxEventHandlerELength +
		ruleSeparatorWidth;
	ruleBox.width = ruleWidth;
	ruleBox.height = blockEventBox.totalHeight();

	/** Get box for the specified block template
		@param {A3a.vpl.BlockTemplate} blockTemplate
		@return {CSSParser.Box.Rect}
	*/
	function boxForBlockTemplate(blockTemplate) {
		switch (blockTemplate.type) {
		case A3a.vpl.blockType.event:
			return blockEventLibItemBox;
		case A3a.vpl.blockType.action:
			return blockActionLibItemBox;
		case A3a.vpl.blockType.state:
			return blockStateLibItemBox;
		case A3a.vpl.blockType.comment:
			return blockCommentLibItemBox;
		default:
			throw "internal";	// hidden or undef, shouldn't be in block library
		}
	}

	// start with an empty canvas
	canvas.clearItems();

	// view (background)
	canvas.addDecoration(function (ctx) {
		viewBox.draw(ctx);
	});

	// top controls
	var controlBar = new A3a.vpl.ControlBar(canvas);
	controlBar.setButtons(this,
		program.toolbarConfig || [
			"vpl:new",
			"vpl:save",
			// "vpl:load",
			"vpl:upload",
			"!space",
			"vpl:advanced",
			"!stretch",
			"vpl:undo",
			"vpl:redo",
			"!stretch",
			"vpl:run",
			"vpl:stop",
			"!stretch",
			"vpl:sim",
			"vpl:text",
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
	controlBar.calcLayout(toolbarBox, buttonBox, separatorBox);
	controlBar.addToCanvas(toolbarBox, buttonBox);

	// 2nd toolbar at bottom between templates
	if (toolbar2Config.length > 0) {
		var controlBar2 = new A3a.vpl.ControlBar(canvas);
		controlBar2.setButtons(this,
			toolbar2Config,
			program.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS,
			program.toolbarGetButtonBounds || A3a.vpl.Commands.getButtonBoundsJS);
		controlBar2.calcLayout(toolbar2Box, buttonBox, separator2Box);
		controlBar2.addToCanvas(toolbar2Box, button2Box);
	}

	// templates
	var stepEvent = blockEventLibItemBox.totalHeight();
	var stepAction = blockActionLibItemBox.totalHeight();
	var eventLibWidth = 0;
	var actionLibWidth = 0;
	if (canvas.dims.scrollingBlockLib) {
		eventLibWidth = canvas.dims.blockSize * canvas.dims.templateScale + blockEventLibItemBox.nonContentWidth();
		renderingState.eventScroll.setTotalHeight(nEvTemplates * stepEvent);
		renderingState.eventScroll.resize(blockEventLibBox.x,
			blockEventLibBox.y,
			eventLibWidth,
			blockEventLibBox.height);
		canvas.addDecoration(function (ctx) {
			blockEventLibBox.draw(ctx);
		});
		renderingState.eventScroll.begin(canvas);
		var row = 0;
		A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
			if ((blockTemplate.type === A3a.vpl.blockType.event ||
					blockTemplate.type === A3a.vpl.blockType.state) &&
				(uiConfig.customizationMode ||
					(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				var box = boxForBlockTemplate(blockTemplate);
				program.addBlockTemplateToCanvas(canvas, blockTemplate, box,
					box.x + box.offsetLeft(),
					box.y + box.offsetTop() + row * stepEvent);
				row++;
			}
		}, this);
		renderingState.eventScroll.end();

		actionLibWidth = canvas.dims.blockSize * canvas.dims.templateScale + blockActionLibItemBox.nonContentWidth();
		renderingState.actionScroll.setTotalHeight(nAcTemplates * stepAction);
		renderingState.actionScroll.resize(blockActionLibBox.x,
			blockActionLibBox.y,
			blockActionLibBox.width,
			blockActionLibBox.height);
		canvas.addDecoration(function (ctx) {
			blockActionLibBox.draw(ctx);
		});
		renderingState.actionScroll.begin(canvas);
		row = 0;
		A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
			if ((blockTemplate.type === A3a.vpl.blockType.action ||
					blockTemplate.type === A3a.vpl.blockType.comment) &&
				(uiConfig.customizationMode ||
					(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				var box = boxForBlockTemplate(blockTemplate);
				program.addBlockTemplateToCanvas(canvas, blockTemplate, box,
					box.x + blockActionLibItemBox.offsetLeft(),
					box.y + blockActionLibItemBox.offsetTop() + row * stepAction);
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
					blockEventLibBox.x + blockEventLibBox.width / 2,
					blockEventLibBox.y + moreHighHeight / 2);
			}
			if (!renderingState.eventScroll.isBottom()) {
				// more to see below
				canvas.drawWidget("vpl:moreLow",
					blockEventLibBox.x + blockEventLibBox.width / 2,
					blockEventLibBox.y + blockEventLibBox.height - moreLowHeight / 2);
			}
			if (!renderingState.actionScroll.isTop()) {
				// more to see above
				canvas.drawWidget("vpl:moreHigh",
					blockActionLibBox.x + blockActionLibBox.width / 2,
					blockActionLibBox.y + moreHighHeight / 2);
			}
			if (!renderingState.actionScroll.isBottom()) {
				// more to see below
				canvas.drawWidget("vpl:moreLow",
					blockActionLibBox.x + blockActionLibBox.width / 2,
					blockActionLibBox.y + blockActionLibBox.height - moreLowHeight / 2);
			}
		});
	} else {
		canvas.addDecoration(function (ctx) {
			blockEventLibBox.draw(ctx);
		});
		eventLibWidth = evCol * stepEvent + blockEventLibBox.nonContentWidth();
		var colLen = Math.ceil(nEvTemplates / evCol);
		var row = 0;
		A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
			if ((blockTemplate.type === A3a.vpl.blockType.event ||
					blockTemplate.type === A3a.vpl.blockType.state) &&
				(uiConfig.customizationMode ||
					(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				var box = boxForBlockTemplate(blockTemplate);
				var x = blockEventLibBox.x + box.offsetLeft() + Math.floor(row / colLen) * stepEvent;
				var y = blockEventLibBox.y + box.offsetTop() + stepEvent * (row % colLen);
				program.addBlockTemplateToCanvas(canvas, blockTemplate, box, x, y);
				row++;
			}
		}, this);

		canvas.addDecoration(function (ctx) {
			blockActionLibBox.draw(ctx);
		});
		actionLibWidth = acCol * stepAction + blockActionLibBox.nonContentWidth();
		colLen = Math.ceil(nAcTemplates / acCol);
		row = 0;
		A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
			if ((blockTemplate.type === A3a.vpl.blockType.action ||
					blockTemplate.type === A3a.vpl.blockType.comment) &&
				(uiConfig.customizationMode ||
					(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				var box = boxForBlockTemplate(blockTemplate);
				var x = blockActionLibBox.x + box.offsetLeft() + blockActionLibBox.width -
					(acCol - Math.floor(row / colLen)) * stepAction;
				var y = blockActionLibBox.y + box.offsetTop() + stepAction * (row % colLen);
				program.addBlockTemplateToCanvas(canvas, blockTemplate, box, x, y);
				row++;
			}
		}, this);
	}

	// program scroll region
	renderingState.programScroll.setTotalHeight(program.program.length * ruleBox.totalHeight());

	// program
	renderingState.programScroll.resize(vplBox.x, vplBox.y,
		vplBox.width,	vplBox.height);
	canvas.addDecoration(function (ctx) {
		vplBox.draw(ctx);
	});
	renderingState.programScroll.begin(canvas);
	eventX0 += (eventLibWidth - actionLibWidth) / 2 - canvas.dims.scrollbarWidth / 2;
	actionX0 += (eventLibWidth - actionLibWidth) / 2 - canvas.dims.scrollbarWidth / 2;
	var errorMsg = "";
	var isWarning = false;
	program.program.forEach(function (eventHandler, i) {
		program.addEventHandlerToCanvas(canvas, eventHandler,
			displaySingleEvent,
			eventX0, actionX0,
			vplBox.y + ruleBox.totalHeight() * i + ruleBox.offsetTop() + blockEventBox.offsetTop(),
			blockEventBox, blockActionBox, blockStateBox, blockCommentBox, ruleBox, ruleSeparatorBox);
		if (eventHandler.error !== null && errorMsg === "") {
			errorMsg = eventHandler.error.msg;
			isWarning = eventHandler.error.isWarning;
			if (eventHandler.error.conflictEventHandler !== null) {
				for (var j = i + 1; j < program.program.length; j++) {
					if (program.program[j] === eventHandler.error.conflictEventHandler) {
						program.addEventHandlerConflictLinkToCanvas(canvas,
							eventX0,
							vplBox.y + ruleBox.totalHeight() * i + ruleBox.offsetTop() + blockEventBox.offsetTop(),
							vplBox.y + ruleBox.totalHeight() * j + ruleBox.offsetTop() + blockEventBox.offsetTop(),
							ruleBox, blockEventBox,
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
			ctx.fillText(errorMsg, eventX0 - canvas.dims.blockSize * 0.6, vplBox.y);
			ctx.restore();
		});
	}

	if (program.noVPL) {
		canvas.addDecoration(function (ctx) {
			canvas.disabledMark(vplBox.x, vplBox.y,
				vplBox.width, vplBox.height,
				3);
		});
	}

	// copyright
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

	program.onUpdate && program.onUpdate();
	canvas.redraw();
};
