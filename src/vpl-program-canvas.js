/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
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
	this.programScroll = new A3a.vpl.ScrollArea(1, 1);
	this.eventScroll = new A3a.vpl.ScrollArea(1, 1);
	this.eventScroll.leftScrollbar = true;
	this.actionScroll = new A3a.vpl.ScrollArea(1, 1);
};

/** Add a block to a canvas
	@param {A3a.vpl.Canvas} canvas
	@param {A3a.vpl.Block} block
	@param {CSSParser.VPL.Box} box
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
		box.width, box.height,
		x, y,
		// draw
		function (canvas, item, dx, dy) {
			var ctx = canvas.ctx;
			ctx.save();
			var scale = Math.max(box.width, box.height) / canvas.dims.blockSize;
			if (Math.abs(scale - 1) > 1e-3) {
				var dims0 = canvas.dims;
				box.drawAt(ctx, item.x + dx, item.y + dy);
				canvas.dims = A3a.vpl.Canvas.calcDims(canvas.dims.blockSize * scale, canvas.dims.controlSize * scale);
				block.blockTemplate.renderToCanvas(canvas,
					/** @type {A3a.vpl.Block} */(item.data),
					box,
					item.x + dx, item.y + dy);
				if (block.locked) {
					canvas.lockedMark(item.x + dx, item.y + dy, canvas.dims.blockSize, canvas.dims.blockSize, true);
				}
				if (block.disabled || opts.disabled) {
					canvas.disabledMark(item.x + dx, item.y + dy, canvas.dims.blockSize, canvas.dims.blockSize,
						["block"], ["block"]);
				}
				canvas.dims = dims0;
			} else {
				box.drawAt(ctx, item.x + dx, item.y + dy);
				block.blockTemplate.renderToCanvas(canvas,
					/** @type {A3a.vpl.Block} */(item.data),
					box,
					item.x + dx, item.y + dy);
				if (block.locked) {
					canvas.lockedMark(item.x + dx, item.y + dy, canvas.dims.blockSize, canvas.dims.blockSize, true);
				}
				if (block.disabled) {
					canvas.disabledMark(item.x + dx, item.y + dy, canvas.dims.blockSize, canvas.dims.blockSize,
						["block"], ["block"]);
				}
			}
			ctx.restore();
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
	@param {CSSParser.VPL.Box} box
	@param {number} x horizontal block template position (without box padding)
	@param {number} y vertical  block template position (without box padding)
	@return {void}
