/*
	Copyright 2018-2021 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Methods extending A3a.vpl.Program which implement the interactive
VPL3 programming view.

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

/** Make a function suitable for CanvasItem doOver callback with a fixed string
	@param {string} str string to be translated and displayed as hint
	@return {A3a.vpl.CanvasItem.doOver} function which displays hint if it has changed
*/
A3a.vpl.Application.prototype.createVPLFixedStringDoOverFun = function (str) {
	var app = this;

	return function () {
		if (app.vplHint !== str) {
			app.vplHint = str;
			app.renderProgramToCanvas();
		}
	};
};

/** Make a function suitable for ControlBar doOver callback
	@return {function(string):void} function which displays hint if it has changed
*/
A3a.vpl.Application.prototype.createVPLControlBarDoOverFun = function () {
	var app = this;

	return function (id) {
		if (app.vplHint !== id) {
			app.vplHint = id;
			app.renderProgramToCanvas();
		}
	};
};

/** @const */
A3a.vpl.Application.blockTypeCSSSelectors = {
	"e": "event",
	"s": "state",
	"a": "action",
	"c": "comment"
};

/** @typedef {{
		type: A3a.vpl.KbdControl.ObjectType,
		index1: number,
		index2: number,
		click: (function():void | null | undefined)
	}}
*/
A3a.vpl.Application.ItemActivityOptions;

