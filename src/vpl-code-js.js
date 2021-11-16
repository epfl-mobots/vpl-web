/*
	Copyright 2018-2021 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
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
	// generate code fragments for all rules
	this.reset();
	var c = program.program.map(function (rule) {
		return this.generateCodeForEventHandler(rule, program);
	}, this);

	// get all sections
	var sections = {};	// key = sectionBegin
	var sectionList = [];	// list of sectionBegin strings to preserve order
	c.forEach(function (evCode) {
		if (evCode.sectionBegin) {
			sections[evCode.sectionBegin] = {
				sectionBegin: evCode.sectionBegin,
				sectionEnd: evCode.sectionEnd,
				sectionPreamble: evCode.sectionPreamble,
				clauseInit: "",
				clauseAssignment: ""
			};
			if (sectionList.indexOf(evCode.sectionBegin) < 0) {
				sectionList.push(evCode.sectionBegin);
			}
		}
		if (evCode.auxSectionBegin) {
			evCode.auxSectionBegin.forEach(function (sectionBegin, i) {
				sections[sectionBegin] = {
					sectionBegin: sectionBegin,
					sectionEnd: evCode.auxSectionEnd[i],
					sectionPreamble: evCode.auxSectionPreamble[i],
					clauseInit: "",
					clauseAssignment: ""
				};
				if (sectionList.indexOf(sectionBegin) < 0) {
					sectionList.push(sectionBegin);
				}
			});
		}
	});

	// collect code fragments
	/** @type {Array.<string>} */
	var initVarDecl = [];
	/** @type {Array.<string>} */
	var initCodeExec = [];
	/** @type {Array.<string>} */
	var initCodeDecl = [];
	/** @type {Array.<string>} */
	var clauses = [];

	// initialization code
	var initCodeFragments = this.getInitCode();
	if (initCodeFragments) {
		initCodeFragments.initVarDecl && initCodeFragments.initVarDecl.forEach(function (fr) {
			if (initVarDecl.indexOf(fr) < 0) {
				initVarDecl.push(fr);
			}
		});
		initCodeFragments.initCodeExec && initCodeFragments.initCodeExec.forEach(function (fr) {
			if (initCodeExec.indexOf(fr) < 0) {
				initCodeExec.push(fr);
			}
		});
		initCodeFragments.initCodeDecl && initCodeFragments.initCodeDecl.forEach(function (fr) {
			if (initCodeDecl.indexOf(fr) < 0) {
				initCodeDecl.push(fr);
			}
		});
	}

	// code for each rule
	/** @type {Array.<number>} */
	var initEventIndices = [];
	var nextCond = 0;
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
				"if (cond && !cond0[" + nextCond + "]) {\n" +
				statement +
				"}\n" +
				"cond0[" + nextCond + "] = cond;\n";
			nextCond++;
		}
		if (evCode.sectionBegin) {
			evCode.clauseIndex = clauses.indexOf(A3a.vpl.CodeGenerator.Mark.remove(evCode.clause || evCode.sectionBegin));
			if (evCode.clauseIndex < 0) {
				// first time this exact clause is found
				evCode.clauseIndex = clauses.length;
				clauses.push(A3a.vpl.CodeGenerator.Mark.remove(evCode.clause || evCode.sectionBegin));

				var section = sections[evCode.sectionBegin];
				if (evCode.clauseInit && section.clauseInit.indexOf(evCode.clauseInit) < 0) {
					// concat all clauseInit fragments without duplicates
					section.clauseInit += evCode.clauseInit;
				}
				if (evCode.clause) {
					section.clauseAssignment +=
						"cond = " + evCode.clause + ";\n" +
							"if (cond && !cond0[" + nextCond + "]) {\n" +
							"eventCache[" + evCode.clauseIndex + "] = true;\n" +
							"}\n" +
							"cond0[" + nextCond + "] = cond;\n"
					nextCond++;
				} else {
					section.clauseAssignment += "eventCache[" + evCode.clauseIndex + "] = true;\n";
				}
			}
		}
		if (!evCode.sectionBegin) {
			evCode.statement = this.bracket(statement, program.program[i]);
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
		rule.setBlock(initBlock, null, null, null);
		runBlocks.forEach(function (block) {
			rule.setBlock(block, null, null, null);
		});
		runBlocksCode = this.generateCodeForEventHandler(rule, program).statement;
	}

	// collect action code
	/** @type {Array.<string>} */
	var auxClausesInit = [];
	var actionsTestCode = "";
	var actionsExecCode = "";
	var actionTestCount = 0;
	for (var i = 0; i < program.program.length; i++) {
		if (c[i].clauseIndex >= 0) {
			c[i].auxClausesInit && c[i].auxClausesInit.forEach(function (cl) {
				if (auxClausesInit.indexOf(cl) < 0) {
					auxClausesInit.push(cl);
				}
			});
			actionsTestCode += "if (eventCache[" + c[i].clauseIndex + "]" +
				(c[i].auxClauses ? " && " + c[i].auxClauses : "") +
				") {\n" +
				"todo[" + actionTestCount + "] = true;\n" +
				"}\n";
			actionsExecCode += "if (todo[" + actionTestCount + "]) {\n" +
				c[i].statement +
				"}\n";
			actionTestCount++;
		} else if (c[i].auxClauses) {
			actionsTestCode += "cond = " + c[i].auxClauses + ";\n" +
				"if (cond && !cond0[" + nextCond + "]) {\n" +
				"todo[" + actionTestCount + "] = true;\n" +
				"}\n" +
				"cond0[" + nextCond + "] = cond;\n";
			nextCond++;
			actionsExecCode += "if (todo[" + actionTestCount + "]) {\n" +
				c[i].statement +
				"}\n";
			actionTestCount++;
		}
	}

	if (nextCond > 0) {
		initVarDecl.unshift("var cond0;\nvar cond;\n");
		initCodeExec.unshift("cond0 = [];\n");
	}

	// build program from fragments:
	// init fragments (var declarations first, then code)
	var str = initVarDecl.length > 0 ? "\n" + initVarDecl.join("\n") : "";
	if (clauses.length > 0) {
		str += "var eventCache = [];\n"
	}
	if (actionTestCount > 0) {
		str += "var todo = [];\n";
	}
	if (runBlocks) {
		str += "\n" + runBlocksCode;
	} else {
		var strInit = "";
		if (initCodeExec.length > 0) {
			strInit += "\n" + initCodeExec.join("\n");
		}
		// timer1 for actions
		if (actionsTestCode) {
			strInit += "this.setTimer(1, 0.1, true);\n";
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
	for (var i = 0; i < sectionList.length; i++) {
		if (sections[sectionList[i]].sectionPreamble ||
			sections[sectionList[i]].clauseInit ||
			sections[sectionList[i]].clauseAssignment) {
			str += "\n" +
				(sections[sectionList[i]].sectionBegin || "") +
				(sections[sectionList[i]].sectionPreamble || "") +
				(sections[sectionList[i]].clauseInit || "") +
				(sections[sectionList[i]].clauseAssignment || "") +
				(sections[sectionList[i]].sectionEnd || "");
		}
	}
	// add onevent timer1
	if (actionsTestCode) {
		str += "\nthis.addEventListener(\"timer1\", function (name, param) {\n" + auxClausesInit.join("") + actionsTestCode + actionsExecCode;
		for (var i = 0; i < clauses.length; i++) {
			str += "eventCache[" + i + "] = false;\n";
		}
		for (var i = 0; i < actionTestCount; i++) {
			str += "todo[" + i + "] = false;\n";
		}
	}
	if (str.trim().length > 0) {
		str += "});";
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
A3a.vpl.CodeGeneratorJS.prototype.generateMissingCodeForBlock = function (block, program) {
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
