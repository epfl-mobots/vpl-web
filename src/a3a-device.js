/*
	Copyright 2018-2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Implementation of A3a.Device, a class which implements device with an Aseba VM.
Can be subclassed to simulate Aseba-based robots such as the Thymio II.

*/

/** A3a device with its VM
	@constructor
	@param {{
		nodeId: (number | undefined),
		variables: (Array.<A3a.Device.Variable> | undefined),
		localEvents: (Array.<A3a.Device.LocalEvent> | undefined),
		nativeFunctions: (Array.<A3a.Device.NativeFunction> | undefined),
		bytecodeSize: (number | undefined),
		stackSize: (number | undefined),
		variableSize: (number | undefined)
	}} opt
 */
A3a.Device = function (opt) {
	this.nodeId = opt && opt.nodeId || 54321;
	this.variables = opt && opt.variables || [];
	this.localEvents = opt && opt.localEvents || [];
	this.nativeFunctions = opt && opt.nativeFunctions || [];
	this.bytecodeSize = opt && opt.bytecodeSize || 500;
	this.stackSize = opt && opt.stackSize || 200;
	this.variableSize = opt && opt.variableSize || 200;

	this.varData = this.variableData();
	/** @type {Array.<number>} */
	this.bytecode = [];
	this.pc = 0;
	this.flagEventActive = false;
	this.flagStepByStep = true;	// paused
	this.flagEventRunning = false;
	/** @type {Array.<number>} */
	this.stack = [];
	/** @type {Array.<boolean>} */
	this.breakpoints = [];
	/** @type {?function(number,Array.<number>):void} */
	this.onEmit = null;
	/**
		@type {?function(string,number,number,number,Array.<number>):void}
		Called with variable name, index in array, new value, old value, old array value for the whole array variable
	*/
	this.onVarChanged = null;
	/**
		@type {?function(string,A3a.Device,Array.<Array.<number>>):boolean}
		Called with native function name, device, and arguments; should
		return true to skip original implementation in A3a.Device, else false
	*/
	this.onNativeCall = null;
	/** @type {?function(ArrayBuffer):void} */
	this.write = null;
};

/** @typedef {{
		name: string,
		val: Array.<number>
	}}
*/
A3a.Device.Variable;

/** @typedef {{
		name: string,
		description: string
	}}
*/
A3a.Device.LocalEvent;

/** @typedef {{
		name: string,
		params: Array.<{name:string,size:number}>,
		fun: (function(Array.<A3a.Device,Array.<number>>):void|undefined)
	}}
*/
A3a.Device.NativeFunction;

/** Make a copy with separate variables, bytecode and stack
	@return {A3a.Device}
*/
A3a.Device.prototype.copy = function () {
	var copy = new A3a.Device({
		nodeId: this.nodeId,
		variables: this.variables,
		localEvents: this.localEvents,
		nativeFunctions: this.nativeFunctions,
		bytecodeSize: this.bytecodeSize,
		stackSize: this.stackSize,
		variableSize: this.variableSize
	});
	copy.bytecodeSize = this.bytecodeSize;
	copy.stackSize = this.stackSize;
	copy.variableSize = this.variableSize;
	copy.bytecode = this.bytecode.slice();
	copy.pc = this.pc;
	copy.flagEventActive = this.flagEventActive;
	copy.flagStepByStep = this.flagStepByStep;
	copy.flagEventRunning = this.flagEventRunning;
	copy.stack = this.stack.slice();
	copy.breakpoints = this.breakpoints.slice();
	return copy;
 };

/** @enum {number} */
A3a.Device.flags = {
	eventActive: 1,
	stepByStep: 2,
	eventRunning: 4
};

/** Get flags, as transmitted in A3a message executionStateChanged
	@return {number}
*/
A3a.Device.prototype.getFlags = function () {
	return (this.flagEventActive ? A3a.Device.flags.eventActive : 0)
		| (this.flagStepByStep ? A3a.Device.flags.stepByStep : 0)
		| (this.flagEventRunning ? A3a.Device.flags.eventRunning : 0);
};

/** Get variables as a single array
	@return {Array.<number>}
*/
A3a.Device.prototype.variableData = function () {
	/** @type {Array.<number>} */
	var data = [];
	var offset = 0;
	for (var i = 0; i < this.variables.length; i++) {
		this.variables[i].offset = offset;
		data = data.concat(this.variables[i].val);
		offset += this.variables[i].val.length;
	}
	while (data.length < this.variableSize) {
		data.push(0);
	}
	return data;
};

