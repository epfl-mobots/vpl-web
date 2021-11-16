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

Implementation of A3a.vpl.Rule, a class which contains a VPL3 event
handler (a single rule). An event handler contains an array of event, state
and comment blocks, (the "left" part), and an array of actions and comment
blocks (the "right" part). A VPL program, as represented by an A3a.vpl.Program
object, is basically a collection of A3a.vpl.Rule objects.

*/

/** Event handler (rule with an event and zero or more actions)
	@constructor
	@struct
*/
A3a.vpl.Rule = function () {
	/** @type {Array.<A3a.vpl.Block>} */
	this.events = [];
	/** @type {Array.<A3a.vpl.Block>} */
	this.actions = [];
	/** @type {A3a.vpl.Error} */
	this.error = null;

	this.disabled = false;
	this.locked = false;
};

/** Copy this
	@return {A3a.vpl.Rule}
*/
A3a.vpl.Rule.prototype.copy = function () {
	var eh = new A3a.vpl.Rule();
	for (var i = 0; i < this.events.length; i++) {
		eh.setBlock(this.events[i]);
	}
	for (var i = 0; i < this.actions.length; i++) {
		eh.setBlock(this.actions[i]);
	}
	return eh;
};

/** Check if empty (no event, no actions)
	@return {boolean}
*/
A3a.vpl.Rule.prototype.isEmpty = function () {
	return this.events.length === 0 && this.actions.length === 0;
};

/** Toggle between enabled and disabled state
	@return {void}
*/
A3a.vpl.Rule.prototype.toggleDisable = function () {
	this.disabled = !this.disabled;
	if (this.disabled) {
		this.error = null;
	}
};

/** Check if contains at least one block of the specified type
	@param {A3a.vpl.blockType} type
	@return {boolean}
*/
A3a.vpl.Rule.prototype.hasBlockOfType = function (type) {
	for (var i = 0; i < this.events.length; i++) {
		if (this.events[i].blockTemplate.type === type) {
			return true;
		}
	}
	for (var i = 0; i < this.actions.length; i++) {
		if (this.actions[i].blockTemplate.type === type) {
			return true;
		}
	}
	return false;
};

/** Get event block by template name
	@param {string} name
	@return {?A3a.vpl.Block}
*/
A3a.vpl.Rule.prototype.getEventBlockByType = function (name) {
	for (var i = 0; i < this.events.length; i++) {
		if (this.events[i].blockTemplate.name === name) {
			return this.events[i];
		}
	}
	return null;
};

/** Set block (event or action depending on its type)
	@param {A3a.vpl.Block} block
	@param {?A3a.vpl.positionInContainer=} posInRule
	@param {?function():void=} onPrepareChange
	@param {?function():void=} onChanged
	@param {boolean=} noCopy true to use block itself instead of a copy (default: false)
	@return {void}
*/
A3a.vpl.Rule.prototype.setBlock = function (block, posInRule, onPrepareChange, onChanged, noCopy) {
	if (block) {
		// replace
		switch (block.blockTemplate.type) {
		case A3a.vpl.blockType.event:
		case A3a.vpl.blockType.state:
			if (block.ruleContainer === this) {
				// reorder events in the same event handler
				if (posInRule) {
					this.events.splice(block.positionInContainer.index, 1);
					if (noCopy) {
						block.onPrepareChange = onPrepareChange || null;
						block.onChanged = onChanged || null;
					} else {
						block = block.copy(this, posInRule, onPrepareChange || null, onChanged || null);
					}
					this.events.splice(posInRule.index, 0, block);
				}
			} else if (posInRule) {
				if (this.events[posInRule.index] === block) {
					return;	// copy onto itself: ignore, keep parameters
				}
				if (noCopy) {
					block.onPrepareChange = onPrepareChange || null;
					block.onChanged = onChanged || null;
				} else {
					block = block.copy(this, posInRule, onPrepareChange || null, onChanged || null);
				}
				this.events[posInRule.index] = block;
			} else {
				if (noCopy) {
					block.onPrepareChange = onPrepareChange || null;
					block.onChanged = onChanged || null;
				} else {
					block = block.copy(this, {eventSide: true, index: this.events.length},
						onPrepareChange || null, onChanged || null);
				}
				this.events.push(block);
			}
			break;
		case A3a.vpl.blockType.action:
		case A3a.vpl.blockType.comment:
			if (block.ruleContainer === this) {
				// reorder actions in the same event handler
				if (posInRule) {
					this.removeBlock(/** @type {A3a.vpl.positionInContainer} */(block.positionInContainer));
					if (noCopy) {
						block.onPrepareChange = onPrepareChange || null;
						block.onChanged = onChanged || null;
					} else {
						block = block.copy(this, posInRule, onPrepareChange || null, onChanged || null);
					}
					(posInRule.eventSide ? this.events : this.actions).splice(posInRule.index, 0, block);
				}
			} else if (posInRule) {
				if ((posInRule.eventSide ? this.events : this.actions)[posInRule.index] === block) {
					return;	// copy onto itself: ignore, keep parameters
				}
				if (noCopy) {
					block.onPrepareChange = onPrepareChange || null;
					block.onChanged = onChanged || null;
				} else {
					block = block.copy(this, posInRule, onPrepareChange || null, onChanged || null);
				}
				(posInRule.eventSide ? this.events : this.actions)[posInRule.index] = block;
			} else {
				if (noCopy) {
					block.onPrepareChange = onPrepareChange || null;
					block.onChanged = onChanged || null;
				} else {
					block = block.copy(this, {eventSide: false, index: this.actions.length},
						onPrepareChange || null, onChanged || null);
				}
				this.actions.push(block);
			}
			break;
		}
		this.fixBlockContainerRefs();
	}
};

