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

Implementation of the Aseba message format used for communication.

*/

/** Message for A3a protocol
	@constructor
	@param {A3a.Message.Id} id
	@param {number} sourceNodeId
	@param {(Uint8Array|ArrayBuffer|Array.<(number|string)>)=} payload payload as raw bytes or array of (u)int16/string
*/
A3a.Message = function (id, sourceNodeId, payload) {
	this.id = id;
	this.sourceNodeId = sourceNodeId;
	if (payload instanceof ArrayBuffer) {
		this.payload = payload;
	} else if (payload) {
		// total size in bytes
		var size = 0;
		for (var i = 0; i < payload.length; i++) {
			if (typeof payload[i] === "string") {
				size += 1 + payload[i].length;	// length-prefixed string, assume ascii
			} else {
				size += 2;	// int16 or uint16
			}
		}
		var data = new ArrayBuffer(size);
		var dataView = new DataView(data);
		for (var i = 0, offset = 0; i < payload.length; i++) {
			if (typeof payload[i] === "string") {
				dataView.setUint8(offset++, payload[i].length);
				for (var j = 0; j < payload[i].length; j++) {
					dataView.setUint8(offset++, payload[i].charCodeAt(j));
				}
			}
			else if (payload[i] < 0x8000) {
				dataView.setInt16(offset, payload[i], true);
				offset += 2;
			} else {
				dataView.setUint16(offset, payload[i], true);
				offset += 2;
			}
		}
		this.payload = data;
	} else {
		this.payload = new ArrayBuffer(0);
	}
};

/**	Decode payload of recognized messages
	@return {void}
 */
A3a.Message.prototype.decode = function () {
	var dataView = new DataView(this.payload);

	/** Parse strings in payload
		@param {Array.<boolean>} stringFlags type of data in payload:
		true for strings (length-prefixed), false for uint16
		@return {Array.<(number|string)>}
	*/
	function parseStrings(stringFlags) {
		/** @type {Array.<(string|number)>} */
		var r = [];
		var offset = 0;
		for (var i = 0; i < stringFlags.length; i++) {
			if (stringFlags[i]) {
				var length = dataView.getUint8(offset);
				var str = "";
				for (var j = 0; j < length; j++) {
					str += String.fromCharCode(dataView.getUint8(offset + 1 + j));
				}
				r.push(str);
				offset += 1 + length;
			} else {
				r.push(dataView.getUint16(offset, true));
				offset += 2;
			}
		}
		return r;
	}

	var r;
	/** @type {Array.<number>} */
	var val;
	switch (this.id) {
	case A3a.Message.Id.description:
		r = parseStrings([true, false, false, false, false, false, false, false]);
		this.nodeName = r[0];
		this.protocolVersion = r[1];
		this.bytecodeSize = r[2];
		this.stackSize = r[3];
		this.variableSize = r[4];
		this.numNamedVariables = r[5];
		this.numLocalEvents = r[6];
		this.numNativeFunctions = r[7];
		break;
	case A3a.Message.Id.namedVariableDescription:
		r = parseStrings([false, true]);
		this.varSize = r[0];
		this.varName = r[1];
		break;
	case A3a.Message.Id.localEventDescription:
		r = parseStrings([true, true]);
		this.localEventName = r[0];
		this.localEventDescription = r[1];
		break;
	case A3a.Message.Id.nativeFunctionDescription:
		var t = [true, true, false];
		r = parseStrings(t);
		this.functionName = r[0];
		this.functionDescription = r[1];
		this.numParams = r[2];
		for (var i = 0; i < this.numParams; i++) {
			t.push(false);
			t.push(true);
		}
		r = parseStrings(t);
		/** @type {Array.<{name:string,size:number}>} */
		this.params = [];
		for (var i = 0; i < this.numParams; i++) {
			this.params.push({
				size: r[3 + 2 * i] - (r[3 + 2 * i] & 0x8000 ? 65536 : 0),	// signed
				name: r[4 + 2 * i]
			});
		}
		break;
	case A3a.Message.Id.variables:
		this.varOffset = dataView.getUint16(0, true);
		/** @type {Array.<number>} */
		this.varData = [];
		for (var i = 2; i < dataView.byteLength; i += 2) {
			this.varData.push(dataView.getUint16(i, true));
		}
		break;
	case A3a.Message.Id.executionStateChanged:
		this.pc = dataView.getUint16(0, true);
		var flags = dataView.getUint16(2, true);
		this.flags = {
			flags: flags,
			eventActive: (flags & 1) !== 0,
			stepByStep: (flags & 2) !== 0,
			eventRunning: (flags & 4) !== 0
		};
		break;
	case A3a.Message.Id.breakpointSetResult:
		this.pc = dataView.getUint16(2, true);
		this.result = dataView.getUint16(4, true);
		break;
	case A3a.Message.Id.setBytecode:
		this.targetNodeId = dataView.getUint16(0, true);
		this.bcOffset = dataView.getUint16(2, true);
		val = [];
		for (var i = 4; i < dataView.byteLength; i += 2) {
			val.push(dataView.getUint16(i, true));
		}
		this.bc = val;
		break;
	case A3a.Message.Id.breakpointClearAll:
	case A3a.Message.Id.reset:
	case A3a.Message.Id.run:
	case A3a.Message.Id.pause:
	case A3a.Message.Id.step:
	case A3a.Message.Id.stop:
	case A3a.Message.Id.getExecutionState:
		this.targetNodeId = dataView.getUint16(0, true);
		break;
	case A3a.Message.Id.breakpointSet:
	case A3a.Message.Id.breakpointClear:
		this.targetNodeId = dataView.getUint16(0, true);
		this.pc = dataView.getUint16(2, true);
		break;
	case A3a.Message.Id.getVariables:
		this.targetNodeId = dataView.getUint16(0, true);
		this.varOffset = dataView.getUint16(2, true);
		this.varCount = dataView.getUint16(4, true);
		break;
	case A3a.Message.Id.setVariables:
		this.targetNodeId = dataView.getUint16(0, true);
		this.varOffset = dataView.getUint16(2, true);
		val = [];
		for (var i = 4; i < dataView.byteLength; i += 2) {
			val.push(dataView.getUint16(i, true));
		}
		this.varVal = val;
		break;
	case A3a.Message.Id.listNodes:
		this.version = dataView.getUint16(0, true);
		break;
	}
};

