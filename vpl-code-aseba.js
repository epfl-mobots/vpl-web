/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Code generator for Aseba
	@constructor
	@extends {A3a.vpl.CodeGenerator}
*/
A3a.vpl.CodeGeneratorA3a = function () {
	A3a.vpl.CodeGenerator.call(this, "aseba", "and");
};
A3a.vpl.CodeGeneratorA3a.prototype = Object.create(A3a.vpl.CodeGenerator.prototype);
A3a.vpl.CodeGeneratorA3a.prototype.constructor = A3a.vpl.CodeGeneratorA3a;

/**
	@inheritDoc
*/
A3a.vpl.CodeGeneratorA3a.prototype.generate = function (program, runBlocks) {
	this.reset();
	var c = program.program.map(function (eh) {
		return this.generateCodeForEventHandler(eh);
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
			statement = "when " + evCode.clause + " do\n" + statement + "end\n";
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
	var runBlocksCodeStatement = "";
	if (runBlocks) {
		var eh = new A3a.vpl.EventHandler();
		var initBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("init"), null, null);
		eh.setBlock(initBlock, null, null);
		runBlocks.forEach(function (block) {
			eh.setBlock(block, null, null);
		});
		var runBlocksCode = this.generateCodeForEventHandler(eh);
		// check if initVarDecl and initCodeDecl are defined in the main program
		var runBlockPrerequisite = true;
		runBlocksCode.initVarDecl.forEach(function (fr) {
			if (initVarDecl.indexOf(fr) < 0) {
				runBlockPrerequisite = false;
			}
		});
		runBlocksCode.initCodeDecl.forEach(function (fr) {
			if (initCodeDecl.indexOf(fr) < 0) {
				runBlockPrerequisite = false;
			}
		});
		if (runBlockPrerequisite) {
			// yes, run same code as usual
			runBlocksCodeStatement = runBlocksCode.statement;
		} else if (runBlocksCode.statementWithoutInit) {
			runBlocksCodeStatement = runBlocksCode.statementWithoutInit;
		}
	}

	// build program from fragments:
	// init fragments (var declarations first, then code, without sub/onevent)
	var str = initVarDecl.length > 0 ? "\n" + initVarDecl.join("\n") : "";
	if (runBlocks) {
		str += "\n" + runBlocksCodeStatement;
	} else {
		if (initCodeExec.length > 0) {
			str += "\n" + initCodeExec.join("\n");
		}
		// init implicit event
		for (var i = 0; i < program.program.length; i++) {
			if (initEventIndices.indexOf(i) >= 0 && c[i].statement) {
				str += "\n";
				str += (c[i].sectionBegin || "") + (c[i].statement || "") + (c[i].sectionEnd || "");
			}
		}
	}
	// init fragments defining sub and onevent
	if (initCodeDecl.length > 0) {
		str += "\n" + initCodeDecl.join("\n");
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
			function startsWithAnyOf(a) {
				var line1 = A3a.vpl.CodeGenerator.Mark.remove(line);
				for (var i = 0; i < a.length; i++) {
					if (line1.slice(0, a[i].length) === a[i]
						&& !/^\w/.test(line1.slice(a[i].length))) {
						return true;
					}
				}
				return false;
			}
			if (line.length > 0) {
				var preDec = startsWithAnyOf(["else", "elseif", "end", "onevent", "sub"]);
				var postInc = startsWithAnyOf(["if", "for", "onevent", "sub", "when", "while"]);
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
A3a.vpl.CodeGeneratorA3a.prototype.generateMissingCodeForBlock = function (block) {
	var code = "# missing Aseba implementation for block " + block.blockTemplate.name + "\n";
	switch (block.blockTemplate.type) {
	case A3a.vpl.blockType.event:
	case A3a.vpl.blockType.state:
		return {
			clauseInit: code,
			clause: "1 == 1",
			sectionPriority: 1
		};
	case A3a.vpl.blockType.action:
		return {
			statement: code
		};
	default:
		return {};
	}
};

A3a.vpl.Program.codeGenerator["aseba"] = new A3a.vpl.CodeGeneratorA3a();