*/
A3a.vpl.Program.prototype.addBlockTemplateToCanvas = function (canvas, blockTemplate, box, x, y) {
	var block = new A3a.vpl.Block(blockTemplate, null, null);
	if (blockTemplate.typicalParam) {
		block.param = blockTemplate.typicalParam();
	}
	var disabled = (this.mode === A3a.vpl.mode.basic ? this.enabledBlocksBasic : this.enabledBlocksAdvanced)
		.indexOf(blockTemplate.name) < 0;
	var self = this;
	var canvasItem = this.addBlockToCanvas(canvas, block, box, x, y,
		{
			notInteractive: true,
			notDropTarget: true,
			notDraggable: this.noVPL,
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
	if (blockTemplate.typicalParam) {
		canvasItem.makeDraggedItem = function (item) {
			// drag a copy with default parameters, not typical parameters
			var draggedItem = item.clone();
			draggedItem.data = new A3a.vpl.Block(blockTemplate, null, null);
			return draggedItem;
		};
	}
};

/** Measure the width of all the event handler parts (content of the rule box)
	@param {A3a.vpl.EventHandler} eventHandler
	@param {boolean} displaySingleEvent
	@param {Object} cssBoxes
	@return {{total:number,totalEvents:number,events:Array.<number>,totalActions:number,actions:Array.<number>,sep:number}}
*/
A3a.vpl.Application.measureEventHandlerWidth = function (eventHandler, displaySingleEvent, cssBoxes) {
	/** @type {Array.<number>} */
	var events = [];
	var totalEvents = 0;
	events = eventHandler.events.map(function (event, j) {
		var box = eventHandler.error && eventHandler.error.eventErrorIndices.indexOf(j) >= 0
			? eventHandler.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox
			: cssBoxes.blockContainerBox;
		box.width = event == null
			? (events.length === 1 ? cssBoxes.blockEmptyEventOnlyChildBox : cssBoxes.blockEmptyEventBox).totalWidth()
			: A3a.vpl.Program.boxForBlockType(event, j === 0, cssBoxes).totalWidth();
		totalEvents += box.totalWidth();
		return cssBoxes.blockContainerBox.width;
	});
	if (eventHandler.events.length === 0 || !displaySingleEvent && eventHandler.events[eventHandler.events.length - 1] !== null) {
		// add empty block
		cssBoxes.blockContainerBox.width =
			(eventHandler.events.length === 0 ? cssBoxes.blockEmptyEventOnlyChildBox : cssBoxes.blockEmptyEventBox).totalWidth();
		events.push(cssBoxes.blockContainerBox.width);
		totalEvents += cssBoxes.blockContainerBox.totalWidth();
	}

	var sep = cssBoxes.ruleSeparatorBox.totalWidth();

	/** @type {Array.<number>} */
	var actions = [];
	var totalActions = 0;
	actions = eventHandler.actions.map(function (action, j) {
		var box = eventHandler.error && eventHandler.error.actionErrorIndices.indexOf(j) >= 0
			? eventHandler.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox
			: cssBoxes.blockContainerBox;
		box.width = action == null
			? (actions.length === 1 ? cssBoxes.blockEmptyActionOnlyChildBox : cssBoxes.blockEmptyActionBox).totalWidth()
			: A3a.vpl.Program.boxForBlockType(action, j === 0, cssBoxes).totalWidth();
		totalActions += box.totalWidth();
		return box.totalWidth();
	});
	if (eventHandler.actions.length === 0 || eventHandler.actions[eventHandler.actions.length - 1] !== null) {
		// add empty block
		cssBoxes.blockContainerBox.width =
			(eventHandler.actions.length === 0 ? cssBoxes.blockEmptyActionOnlyChildBox : cssBoxes.blockEmptyActionBox).totalWidth();
		actions.push(cssBoxes.blockContainerBox.width);
		totalActions += cssBoxes.blockContainerBox.totalWidth();
	}

	return {
		total: totalEvents + sep + totalActions,
		events: events,
		totalEvents: totalEvents,
		sep: sep,
		actions: actions,
		totalActions: totalActions
	};
};

/** Get block box for the specified type
	@param {A3a.vpl.Block} block
	@param {boolean} isFirst
	@param {Object} cssBoxes
	@return {CSSParser.VPL.Box}
*/
A3a.vpl.Program.boxForBlockType = function (block, isFirst, cssBoxes) {
	switch (block.blockTemplate.type) {
	case A3a.vpl.blockType.event:
		return isFirst ? cssBoxes.blockEventMainBox : cssBoxes.blockEventAuxBox;
	case A3a.vpl.blockType.action:
		return cssBoxes.blockActionBox;
	case A3a.vpl.blockType.state:
		return cssBoxes.blockStateBox;
	case A3a.vpl.blockType.comment:
		return cssBoxes.blockCommentBox;
	default:
		throw "internal";	// hidden or undef, shouldn't be in event handler
	}
}

/** Add an event handler to a canvas
	@param {A3a.vpl.Canvas} canvas
	@param {A3a.vpl.EventHandler} eventHandler
	@param {boolean} displaySingleEvent
	@param {number} maxWidthForEventRightAlign
	@param {number} eventX0
	@param {number} actionX0
	@param {number} y
	@param {Object} cssBoxes
	@return {void}
*/
A3a.vpl.Program.prototype.addEventHandlerToCanvas =
	function (canvas, eventHandler, displaySingleEvent, maxWidthForEventRightAlign,
		eventX0, actionX0, y,
		cssBoxes) {

	var canvasSize = canvas.getSize();
	var x = eventX0;

	var widths = A3a.vpl.Application.measureEventHandlerWidth(eventHandler, displaySingleEvent, cssBoxes);

	var self = this;
	var block0Box = eventHandler.events.length > 0 && eventHandler.events[0].blockTemplate.type === A3a.vpl.blockType.event
		? cssBoxes.blockEventMainBox
		: cssBoxes.blockEventAuxBox;
	var item = new A3a.vpl.CanvasItem(eventHandler,
		cssBoxes.ruleBox.paddedWidth(),
		cssBoxes.ruleBox.paddedHeight(),
		x - cssBoxes.ruleBox.paddingLeft - cssBoxes.blockContainerBox.offsetLeft() - block0Box.offsetLeft(),
		y - cssBoxes.ruleBox.paddingTop - cssBoxes.blockContainerBox.offsetTop() - block0Box.offsetTop(),
		// draw
		function (canvas, item, dx, dy) {
			var ctx = canvas.ctx;
			// strip
			cssBoxes.ruleBox.drawAt(ctx, item.x + dx, item.y + dy, true);
			// event/action separator
			var separatorWidth = cssBoxes.ruleSeparatorBox.totalWidth();
			cssBoxes.ruleSeparatorBox.drawAt(ctx,
				actionX0 - cssBoxes.ruleSeparatorBox.width - cssBoxes.ruleSeparatorBox.marginRight - cssBoxes.ruleSeparatorBox.paddingRight -
					cssBoxes.blockContainerBox.offsetLeft() - cssBoxes.blockActionBox.offsetLeft() + dx,
				item.y + (cssBoxes.ruleBox.paddedHeight() - cssBoxes.ruleSeparatorBox.height) / 2 + dy);
			canvas.drawWidget("vpl:then",
				actionX0 - cssBoxes.ruleSeparatorBox.totalWidth() / 2 - cssBoxes.blockContainerBox.offsetLeft() - cssBoxes.blockActionBox.offsetLeft() + dx,
				item.y + cssBoxes.ruleBox.paddedHeight() / 2 + dy,
				cssBoxes.ruleSeparatorBox);
			if (eventHandler.locked) {
				canvas.lockedMark(item.x, item.y, item.width, item.height,
					false, eventHandler.disabled ? "#ddd" : "");
			}
			// block container boxes
			var x = item.x + dx + cssBoxes.ruleBox.paddingLeft;
			if (maxWidthForEventRightAlign > 0) {
				x += maxWidthForEventRightAlign - widths.totalEvents;
			}
			events.forEach(function (event, j) {
				var box = eventHandler.error && eventHandler.error.eventErrorIndices.indexOf(j) >= 0
					? eventHandler.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox
					: cssBoxes.blockContainerBox;
				box.width = event == null
					? (events.length === 1 ? cssBoxes.blockEmptyEventOnlyChildBox : cssBoxes.blockEmptyEventBox).totalWidth()
					: A3a.vpl.Program.boxForBlockType(event, j === 0, cssBoxes).totalWidth();
				box.drawAt(ctx,
					x + box.marginLeft,
					item.y + dy + cssBoxes.ruleBox.paddingTop + cssBoxes.blockContainerBox.marginTop,
					true);
				x += box.totalWidth();
			});
			x = item.x + dx + cssBoxes.ruleBox.paddingLeft + actionX0 - eventX0;
			actions.forEach(function (action, j) {
				var box = eventHandler.error && eventHandler.error.actionErrorIndices.indexOf(j) >= 0
					? eventHandler.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox
					: cssBoxes.blockContainerBox;
				box.width = action == null
					? (actions.length === 1 ? cssBoxes.blockEmptyActionOnlyChildBox : cssBoxes.blockEmptyActionBox).totalWidth()
					: A3a.vpl.Program.boxForBlockType(action, j === 0, cssBoxes).totalWidth();
				box.drawAt(ctx,
					x + box.marginLeft,
					item.y + dy + cssBoxes.ruleBox.paddingTop + cssBoxes.blockContainerBox.marginTop,
					true);
				x += box.totalWidth();
			});
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
			canvas.disabledMark(item.x + dx, item.y + dy, item.width, item.height, ["rule"], ["rule"]);
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
	x = eventX0;
	if (maxWidthForEventRightAlign > 0) {
		x += maxWidthForEventRightAlign - widths.totalEvents;
	}
	events.forEach(function (event, j) {
		var box = eventHandler.error && eventHandler.error.eventErrorIndices.indexOf(j) >= 0
			? eventHandler.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox
			: cssBoxes.blockContainerBox;
		if (event) {
			box.width = A3a.vpl.Program.boxForBlockType(event, j === 0, cssBoxes).totalWidth();
			childItem = this.addBlockToCanvas(canvas, event, A3a.vpl.Program.boxForBlockType(event, j === 0, cssBoxes),
				x, y,
				{
					notInteractive: eventHandler.disabled || this.noVPL,
					notClickable: eventHandler.disabled || this.noVPL,
					notDraggable: this.noVPL
				});
		} else {
			var emptyBlockBox = events.length === 1 ? cssBoxes.blockEmptyEventOnlyChildBox : cssBoxes.blockEmptyEventBox;
			box.width = emptyBlockBox.totalWidth();
			childItem = this.addBlockToCanvas(canvas,
				new A3a.vpl.EmptyBlock(A3a.vpl.blockType.event, eventHandler,
					{eventSide: true, index: j}),
				emptyBlockBox,
				x, y,
				{
					notDropTarget: eventHandler.disabled,
					notClickable: true,
					notDraggable: true
				});
		}
		item.attachItem(childItem);
		x += box.totalWidth();
	}, this);
	var actions = eventHandler.actions;
	if (actions.length === 0 || actions[actions.length - 1] !== null) {
		actions = actions.concat(null);
	}
	x = actionX0;
	actions.forEach(function (action, j) {
		var box = eventHandler.error && eventHandler.error.actionErrorIndices.indexOf(j) >= 0
			? eventHandler.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox
			: cssBoxes.blockContainerBox;
		if (action) {
			box.width = A3a.vpl.Program.boxForBlockType(action, j == 0, cssBoxes).totalWidth();
			childItem = this.addBlockToCanvas(canvas, action, A3a.vpl.Program.boxForBlockType(action, j === 0, cssBoxes),
				x, y,
				{
					notInteractive: eventHandler.disabled || this.noVPL,
					notClickable: eventHandler.disabled || this.noVPL,
					notDraggable: this.noVPL
				});
		} else {
			var emptyBlockBox = actions.length === 1 ? cssBoxes.blockEmptyActionOnlyChildBox : cssBoxes.blockEmptyActionBox;
			box.width = emptyBlockBox.totalWidth();
			childItem = this.addBlockToCanvas(canvas,
				new A3a.vpl.EmptyBlock(A3a.vpl.blockType.action, eventHandler,
					{eventSide: false, index: j}),
				emptyBlockBox,
				x, y,
				{notDropTarget: false, notClickable: true, notDraggable: true});
		}
		item.attachItem(childItem);
		x += box.totalWidth();
	}, this);

	// error widgets
	canvas.addDecoration(function (ctx) {
		if (eventHandler.error !== null) {
			var box = eventHandler.error.isWarning ? cssBoxes.warningWidgetBox : cssBoxes.errorWidgetBox;
			canvas.drawWidget(eventHandler.error.isWarning ? "vpl:warning" : "vpl:error",
				eventX0 - cssBoxes.ruleBox.paddingLeft - cssBoxes.ruleBox.marginLeft - cssBoxes.blockContainerBox.offsetLeft() - block0Box.offsetLeft() -
					box.width / 2 - box.marginRight - box.paddingRight,
				y + block0Box.height * 0.5,
				box);
		}
	});
};

/** Add to a canvas a link between error marks for conflicting events
	@param {A3a.vpl.Canvas} canvas
	@param {number} x left side of first event block
	@param {number} y1 top side of blocks in first rule
	@param {number} y2 top side of blocks in second rule (below)
	@param {Object} cssBoxes
	@param {boolean} isWarning
	@return {void}
*/
A3a.vpl.Program.prototype.addEventHandlerConflictLinkToCanvas = function (canvas, x, y1, y2, cssBoxes, isWarning) {
	var self = this;
	var widgetBox = isWarning ? cssBoxes.warningWidgetBox : cssBoxes.errorWidgetBox;
	canvas.addDecoration(function (ctx) {
		// pink line
		var errorLine = canvas.css.getLine({
			tag: "conflict-line",
			clas: [isWarning ? "warning" : "error"]
		});
		var xc = x - cssBoxes.ruleBox.paddingLeft - cssBoxes.ruleBox.marginLeft - cssBoxes.blockContainerBox.offsetLeft() - cssBoxes.blockEventMainBox.offsetLeft() -
			widgetBox.width / 2 - widgetBox.marginRight - widgetBox.paddingRight;
		var yc1 = y1 + (cssBoxes.blockContainerBox.height + widgetBox.height) / 2;
		var yc2 = y2 + (cssBoxes.blockContainerBox.height - widgetBox.height) / 2;
		ctx.beginPath();
		ctx.moveTo(xc, yc1);
		ctx.lineTo(xc, yc2);
		errorLine.stroke(ctx);
		ctx.beginPath();
		ctx.arc(xc, yc1, errorLine.lineWidth, 0, Math.PI);
		errorLine.stroke(ctx);
		ctx.beginPath();
		ctx.arc(xc, yc2, errorLine.lineWidth, -Math.PI, 0);
		errorLine.stroke(ctx);
	});
};

/** Get css boxes
	@param {CSSParser.VPL} css
	@return {Object}
*/
A3a.vpl.Application.prototype.getCSSBoxes = function (css) {
	var cssBoxes = {};
	var zoomBlocks = this.program.zoomBlocks;
	cssBoxes.viewBox = css.getBox({tag: "view", clas: ["vpl"]});
	cssBoxes.toolbarSeparatorBox = css.getBox({tag: "separator", clas: ["vpl", "top"]});
	cssBoxes.toolbarSeparator2Box = css.getBox({tag: "separator", clas: ["vpl", "bottom"]});
	cssBoxes.toolbarBox = css.getBox({tag: "toolbar", clas: ["vpl", "top"]});
	cssBoxes.toolbar2Box = css.getBox({tag: "toolbar", clas: ["vpl", "bottom"]});
	cssBoxes.vplBox = css.getBox({tag: "vpl", id: "scrolling-vpl"});
	cssBoxes.blockEventMainBox = css.getBox({tag: "block", clas: ["event", "event-main"], pseudoClass: zoomBlocks ? ["small"] : []});
	cssBoxes.blockEventAuxBox = css.getBox({tag: "block", clas: ["event", "event-aux"], pseudoClass: zoomBlocks ? ["small"] : []});
	cssBoxes.blockActionBox = css.getBox({tag: "block", clas: ["action"], pseudoClass: zoomBlocks ? ["small"] : []});
	cssBoxes.blockStateBox = css.getBox({tag: "block", clas: ["state"], pseudoClass: zoomBlocks ? ["small"] : []});
	cssBoxes.blockCommentBox = css.getBox({tag: "block", clas: ["comment"], pseudoClass: zoomBlocks ? ["small"] : []});
	cssBoxes.blockEmptyEventBox = css.getBox({tag: "block", clas: ["event", "empty"], pseudoClass: zoomBlocks ? ["small"] : []});
	cssBoxes.blockEmptyActionBox = css.getBox({tag: "block", clas: ["action", "empty"], pseudoClass: zoomBlocks ? ["small"] : []});
	cssBoxes.blockEmptyEventOnlyChildBox = css.getBox({tag: "block", clas: ["event", "empty"], pseudoClass: zoomBlocks ? ["only-child", "small"] : ["only-child"]});
	cssBoxes.blockEmptyActionOnlyChildBox = css.getBox({tag: "block", clas: ["action", "empty"], pseudoClass: zoomBlocks ? ["only-child", "small"] : ["only-child"]});
	cssBoxes.blockContainerBox = css.getBox({tag: "block-container"});
	cssBoxes.blockContainerErrorBox = css.getBox({tag: "block-container", clas: ["error"]});
	cssBoxes.blockContainerWarningBox = css.getBox({tag: "block-container", clas: ["warning"]});
	cssBoxes.ruleBox = css.getBox({tag: "rule", pseudoClass: zoomBlocks ? ["small"] : []});
	cssBoxes.ruleSeparatorBox = css.getBox({tag: "widget", id: "widget-then", pseudoClass: zoomBlocks ? ["small"] : []});
	cssBoxes.blockEventLibItemBox = css.getBox({tag: "block", clas: ["library", "event"]});
	cssBoxes.blockActionLibItemBox = css.getBox({tag: "block", clas: ["library", "action"]});
	cssBoxes.blockStateLibItemBox = css.getBox({tag: "block", clas: ["library", "state"]});
	cssBoxes.blockCommentLibItemBox = css.getBox({tag: "block", clas: ["library", "comment"]});
	cssBoxes.blockEventLibBox = css.getBox({tag: "block-library", clas: ["event"]});
	cssBoxes.blockActionLibBox = css.getBox({tag: "block-library", clas: ["action"]});
	cssBoxes.errorWidgetBox = css.getBox({tag: "widget", id: "widget-error", pseudoClass: zoomBlocks ? ["small"] : []});
	cssBoxes.warningWidgetBox = css.getBox({tag: "widget", id: "widget-warning", pseudoClass: zoomBlocks ? ["small"] : []});
	return cssBoxes;
};

/** Render the program to a single canvas
	@return {void}
*/
A3a.vpl.Application.prototype.renderProgramToCanvas = function () {
	var uiConfig = this.uiConfig;
	var canvas = this.vplCanvas;
	var program = this.program;
	var cssBoxes = this.getCSSBoxes(canvas.css);

	canvas.recalcSize();

	// make sure code is up-to-date to have error info
	program.getCode(program.currentLanguage);

	// find first error, or first warning if there is no error
	this.vplMessage = "";
	this.vplMessageIsWarning = false;
	if (!uiConfig.customizationMode) {
		for (var i = 0; i < program.program.length; i++) {
			if (program.program[i].error) {
				if (!program.program[i].error.isWarning) {
					this.vplMessage = program.program[i].error.msg;
					this.vplMessageIsWarning = false;
					break;	// stop at first error
				} else if (!this.vplMessage) {
					this.vplMessage = program.program[i].error.msg;
					this.vplMessageIsWarning = true;
				}
			}
		}
	}

	// zoom blocks if too small
	program.zoomBlocks = canvas.dims.blockSize < canvas.dims.minInteractiveBlockSize;

	var canvasSize = canvas.getSize();
	var renderingState = /** @type {A3a.vpl.Program.CanvasRenderingState} */(canvas.state.vpl);
	var self = this;
	var showState = program.mode === A3a.vpl.mode.advanced;

	// 2nd toolbar at bottom between templates
	var toolbar2Config = program.toolbar2Config || [
		"!!stretch",
		"vpl:message-error",
		"vpl:message-warning",
		"!!stretch",
		"vpl:duplicate",
		"vpl:disable",
		"vpl:lock",
		"vpl:trashcan",
	];
	var toolbar2HasAvButtons = A3a.vpl.ControlBar.hasAvailableButtons(this, toolbar2Config);

	// program item counts
	var displaySingleEvent = program.displaySingleEvent();
	var nMaxEventHandlerELength = 0;
	var nMaxEventHandlerALength = 0;
	var maxEventsWidth = 0;
	var maxActionsWidth = 0;
	program.program.forEach(function (eventHandler) {
		var blocks = eventHandler.events;
		nMaxEventHandlerELength = Math.max(nMaxEventHandlerELength,
			blocks.length
				+ (blocks.length === 0 || blocks[blocks.length - 1] !== null ? 1 : 0));
		blocks = eventHandler.actions;
		nMaxEventHandlerALength = Math.max(nMaxEventHandlerALength,
			blocks.length
				+ (blocks.length === 0 || blocks[blocks.length - 1] !== null ? 1 : 0));

		var details = A3a.vpl.Application.measureEventHandlerWidth(eventHandler, displaySingleEvent, cssBoxes);
		maxEventsWidth = Math.max(maxEventsWidth, details.totalEvents);
		maxActionsWidth = Math.max(maxActionsWidth, details.totalActions);
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

	// toolbar button boxes and height
	var toolbarConfig = program.toolbarConfig || [
		"vpl:close",
		"!space",
		"vpl:about",
		"!space",
		"vpl:new",
		"vpl:save",
		"vpl:load",
		"vpl:upload",
		"vpl:exportToHTML",
		"!space",
		"vpl:advanced",
		"!stretch",
		"vpl:undo",
		"vpl:redo",
		"!stretch",
		"vpl:run",
		"vpl:stop",
		"vpl:robot",
		"!stretch",
		"vpl:sim",
		"vpl:text",
		"!stretch",
		"vpl:teacher-reset",
		"vpl:teacher-save",
		"vpl:teacher"
	];

	// box sizes
	var toolbarItemBoxes = A3a.vpl.ControlBar.buttonBoxes(this, toolbarConfig, ["vpl", "top"]);
	var toolbarItemHeight = A3a.vpl.ControlBar.maxBoxHeight(toolbarItemBoxes);
	var toolbar2ItemBoxes = A3a.vpl.ControlBar.buttonBoxes(this, toolbar2Config, ["vpl", "bottom"]);
	var toolbar2ItemHeight = A3a.vpl.ControlBar.maxBoxHeight(toolbarItemBoxes);

	cssBoxes.viewBox.setTotalWidth(canvasSize.width);
	cssBoxes.viewBox.setTotalHeight(canvasSize.height);
	cssBoxes.viewBox.setPosition(0, 0);
	cssBoxes.toolbarBox.setTotalWidth(cssBoxes.viewBox.width);
	cssBoxes.toolbarBox.height = toolbarItemHeight;
	cssBoxes.toolbarBox.setPosition(cssBoxes.viewBox.x, cssBoxes.viewBox.y);
	cssBoxes.blockEventLibBox.setTotalHeight(cssBoxes.viewBox.height - cssBoxes.toolbarBox.totalHeight());
	var maxBlPerCol =  Math.max(
		Math.floor(cssBoxes.blockEventLibBox.height / cssBoxes.blockEventLibItemBox.totalHeight()),
		1
	);
	var evCol = cssBoxes.blockEventLibBox.scroll
		? 1
		: Math.ceil(nEvTemplates / maxBlPerCol);
	cssBoxes.blockEventLibBox.width = evCol * cssBoxes.blockEventLibItemBox.totalWidth();
	cssBoxes.blockEventLibBox.setPosition(cssBoxes.viewBox.x, cssBoxes.viewBox.y + cssBoxes.toolbarBox.totalHeight());
	cssBoxes.blockActionLibBox.setTotalHeight(cssBoxes.viewBox.height - cssBoxes.toolbarBox.totalHeight());
	var acCol = cssBoxes.blockActionLibBox.scroll
		? 1
		: Math.ceil(nAcTemplates / maxBlPerCol);
	cssBoxes.blockActionLibBox.width = acCol * cssBoxes.blockActionLibItemBox.totalWidth();
	cssBoxes.blockActionLibBox.setPosition(cssBoxes.viewBox.x + cssBoxes.viewBox.width - cssBoxes.blockActionLibBox.totalWidth(),
		cssBoxes.viewBox.y + cssBoxes.toolbarBox.totalHeight());
	cssBoxes.toolbar2Box.setTotalWidth(cssBoxes.viewBox.width - cssBoxes.blockEventLibBox.totalWidth() - cssBoxes.blockActionLibBox.totalWidth());
	cssBoxes.toolbar2Box.height = toolbar2ItemHeight;
	cssBoxes.toolbar2Box.setPosition(cssBoxes.viewBox.x + cssBoxes.blockEventLibBox.totalWidth(),
		cssBoxes.viewBox.y + cssBoxes.viewBox.height - cssBoxes.toolbar2Box.totalHeight());
	cssBoxes.vplBox.setTotalWidth(cssBoxes.viewBox.width - cssBoxes.blockEventLibBox.totalWidth() - cssBoxes.blockActionLibBox.totalWidth());
	cssBoxes.vplBox.setTotalHeight(cssBoxes.viewBox.height - cssBoxes.toolbarBox.totalHeight() -
		(toolbar2HasAvButtons ? cssBoxes.toolbar2Box.totalHeight() : 0));
	cssBoxes.vplBox.setPosition(cssBoxes.viewBox.x + cssBoxes.blockEventLibBox.totalWidth(), cssBoxes.viewBox.y + cssBoxes.toolbarBox.totalHeight());
	cssBoxes.blockContainerBox.width = cssBoxes.blockContainerErrorBox.width = cssBoxes.blockContainerWarningBox.width = cssBoxes.blockEventMainBox.totalWidth();
	cssBoxes.blockContainerBox.height = cssBoxes.blockContainerErrorBox.height = cssBoxes.blockContainerWarningBox.height = cssBoxes.blockEventMainBox.totalHeight();
	var ruleSeparatorWidth = cssBoxes.ruleSeparatorBox.totalWidth();
	var blockStep = cssBoxes.blockContainerBox.totalWidth();
	var ruleWidth = maxEventsWidth + maxActionsWidth + ruleSeparatorWidth;
	// position of first event block in program (will be adjusted to make room for lists of events and actions)
	var eventX0 = cssBoxes.viewBox.x + (cssBoxes.viewBox.width - ruleWidth + cssBoxes.errorWidgetBox.totalWidth()) / 2;
	// position of first action block in program (will be adjusted to make room for lists of events and actions)
	var actionX0 = eventX0 + maxEventsWidth + ruleSeparatorWidth;
	cssBoxes.ruleBox.width = ruleWidth;
	cssBoxes.ruleBox.height = cssBoxes.blockContainerBox.totalHeight();

	/** Get box for the specified block template
		@param {Object} cssBoxes
		@param {A3a.vpl.BlockTemplate} blockTemplate
		@return {CSSParser.VPL.Box}
	*/
	function boxForBlockTemplate(cssBoxes, blockTemplate) {
		switch (blockTemplate.type) {
		case A3a.vpl.blockType.event:
			return cssBoxes.blockEventLibItemBox;
		case A3a.vpl.blockType.action:
			return cssBoxes.blockActionLibItemBox;
		case A3a.vpl.blockType.state:
			return cssBoxes.blockStateLibItemBox;
		case A3a.vpl.blockType.comment:
			return cssBoxes.blockCommentLibItemBox;
		default:
			throw "internal";	// hidden or undef, shouldn't be in block library
		}
	}

	// start with an empty canvas
	canvas.clearItems();

	// view (background)
	canvas.addDecoration(function (ctx) {
		cssBoxes.viewBox.draw(ctx);
	});

	// top controls
	var controlBar = new A3a.vpl.ControlBar(canvas);
	controlBar.setButtons(this,
		toolbarConfig,
		["vpl", "top"],
		program.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS,
		program.toolbarGetButtonBounds || A3a.vpl.Commands.getButtonBoundsJS);
	controlBar.calcLayout(cssBoxes.toolbarBox, toolbarItemBoxes, cssBoxes.toolbarSeparatorBox);
	controlBar.addToCanvas(cssBoxes.toolbarBox, toolbarItemBoxes);

	// 2nd toolbar at bottom between templates
	if (toolbar2HasAvButtons > 0) {
		var controlBar2 = new A3a.vpl.ControlBar(canvas);
		controlBar2.setButtons(this,
			toolbar2Config,
			["vpl", "bottom"],
			program.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS,
			program.toolbarGetButtonBounds || A3a.vpl.Commands.getButtonBoundsJS);
		controlBar2.calcLayout(cssBoxes.toolbar2Box, toolbar2ItemBoxes, cssBoxes.toolbarSeparator2Box);
		controlBar2.addToCanvas(cssBoxes.toolbar2Box, toolbar2ItemBoxes);
	}

	// templates
	var stepEvent = cssBoxes.blockEventLibItemBox.totalHeight();
	var stepAction = cssBoxes.blockActionLibItemBox.totalHeight();
	var eventLibWidth = 0;
	var actionLibWidth = 0;
	if (cssBoxes.blockEventLibBox.scroll) {
		eventLibWidth = cssBoxes.blockEventLibItemBox.totalWidth();
		renderingState.eventScroll.setTotalHeight(nEvTemplates * stepEvent);
		cssBoxes.blockEventLibBox.width = eventLibWidth;
		cssBoxes.blockEventLibBox.height = cssBoxes.blockEventLibBox.height;
		renderingState.eventScroll.resize(cssBoxes.blockEventLibBox.x,
			cssBoxes.blockEventLibBox.y,
			cssBoxes.blockEventLibBox.width,
			cssBoxes.blockEventLibBox.height);
		canvas.addDecoration(function (ctx) {
			cssBoxes.blockEventLibBox.draw(ctx);
		});
		renderingState.eventScroll.begin(canvas);
		var row = 0;
		A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
			if ((blockTemplate.type === A3a.vpl.blockType.event ||
					blockTemplate.type === A3a.vpl.blockType.state) &&
				(uiConfig.customizationMode ||
					(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				var box = boxForBlockTemplate(cssBoxes, blockTemplate);
				program.addBlockTemplateToCanvas(canvas, blockTemplate, box,
					cssBoxes.blockEventLibBox.x + box.offsetLeft(),
					cssBoxes.blockEventLibBox.y + box.offsetTop() + row * stepEvent);
				row++;
			}
		}, this);
		renderingState.eventScroll.end();

		// more high and low hints
		canvas.addDecoration(function (ctx) {
			var moreHighBox = canvas.css.getBox({tag: "widget", id: "widget-moreHigh"});
			var moreLowBox = canvas.css.getBox({tag: "widget", id: "widget-moreLow"});
			if (!renderingState.eventScroll.isTop()) {
				// more to see above
				canvas.drawWidget("vpl:moreHigh",
					cssBoxes.blockEventLibBox.x + cssBoxes.blockEventLibBox.width / 2,
					cssBoxes.blockEventLibBox.y + moreHighBox.totalHeight() / 2,
					moreHighBox);
			}
			if (!renderingState.eventScroll.isBottom()) {
				// more to see below
				canvas.drawWidget("vpl:moreLow",
					cssBoxes.blockEventLibBox.x + cssBoxes.blockEventLibBox.width / 2,
					cssBoxes.blockEventLibBox.y + cssBoxes.blockEventLibBox.height - moreLowBox.totalHeight() / 2,
					moreLowBox);
			}
		});
	} else {
		canvas.addDecoration(function (ctx) {
			cssBoxes.blockEventLibBox.draw(ctx);
		});
		eventLibWidth = evCol * stepEvent + cssBoxes.blockEventLibBox.nonContentWidth();
		var colLen = Math.ceil(nEvTemplates / evCol);
		var row = 0;
		A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
			if ((blockTemplate.type === A3a.vpl.blockType.event ||
					blockTemplate.type === A3a.vpl.blockType.state) &&
				(uiConfig.customizationMode ||
					(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				var box = boxForBlockTemplate(cssBoxes, blockTemplate);
				var x = cssBoxes.blockEventLibBox.x + box.offsetLeft() + Math.floor(row / colLen) * stepEvent;
				var y = cssBoxes.blockEventLibBox.y + box.offsetTop() + stepEvent * (row % colLen);
				program.addBlockTemplateToCanvas(canvas, blockTemplate, box, x, y);
				row++;
			}
		}, this);
	}
	if (cssBoxes.blockActionLibBox.scroll) {
		actionLibWidth = cssBoxes.blockActionLibItemBox.totalWidth();
		renderingState.actionScroll.setTotalHeight(nAcTemplates * stepAction);
		cssBoxes.blockActionLibBox.width = actionLibWidth;
		cssBoxes.blockActionLibBox.height = cssBoxes.blockActionLibBox.height;
		renderingState.actionScroll.resize(cssBoxes.blockActionLibBox.x,
			cssBoxes.blockActionLibBox.y,
			cssBoxes.blockActionLibBox.width,
			cssBoxes.blockActionLibBox.height);
		canvas.addDecoration(function (ctx) {
			cssBoxes.blockActionLibBox.draw(ctx);
		});
		renderingState.actionScroll.begin(canvas);
		row = 0;
		A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
			if ((blockTemplate.type === A3a.vpl.blockType.action ||
					blockTemplate.type === A3a.vpl.blockType.comment) &&
				(uiConfig.customizationMode ||
					(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				var box = boxForBlockTemplate(cssBoxes, blockTemplate);
				program.addBlockTemplateToCanvas(canvas, blockTemplate, box,
					cssBoxes.blockActionLibBox.x + cssBoxes.blockActionLibItemBox.offsetLeft(),
					cssBoxes.blockActionLibBox.y + cssBoxes.blockActionLibItemBox.offsetTop() + row * stepAction);
				row++;
			}
		}, this);
		renderingState.actionScroll.end();

		// more high and low hints
		canvas.addDecoration(function (ctx) {
			var moreHighBox = canvas.css.getBox({tag: "widget", id: "widget-moreHigh"});
			var moreLowBox = canvas.css.getBox({tag: "widget", id: "widget-moreLow"});
			if (!renderingState.actionScroll.isTop()) {
				// more to see above
				canvas.drawWidget("vpl:moreHigh",
					cssBoxes.blockActionLibBox.x + cssBoxes.blockActionLibBox.width / 2,
					cssBoxes.blockActionLibBox.y + moreHighBox.totalHeight() / 2,
					moreHighBox);
			}
			if (!renderingState.actionScroll.isBottom()) {
				// more to see below
				canvas.drawWidget("vpl:moreLow",
					cssBoxes.blockActionLibBox.x + cssBoxes.blockActionLibBox.width / 2,
					cssBoxes.blockActionLibBox.y + cssBoxes.blockActionLibBox.height - moreLowBox.totalHeight() / 2,
					moreLowBox);
			}
		});
	} else {
		canvas.addDecoration(function (ctx) {
			cssBoxes.blockActionLibBox.draw(ctx);
		});
		actionLibWidth = acCol * stepAction + cssBoxes.blockActionLibBox.nonContentWidth();
		colLen = Math.ceil(nAcTemplates / acCol);
		row = 0;
		A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
			if ((blockTemplate.type === A3a.vpl.blockType.action ||
					blockTemplate.type === A3a.vpl.blockType.comment) &&
				(uiConfig.customizationMode ||
					(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				var box = boxForBlockTemplate(cssBoxes, blockTemplate);
				var x = cssBoxes.blockActionLibBox.x + box.offsetLeft() + cssBoxes.blockActionLibBox.width -
					(acCol - Math.floor(row / colLen)) * stepAction;
				var y = cssBoxes.blockActionLibBox.y + box.offsetTop() + stepAction * (row % colLen);
				program.addBlockTemplateToCanvas(canvas, blockTemplate, box, x, y);
				row++;
			}
		}, this);
	}

	if (uiConfig.customizationMode) {
		// draw vpl:customization widget
		var customizationBox = canvas.css.getBox({tag: "widget", id: "vpl-customize"});
		customizationBox.width = cssBoxes.vplBox.width / 4;
		customizationBox.height = cssBoxes.vplBox.height / 4;
		canvas.addDecoration(function (ctx) {
			canvas.drawWidget("vpl:customize",
				cssBoxes.vplBox.x + cssBoxes.vplBox.width / 2, cssBoxes.vplBox.y + cssBoxes.vplBox.height / 2,
				customizationBox);
		});
	} else if (program.message) {
		canvas.addDecoration(function (ctx) {
			var lines = program.message.split("\n");
			var fontSize = Math.min(14, canvasSize.height / lines.length);
			ctx.font = fontSize + "px sans-serif";
			ctx.textAlign = "start";
			ctx.textBaseline = "top";
			var x0 = cssBoxes.vplBox.x + fontSize;
			var y0 = cssBoxes.vplBox.y + fontSize;
			lines.forEach(function (line, i) {
				ctx.fillText(line, x0, y0 + fontSize * 1.2 * i);
			});
		});
	} else {
		// program scroll region
		var vplWidth = cssBoxes.ruleBox.totalWidth() + cssBoxes.vplBox.paddingLeft + cssBoxes.vplBox.paddingRight + cssBoxes.errorWidgetBox.totalWidth();
		renderingState.programScroll.setTotalWidth(vplWidth);
		renderingState.programScroll.setTotalHeight(program.program.length * cssBoxes.ruleBox.totalHeight());

		// program
		renderingState.programScroll.resize(cssBoxes.vplBox.x, cssBoxes.vplBox.y,
			cssBoxes.vplBox.width, cssBoxes.vplBox.height);
		canvas.addDecoration(function (ctx) {
			cssBoxes.vplBox.draw(ctx);
		});
		renderingState.programScroll.begin(canvas);
		eventX0 += (eventLibWidth - actionLibWidth) / 2 - canvas.dims.scrollbarWidth / 2;
		actionX0 += (eventLibWidth - actionLibWidth) / 2 - canvas.dims.scrollbarWidth / 2;
		if (vplWidth > cssBoxes.vplBox.width) {
			eventX0 += (vplWidth - cssBoxes.vplBox.width) / 2 + cssBoxes.vplBox.paddingLeft + cssBoxes.vplBox.marginLeft;
			actionX0 += (vplWidth - cssBoxes.vplBox.width) / 2 + cssBoxes.vplBox.paddingLeft + cssBoxes.vplBox.marginLeft;
		}
		var errorMsg = "";
		var isWarning = false;
		program.program.forEach(function (eventHandler, i) {
			program.addEventHandlerToCanvas(canvas, eventHandler,
				displaySingleEvent,
				canvas.dims.eventRightAlign ? maxEventsWidth : 0,
				eventX0, actionX0,
				cssBoxes.vplBox.y + cssBoxes.ruleBox.totalHeight() * i + cssBoxes.ruleBox.offsetTop() + cssBoxes.blockContainerBox.offsetTop(),
				cssBoxes);
			if (eventHandler.error !== null && errorMsg === "") {
				errorMsg = eventHandler.error.msg;
				isWarning = eventHandler.error.isWarning;
				if (eventHandler.error.conflictEventHandler !== null) {
					for (var j = i + 1; j < program.program.length; j++) {
						if (program.program[j] === eventHandler.error.conflictEventHandler) {
							program.addEventHandlerConflictLinkToCanvas(canvas,
								eventX0,
								cssBoxes.vplBox.y + cssBoxes.ruleBox.totalHeight() * i + cssBoxes.ruleBox.offsetTop() + cssBoxes.blockContainerBox.offsetTop(),
								cssBoxes.vplBox.y + cssBoxes.ruleBox.totalHeight() * j + cssBoxes.ruleBox.offsetTop() + cssBoxes.blockContainerBox.offsetTop(),
								cssBoxes,
								eventHandler.error.isWarning);
							break;
						}
					}
				}
			}
		});
		renderingState.programScroll.end();

		if (program.noVPL) {
			canvas.addDecoration(function (ctx) {
				canvas.disabledMark(cssBoxes.vplBox.x, cssBoxes.vplBox.y,
					cssBoxes.vplBox.width, cssBoxes.vplBox.height,
					["vpl"], ["vpl"]);
			});
		}
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
