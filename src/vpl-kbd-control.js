/*
	Copyright 2020 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Definition of class A3a.vpl.KbdControl to control the vpl ui entirely
with the keyboard.

*/

/**
	@constructor
	@param {A3a.vpl.Application} app
*/
A3a.vpl.KbdControl = function (app) {
	this.app = app;

	this.libLeftNum = 0;
	this.libLeftColLen = 1;
	this.libRightNum = 0;
	this.libRightColLen = 1;

	this.selectionType = A3a.vpl.KbdControl.ObjectType.none;
	this.selectionIndex1 = 0;
	this.selectionIndex2 = 0;
	this.selectionParamIndex = 0;
	this.targetType = A3a.vpl.KbdControl.ObjectType.none;
	this.targetIndex1 = 0;
	this.targetIndex2 = 0;
};

/** @enum {string}
*/
A3a.vpl.KbdControl.ObjectType = {
	none: "",
	blockLeft: "bl",
	blockRight: "br",
	blockLeftParam: "blp",
	blockRightParam: "brp",
	rule: "r",
	libLeft: "ll",
	libRight: "lr"
};

/** Exit kbd control
	@return {void}
*/
A3a.vpl.KbdControl.prototype.exit = function () {
	if (this.selectionType !== A3a.vpl.KbdControl.ObjectType.none ||
		this.targetType !== A3a.vpl.KbdControl.ObjectType.none) {
		this.selectionType = A3a.vpl.KbdControl.ObjectType.none;
		this.targetType = A3a.vpl.KbdControl.ObjectType.none;
		this.app.renderProgramToCanvas();
	}
};

/** Get selected rule or rule's block
	@return {null|A3a.vpl.Rule|A3a.vpl.Block}
*/
A3a.vpl.KbdControl.prototype.getSelectedObject = function () {
	switch (this.selectionType) {
	case A3a.vpl.KbdControl.ObjectType.rule:
		return this.app.program.program[this.selectionIndex1];
	case A3a.vpl.KbdControl.ObjectType.blockLeft:
		return this.app.program.program[this.selectionIndex1].events[this.selectionIndex2];
	case A3a.vpl.KbdControl.ObjectType.blockRight:
		return this.app.program.program[this.selectionIndex1].actions[this.selectionIndex2];
	default:
		return null;
	}
};

/** Get block containing the selected block parameter
	@return {null|A3a.vpl.Block}
*/
A3a.vpl.KbdControl.prototype.getBlockOfSelectedParam = function () {
	switch (this.selectionType) {
	case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
		return this.app.program.program[this.selectionIndex1].events[this.selectionIndex2];
	case A3a.vpl.KbdControl.ObjectType.blockRightParam:
		return this.app.program.program[this.selectionIndex1].actions[this.selectionIndex2];
	default:
		return null;
	}
};

/** Get selected rule block template in lib
	@return {null|A3a.vpl.BlockTemplate}
*/
A3a.vpl.KbdControl.prototype.getSelectedBlockTemplate = function () {
	switch (this.selectionType) {
	case A3a.vpl.KbdControl.ObjectType.libLeft:
		return this.app.getEnabledBlockTemplateByIndex(false,
			this.selectionIndex1 + this.libLeftColLen * this.selectionIndex2);
	case A3a.vpl.KbdControl.ObjectType.libRight:
		return this.app.getEnabledBlockTemplateByIndex(true,
			this.selectionIndex1 + this.libRightColLen * this.selectionIndex2);
	default:
		return null;
	}
};

/** Get target block
	@return {null|A3a.vpl.Rule|A3a.vpl.Block}
*/
A3a.vpl.KbdControl.prototype.getTargetObject = function () {
	switch (this.targetType) {
	case A3a.vpl.KbdControl.ObjectType.rule:
		return this.app.program.program[this.targetIndex1];
	case A3a.vpl.KbdControl.ObjectType.blockLeft:
		return this.app.program.program[this.targetIndex1].events[this.targetIndex2] || this.app.program.program[this.targetIndex1];
	case A3a.vpl.KbdControl.ObjectType.blockRight:
		return this.app.program.program[this.targetIndex1].actions[this.targetIndex2] || this.app.program.program[this.targetIndex1];
	default:
		return null;
	}
};