/**	Serialize message for serial or tcp output
	@return {ArrayBuffer}
*/
A3a.Message.prototype.serialize = function () {
	var a = new ArrayBuffer(6 + this.payload.byteLength);
	var dataView = new DataView(a);
	dataView.setUint16(0, this.payload.byteLength, true);
	dataView.setUint16(2, this.sourceNodeId, true);
	dataView.setUint16(4, this.id, true);
	var byteView = new Uint8Array(a);
	byteView.set(new Uint8Array(this.payload), 6);
	return a;
};

/**	Deserialize next message
	@param {A3a.InputBuffer} inputBuffer
	@return {?A3a.Message}
*/
A3a.Message.deserialize = function (inputBuffer) {
	if (inputBuffer.length < 6) {
		return null;
	}
	var dataView = new DataView(inputBuffer.buffer);
	var payloadSize = dataView.getUint16(0, true);
	if (6 + payloadSize > inputBuffer.length) {
		return null;
	}
	var sourceNodeId = dataView.getUint16(2, true);
	var id = /** @type {A3a.Message.Id} */(dataView.getUint16(4, true));
	var payload = inputBuffer.buffer.slice(6, 6 + payloadSize);
	inputBuffer.consume(6 + payloadSize);
	var msg = new A3a.Message(id, sourceNodeId, payload);
	msg.decode();
	return msg;
};

/** Copy message
	@return {A3a.Message}
*/
A3a.Message.prototype.copy = function () {
	var msgCopy = new A3a.Message(this.id, this.sourceNodeId, this.payload);
	msgCopy.decode();
	return msgCopy;
};