/** Remove block
	@param {A3a.vpl.positionInContainer} posInRule
	@return {void}
*/
A3a.vpl.Rule.prototype.removeBlock = function (posInRule) {
	if (posInRule.eventSide) {
		if (this.events[posInRule.index]) {
			this.events.splice(posInRule.index, 1);
			this.fixBlockContainerRefs();
		}
	} else {
		if (this.actions[posInRule.index]) {
			this.actions.splice(posInRule.index, 1);
			this.fixBlockContainerRefs();
		}
	}
};

/** For each block in this event handler, set its ruleContainer
	and positionInContainer
	@return {void}
*/
A3a.vpl.Rule.prototype.fixBlockContainerRefs = function () {
	this.events.forEach(function (event, i) {
		event.ruleContainer = this;
		event.positionInContainer = {
			eventSide: true,
			index: i
		};
	}, this);
	this.actions.forEach(function (action, i) {
		action.ruleContainer = this;
		action.positionInContainer = {
			eventSide: false,
			index: i
		};
	}, this);
};

/** Check conflict with another event handler, setting their error if there is
	one
	@param {A3a.vpl.Rule} otherRule
	@return {boolean} true if there is a conflict
*/
A3a.vpl.Rule.prototype.checkConflicts = function (otherRule) {
	/** Compare function for sorting events
		@param {A3a.vpl.Block} a
		@param {A3a.vpl.Block} b
		@return {number}
	*/
	function compareEvents(a, b) {
		if (a.disabled) {
			return b.disabled ? 0 : 1;
		} else if (b.disabled) {
			return -1;
		}
		var at = a.blockTemplate.name;
		var bt = b.blockTemplate.name;
		return at > bt ? 1 : at < bt ? -1 : 0;
	}

	/** Check if parameters of two blocks are equal
		@param {A3a.vpl.Block} block1
		@param {A3a.vpl.Block} block2
		@return {boolean}
	*/
	function areParamEqual(block1, block2) {
		if (block1.param === null && block2.param === null) {
			return true;
		}
		if (block1.param === null || block2.param === null
			|| block1.param.length !== block2.param.length) {
			return false;
		}
		for (var i = 0; i < block1.param.length; i++) {
			if (block1.param[i] !== block2.param[i]) {
				return false;
			}
		}
		return true;
	}

	/** Check if all event blocks in an event handler are disabled
		@param {A3a.vpl.Rule} rule
		@return {boolean}
	*/
	function areEventBlocksDisabled(rule) {
		for (var i = 0; i < rule.events.length; i++) {
			if (!rule.events[i].disabled) {
				return false;
			}
		}
		return true;
	}

	// ok if event handlers are disabled
	if (this.disabled || otherRule.disabled) {
		return false;
	}

	// ok if all event blocks are disabled
	if (areEventBlocksDisabled(this) || areEventBlocksDisabled(otherRule)) {
		return false;
	}

	// ok if events are missing or in different number
	if (this.events.length === 0 ||
		otherRule.events.length !== this.events.length) {
		return false;
	}

	// ok if events are different (sort auxiliary events by block name)
	var eSorted = this.events.slice(0, 1).concat(this.events.slice(1).sort(compareEvents));
	var eOtherSorted = otherRule.events.slice(0, 1).concat(otherRule.events.slice(1).sort(compareEvents));
	for (var i = 0; i < eSorted.length && !eSorted[i].disabled && !eOtherSorted[i].disabled; i++) {
		if (eSorted[i].blockTemplate !== eOtherSorted[i].blockTemplate ||
			!areParamEqual(eSorted[i], eOtherSorted[i])) {
			return false;
		}
	}

	// else error
	if (this.error == null || this.error.isWarning) {
		var err = new A3a.vpl.Error("Rules with same events");
		err.addEventConflictError(otherRule);
		this.error = err;
	}
	if (otherRule.error == null || otherRule.error.isWarning) {
		var err = new A3a.vpl.Error("Rules with same events");
		err.addEventConflictError(this);
		otherRule.error = err;
	}
	return true;
};
