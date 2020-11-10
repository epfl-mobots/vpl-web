/*
	Copyright 2018-2020 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Class which implements a collection of commands, identified by
string ids, with properties such as enabled/disabled or selected/unselected.
Buttons defined in the user interface are linked to command ids.

*/

/** Collection of commands
	@constructor
	@param {function(Object):void=} logger
*/
A3a.vpl.Commands = function (logger) {
	/** @type {Array.<A3a.vpl.Commands.Command>} */
	this.commands = [];
	this.logger = logger || null;
};

A3a.vpl.Commands.prototype.clear = function () {
	this.commands = [];
};

/** Add a command definition
	@param {string} name
	@param {A3a.vpl.Commands.CommandProperties} opt
	@return {void}
*/
A3a.vpl.Commands.prototype.add = function (name, opt) {
	var cmd = new A3a.vpl.Commands.Command(name, opt);
	this.commands.push(cmd);
};

/** @typedef {function(Object): boolean}
*/
A3a.vpl.Commands.isEnabled;

/** @typedef {function(Object): boolean}
*/
A3a.vpl.Commands.isSelected;

/** @typedef {function(Object): string}
*/
A3a.vpl.Commands.getState;

/** @typedef {function(Object, (boolean | undefined)): void}
*/
A3a.vpl.Commands.action;

/** @typedef {function(Object, Object):void}
*/
A3a.vpl.Commands.doDrop;

/** @typedef {function(Object, Object):boolean}
*/
A3a.vpl.Commands.canDrop;

/** @typedef {function(Object):boolean}
*/
A3a.vpl.Commands.isAvailable;

/** @typedef {{
		isEnabled: (?A3a.vpl.Commands.isEnabled | undefined),
		isSelected: (?A3a.vpl.Commands.isSelected | undefined),
		getState: (?A3a.vpl.Commands.getState | undefined),
		action: (?A3a.vpl.Commands.action | undefined),
		doDrop: (?A3a.vpl.Commands.doDrop | undefined),
		canDrop: (?A3a.vpl.Commands.canDrop | undefined),
		object: (?Object | undefined),
		keep: (boolean | undefined),
		isAvailable: (?A3a.vpl.Commands.isAvailable | undefined),
		possibleStates: (?Array.<{selected:(?boolean|undefined),state:(?string|undefined)}> | undefined),
		keyShortcut: (?string | undefined)
	}}
*/
A3a.vpl.Commands.CommandProperties;

/** Find a command by name
	@param {string} name
	@return {?A3a.vpl.Commands.Command}
*/
A3a.vpl.Commands.prototype.find = function (name) {
	for (var i = 0; i < this.commands.length; i++) {
		if (this.commands[i].name === name) {
			return this.commands[i];
		}
	}
	return null;
};

/** Find a command by shortcut
	@param {string} key
	@param {Array.<string>=} names list of commands to consider
	@return {?A3a.vpl.Commands.Command}
*/
A3a.vpl.Commands.prototype.findByKeyShortcut = function (key, names) {
	for (var i = 0; i < this.commands.length; i++) {
		if ((!names || names.indexOf(this.commands[i].name) >= 0) &&
		 	this.commands[i].keyShortcut && this.commands[i].keyShortcut === key &&
			this.commands[i].isAvailable()) {
			return this.commands[i];
		}
	}
	return null;
};

/** Check if an action is defined (for execute)
	@param {string} name
	@return {boolean}
*/
A3a.vpl.Commands.prototype.hasAction = function (name) {
	var cmd = this.find(name);
	return cmd != null && cmd.actionFun != null;
};

/** Log the execution of a command
*/
A3a.vpl.Commands.prototype.logExecCommand = function (name) {
	if (this.logger) {
		var cmd = this.find(name);
		var data = {
			"cmd": name
		};
		if (cmd.isSelectedFun) {
			data["selected"] = cmd.isSelected();
		}
		if (cmd.getStateFun) {
			data["state"] = cmd.getState();
		}
		this.logger({
	        "type": "cmd",
	        "data": data
	    });
	}
}

/** Execute a command by name
	@param {string} name
	@param {boolean=} modifier
	@return {void}
*/
A3a.vpl.Commands.prototype.execute = function (name, modifier) {
	var cmd = this.find(name);
	if (cmd) {
		cmd.execute(modifier);
		this.logExecCommand(name);
	}
};

/** If necessary, execute command by name to get the specified selected state
	@param {boolean} selected
	@param {boolean=} modifier
	@return {boolean} true for success
*/
A3a.vpl.Commands.prototype.executeForSelected = function (name, selected, modifier) {
	var cmd = this.find(name);
	if (cmd && cmd.executeForSelected(selected, modifier)) {
		this.logExecCommand(name);
		return true;
	}
	return false;
};

/** If necessary, execute a command by name until the specified state is obtained
	(or 100 iterations aren't enough)
	@param {string} name
	@param {string} state
	@param {boolean=} modifier
	@return {boolean} true for success
*/
A3a.vpl.Commands.prototype.executeForState = function (name, state, modifier) {
	var cmd = this.find(name);
	if (cmd && cmd.executeForState(state, modifier)) {
		this.logExecCommand(name);
		return true;
	}
	return false;
};

/** Do drop for a command specified by name
	@param {string} name
	@param {Object} droppedItem
	@return {void}
*/
A3a.vpl.Commands.prototype.doDrop = function (name, droppedItem) {
	if (this.logger) {
		// log "drop" before executing doDrop in case doDrop logs changes
		this.logger({
	        "type": "drop",
	        "data": {
	            "cmd": name
	        }
	    });
	}
	var cmd = this.find(name);
	cmd && cmd.doDrop(droppedItem);
};

