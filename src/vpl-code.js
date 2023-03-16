/*
	Copyright 2018-2023 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Definition of class A3a.vpl.CodeGenerator, the base class of classes
which generate source code from a VPL3 program. Subclassed for specific
programming languages such as Aseba or L2.

*/

/** Code generator base class
	@constructor
	@param {string} language language name
	@param {string} andOperator
	@param {string} trueConstant
*/
A3a.vpl.CodeGenerator = function (language, andOperator, trueConstant) {
	this.language = language;
	this.andOperator = andOperator;
	this.trueConstant = trueConstant;

	// state during code production
	/** @type {Array.<A3a.vpl.CodeGenerator.Mark>} */
	this.marks = [];
};

/** Mark in generated code
	@constructor
	@param {number} id
	@param {Object} ref
	@param {boolean} isBegin true for begin, false for end
*/
A3a.vpl.CodeGenerator.Mark = function (id, ref, isBegin) {
	this.id = id;
	this.ref = ref;
	this.isBegin = isBegin;
	if (id < 0 || id > 0xf8ff - 0xe000) {
		throw "internal";	// unicode private use area exhausted
	}
	this.str = String.fromCharCode(0xe000 + id);
	this.pos = -1;	// cached position in code
};

/** Find mark in generated code
	@param {string} code generated code
	@return index in generated code (before removal)
*/
A3a.vpl.CodeGenerator.Mark.prototype.findInCode = function (code) {
	return code.indexOf(this.str);
};

/** Find mark positions (in code without marks) and leave them
	@param {string} code generated code
	@return {Array.<A3a.vpl.CodeGenerator.Mark>}
*/
A3a.vpl.CodeGenerator.Mark.getMarksInCode = function (code) {
	/** @type {Array.<A3a.vpl.CodeGenerator.Mark>} */
	var marks = [];

	// find marks (ignore ref and isBegin)
	for (var i = 0; i < code.length; i++) {
		if (code.charCodeAt(i) >= 0xe000 && code.charCodeAt(i) <= 0xf8ff) {
			var mark = new A3a.vpl.CodeGenerator.Mark(code.charCodeAt(i) - 0xe000, null, false);
			mark.pos = i - marks.length;
			marks.push(mark);
		}
	}

	return marks;
};

/** Find mark positions (in code without marks) and remove them
	@param {Array.<A3a.vpl.CodeGenerator.Mark>} a
	@param {string} code generated code
	@return {string} code without marks
*/
A3a.vpl.CodeGenerator.Mark.extract = function (a, code) {
	// get positions once
	a.forEach(function (mark) {
		mark.pos = mark.findInCode(code);
	});

	// sort by position
	a.sort(function (a, b) {
		return a.pos - b.pos;
	});

	// adjust marks and remove them in generated code
	for (var i = 0; i < a.length; i++) {
		a[i].pos -= i;
		code = code.replace(a[i].str, "");
	}

	// move marks on eols where appropriate
	a.forEach(function (mark) {
		/** @type {number} */
		var i;
		if (mark.isBegin) {
			// move beginning of span past eol
			while (true) {
				for (i = mark.pos; code[i] === " " || code[i] === "\t"; i++) {}
				if (code[i] === "\n") {
					mark.pos = i + 1;
				} else {
					break;
				}
			}
			// include leading spaces at beginning of line
			if (code[mark.pos - 1] === " " || code[mark.pos - 1] === "\t") {
				for (i = mark.pos - 1; code[i] === " " || code[i] === "\t"; i--) {}
				if (code[i] === "\n") {
					mark.pos = i + 1;
				}
			}
		} else {
			// exclude leading spaces
			if (code[mark.pos - 1] === " " || code[mark.pos - 1] === "\t") {
				for (i = mark.pos - 1; code[i] === " " || code[i] === "\t"; i--) {}
				if (code[i] === "\n") {
					mark.pos = i + 1;
				}
			}
		}
	});

	return code;
};

/** Remove marks from string
	@param {string} code
	@return {string}
*/
A3a.vpl.CodeGenerator.Mark.remove = function (code) {
	return code.replace(/[\ue000-\uf8ff]/g, "");
};

/** Bracket code fragment with marks
	@param {string} code
	@param {Object} ref
*/
A3a.vpl.CodeGenerator.prototype.bracket = function (code, ref) {
	var id = this.marks.length;
	var mark1 = new A3a.vpl.CodeGenerator.Mark(id, ref, true);
	this.marks.push(mark1);
	var mark2 = new A3a.vpl.CodeGenerator.Mark(id + 1, ref, false);
	this.marks.push(mark2);
	return mark1.str + code + mark2.str;
};

