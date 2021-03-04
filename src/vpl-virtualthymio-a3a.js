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

Definition of a virtual Thymio with an Aseba VM, a subclass of
A3a.vpl.VirtualThymio which represents a Thymio II in the simulator. Aimed
at programs provided as bytecode, i.e. the output produced by the Aseba or
L2 compilers.

*/

/** A3a-VM-based virtual Thymio class for VPL
	@constructor
	@extends {A3a.vpl.VirtualThymio}
*/
A3a.vpl.VirtualThymioVM = function () {
	A3a.vpl.VirtualThymio.call(this);

	// whether use VM or js base class implementation (for js code)
	this.useVM = true;

	// instantiate emulated Thymio
	this.vthymio = new A3a.Device.VirtualThymio(9999);

	// forward state change notifications from vthymio to this
	var self = this;
	this.vthymio.onStateChanged = function (name) {
		self.stateChangeListener[name] &&
			self.stateChangeListener[name](name, self.vthymio.state[name]);
	};

	// forward variable change notifications from vthymio to this
	this.vthymio.onVarChanged = function (name, index, newValue, oldValue, oldArrayValue) {
		switch (name) {
		case "leds.circle":
			var newArrayValue = oldArrayValue.slice();
			newArrayValue[index] = newValue;
			self.stateChangeListener[name] && self.stateChangeListener[name](name, newArrayValue);
			break;
		case "timer.period":
			self["setTimer"](index, "timer" + index.toString(10), newValue * 0.001, true);
			break;
		}
	};

	// intercept native calls
	this.vthymio.onNativeCall = function (name, device, args) {
		switch (name) {
		case "sound.play":
			// call directly stateChangeListener because there is no real
			// "sound" variable in vm
			self.stateChangeListener["sound"]("sound", {
				"pcm": args[0][0]
			});
			return true;
		}
		return false;
	};

	// get description of Thymio (variables, events, native functions)
	this.asebaNode = new A3a.A3aNode(A3a.thymioDescr);
};
A3a.vpl.VirtualThymioVM.prototype = Object.create(A3a.vpl.VirtualThymio.prototype);
A3a.vpl.VirtualThymioVM.prototype.constructor = A3a.vpl.VirtualThymioVM;

// overrides methods used by sim2d which have an effect on the vm:
// reset, set, get, sendEvent

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymioVM.prototype["reset"] = function (t0) {
	A3a.vpl.VirtualThymio.prototype["reset"].call(this, t0);
	this.vthymio.reset();

	// fixed Thymio timers
	this["setTimer"](20, "prox", 1 / 10, true);
	this["setTimer"](21, "acc", 1 / 16, true);
	this["setTimer"](22, "buttons", 1 / 20, true);
	this["setTimer"](23, "temperature", 1, true);
};

/** Get variable from the Thymio VM
	@param {string} name
	@return {Array.<number>}
*/
A3a.vpl.VirtualThymioVM.prototype.getVMVar = function (name) {
	var varDescr = this.asebaNode.findVariable(name);
	if (varDescr == null) {
		return null;
	}
	var data = this.vthymio.varData;
	return data.slice(varDescr.offset, varDescr.offset + varDescr.size);
};

