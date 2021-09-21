/*
	Copyright 2020-2021 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
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
	toolbarTop: "tb1",
	toolbarBottom: "tb2",
	blockLeft: "bl",
	blockRight: "br",
	blockLeftParam: "blp",
	blockRightParam: "brp",
	rule: "r",
	libLeft: "ll",
	libRight: "lr"
};

/** Reset kbd control
	@return {void}
*/
A3a.vpl.KbdControl.prototype.reset = function () {
	this.selectionType = A3a.vpl.KbdControl.ObjectType.none;
	this.targetType = A3a.vpl.KbdControl.ObjectType.none;
};

/** Exit kbd control (render if needed)
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

/** Count the number of items in a toolbar
	@param {boolean} bottom true for bottom, false for top
	@return {number}
*/
A3a.vpl.KbdControl.prototype.toolbarItemCount = function (bottom) {
	var config = bottom ? this.app.vplToolbar2Config : this.app.vplToolbarConfig;
	if (config) {
		var n = 0;
		for (var i = 0; i < config.length; i++) {
			if (config[i] && config[i][0] !== "!" && this.app.isButtonAvailable(config[i])) {
				// check that the control has actionFun or doDropFun
				var cmd = this.app.commands.find(config[i]);
				if (cmd.actionFun || cmd.doDropFun) {
					n++;
				}
			}
		}
		return n;
	} else {
		return 0;
	}
};

/** Get command for selected toolbar item
	@return {A3a.vpl.Commands.Command}
*/
A3a.vpl.KbdControl.prototype.getSelectedCmd = function () {
	var config;
	switch (this.selectionType) {
	case A3a.vpl.KbdControl.ObjectType.toolbarTop:
		config = this.app.vplToolbarConfig;
		break;
	case A3a.vpl.KbdControl.ObjectType.toolbarBottom:
		config = this.app.vplToolbar2Config;
		break;
	default:
		return null;
	}
	var n = this.selectionIndex1;
	for (var i = 0; i < config.length; i++) {
		if (config[i] && config[i][0] !== "!" && this.app.isButtonAvailable(config[i])) {
			var cmd = this.app.commands.find(config[i]);
			if (cmd.actionFun || cmd.doDropFun) {
				if (n === 0) {
					return cmd;
				}
				n--;
			}
		}
	}
	return null;
};

/** Activate a template to replace or insert in current target
	@param {A3a.vpl.BlockTemplate} blockTemplate
	@return {void}
*/
A3a.vpl.KbdControl.prototype.activateTemplate = function (blockTemplate) {
	var target = this.getTargetObject();
	var app = this.app;
	if (target instanceof A3a.vpl.Block &&
		(this.targetType === A3a.vpl.KbdControl.ObjectType.blockLeft
			? blockTemplate.type === A3a.vpl.blockType.action
			: blockTemplate.type === A3a.vpl.blockType.event || blockTemplate.type === A3a.vpl.blockType.state)) {
		// block target on the wrong side: let setBlock choose
		target = target.ruleContainer;
		// set rule as target instead of wrong block
		this.targetType = A3a.vpl.KbdControl.ObjectType.rule;
	}
	if (target instanceof A3a.vpl.Rule && !(target instanceof A3a.vpl.RuleComment)) {
		var block = new A3a.vpl.Block(blockTemplate, null, null);
		target.setBlock(block, null,
			function () {
				app.program.saveStateBeforeChange();
			},
			function () {
				app.program.saveStateAfterChange();
			});
	} else if (target instanceof A3a.vpl.Block) {
		var block = new A3a.vpl.Block(blockTemplate, null, null);
		target.ruleContainer.setBlock(block,
			{
				eventSide: this.targetType === A3a.vpl.KbdControl.ObjectType.blockLeft,
				index: this.targetIndex2
			},
			function () {
				app.program.saveStateBeforeChange();
			},
			function () {
				app.program.saveStateAfterChange();
			});
	}
	app.program.enforceSingleTrailingEmptyEventHandler();
};

