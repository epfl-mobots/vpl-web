/*
	Copyright 2019-2021 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Definition of class A3a.vpl.CodeGeneratorA3a (a subclass of
A3a.vpl.CodeGenerator), which generate Python source code from a VPL3 program.

*/

/** Code generator for Python
	@constructor
	@extends {A3a.vpl.CodeGenerator}
*/
A3a.vpl.CodeGeneratorPython = function () {
	A3a.vpl.CodeGenerator.call(this, "python", "and", "True");
};
A3a.vpl.CodeGeneratorPython.prototype = Object.create(A3a.vpl.CodeGenerator.prototype);
A3a.vpl.CodeGeneratorPython.prototype.constructor = A3a.vpl.CodeGeneratorPython;

/**
	@inheritDoc
*/
A3a.vpl.CodeGeneratorPython.prototype.generate = function (program, runBlocks) {
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
	var nextCond = 0;

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
						"cond = " + evCode.clause + "\n" +
						"if cond and not cond0[" + nextCond + "]:\n" +
						"eventCache[" + evCode.clauseIndex + "] = True\n" +
						"<\n" +
						"cond0[" + nextCond + "] = cond\n";
					nextCond++;
				} else {
					section.clauseAssignment +=
						"eventCache[" + evCode.clauseIndex + "] = True\n";
				}
			}
		}
		if (!evCode.sectionBegin) {
			evCode.statement = this.bracket(evCode.statement || "", program.program[i]);
		}
	}, this);

	// compile runBlocks
	var runBlocksCodeStatement = "";
	if (runBlocks) {
		var rule = new A3a.vpl.Rule();
		var initBlock = new A3a.vpl.Block(A3a.vpl.BlockTemplate.findByName("init"), null, null);
		rule.setBlock(initBlock, null, null, null);
		runBlocks.forEach(function (block) {
			rule.setBlock(block, null, null, null);
		});
		var runBlocksCode = this.generateCodeForEventHandler(rule, program);
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

	if (nextCond > 0) {
		initCodeExec.unshift("cond0 = " + nextCond + " * [False]\n");
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
			actionsTestCode += "if eventCache[" + c[i].clauseIndex + "]" +
				(c[i].auxClauses ? " and " + c[i].auxClauses : "") +
				":\n" +
				"todo[" + actionTestCount + "] = True\n" +
				"<\n";
			actionsExecCode += "if todo[" + actionTestCount + "]:\n" +
				c[i].statement +
				"<\n";
			actionTestCount++;
		} else if (c[i].auxClauses) {
			actionsTestCode += "cond = " + c[i].auxClauses + "\n" +
				"if cond and not cond0[" + i + "]:\n" +
				"todo[" + actionTestCount + "] = 1\n" +
				"<\n" +
				"cond0[" + i + "] = cond\n";
			actionsExecCode += "if todo[" + actionTestCount + "]:\n" +
				c[i].statement +
				"<\n";
			actionTestCount++;
		}
	}

	// build program from fragments:
	// init fragments (var declarations first, then code)
	var str = initVarDecl.length > 0 ? initVarDecl.join("\n") : "";
	if (clauses.length > 0) {
		str += "eventCache = " + clauses.length + " * [False]\n"
	}
	if (actionTestCount > 0) {
		str += "todo = " + actionTestCount + " * [False]\n";
	}
	if (runBlocks) {
		str += "\n" + runBlocksCode;
	} else {
		if (initCodeExec.length > 0) {
			str += "\n" + initCodeExec.join("\n");
		}
		// timer1 for actions
		if (actionsTestCode) {
			str += (str.length > 0 ? "\n" : "") + "timer_period[1] = 50\n";
		}
	}
	// init event (not onevent, hence placed before initCodeDecl)
	for (var i = 0; i < sectionList.length; i++) {
		if (!/onevent/.test(sections[sectionList[i]].sectionBegin) &&
			(sections[sectionList[i]].sectionPreamble ||
				sections[sectionList[i]].clauseInit ||
				sections[sectionList[i]].clauseAssignment)) {
			str += "\n" +
				(sections[sectionList[i]].sectionBegin || "") +
				(sections[sectionList[i]].sectionPreamble || "") +
				(sections[sectionList[i]].clauseInit || "") +
				(sections[sectionList[i]].clauseAssignment || "") +
				(sections[sectionList[i]].sectionEnd || "");
		}
	}
	// volume
	str += this.generateCodeForVolume(program);
	// init fragments defining sub and onevent
	if (initCodeDecl.length > 0) {
		str += "\n" + initCodeDecl.join("\n");
	}
	// explicit events (real onevent, not init)
	for (var i = 0; i < sectionList.length; i++) {
		if (/onevent/.test(sections[sectionList[i]].sectionBegin) &&
			(sections[sectionList[i]].sectionPreamble ||
				sections[sectionList[i]].clauseInit ||
				sections[sectionList[i]].clauseAssignment)) {
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
		str += "\n@onevent\n" +
			"def timer1():\n" +
			auxClausesInit.join("") +
			actionsTestCode +
			actionsExecCode;
		for (var i = 0; i < clauses.length; i++) {
			str += "eventCache[" + i + "] = False\n";
		}
		for (var i = 0; i < actionTestCount; i++) {
			str += "todo[" + i + "] = False\n";
		}
		str += "<\n";
	}
	// remove initial lf
	if (str[0] === "\n") {
		str = str.slice(1);
	}

	// pretty-print (fix indenting)
	str = A3a.vpl.CodeGenerator.Mark.remove(str);	// incompatible for the moment
	str = str.replace(/\n[ \t]+/g, "\n").replace(/\n<\n\n<\n/g, "\n<\n<\n");
	var indent = 0;
	var prog = "";
	str
		.split("\n")
		.map(function (line) { return line.trim(); })
		.forEach(function (line) {
			var line1 = A3a.vpl.CodeGenerator.Mark.remove(line);
			if (line1.length > 0) {
				var preDec = line1 === "<";
				var postInc = line1.slice(-1) === ":";
				if (preDec) {
					indent = Math.max(indent - 1, 0);
				}
				if (line1 !== "<") {
					line = "\t\t\t\t\t".slice(0, indent) + line;
					if (postInc) {
						indent++;
					}
				}
			}
			if (line1 !== "<") {
				prog += line + "\n";
			}
		});
	str = prog;

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
A3a.vpl.CodeGeneratorPython.prototype.generateMissingCodeForBlock = function (block, program) {
	var code = "# missing Python implementation for block " + block.blockTemplate.name + "\npass\n";
	switch (block.blockTemplate.type) {
	case A3a.vpl.blockType.event:
	case A3a.vpl.blockType.state:
		return {
			clauseInit: code,
			clause: "True"
		};
	case A3a.vpl.blockType.action:
		return {
			statement: code
		};
	default:
		return {};
	}
};

A3a.vpl.Program.codeGenerator["python"] = new A3a.vpl.CodeGeneratorPython();