/** Set variable in the Thymio VM
	@param {string} name
	@param {Array.<number>} val
	@return {void}
*/
A3a.vpl.VirtualThymioVM.prototype.setVMVar = function (name, val) {
	var varDescr = this.asebaNode.findVariable(name);
	if (varDescr == null) {
		throw "Unknown VM variable " + name;
	} else if (val.length !== varDescr.size) {
		throw "Bad size for variable " + name;
	}
	var data = this.vthymio.varData;
	Array.prototype.splice.apply(data, [varDescr.offset, varDescr.size].concat(val));
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymioVM.prototype["set"] = function (name, val) {
	if (this.useVM) {
		// set value to this (call base class method)
		A3a.vpl.VirtualThymio.prototype["set"].call(this, name, val);

		// propagate value to Thymio VM, with type and range conversion
		switch (name) {
		case "button.backward":
		case "button.left":
		case "button.center":
		case "button.forward":
		case "button.right":
			this.setVMVar(name, [val ? 1 : 0]);
			break;
		case "prox.ground.delta":
			this.setVMVar("prox.ground.delta", val.map(function (x) { return 2000 * x; }));
			break;
		case "prox.horizontal":
			this.setVMVar("prox.horizontal", val.map(function (x) { return 4000 * x; }));
			break;
		case "acc":
			this.setVMVar("acc", val.map(function (x) { return 22 * x; }));
			break;
		default:
			throw "Unknown variable " + name;
		}

		this.stateChangeListener[name] && this.stateChangeListener[name](name, val);
	} else {
		A3a.vpl.VirtualThymio.prototype["set"].call(this, name, val);
	}
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymioVM.prototype["get"] = function (name) {
	if (this.useVM) {
		// get value from this.vthymio, with type and range conversion
		/** @type {Array.<number>} */
		var val;
		var varDescr;
		switch (name) {
		case "leds.top":
			return this.getVMVar("leds.top")
				.map(function (x) { return x >= 32 ? 1 : x <= 0 ? 0 : x / 32; });
		case "leds.bottom.left":
			return this.getVMVar("leds.bottom.left")
				.map(function (x) { return x >= 32 ? 1 : x <= 0 ? 0 : x / 32; });
		case "leds.bottom.right":
			return this.getVMVar("leds.bottom.right")
				.map(function (x) { return x >= 32 ? 1 : x <= 0 ? 0 : x / 32; });
		case "leds.circle":
			return this.getVMVar("leds.circle")
				.map(function (x) { return x >= 16 ? 1 : 0; });
		case "motor.left":
			return this.getVMVar("motor.left.target")[0] / 200;	// scalar
		case "motor.right":
			return this.getVMVar("motor.right.target")[0] / 200;	// scalar
		default:
			// base class method
			return A3a.vpl.VirtualThymio.prototype["get"].call(this, name);
		}
	} else {
		return A3a.vpl.VirtualThymio.prototype["get"].call(this, name);
	}
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymioVM.prototype["sendEvent"] = function (name, val) {
	if (this.useVM) {
		if (val != null) {
			throw "Event arguments not implemented";
		}
		var eventId = this.asebaNode.eventNameToId(name);
		this.vthymio.setupEvent(eventId);
		this.runVM();
	} else {
		A3a.vpl.VirtualThymio.prototype["sendEvent"].call(this, name, val);
	}
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymioVM.prototype["loadCode"] = function (language, src) {
	if (language === "js") {
		// base class
		A3a.vpl.VirtualThymio.prototype["loadCode"].call(this, language, src);
		this.useVM = false;
	} else {
		var bytecode;
 		if (language === "asm") {
			var c = new A3a.Assembler(this.asebaNode, src);
			bytecode = c.assemble();
		} else {
			// detect syntax (A3a or L2) automatically
			var l2 = A3a.Compiler.L2.isL2(src);

			// compile code
			var c = l2
				? new A3a.Compiler.L2(this.asebaNode, src)
				: new A3a.Compiler(this.asebaNode, src);
			c.functionLib = l2 ? A3a.A3aNode.stdMacrosL2 : A3a.A3aNode.stdMacros;
			bytecode = c.compile();
		}

		// load it on virtual Thymio
		this.vthymio.setBytecode(bytecode);

		// reset vm and send init event
		this.vthymio.reset();

		// run init event
		this.runVM();

		this.useVM = true;
	}
};

/** @const */
A3a.vpl.VirtualThymioVM.maxSteps = 2000;

/** Run VM until stop with a limit of A3a.vpl.VirtualThymioVM.maxSteps steps
	@return {void}
*/
A3a.vpl.VirtualThymioVM.prototype.runVM = function () {
	// ignore flagStepByStep
	for (var stepCounter = 0;
		stepCounter < A3a.vpl.VirtualThymioVM.maxSteps && this.vthymio.flagEventActive;
		stepCounter++) {
		this.vthymio.step();
	}
};
