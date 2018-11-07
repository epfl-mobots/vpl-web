/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Event handler (rule with an event and zero or more actions)
	@constructor
	@struct
*/
A3a.vpl.EventHandler = function () {
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
    @return {A3a.vpl.EventHandler}
*/
A3a.vpl.EventHandler.prototype.copy = function () {
    var eh = new A3a.vpl.EventHandler();
    for (var i = 0; i < this.events.length; i++) {
        eh.setBlock(this.events[i], null, null);
    }
    for (var i = 0; i < this.actions.length; i++) {
        eh.setBlock(this.actions[i], null, null);
    }
    return eh;
};

/** Check if empty (no event, no actions)
	@return {boolean}
*/
A3a.vpl.EventHandler.prototype.isEmpty = function () {
	return this.events.length === 0 && this.actions.length === 0;
};

/** Toggle between enabled and disabled state
	@return {void}
*/
A3a.vpl.EventHandler.prototype.toggleDisable = function () {
	this.disabled = !this.disabled;
	if (this.disabled) {
		this.error = null;
	}
};

/** Check if contains at least one block of the specified type
	@param {A3a.vpl.blockType} type
	@return {boolean}
*/
A3a.vpl.EventHandler.prototype.hasBlockOfType = function (type) {
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
A3a.vpl.EventHandler.prototype.getEventBlockByType = function (name) {
	for (var i = 0; i < this.events.length; i++) {
		if (this.events[i].blockTemplate.name === name) {
			return this.events[i];
		}
	}
	return null;
};

/** Set block (event or action depending on its type)
	@param {A3a.vpl.Block} block
	@param {?A3a.vpl.positionInContainer} posInEventHandler
	@param {?function():void} onPrepareChange
	@param {boolean=} noCopy true to use block itself instead of a copy (default: false)
	@return {void}
*/
A3a.vpl.EventHandler.prototype.setBlock = function (block, posInEventHandler, onPrepareChange, noCopy) {
	if (block) {
		// replace
		switch (block.blockTemplate.type) {
		case A3a.vpl.blockType.event:
		case A3a.vpl.blockType.state:
			if (block.eventHandlerContainer === this) {
				// reorder events in the same event handler
				if (posInEventHandler) {
					this.events.splice(block.positionInContainer.index, 1);
					if (noCopy) {
						block.onPrepareChange = onPrepareChange;
					} else {
						block = block.copy(this, posInEventHandler, onPrepareChange);
					}
					this.events.splice(posInEventHandler.index, 0, block);
				}
			} else if (posInEventHandler) {
				if (this.events[posInEventHandler.index] === block) {
					return;	// copy onto itself: ignore, keep parameters
				}
				if (noCopy) {
					block.onPrepareChange = onPrepareChange;
				} else {
					block = block.copy(this, posInEventHandler, onPrepareChange);
				}
				this.events[posInEventHandler.index] = block;
			} else {
				if (noCopy) {
					block.onPrepareChange = onPrepareChange;
				} else {
					block = block.copy(this, {eventSide: true, index: this.events.length}, onPrepareChange);
				}
				this.events.push(block);
			}
			break;
		case A3a.vpl.blockType.action:
		case A3a.vpl.blockType.comment:
			if (block.eventHandlerContainer === this) {
				// reorder actions in the same event handler
				if (posInEventHandler) {
					this.removeBlock(/** @type {A3a.vpl.positionInContainer} */(block.positionInContainer));
					if (noCopy) {
						block.onPrepareChange = onPrepareChange;
					} else {
						block = block.copy(this, posInEventHandler, onPrepareChange);
					}
					(posInEventHandler.eventSide ? this.events : this.actions).splice(posInEventHandler.index, 0, block);
				}
			} else if (posInEventHandler) {
				if ((posInEventHandler.eventSide ? this.events : this.actions)[posInEventHandler.index] === block) {
					return;	// copy onto itself: ignore, keep parameters
				}
				if (noCopy) {
					block.onPrepareChange = onPrepareChange;
				} else {
					block = block.copy(this, posInEventHandler, onPrepareChange);
				}
				(posInEventHandler.eventSide ? this.events : this.actions)[posInEventHandler.index] = block;
			} else {
				if (noCopy) {
					block.onPrepareChange = onPrepareChange;
				} else {
					block = block.copy(this, {eventSide: false, index: this.actions.length}, onPrepareChange);
				}
				this.actions.push(block);
			}
			break;
		}
		this.fixBlockContainerRefs();
	}
};

/** Remove block
	@param {A3a.vpl.positionInContainer} posInEventHandler
	@return {void}
*/
A3a.vpl.EventHandler.prototype.removeBlock = function (posInEventHandler) {
	if (posInEventHandler.eventSide) {
		if (this.events[posInEventHandler.index]) {
			this.events.splice(posInEventHandler.index, 1);
		}
	} else {
		if (this.actions[posInEventHandler.index]) {
			this.actions.splice(posInEventHandler.index, 1);
		}
	}
};

/** For each block in this event handler, set its eventHandlerContainer
	and positionInContainer
	@return {void}
*/
A3a.vpl.EventHandler.prototype.fixBlockContainerRefs = function () {
	this.events.forEach(function (event, i) {
		event.eventHandlerContainer = this;
		event.positionInContainer = {
			eventSide: true,
			index: i
		};
	}, this);
	this.actions.forEach(function (action, i) {
		action.eventHandlerContainer = this;
		action.positionInContainer = {
			eventSide: false,
			index: i
		};
	}, this);
};

/** Generate code
	@param {string=} andOp operator for "and" (default: "and")
	@return {A3a.vpl.compiledCode}
*/
A3a.vpl.EventHandler.prototype.generateCode = function (andOp) {
	if (this.disabled || this.isEmpty()) {
		return {};
	}

	// check errors
	this.error = null;
	var hasEvent = false;
	for (var i = 0; i < this.events.length; i++) {
		if (!this.events[i].disabled &&
			this.events[i].blockTemplate.type === A3a.vpl.blockType.event) {
			hasEvent = true;
			if (this.events[i].blockTemplate.validate) {
				var err = this.events[i].blockTemplate.validate(this.events[i]);
				if (err) {
					err.addEventError([i]);
					if (!err.isWarning || !this.error) {
						this.error = err;
					}
					if (!err.isWarning) {
						return {error: err};
					}
				}
			}
		}
	}
	var hasAction = false;
	for (var i = 0; i < this.actions.length; i++) {
		if (!this.actions[i].disabled &&
			this.actions[i].blockTemplate.type === A3a.vpl.blockType.action) {
			hasAction = true;
			break;
		}
	}
	if (!hasEvent && !hasAction) {
		return {};
	}
	if (!hasEvent) {
		var err = new A3a.vpl.Error("Missing event block");
		err.addEventError([]);
		this.error = err;
		return {error: err};
	}
	if (!hasAction) {
		var err = new A3a.vpl.Error("Missing action block");
		err.addActionError(0);
		this.error = err;
		return {error: err};
	} else {
		for (var i = 0; i < this.actions.length; i++) {
			for (var j = i + 1; j < this.actions.length; j++) {
				if (this.actions[j].blockTemplate.type === A3a.vpl.blockType.action &&
					this.actions[j].blockTemplate === this.actions[i].blockTemplate) {
					var err = new A3a.vpl.Error("Duplicate action blocks", true);
					err.addActionError(i);
					err.addActionError(j);
					this.error = err;
					return {error: err};
				}
			}
		}
	}

	// find the event with the highest sectionPriority, check compatibility
	// and collect init code
	var priIx = -1;
	var priEv = null;
	var priPri = -1;
	/** @typedef {Array.<number>} */
	var clauseless = [];
	/** @typedef {Array.<string>} */
	var initVarDecl = [];
	/** @typedef {Array.<string>} */
	var initCodeExec = [];
	/** @typedef {Array.<string>} */
	var initCodeDecl = [];
	/** @type {Array.<string>} */
	var clauses = [];
	var clauseInit = "";
	this.events.forEach(function (event, i) {
		var code = event.generateCode();
		if (code.sectionPriority > priPri) {
			priPri = code.sectionPriority;
			priIx = i;
			priEv = event;
		}
		if (code.clause) {
			clauses.push(code.clause);
			if (code.clauseInit) {
				clauseInit += code.clauseInit;
			}
		} else if (code.sectionBegin) {
			clauseless.push(i);
		}
		if (code.initVarDecl) {
			initVarDecl = initVarDecl.concat(code.initVarDecl);
		}
		if (code.initCodeExec) {
			initCodeExec = initCodeExec.concat(code.initCodeExec);
		}
		if (code.initCodeDecl) {
			initCodeDecl = initCodeDecl.concat(code.initCodeDecl);
		}
	});
	if (clauseless.length > 1) {
		var err = new A3a.vpl.Error("Incompatible events in the same rule");
		err.addEventError(clauseless);
		this.error = err;
		return {error: err};
	}

	var clause = clauses.length === 0 ? ""
		: clauses.length === 1 ? clauses[0]
		: clauses.map(function (c) { return "(" + c + ")"; }).join(" " + (andOp || "and") + " ");
	var str = "";
	for (var i = 0; i < this.actions.length; i++) {
		var code = this.actions[i].generateCode();
		str += code.statement || "";
		if (code.initVarDecl) {
			code.initVarDecl.forEach(function (frag) {
				if (initVarDecl.indexOf(frag) < 0) {
					initVarDecl.push(frag);
				}
			});
		}
		if (code.initCodeExec) {
			code.initCodeExec.forEach(function (frag) {
				if (initCodeExec.indexOf(frag) < 0) {
					initCodeExec.push(frag);
				}
			});
		}
		if (code.initCodeDecl) {
			code.initCodeDecl.forEach(function (frag) {
				if (initCodeDecl.indexOf(frag) < 0) {
					initCodeDecl.push(frag);
				}
			});
		}
	}
	if (priEv && str.length > 0) {
		var eventCode = priEv.generateCode();
		return {
			initVarDecl: initVarDecl,
			initCodeExec: initCodeExec,
			initCodeDecl: initCodeDecl,
			sectionBegin: eventCode.sectionBegin,
			sectionEnd: eventCode.sectionEnd,
			clauseInit: clauseInit,
			clause: clause,
			statement: (eventCode.statement || "") + str
		};
	} else {
		return {};
	}
};

/** Check conflict with another event handler, setting their error if there is
    one
    @return {boolean} true if there is a conflict
*/
A3a.vpl.EventHandler.prototype.checkConflicts = function (otherEventHandler) {
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

    // ok if event handlers are disabled
    if (this.disabled || otherEventHandler.disabled) {
        return false;
    }

    // ok if events are missing or in different number
    if (this.events.length === 0 ||
        otherEventHandler.events.length !== this.events.length) {
        return false;
    }
    // ok if events are different
    var eSorted = this.events.slice().sort(compareEvents);
    var eOtherSorted = otherEventHandler.events.slice().sort(compareEvents);
    for (var i = 0; i < eSorted.length && !eSorted[i].disabled && !eOtherSorted[i].disabled; i++) {
        if (eSorted[i].blockTemplate !== eOtherSorted[i].blockTemplate ||
            !areParamEqual(eSorted[i], eOtherSorted[i])) {
            return false;
        }
    }

    // else error
    var err = new A3a.vpl.Error("Duplicate event");
    err.addEventConflictError(otherEventHandler);
    this.error = this.error || err;
    err = new A3a.vpl.Error("Duplicate event");
    err.addEventConflictError(this);
    otherEventHandler.error = otherEventHandler.error || err;
    return true;
};