/** @enum {number} */
A3a.Message.remapDir = {
	fromLocalToExtern: 0,
	fromExternToLocal: 1
};

/** Create new message by copying old one, remapping node id from local to extern
	or from extern to local
	@param {A3a.IdMapping} nodeIdMapping
	@param {number} connectionIndex
	@param {A3a.Message.remapDir} remapDir
	@return {A3a.Message}
*/
A3a.Message.prototype.remapId = function (nodeIdMapping, connectionIndex, remapDir) {
	/** If it exists in nodeIdMapping, remap node id from local to extern or from
		extern to local depending on remapDir
		@param {number} nodeId
		@return {number}
	*/
	var remap = remapDir === A3a.Message.remapDir.fromLocalToExtern
		? function (nodeId) {
			var newId = nodeIdMapping.externNodeId(connectionIndex, nodeId);
			return newId >= 0 ? newId : nodeId;
		}
		: function (nodeId) {
			var newId = nodeIdMapping.localNodeId(nodeId);
			return newId >= 0 ? newId : nodeId;
		};

	var msg2 = this.copy();
	msg2.sourceNodeId = remap(msg2.sourceNodeId);
	switch (msg2.id) {
	case A3a.Message.Id.setBytecode:
	case A3a.Message.Id.breakpointClearAll:
	case A3a.Message.Id.reset:
	case A3a.Message.Id.run:
	case A3a.Message.Id.pause:
	case A3a.Message.Id.step:
	case A3a.Message.Id.stop:
	case A3a.Message.Id.getExecutionState:
	case A3a.Message.Id.breakpointSet:
	case A3a.Message.Id.breakpointClear:
	case A3a.Message.Id.getVariables:
	case A3a.Message.Id.setVariables:
		this.targetNodeId = remap(this.targetNodeId);
		break;
	}

	return msg2;
};

A3a.Message.prototype.toString = function () {
	var str = (A3a.Message.messageName[this.id] || "0x" + this.id.toString(16));
	str += " from " + this.sourceNodeId.toString(10);
	if (this.targetNodeId >= 0) {
		str += " to " + this.targetNodeId.toString();
	}
	return str;
};

/**	A3a message id
	@enum {number}
*/
A3a.Message.Id = {
	description: 0x9000,
	namedVariableDescription: 0x9001,
	localEventDescription: 0x9002,
	nativeFunctionDescription: 0x9003,
	disconnected: 0x9004,
	variables: 0x9005,
	arrayAccessOutOfBounds: 0x9006,
	divisionByZero: 0x9007,
	eventExecutionKilled: 0x9008,
	executionStateChanged: 0x900a,
	breakpointSetResult: 0x900b,
	nodePresent: 0x900c,
	getDescription: 0xa000,
	setBytecode: 0xa001,
	reset: 0xa002,
	run: 0xa003,
	pause: 0xa004,
	step: 0xa005,
	stop: 0xa006,
	getExecutionState: 0xa007,
	breakpointSet: 0xa008,
	breakpointClear: 0xa009,
	breakpointClearAll: 0xa00a,
	getVariables: 0xa00b,
	setVariables: 0xa00c,
	getNodeDescription: 0xa010,
	listNodes: 0xa011
};

/** @const */
A3a.Message.messageName = {
	0x9000: "description",
	0x9001: "namedVariableDescription",
	0x9002: "localEventDescription",
	0x9003: "nativeFunctionDescription",
	0x9005: "variables",
	0x900a: "executionStateChanged",
	0x900c: "nodePresent",
	0xa000: "getDescription",
	0xa001: "setBytecode",
	0xa002: "reset",
	0xa003: "run",
	0xa004: "pause",
	0xa005: "step",
	0xa006: "stop",
	0xa007: "getExecutionState",
	0xa008: "breakpointSet",
	0xa009: "breakpointClear",
	0xa00a: "breakpointClearAll",
	0xa00b: "getVariables",
	0xa00c: "setVariables",
	0xa010: "getNodeDescription",
	0xa011: "listNodes"
};

/** @const */
A3a.Message.version = 5;
