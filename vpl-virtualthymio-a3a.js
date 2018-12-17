/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** A3a-VM-based virtual Thymio class for VPL
	@constructor
	@extends {A3a.vpl.VirtualThymio}
*/
A3a.vpl.VirtualThymioVM = function () {
	A3a.vpl.VirtualThymio.call(this);

	// instantiate emulated Thymio
	this.vthymio = new A3a.Device.VirtualThymio(9999);

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
		this.setVMVar("prox.horizontal", val.map(function (x) { return 2000 * x; }));
		break;
	case "acc":
		this.setVMVar("acc", val.map(function (x) { return 22 * x; }));
		break;
	default:
		throw "Unknown variable " + name;
	}

	this.stateChangeListener[name] && this.stateChangeListener[name](name, val);
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymioVM.prototype["get"] = function (name) {
	// get value from this.vthymio, with type and range conversion
	/** @type {Array.<number>} */
	var val;
	var varDescr;
	switch (name) {
	case "leds.top":
		return (this.vthymio.state && this.vthymio.state.ledsTop || [0, 0, 0])
			.map(function (x) { return x >= 32 ? 1 : x <= 0 ? 0 : x / 32; });
	case "leds.bottom.left":
		return (this.vthymio.state && this.vthymio.state.ledsBottomLeft || [0, 0, 0])
			.map(function (x) { return x >= 32 ? 1 : x <= 0 ? 0 : x / 32; });
	case "leds.bottom.right":
		return (this.vthymio.state && this.vthymio.state.ledsBottomRight || [0, 0, 0])
			.map(function (x) { return x >= 32 ? 1 : x <= 0 ? 0 : x / 32; });
	case "leds.circle":
		return (this.vthymio.state && this.vthymio.state.ledsCircle || [0, 0, 0, 0, 0, 0, 0, 0])
			.map(function (x) { return x >= 16 ? 1 : 0; });
	case "motor.left":
		return this.getVMVar("motor.left.target")
			.map(function (x) { return x / 200; });
	case "motor.right":
		return this.getVMVar("motor.right.target")
			.map(function (x) { return x / 200; });
	default:
		// base class method
		return A3a.vpl.VirtualThymio.prototype["get"].call(this, name);
	}
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymioVM.prototype["sendEvent"] = function (name, val) {
	if (val != null) {
		throw "Event arguments not implemented";
	}
	var eventId = this.asebaNode.eventNameToId(name);
	this.vthymio.setupEvent(eventId);
	this.runVM();
};

/**
	@inheritDoc
*/
A3a.vpl.VirtualThymioVM.prototype["loadCode"] = function (src) {
	// detect syntax (A3a or L2) automatically
	var l2 = A3a.Compiler.L2.isL2(src);

	// compile code
	var c = l2
		? new A3a.Compiler.L2(this.asebaNode, src)
		: new A3a.Compiler(this.asebaNode, src);
	c.functionLib = l2 ? A3a.A3aNode.stdMacrosL2 : A3a.A3aNode.stdMacros;
	var bytecode = c.compile();

	// load it on virtual Thymio
	this.vthymio.setBytecode(bytecode);

	// reset vm and send init event
	this.vthymio.reset();

	// run init event
	this.runVM();
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