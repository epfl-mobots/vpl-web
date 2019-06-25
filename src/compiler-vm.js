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

Description of the Aseba VM bytecode instructions for the compilers.

*/

/** @const */
A3a.vm.bc = {
	stop: 0,
	smallImmediate: 1,
	largeImmediate: 2,
	load: 3,
	store: 4,
	loadIndirect: 5,
	storeIndirect: 6,
	unaryOp: 7,
	unaryOpNeg: 0x7000,
	unaryOpAbs: 0x7001,
	unaryOpBitNot: 0x7002,
	unaryOpNot: 0x7003,	// NOT in the VM, must be emulated
	binaryOp: 8,
	binaryOpShiftLeft: 0x8000,
	binaryOpShiftRight: 0x8001,
	binaryOpAdd: 0x8002,
	binaryOpSub: 0x8003,
	binaryOpMult: 0x8004,
	binaryOpDiv: 0x8005,
	binaryOpMod: 0x8006,
	binaryOpBitOr: 0x8007,
	binaryOpBitXor: 0x8008,
	binaryOpBitAnd: 0x8009,
	binaryOpEqual: 0x800a,
	binaryOpNotEqual: 0x800b,
	binaryOpGreaterThan: 0x800c,
	binaryOpGreaterEqThan: 0x800d,
	binaryOpLessThan: 0x800e,
	binaryOpLessEqThan: 0x800f,
	binaryOpOr: 0x8010,
	binaryOpAnd: 0x8011,
	jump: 9,
	conditionalBranch: 10,
	emit: 11,
	nativeCall: 12,
	subCall: 13,
	ret: 14
};

/**
	@const
	@type {Array.<string>}
*/
A3a.vm.condName = [
	"shift left",
	"shift right",
	"add",
	"sub",
	"mult",
	"div",
	"mod",
	"bitor",
	"bitxor",
	"bitand",
	"eq",
	"ne",
	"gt",
	"ge",
	"lt",
	"le",
	"or",
	"and"
];