/** Execute a command (action or drop with target element)
	@param {A3a.vpl.Commands.Command} cmd
	@return {void}
*/
A3a.vpl.KbdControl.prototype.executeCommand = function (cmd) {
	if (cmd.actionFun) {
		cmd.actionFun(this.app, false);
	} else {
		var targetObject = this.getTargetObject();
		if (targetObject && cmd.canDropFun ? cmd.canDropFun(this.app, {data: targetObject}) : cmd.doDropFun) {
			cmd.doDropFun(this.app, {data: targetObject});
		}
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
		function setHint() {
			var selectedObject = self.getSelectedObject() || self.getSelectedBlockTemplate();
			if (selectedObject instanceof A3a.vpl.Block) {
				self.app.vplHint = selectedObject.blockTemplate.name;
			} else if (selectedObject instanceof A3a.vpl.BlockTemplate) {
				self.app.vplHint = selectedObject.name;
			} else {
				self.app.vplHint = null;
			}
		}

		// no kbd control in customization mode
		if (self.app.uiConfig.blockCustomizationMode) {
			return false;
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
			setHint();
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
				var selection = self.getSelectedObject();
				if (selection instanceof A3a.vpl.RuleComment) {
					// comment: edit
					self.app.editComment(self.selectionIndex1);
				} else {
					// plain rule: select left-most block
					self.selectionType = A3a.vpl.KbdControl.ObjectType.blockLeft;
					self.selectionIndex2 = 0;
				}
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
			case A3a.vpl.KbdControl.ObjectType.toolbarTop:
			case A3a.vpl.KbdControl.ObjectType.toolbarBottom:
				var cmd = self.getSelectedCmd();
				if (cmd != null) {
					self.executeCommand(cmd);
				}
				break;
			}
			setHint();
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
				self.activateTemplate(selection);
				break;
			}
			setHint();
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
					setHint();
					self.app.renderProgramToCanvas();
				}
				break;
			}
			return true;
		case "ArrowRight":
			switch (self.selectionType) {
			case A3a.vpl.KbdControl.ObjectType.rule:
				if (self.targetType === null || self.targetType === A3a.vpl.KbdControl.ObjectType.rule) {
					// auto-target
					self.targetType = A3a.vpl.KbdControl.ObjectType.rule;
					self.targetIndex1 = self.selectionIndex1;
				}
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
			case A3a.vpl.KbdControl.ObjectType.toolbarTop:
				self.selectionIndex1 = Math.min(self.selectionIndex1 + 1, self.toolbarItemCount(false) - 1);
				break;
			case A3a.vpl.KbdControl.ObjectType.toolbarBottom:
				self.selectionIndex1 = Math.min(self.selectionIndex1 + 1, self.toolbarItemCount(true) - 1);
				break;
			}
			setHint();
			self.app.renderProgramToCanvas();
			return true;
		case "ArrowLeft":
			switch (self.selectionType) {
			case A3a.vpl.KbdControl.ObjectType.rule:
				if (self.targetType === null || self.targetType === A3a.vpl.KbdControl.ObjectType.rule) {
					// auto-target
					self.targetType = A3a.vpl.KbdControl.ObjectType.rule;
					self.targetIndex1 = self.selectionIndex1;
				}
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
			case A3a.vpl.KbdControl.ObjectType.toolbarTop:
				self.selectionIndex1 = Math.max(self.selectionIndex1 - 1, 0);
				break;
			case A3a.vpl.KbdControl.ObjectType.toolbarBottom:
				self.selectionIndex1 = Math.max(self.selectionIndex1 - 1, 0);
				break;
			}
			setHint();
			self.app.renderProgramToCanvas();
			return true;
		case "ArrowUp":
			switch (self.selectionType) {
			case A3a.vpl.KbdControl.ObjectType.rule:
				if (self.selectionIndex1 === 0) {
					// first rule: go to top toolbar
					if (self.toolbarItemCount(false) > 0) {
						self.selectionType = A3a.vpl.KbdControl.ObjectType.toolbarTop;
						self.selectionIndex1 = 0;
					}
				} else {
					self.selectionIndex1 = Math.max(self.selectionIndex1 - 1, 0);
				}
				break;
			case A3a.vpl.KbdControl.ObjectType.blockLeft:
			case A3a.vpl.KbdControl.ObjectType.blockRight:
				if (self.selectionIndex1 === 0) {
					// block in first rule: go to top toolbar
					if (self.toolbarItemCount(false) > 0) {
						self.selectionType = A3a.vpl.KbdControl.ObjectType.toolbarTop;
						self.selectionIndex1 = 0;
					}
				} else {
					self.selectionIndex1 = Math.max(self.selectionIndex1 - 1, 0);
					self.selectionIndex2 = Math.min(self.selectionIndex2,
						(self.selectionType === A3a.vpl.KbdControl.ObjectType.blockLeft ? numBlocksLeft() : numBlocksRight()) - 1);
				}
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
			case A3a.vpl.KbdControl.ObjectType.toolbarBottom:
				self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
				self.selectionIndex1 = Math.max(self.app.program.program.length - 1, 0);
				break;
			}
			setHint();
			self.app.renderProgramToCanvas();
			return true;
		case "ArrowDown":
			switch (self.selectionType) {
			case A3a.vpl.KbdControl.ObjectType.rule:
				if (self.selectionIndex1 >= self.app.program.program.length - 1) {
					// last rule: go to bottom toolbar
					if (self.toolbarItemCount(true) > 0) {
						self.selectionType = A3a.vpl.KbdControl.ObjectType.toolbarBottom;
						self.selectionIndex1 = 0;
					}
				} else {
					self.selectionIndex1 = Math.min(self.selectionIndex1 + 1, self.app.program.program.length - 1);
				}
				break;
			case A3a.vpl.KbdControl.ObjectType.blockLeft:
			case A3a.vpl.KbdControl.ObjectType.blockRight:
				if (self.selectionIndex1 >= self.app.program.program.length - 1) {
					// block last rule: go to bottom toolbar
					if (self.toolbarItemCount(true) > 0) {
						self.selectionType = A3a.vpl.KbdControl.ObjectType.toolbarBottom;
						self.selectionIndex1 = 0;
					}
				} else {
					self.selectionIndex1 = Math.min(self.selectionIndex1 + 1, self.app.program.program.length - 1);
				 	if (self.app.program.program[self.selectionIndex1] instanceof A3a.vpl.RuleComment) {
						// enter a comment: select comment itself since it doesn't contain a block
						self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
					} else {
						// select block aligned vertically if possible
						self.selectionIndex2 = Math.min(self.selectionIndex2,
							(self.selectionType === A3a.vpl.KbdControl.ObjectType.blockLeft ? numBlocksLeft() : numBlocksRight()) - 1);
					}
				}
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
			case A3a.vpl.KbdControl.ObjectType.toolbarTop:
				self.selectionType = A3a.vpl.KbdControl.ObjectType.rule;
				self.selectionIndex1 = 0;
				break;
			}
			setHint();
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
			setHint();
			self.app.renderProgramToCanvas();
			return true;
		}
		return false;
	});
};

