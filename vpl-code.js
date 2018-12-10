/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Code generator base class
	@constructor
	@param {string} language language name
	@param {string} andOperator
*/
A3a.vpl.CodeGenerator = function (language, andOperator) {
	this.language = language;
	this.andOperator = andOperator;

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

/** Generate code for an event handler
	@param {A3a.vpl.EventHandler} eventHandler
	@return {A3a.vpl.compiledCode}
*/
A3a.vpl.CodeGenerator.prototype.generateCodeForEventHandler = function (eventHandler) {
	if (eventHandler.disabled || eventHandler.isEmpty()) {
		return {};
	}

	// check errors
	eventHandler.error = null;
	var hasEvent = false;
	for (var i = 0; i < eventHandler.events.length; i++) {
		if (!eventHandler.events[i].disabled &&
			eventHandler.events[i].blockTemplate.type === A3a.vpl.blockType.event) {
			hasEvent = true;
			if (eventHandler.events[i].blockTemplate.validate) {
				var err = eventHandler.events[i].blockTemplate.validate(eventHandler.events[i]);
				if (err) {
					err.addEventError([i]);
					if (!err.isWarning || !eventHandler.error) {
						eventHandler.error = err;
					}
					if (!err.isWarning) {
						return {error: err};
					}
				}
			}
		}
	}
	var hasAction = false;
	for (var i = 0; i < eventHandler.actions.length; i++) {
		if (!eventHandler.actions[i].disabled &&
			eventHandler.actions[i].blockTemplate.type === A3a.vpl.blockType.action) {
			hasAction = true;
			break;
		}
	}
	if (!hasEvent && !hasAction) {
		return {};
	}
	if (!hasEvent) {
		var err = new A3a.vpl.Error("Missing event block");
		err.addEventError([]);
		eventHandler.error = err;
		return {error: err};
	}
	if (!hasAction) {
		var err = new A3a.vpl.Error("Missing action block");
		err.addActionError(0);
		eventHandler.error = err;
		return {error: err};
	} else {
		for (var i = 0; i < eventHandler.actions.length; i++) {
			for (var j = i + 1; j < eventHandler.actions.length; j++) {
				if (eventHandler.actions[j].blockTemplate.type === A3a.vpl.blockType.action &&
					eventHandler.actions[j].blockTemplate === eventHandler.actions[i].blockTemplate) {
					var err = new A3a.vpl.Error("Duplicate action blocks", true);
					err.addActionError(i);
					err.addActionError(j);
					eventHandler.error = err;
					return {error: err};
				}
			}
		}
	}

	// find the event with the highest sectionPriority, check compatibility
	// and collect init code
	var priIx = -1;
	var priEv = null;
	var priPri = -1;
	/** @typedef {Array.<number>} */
	var clauseless = [];
	/** @typedef {Array.<string>} */
	var initVarDecl = [];
	/** @typedef {Array.<string>} */
	var initCodeExec = [];
	/** @typedef {Array.<string>} */
	var initCodeDecl = [];
	/** @type {Array.<string>} */
	var clauses = [];
	var clauseInit = "";
	eventHandler.events.forEach(function (event, i) {
		var code = event.generateCode(this.language);
		if (code.sectionPriority > priPri) {
			priPri = code.sectionPriority;
			priIx = i;
			priEv = event;
		}
		if (code.clause) {
			clauses.push(this.bracket(code.clause, event));
			if (code.clauseInit) {
				clauseInit += code.clauseInit;
			}
		} else if (code.sectionBegin) {
			clauseless.push(i);
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
	}, this);
	if (clauseless.length > 1) {
		var err = new A3a.vpl.Error("Incompatible events in the same rule");
		err.addEventError(clauseless);
		eventHandler.error = err;
		return {error: err};
	}

	var clause = clauses.length === 0 ? ""
		: clauses.length === 1 ? clauses[0]
		: clauses.map(function (c) { return "(" + c + ")"; }).join(" " + this.andOperator + " ");
	var str = "";
	for (var i = 0; i < eventHandler.actions.length; i++) {
		var code = eventHandler.actions[i].generateCode(this.language);
		str += code.statement ? this.bracket(code.statement, eventHandler.actions[i]) : "";
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
	if (priEv && str.length > 0) {
		var eventCode = priEv.generateCode(this.language);
		return {
			initVarDecl: initVarDecl,
			initCodeExec: initCodeExec,
			initCodeDecl: initCodeDecl,
			sectionBegin: eventCode.sectionBegin,
			sectionEnd: eventCode.sectionEnd,
			clauseInit: clauseInit,
			clause: clause,
			statement: (eventCode.statement || "") + str
		};
	} else {
		return {};
	}
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
	@return {A3a.vpl.compiledCode}
*/
A3a.vpl.CodeGenerator.prototype.generateMissingCodeForBlock = function (block) {
	throw "internal";	// base class method shouldn't be called
};