/** Set variables data from an array of contiguous values
	@param {number} varOffset
	@param {Array.<number>} varData
	@return {void}
*/
A3a.Device.prototype.setVariableData = function (varOffset, varData) {
	// call onVarChanged for device variables
	if (this.onVarChanged) {
		for (var i = 0; i < this.variables.length; i++) {
			if (this.variables[i].offset + this.variables[i].val.length > varOffset
				&& this.variables[i].offset < varOffset + varData.length) {
				for (var j = 0; j < this.variables[i].val.length; j++) {
					if (this.variables[i].offset + j - varOffset >= 0
						&& this.variables[i].offset + j - varOffset < varData.length) {
						this.onVarChanged(this.variables[i].name, j,
							varData[this.variables[i].offset + j - varOffset],
							this.varData[this.variables[i].offset + j],
							this.varData.slice(this.variables[i].offset, this.variables[i].offset + this.variables[i].val.length));
					}
				}
			}
		}
	}

	// change this.varData
	varData.forEach(function (val, i) {
		this.varData[varOffset + i] = val;
	}, this);
}

/** @const */
A3a.VM = {};

/** @enum {number} */
A3a.VM.op = {
	stop: 0x0,
	smallImmediate: 0x1,
	largeImmediate: 0x2,
	load: 0x3,
	store: 0x4,
	loadIndirect: 0x5,
	storeIndirect: 0x6,
	unaryOp: 0x7,
	binaryOp: 0x8,
	jump: 0x9,
	conditionalBranch: 0xa,
	emit: 0xb,
	nativeCall: 0xc,
	subCall: 0xd,
	subRet: 0xe,
	reserved: 0xf
};

/** @const */
A3a.VM.eventIdInit = 0xffff;

/** Get the length of an instructions based on its opcode
	@param {number} op opcode (first word of the instruction)
	@return {number} number of words of the instruction (1 or more)
*/
A3a.VM.opLength = function (op) {
	return [1, 1, 2, 1, 1, 2, 2, 1, 1, 1, 2, 3, 1, 1, 1, 1][op >>> 12];
}

/** Set bytecode
	@param {Array.<number>} bc bytecode
	@param {number=} bcOffset offset of bc in VM's bytecode (default: 0)
	@return {void}
*/
A3a.Device.prototype.setBytecode = function (bc, bcOffset) {
	this.bytecode.splice.apply(this.bytecode, [bcOffset || 0, bc.length].concat(bc));
};

/** Reset the flags for the "when" jumps in VM's bytecode
	@return {void}
*/
A3a.Device.prototype.resetWhenFlags = function () {
	if (this.bytecode.length > 0) {
		var pc = this.bytecode[0];
		while (pc < this.bytecode.length) {
			var op = this.bytecode[pc];
			var oph = op >>> 12;
			var opl = op & 0xfff;
			if (oph == A3a.VM.op.conditionalBranch) {
				this.bytecode[pc] &= ~0x200;
			}
			pc += A3a.VM.opLength(op);
		}
	}
};

/** Get the bytecode address corresponding to an event id
	@param {number} eventId
	@return {?number} address, or null if event not found
*/
A3a.Device.prototype.getEventAddress = function (eventId) {
	if (this.bytecode.length > 0) {
		for (var i = 1; i < this.bytecode[0]; i += 2) {
			if (this.bytecode[i] == eventId) {
				return this.bytecode[i + 1];
			}
		}
	}
	return null;
}

/** Set the VM state to start execution of an event
	@param {number} eventId
	@return {void}
*/
A3a.Device.prototype.setupEvent = function (eventId) {
	var eventAddr = this.getEventAddress(eventId);
	if (eventAddr !== null) {
		if (this.flagEventActive) {
			var msg = new A3a.Message(A3a.Message.Id.eventExecutionKilled, this.nodeId, [this.pc]);
			this.write && this.write(msg.serialize());
		}
		this.pc = eventAddr;
		this.flagEventActive = true;
	}
}

/** Reset the state of the VM, keeping the bytecode unchanged
	@return {void}
*/
A3a.Device.prototype.reset = function () {
	this.flagEventActive = false;
	this.flagStepByStep = true;
	this.flagEventRunning = false;
	this.resetWhenFlags();
	this.stack = [];
	for (var i = 0; i < this.varData.length; i++) {
		this.varData[i] = 0;
	}
	if (this.onReset) {
		this.onReset();
	}
	this.setupEvent(A3a.VM.eventIdInit);
};

