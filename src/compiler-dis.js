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

Aseba VM bytecode disassembler.

*/

/** Disassemble bytecode
	@param {Array.<number>} bytecode bytecode as an array of unsigned 16-bit numbers
	@param {boolean=} noLabel true to omit labels
	@return {Array.<A3a.vm.dis.instruction>}
*/
A3a.vm.dis = function (bytecode, noLabel) {
	function s16(u16) {
		return u16 >= 32784 ? u16 - 65536 : u16;
	}
	function s12(u12) {
		return u12 >= 2048 ? u12 - 4096 : u12;
	}

	/** @type {Array.<A3a.vm.dis.instruction>} */
	var code = [];

	// event vector table
	var eventVectorSize = bytecode[0];
	if (bytecode.length > 0) {
		if (eventVectorSize % 2 !== 1 || eventVectorSize > bytecode.length) {
			throw "Bad event table";
		}
		code.push({addr: 0, op: bytecode.slice(0, 1), instr: -1, str: "dc " + bytecode[0]});
	}
	var eventVectorTable = [];
	for (var i = 1; i < eventVectorSize; i += 2) {
		eventVectorTable.push({
			id: bytecode[i],
			addr: bytecode[i + 1]
		});
		code.push({
			addr: i,
			op: bytecode.slice(i, i + 2),
			instr: -1,
			str: "dc 0x" + bytecode[i].toString(16) + ", " + bytecode[i + 1]});
	}

	// code
	for (var i = eventVectorSize; i < bytecode.length; i++) {
		var instr = {addr: i, op: bytecode.slice(i, i + 1), instr: bytecode[i] >>> 12};

		// find event, if address matches
		if (!noLabel) {
			for (var j = 0; j < eventVectorTable.length; j++) {
				if (eventVectorTable[j].addr === i) {
					instr.id = "onevent_" + eventVectorTable[j].id.toString(16);
					break;
				}
			}
		}

		var op = bytecode[i];
		switch (op >>> 12) {
		case A3a.vm.bc.stop:
			instr.str = "stop";
			break;
		case A3a.vm.bc.smallImmediate:
			instr.str = "push.s " + ((op & 0xfff) - (op & 0x800 ? 0x1000 : 0));
			break;
		case A3a.vm.bc.largeImmediate:
			instr.op = bytecode.slice(i, i + 2);
			instr.str = "push " + s16(bytecode[++i]);
			break;
		case A3a.vm.bc.load:
			instr.str = "load " + (op & 0xfff);
			break;
		case A3a.vm.bc.store:
			instr.str = "store " + (op & 0xfff);
			break;
		case A3a.vm.bc.loadIndirect:
			instr.op = bytecode.slice(i, i + 2);
			instr.str = "load.ind " + (op & 0xfff) + " size=" + bytecode[++i];
			break;
		case A3a.vm.bc.storeIndirect:
			instr.op = bytecode.slice(i, i + 2);
			instr.str = "store.ind " + (op & 0xfff) + " size=" + bytecode[++i];
			break;
		case A3a.vm.bc.unaryOp:
		case A3a.vm.bc.binaryOp:
			switch (op) {
			case A3a.vm.bc.unaryOpNeg:
				instr.str = "neg";
				break;
			case A3a.vm.bc.unaryOpAbs:
				instr.str = "abs";
				break;
			case A3a.vm.bc.unaryOpBitNot:
				instr.str = "bitnot";
				break;
			case A3a.vm.bc.unaryOpNot:
				instr.str = "not ; not implemented";
				break;
			case A3a.vm.bc.binaryOpShiftLeft:
				instr.str = "sl";
				break;
			case A3a.vm.bc.binaryOpShiftRight:
				instr.str = "asr";
				break;
			case A3a.vm.bc.binaryOpAdd:
				instr.str = "add";
				break;
			case A3a.vm.bc.binaryOpSub:
				instr.str = "sub";
				break;
			case A3a.vm.bc.binaryOpMult:
				instr.str = "mult";
				break;
			case A3a.vm.bc.binaryOpDiv:
				instr.str = "div";
				break;
			case A3a.vm.bc.binaryOpMod:
				instr.str = "mod";
				break;
			case A3a.vm.bc.binaryOpBitOr:
				instr.str = "bitor";
				break;
			case A3a.vm.bc.binaryOpBitXor:
				instr.str = "bitxor";
				break;
			case A3a.vm.bc.binaryOpBitAnd:
				instr.str = "bitand";
				break;
			case A3a.vm.bc.binaryOpEqual:
				instr.str = "eq";
				break;
			case A3a.vm.bc.binaryOpNotEqual:
				instr.str = "ne";
				break;
			case A3a.vm.bc.binaryOpGreaterThan:
				instr.str = "gt";
				break;
			case A3a.vm.bc.binaryOpGreaterEqThan:
				instr.str = "ge";
				break;
			case A3a.vm.bc.binaryOpLessThan:
				instr.str = "lt";
				break;
			case A3a.vm.bc.binaryOpLessEqThan:
				instr.str = "le";
				break;
			case A3a.vm.bc.binaryOpOr:
				instr.str = "or";
				break;
			case A3a.vm.bc.binaryOpAnd:
				instr.str = "and";
				break;
			default:
				throw "Unknown instruction " + op.toString(16);
			}
			break;
		case A3a.vm.bc.jump:
			instr.str = "jump " + (i + s12(op & 0xfff));
			break;
		case A3a.vm.bc.conditionalBranch:
			instr.op = bytecode.slice(i, i + 2);
			instr.str = (op & 0x100 ? op & 0x200 ? "dont." : "do." : "") +
				"jump." +
				(op & 0x100 ? "when" : "if") +
				".not " + A3a.vm.condName[op & 0x1f] +
				" " + (i + s16(bytecode[i + 1]));
			i++;
			break;
		case A3a.vm.bc.emit:
			instr.str = "emit id=" + (op & 0xfff) +
				" data=" + s16(bytecode[i + 1]) +
				" count=" + s16(bytecode[i + 2]);
			i += 2;
			break;
		case A3a.vm.bc.nativeCall:
			instr.str = "callnat " + (op & 0xfff);
			break;
		case A3a.vm.bc.subCall:
			instr.str = "callsub " + (op & 0xfff);
			break;
		case A3a.vm.bc.ret:
			instr.str = "ret";
			break;
		default:
			throw "Unknown instruction " + op.toString(16);
		}

		code.push(instr);
	}
	return code;
};

/** Disassemble bytecode
	@param {Array.<number>} bytecode
	@param {boolean=} forAssembler false to show addresses and opcodes (default),
	true to be compatible with assembler
	@return {string}
*/
A3a.vm.disToListing = function (bytecode, forAssembler) {
	var listing = A3a.vm.dis(bytecode).map(function (instr) {
		var addr = instr.addr.toString(10);
		addr = "    ".slice(addr.length - 1) + addr;
		var op = instr.op.map(function (op1) {
			var str = op1.toString(16);
			return "000".slice(str.length - 1) + str;
		}).join(" ");
		op += "     ".slice(op.length - 4);
		return (instr.id ? instr.id + ":\n" : "") +
			(forAssembler ? "    " : addr + "  " + op + "  ") + instr.str +
			(instr.addr === bytecode[0] - 2 ||
				instr.instr === A3a.vm.bc.stop || instr.instr === A3a.vm.bc.ret ? "\n" : "");
	}).join("\n");

	if (listing.length === 0) {
		listing = "; empty";
	}

	return listing;
}

/** Instruction
	@typedef {{
		op: Array.<number>,
		id: (string|undefined),
		addr: number,
		instr: number,
		str: string
	}}
*/
A3a.vm.dis.instruction;