/** Handle a plain mouse click, assuming no drag is possible
	@param {number} x
	@param {number} y
	@return {void}
*/
A3a.vpl.KbdControl.prototype.clickOnParamControl = function (x, y) {

	/** Check if mouse is over half of control for onUp
		@param {A3a.vpl.BlockParamAccessibility.Control} c
	*/
	function inUpperPart(c) {
		return c.bottom - c.top > c.right - c.left	// vertical
			? y < (c.top + c.bottom) / 2
			: x > (c.left + c.right) / 2;
	}

	var target = this.getTargetObject();
	if (target instanceof A3a.vpl.Block) {
		var p = /** @type {A3a.vpl.Block} */(target).blockTemplate.paramAccessibility;
		if (p != undefined) {
			for (var i = 0; i < p.controls.length; i++) {
				var c = p.controls[i];
				if (x >= c.left && x <= c.right && y >= c.top && y <= c.bottom) {
					if (c.onClick) {
						c.onClick(/** @type {A3a.vpl.Block} */(target),
							(x - c.left) / (c.right - c.left),
							(y - c.top) / (c.bottom - c.top));
					} else if (c.onSelect) {
						c.onSelect(/** @type {A3a.vpl.Block} */(target));
					} else if (c.onDown && !inUpperPart(c)) {
						c.onDown(/** @type {A3a.vpl.Block} */(target));
					} else if (c.onUp && inUpperPart(c)) {
						c.onUp(/** @type {A3a.vpl.Block} */(target));
					}
					break;
				}
			}
		}
	}
};
