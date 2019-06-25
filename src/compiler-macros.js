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

Definition of macros for the Aseba compiler (a nicer syntax for some
native functions).

*/

/** Helper function for macros
	@param {string} name function name
	@param {string} natName name of the native function
	@param {number=} nArgs number of arguments (default: 1)
	@return {A3a.macroFunctionDef}
*/
A3a.A3aNode.macroMath = function (name, natName, nArgs) {
	if (nArgs === undefined) {
		nArgs = 1;
	}
	return {
		name: name,
		nArgs: nArgs,
		nTmp: 1,
		exists: function (asebaNode) {
			return asebaNode.findNativeFunction(natName) != null;
		},
		genCode: function (compiler, asebaNode, argTypes, argsAddr) {
			var fun = asebaNode.findNativeFunction(natName);
			var bc = [
				// size 1
				(A3a.vm.bc.smallImmediate << 12) | 1
			];
			for (var i = 0; i < nArgs; i++) {
				bc = bc.concat([
					// input arguments in reverse order
					(A3a.vm.bc.smallImmediate << 12) | (argsAddr + nArgs - 1 - i)
				]);
			}
			bc = bc.concat([
				// temp variable used for result
				(A3a.vm.bc.smallImmediate << 12) | (argsAddr + nArgs),
				// call native function
				(A3a.vm.bc.nativeCall << 12) | fun.id,
				// push result from temp variable
				(A3a.vm.bc.load << 12) | (argsAddr + nArgs)
			]);
			return bc;
		}
	};
};

/** Macros
	@const
	@type {Array.<A3a.macroFunctionDef>}
*/
A3a.A3aNode.stdMacros = [
	A3a.A3aNode.macroMath("min", "math.min", 2),
	A3a.A3aNode.macroMath("max", "math.max", 2),
	A3a.A3aNode.macroMath("clamp", "math.clamp", 3),
	A3a.A3aNode.macroMath("muldiv", "math.muldiv", 3),
	A3a.A3aNode.macroMath("atan2", "math.atan2", 2),
	A3a.A3aNode.macroMath("sin", "math.sin"),
	A3a.A3aNode.macroMath("cos", "math.cos"),
	A3a.A3aNode.macroMath("sqrt", "math.sqrt"),
	A3a.A3aNode.macroMath("rand", "math.rand", 0)
];
