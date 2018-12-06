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
			clauses.push(code.clause);
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
		str += code.statement || "";
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

/** Generate code for the whole program
	@param {A3a.vpl.Program} program
	@param {Array.<A3a.vpl.Block>=} runBlocks if defined, override the initialization
	code
	@return {string}
*/
A3a.vpl.CodeGenerator.prototype.generate = function (program, runBlocks) {
	throw "internal";	// base class method shouldn't be called
};