/** Find mark
	@param {Object} ref
	@param {boolean} isBegin true for begin, false for end
	@return {number} position, or -1 if not found
*/
A3a.vpl.CodeGenerator.prototype.findMark = function (ref, isBegin) {
	for (var i = 0; i < this.marks.length; i++) {
		if (this.marks[i].ref === ref && this.marks[i].isBegin === isBegin) {
			return this.marks[i].pos;
		}
	}
	return -1;
};

/** Generate code for a rule
	@param {A3a.vpl.Rule} rule
	@param {A3a.vpl.Program} program
	@return {A3a.vpl.compiledCode}
*/
A3a.vpl.CodeGenerator.prototype.generateCodeForEventHandler = function (rule, program) {
	if (rule.disabled || rule.isEmpty()) {
		return {};
	}

	// check errors
	rule.error = null;
	var hasEvent = false;
	var hasState = false;
	for (var i = 0; i < rule.events.length; i++) {
		if (!rule.events[i].disabled) {
			if (rule.events[i].blockTemplate.type === A3a.vpl.blockType.event) {
				hasEvent = true;
				if (rule.events[i].blockTemplate.validate) {
					var err = rule.events[i].blockTemplate.validate(rule.events[i]);
					if (err) {
						err.addEventError([i]);
						if (!err.isWarning || !rule.error) {
							rule.error = err;
							if (!err.isWarning) {
								return {error: err};
							}
						}
					}
				}
			} else if (rule.events[i].blockTemplate.type === A3a.vpl.blockType.state) {
				hasState = true;
			}
			if ((rule.events[i].blockTemplate.type === A3a.vpl.blockType.event ||
				rule.events[i].blockTemplate.type === A3a.vpl.blockType.state) &&
					rule.error === null) {
				for (var j = i + 1; j < rule.events.length; j++) {
					if (!rule.events[j].disabled &&
						rule.events[j].blockTemplate === rule.events[i].blockTemplate) {
							var err = new A3a.vpl.Error("Same block used multiple times",
								true);
							err.addEventError([i, j]);
							rule.error = err;
						}
				}
			}
		}
	}
	var hasAction = false;
	for (var i = 0; i < rule.actions.length; i++) {
		if (!rule.actions[i].disabled &&
			rule.actions[i].blockTemplate.type === A3a.vpl.blockType.action) {
			hasAction = true;
			break;
		}
	}
	if (!hasEvent && !hasAction) {
		return rule.error ? {error: rule.error} : {};
	}
	if (!hasEvent && !hasState) {
		var err = new A3a.vpl.Error("Missing event block");
		err.addEventError([]);
		rule.error = err;
		return {error: err};
	}
	if (!hasAction) {
		var err = new A3a.vpl.Error("Missing action block");
		err.addActionError(0);
		rule.error = err;
		return {error: err};
	} else if (!rule.error) {
		for (var i = 0; i < rule.actions.length; i++) {
			if (!rule.actions[i].disabled) {
				for (var j = i + 1; j < rule.actions.length; j++) {
					if (!rule.actions[j].disabled &&
						rule.actions[j].blockTemplate.type === A3a.vpl.blockType.action &&
						rule.actions[j].blockTemplate === rule.actions[i].blockTemplate) {
						var err = new A3a.vpl.Error("Same block used multiple times", true);
						err.addActionError(i);
						err.addActionError(j);
						rule.error = err;
					}
				}
			}
		}
	}

	// collect init code
	/** @type {Array.<string>} */
	var initVarDecl = [];
	/** @type {Array.<string>} */
	var initCodeExec = [];
	/** @type {Array.<string>} */
	var initCodeDecl = [];
	/** @type {string} */
	var clause = "";
	/** @type {Array.<string>} */
	var auxClauses = [];
	/** @type {string} */
	var clauseInit = "";
	/** @type {Array.<string>} */
	var auxClausesInit = [];
	var clauseAlwaysEval = false;
	var str = "";
	rule.events.forEach(function (event, i) {
		var code = event.generateCode(this.language, program);
		if (i === 0 && code.sectionBegin) {
			if (code.clause) {
				clause = this.bracket(code.clause, event);
				if (code.clauseInit) {
					clauseInit += code.clauseInit;
				}
			}
			if (code.clauseAlwaysEval) {
				clauseAlwaysEval = true;
			}
		} else if (code.clauseAsCondition || code.clause) {
			auxClauses.push(this.bracket(/** @type {string} */(code.clauseAsCondition || code.clause), event));
			if (code.clauseInit) {
				auxClausesInit = auxClausesInit.concat(code.clauseInit);
			}
		}
		if (code.initVarDecl) {
			initVarDecl = initVarDecl.concat(code.initVarDecl);
		}
		if (code.initCodeExec) {
			initCodeExec = initCodeExec.concat(code.initCodeExec);
		}
		if (code.initCodeDecl) {
			initCodeDecl = initCodeDecl.concat(code.initCodeDecl);
		}
		if (code.statement) {
			str += this.bracket(code.statement, event);
		}
	}, this);

	for (var i = program.supportTracing ? -1 : 0; i < rule.actions.length; i++) {
		var block = i < 0 ? this.generateBlockForTracing(rule, program) : rule.actions[i];
		var code = block.generateCode(this.language, program);
		str += code.statement ? this.bracket(code.statement, block) : "";
		if (code.initVarDecl) {
			code.initVarDecl.forEach(function (frag) {
				if (initVarDecl.indexOf(frag) < 0) {
					initVarDecl.push(frag);
				}
			});
		}
		if (code.initCodeExec) {
			code.initCodeExec.forEach(function (frag) {
				if (initCodeExec.indexOf(frag) < 0) {
					initCodeExec.push(frag);
				}
			});
		}
		if (code.initCodeDecl) {
			code.initCodeDecl.forEach(function (frag) {
				if (initCodeDecl.indexOf(frag) < 0) {
					initCodeDecl.push(frag);
				}
			});
		}
	}
	if (str.length > 0) {
		var eventCode = rule.events[0].blockTemplate.type === A3a.vpl.blockType.event
			? rule.events[0].generateCode(this.language, program)
			: null;
		var auxEventCode = rule.events
			.slice(1)
			.filter(function (eb) { return eb.blockTemplate.type === A3a.vpl.blockType.event; })
			.map(function (eb) { return eb.generateCode(this.language, program); }, this);
		return {
			firstEventType: rule.events[0] ? rule.events[0].blockTemplate.name : "",
			initVarDecl: initVarDecl,
			initCodeExec: initCodeExec,
			initCodeDecl: initCodeDecl,
			sectionBegin: eventCode ? eventCode.sectionBegin : "",
			sectionEnd: eventCode ? eventCode.sectionEnd : "",
			sectionPreamble: eventCode ? eventCode.sectionPreamble : "",
			auxSectionBegin: auxEventCode.map(function (ec) { return ec.sectionBegin || ""; }),
			auxSectionEnd: auxEventCode.map(function (ec) { return ec.sectionEnd || ""; }),
			auxSectionPreamble: auxEventCode.map(function (ec) { return ec.sectionPreamble || ""; }),
			clauseInit: clauseInit,
			auxClausesInit: auxClausesInit,
			clause: clause,
			clauseAlwaysEval: clauseAlwaysEval,
			auxClauses: auxClauses.join(" " + this.andOperator + " "),
			statement: (eventCode && eventCode.statement || "") + str
		};
	} else {
		return {};
	}
};

