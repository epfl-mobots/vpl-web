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

Definition of class A3a.vpl.CodeGeneratorA3a (a subclass of
A3a.vpl.CodeGenerator), which generate JavaScript source code from a VPL3
program.

*/

/** Code generator for JavaScript
	@constructor
	@extends {A3a.vpl.CodeGenerator}
*/
A3a.vpl.CodeGeneratorJS = function () {
	A3a.vpl.CodeGenerator.call(this, "js", "&&", "true");
};
A3a.vpl.CodeGeneratorJS.prototype = Object.create(A3a.vpl.CodeGenerator.prototype);
A3a.vpl.CodeGeneratorJS.prototype.constructor = A3a.vpl.CodeGeneratorJS;

/**
	@inheritDoc
*/
A3a.vpl.CodeGeneratorJS.prototype.generate = function (program, runBlocks) {
	this.reset();
	var c = program.program.map(function (rule) {
		return this.generateCodeForEventHandler(rule);
	}, this);
	/** @type {Array.<string>} */
	var initVarDecl = [];
	/** @type {Array.<string>} */
	var initCodeExec = [];
	/** @type {Array.<string>} */
	var initCodeDecl = [];
	/** @dict */
	var folding = {};
		// folding[sectionBegin] = index in c fragments with same sectionBegin are folded into
	/** @type {Array.<number>} */
	var initEventIndices = [];
	var usesCond = false;
	c.forEach(function (evCode, i) {
		evCode.initVarDecl && evCode.initVarDecl.forEach(function (fr) {
			if (initVarDecl.indexOf(fr) < 0) {
				initVarDecl.push(fr);
			}
		});
		evCode.initCodeExec && evCode.initCodeExec.forEach(function (fr) {
			if (initCodeExec.indexOf(fr) < 0) {
				initCodeExec.push(fr);
			}
		});
		evCode.initCodeDecl && evCode.initCodeDecl.forEach(function (fr) {
			if (initCodeDecl.indexOf(fr) < 0) {
				initCodeDecl.push(fr);
			}
		});
		var statement = (evCode.statement || "");
		if (evCode.clause) {
			statement =
				"cond = " + evCode.clause + ";\n" +
				"if (cond && !cond0[" + i + "]) {\n" +
				statement +
				"}\n" +
				"cond0[" + i + "] = cond;\n";
			usesCond = true;
		}
		statement = this.bracket(statement, program.program[i]);
		if (evCode.sectionBegin) {
 			if (folding[evCode.sectionBegin] !== undefined) {
				// fold evCode into c[folding[evCode.sectionBegin]]
				var foldedFrag = c[folding[evCode.sectionBegin]];
				if (evCode.clauseInit &&
					(!foldedFrag.clauseInit || foldedFrag.clauseInit.indexOf(evCode.clauseInit) < 0)) {
					// concat all clauseInit fragments without duplicates
					foldedFrag.clauseInit = (foldedFrag.clauseInit || "") + evCode.clauseInit;
				}
				foldedFrag.statement += statement;
				evCode.statement = undefined;
			} else {
				// first fragment with that sectionBegin
				folding[evCode.sectionBegin] = i;
				evCode.statement = statement;
			}
		} else {
			// replace clauseBegin/statement/clauseEnd with statement
			evCode.statement = statement;
		}
		if (program.program[i].getEventBlockByType("init")) {
			initEventIndices.push(i);
		}
	}, this);

	// compile runBlocks
	var runBlocksCode = "";
	if (runBlocks) {
		var rule = new A3a.vpl.Rule();
		var initBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("init"), null, null);
		rule.setBlock(initBlock, null, null);
		runBlocks.forEach(function (block) {
			rule.setBlock(block, null, null);
		});
		runBlocksCode = this.generateCodeForEventHandler(rule).statement;
	}

	if (usesCond) {
		initVarDecl.unshift("var cond0;\nvar cond;\n");
		initCodeExec.unshift("cond0 = [];\n");
	}

	// build program from fragments:
	// init fragments (var declarations first, then code)
	var str = initVarDecl.length > 0 ? "\n" + initVarDecl.join("\n") : "";
	if (runBlocks) {
		str += "\n" + runBlocksCode;
	} else {
		var strInit = "";
		if (initCodeExec.length > 0) {
			strInit += "\n" + initCodeExec.join("\n");
		}
		// init implicit event
		for (var i = 0; i < program.program.length; i++) {
			if (initEventIndices.indexOf(i) >= 0 && c[i].statement) {
				strInit += (strInit.length > 0 ? "\n" : "") +
					(c[i].sectionBegin || "") + (c[i].statement || "") + (c[i].sectionEnd || "");
			}
		}
		if (strInit) {
			str += (str.length > 0 ? "\n" : "") +
				"this.addEventListener(\"init\", function (name, param) {\n" +
				strInit.slice(1) +	// skip initial linefeed
				"});\n";
		}
	}
	// init fragments defining sub and onevent
	if (initCodeDecl.length > 0) {
		throw "internal error, unsupported sub/onevent in js";
	}
	// explicit events
	for (var i = 0; i < program.program.length; i++) {
		if (initEventIndices.indexOf(i) < 0 && c[i].statement) {
			str += "\n";
			str += (c[i].sectionBegin || "") + (c[i].clauseInit || "") + (c[i].statement || "") + (c[i].sectionEnd || "");
		}
	}
	// remove initial lf
	if (str[0] === "\n") {
		str = str.slice(1);
	}

	// pretty-print (fix indenting)
	var indent = 0;
	var lines = str
		.split("\n")
		.map(function (line) { return line.trim(); })
		.map(function (line) {
			var line1 = A3a.vpl.CodeGenerator.Mark.remove(line);
			if (line1.length > 0) {
				var preDec = line1[0] === "}";
				var postInc = line1.slice(-1) === "{";
				if (preDec) {
					indent = Math.max(indent - 1, 0);
				}
				line = "\t\t\t\t\t".slice(0, indent) + line;
				if (postInc) {
					indent++;
				}
			}
			return line;
		});
	// align comments with following line
	for (var i = lines.length - 2; i >= 0; i--) {
		if (/^\s*#/.test(lines[i])) {
			var nextLineInitialBlanks = lines[i + 1].replace(/^(\s*).*$/, "$1");
			lines[i] = nextLineInitialBlanks + lines[i].replace(/^\s*/, "");
		}
	}
	str = lines.join("\n");

	// check duplicate events
	for (var i = 0; i < program.program.length; i++) {
		for (var j = i + 1; j < program.program.length; j++) {
			program.program[i].checkConflicts(program.program[j]);
		}
	}

	// extract marks
	str = A3a.vpl.CodeGenerator.Mark.extract(this.marks, str);

	return str;
};

/**
	@inheritDoc
*/
A3a.vpl.CodeGeneratorJS.prototype.generateMissingCodeForBlock = function (block) {
	var code = "// missing JavaScript implementation for block " + block.blockTemplate.name + "\n";
	switch (block.blockTemplate.type) {
	case A3a.vpl.blockType.event:
	case A3a.vpl.blockType.state:
		return {
			clauseInit: code,
			clause: "true"
		};
	case A3a.vpl.blockType.action:
		return {
			statement: code
		};
	default:
		return {};
	}
};

A3a.vpl.Program.codeGenerator["js"] = new A3a.vpl.CodeGeneratorJS();