/** Check if an item can be dropped for a command specified by name
	@param {string} name
	@param {Object} droppedItem
	@return {boolean}
*/
A3a.vpl.Commands.prototype.canDrop = function (name, droppedItem) {
	var cmd = this.find(name);
	return cmd != null && cmd.canDrop(droppedItem);
};

/** Check if command is available
	@param {string} name
	@return {boolean}
*/
A3a.vpl.Commands.prototype.isAvailable = function (name) {
	if (window["vplConfig"] && window["vplConfig"]["ignoredCommands"] &&
		window["vplConfig"]["ignoredCommands"].indexOf(name) >= 0) {
			return false;
		}
	var cmd = this.find(name);
	return cmd != null && cmd.isAvailable();
};

/** Check if command is enabled
	@param {string} name
	@return {boolean}
*/
A3a.vpl.Commands.prototype.isEnabled = function (name) {
	var cmd = this.find(name);
	return cmd != null && cmd.isEnabled();
};

/** Check if command is selected
	@param {string} name
	@return {boolean}
*/
A3a.vpl.Commands.prototype.isSelected = function (name) {
	var cmd = this.find(name);
	return cmd != null && cmd.isSelected();
};

/** Get command state (for multi-state buttons)
	@param {string} name
	@return {?string}
*/
A3a.vpl.Commands.prototype.getState = function (name) {
	var cmd = this.find(name);
	return cmd != null ? cmd.getState() : null;
};

/** Command definition
	@constructor
	@param {string} name
	@param {A3a.vpl.Commands.CommandProperties} opt
*/
A3a.vpl.Commands.Command = function (name, opt) {
	this.name = name;
	/** @type {?A3a.vpl.Commands.isEnabled} */
	this.isEnabledFun = opt.isEnabled || null;
	/** @type {?A3a.vpl.Commands.isSelected} */
	this.isSelectedFun = opt.isSelected || null;
	/** @type {?A3a.vpl.Commands.getState} */
	this.getStateFun = opt.getState || null;
	/** @type {?A3a.vpl.Commands.action} */
	this.actionFun = opt.action || null;
	/** @type {?A3a.vpl.Commands.doDrop} */
	this.doDropFun = opt.doDrop || null;
	/** @type {?A3a.vpl.Commands.canDrop} */
	this.canDropFun = opt.canDrop || null;

	this.obj = opt.object || null;
	this.keep = opt.keep || false;
	/** @type {?A3a.vpl.Commands.isAvailable} */
	this.isAvailableFun = opt.isAvailable || null;

	/** @type {?Array.<{selected:(?boolean|undefined),state:(?string|undefined)}>} */
	this.possibleStates = opt.possibleStates || null;

	/** @type {?string} */
	this.keyShortcut = opt.keyShortcut || null;
};

/** Execute command
	@param {boolean=} modifier
	@return {void}
*/
A3a.vpl.Commands.Command.prototype.execute = function (modifier) {
	if (this.isEnabled()) {
		this.actionFun && this.actionFun(this.obj, modifier);
	}
};

/** If necessary, execute command to get the specified selected state
	@param {boolean} selected
	@param {boolean=} modifier
	@return {boolean} true for success
*/
A3a.vpl.Commands.Command.prototype.executeForSelected = function (selected, modifier) {
	if (!this.isSelectedFun) {
		return false;
	} else if (selected === this.isSelected()) {
		return true;
	}

	this.execute(modifier);
	return selected === this.isSelected();
};

/** If necessary, execute command until the specified state is obtained
	(or 100 iterations aren't enough)
	@param {string} state
	@param {boolean=} modifier
	@return {boolean} true for success
*/
A3a.vpl.Commands.Command.prototype.executeForState = function (state, modifier) {
	if (!this.getStateFun) {
		return false;
	}

	var state0 = this.getState();
	if (state === state0) {
		return true;
	}

	for (var i = 0; i < 100; i++) {
		this.execute(modifier);
		var newState = this.getState();
		if (newState === state) {
			return true;
		} else if (newState === state0) {
			return false;
		}
	}
	return false;
};

/** Do drop for a command specified by name
	@param {Object} droppedItem
	@return {void}
*/
A3a.vpl.Commands.Command.prototype.doDrop = function (droppedItem) {
	if (this.canDrop(droppedItem)) {
		this.doDropFun && this.doDropFun(this.obj, droppedItem);
	}
};

/** Check if an item can be dropped for a command specified by name
	@param {Object} droppedItem
	@return {boolean}
*/
A3a.vpl.Commands.Command.prototype.canDrop = function (droppedItem) {
	return this.canDropFun != null && this.canDropFun(this.obj, droppedItem);
};

/** Check if command is enabled
	@return {boolean}
*/
A3a.vpl.Commands.Command.prototype.isEnabled = function () {
	return this.isEnabledFun == null || this.isEnabledFun(this.obj);
};

/** Check if command is enabled
	@return {boolean}
*/
A3a.vpl.Commands.Command.prototype.isSelected = function () {
	return this.isSelectedFun != null && this.isSelectedFun(this.obj);
};

/** Get command state (for multi-state buttons)
	@return {?string}
*/
A3a.vpl.Commands.Command.prototype.getState = function () {
	return this.getStateFun != null ? this.getStateFun(this.obj) : null;
};

/** Check if command is available (if its button should be displayed)
	@return {boolean}
*/
A3a.vpl.Commands.Command.prototype.isAvailable = function () {
	return this.isAvailableFun == null || this.isAvailableFun(this.obj);
};
