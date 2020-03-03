/*
	Copyright 2020 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Definition of class A3a.vpl.CodeGeneratorAsm (a subclass of
A3a.vpl.CodeGeneratorA3a), which generate disassembled Aseba source code from a
VPL3 program.

*/

/** Code generator for asm
	@constructor
	@extends {A3a.vpl.CodeGeneratorA3a}
*/
A3a.vpl.CodeGeneratorAsm = function () {
	A3a.vpl.CodeGeneratorA3a.call(this);
};
A3a.vpl.CodeGeneratorAsm.prototype = Object.create(A3a.vpl.CodeGenerator.prototype);
A3a.vpl.CodeGeneratorAsm.prototype.constructor = A3a.vpl.CodeGeneratorAsm;

/**
	@inheritDoc
*/
A3a.vpl.CodeGeneratorAsm.prototype.generate = function (program, runBlocks) {
	// generate Aseba code
	var asebaSourceCode = A3a.vpl.CodeGeneratorA3a.prototype.generate.call(this, program, runBlocks);

	// compile to bytecode
	var asebaNode = new A3a.A3aNode(A3a.thymioDescr);
	var c = new A3a.Compiler(asebaNode, asebaSourceCode);
	c.functionLib = A3a.A3aNode.stdMacros;
	var bytecode = c.compile();

	// disassemble
	var str = A3a.vm.disToListing(bytecode, true);

	return str;
};

A3a.vpl.Program.codeGenerator["asm"] = new A3a.vpl.CodeGeneratorAsm();
