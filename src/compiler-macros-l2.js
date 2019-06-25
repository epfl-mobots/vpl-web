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

Definition of macros for the L2 compiler (mainly math functions
for the fixed-point type).

*/

/** Macros for L2
	@const
	@type {Array.<A3a.macroFunctionDef>}
*/
A3a.A3aNode.stdMacrosL2 = [
	{
		// abs is a function in L2
		name: "abs",
		nArgs: 1,
		resultTypePropagate: function (compiler, argTypes) {
			return argTypes[0];
		},
		exists: function (asebaNode) {
			return true;
		},
		genCode: function (compiler, asebaNode, argTypes, argsAddr) {
			return [
				(A3a.vm.bc.load << 12) | argsAddr,
				A3a.vm.bc.unaryOpAbs
			];
		}
	},
	{
		name: "atan2",
		nArgs: 2,
		nTmp: 1,
		resultTypePropagate: function (compiler, argTypes) {
			return A3a.Compiler.resultType.fixed;
		},
		exists: function (asebaNode) {
			return asebaNode.findNativeFunction("math.atan2") != null;
		},
		genCode: function (compiler, asebaNode, argTypes, argsAddr) {
			var bc = argTypes[0] === A3a.Compiler.resultType.fixed &&
				argTypes[1] !== A3a.Compiler.resultType.fixed
				? [
					// convert 2nd arg from int to fixed
					(A3a.vm.bc.load << 12) | (argsAddr + 1),
					(A3a.vm.bc.smallImmediate << 12) | compiler.factor,
					A3a.vm.bc.binaryOpMult,
					(A3a.vm.bc.store << 12) | (argsAddr + 1)
				]
				: argTypes[0] !== A3a.Compiler.resultType.fixed &&
					argTypes[1] === A3a.Compiler.resultType.fixed
					? [
						// convert 1st arg from int to fixed
						(A3a.vm.bc.load << 12) | argsAddr,
						(A3a.vm.bc.smallImmediate << 12) | compiler.factor,
						A3a.vm.bc.binaryOpMult,
						(A3a.vm.bc.store << 12) | argsAddr
					]
					: [];
			return bc.concat([
				// size 1
				(A3a.vm.bc.smallImmediate << 12) | 1,
				// args in reverse order
				(A3a.vm.bc.smallImmediate << 12) | (argsAddr + 1),
				(A3a.vm.bc.smallImmediate << 12) | argsAddr,
				// temp used for result
				(A3a.vm.bc.smallImmediate << 12) | (argsAddr + 2),
				// call native function
				(A3a.vm.bc.nativeCall << 12) | asebaNode.findNativeFunction("math.atan2").id,
				// push result from temp
				(A3a.vm.bc.load << 12) | (argsAddr + 2),
				// map from [-32768,32768) to [-pi*factor,pi*factor]
				(A3a.vm.bc.smallImmediate << 12) | Math.floor(32768 / (compiler.factor * Math.PI)),
				A3a.vm.bc.binaryOpDiv
			]);
		}
	},
	{
		name: "cos",
		nArgs: 1,
		nTmp: 1,
		resultTypePropagate: function (compiler, argTypes) {
			return A3a.Compiler.resultType.fixed;
		},
		exists: function (asebaNode) {
			return asebaNode.findNativeFunction("math.cos") != null;
		},
		genCode: function (compiler, asebaNode, argTypes, argsAddr) {
			return [
				(A3a.vm.bc.load << 12) | argsAddr,
				// map from [-pi*factor,pi*factor] to [-32767,32767], result as int16
				(A3a.vm.bc.smallImmediate << 12) |
					Math.round(32767 /
						((argTypes[0] === A3a.Compiler.resultType.fixed ? compiler.factor : 1) * Math.PI)),
				A3a.vm.bc.binaryOpMult,
				// store back into arg
				(A3a.vm.bc.store << 12) | argsAddr,
				// size 1
				(A3a.vm.bc.smallImmediate << 12) | 1,
				// input arg
				(A3a.vm.bc.smallImmediate << 12) | argsAddr,
				// temp used for result
				(A3a.vm.bc.smallImmediate << 12) | (argsAddr + 1),
				// call native function
				(A3a.vm.bc.nativeCall << 12) | asebaNode.findNativeFunction("math.cos").id,
				// push result from temp[1]
				(A3a.vm.bc.load << 12) | (argsAddr + 1),
				// map from [-32768,32768) to [-factor,factor]
				(A3a.vm.bc.smallImmediate << 12) | Math.floor(32768 / compiler.factor),
				A3a.vm.bc.binaryOpDiv
			];
		}
	},
	A3a.A3aNode.macroMath("rand", "math.rand", 0),
	{
		name: "random",
		nArgs: 0,
		nTmp: 1,
		resultTypePropagate: function (compiler, argTypes) {
			return A3a.Compiler.resultType.fixed;
		},
		exists: function (asebaNode) {
			return asebaNode.findNativeFunction("math.rand") != null;
		},
		genCode: function (compiler, asebaNode, argTypes, argsAddr) {
			return [
				// size 1
				(A3a.vm.bc.smallImmediate << 12) | 1,
				// temp variable used for result
				(A3a.vm.bc.smallImmediate << 12) | argsAddr,
				// call native function
				(A3a.vm.bc.nativeCall << 12) | asebaNode.findNativeFunction("math.rand").id,
				// push result from temp variable
				(A3a.vm.bc.load << 12) | argsAddr,
				// abs (result in [0,32768))
				A3a.vm.bc.unaryOpAbs,
				// scale from [0,32768) to [0,100) (int) = [0,1) (fixed)
				(A3a.vm.bc.smallImmediate << 12) | Math.floor(32768 / compiler.factor),
				A3a.vm.bc.binaryOpDiv
			];
		}
	},
	{
		name: "stop",
		nArgs: 0,
		resultTypePropagate: function (compiler, argTypes) {
			return A3a.Compiler.resultType.void;
		},
		genCode: function (compiler, asebaNode, argTypes, argsAddr) {
			return [
				A3a.vm.bc.stop
			];
		}
	},
	{
		name: "sin",
		nArgs: 1,
		nTmp: 1,
		resultTypePropagate: function (compiler, argTypes) {
			return A3a.Compiler.resultType.fixed;
		},
		exists: function (asebaNode) {
			return asebaNode.findNativeFunction("math.sin") != null;
		},
		genCode: function (compiler, asebaNode, argTypes, argsAddr) {
			return [
				(A3a.vm.bc.load << 12) | argsAddr,
				// map from [-pi*factor,pi*factor] to [-32767,32767], result as int16
				(A3a.vm.bc.smallImmediate << 12) |
					Math.round(32767 /
						((argTypes[0] === A3a.Compiler.resultType.fixed ? compiler.factor : 1) * Math.PI)),
				A3a.vm.bc.binaryOpMult,
				// store back into arg
				(A3a.vm.bc.store << 12) | argsAddr,
				// size 1
				(A3a.vm.bc.smallImmediate << 12) | 1,
				// input arg
				(A3a.vm.bc.smallImmediate << 12) | argsAddr,
				// temp used for result
				(A3a.vm.bc.smallImmediate << 12) | (argsAddr + 1),
				// call native function
				(A3a.vm.bc.nativeCall << 12) | asebaNode.findNativeFunction("math.sin").id,
				// push result from temp[1]
				(A3a.vm.bc.load << 12) | (argsAddr + 1),
				// scale from [-32768,32768) to [-factor,factor]
				(A3a.vm.bc.smallImmediate << 12) | Math.floor(32768 / compiler.factor),
				A3a.vm.bc.binaryOpDiv
			];
		}
	},
	{
		name: "sqrt",
		nArgs: 1,
		nTmp: 6,	// temp[0]: result, temp[1]: counter, temp[2..5]: args of math.muldiv
		resultTypePropagate: function (compiler, argTypes) {
			return A3a.Compiler.resultType.fixed;
		},
		genCode: function (compiler, asebaNode, argTypes, argsAddr) {
			/*
				for y=sqrt(x): y = 1; loop: y = (y + x / y) / 2;
				for y/f=sqrt(x/f): y = f; loop: y = (y + x f / y) / 2
				for y/f=sqrt(x): y = f; loop: y = (y + x f^2 / y) / 2
			*/
			var k = argTypes[0] === A3a.Compiler.resultType.fixed
				? compiler.factor
				: compiler.factor * compiler.factor;
			var bcPushK = A3a.Compiler.NodeNumber.generateA3aBC(k);
			return [
				// temp[0] = f
				(A3a.vm.bc.smallImmediate << 12) | compiler.factor,
				(A3a.vm.bc.store << 12) | (argsAddr + 1),
				// temp[1] = num loops
				(A3a.vm.bc.smallImmediate << 12) | 10,
				(A3a.vm.bc.store << 12) | (argsAddr + 2),
				// calc. x f / temp[0] or x f^2 / temp[0] with math.muldiv
				// beginLoop:
				(A3a.vm.bc.load << 12) | argsAddr,
				(A3a.vm.bc.store << 12) | (argsAddr + 4)
			].concat(bcPushK)
			.concat([
				(A3a.vm.bc.store << 12) | (argsAddr + 5),
				(A3a.vm.bc.load << 12) | (argsAddr + 1),
				(A3a.vm.bc.store << 12) | (argsAddr + 6),
				(A3a.vm.bc.smallImmediate << 12) | 1,
				(A3a.vm.bc.smallImmediate << 12) | (argsAddr + 6),
				(A3a.vm.bc.smallImmediate << 12) | (argsAddr + 5),
				(A3a.vm.bc.smallImmediate << 12) | (argsAddr + 4),
				(A3a.vm.bc.smallImmediate << 12) | (argsAddr + 3),
				(A3a.vm.bc.nativeCall << 12) | compiler.asebaNode.findNativeFunction("math.muldiv").id,
				(A3a.vm.bc.load << 12) | (argsAddr + 3),
				// mean with temp[0]
				(A3a.vm.bc.load << 12) | (argsAddr + 1),
				A3a.vm.bc.binaryOpAdd,
				(A3a.vm.bc.smallImmediate << 12) | 2,
				A3a.vm.bc.binaryOpDiv,
				// store to temp[0]
				(A3a.vm.bc.store << 12) | (argsAddr + 1),
				// temp[1]--
				(A3a.vm.bc.load << 12) | (argsAddr + 2),
				(A3a.vm.bc.smallImmediate << 12) | 1,
				A3a.vm.bc.binaryOpSub,
				(A3a.vm.bc.store << 12) | (argsAddr + 2),
				// loop while temp[1] > 0
				(A3a.vm.bc.load << 12) | (argsAddr + 2),
				(A3a.vm.bc.smallImmediate << 12) | 0,
				(A3a.vm.bc.conditionalBranch << 12) | A3a.vm.condName.indexOf("le"),
				-(23 + bcPushK.length) & 0xffff,
				// push temp[0]
				(A3a.vm.bc.load << 12) | (argsAddr + 1)
			]);
		}
	}
];