/** Execute a single step
	@return {void}
*/
A3a.Device.prototype.step = function () {
	var device = this;

	/** Convert unsigned 12-bit word in [0,4095] to signed integer
		@param {number} n 12-bit unsigned word
		@return {number}
	*/
	function toSigned12(n) {
		return n >= 0x800 ? n - 0x1000 : n;
	}

	/** Convert unsigned 16-bit word in [0,65535] to signed integer
		@param {number} n 16-bit unsigned word
		@return {number}
	*/
	function toSigned16(n) {
		return n >= 0x8000 ? n - 0x10000 : n;
	}

	/** Execute unary or binary opcode
		@param {number} op
		@return {void}
	*/
	function execOp(op) {
		var n2;
		switch (op) {
		case 0x7000:	// neg
			device.stack.push(-device.stack.pop());
			break;
		case 0x7001:	// abs
			device.stack.push(Math.abs(device.stack.pop()));
			break;
		case 0x7002:	// bitnot
			device.stack.push(~device.stack.pop());
			break;
	//	case 0x7003:	// not (not implemented in vm)
	//		device.stack.push(device.stack.pop() === 0 ? 1 : 0);
	//		break;
		case 0x8000:	// sl
			n2 = device.stack.pop();
			device.stack.push(toSigned16((device.stack.pop() << n2) & 0xffff));
			break;
		case 0x8001:	// asr
			n2 = device.stack.pop();
			device.stack.push(device.stack.pop() >> n2);
			break;
		case 0x8002:	// add
			device.stack.push(toSigned16((device.stack.pop() + device.stack.pop()) & 0xffff));
			break;
		case 0x8003:	// sub
			n2 = device.stack.pop();
			device.stack.push(toSigned16((device.stack.pop() - n2) & 0xffff));
			break;
		case 0x8004:	// mult
			device.stack.push(toSigned16((device.stack.pop() * device.stack.pop()) & 0xffff));
			break;
		case 0x8005:	// div
			n2 = device.stack.pop();
			device.stack.push(toSigned16(Math.trunc(device.stack.pop() / n2) & 0xffff));
			break;
		case 0x8006:	// mod
			n2 = device.stack.pop();
			device.stack.push(toSigned16((device.stack.pop()  % n2) & 0xffff));
			break;
		case 0x8007:	// bitor
			device.stack.push(toSigned16((device.stack.pop() | device.stack.pop()) & 0xffff));
			break;
		case 0x8008:	// bitxor
			device.stack.push(toSigned16((device.stack.pop() ^ device.stack.pop()) & 0xffff));
			break;
		case 0x8009:	// bitand
			device.stack.push(toSigned16((device.stack.pop() & device.stack.pop()) & 0xffff));
			break;
		case 0x800a:	// eq
			device.stack.push(device.stack.pop() === device.stack.pop() ? 1 : 0);
			break;
		case 0x800b:	// ne
			device.stack.push(device.stack.pop() !== device.stack.pop() ? 1 : 0);
			break;
		case 0x800c:	// gt
			n2 = device.stack.pop();
			device.stack.push(device.stack.pop() > n2 ? 1 : 0);
			break;
		case 0x800d:	// ge
			n2 = device.stack.pop();
			device.stack.push(device.stack.pop() >= n2 ? 1 : 0);
			break;
		case 0x800e:	// lt
			n2 = device.stack.pop();
			device.stack.push(device.stack.pop() < n2 ? 1 : 0);
			break;
		case 0x800f:	// le
			n2 = device.stack.pop();
			device.stack.push(device.stack.pop() <= n2 ? 1 : 0);
			break;
		case 0x8010:	// or
			n2 = device.stack.pop();	// make sure to always pop 2 args
			device.stack.push(device.stack.pop() || n2 ? 1 : 0);
			break;
		case 0x8011:	// and
			n2 = device.stack.pop();	// make sure to always pop 2 args
			device.stack.push(device.stack.pop() && n2 ? 1 : 0);
			break;
		default:
			throw "unknown op 0x" + op.toString(16);
		}
	}

	var op = this.bytecode[this.pc];
	var oph = op >>> 12;
	var opl = op & 0xfff;
	switch (oph) {
	case A3a.VM.op.stop:
		this.flagEventActive = false;
		break;
	case A3a.VM.op.smallImmediate:
		this.stack.push(toSigned12(opl));
		break;
	case A3a.VM.op.largeImmediate:
		this.pc++;
		this.stack.push(toSigned16(this.bytecode[this.pc]));
		break;
	case A3a.VM.op.load:
		this.stack.push(this.varData[opl]);
		break;
	case A3a.VM.op.store:
		this.setVariableData(opl, [this.stack.pop()]);
		break;
	case A3a.VM.op.loadIndirect:
		this.pc++;
		var size = this.bytecode[this.pc];
		var i = this.stack.pop();
		if (i >= size) {
			throw "out of bounds";
		} else {
			this.stack.push(this.varData[opl + i]);
		}
		break;
	case A3a.VM.op.storeIndirect:
		this.pc++;
		var size = this.bytecode[this.pc];
		var i = this.stack.pop();
		if (i >= size) {
			throw "Index out of bounds";
		} else {
			this.setVariableData(opl + i, [this.stack.pop()]);
		}
		break;
	case A3a.VM.op.jump:
		this.pc += toSigned12(opl) - 1;
		break;
	case A3a.VM.op.conditionalBranch:
		var isWhen = op & 0x100;
		execOp((A3a.VM.op.binaryOp << 12) | (op & 0xff));
		var cond = this.stack.pop() != 0;
		this.pc++;
		var relAddr = toSigned16(this.bytecode[this.pc]);
		if (isWhen) {
			// when: skip if lastWhenCond or !cond
			var lastWhenCond = op & 0x200;
			var lastPC = this.pc - 1;
			if (lastWhenCond || !cond) {
				this.pc += relAddr - 2;
			}
			if (cond) {
				this.bytecode[lastPC] |= 0x200;
			} else {
				this.bytecode[lastPC] &= ~0x200;
			}
		} else {
			// if: skip if !cond
			if (!cond) {
				this.pc += relAddr - 2;
			}
		}
		break;
	case A3a.VM.op.emit:
		var addr = this.bytecode[this.pc + 1];
		var size = this.bytecode[this.pc + 2];
		var eventData = this.varData.slice(addr, addr + size);
		this.pc += 2;
		this.onEmit(opl, eventData);
		break;
	case A3a.VM.op.nativeCall:
		if (opl < 0 || opl >= this.nativeFunctions.length) {
			throw "Native call index out of bounds";
		}
		// get arg addresses in this.varData
		var argSpec = this.nativeFunctions[opl].params.map(function (param) {
			return {p: this.stack.pop()};
		}, this);
		// get sizes
		var groupSizes = [];
		this.nativeFunctions[opl].params.forEach(function (param, i) {
			if (param.size === 0) {
				argSpec[i].s = this.stack.pop();
			} else {
				argSpec[i].s = param.size;	// size or negative index
			}
		}, this);
		this.nativeFunctions[opl].params.forEach(function (param, i) {
			if (param.size < 0 && groupSizes[-param.size] === undefined) {
				groupSizes[-param.size] = 0;
			}
		}, this);
		groupSizes = groupSizes.map(function (s) {
			return s !== undefined ? this.stack.pop() : s;
		}, this);
		this.nativeFunctions[opl].params.forEach(function (param, i) {
			if (param.size < 0) {
				argSpec[i].s = groupSizes[-param.size];
			}
		}, this);
		// get arguments
		var args = argSpec.map(function (argSpec) {
			return this.varData.slice(argSpec.p, argSpec.p + argSpec.s);
		}, this);
		// call function
		var skipOriginalNatCall = false;
		if (this.onNativeCall) {
			skipOriginalNatCall = this.onNativeCall(this.nativeFunctions[opl].name, this, args);
		}
		if (!skipOriginalNatCall) {
			this.nativeFunctions[opl].fun(this, args);
		}
		// put back arguments (possibly modified) to varData
		argSpec.forEach(function (argSpec, i) {
			this.setVariableData(argSpec.p, args[i]);
		}, this);
		break;
	case A3a.VM.op.subCall:
		this.stack.push(this.pc + 1);
		this.pc = opl - 1;
		break;
	case A3a.VM.op.subRet:
		this.pc = this.stack.pop() - 1;
		break;
	case A3a.VM.op.reserved:
		throw "op 0x" + op.toString(16) + " (reserved) not implemented";
	default:
		execOp(op);
		break;
	}
	this.pc++;
};

/** Run until the next stop instruction, or just one step if the
	step-by-step flag is set
	@return {void}
*/
A3a.Device.prototype.run = function () {
	while (this.flagEventActive) {
		this.step();
		if (this.flagStepByStep) {
			break;
		}
	}
};