/** Attach to document's keyboard events
	@return {void}
*/
A3a.vpl.KbdControl.prototype.addHandlers = function () {
	var self = this;
	this.app.keyboard.extendHandler(function (ev) {

		function numBlocksLeft() {
			return self.app.program.program[self.selectionIndex1].events.length +
				(self.app.program.displaySingleEvent() ? 0 : 1);
		}
		function numBlocksRight() {
			return self.app.program.program[self.selectionIndex1].actions.length + 1;
		}

		switch (ev.key) {
		case "Escape":
			switch (self.selectionType) {
			case A3a.vpl.KbdControl.ObjectType.blockLeft:
			case A3a.vpl.KbdControl.ObjectType.blockRight:
				if (self.targetType == self.selectionType &&
					self.targetIndex1 == self.selectionIndex1 &&
					self.targetIndex2 == self.selectionIndex2) {
					self.targetType = A3a.vpl.KbdControl.ObjectType.none;
				} else {
					self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
				}
				break;
			case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
				self.selectionType = A3a.vpl.KbdControl.ObjectType.blockLeft;
				break;
			case A3a.vpl.KbdControl.ObjectType.blockRightParam:
				self.selectionType = A3a.vpl.KbdControl.ObjectType.blockRight;
				break;
			default:
				self.selectionType = A3a.vpl.KbdControl.ObjectType.none;
				self.targetType = A3a.vpl.KbdControl.ObjectType.none;
				break;
			}
			self.app.renderProgramToCanvas();
			return true;
		case "Enter":
			switch (self.selectionType) {
			case A3a.vpl.KbdControl.ObjectType.none:
				self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
				self.selectionIndex1 = 0;
				self.targetType = A3a.vpl.KbdControl.ObjectType.rule;
				self.targetIndex1 = 0;
				break;
			case A3a.vpl.KbdControl.ObjectType.rule:
				self.selectionType = A3a.vpl.KbdControl.ObjectType.blockLeft;
				self.selectionIndex2 = 0;
				break;
			case A3a.vpl.KbdControl.ObjectType.blockLeft:
			case A3a.vpl.KbdControl.ObjectType.blockRight:
				var selection = self.getSelectedObject();
				if (selection instanceof A3a.vpl.Block && selection.blockTemplate.paramAccessibility) {
					self.selectionType = self.selectionType === A3a.vpl.KbdControl.ObjectType.blockLeft
						? A3a.vpl.KbdControl.ObjectType.blockLeftParam
						: A3a.vpl.KbdControl.ObjectType.blockRightParam;
					self.selectionParamIndex = 0;
				}
				break;
			/* confusing
			case A3a.vpl.KbdControl.ObjectType.libLeft:
			case A3a.vpl.KbdControl.ObjectType.libRight:
				// change parameters of target if there is one (typically the block just added)
				var target = self.getTargetObject();
				if (target instanceof A3a.vpl.Block && target.param && target.param.length > 0) {
					self.selectionType = self.targetType === A3a.vpl.KbdControl.ObjectType.blockLeft
						? A3a.vpl.KbdControl.ObjectType.blockLeftParam
						: A3a.vpl.KbdControl.ObjectType.blockRightParam;
					self.selectionIndex1 = self.targetIndex1;
					self.selectionIndex2 = self.targetIndex2;
					self.selectionParamIndex = 0;
				}
				break;
			*/
			}
			self.app.renderProgramToCanvas();
			return true;
		case " ":
			switch (self.selectionType) {
			case A3a.vpl.KbdControl.ObjectType.blockLeft:
			case A3a.vpl.KbdControl.ObjectType.blockRight:
				self.targetType = self.selectionType;
				self.targetIndex1 = self.selectionIndex1;
				self.targetIndex2 = self.selectionIndex2;
				break;
			case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
			case A3a.vpl.KbdControl.ObjectType.blockRightParam:
				var selectionBlock = self.getBlockOfSelectedParam();
				if (selectionBlock.blockTemplate.paramAccessibility != null) {
					var c = selectionBlock.blockTemplate.paramAccessibility.controls[self.selectionParamIndex];
					if (c.onSelect) {
						c.onSelect(selectionBlock);
					}
				}
				break;
			case A3a.vpl.KbdControl.ObjectType.rule:
				self.targetType = self.selectionType;
				self.targetIndex1 = self.selectionIndex1;
				self.selectionIndex2 = 0;
				break;
			case A3a.vpl.KbdControl.ObjectType.libLeft:
			case A3a.vpl.KbdControl.ObjectType.libRight:
				var selection = self.getSelectedBlockTemplate();
				var target = self.getTargetObject();
				if (target instanceof A3a.vpl.Block &&
					(self.targetType === A3a.vpl.KbdControl.ObjectType.blockLeft
						? selection.type === A3a.vpl.blockType.action
						: selection.type === A3a.vpl.blockType.event || selection.type === A3a.vpl.blockType.state)) {
					// block target on the wrong side: let setBlock choose
					target = target.ruleContainer;
					// set rule as target instead of wrong block
					self.targetType = A3a.vpl.KbdControl.ObjectType.rule;
				}
				if (target instanceof A3a.vpl.Rule) {
					var block = new A3a.vpl.Block(selection, null, null);
					target.setBlock(block, null, function () {
						self.app.program.saveStateBeforeChange();
					});
				} else if (target instanceof A3a.vpl.Block) {
					var block = new A3a.vpl.Block(selection, null, null);
					target.ruleContainer.setBlock(block,
						{
							eventSide: self.targetType === A3a.vpl.KbdControl.ObjectType.blockLeft,
							index: self.targetIndex2
						},
						function () {
							self.app.program.saveStateBeforeChange();
						});
				}
				self.app.program.enforceSingleTrailingEmptyEventHandler();
				break;
			}
			self.app.renderProgramToCanvas();
			return true;
		case "Backspace":
			var selection = self.getSelectedObject();
			switch (self.selectionType) {
			case A3a.vpl.KbdControl.ObjectType.rule:
			case A3a.vpl.KbdControl.ObjectType.blockLeft:
			case A3a.vpl.KbdControl.ObjectType.blockRight:
				if (self.app.commands.canDrop("vpl:trashcan", {data: selection})) {
					self.app.commands.doDrop("vpl:trashcan", {data: selection});
					switch (self.selectionType) {
					case A3a.vpl.KbdControl.ObjectType.rule:
						if (self.selectionIndex1 >= self.app.program.program.length) {
							self.selectionIndex1--;
						}
						break;
					case A3a.vpl.KbdControl.ObjectType.blockLeft:
						if (self.selectionIndex2 > 0 && self.selectionIndex2 + 1 >= numBlocksLeft()) {
							self.selectionIndex2--;
						}
						break;
					case A3a.vpl.KbdControl.ObjectType.blockRight:
						if (self.selectionIndex2 > 0 && self.selectionIndex2 + 1 >= numBlocksRight()) {
							self.selectionIndex2--;
						}
						break;
					}
					self.targetType = A3a.vpl.KbdControl.ObjectType.none;
					self.app.renderProgramToCanvas();
				}
				break;
			}
			return true;
		case "ArrowRight":
			switch (self.selectionType) {
			case A3a.vpl.KbdControl.ObjectType.rule:
				self.selectionType = A3a.vpl.KbdControl.ObjectType.libRight;
				self.selectionIndex1 = 0;
				self.selectionIndex2 = 0;
				break;
			case A3a.vpl.KbdControl.ObjectType.libLeft:
				if (self.selectionIndex2 <
					Math.floor(self.libLeftNum / self.libLeftColLen) - (self.selectionIndex1 < self.libLeftNum % self.libLeftColLen ? 0 : 1)) {
					self.selectionIndex2++;
				} else {
					self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
					self.selectionIndex1 = 0;
				}
				break;
			case A3a.vpl.KbdControl.ObjectType.libRight:
				self.selectionIndex2 = Math.min(self.selectionIndex2 + 1,
					Math.floor(self.libRightNum / self.libRightColLen) - (self.selectionIndex1 < self.libRightNum % self.libRightColLen ? 0 : 1));
				break;
			case A3a.vpl.KbdControl.ObjectType.blockLeft:
				if (self.selectionIndex2 + 1 >= numBlocksLeft()) {
					self.selectionType = A3a.vpl.KbdControl.ObjectType.blockRight;
					self.selectionIndex2 = 0;
				} else {
					self.selectionIndex2++;
				}
				break;
			case A3a.vpl.KbdControl.ObjectType.blockRight:
				if (self.selectionIndex2 < numBlocksRight() - 1) {
					self.selectionIndex2++;
				} else {
					self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
				}
				break;
			case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
			case A3a.vpl.KbdControl.ObjectType.blockRightParam:
				var selectionBlock = self.getBlockOfSelectedParam();
				if (selectionBlock.blockTemplate.paramAccessibility != null) {
					var c = selectionBlock.blockTemplate.paramAccessibility.controls[self.selectionParamIndex];
					if (c.onUp) {
						c.onUp(selectionBlock);
					}
				}
				break;
			}
			self.app.renderProgramToCanvas();
			return true;
		case "ArrowLeft":
			switch (self.selectionType) {
			case A3a.vpl.KbdControl.ObjectType.rule:
				self.selectionType = A3a.vpl.KbdControl.ObjectType.libLeft;
				self.selectionIndex1 = 0;
				self.selectionIndex2 = Math.ceil(self.libLeftNum / self.libLeftColLen) - 1;
				break;
			case A3a.vpl.KbdControl.ObjectType.libLeft:
				self.selectionIndex2 = Math.max(self.selectionIndex2 - 1, 0);
				break;
			case A3a.vpl.KbdControl.ObjectType.libRight:
				if (self.selectionIndex2 > 0) {
					self.selectionIndex2--;
				} else {
					self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
					self.selectionIndex1 = 0;
				}
				break;
			case A3a.vpl.KbdControl.ObjectType.blockLeft:
				if (self.selectionIndex2 > 0) {
					self.selectionIndex2--;
				} else {
					self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
				}
				break;
			case A3a.vpl.KbdControl.ObjectType.blockRight:
				if (self.selectionIndex2 === 0) {
					self.selectionType = A3a.vpl.KbdControl.ObjectType.blockLeft;
					self.selectionIndex2 = numBlocksLeft() - 1;
				} else {
					self.selectionIndex2--;
				}
				break;
			case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
			case A3a.vpl.KbdControl.ObjectType.blockRightParam:
				var selectionBlock = self.getBlockOfSelectedParam();
				if (selectionBlock.blockTemplate.paramAccessibility != null) {
					var c = selectionBlock.blockTemplate.paramAccessibility.controls[self.selectionParamIndex];
					if (c.onDown) {
						c.onDown(selectionBlock);
					}
				}
				break;
			}
			self.app.renderProgramToCanvas();
			return true;
		case "ArrowUp":
			switch (self.selectionType) {
			case A3a.vpl.KbdControl.ObjectType.rule:
				self.selectionIndex1 = Math.max(self.selectionIndex1 - 1, 0);
				if (self.targetType === null || self.targetType === A3a.vpl.KbdControl.ObjectType.rule) {
					self.targetType = A3a.vpl.KbdControl.ObjectType.rule;
					self.targetIndex1 = self.selectionIndex1;
				}
				break;
			case A3a.vpl.KbdControl.ObjectType.blockLeft:
			case A3a.vpl.KbdControl.ObjectType.blockRight:
				self.selectionIndex1 = Math.max(self.selectionIndex1 - 1, 0);
				self.selectionIndex2 = Math.min(self.selectionIndex2,
					(self.selectionType === A3a.vpl.KbdControl.ObjectType.blockLeft ? numBlocksLeft() : numBlocksRight()) - 1);
				break;
			case A3a.vpl.KbdControl.ObjectType.libLeft:
			case A3a.vpl.KbdControl.ObjectType.libRight:
				self.selectionIndex1 = Math.max(self.selectionIndex1 - 1, 0);
				break;
			case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
			case A3a.vpl.KbdControl.ObjectType.blockRightParam:
				var selectionBlock = self.getBlockOfSelectedParam();
				if (selectionBlock.blockTemplate.paramAccessibility != null) {
					var c = selectionBlock.blockTemplate.paramAccessibility.controls[self.selectionParamIndex];
					if (c.onUp) {
						c.onUp(selectionBlock);
					}
				}
				break;
			}
			self.app.renderProgramToCanvas();
			return true;
		case "ArrowDown":
			switch (self.selectionType) {
			case A3a.vpl.KbdControl.ObjectType.rule:
				self.selectionIndex1 = Math.min(self.selectionIndex1 + 1, self.app.program.program.length - 1);
				if (self.targetType === null || self.targetType === A3a.vpl.KbdControl.ObjectType.rule) {
					self.targetType = A3a.vpl.KbdControl.ObjectType.rule;
					self.targetIndex1 = self.selectionIndex1;
				}
				break;
			case A3a.vpl.KbdControl.ObjectType.blockLeft:
			case A3a.vpl.KbdControl.ObjectType.blockRight:
				self.selectionIndex1 = Math.min(self.selectionIndex1 + 1, self.app.program.program.length - 1);
				self.selectionIndex2 = Math.min(self.selectionIndex2,
					(self.selectionType === A3a.vpl.KbdControl.ObjectType.blockLeft ? numBlocksLeft() : numBlocksRight()) - 1);
				break;
			case A3a.vpl.KbdControl.ObjectType.libLeft:
				self.selectionIndex1 = Math.min(self.selectionIndex1 + 1,
					(self.selectionIndex2 < Math.floor(self.libLeftNum / self.libLeftColLen) ? self.libLeftColLen : self.libLeftNum % self.libLeftColLen) - 1);
				break;
			case A3a.vpl.KbdControl.ObjectType.libRight:
				self.selectionIndex1 = Math.min(self.selectionIndex1 + 1,
					(self.selectionIndex2 < Math.floor(self.libRightNum / self.libRightColLen) ? self.libRightColLen : self.libRightNum % self.libRightColLen) - 1);
				break;
			case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
			case A3a.vpl.KbdControl.ObjectType.blockRightParam:
				var selectionBlock = self.getBlockOfSelectedParam();
				if (selectionBlock.blockTemplate.paramAccessibility != null) {
					var c = selectionBlock.blockTemplate.paramAccessibility.controls[self.selectionParamIndex];
					if (c.onDown) {
						c.onDown(selectionBlock);
					}
				}
				break;
			}
			self.app.renderProgramToCanvas();
			return true;
		case "Tab":
			switch (self.selectionType) {
			case A3a.vpl.KbdControl.ObjectType.blockLeftParam:
			case A3a.vpl.KbdControl.ObjectType.blockRightParam:
				var selectionBlock = self.getBlockOfSelectedParam();
				if (selectionBlock.blockTemplate.paramAccessibility != null) {
					var numControls = selectionBlock.blockTemplate.paramAccessibility.controls.length;
					self.selectionParamIndex = (self.selectionParamIndex + (ev.shiftKey ? numControls - 1 : 1)) % numControls;
				}
				break;
			}
			self.app.renderProgramToCanvas();
			return true;
		}
		return false;
	});
};