/** Add a block to a canvas
	@param {A3a.vpl.Canvas} canvas
	@param {A3a.vpl.Block} block
	@param {CSSParser.VPL.Box} box
	@param {Array.<string>} cssClasses
	@param {number} x horizontal block position (without box padding)
	@param {number} y vertical  block position (without box padding)
	@param {{
		notInteractive:(boolean|undefined),
		notDropTarget:(boolean|undefined),
		notClickable:(boolean|undefined),
		notDraggable:(boolean|undefined),
		scale:(number|undefined),
		disabled: (boolean|undefined),
		crossedOut: (boolean|undefined),
		accessibility: (A3a.vpl.Application.ItemActivityOptions|null|undefined)
	}=} opts
	@return {A3a.vpl.CanvasItem}
*/
A3a.vpl.Application.prototype.addBlockToCanvas = function (canvas, block, box, cssClasses, x, y, opts) {
	/** Check if block type is for blocks on the action side (right)
		@param {A3a.vpl.blockType} type
		@return {boolean}
	*/
	function isActionSide(type) {
		return type === A3a.vpl.blockType.action ||
			type === A3a.vpl.blockType.comment;
	}
	var app = this;
	var program = app.program;
	var blockSize = Math.min(box.width, box.height);
	var scale = canvas.dims.blockSize != 0 ? blockSize / canvas.dims.blockSize : 1;
	var blockTypeCSSSelector = A3a.vpl.Application.blockTypeCSSSelectors[block.blockTemplate.type];
	if (blockTypeCSSSelector && cssClasses.indexOf(blockTypeCSSSelector) < 0) {
		cssClasses.push(blockTypeCSSSelector);
	}
	var item = new A3a.vpl.CanvasItem(block,
		box.width, box.height,
		x, y,
		// draw
		function (canvas, item, dx, dy, isZoomed) {
			var ctx = canvas.ctx;
			ctx.save();
			var dims0 = canvas.dims;
			canvas.dims = A3a.vpl.Canvas.calcDims(blockSize, canvas.dims.controlSize * scale);
			box.drawAt(ctx, item.x + dx, item.y + dy);
			block.blockTemplate.renderToCanvas(canvas,
				/** @type {A3a.vpl.Block} */(item.data),
				box,
				item.x + dx, item.y + dy,
				isZoomed);
			if (block.locked) {
				canvas.lockedMark(item.x + dx, item.y + dy, blockSize, blockSize, true);
			}
			if (block.disabled || opts.disabled) {
				canvas.disabledMark(item.x + dx, item.y + dy, blockSize, blockSize,
					cssClasses, cssClasses, !block.disabled && !opts.crossedOut);
			}
			if (block.marks.kbdTarget) {
				canvas.overlayRect(item.x + dx, item.y + dy, box.width, box.height,
					cssClasses.concat("kbd-target"));
			}
			if (block.marks.kbdSelected) {
				canvas.overlayRect(item.x + dx, item.y + dy, box.width, box.height,
					cssClasses.concat("kbd-selected"));
			}
			if (block.marks.kbdSelectedParam != null && block.blockTemplate.paramAccessibility !== null) {
				var c = block.blockTemplate.paramAccessibility.controls[/** @type{number} */(block.marks.kbdSelectedParam)];
				canvas.overlayRect(item.x + dx + box.width * c.left, item.y + dy + box.height * c.top,
					box.width * (c.right - c.left), box.height * (c.bottom - c.top),
					cssClasses.concat("kbd-selected", "param"));
			}
			canvas.dims = dims0;
			ctx.restore();
		},
		// interactiveCB
		opts && opts.notInteractive ||
			block.disabled ||
			block.locked || (block.ruleContainer && block.ruleContainer.locked) ||
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
			if (targetBlockItem.data.ruleContainer) {
				program.saveStateBeforeChange();
				targetBlockItem.data.ruleContainer.setBlock(newBlockItem.data,
					targetBlockItem.data.positionInContainer,
					function () {
						program.saveStateBeforeChange();
					},
					function () {
						program.saveStateAfterChange();
					});
				program.saveStateAfterChange();
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
	if (!(opts && opts.notInteractive || !block.blockTemplate.mousedown)) {
		if (program.zoomBlocks || block.blockTemplate.alwaysZoom) {
			item.zoomOnLongPress = function (zoomedItem) {
				return canvas.makeZoomedClone(zoomedItem);
			};
		}
		if (program.touchZoomBlocks || block.blockTemplate.alwaysZoom) {
			item.zoomOnLongTouchPress = function (zoomedItem) {
				return canvas.makeZoomedClone(zoomedItem);
			};
		}
	}
	item.clickable = !(opts && opts.notClickable);
	item.draggable = !(opts && opts.notDraggable);
	item.doOver = app.createVPLFixedStringDoOverFun(block.blockTemplate.name);
	var index = canvas.itemIndex(block);
	if (this.uiConfig.nodragAccessibility && opts && opts.accessibility) {
		item.draggable = false;
		var self = this;
		item.interactiveCB = opts.accessibility.type !== A3a.vpl.KbdControl.ObjectType.none ? {
			/** @type {A3a.vpl.CanvasItem.mousedown} */
			mousedown: function (canvas, data, width, height, left, top, ev) {
				if (self.kbdControl.targetType !== opts.accessibility.type ||
					self.kbdControl.targetIndex1 !== opts.accessibility.index1 ||
					self.kbdControl.targetIndex2 !== opts.accessibility.index2) {
					self.kbdControl.targetType = opts.accessibility.type;
					self.kbdControl.targetIndex1 = opts.accessibility.index1;
					self.kbdControl.targetIndex2 = opts.accessibility.index2;
				} else {
					self.kbdControl.clickOnParamControl((ev.x - left) / width, (ev.y - top) / height);
				}
				canvas.redraw();
				return 0;
			},
			/** @type {A3a.vpl.CanvasItem.mousedrag} */
			mousedrag: function (canvas, data, dragIndex, width, height, left, top, ev) {
				var canvasBndRect = canvas.canvas.getBoundingClientRect();
				var x = ev.x - canvasBndRect.left;
				var y = ev.y - canvasBndRect.top;
				var isInside = x >= item.x && x < item.x + item.width &&
					y >= item.y && y < item.y + item.height;
				if (self.kbdControl.targetType !== (isInside ? opts.accessibility.type : A3a.vpl.KbdControl.ObjectType)) {
					self.kbdControl.targetType = isInside ? opts.accessibility.type : A3a.vpl.KbdControl.ObjectType;
					canvas.redraw();
				}
			}
		}
		: {
			/** @type {A3a.vpl.CanvasItem.mouseup} */
			mouseup: function (canvas, data, dragIndex) {
				if (opts.accessibility.click) {
					opts.accessibility.click();
				}
			}
		};
	}
	canvas.setItem(item, index);
	return item;
};

/**
	@typedef {{
		kbdSelected: boolean,
		kbdSelectedParam: (number | null),
		kbdTarget: boolean
	}}
*/
A3a.vpl.BlockTemplate.BlockMarks;

/** Add a block template on a canvas
	@param {A3a.vpl.Canvas} canvas
	@param {A3a.vpl.BlockTemplate} blockTemplate
	@param {CSSParser.VPL.Box} box
	@param {number} x horizontal block template position (without box padding)
	@param {number} y vertical  block template position (without box padding)
	@param {boolean} kbdSelected
	@param {?A3a.vpl.Application.ItemActivityOptions} accessibility
	@return {void}
*/
A3a.vpl.Application.prototype.addBlockTemplateToCanvas = function (canvas, blockTemplate, box, x, y, kbdSelected, accessibility) {
	var block = new A3a.vpl.Block(blockTemplate, null, null);
	if (blockTemplate.typicalParam) {
		block.param = blockTemplate.typicalParam();
	}
	block.marks = /** @type {A3a.vpl.BlockTemplate.BlockMarks} */({
		kbdSelected: kbdSelected || false,
		kbdSelectedParam: null,
		kbdTarget: false
	});
	var program = this.program;
	var crossedOut = (program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
		.indexOf(blockTemplate.name) < 0;
	var canvasItem = this.addBlockToCanvas(canvas, block, box, ["block", "library"], x, y,
		{
			notInteractive: true,
			notDropTarget: true,
			notDraggable: program.noVPL || program.readOnly,
			disabled: crossedOut || program.readOnly,
			crossedOut: crossedOut,
			/** @type {?A3a.vpl.CanvasItem.mousedown} */
			mousedown: this.uiConfig.blockCustomizationMode && !program.noVPL && !program.readOnly
				? function (canvas, data, width, height, x, y, downEvent) {
					var a = program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced;
					if (a.indexOf(blockTemplate.name) >= 0) {
						a.splice(a.indexOf(blockTemplate.name), 1);
					} else {
						a.push(blockTemplate.name);
					}
					return 1;
				}
				: null,
			// keep normal behavior during customization
			accessibility: this.uiConfig.blockCustomizationMode ? null : accessibility
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
	@param {A3a.vpl.Rule} rule
	@param {boolean} displaySingleEvent
	@param {Object} cssBoxes
	@return {{total:number,totalEvents:number,events:Array.<number>,totalActions:number,actions:Array.<number>,sep:number}}
*/
A3a.vpl.Application.measureRuleWidth = function (rule, displaySingleEvent, cssBoxes) {
	/** @type {Array.<number>} */
	var events = [];
	var totalEvents = 0;
	events = rule.events.map(function (event, j) {
		var box = rule.error && rule.error.eventError &&
			(rule.error.eventErrorIndices.length === 0 || rule.error.eventErrorIndices.indexOf(j) >= 0)
			? rule.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox
			: cssBoxes.blockContainerBox;
		box.width = event == null
			? (events.length === 1 ? cssBoxes.blockEmptyEventOnlyChildBox : cssBoxes.blockEmptyEventAuxBox).totalWidth()
			: A3a.vpl.Program.boxForBlockType(event, j === 0, cssBoxes).totalWidth();
		totalEvents += box.totalWidth();
		return cssBoxes.blockContainerBox.width;
	});
	if (rule.events.length === 0 || !displaySingleEvent && rule.events[rule.events.length - 1] !== null) {
		// add empty block
		cssBoxes.blockContainerBox.width =
			(rule.events.length === 0 ? cssBoxes.blockEmptyEventOnlyChildBox : cssBoxes.blockEmptyEventAuxBox).totalWidth();
		events.push(cssBoxes.blockContainerBox.width);
		totalEvents += cssBoxes.blockContainerBox.totalWidth();
	}

	var sep = cssBoxes.ruleSeparatorBox.totalWidth();

	/** @type {Array.<number>} */
	var actions = [];
	var totalActions = 0;
	actions = rule.actions.map(function (action, j) {
		var box = rule.error && !rule.error.eventError &&
			(rule.error.actionErrorIndices.length === 0 || rule.error.actionErrorIndices.indexOf(j) >= 0)
			? rule.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox
			: cssBoxes.blockContainerBox;
		box.width = action == null
			? (actions.length === 1 ? cssBoxes.blockEmptyActionOnlyChildBox : cssBoxes.blockEmptyActionBox).totalWidth()
			: A3a.vpl.Program.boxForBlockType(action, j === 0, cssBoxes).totalWidth();
		totalActions += box.totalWidth();
		return box.totalWidth();
	});
	if (rule.actions.length === 0 || rule.actions[rule.actions.length - 1] !== null) {
		// add empty block
		cssBoxes.blockContainerBox.width =
			(rule.actions.length === 0 ? cssBoxes.blockEmptyActionOnlyChildBox : cssBoxes.blockEmptyActionBox).totalWidth();
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

/** Calculate the vertical offset to apply to a block based on the
	verticalAlign property of its css box
	@param {CSSParser.VPL.Box} blockBox
	@param {CSSParser.VPL.Box} containerBox
	@return {number}
*/
A3a.vpl.Program.blockVerticalOffset = function (blockBox, containerBox) {
	switch (blockBox.verticalAlign) {
	case "middle":
		return (containerBox.height - blockBox.totalHeight()) / 2;
	case "bottom":
		return containerBox.height - blockBox.totalHeight();
	case "top":
		// no shift
		return 0;
	default:
		// offset from bottom, positive = upward
		return containerBox.height - blockBox.totalHeight() - /** @type {number} */(blockBox.verticalAlign);
	}
};

/** Start editing a comment
	@param {number} ruleIndex
	@return {void}
*/
A3a.vpl.Application.prototype.editComment = function (ruleIndex) {
	var self = this;
	var canvas = this.vplCanvas;
	var rule = this.program.program[ruleIndex];

	this.startTextField({
		initialValue: /** @type {A3a.vpl.RuleComment} */(rule).comment,
		display: function (str, selBegin, selEnd) {
			canvas.onUpdate && canvas.onUpdate();
		},
		finish: function (str) {
			if (str !== null) {
				/** @type {A3a.vpl.RuleComment} */(rule).comment = str;
			}
			self.textField = null;
			canvas.onUpdate && canvas.onUpdate();
		},
		ref: rule
	});
};

/** Add a rule to a canvas
	@param {A3a.vpl.Canvas} canvas
	@param {A3a.vpl.Rule} rule
	@param {number} ruleIndex
	@param {boolean} displaySingleEvent
	@param {number} maxWidthForEventRightAlign
	@param {number} eventX0
	@param {number} actionX0
	@param {number} y
	@param {Object} cssBoxes
	@return {void}
*/
A3a.vpl.Application.prototype.addRuleToCanvas =
	function (canvas, rule, ruleIndex, displaySingleEvent, maxWidthForEventRightAlign,
		eventX0, actionX0, y,
		cssBoxes) {

	var isComment = rule instanceof A3a.vpl.RuleComment;

	var canvasSize = canvas.getSize();
	var x = eventX0;

	var widths = A3a.vpl.Application.measureRuleWidth(rule, displaySingleEvent, cssBoxes);

	var self = this;
	var program = this.program;
	var ruleBox = isComment
		? self.textField && self.textField.ref === rule ? cssBoxes.ruleCommentEditedBox : cssBoxes.ruleCommentBox
		: cssBoxes.ruleBox;
	var block0Box = rule.events.length > 0 && rule.events[0].blockTemplate.type === A3a.vpl.blockType.event
		? cssBoxes.blockEventMainBox
		: cssBoxes.blockEventAuxBox;
	var item = new A3a.vpl.CanvasItem(rule,
		ruleBox.paddedWidth(),
		ruleBox.paddedHeight(),
		x - ruleBox.paddingLeft - cssBoxes.blockContainerBox.offsetLeft() - block0Box.offsetLeft(),
		y - ruleBox.paddingTop - cssBoxes.blockContainerBox.offsetTop() - block0Box.offsetTop(),
		// draw
		function (canvas, item, dx, dy) {
			var ctx = canvas.ctx;
			// strip
			ruleBox.drawAt(ctx, item.x + dx, item.y + dy, true);
			if (isComment) {
				ctx.save();
				ctx.fillStyle = ruleBox.color;
				ctx.font = ruleBox.cssFontString();
				ctx.textAlign = "left";
				ctx.textBaseline = "middle";
				if (self.textField && self.textField.ref === rule) {
					// being edited
					var strLeftSize = ctx.measureText(self.textField.str.slice(0, self.textField.selBegin));
					var ascent = strLeftSize["fontBoundingBoxAscent"] || 0;
					var descent = strLeftSize["fontBoundingBoxDescent"] || 0;
					if (ascent === 0 || descent === 0) {
						// vertical metrics missing in TextMetrics: use css
						ascent = ruleBox.fontSize / 2;
						descent = ascent;
					}
					var textFieldFrame = {
						top: item.y + dy + ruleBox.paddingTop + ruleBox.height / 2 - ascent,
						bottom: item.y + dy + ruleBox.paddingTop + ruleBox.height / 2 + descent,
						left: item.x + dx + ruleBox.paddingLeft,
						right: item.x + dx + ruleBox.paddingLeft + ctx.measureText(self.textField.str).width
					};
					var rightPos = self.textField.str.split("").map(function (c, i) {
						return ctx.measureText(self.textField.str.slice(0, i + 1)).width;
					});
					self.textField.setRenderingPos(textFieldFrame, rightPos);
					if (self.textField.selEnd === self.textField.selBegin) {
						// plain cursor
						ctx.strokeStyle = "black";
						ctx.beginPath();
						ctx.moveTo(textFieldFrame.left + strLeftSize.width, textFieldFrame.top);
						ctx.lineTo(textFieldFrame.left + strLeftSize.width, textFieldFrame.bottom);
						ctx.stroke();
					} else {
						// selection
						var strSelSize = ctx.measureText(self.textField.str.slice(self.textField.selBegin, self.textField.selEnd));
						ctx.save();
						ctx.fillStyle = "silver";
						ctx.fillRect(textFieldFrame.left + strLeftSize.width - 1, textFieldFrame.top,
							strSelSize.width, ascent + descent);
						ctx.restore();
					}
					ctx.fillText(self.textField.str, textFieldFrame.left, item.y + dy + ruleBox.paddingTop + ruleBox.height / 2);
				} else {
					ctx.fillText(/** @type {A3a.vpl.RuleComment} */(rule).comment, item.x + dx + ruleBox.paddingLeft, item.y + dy + ruleBox.paddingTop + ruleBox.height / 2);
				}
				ctx.restore();
				if (self.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.rule &&
					self.kbdControl.selectionIndex1 === ruleIndex) {
					canvas.overlayRect(item.x + dx, item.y + dy, item.width, item.height,
						["rule", "comment", "kbd-selected"]);
				}
				if (self.kbdControl.targetType === A3a.vpl.KbdControl.ObjectType.rule &&
					self.kbdControl.targetIndex1 === ruleIndex) {
					canvas.overlayRect(item.x + dx, item.y + dy, item.width, item.height,
						["rule", "comment", "kbd-target"]);
				}
			} else {
				// event/action separator
				var separatorWidth = cssBoxes.ruleSeparatorBox.totalWidth();
				cssBoxes.ruleSeparatorBox.drawAt(ctx,
					actionX0 - cssBoxes.ruleSeparatorBox.width - cssBoxes.ruleSeparatorBox.marginRight - cssBoxes.ruleSeparatorBox.paddingRight -
						cssBoxes.blockContainerBox.offsetLeft() - cssBoxes.blockActionBox.offsetLeft() + dx,
					item.y + (ruleBox.paddedHeight() - cssBoxes.ruleSeparatorBox.height) / 2 + dy);
				canvas.drawWidget("vpl:then",
					actionX0 - cssBoxes.ruleSeparatorBox.totalWidth() / 2 - cssBoxes.blockContainerBox.offsetLeft() - cssBoxes.blockActionBox.offsetLeft() + dx,
					item.y + ruleBox.paddedHeight() / 2 + dy,
					cssBoxes.ruleSeparatorBox);
				if (rule.locked) {
					canvas.lockedMark(item.x, item.y, item.width, item.height,
						false, rule.disabled ? "#ddd" : "");
				}
				if (self.executedRuleIndex === ruleIndex) {
					canvas.overlayRect(item.x + dx, item.y + dy, item.width, item.height,
						["rule", "executing"]);
				} else if (self.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.rule &&
					self.kbdControl.selectionIndex1 === ruleIndex) {
					canvas.overlayRect(item.x + dx, item.y + dy, item.width, item.height,
						["rule", "kbd-selected"]);
				}
				if (self.kbdControl.targetType === A3a.vpl.KbdControl.ObjectType.rule &&
					self.kbdControl.targetIndex1 === ruleIndex) {
					canvas.overlayRect(item.x + dx, item.y + dy, item.width, item.height,
						["rule", "kbd-target"]);
				}
				// block container boxes
				var x = item.x + dx + ruleBox.paddingLeft;
				if (maxWidthForEventRightAlign > 0) {
					x += maxWidthForEventRightAlign - widths.totalEvents;
				}
				events.forEach(function (event, j) {
					var box = rule.error && rule.error.eventError &&
						(rule.error.eventErrorIndices.length === 0 || rule.error.eventErrorIndices.indexOf(j) >= 0)
						? rule.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox
						: cssBoxes.blockContainerBox;
					box.width = event == null
						? (events.length === 1 ? cssBoxes.blockEmptyEventOnlyChildBox : cssBoxes.blockEmptyEventAuxBox).totalWidth()
						: A3a.vpl.Program.boxForBlockType(event, j === 0, cssBoxes).totalWidth();
					box.drawAt(ctx,
						x + box.marginLeft,
						item.y + dy + ruleBox.paddingTop + cssBoxes.blockContainerBox.marginTop,
						true);
					x += box.totalWidth();
				});
				x = item.x + dx + ruleBox.paddingLeft + actionX0 - eventX0;
				actions.forEach(function (action, j) {
					var box = rule.error && !rule.error.eventError &&
						(rule.error.actionErrorIndices.length === 0 || rule.error.actionErrorIndices.indexOf(j) >= 0)
						? rule.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox
						: cssBoxes.blockContainerBox;
					box.width = action == null
						? (actions.length === 1 ? cssBoxes.blockEmptyActionOnlyChildBox : cssBoxes.blockEmptyActionBox).totalWidth()
						: A3a.vpl.Program.boxForBlockType(action, j === 0, cssBoxes).totalWidth();
					box.drawAt(ctx,
						x + box.marginLeft,
						item.y + dy + ruleBox.paddingTop + cssBoxes.blockContainerBox.marginTop,
						true);
					x += box.totalWidth();
				});
			}
		},
		// interactiveCB
		isComment
			? {
				/** @type {A3a.vpl.CanvasItem.mouseup} */
				mouseup: function (canvas, data, dragIndex, width, height, left, top, ev) {
					self.editComment(ruleIndex);
				}
			}
			: null,
		// doDrop: reorder event handler or add dropped block
		function (targetItem, droppedItem) {
			if (droppedItem.data instanceof A3a.vpl.Rule) {
				var targetIndex = program.program.indexOf(/** @type {A3a.vpl.Rule} */(targetItem.data));
				var droppedIndex = program.program.indexOf(droppedItem.data);
				if (targetIndex >= 0 && droppedIndex >= 0) {
					program.saveStateBeforeChange();
					program.program.splice(droppedIndex, 1);
					program.program.splice(targetIndex, 0, droppedItem.data);
					program.saveStateAfterChange();
				}
			} else if (droppedItem.data instanceof A3a.vpl.Block) {
				program.saveStateBeforeChange();
				targetItem.data.setBlock(droppedItem.data,
					null,
					function () {
						program.saveStateBeforeChange();
					},
					function () {
						program.saveStateAfterChange();
					});
				program.saveStateAfterChange();
			}
			canvas.onUpdate && canvas.onUpdate();
		},
        // canDrop
        function (targetItem, droppedItem) {
            // not event handler on itself, or child block, or event block in basic mode
            return droppedItem.data instanceof A3a.vpl.Rule
                // event handler: ok to another one
                ? droppedItem.data !== targetItem.data
                // block: not in comment
                : !isComment &&
                	// ...and not in parent event handler
					droppedItem.data.ruleContainer !== targetItem.data &&
                    // ...and not a new event in basic mode
                    (program.mode === A3a.vpl.mode.advanced ||
                        targetItem.data.events.length === 0 ||
                        (droppedItem.data instanceof A3a.vpl.Block &&
                            droppedItem.data.blockTemplate.type === A3a.vpl.blockType.action));
        }
	);
	if (rule.disabled) {
		item.drawOverlay = function (ctx, item, dx, dy, isZoomed) {
			canvas.disabledMark(item.x + dx, item.y + dy, item.width, item.height, ["rule"], ["rule"]);
		};
	}
	if (this.program.noVPL || this.program.readOnly) {
		item.draggable = false;
	}
	if (this.uiConfig.nodragAccessibility) {
		item.draggable = false;
		item.interactiveCB = {
			/** @type {A3a.vpl.CanvasItem.mousedown} */
			mousedown: function (canvas, data, width, height, left, top, ev) {
				self.kbdControl.targetType = A3a.vpl.KbdControl.ObjectType.rule;
				self.kbdControl.targetIndex1 = ruleIndex;
				canvas.redraw();
				return 0;
			},
			/** @type {A3a.vpl.CanvasItem.mousedrag} */
			mousedrag: function (canvas, data, dragIndex, width, height, left, top, ev) {
				var canvasBndRect = canvas.canvas.getBoundingClientRect();
				var x = ev.x - canvasBndRect.left;
				var y = ev.y - canvasBndRect.top;
				var isInside = x >= item.x && x < item.x + item.width &&
					y >= item.y && y < item.y + item.height;
				if (self.kbdControl.targetType !== (isInside ? A3a.vpl.KbdControl.ObjectType.rule : A3a.vpl.KbdControl.ObjectType)) {
					self.kbdControl.targetType = isInside ? A3a.vpl.KbdControl.ObjectType.rule : A3a.vpl.KbdControl.ObjectType;
					canvas.redraw();
				}
			}
		};
	}
	canvas.setItem(item);

	if (!isComment) {
		/** @type {A3a.vpl.CanvasItem} */
		var childItem;

		var events = rule.events;
		if (events.length === 0 || (!displaySingleEvent && events[events.length - 1] !== null)) {
			events = events.concat(null);
		}
		x = eventX0;
		if (maxWidthForEventRightAlign > 0) {
			x += maxWidthForEventRightAlign - widths.totalEvents;
		}
		events.forEach(function (event, j) {
			var blockBox = event
				? A3a.vpl.Program.boxForBlockType(event, j === 0, cssBoxes)
				: events.length === 1 ? cssBoxes.blockEmptyEventOnlyChildBox : cssBoxes.blockEmptyEventAuxBox;
			var containerBox = rule.error && rule.error.eventError &&
				(rule.error.eventErrorIndices.length === 0 || rule.error.eventErrorIndices.indexOf(j) >= 0)
				? rule.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox
				: cssBoxes.blockContainerBox;
			var vertOffset = A3a.vpl.Program.blockVerticalOffset(blockBox, containerBox);
			if (event) {
				event.marks = /** @type {A3a.vpl.BlockTemplate.BlockMarks} */({
					kbdSelected: this.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.blockLeft &&
						this.kbdControl.selectionIndex1 === ruleIndex &&
						this.kbdControl.selectionIndex2 === j,
					kbdSelectedParam: this.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.blockLeftParam &&
						this.kbdControl.selectionIndex1 === ruleIndex &&
						this.kbdControl.selectionIndex2 === j
							? this.kbdControl.selectionParamIndex
							: null,
					kbdTarget: this.kbdControl.targetType === A3a.vpl.KbdControl.ObjectType.blockLeft &&
						this.kbdControl.targetIndex1 === ruleIndex &&
						this.kbdControl.targetIndex2 === j
				});
				containerBox.width = blockBox.totalWidth();
				childItem = this.addBlockToCanvas(canvas, event, blockBox, ["block"],
					x, y + vertOffset,
					{
						notInteractive: rule.disabled || this.program.noVPL || this.program.readOnly,
						notClickable: rule.disabled || this.program.noVPL || this.program.readOnly,
						notDraggable: this.program.noVPL || this.program.readOnly,
						accessibility: {
							type: A3a.vpl.KbdControl.ObjectType.blockLeft,
							index1: ruleIndex,
							index2: j
						}
					});
			} else {
				event = new A3a.vpl.EmptyBlock(A3a.vpl.blockType.event, rule,
					{eventSide: true, index: j});
				event.marks = /** @type {A3a.vpl.BlockTemplate.BlockMarks} */({
					kbdSelected: this.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.blockLeft &&
						this.kbdControl.selectionIndex1 === ruleIndex &&
						this.kbdControl.selectionIndex2 === j,
					kbdSelectedParam: null,
					kbdTarget: this.kbdControl.targetType === A3a.vpl.KbdControl.ObjectType.blockLeft &&
						this.kbdControl.targetIndex1 === ruleIndex &&
						this.kbdControl.targetIndex2 === j
				});
				containerBox.width = blockBox.totalWidth();
				childItem = this.addBlockToCanvas(canvas,
					event,
					blockBox, ["block"],
					x, y + vertOffset,
					{
						notDropTarget: rule.disabled || this.program.readOnly,
						notClickable: true,
						notDraggable: true,
						accessibility: {
							type: A3a.vpl.KbdControl.ObjectType.blockLeft,
							index1: ruleIndex,
							index2: j
						}
					});
			}
			item.attachItem(childItem);
			x += containerBox.totalWidth();
		}, this);
		var actions = rule.actions;
		if (actions.length === 0 || actions[actions.length - 1] !== null) {
			actions = actions.concat(null);
		}
		x = actionX0;
		actions.forEach(function (action, j) {
			var blockBox = action
				? A3a.vpl.Program.boxForBlockType(action, j == 0, cssBoxes)
				: actions.length === 1 ? cssBoxes.blockEmptyActionOnlyChildBox : cssBoxes.blockEmptyActionBox;
			var containerBox = rule.error && !rule.error.eventError &&
				(rule.error.actionErrorIndices.length === 0 || rule.error.actionErrorIndices.indexOf(j) >= 0)
				? rule.error.isWarning ? cssBoxes.blockContainerWarningBox : cssBoxes.blockContainerErrorBox
				: cssBoxes.blockContainerBox;
			var vertOffset = A3a.vpl.Program.blockVerticalOffset(blockBox, containerBox);
			if (action) {
				action.marks = /** @type {A3a.vpl.BlockTemplate.BlockMarks} */({
					kbdSelected: this.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.blockRight &&
						this.kbdControl.selectionIndex1 === ruleIndex &&
						this.kbdControl.selectionIndex2 === j,
					kbdSelectedParam: this.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.blockRightParam &&
						this.kbdControl.selectionIndex1 === ruleIndex &&
						this.kbdControl.selectionIndex2 === j
							? this.kbdControl.selectionParamIndex
							: null,
					kbdTarget: this.kbdControl.targetType === A3a.vpl.KbdControl.ObjectType.blockRight &&
						this.kbdControl.targetIndex1 === ruleIndex &&
						this.kbdControl.targetIndex2 === j
				});
				containerBox.width = blockBox.totalWidth();
				childItem = this.addBlockToCanvas(canvas, action,
					A3a.vpl.Program.boxForBlockType(action, j === 0, cssBoxes), ["block"],
					x, y + vertOffset,
					{
						notInteractive: rule.disabled || this.program.noVPL || this.program.readOnly,
						notClickable: rule.disabled || this.program.noVPL || this.program.readOnly,
						notDraggable: this.program.noVPL || this.program.readOnly,
						accessibility: {
							type: A3a.vpl.KbdControl.ObjectType.blockRight,
							index1: ruleIndex,
							index2: j
						}
					});
			} else {
				action = new A3a.vpl.EmptyBlock(A3a.vpl.blockType.action, rule,
					{eventSide: false, index: j});
				action.marks = /** @type {A3a.vpl.BlockTemplate.BlockMarks} */({
					kbdSelected: this.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.blockRight &&
						this.kbdControl.selectionIndex1 === ruleIndex &&
						this.kbdControl.selectionIndex2 === j,
					kbdSelectedParam: null,
					kbdTarget: this.kbdControl.targetType === A3a.vpl.KbdControl.ObjectType.blockRight &&
						this.kbdControl.targetIndex1 === ruleIndex &&
						this.kbdControl.targetIndex2 === j
				});
				containerBox.width = blockBox.totalWidth();
				childItem = this.addBlockToCanvas(canvas,
					action,
					blockBox, ["block"],
					x, y,
					{
						notDropTarget: program.readOnly,
						notClickable: true,
						notDraggable: true,
						accessibility: {
							type: A3a.vpl.KbdControl.ObjectType.blockRight,
							index1: ruleIndex,
							index2: j
						}
					});
			}
			item.attachItem(childItem);
			x += containerBox.totalWidth();
		}, this);

		// error widgets
		canvas.addDecoration(function (ctx) {
			if (rule.error !== null) {
				var box = rule.error.isWarning ? cssBoxes.warningWidgetBox : cssBoxes.errorWidgetBox;
				canvas.drawWidget(rule.error.isWarning ? "vpl:warning" : "vpl:error",
					eventX0 - ruleBox.paddingLeft - ruleBox.marginLeft - cssBoxes.blockContainerBox.offsetLeft() - block0Box.offsetLeft() -
						box.width / 2 - box.marginRight - box.paddingRight,
					y + block0Box.height * 0.5,
					box);
			}
		});
	}
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
	var zoomBlocks = window.matchMedia && window.matchMedia("(pointer: coarse)").matches
		?  this.program.touchZoomBlocks
		: this.program.zoomBlocks;
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
	cssBoxes.blockEmptyEventOnlyChildBox = css.getBox({tag: "block", clas: ["event", "empty"],
		pseudoClass: zoomBlocks ? ["only-child", "small"] : ["only-child"]});
	cssBoxes.blockEmptyEventAuxBox = css.getBox({tag: "block", clas: ["event", "event-aux", "empty"],
		pseudoClass: zoomBlocks ? ["small"] : []});
	cssBoxes.blockEmptyActionOnlyChildBox = css.getBox({tag: "block", clas: ["action", "empty"],
		pseudoClass: zoomBlocks ? ["only-child", "small"] : ["only-child"]});
	cssBoxes.blockContainerBox = css.getBox({tag: "block-container"});
	cssBoxes.blockContainerErrorBox = css.getBox({tag: "block-container", clas: ["error"]});
	cssBoxes.blockContainerWarningBox = css.getBox({tag: "block-container", clas: ["warning"]});
	cssBoxes.ruleBox = css.getBox({tag: "rule", pseudoClass: zoomBlocks ? ["small"] : []});
	cssBoxes.ruleSeparatorBox = css.getBox({tag: "widget", id: "widget-then", pseudoClass: zoomBlocks ? ["small"] : []});
	cssBoxes.ruleCommentBox = css.getBox({tag: "rule", clas: ["comment"], pseudoClass: zoomBlocks ? ["small"] : []});
	cssBoxes.ruleCommentEditedBox = css.getBox({tag: "rule", clas: ["comment"], pseudoClass: zoomBlocks ? ["small", "edited"] : ["edited"]});
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

/** Update VPL program error information
	@return {boolean} true if error, false if warning or ok
*/
A3a.vpl.Application.prototype.updateErrorInfo = function () {
	var uiConfig = this.uiConfig;
	var program = this.program;

	// make sure code is up-to-date to have error info
	var code = program.getCode(program.currentLanguage);

	// find first error, or first warning if there is no error
	this.vplMessage = "";
	this.vplMessageIsWarning = false;
	if (!uiConfig.blockCustomizationMode) {
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

	var isError = this.vplMessage !== "" && !this.vplMessageIsWarning;
	if (!isError) {
		try {
			var app = this;
			var checkErrMsg = this.robots[this.currentRobotIndex].runGlue.check(code, app.program.currentLanguage,
				function (errorMsg) {
					// ignore errorMsg, rendering will pick cached version
					app.renderProgramToCanvas();
				});
			if (checkErrMsg) {
				this.vplMessage = checkErrMsg;
				isError = true;
			}
		} catch (e) {
			// ignore, likely robot not connected yet
		}
	}

	return isError;
};

/**
	@param {Array.<string>} toolbarConfig button id, "!space" for space, "!stretch" for stretch
	@param {Array.<string>} cssClasses
	@param {CSSParser.VPL.Box} toolbarBox
	@param {CSSParser.VPL.Box} toolbarSeparatorBox
	@param {Object.<string,CSSParser.VPL.Box>} toolbarItemBoxes
	@return {A3a.vpl.ControlBar}
*/
A3a.vpl.Application.prototype.createVPLToolbar = function (toolbarConfig, cssClasses,
	toolbarBox, toolbarSeparatorBox, toolbarItemBoxes) {
	// top or bottom controls
	var controlBar = new A3a.vpl.ControlBar(this.vplCanvas);
	controlBar.setButtons(this,
		toolbarConfig,
		cssClasses,
		this.program.toolbarDrawButton || A3a.vpl.Commands.drawButtonJS,
		this.program.toolbarGetButtonBounds || A3a.vpl.Commands.getButtonBoundsJS);
	controlBar.calcLayout(toolbarBox, toolbarItemBoxes, toolbarSeparatorBox);
	return controlBar;
};

/** Get the block template specified by index among those displayed on the left (events and states)
	or the right (actions and comments)
	@param {boolean} isAction true for actions or comments, false for events or states
	@param {number} index
	@return {A3a.vpl.BlockTemplate}
*/
A3a.vpl.Application.prototype.getEnabledBlockTemplateByIndex = function (isAction, index) {
	for (var i = 0; i < A3a.vpl.BlockTemplate.lib.length; i++) {
		var blockTemplate = A3a.vpl.BlockTemplate.lib[i];
		if ((isAction
			? blockTemplate.type === A3a.vpl.blockType.action || blockTemplate.type === A3a.vpl.blockType.comment
			: blockTemplate.type === A3a.vpl.blockType.event || blockTemplate.type === A3a.vpl.blockType.state) &&
			(this.program.mode === A3a.vpl.mode.basic ? this.program.enabledBlocksBasic : this.program.enabledBlocksAdvanced)
				.indexOf(blockTemplate.name) >= 0) {
			if (index === 0) {
				return blockTemplate;
			}
			index--;
		}
	}
	return null;
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

	this.updateErrorInfo();

	// zoom blocks if too small
	program.zoomBlocks = canvas.dims.blockSize < canvas.dims.minInteractiveBlockSize;
	program.touchZoomBlocks = canvas.dims.blockSize < canvas.dims.minTouchInteractiveBlockSize;

	var canvasSize = canvas.getSize();
	var renderingState = /** @type {A3a.vpl.Program.CanvasRenderingState} */(canvas.state.vpl);
	var self = this;
	var showState = program.mode === A3a.vpl.mode.advanced;

	// 2nd toolbar at bottom between templates
	var toolbar2HasAvButtons = A3a.vpl.ControlBar.hasAvailableButtons(this, this.vplToolbar2Config);

	// program item counts
	var displaySingleEvent = program.displaySingleEvent();
	var nMaxEventHandlerELength = 0;
	var nMaxEventHandlerALength = 0;
	var maxEventsWidth = 0;
	var maxActionsWidth = 0;
	var nNormalRules = 0;
	var nCommentRules = 0;
	program.program.forEach(function (rule) {
		if (rule instanceof A3a.vpl.RuleComment) {
			nCommentRules++;
		} else {
			nNormalRules++;
		}
		var blocks = rule.events;
		nMaxEventHandlerELength = Math.max(nMaxEventHandlerELength,
			blocks.length
				+ (blocks.length === 0 || blocks[blocks.length - 1] !== null ? 1 : 0));
		blocks = rule.actions;
		nMaxEventHandlerALength = Math.max(nMaxEventHandlerALength,
			blocks.length
				+ (blocks.length === 0 || blocks[blocks.length - 1] !== null ? 1 : 0));

		var details = A3a.vpl.Application.measureRuleWidth(rule, displaySingleEvent, cssBoxes);
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
		if (uiConfig.blockCustomizationMode ||
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
	this.kbdControl.libLeftNum = nEvTemplates;
	this.kbdControl.libRightNum = nAcTemplates;

	// default drop handler to delete blocks and rules dragged outside hor span of rules
	canvas.addDefaultDoDrop("delete", function (dropTargetItem, draggedItem, x, y) {
		if (self.commands.canDrop("vpl:trashcan", draggedItem)) {
			var left = eventX0 - cssBoxes.ruleBox.offsetLeft() -
				cssBoxes.blockContainerBox.offsetLeft() - cssBoxes.blockEventMainBox.offsetLeft();
			var width = cssBoxes.ruleBox.totalWidth();
			if (x < left || x > left + width) {
				self.commands.doDrop("vpl:trashcan", draggedItem);
				return true;
			}
		}
		return false;
	});

	// box sizes
	var toolbarItemBoxes = A3a.vpl.ControlBar.buttonBoxes(this, this.vplToolbarConfig, ["vpl", "top"],
		null,
		function (id) {
			switch (id) {
			case "vpl:filename":
				if (self.textField != null && self.textField.ref === self.program) {
					return ["edited"];
				}
				break;
			}
			return [];
		});
	var toolbarItemHeight = A3a.vpl.ControlBar.maxBoxHeight(toolbarItemBoxes);
	var toolbar2ItemBoxes = A3a.vpl.ControlBar.buttonBoxes(this, this.vplToolbar2Config, ["vpl", "bottom"]);
	var toolbar2ItemHeight = A3a.vpl.ControlBar.maxBoxHeight(toolbar2ItemBoxes);

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
	cssBoxes.ruleCommentBox.width = ruleWidth;
	cssBoxes.ruleCommentBox.height = cssBoxes.ruleCommentBox.fontSize;
	cssBoxes.ruleCommentEditedBox.width = ruleWidth;
	cssBoxes.ruleCommentEditedBox.height = cssBoxes.ruleCommentBox.fontSize;

	// find rule vertial offsets (for next one: [0]=2nd, [last]=total vert size)
	var ruleVerticalOffset = [];
	program.program.forEach(function (rule, i) {
		var height = rule instanceof A3a.vpl.RuleComment
			? cssBoxes.ruleCommentBox.totalHeight()
			: cssBoxes.ruleBox.totalHeight();
		ruleVerticalOffset.push(i === 0 ? height : ruleVerticalOffset[i - 1] + height);
	});

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
	var controlBar = this.createVPLToolbar(this.vplToolbarConfig, ["vpl", "top"],
		cssBoxes.toolbarBox, cssBoxes.toolbarSeparatorBox, toolbarItemBoxes);
	controlBar.addToCanvas(cssBoxes.toolbarBox, toolbarItemBoxes,
		self.createVPLControlBarDoOverFun());
	if (this.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.toolbarTop &&
		!this.uiConfig.blockCustomizationMode) {
		// find control via its id, because this.kbdControl.selectionIndex1 skips passive controls
		var selectedTBCmd = this.kbdControl.getSelectedCmd();
		var selectedTBControl = null;
		for (var i = 0; i < controlBar.controls.length; i++) {
			if (controlBar.controls[i].id === selectedTBCmd.name) {
				selectedTBControl = controlBar.controls[i];
				break;
			}
		}
		var selectedTBControlBox = toolbarItemBoxes[selectedTBControl.id];
		canvas.addDecoration(function (ctx) {
			canvas.overlayRect(selectedTBControl.x, selectedTBControl.y, selectedTBControlBox.width, selectedTBControlBox.height,
				["button", "top", "kbd-selected"]);
		});
	}

	// 2nd toolbar at bottom between templates
	if (toolbar2HasAvButtons > 0) {
		var controlBar2 = this.createVPLToolbar(this.vplToolbar2Config, ["vpl", "bottom"],
			cssBoxes.toolbar2Box, cssBoxes.toolbarSeparator2Box, toolbar2ItemBoxes);
		controlBar2.addToCanvas(cssBoxes.toolbar2Box, toolbar2ItemBoxes,
			self.createVPLControlBarDoOverFun());
		if (this.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.toolbarBottom &&
			!this.uiConfig.blockCustomizationMode) {
			// find control via its id, because this.kbdControl.selectionIndex1 skips passive controls
			var selectedTBCmd = this.kbdControl.getSelectedCmd();
			var selectedTBControl = null;
			for (var i = 0; i < controlBar2.controls.length; i++) {
				if (controlBar2.controls[i].id === selectedTBCmd.name) {
					selectedTBControl = controlBar2.controls[i];
					break;
				}
			}
			var selectedTBControlBox = toolbar2ItemBoxes[selectedTBControl.id];
			canvas.addDecoration(function (ctx) {
				canvas.overlayRect(selectedTBControl.x, selectedTBControl.y, selectedTBControlBox.width, selectedTBControlBox.height,
					["button", "bottom", "kbd-selected"]);
			});
		}
	}

	// templates
	var stepEvent = cssBoxes.blockEventLibItemBox.totalHeight();
	var stepAction = cssBoxes.blockActionLibItemBox.totalHeight();
	var eventLibWidth = 0;
	var actionLibWidth = 0;
	if (cssBoxes.blockEventLibBox.scroll) {
		this.kbdControl.libLeftColLen = 1;
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
				(uiConfig.blockCustomizationMode ||
					(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				var box = boxForBlockTemplate(cssBoxes, blockTemplate);
				var x = cssBoxes.blockEventLibBox.x + box.offsetLeft();
				var y = cssBoxes.blockEventLibBox.y + box.offsetTop() + row * stepEvent;
				this.addBlockTemplateToCanvas(canvas, blockTemplate, box, x, y,
					self.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.libLeft &&
						self.kbdControl.selectionIndex1 === row,
					{
						type: A3a.vpl.KbdControl.ObjectType.none,
						index1: 0,
						index2: 0,
						click: function () {
							self.kbdControl.activateTemplate(blockTemplate);
						}
					});
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
		this.kbdControl.libLeftColLen = colLen;
		var row = 0;
		A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
			if ((blockTemplate.type === A3a.vpl.blockType.event ||
					blockTemplate.type === A3a.vpl.blockType.state) &&
				(uiConfig.blockCustomizationMode ||
					(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				var box = boxForBlockTemplate(cssBoxes, blockTemplate);
				var x = cssBoxes.blockEventLibBox.x + box.offsetLeft() + Math.floor(row / colLen) * stepEvent;
				var y = cssBoxes.blockEventLibBox.y + box.offsetTop() + stepEvent * (row % colLen);
				self.addBlockTemplateToCanvas(canvas, blockTemplate, box, x, y,
					self.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.libLeft &&
						self.kbdControl.selectionIndex1 === row % colLen &&
						self.kbdControl.selectionIndex2 === Math.floor(row / colLen),
					{
						type: A3a.vpl.KbdControl.ObjectType.none,
						index1: 0,
						index2: 0,
						click: function () {
							self.kbdControl.activateTemplate(blockTemplate);
						}
					});
				row++;
			}
		}, this);
	}
	if (cssBoxes.blockActionLibBox.scroll) {
		this.kbdControl.libRightColLen = 1;
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
				(uiConfig.blockCustomizationMode ||
					(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				var box = boxForBlockTemplate(cssBoxes, blockTemplate);
				this.addBlockTemplateToCanvas(canvas, blockTemplate, box,
					cssBoxes.blockActionLibBox.x + cssBoxes.blockActionLibItemBox.offsetLeft(),
					cssBoxes.blockActionLibBox.y + cssBoxes.blockActionLibItemBox.offsetTop() + row * stepAction,
					self.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.libRight &&
						self.kbdControl.selectionIndex1 === row,
					{
						type: A3a.vpl.KbdControl.ObjectType.none,
						index1: 0,
						index2: 0,
						click: function () {
							self.kbdControl.activateTemplate(blockTemplate);
						}
					});
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
		this.kbdControl.libRightColLen = colLen;
		row = 0;
		A3a.vpl.BlockTemplate.lib.forEach(function (blockTemplate, i) {
			if ((blockTemplate.type === A3a.vpl.blockType.action ||
					blockTemplate.type === A3a.vpl.blockType.comment) &&
				(uiConfig.blockCustomizationMode ||
					(program.mode === A3a.vpl.mode.basic ? program.enabledBlocksBasic : program.enabledBlocksAdvanced)
						.indexOf(blockTemplate.name) >= 0)) {
				var box = boxForBlockTemplate(cssBoxes, blockTemplate);
				var x = cssBoxes.blockActionLibBox.x + box.offsetLeft() + cssBoxes.blockActionLibBox.width -
					(acCol - Math.floor(row / colLen)) * stepAction;
				var y = cssBoxes.blockActionLibBox.y + box.offsetTop() + stepAction * (row % colLen);
				self.addBlockTemplateToCanvas(canvas, blockTemplate, box, x, y,
					self.kbdControl.selectionType === A3a.vpl.KbdControl.ObjectType.libRight &&
						self.kbdControl.selectionIndex1 === row % colLen &&
						self.kbdControl.selectionIndex2 === Math.floor(row / colLen),
					{
						type: A3a.vpl.KbdControl.ObjectType.none,
						index1: 0,
						index2: 0,
						click: function () {
							self.kbdControl.activateTemplate(blockTemplate);
						}
					});
				row++;
			}
		}, this);
	}

	if (uiConfig.blockCustomizationMode) {
		// rule skeleton to toggle program.multiEventBasic or program.multiEventAdvanced
		(function () {
			// size event and action boxes and rule box
			var eventContainerBox = cssBoxes.blockContainerBox.copy();
			eventContainerBox.width = cssBoxes.blockEventMainBox.totalWidth();
			var auxEventContainerBox = cssBoxes.blockContainerBox.copy();
			auxEventContainerBox.width = cssBoxes.blockEventAuxBox.totalWidth();
			var actionContainerBox = cssBoxes.blockContainerBox.copy();
			actionContainerBox.width = cssBoxes.blockActionBox.totalWidth();
			var totalWidth = eventContainerBox.totalWidth() +
				auxEventContainerBox.totalWidth() +
				cssBoxes.ruleSeparatorBox.totalWidth() +
				actionContainerBox.totalWidth();;
			var ruleBox = cssBoxes.ruleBox.copy();
			ruleBox.width = totalWidth;
			var eventX0 = cssBoxes.viewBox.x + (cssBoxes.viewBox.width - totalWidth) / 2 +
				(eventLibWidth - actionLibWidth) / 2 - canvas.dims.scrollbarWidth / 2;
			var actionX0 = eventX0 + totalWidth - actionContainerBox.totalWidth();
			var y = cssBoxes.vplBox.y + ruleBox.offsetTop() + eventContainerBox.offsetTop();

			var isInside = false;
			var item = new A3a.vpl.CanvasItem(self,
				ruleBox.paddedWidth(),
				ruleBox.paddedHeight(),
				eventX0 - ruleBox.paddingLeft - eventContainerBox.offsetLeft(),
				y - ruleBox.paddingTop - eventContainerBox.offsetTop(),
				// draw
				function (canvas, item, dx, dy) {
					var ctx = canvas.ctx;
					// strip
					ruleBox.drawAt(ctx, item.x + dx, item.y + dy, true);
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
					var x = item.x + dx + ruleBox.paddingLeft;
					eventContainerBox.drawAt(ctx,
						x + eventContainerBox.marginLeft,
						item.y + dy + ruleBox.paddingTop + eventContainerBox.marginTop,
						true);
					cssBoxes.blockEventMainBox.drawAt(ctx,
						x + eventContainerBox.offsetLeft() + cssBoxes.blockEventMainBox.marginLeft,
						item.y + dy + ruleBox.paddingTop +
							eventContainerBox.offsetTop() + cssBoxes.blockEventMainBox.marginTop +
							A3a.vpl.Program.blockVerticalOffset(cssBoxes.blockEventMainBox, eventContainerBox),
						true);
					x += eventContainerBox.totalWidth();
					auxEventContainerBox.drawAt(ctx,
						x + auxEventContainerBox.marginLeft,
						item.y + dy + ruleBox.paddingTop + auxEventContainerBox.marginTop,
						true);
					cssBoxes.blockEventAuxBox.drawAt(ctx,
						x + eventContainerBox.offsetLeft() + cssBoxes.blockEventAuxBox.marginLeft,
						item.y + dy + ruleBox.paddingTop +
							auxEventContainerBox.offsetTop() + cssBoxes.blockEventAuxBox.marginTop +
							A3a.vpl.Program.blockVerticalOffset(cssBoxes.blockEventAuxBox, auxEventContainerBox),
						true);
					if (!(self.program.mode === A3a.vpl.mode.advanced
							? self.program.multiEventAdvanced : self.program.multiEventBasic) ^ isInside) {
						canvas.disabledMark(x + eventContainerBox.offsetLeft() + cssBoxes.blockEventAuxBox.marginLeft,
							item.y + dy + ruleBox.paddingTop +
								auxEventContainerBox.offsetTop() + cssBoxes.blockEventAuxBox.marginTop +
								A3a.vpl.Program.blockVerticalOffset(cssBoxes.blockEventAuxBox, auxEventContainerBox),
							cssBoxes.blockEventAuxBox.width, cssBoxes.blockEventAuxBox.height,
							["block"], ["block"], false);
					}
					x = item.x + dx + cssBoxes.ruleBox.paddingLeft + actionX0 - eventX0;
					actionContainerBox.drawAt(ctx,
						x + actionContainerBox.marginLeft,
						item.y + dy + ruleBox.paddingTop + actionContainerBox.marginTop,
						true);
					cssBoxes.blockActionBox.drawAt(ctx,
						x + actionContainerBox.offsetLeft() + cssBoxes.blockActionBox.marginLeft,
						item.y + dy + ruleBox.paddingTop +
							actionContainerBox.offsetTop() + cssBoxes.blockActionBox.marginTop +
							A3a.vpl.Program.blockVerticalOffset(cssBoxes.blockActionBox, actionContainerBox),
						true);
				},
				// interactiveCB
				{
					/** @type {A3a.vpl.CanvasItem.mousedown} */
					mousedown: function (canvas, data, width, height, left, top, ev) {
						isInside = true;
						canvas.redraw();
						return 0;
					},
					/** @type {A3a.vpl.CanvasItem.mousedrag} */
					mousedrag: function (canvas, data, dragIndex, width, height, left, top, ev) {
						var canvasBndRect = canvas.canvas.getBoundingClientRect();
						var x = ev.x - canvasBndRect.left;
						var y = ev.y - canvasBndRect.top;
						isInside = x >= left &&
							x < left + width &&
							y >= top &&
							y < top + height;
						canvas.redraw();
					},
					/** @type {A3a.vpl.CanvasItem.mouseup} */
					mouseup: function (canvas, data, dragIndex) {
						if (isInside) {
							if (self.program.mode === A3a.vpl.mode.advanced) {
								self.program.multiEventAdvanced = !self.program.multiEventAdvanced;
							} else {
								self.program.multiEventBasic = !self.program.multiEventBasic;
							}
						}
						canvas.redraw();
					}
				},
				// doDrop
				null,
		        // canDrop
		        null
			);
			item.draggable = false;
			canvas.setItem(item);
		})();

		// draw vpl:customize widget
		var customizationBox = canvas.css.getBox({tag: "widget", id: "vpl-customize"});
		customizationBox.width = cssBoxes.vplBox.width / 2;
		customizationBox.height = (cssBoxes.vplBox.height - cssBoxes.ruleBox.totalHeight()) / 2;
		canvas.addDecoration(function (ctx) {
			canvas.drawWidget("vpl:customize",
				cssBoxes.vplBox.x + cssBoxes.vplBox.width / 2,
				cssBoxes.vplBox.y + (cssBoxes.vplBox.height + cssBoxes.ruleBox.totalHeight()) / 2,
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
		renderingState.programScroll.setTotalHeight(ruleVerticalOffset[ruleVerticalOffset.length - 1]);

		// ensure keyboard selection is visible
		switch (self.kbdControl.selectionType) {
		case A3a.vpl.KbdControl.ObjectType.rule:
		case A3a.vpl.KbdControl.ObjectType.blockLeft:
		case A3a.vpl.KbdControl.ObjectType.blockRight:
		case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
		case A3a.vpl.KbdControl.ObjectType.blockRightParam:
			renderingState.programScroll.scrollToShowVertSpan(self.kbdControl.selectionIndex1 > 0 ? ruleVerticalOffset[self.kbdControl.selectionIndex1 - 1] : 0,
				ruleVerticalOffset[self.kbdControl.selectionIndex1]);
			break;
		}

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
		program.program.forEach(function (rule, i) {
			if ((i > 0 ? ruleVerticalOffset[i - 1] : 0) < cssBoxes.vplBox.height + renderingState.programScroll.vertScroll &&
				ruleVerticalOffset[i] > renderingState.programScroll.vertScroll) {
				this.addRuleToCanvas(canvas, rule, i,
					displaySingleEvent,
					canvas.dims.eventRightAlign ? maxEventsWidth : 0,
					eventX0, actionX0,
					cssBoxes.vplBox.y + (i > 0 ? ruleVerticalOffset[i - 1] : 0) + cssBoxes.ruleBox.offsetTop() + cssBoxes.blockContainerBox.offsetTop(),
					cssBoxes);
			}
			if (rule.error !== null && errorMsg === "") {
				errorMsg = rule.error.msg;
				isWarning = rule.error.isWarning;
				if (rule.error.conflictEventHandler !== null) {
					for (var j = i + 1; j < program.program.length; j++) {
						if (program.program[j] === rule.error.conflictEventHandler) {
							program.addEventHandlerConflictLinkToCanvas(canvas,
								eventX0,
								cssBoxes.vplBox.y + cssBoxes.ruleBox.totalHeight() * i + cssBoxes.ruleBox.offsetTop() + cssBoxes.blockContainerBox.offsetTop(),
								cssBoxes.vplBox.y + cssBoxes.ruleBox.totalHeight() * j + cssBoxes.ruleBox.offsetTop() + cssBoxes.blockContainerBox.offsetTop(),
								cssBoxes,
								rule.error.isWarning);
							break;
						}
					}
				}
			}
		}, this);
		renderingState.programScroll.end();

		// more high and low hints
		if (!renderingState.programScroll.isTop()) {
			// more to see above
			var moreHighBox = canvas.css.getBox({tag: "widget", id: "widget-moreHigh"});
			var item = new A3a.vpl.CanvasItem(null,
				moreHighBox.totalWidth(),
				moreHighBox.totalHeight(),
				cssBoxes.vplBox.x + cssBoxes.vplBox.width - moreHighBox.totalWidth(),
				cssBoxes.vplBox.y + moreHighBox.totalHeight() - moreHighBox.totalHeight(),
				/** @type {A3a.vpl.CanvasItem.draw} */
				(function (canvas, item, dx, dy) {
					canvas.drawWidget("vpl:moreHigh",
						cssBoxes.vplBox.x + cssBoxes.vplBox.width - moreHighBox.totalWidth() / 2,
						cssBoxes.vplBox.y + moreHighBox.totalHeight() / 2,
						moreHighBox);
				}),
				{
					mouseup: function () {
						renderingState.programScroll.scrollCanvas(0, -cssBoxes.ruleBox.totalHeight());
						canvas.redraw();
					}
				},
				null, null,
				"scrollUp");
			canvas.setItem(item);
		}
		if (!renderingState.programScroll.isBottom()) {
			// more to see below
			var moreLowBox = canvas.css.getBox({tag: "widget", id: "widget-moreLow"});
			var item = new A3a.vpl.CanvasItem(null,
				moreLowBox.totalWidth(),
				moreLowBox.totalHeight(),
				cssBoxes.vplBox.x + cssBoxes.vplBox.width - moreLowBox.totalWidth(),
				cssBoxes.vplBox.y + cssBoxes.vplBox.height - moreLowBox.totalHeight(),
				/** @type {A3a.vpl.CanvasItem.draw} */
				(function (canvas, item, dx, dy) {
					canvas.drawWidget("vpl:moreLow",
						cssBoxes.vplBox.x + cssBoxes.vplBox.width - moreLowBox.totalWidth() / 2,
						cssBoxes.vplBox.y + cssBoxes.vplBox.height - moreLowBox.totalHeight() / 2,
						moreLowBox);
				}),
				{
					mouseup: function () {
						renderingState.programScroll.scrollCanvas(0, cssBoxes.ruleBox.totalHeight());
						canvas.redraw();
					}
				},
				null, null,
				"scrollDown");
			canvas.setItem(item);
		}

		if (program.noVPL) {
			canvas.addDecoration(function (ctx) {
				canvas.disabledMark(cssBoxes.vplBox.x, cssBoxes.vplBox.y,
					cssBoxes.vplBox.width, cssBoxes.vplBox.height,
					["vpl"], ["vpl"]);
			});
		}
	}

	// hint
	if (this.vplHint) {
		canvas.addDecoration(function (ctx) {
			var box = canvas.css.getBox({tag: "hint"});
			ctx.fillStyle = box.color;
			ctx.font = box.cssFontString();
			ctx.textAlign = "start";
			ctx.textBaseline = "middle";
			var msg = self.i18n.translate(/** @type {string} */(self.vplHint));
			if (self.uiConfig.nodragAccessibility) {
				var msgNoDrag = self.i18n.translate(/** @type {string} */(self.vplHint + ";nodrag"));
				if (msgNoDrag.slice(-7) !== ";nodrag") {
					// specific message for nodragAccessibility
					msg = msgNoDrag;
				}
			}

			box.width = ctx.measureText(msg).width;
			box.height = box.fontSize * 1.2;

			box.drawAt(ctx, box.marginLeft, canvasSize.height - box.totalHeight() + box.marginTop, true);
			ctx.fillText(msg,
				box.offsetLeft(),
				canvasSize.height - box.totalHeight() + box.offsetTop() + box.height / 2);
		});
	}

	program.onUpdate && program.onUpdate();
	canvas.redraw();
};

/** Render the program to a single canvas
	@param {number} ruleIndex
	@return {void}
*/
A3a.vpl.Application.prototype.highlightRuleExecution = function (ruleIndex) {
	this.executedRuleIndex = ruleIndex;
	this.renderProgramToCanvas();
	var app = this;
	window["setTimeout"](function () {
		// remove highlight after executionHightlightDuration if since ruleIndex
		if (app.executedRuleIndex === ruleIndex) {
			app.executedRuleIndex = -1;
			app.renderProgramToCanvas();
		}
	}, 1000 * this.executionHightlightDuration);
};