/** Get initialization code
	@return {A3a.vpl.compiledCode}
*/
A3a.vpl.CodeGenerator.prototype.getInitCode = function () {
	var initBlockTemplate = A3a.vpl.BlockTemplate.findByName("!init");
	if (initBlockTemplate && initBlockTemplate.genCode[this.language]) {
		return initBlockTemplate.genCode[this.language](null);
	}
	return {};
};

/** Generate code to set volume
	@param {A3a.vpl.Program} program
	@return {string}
*/
A3a.vpl.CodeGenerator.prototype.generateCodeForVolume = function (program) {
	if (program.volume !== null) {
		var volumeTemplate = A3a.vpl.BlockTemplate.findByName("!volume");
		if (volumeTemplate !== null) {
			var block = new A3a.vpl.Block(volumeTemplate, null, null);
			block.param = [program.volume];
			var volumeGenCode = volumeTemplate && volumeTemplate.genCode[this.language];
			if (volumeGenCode) {
				return "\n" + volumeGenCode(block).statement;
			}
		}
	}
	return "";
};

/** Create block to trace rule execution
	@param {A3a.vpl.Rule} rule
	@param {A3a.vpl.Program} program
	@return {A3a.vpl.Block}
*/
A3a.vpl.CodeGenerator.prototype.generateBlockForTracing = function (rule, program) {
	var traceTemplate = A3a.vpl.BlockTemplate.findByName("!trace");
	var block = new A3a.vpl.Block(traceTemplate, null, null);
	var index = program.program.indexOf(rule);
	block.param = [index];
	return block;
};

/** Reset code generation
	@return {void}
*/
A3a.vpl.CodeGenerator.prototype.reset = function () {
	this.marks = [];
};

/** Generate code for the whole program
	@param {A3a.vpl.Program} program
	@param {Array.<A3a.vpl.Block>=} runBlocks if defined, override the initialization
	code
	@return {string}
*/
A3a.vpl.CodeGenerator.prototype.generate = function (program, runBlocks) {
	throw "internal";	// base class method shouldn't be called
};

/** Generate code block when the implementation is missing
	@param {A3a.vpl.Block} block
	@param {A3a.vpl.Program} program
	@return {A3a.vpl.compiledCode}
*/
A3a.vpl.CodeGenerator.prototype.generateMissingCodeForBlock = function (block, program) {
	throw "internal";	// base class method shouldn't be called
};
