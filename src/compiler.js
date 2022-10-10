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

Compiler from Aseba source code to Aseba VM bytecode.

*/

/** A3a node description (memory size, variables, events, native functions)
	@typedef {{
		"name": string,
		"maxVarSize": number,
		"variables": Array.<{
			"name": string,
			"size": number
		}>,
		"localEvents": Array.<{
			"name": string
		}>,
		"nativeFunctions": Array.<{
			"name": string,
			"args": Array.<number>
		}>
	}}
*/
A3a.nodeDescr;

/** Macro function definition
	(nArgs: number of scalar args, copied to contiguous temp array variable;
	nTmp: number of additional items in temp array variable;
	exists: check if enabled, e.g. if supporting native functions are available;
	resultTypePropagate: propagate types from args to result (default: int result)
	genCode: produce the byte code, taking input from temp array variable and
	leaving scalar result on the stack
	@typedef {{
		name: string,
		nArgs: number,
		nTmp: (number|undefined),
		exists: function(A3a.A3aNode):boolean,
		resultTypePropagate: (function (A3a.Compiler,A3a.Compiler.Node,Array.<A3a.Compiler.resultType>):A3a.Compiler.resultType | undefined),
		genCode: function(A3a.Compiler,A3a.A3aNode,Array.<A3a.Compiler.resultType>,number):Array.<number>
	}}
*/
A3a.macroFunctionDef;

/** A3a node context for compiler
	@constructor
	@param {A3a.nodeDescr} descr
*/
A3a.A3aNode = function (descr) {
	this.name = descr["name"];
	this.maxVarSize = descr["maxVarSize"];
	/** @type {Array.<A3a.Compiler.VariableDescr>} */
	this.variables = [];
	this.varSize = 0;
	for (var i = 0; i < descr["variables"].length; i++) {
		var d = new A3a.Compiler.VariableDescr(descr["variables"][i]["name"],
			descr["variables"][i]["size"],
			[1],
			this.varSize,
			A3a.Compiler.resultType.number);
		this.variables.push(d);
		this.varSize += descr["variables"][i]["size"];
	}
	/** @type {Array.<{id:number,name:string,args:Array.<number>}>} */
	this.nativeFunctions = descr["nativeFunctions"].map(function (f, i) {
		return {
			id: i,
			name: f["name"],
			args: f["args"]
		};
	});
	this.localEvents = descr["localEvents"].map(function (e) {
		return {
			name: e["name"]
		};
	});
};

/** Find id of native function specified by name
	@param {string} name
	@return {?{id:number,name:string,args:Array.<number>}}
*/
A3a.A3aNode.prototype.findNativeFunction = function (name) {
	for (var i = 0; i < this.nativeFunctions.length; i++) {
		if (this.nativeFunctions[i].name === name) {
			return this.nativeFunctions[i];
		}
	}
	return null;
};

/** Find description of variable specified by name
	@param {string} name
	@return {?A3a.Compiler.VariableDescr}
*/
A3a.A3aNode.prototype.findVariable = function (name) {
	for (var i = 0; i < this.variables.length; i++) {
		if (this.variables[i].name === name) {
			return this.variables[i];
		}
	}
	return null;
};

/** Find id of event specified by name
	@param {string} name
	@return {number}
*/
A3a.A3aNode.prototype.eventNameToId = function (name) {
	if (name === "init") {
		return 0xffff;
	}
	for (var i = 0; i < this.localEvents.length; i++) {
		if (this.localEvents[i].name === name) {
			return 0xfffe - i;
		}
	}
	throw "unknown local event " + name;
};

/**
	@constructor
	@param {A3a.A3aNode} asebaNode
	@param {string} src source code
*/
A3a.Compiler = function (asebaNode, src) {
	this.operators = A3a.Compiler.operators;
	this.floatLiteral = false;

	this.asebaNode = asebaNode;
	this.src = src;
	this.len = src.length;
	this.i = 0;
	this.line = 1;
	this.col = 0;

	/** @type {Array.<A3a.Compiler.TokenBase>} */
	this.tokens = [];
	this.tokenIndex = 0;	// used to parse tokens

	/** @type {Array.<A3a.Compiler.NodeStatement>} */
	this.statements = [];

	this.tree = null;

	/** @type {Array.<number>} */
	this.startupBytecode = [];
	/** @type {Array.<A3a.macroFunctionDef>} */
	this.functionLib = [];
	this.cst = {};
	/** @type {Array.<A3a.Compiler.VariableDescr>} */
	this.declaredVariables = [];
	/** @type {Array.<number>} */
	this.branches = [];
	// lowest index of permanent auxiliary variables currently allocated
	this.tempVariableBase0 = this.asebaNode.maxVarSize;
	// lowest index of temporary variables currently allocated
	this.tempVariableBase = this.tempVariableBase0;
	// true in sub definition, false in onevent definition
	this.inSubDefinition = false;
	// address of current bytecode fragment, used for goto and sourceToBCMapping
	this.bcAddr = 0;
	/** @type {Array.<{name:string,id:number,size:number}>} */
	this.userEvents = [];
	this.userEventCount = 0;

	/** @type {Array.<A3a.Compiler.SourceToBCMapping>} */
	this.sourceToBCMapping = [];
};

/** Define a user event and its data size
	@param {string} eventName
	@param {number=} eventSize
	@return {void}
*/
A3a.Compiler.prototype.addUserEvent = function (eventName, eventSize) {
	this.userEvents.push({
		name: eventName,
		id: this.userEventCount,
		size: eventSize || 0
	});
	this.userEventCount++;
};

/**
	@param {string} eventName
	@return {?{name:string,id:number,size:number}}
*/
A3a.Compiler.prototype.findUserEvent = function (eventName) {
	for (var i = 0; i < this.userEvents.length; i++) {
		if (this.userEvents[i].name === eventName) {
			return this.userEvents[i];
		}
	}
	return null;
};

/** Variable description
	@constructor
	@param {string} name
	@param {number} size
	@param {Array.<number>} dims
	@param {number} offset
	@param {A3a.Compiler.resultType} resultType
*/
A3a.Compiler.VariableDescr = function (name, size, dims, offset, resultType) {
	this.name = name;
	this.size = size;
	this.dims = dims;
	this.offset = offset;
	this.resultType = resultType;
};

/** Generate code to load the variable value
	@param {A3a.Compiler} compiler
	@param {number=} offset (default: none (0))
	@return {Array.<number>}
*/
A3a.Compiler.VariableDescr.prototype.generateA3aBCForLoad = function (compiler, offset) {
	return [(A3a.vm.bc.load << 12) | this.offset + (offset || 0)];
};

/** Generate code to store the variable value
	@param {A3a.Compiler} compiler
	@param {number=} offset (default: none (0))
	@return {Array.<number>}
*/
A3a.Compiler.VariableDescr.prototype.generateA3aBCForStore = function (compiler, offset) {
	return [(A3a.vm.bc.store << 12) | this.offset + (offset || 0)];
};

/** Generate code to load the variable value at indirect offset
	@param {A3a.Compiler} compiler
	@return {Array.<number>}
*/
A3a.Compiler.VariableDescr.prototype.generateA3aBCForLoadIndirect = function (compiler) {
	return [(A3a.vm.bc.loadIndirect << 12) | this.offset, this.size];
};

/** Generate code to store the variable value
	@param {A3a.Compiler} compiler
	@return {Array.<number>}
*/
A3a.Compiler.VariableDescr.prototype.generateA3aBCForStoreIndirect = function (compiler) {
	return [(A3a.vm.bc.storeIndirect << 12) | this.offset, this.size];
};

/** Skip blanks in source code
	@return {void}
*/
A3a.Compiler.prototype.skipBlanks = function () {
	while (this.i < this.len) {
		if (this.src[this.i] === " " || this.src[this.i] === "\t") {
			this.i++;
			this.col++;
		} else if (this.src[this.i] === "\n") {
			this.i++;
			this.col = 0;
			this.line++;
		} else if (this.src[this.i] === "\r") {
			this.i++;
		} else if (this.src.slice(this.i, this.i + 2) === "#*") {
			// skip block comment, until "*#"
			this.i += 2;
			this.col += 2;
			while (this.i < this.len && this.src.slice(this.i - 2, this.i) !== "*#") {
				if (this.src[this.i] === "\n") {
					this.col = 0;
					this.line++;
				} else if (this.src[this.i] !== "\r") {
					this.col++;
				}
				this.i++;
			}
		} else if (this.src[this.i] === "#") {
			// skip comment
			while (this.i < this.len && this.src[this.i] !== "\n") {
				this.i++;
				this.col++;
			}
		} else {
			break;
		}
	}
};

/** Reset stack of jump address resolution
	@return {void}
*/
A3a.Compiler.prototype.resetJumpResolution = function () {
	this.branches = [];
};

/** Prepare jump resolution by remembering its location for later finalization
	@param {Array.<number>} bytecode bytecode, where jump
	address is in last word in a conditional branch or a
	jump
	@return {void}
*/
A3a.Compiler.prototype.prepareJump = function (bytecode) {
	var addr = bytecode.length - 1;
	this.branches.push(addr);
};

/** Finalize a jump to the end of bytecode or to specified target
	@param {Array.<number>} bytecode
	@param {number=} target jump target (default: current end of bytecode)
	@return {void}
*/
A3a.Compiler.prototype.finalizeJump = function (bytecode, target) {
	if (this.branches.length === 0) {
		throw "internal";
	}
	if (target === undefined) {
		target = bytecode.length;
	}
	var i = this.branches.pop();
	if (bytecode[i] === (A3a.vm.bc.jump << 12)) {
		bytecode[i] += target - i & 0xfff;	// relative to i
	} else {
		bytecode[i] = target - i + 1 & 0xffff;	// relative to i-1
	}
};

/** Define a new constant
	@param {string} name
	@param {number} val
	@param {A3a.Compiler.resultType} resultType
	@return {void}
*/
A3a.Compiler.prototype.addConstant = function (name, val, resultType) {
	this.cst[name] = {
		val: val,
		resultType: resultType
	};
}

/** Check if a constant is defined
	@param {string} name
	@return {boolean}
*/
A3a.Compiler.prototype.hasConstant = function (name) {
	return this.cst.hasOwnProperty(name);
};

/** Get constant value
	@param {string} name
	@return {{val:number,resultType:A3a.Compiler.resultType}}}
*/
A3a.Compiler.prototype.getConstant = function (name) {
	return this.cst[name];
};

/** Define a new variable
	@param {string} name
	@param {number} size
	@param {Array.<number>} dims
	@param {number} offset
	@param {A3a.Compiler.resultType} resultType
	@return {void}
*/
A3a.Compiler.prototype.addVariable = function (name, size, dims, offset, resultType) {
	if (this.hasVariable(name)) {
		throw "duplicate variable declaration \"" + name + "\"";
	}
	this.declaredVariables.push(new A3a.Compiler.VariableDescr(name, size, dims, offset, resultType));
};

/** Check if a variable specified by name exists
	@param {string} name
	@return {boolean}
*/
A3a.Compiler.prototype.hasVariable = function (name) {
	for (var i = 0; i < this.declaredVariables.length; i++) {
		if (this.declaredVariables[i].name === name) {
			return true;
		}
	}
	for (var i = 0; i < this.asebaNode.variables.length; i++) {
		if (this.asebaNode.variables[i].name === name) {
			return true;
		}
	}
	return false;
};

/** Find variable specified by name, starting from last declared one
	@param {A3a.Compiler.NodeVar} nodeVar
	@return {A3a.Compiler.VariableDescr}
*/
A3a.Compiler.prototype.getVariable = function (nodeVar) {
	for (var i = this.declaredVariables.length - 1; i >= 0; i--) {
		if (this.declaredVariables[i].name === nodeVar.name) {
			return this.declaredVariables[i];
		}
	}
	for (var i = 0; i < this.asebaNode.variables.length; i++) {
		if (this.asebaNode.variables[i].name === nodeVar.name) {
			return this.asebaNode.variables[i];
		}
	}
	throw "unknown variable " + nodeVar.name + " " + nodeVar.head.posString();
};

/** Find macro function
	@param {string} name
	@return {?A3a.macroFunctionDef}
*/
A3a.Compiler.prototype.getMacroFunctionDef = function (name) {
	for (var i = 0; i < this.functionLib.length; i++) {
		if (this.functionLib[i].name === name) {
			return this.functionLib[i];
		}
	}
	return null;
};

/** Allocate permanent room for auxiliary variables (override previous call)
	and release temporary variables.
	@param {number} size
	@return {number} variable index
*/
A3a.Compiler.prototype.allocPermanentAuxVariable = function (size) {
	this.tempVariableBase0 = this.asebaNode.maxVarSize - size;
	this.tempVariableBase = this.tempVariableBase0;
	return this.tempVariableBase0;
};

/** Release all temporary variables
	@return {void}
*/
A3a.Compiler.prototype.releaseTempVariables = function () {
	this.tempVariableBase = this.tempVariableBase0;
};

/** Allocate room for a temporary variable
	@param {number} size
	@return {number} variable index
*/
A3a.Compiler.prototype.allocTempVariable = function (size) {
	this.tempVariableBase -= size;
	return this.tempVariableBase;
};

/** Generate bytecode to convert between result types
	@param {A3a.Compiler.resultType} fromType
	@param {A3a.Compiler.resultType} toType
	@return {Array.<number>}
*/
A3a.Compiler.prototype.generateA3aBCForTypeConversion = function (fromType, toType) {
	return [];
};

/**	Array of keywords, from longest to smallest when sharing initial part
	@constant
*/
A3a.Compiler.keywords = [
	"==",
	"!=",
	"<=",
	">=",
	"|=",
	"^=",
	"&=",
	"*=",
	"/=",
	"%=",
	"+=",
	"-=",
	"<<=",
	">>=",
	"++",
	"--",
	"(",
	")",
	"[",
	"]",
	"-",
	"~",
	"*",
	"/",
	"%",
	"+",
	"<<",
	">>",
	"&",
	"^",
	"|",
	">",
	"<",
	"=",
	",",
	":",
	"abs",
	"and",
	"callsub",
	"call",
	"const",
	"do",
	"elseif",
	"else",
	"emit",
	"end",
	"for",
	"if",
	"in",
	"not",
	"onevent",
	"or",
	"return",
	"step",
	"sub",
	"then",
	"var",
	"when",
	"while"
];

/** Abstract class for tokens
	@constructor
	@param {number} srcIndex
	@param {number} srcLine
	@param {number} srcCol
*/
A3a.Compiler.TokenBase = function (srcIndex, srcLine, srcCol) {
	this.srcIndex = srcIndex;
	this.srcLine = srcLine;
	this.srcCol = srcCol;
};

/** Get the token position in source code as a string suitable for error messages
	@return {string}
*/
A3a.Compiler.TokenBase.prototype.posString = function () {
	return "line " + this.srcLine.toString() + " col " + this.srcCol.toString();
};

/** Number token
	@constructor
	@extends {A3a.Compiler.TokenBase}
	@param {number} srcIndex
	@param {number} srcLine
	@param {number} srcCol
	@param {number} n
*/
A3a.Compiler.TokenNumber = function (srcIndex, srcLine, srcCol, n) {
	A3a.Compiler.TokenBase.call(this, srcIndex, srcLine, srcCol);
	this.n = n;
};
A3a.Compiler.TokenNumber.prototype = Object.create(A3a.Compiler.TokenBase.prototype);
A3a.Compiler.TokenNumber.prototype.constructor = A3a.Compiler.TokenNumber;

/** Floating-point token
	@constructor
	@extends {A3a.Compiler.TokenNumber}
	@param {number} srcIndex
	@param {number} srcLine
	@param {number} srcCol
	@param {number} n
*/
A3a.Compiler.TokenFloat = function (srcIndex, srcLine, srcCol, n) {
	A3a.Compiler.TokenBase.call(this, srcIndex, srcLine, srcCol);
	this.n = n;
};
A3a.Compiler.TokenFloat.prototype = Object.create(A3a.Compiler.TokenNumber.prototype);
A3a.Compiler.TokenFloat.prototype.constructor = A3a.Compiler.TokenFloat;

/** Name token
	@constructor
	@extends {A3a.Compiler.TokenBase}
	@param {number} srcIndex
	@param {number} srcLine
	@param {number} srcCol
	@param {string} name
*/
A3a.Compiler.TokenName = function (srcIndex, srcLine, srcCol, name) {
	A3a.Compiler.TokenBase.call(this, srcIndex, srcLine, srcCol);
	this.name = name;
};
A3a.Compiler.TokenName.prototype = Object.create(A3a.Compiler.TokenBase.prototype);
A3a.Compiler.TokenName.prototype.constructor = A3a.Compiler.TokenName;

/** Keyword token
	@constructor
	@extends {A3a.Compiler.TokenBase}
	@param {number} srcIndex
	@param {number} srcLine
	@param {number} srcCol
	@param {string} name
*/
A3a.Compiler.TokenKeyword = function (srcIndex, srcLine, srcCol, name) {
	A3a.Compiler.TokenBase.call(this, srcIndex, srcLine, srcCol);
	this.name = name;
};
A3a.Compiler.TokenKeyword.prototype = Object.create(A3a.Compiler.TokenBase.prototype);
A3a.Compiler.TokenKeyword.prototype.constructor = A3a.Compiler.TokenKeyword;

/** Parse next token
	@param {Array.<string>=} keywords list of keywords (default: A3a.Compiler.keywords)
	@return {A3a.Compiler.TokenBase}
*/
A3a.Compiler.prototype.nextToken = function (keywords) {
	keywords = keywords || A3a.Compiler.keywords;

	this.skipBlanks();
	if (this.i >= this.len) {
		return null;
	}

	/** @type {?A3a.Compiler.TokenBase} */
	var tk = null;

	// find keywords
	for (var i = 0; i < keywords.length; i++) {
		var kwLen = keywords[i].length;
		if (this.src.slice(this.i, this.i + kwLen) === keywords[i] &&
			!/[a-zA-Z0-9_.]{2}/.test(this.src.slice(this.i + kwLen - 1, this.i + kwLen + 1))) {
			tk = new A3a.Compiler.TokenKeyword(this.i, this.line, this.col, keywords[i]);
			this.i += kwLen;
			this.col += kwLen;
			return tk;
		}
	}

	var len = 0;
	/** @type {number} */
	var num;

	if (this.src.slice(this.i, this.i + 2) === "0x") {
		// hexadecimal number
		this.i += 2;
		while (this.i + len < this.len && /[0-9a-fA-F]/.test(this.src[this.i + len])) {
			len++;
		}
		if (len === 0) {
			throw "hexadecimal number syntax error";
		}
		num = parseInt(this.src.slice(this.i, this.i + len), 16);
		tk = new A3a.Compiler.TokenNumber(this.i, this.line, this.col, num);
		this.i += len;
		this.col += 2 + len;
	} else if (this.src.slice(this.i, this.i + 2) === "0b") {
		// binary number
		this.i += 2;
		while (this.i + len < this.len && /[01]/.test(this.src[this.i + len])) {
			len++;
		}
		if (len === 0) {
			throw "binary number syntax error";
		}
		num = parseInt(this.src.slice(this.i, this.i + len), 2);
		tk = new A3a.Compiler.TokenNumber(this.i, this.line, this.col, num);
		this.i += len;
		this.col += 2 + len;
	} else if (/[0-9]/.test(this.src[this.i])) {
		// (unsigned) decimal number
		while (this.i + len < this.len && /[0-9]/.test(this.src[this.i + len])) {
			len++;
		}
		if (this.floatLiteral && this.i + len < this.len && this.src[this.i + len] === ".") {
			for (len++; this.i + len < this.len && /[0-9]/.test(this.src[this.i + len]); len++) {}
			num = parseFloat(this.src.slice(this.i, this.i + len));
			tk = new A3a.Compiler.TokenFloat(this.i, this.line, this.col, num);
		} else {
			num = parseInt(this.src.slice(this.i, this.i + len), 10);
			tk = new A3a.Compiler.TokenNumber(this.i, this.line, this.col, num);
		}
		this.i += len;
		this.col += len;
	} else if (/[a-zA-Z_]/.test(this.src[this.i])) {
		// name
		while (this.i + len < this.len && /[a-zA-Z0-9_.]/.test(this.src[this.i + len])) {
			len++;
		}
		if (len === 0) {
			throw "name syntax error";
		}
		var str = this.src.slice(this.i, this.i + len);
		tk = new A3a.Compiler.TokenName(this.i, this.line, this.col, str);
		this.i += len;
		this.col += len;
	} else {
		throw "syntax error line " + this.line.toString() + " col " + this.col.toString();
	}

	return tk;
};

/**	Parse source code and build array of tokens
	@param {Array.<string>=} keywords list of keywords (default: A3a.Compiler.keywords)
	@return {void}
*/
A3a.Compiler.prototype.buildTokenArray = function (keywords) {
	while (true) {
		var tk = this.nextToken(keywords);
		if (tk === null) {
			break;
		}
		this.tokens.push(tk);
	}
};

/** Mapping between source code and bytecode
	@constructor
	@param {number} srcOffset offset in source code (0-based)
	@param {number} line line number in source code (1-based)
	@param {number} col column number in source code (1-based)
	@param {number} addr address in source code
*/
A3a.Compiler.SourceToBCMapping = function (srcOffset, line, col, addr) {
	this.srcOffset = srcOffset;
	this.line = line;
	this.col = col;
	this.addr = addr;
};

/** Find index of first mapping for specified line in an array of mappings
	@param {Array.<A3a.Compiler.SourceToBCMapping>} m
	@param {number} line
	@return {number} index of first mapping following line, or -1
*/
A3a.Compiler.SourceToBCMapping.lineToBCAddress = function (m, line) {
	for (var i = 0; i < m.length; i++) {
		if (m[i].line >= line) {
			return i;
		}
	}
	return -1;
};

/** Add a mapping from source code to bytecode for a node
	@param {A3a.Compiler.Node} node
	@param {number=} bcAddr bytecode address (default: this.bcAddr)
	@return {void}
*/
A3a.Compiler.prototype.addSourceToBCMapping = function (node, bcAddr) {
	var token = node.head || node.children[0] && node.children[0].head;
	if (token) {
		this.sourceToBCMapping.push(new A3a.Compiler.SourceToBCMapping(token.srcIndex,
			token.srcLine, token.srcCol,
			bcAddr === undefined ? this.bcAddr : bcAddr));
	}
};

/**	Node in code tree
	@constructor
	@param {A3a.Compiler.TokenBase} head
*/
A3a.Compiler.Node = function (head) {
	this.head = head;
	/** @type {Array.<A3a.Compiler.Node>} */
	this.children = [];
	this.valueSize = 0;	// value array size (0=void, 1=scalar)
	this.resultType = A3a.Compiler.resultType.undef;
	this.shouldProduceValue = true;	// not a top-level expression as a statement
};

/** Optimizes nodes in an array
	@param {Array.<A3a.Compiler.Node>} nodeArray
	@param {A3a.Compiler} compiler
	@return {void}
*/
A3a.Compiler.Node.optimizeNodeArray = function (nodeArray, compiler) {
	for (var i = 0; i < nodeArray.length; i++) {
		nodeArray[i] = nodeArray[i].optimize(compiler);
	}
};

/** Optimize node in expression (not statements)
	@param {A3a.Compiler} compiler
	@return {A3a.Compiler.Node}
*/
A3a.Compiler.Node.prototype.optimize = function (compiler) {
	return this;
};

/** Resolve valueSize and resultType based on children
	@param {A3a.Compiler} compiler
	@return {void}
*/
A3a.Compiler.Node.prototype.resolveArraySize = function (compiler) {
	this.children.forEach(function (node) {
		node.resolveArraySize(compiler);
	});
};

/** Process arrays componentwise
	@param {A3a.Compiler} compiler
	@return {A3a.Compiler.Node} this or new sequence node
*/
A3a.Compiler.Node.prototype.explodeArrayNode = function (compiler) {
	this.resolveArraySize(compiler);
	for (var i = 0; i < this.children.length; i++) {
		this.children[i] = this.children[i].explodeArrayNode(compiler);
	}
	return this;
};

/** Number node
	@constructor
	@extends {A3a.Compiler.Node}
	@param {A3a.Compiler.TokenBase} numToken
	@param {number=} n number value (default: numToken.head.n)
*/
A3a.Compiler.NodeNumber = function (numToken, n) {
	A3a.Compiler.Node.call(this, numToken);
	this.n = n === undefined ? this.head.n : n;
	this.resultType = A3a.Compiler.resultType.number;
};
A3a.Compiler.NodeNumber.prototype = Object.create(A3a.Compiler.Node.prototype);
A3a.Compiler.NodeNumber.prototype.constructor = A3a.Compiler.NodeNumber;

/**
	@inheritDoc
*/
A3a.Compiler.NodeNumber.prototype.resolveArraySize = function (compiler) {
	this.valueSize = 1;
};

/** Convert signed 16-bit int to unsigned 16-bit int
	@param {number} n
	@return {number}
*/
A3a.Compiler.NodeNumber.toS16 = function (n) {
	n &= 0xffff;
	return n >= 0x8000 ? n - 0x10000 : n;
};

/** Float node
	@constructor
	@extends {A3a.Compiler.NodeNumber}
	@param {A3a.Compiler.TokenBase} floatToken
	@param {number=} f number value (default: floatToken.head.n)
*/
A3a.Compiler.NodeFixed = function (floatToken, f) {
	A3a.Compiler.NodeNumber.call(this, floatToken, f);
	this.resultType = A3a.Compiler.resultType.fixed;
};
A3a.Compiler.NodeFixed.prototype = Object.create(A3a.Compiler.NodeNumber.prototype);
A3a.Compiler.NodeFixed.prototype.constructor = A3a.Compiler.NodeFixed;

/** Variable or constant node
	@constructor
	@extends {A3a.Compiler.Node}
	@param {A3a.Compiler.TokenBase} nameToken
*/
A3a.Compiler.NodeVar = function (nameToken) {
	A3a.Compiler.Node.call(this, nameToken);
	this.name = nameToken.name;
	this.dummyPlaceholder = false;	// true as a placeholder for type, to not generate bytecode
};
A3a.Compiler.NodeVar.prototype = Object.create(A3a.Compiler.Node.prototype);
A3a.Compiler.NodeVar.prototype.constructor = A3a.Compiler.NodeVar;

/**
	@inheritDoc
*/
A3a.Compiler.NodeVar.prototype.resolveArraySize = function (compiler) {
	if (compiler.hasConstant(this.name)) {
		this.valueSize = 1;
		this.resultType = compiler.getConstant(this.name).resultType;
	} else {
		var varDescr = compiler.getVariable(this);
		this.valueSize = varDescr.size;
		this.resultType = varDescr.resultType;
	}
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeVar.prototype.optimize = function (compiler) {
	return compiler.hasConstant(this.name)
		? compiler.getConstant(this.name).resultType === A3a.Compiler.resultType.fixed
			? new A3a.Compiler.NodeFixed(this.head, compiler.getConstant(this.name).val)
			: new A3a.Compiler.NodeNumber(this.head, compiler.getConstant(this.name).val)
		: this;
};

/** Make a copy as a dummy placeholder
	@return {A3a.Compiler.NodeVar}
*/
A3a.Compiler.NodeVar.prototype.makeDummyPlaceholder = function () {
	var node = new A3a.Compiler.NodeVar(this.head);
	node.resultType = this.resultType;
	node.dummyPlaceholder = true;
	return node;
};

/** @enum {string} */
A3a.Compiler.resultType = {
	undef: "?",
	void: "v",
	number: "n",
	boolean: "b",
	fixed: "fx"
};

/** Function or operator node
	@constructor
	@extends {A3a.Compiler.Node}
	@param {A3a.Compiler.TokenBase} funToken
	@param {A3a.Compiler.opType} type
	@param {?A3a.Compiler.OperatorDescr} opDescr
	@param {Array.<A3a.Compiler.Node>=} args arguments (default: none)
*/
A3a.Compiler.NodeFun = function (funToken, type, opDescr, args) {
	A3a.Compiler.Node.call(this, funToken);
	this.type = type;
	this.resultType = opDescr ? opDescr.resultType : A3a.Compiler.resultType.undef;
	this.operatorDescr = opDescr;
	this.children = args || [];
};
A3a.Compiler.NodeFun.prototype = Object.create(A3a.Compiler.Node.prototype);
A3a.Compiler.NodeFun.prototype.constructor = A3a.Compiler.NodeFun;

/**
	@inheritDoc
*/
A3a.Compiler.NodeFun.prototype.resolveArraySize = function (compiler) {
	A3a.Compiler.Node.prototype.resolveArraySize.call(this, compiler);
	var n = 1;
	for (var i = 0; i < this.children.length; i++) {
		if (n === 1) {
			n = this.children[i].valueSize;
		} else if (this.children[i].valueSize !== 1 && this.children[i].valueSize !== n) {
			throw "incompatible sizes " + this.head.posString();
		}
	}
	this.valueSize = n;
	if (this.operatorDescr && this.operatorDescr.resultTypePropagate) {
		this.resultType = this.operatorDescr.resultTypePropagate(
			compiler,
			this,
			this.children.map(function (c) { return c.resultType; })
		);
	}
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeFun.prototype.optimize = function (compiler) {
	// optimize children
	this.children = this.children.map(function (node) {
		return node.optimize(compiler);
	});
	// apply node-specific optimization
	return this.operatorDescr && this.operatorDescr.optimize
		? this.operatorDescr.optimize(this, compiler)
		: this;
};

/** @inheritDoc
*/
A3a.Compiler.NodeFun.prototype.explodeArrayNode = function (compiler) {
	var self = A3a.Compiler.Node.prototype.explodeArrayNode.call(this, compiler);

	if (self.type === A3a.Compiler.opType.infix &&
		self.operatorDescr.priority === A3a.Compiler.opPriority.assignment &&
		(self.children[1] instanceof A3a.Compiler.NodeArray ||
			self.children[1] instanceof A3a.Compiler.NodeVar &&
				self.children[1].valueSize !== 1)) {
		var lhs = self.children[0];
		if (!(lhs instanceof A3a.Compiler.NodeVar) || self.shouldProduceValue) {
			throw "bad array assignment " + self.head.posString();
		}
		var nodeArray = self.children[1];
		var st = new A3a.Compiler.NodeStatementSequence(self.head);
		for (var i = 0; i < nodeArray.valueSize; i++) {
			var lhs1 = lhs;
			if (nodeArray.valueSize > 1) {
				lhs1 = new A3a.Compiler.NodeIndexing(lhs.head,
					[new A3a.Compiler.NodeNumber(lhs.head, i)]);
				lhs1.resultType = lhs.resultType;
			}
			var rhs1;
			if (nodeArray instanceof A3a.Compiler.NodeArray) {
				rhs1 = nodeArray.children[i];
			} else {
				rhs1 = new A3a.Compiler.NodeIndexing(nodeArray.head,
					[new A3a.Compiler.NodeNumber(lhs.head, i)]);
				rhs1.resultType = nodeArray.resultType;
			}
			var a = new A3a.Compiler.NodeFun(self.head, self.type,
				self.operatorDescr,
				[lhs1, rhs1]);
			a.resultType = lhs.resultType;
			a.shouldProduceValue = false;
			a = a.optimize(compiler);
			st.children.push(a);
		}
		return st;
	}

	return self;
};

/** Indexed variable node
	@constructor
	@extends {A3a.Compiler.NodeVar}
	@param {A3a.Compiler.TokenBase} nameToken
	@param {Array.<A3a.Compiler.Node>} indices
*/
A3a.Compiler.NodeIndexing = function (nameToken, indices) {
	A3a.Compiler.NodeVar.call(this, nameToken);
	this.children = indices;
};
A3a.Compiler.NodeIndexing.prototype = Object.create(A3a.Compiler.NodeVar.prototype);
A3a.Compiler.NodeIndexing.prototype.constructor = A3a.Compiler.NodeIndexing;

/**
	@inheritDoc
*/
A3a.Compiler.NodeIndexing.prototype.resolveArraySize = function (compiler) {
	A3a.Compiler.Node.prototype.resolveArraySize.call(this, compiler);
	var varDescr = compiler.getVariable(this);
	this.valueSize = 1;
	this.resultType = varDescr.resultType;
};

/** Check if all indices are NodeNumber
	@return {boolean}
*/
A3a.Compiler.NodeIndexing.prototype.areIndicesConstant = function () {
	for (var i = 0; i < this.children.length; i++) {
		if (!(this.children[i] instanceof A3a.Compiler.NodeNumber)) {
			return false;
		}
	}
	return true;
};

/** Convert indices to a single constant number
	@param {A3a.Compiler.VariableDescr} variable
	@return {number}
*/
A3a.Compiler.NodeIndexing.prototype.constantIndicesToSingleIndex = function (variable) {
	var ix = 0;
	var m = 1;
	for (var i = 0; i < this.children.length; i++) {
		if (!(this.children[i] instanceof A3a.Compiler.NodeNumber)) {
			throw "internal";
		}
		ix += m * this.children[i].n;
		m *= variable.dims[i];
	}
	return ix;
};

/** Array node
	@constructor
	@extends {A3a.Compiler.Node}
	@param {A3a.Compiler.TokenBase} bracketToken
*/
A3a.Compiler.NodeArray = function (bracketToken) {
	A3a.Compiler.Node.call(this, bracketToken);
	/** @type {Array.<number>} */
	this.dims = [];
};
A3a.Compiler.NodeArray.prototype = Object.create(A3a.Compiler.Node.prototype);
A3a.Compiler.NodeArray.prototype.constructor = A3a.Compiler.NodeArray;

/**
	@inheritDoc
*/
A3a.Compiler.NodeArray.prototype.resolveArraySize = function (compiler) {
	this.valueSize = this.children.length;
	if (this.children[0]) {
		// resolve resultType
		this.children.forEach(function (node) {
			node.resolveArraySize(compiler);
		});
		this.resultType = this.children[0].resultType;	// inherit type from first element
	}
};

/** Add an item
	@param {A3a.Compiler.Node} node
	@return {void}
*/
A3a.Compiler.NodeArray.prototype.addItem = function (node) {
	this.children.push(node);
};

/** Statement node
	@constructor
	@extends {A3a.Compiler.Node}
	@param {A3a.Compiler.TokenBase} head
	@param {A3a.Compiler.NodeStatement.type=} type
*/
A3a.Compiler.NodeStatement = function (head, type) {
	A3a.Compiler.Node.call(this, head);
	this.type = type || A3a.Compiler.NodeStatement.type.plain;
	this.implicitEnd = false;	// true if type.begin and expecing single statement without matching type.end
	this.contexts = [null];	// local data for each statement block (separated by middleStatement), if any
};
A3a.Compiler.NodeStatement.prototype = Object.create(A3a.Compiler.Node.prototype);
A3a.Compiler.NodeStatement.prototype.constructor = A3a.Compiler.NodeStatement;

/** Create a new block of statements for this begin statement
	(called for A3a.Compiler.NodeStatement.type.blockHeader)
	@return {A3a.Compiler.NodeStatement}
*/
A3a.Compiler.NodeStatement.prototype.newBlock = function () {
	throw "internal";
};

/** Process begin statement
	(called when building tree on its begin statement for
	A3a.Compiler.NodeStatement.type.end)
	@param {A3a.Compiler} compiler
	@return {void}
*/
A3a.Compiler.NodeStatement.prototype.processBeginStatement = function (compiler) {
	// empty (can be overriden)
};

/** Process middle statement such as "elseif" or "else" in an "if" block
	(called when building tree on its begin statement for
	A3a.Compiler.NodeStatement.type.middle)
	@param {A3a.Compiler.NodeStatement} st middle statement
	@return {void}
*/
A3a.Compiler.NodeStatement.prototype.processMiddleStatement = function (st) {
	// should be overriden
	throw "internal";
};

/** Process end statement such as "while" in a "do"/"while" block
	(called when building tree on its begin statement for
	A3a.Compiler.NodeStatement.type.end)
	@param {A3a.Compiler.NodeStatement} st end statement
	@return {void}
*/
A3a.Compiler.NodeStatement.prototype.processEndStatement = function (st) {
	// empty (can be overriden)
};

/** Post processing to terminate this statement
	@param {A3a.Compiler} compiler
	@param {?A3a.Compiler.NodeStatement} st ending statement ("end") or this
	@return {void}
*/
A3a.Compiler.NodeStatement.prototype.postProcess = function (compiler, st) {
};

/** Prepare the generation of A3a BC generation (release temporary variables etc.)
	@param {A3a.Compiler} compiler
	@return {void}
*/
A3a.Compiler.NodeStatement.prototype.prepareGenerateA3aBC = function (compiler) {
	compiler.releaseTempVariables();
	compiler.addSourceToBCMapping(this);
};

/**	@enum {number} */
A3a.Compiler.NodeStatement.type = {
	undef: 0,
	plain: 1,
	blockHeader: 2,	// onevent, sub, etc.
	begin: 3,	// if, while, etc.
	middle: 4,	// else, elseif, etc.
	end: 5	// end
};

/** Base class for code placeholder to be resolved in a link phase
	@constructor
	@param {A3a.Compiler} compiler
	@param {A3a.Compiler.NodeStatement} statement
*/
A3a.Compiler.CodePlaceholder = function (compiler, statement) {
	this.compiler = compiler;
	this.statement = statement;
};

/** Generate bytecode to replace placeholder
	@param {number} addr final address of bytecode
	@return number single bytecode
*/
A3a.Compiler.CodePlaceholder.prototype.generateA3aBC = function (addr) {
	return "internal";
};

/** "onevent" statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {string} eventName
*/
A3a.Compiler.NodeStatementOnevent = function (head, eventName) {
	A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.blockHeader);
	this.eventName = eventName;
};
A3a.Compiler.NodeStatementOnevent.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementOnevent.prototype.constructor = A3a.Compiler.NodeStatementOnevent;

/** @inheritDoc
*/
A3a.Compiler.NodeStatementOnevent.prototype.optimize = function (compiler) {
	A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
	return this;
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementOnevent.prototype.newBlock = function () {
	return this;
};

/** "sub" Statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {string} subName
*/
A3a.Compiler.NodeStatementSub = function (head, subName) {
	A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.blockHeader);
	this.subName = subName;
};
A3a.Compiler.NodeStatementSub.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementSub.prototype.constructor = A3a.Compiler.NodeStatementSub;

/** @inheritDoc
*/
A3a.Compiler.NodeStatementSub.prototype.optimize = function (compiler) {
	A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
	return this;
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementSub.prototype.newBlock = function () {
	return this;
};

/** "return" Statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
*/
A3a.Compiler.NodeStatementReturn = function (head) {
	A3a.Compiler.NodeStatement.call(this, head);
};
A3a.Compiler.NodeStatementReturn.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementReturn.prototype.constructor = A3a.Compiler.NodeStatementReturn;

/** "const" Statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {string} constName
	@param {A3a.Compiler.Node} val
*/
A3a.Compiler.NodeStatementConst = function (head, constName, val) {
	A3a.Compiler.NodeStatement.call(this, head);
	this.constName = constName;
	this.val = val;
	this.resultType = val.resultType;
};
A3a.Compiler.NodeStatementConst.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementConst.prototype.constructor = A3a.Compiler.NodeStatementConst;

/** "var" Statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {A3a.Compiler.TokenName} varToken
	@param {A3a.Compiler.resultType} resultType
	@param {Array.<A3a.Compiler.Node>=} sizeExpr (default: [1])
	@param {A3a.Compiler.Node=} initialization assignment
*/
A3a.Compiler.NodeStatementVar = function (head, varToken, resultType, sizeExpr, initialization) {
	A3a.Compiler.NodeStatement.call(this, head);
	this.varName = varToken.name;
	this.resultType = resultType;
	this.sizeExpr = sizeExpr || null;
	this.size = -1;	// undefined
	this.dims = [];	// undefined
	this.offset = -1;	// undefined
	if (initialization) {
		this.children.push(initialization);
	}
};
A3a.Compiler.NodeStatementVar.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementVar.prototype.constructor = A3a.Compiler.NodeStatementVar;

/** @inheritDoc
*/
A3a.Compiler.NodeStatementVar.prototype.resolveArraySize = function (compiler) {
	if (this.children[0]) {
		A3a.Compiler.Node.prototype.resolveArraySize.call(this, compiler);
		this.resultType = this.children[0].children[1].resultType;
	}
};

/** @inheritDoc
*/
A3a.Compiler.NodeStatementVar.prototype.optimize = function (compiler) {
	A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
	return this;
};

/** Expression statement node (assignment etc.)
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.Node} expr
*/
A3a.Compiler.NodeStatementExpression = function (expr) {
	A3a.Compiler.NodeStatement.call(this, expr.head);
	this.children.push(expr);
};
A3a.Compiler.NodeStatementExpression.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementExpression.prototype.constructor = A3a.Compiler.NodeStatementExpression;

/** @inheritDoc
*/
A3a.Compiler.NodeStatementExpression.prototype.optimize = function (compiler) {
	A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
	return this;
};

/** Node for sequence of statements
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
*/
A3a.Compiler.NodeStatementSequence = function (head) {
	A3a.Compiler.NodeStatement.call(this, head);
};
A3a.Compiler.NodeStatementSequence.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementSequence.prototype.constructor = A3a.Compiler.NodeStatementSequence;

/** @inheritDoc
*/
A3a.Compiler.NodeStatementSequence.prototype.optimize = function (compiler) {
	A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
	return this;
};

/** "if" Statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {A3a.Compiler.Node} expr
*/
A3a.Compiler.NodeStatementIf = function (head, expr) {
	A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
	this.conditions = [expr];	// expressions for if and all elseif (empty if optimized out)
	/** @type {Array.<Array.<A3a.Compiler.NodeStatement>>} */
	this.conditionalCode = [];	// code following corresponding element in this.conditions
	/** @type {Array.<A3a.Compiler.NodeStatement>} */
	this.linkedStatements = [];	// elseif* else? end
};
A3a.Compiler.NodeStatementIf.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementIf.prototype.constructor = A3a.Compiler.NodeStatementIf;

/** @inheritDoc
*/
A3a.Compiler.NodeStatementIf.prototype.resolveArraySize = function (compiler) {
	this.conditions.forEach(function (node) {
		node.resolveArraySize(compiler);
	});
	this.conditionalCode.forEach(function (statements) {
		statements.forEach(function (statement) {
			statement.resolveArraySize(compiler);
		});
	});
};

/** @inheritDoc
*/
A3a.Compiler.NodeStatementIf.prototype.optimize = function (compiler) {
	A3a.Compiler.Node.optimizeNodeArray(this.conditions, compiler);
	this.conditionalCode.forEach(function (a) {
		A3a.Compiler.Node.optimizeNodeArray(a, compiler);
	});
	return this;
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementIf.prototype.processMiddleStatement = function (st) {
	// called upon elseif or else statement, with
	// st: elseif or else statement
	// this: if statement
	// this.children: statements before st
	// this.contexts: context array for all child blocks except last (shoud be ignored)
	// this.conditions: conditions for all previous if/elseif statements
	// this.conditionalCode: array of child arrays before previous if/elseif statement
	if (this.conditionalCode.length >= this.conditions.length) {
		throw "multiple else " + st.head.posString();
	}
	if (st instanceof A3a.Compiler.NodeStatementElseif) {
		this.conditions.push(st.condition);
	}
	this.conditionalCode.push(this.children);
	this.linkedStatements.push(st);
	this.children = [];
	this.contexts.push(st.contexts[0]);
};

/** Remove unused conditions and/or blocks for constant conditions
	@return {void}
*/
A3a.Compiler.NodeStatementIf.prototype.removeUnusedBlocks = function () {
	// optimize constant predicates
	for (var i = 0; i < this.conditions.length; ) {
		if (this.conditions[i] instanceof A3a.Compiler.NodeNumber) {
			if (this.conditions[i].n === 0) {
				// false: remove
				this.conditions.splice(i, 1);
				this.conditionalCode.splice(i, 1);
				this.linkedStatements.splice(i, 1);
			} else {
				// true: transform into final else part
				this.conditions.splice(i);
				this.conditionalCode.splice(i + 1);
				break;
			}
		} else {
			i++;
		}
	}
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementIf.prototype.postProcess = function (compiler, st) {
	// called upon end, with
	// this: if statement
	// this.children: statements before end
	// this.conditions: conditions for all if/elseif statements
	// this.conditionalCode: array of child arrays before last if/elseif/else statement, if any
	this.conditionalCode.push(this.children);
	this.children = [];
	this.linkedStatements.push(st);

	this.removeUnusedBlocks();
};

/** "elseif" Statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {A3a.Compiler.Node} expr
*/
A3a.Compiler.NodeStatementElseif = function (head, expr) {
	A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.middle);
	this.condition = expr;
};
A3a.Compiler.NodeStatementElseif.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementElseif.prototype.constructor = A3a.Compiler.NodeStatementElseif;

/** @inheritDoc
*/
A3a.Compiler.NodeStatementElseif.prototype.optimize = function (compiler) {
	this.condition = this.condition.optimize(compiler);
	A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
	return this;
};

/** "else" Statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
*/
A3a.Compiler.NodeStatementElse = function (head) {
	A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.middle);
};
A3a.Compiler.NodeStatementElse.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementElse.prototype.constructor = A3a.Compiler.NodeStatementElse;

/** "when" Statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {A3a.Compiler.Node} expr
*/
A3a.Compiler.NodeStatementWhen = function (head, expr) {
	A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
	this.condition = expr;
	/** @type {Array.<A3a.Compiler.NodeStatement>} */
	this.linkedStatements = [];
};
A3a.Compiler.NodeStatementWhen.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementWhen.prototype.constructor = A3a.Compiler.NodeStatementWhen;

/** @inheritDoc
*/
A3a.Compiler.NodeStatementWhen.prototype.resolveArraySize = function (compiler) {
	A3a.Compiler.Node.prototype.resolveArraySize.call(this, compiler);
	this.condition.resolveArraySize(compiler);
};

/** @inheritDoc
*/
A3a.Compiler.NodeStatementWhen.prototype.optimize = function (compiler) {
	this.condition = this.condition.optimize(compiler);
	A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
	return this;
};

/** "while" Statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {A3a.Compiler.Node} expr
*/
A3a.Compiler.NodeStatementWhile = function (head, expr) {
	A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
	this.condition = expr;
	/** @type {Array.<A3a.Compiler.NodeStatement>} */
	this.linkedStatements = [];
};
A3a.Compiler.NodeStatementWhile.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementWhile.prototype.constructor = A3a.Compiler.NodeStatementWhile;

/** @inheritDoc
*/
A3a.Compiler.NodeStatementWhile.prototype.resolveArraySize = function (compiler) {
	A3a.Compiler.Node.prototype.resolveArraySize.call(this, compiler);
	this.condition.resolveArraySize(compiler);
};

/** @inheritDoc
*/
A3a.Compiler.NodeStatementWhile.prototype.optimize = function (compiler) {
	this.condition = this.condition.optimize(compiler);
	A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
	return this;
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementWhile.prototype.postProcess = function (compiler, st) {
	// remove condition if constant true, and block if constant false
	if (this.condition instanceof A3a.Compiler.NodeNumber) {
		if (this.condition.n === 0) {
			this.children = [];
		}
		this.condition = null;
	}
	this.linkedStatements.push(st);
};

/** "for" Statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {A3a.Compiler.TokenName} varToken
	@param {A3a.Compiler.Node} from
	@param {A3a.Compiler.Node} to
	@param {A3a.Compiler.Node=} step
*/
A3a.Compiler.NodeStatementFor = function (head, varToken, from, to, step) {
	A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
	this.nodeVar = new A3a.Compiler.NodeVar(varToken);
	this.children.push(from);
	this.children.push(to);
	this.step = step || null;
	/** @type {Array.<A3a.Compiler.NodeStatement>} */
	this.linkedStatements = [];
};
A3a.Compiler.NodeStatementFor.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementFor.prototype.constructor = A3a.Compiler.NodeStatementFor;

/** @inheritDoc
*/
A3a.Compiler.NodeStatementFor.prototype.resolveArraySize = function (compiler) {
	A3a.Compiler.Node.prototype.resolveArraySize.call(this, compiler);
	if (this.step) {
		this.step.resolveArraySize(compiler);
	}
};

/** @inheritDoc
*/
A3a.Compiler.NodeStatementFor.prototype.optimize = function (compiler) {
	if (this.step) {
		this.step = this.step.optimize(compiler);
	}
	A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
	return this;
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementFor.prototype.postProcess = function (compiler, st) {
	this.linkedStatements.push(st);
};

/** "call" Statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} funToken
	@param {string} name
	@param {Array.<A3a.Compiler.Node>} args
*/
A3a.Compiler.NodeStatementCall = function (funToken, name, args) {
	A3a.Compiler.NodeStatement.call(this, funToken);
	this.name = name;
	this.children = args;
};
A3a.Compiler.NodeStatementCall.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementCall.prototype.constructor = A3a.Compiler.NodeStatementCall;

/** @inheritDoc
*/
A3a.Compiler.NodeStatementCall.prototype.optimize = function (compiler) {
	A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
	return this;
};

/** "callsub" Statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} funToken
	@param {string} name
*/
A3a.Compiler.NodeStatementCallSub = function (funToken, name) {
	A3a.Compiler.NodeStatement.call(this, funToken);
	this.name = name;
};
A3a.Compiler.NodeStatementCallSub.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementCallSub.prototype.constructor = A3a.Compiler.NodeStatementCallSub;

/** "emit" Statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {string} eventName
	@param {A3a.Compiler.Node=} data
*/
A3a.Compiler.NodeStatementEmit = function (head, eventName, data) {
	A3a.Compiler.NodeStatement.call(this, head);
	this.eventName = eventName;
	if (data) {
		this.children.push(data);
	}
};
A3a.Compiler.NodeStatementEmit.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementEmit.prototype.constructor = A3a.Compiler.NodeStatementEmit;

/** @inheritDoc
*/
A3a.Compiler.NodeStatementEmit.prototype.resolveArraySize = function (compiler) {
	if (this.children[0]) {
		A3a.Compiler.Node.prototype.resolveArraySize.call(this, compiler);

		// check size
		var expr = this.children[0];
		var userEvent = compiler.findUserEvent(this.eventName);
		var eventDataLength = expr instanceof A3a.Compiler.NodeVar
			? compiler.getVariable(expr).size
			: expr.valueSize;
		if (eventDataLength !== userEvent.size) {
			throw "Incompatible data size in \"emit\" " + this.head.posString();
		}
	}
};

/** "end" Statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
*/
A3a.Compiler.NodeStatementEnd = function (head) {
	A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.end);
};
A3a.Compiler.NodeStatementEnd.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.NodeStatementEnd.prototype.constructor = A3a.Compiler.NodeStatementEnd;

/** @enum {number} */
A3a.Compiler.opPriority = {
	constant: 200,
	pre: 150,
	mult: 140,
	add: 130,
	shift: 120,
	binand: 110,
	binxor: 100,
	binor: 90,
	comp: 80,
	not: 70,
	and: 60,
	or: 50,
	conditionalElse: 41,
	conditional: 40,
	assignment: 30,
	comma: 25,
	par: 20,
	statement: 10,
	unknown: 0
};

/** @enum {number} */
A3a.Compiler.opType = {
	prefix: 0,
	infix: 1,
	postfix: 2,
	constant: 3,
	fun: 4
};

/** Operator description
	@constructor
	@param {string} name
	@param {A3a.Compiler.opType} type
	@param {{
		priority: (A3a.Compiler.opPriority | undefined),
		resultType: (A3a.Compiler.resultType | undefined),
		resultTypePropagate: (function (A3a.Compiler,A3a.Compiler.Node,Array.<A3a.Compiler.resultType>):A3a.Compiler.resultType | undefined),
		optimize: (function (A3a.Compiler.Node,A3a.Compiler):A3a.Compiler.Node | undefined),
		bytecode: (Array.<number> | undefined),
		generateA3aBC: (function(A3a.Compiler.Node,A3a.Compiler):Array.<number> | undefined)
	}} opt
*/
A3a.Compiler.OperatorDescr = function (name, type, opt) {
	this.name = name;
	this.type = type;
	this.priority = opt && opt.priority || A3a.Compiler.opPriority.unknown;
	this.resultType = opt && opt.resultType ||
		(opt && opt.resultTypePropagate
			? A3a.Compiler.resultType.undef
			: A3a.Compiler.resultType.number);
	this.resultTypePropagate = opt && opt.resultTypePropagate || null;
	this.optimize = opt && opt.optimize || null;
	this.bytecode = opt && opt.bytecode || [];
	this.generateA3aBC = opt && opt.generateA3aBC || null;
};

/** Optimize function node if children are constant numbers
	@param {A3a.Compiler.NodeFun} node
	@param {A3a.Compiler} compiler
	@param {function(Array.<number>):number} fun
	@return {A3a.Compiler.Node}
*/
A3a.Compiler.optimizeConstFun = function (node, compiler, fun) {
	var args = [];
	for (var i = 0; i < node.children.length; i++) {
		if (!(node.children[i] instanceof A3a.Compiler.NodeNumber)) {
			return node;
		}
		args.push(/** @type {A3a.Compiler.NodeNumber} */(node.children[i]).n);
	}
	return new A3a.Compiler.NodeNumber(node.head, A3a.Compiler.NodeNumber.toS16(fun(args)));
};

/** Operators
	@type {Array.<A3a.Compiler.OperatorDescr>}
	@const
*/
A3a.Compiler.operators = [
	new A3a.Compiler.OperatorDescr("--",
		A3a.Compiler.opType.prefix,
		{
			priority: A3a.Compiler.opPriority.pre
		}),
	new A3a.Compiler.OperatorDescr("++",
		A3a.Compiler.opType.prefix,
		{
			priority: A3a.Compiler.opPriority.pre
		}),
	new A3a.Compiler.OperatorDescr("-",
		A3a.Compiler.opType.prefix,
		{
			priority: A3a.Compiler.opPriority.pre,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return -args[0];
					});
			},
			bytecode: [A3a.vm.bc.unaryOpNeg]
		}),
	new A3a.Compiler.OperatorDescr("~",
		A3a.Compiler.opType.prefix,
		{
			priority: A3a.Compiler.opPriority.pre,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return ~args[0];
					});
			},
			bytecode: [A3a.vm.bc.unaryOpBitNot]
		}),
	new A3a.Compiler.OperatorDescr("abs",
		A3a.Compiler.opType.prefix,
		{
			priority: A3a.Compiler.opPriority.pre,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return Math.abs(args[0]);
					});
			},
			bytecode: [A3a.vm.bc.unaryOpAbs]
		}),
	new A3a.Compiler.OperatorDescr("not",
		A3a.Compiler.opType.prefix,
		{
			priority: A3a.Compiler.opPriority.pre,
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] == 0 ? 1 : 0;
					});
			},
			bytecode: [
				// A3a.vm.bc.unaryOpNot not implemented in vm
				(A3a.vm.bc.smallImmediate << 12) | 0,
				A3a.vm.bc.binaryOpEqual
			]
		}),
	// "size" for internal use only (not defined as a keyword)
	new A3a.Compiler.OperatorDescr("size",
		A3a.Compiler.opType.prefix,
		{
			priority: A3a.Compiler.opPriority.pre,
			optimize: function (node, compiler) {
				var size = node.children[0].valueSize > 0 ? node.children[0].valueSize
					: node.children[0] instanceof A3a.Compiler.NodeArray
						? node.children[0].children.length
					: -1;
				if (size < 0 && node.children[0] instanceof A3a.Compiler.NodeVar) {
					// try to find variable declaration which could have the size resolved
					for (var i = compiler.declaredVariables.length - 1; i >= 0; i--) {
						if (compiler.declaredVariables[i].name === node.children[0].name) {
							size = compiler.declaredVariables[i].size;
							break;
						}
					}
				}
				return size > 0
					? new A3a.Compiler.NodeNumber(node.head, size)
					: node;
			}
		}),
	new A3a.Compiler.OperatorDescr("--",
		A3a.Compiler.opType.postfix,
		{
			priority: A3a.Compiler.opPriority.pre
		}),
	new A3a.Compiler.OperatorDescr("++",
		A3a.Compiler.opType.postfix,
		{
			priority: A3a.Compiler.opPriority.pre
		}),
	new A3a.Compiler.OperatorDescr("+=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.assignment
		}),
	new A3a.Compiler.OperatorDescr("-=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.assignment
		}),
	new A3a.Compiler.OperatorDescr("*=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.assignment
		}),
	new A3a.Compiler.OperatorDescr("/=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.assignment
		}),
	new A3a.Compiler.OperatorDescr("%=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.assignment
		}),
	new A3a.Compiler.OperatorDescr("<<=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.assignment
		}),
	new A3a.Compiler.OperatorDescr(">>=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.assignment
		}),
	new A3a.Compiler.OperatorDescr("&=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.assignment
		}),
	new A3a.Compiler.OperatorDescr("|=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.assignment
		}),
	new A3a.Compiler.OperatorDescr("^=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.assignment
		}),
	new A3a.Compiler.OperatorDescr("*",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.mult,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] * args[1];
					});
			},
			bytecode: [A3a.vm.bc.binaryOpMult]
		}),
	new A3a.Compiler.OperatorDescr("/",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.mult,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return Math.trunc(args[0] / args[1]);
					});
			},
			bytecode: [A3a.vm.bc.binaryOpDiv]
		}),
	new A3a.Compiler.OperatorDescr("%",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.mult,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] % args[1];
					});
			},
			bytecode: [A3a.vm.bc.binaryOpMod]
		}),
	new A3a.Compiler.OperatorDescr("+",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.add,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] + args[1];
					});
			},
			bytecode: [A3a.vm.bc.binaryOpAdd]
		}),
	new A3a.Compiler.OperatorDescr("-",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.add,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] - args[1];
					});
			},
			bytecode: [A3a.vm.bc.binaryOpSub]
		}),
	new A3a.Compiler.OperatorDescr("<<",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.shift,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] << args[1];
					});
			},
			bytecode: [A3a.vm.bc.binaryOpShiftLeft]
		}),
	new A3a.Compiler.OperatorDescr(">>",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.shift,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] >> args[1];
					});
			},
			bytecode: [A3a.vm.bc.binaryOpShiftRight]
		}),
	new A3a.Compiler.OperatorDescr("==",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.comp,
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] === args[1] ? 1 : 0;
					});
			},
			bytecode: [A3a.vm.bc.binaryOpEqual]
		}),
	new A3a.Compiler.OperatorDescr("!=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.comp,
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] !== args[1] ? 1 : 0;
					});
			},
			bytecode: [A3a.vm.bc.binaryOpNotEqual]
		}),
	new A3a.Compiler.OperatorDescr("<",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.comp,
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] < args[1] ? 1 : 0;
					});
			},
			bytecode: [A3a.vm.bc.binaryOpLessThan]
		}),
	new A3a.Compiler.OperatorDescr("<=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.comp,
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] <= args[1] ? 1 : 0;
					});
			},
			bytecode: [A3a.vm.bc.binaryOpLessEqThan]
		}),
	new A3a.Compiler.OperatorDescr(">",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.comp,
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] > args[1] ? 1 : 0;
					});
			},
			bytecode: [A3a.vm.bc.binaryOpGreaterThan]
		}),
	new A3a.Compiler.OperatorDescr(">=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.comp,
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] >= args[1] ? 1 : 0;
					});
			},
			bytecode: [A3a.vm.bc.binaryOpGreaterEqThan]
		}),
	new A3a.Compiler.OperatorDescr("&",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.binand,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] & args[1];
					});
			},
			bytecode: [A3a.vm.bc.binaryOpBitAnd]
		}),
	new A3a.Compiler.OperatorDescr("|",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.binor,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] | args[1];
					});
			},
			bytecode: [A3a.vm.bc.binaryOpBitOr]
		}),
	new A3a.Compiler.OperatorDescr("^",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.binxor,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] ^ args[1];
					});
			},
			bytecode: [A3a.vm.bc.binaryOpBitXor]
		}),
	new A3a.Compiler.OperatorDescr("and",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.and,
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] && args[1] ? 1 : 0;
					});
			},
			bytecode: [A3a.vm.bc.binaryOpAnd]
		}),
	new A3a.Compiler.OperatorDescr("or",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.or,
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] || args[1] ? 1 : 0;
					});
			},
			bytecode: [A3a.vm.bc.binaryOpOr]
		}),
	new A3a.Compiler.OperatorDescr("=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.assignment
		})
];

/** Get operator properties
	@param {string} name
	@param {A3a.Compiler.opType} type
	@return {?A3a.Compiler.OperatorDescr}
*/
A3a.Compiler.prototype.getOperator = function (name, type) {
	for (var i = 0; i < this.operators.length; i++) {
		if (this.operators[i].type === type &&
			this.operators[i].name === name) {
			return this.operators[i];
		}
	}
	return null;
}

/** Check if a token not parsed yet has the specified type
	@param {number} offset token offset (0=being parsed, 1=next etc.)
	@param {Object} cls prototype
	@return {boolean}
*/
A3a.Compiler.prototype.checkTokenType = function (offset, cls) {
	return this.tokens[this.tokenIndex + offset] instanceof cls;
}

/** Check if a token not parsed yet has the specified type
	@param {number} offset token offset (0=being parsed, 1=next etc.)
	@param {string} name
	@return {boolean}
*/
A3a.Compiler.prototype.checkTokenKeyword = function (offset, name) {
	return this.tokens[this.tokenIndex + offset] instanceof A3a.Compiler.TokenKeyword &&
		this.tokens[this.tokenIndex + offset].name === name;
}

/** Create node for function call
	@param {A3a.Compiler.TokenBase} funToken
	@return {A3a.Compiler.Node}
*/
A3a.Compiler.prototype.makeFunCallNode = function (funToken) {
	return new A3a.Compiler.NodeFun(funToken, A3a.Compiler.opType.fun, null);
};

/** Parse an expression
	@param {A3a.Compiler.opPriority=} pri
	@return {A3a.Compiler.Node}
*/
A3a.Compiler.prototype.parseExpression = function (pri) {
	pri = pri || A3a.Compiler.opPriority.statement;

	/** @type {A3a.Compiler.Node} */
	var node;
	/** @type {A3a.Compiler.OperatorDescr} */
	var opDescr;

	// expect expression
	if (this.checkTokenType(0, A3a.Compiler.TokenFloat)) {
		node = new A3a.Compiler.NodeFixed(this.tokens[this.tokenIndex]);
		this.tokenIndex++;
	} else if (this.checkTokenType(0, A3a.Compiler.TokenNumber)) {
		node = new A3a.Compiler.NodeNumber(this.tokens[this.tokenIndex]);
		this.tokenIndex++;
	} else if (this.checkTokenType(0, A3a.Compiler.TokenName)) {
		if (this.checkTokenKeyword(1, "(")) {
			node = this.makeFunCallNode(this.tokens[this.tokenIndex]);
			this.tokenIndex++;
			if (this.checkTokenKeyword(1, ")")) {
				// no argument
				this.tokenIndex += 2;
			} else {
				node.children = this.parseArguments();
			}
		} else {
			node = new A3a.Compiler.NodeVar(this.tokens[this.tokenIndex]);
			this.tokenIndex++;
		}
	} else if (this.checkTokenKeyword(0, "(")) {
		this.tokenIndex++;
		node = this.parseExpression(A3a.Compiler.opPriority.par);
		if (!this.checkTokenKeyword(0, ")")) {
			throw "subexpression in expression " + this.tokens[this.tokenIndex].posString();
		}
		this.tokenIndex++;
	} else if (this.checkTokenKeyword(0, "[")) {
		node = new A3a.Compiler.NodeArray(this.tokens[this.tokenIndex]);
		this.tokenIndex++;
		/** @type {Array.<A3a.Compiler.Node>} */
		var vec = [];
		var nCols = 0;
		var nRows = 0;
		var nCols1 = 0;
		while (true) {
			vec.push(this.parseExpression(A3a.Compiler.opPriority.comma));
			if (nCols1 === 0) {
				nRows++;
			}
			nCols1++;
			if (nRows > 1 && nCols1 > nCols) {
				throw "non-rectangular array " + this.tokens[this.tokenIndex].posString();
			} else if (nCols1 > nCols) {
				nCols = nCols1;
			}
			if (this.checkTokenType(0, A3a.Compiler.TokenKeyword)) {
				this.tokenIndex++;
				if (this.tokens[this.tokenIndex - 1].name === "]") {
					break;
				} else if (this.tokens[this.tokenIndex - 1].name === ",") {
					continue;
				} else if (this.tokens[this.tokenIndex - 1].name === ";") {
					nCols = nCols1;
					nCols1 = 0;
					continue;
				}
			}
			throw "array " + this.tokens[this.tokenIndex - 1].posString();
		}
		A3a.Compiler.NodeArray.dims = [nRows, nCols];
		for (var i = 0; i < nCols; i++) {
			for (var j = 0; j < nRows; j++) {
				node.addItem(vec[j * nCols + i]);
			}
		}
	} else if (this.checkTokenType(0, A3a.Compiler.TokenKeyword)
		&& (opDescr = this.getOperator(this.tokens[this.tokenIndex].name, A3a.Compiler.opType.prefix))) {
		node = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex],
			A3a.Compiler.opType.prefix, opDescr);
		this.tokenIndex++;
		node.children.push(this.parseExpression(A3a.Compiler.opPriority.pre));
		if (opDescr.resultTypePropagate) {
			node.resultType = opDescr.resultTypePropagate(this, node, [node.children[0].resultType]);
		}
	} else if (this.checkTokenType(0, A3a.Compiler.TokenKeyword)
		&& (opDescr = this.getOperator(this.tokens[this.tokenIndex].name, A3a.Compiler.opType.constant))) {
		node = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex],
			A3a.Compiler.opType.constant, opDescr);
		this.tokenIndex++;
	} else if (this.tokenIndex < this.tokens.length) {
		throw "unexpected token in expression " + this.tokens[this.tokenIndex].posString();
	} else {
		throw "unexpected end of file";
	}

	// check infix or postfix operator, or indexing
	while (this.checkTokenType(0, A3a.Compiler.TokenKeyword)) {
		opDescr = this.getOperator(this.tokens[this.tokenIndex].name, A3a.Compiler.opType.postfix);
		if (opDescr && opDescr.priority >= pri) {
			node = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex],
				A3a.Compiler.opType.postfix,
				opDescr,
				[node]);
			this.tokenIndex++;
			continue;
		}

		opDescr = this.getOperator(this.tokens[this.tokenIndex].name, A3a.Compiler.opType.infix);
		if (opDescr && (pri === A3a.Compiler.opPriority.assignment ? opDescr.priority >= pri : opDescr.priority > pri)) {
			node = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex],
				A3a.Compiler.opType.infix,
				opDescr,
				[node]);
			this.tokenIndex++;
			node.children.push(this.parseExpression(opDescr.priority));
			if (opDescr.resultTypePropagate) {
				node.resultType = opDescr.resultTypePropagate(this, node, node.children.map(function (c) { return c.resultType; }));
			}
			continue;
		}

		if (this.tokens[this.tokenIndex].name === "[") {
			if (!(node instanceof A3a.Compiler.NodeVar)) {
				throw "unexpected indexing";
			}
			var resultType = node.resultType;
			var indices = this.parseArguments(true);
			node = new A3a.Compiler.NodeIndexing(node.head, indices);
			node.resultType = resultType;
			continue;
		}

		break;
	}

	return node;
};

/** Parse arguments, starting with left parenthesis
	@param {boolean=} brackets true if arguments are enclosed in brackets instead of parentheses
	@return {Array.<A3a.Compiler.Node>}
*/
A3a.Compiler.prototype.parseArguments = function (brackets) {
	/** @type {Array.<A3a.Compiler.Node>} */
	var args = [];
	if (!this.checkTokenKeyword(0, brackets ? "[" : "(")) {
		throw "left " + (brackets ? "bracket" : "parenthesis") + " expected";
	}
	this.tokenIndex++;
	while (true) {
		var expr = this.parseExpression(A3a.Compiler.opPriority.comma);
		args.push(expr);
		if (!this.checkTokenType(0, A3a.Compiler.TokenKeyword)) {
			throw "syntax error in arguments";
		}
		if (this.checkTokenKeyword(0, brackets ? "]" : ")")) {
			this.tokenIndex++;
			break;
		} else if (this.checkTokenKeyword(0, ",")) {
			this.tokenIndex++;
		} else {
			throw "syntax error in arguments " + this.tokens[this.tokenIndex].posString();
		}
	}
	return args;
};

/** Parse next statement
	@return {Array.<A3a.Compiler.NodeStatement>}
*/
A3a.Compiler.prototype.parseNextStatement = function () {
	/** @type {A3a.Compiler.Node} */
	var node;
	/** @type {A3a.Compiler.Node} */
	var expr;
	/** @type {A3a.Compiler.Node} */
	var expr2;
	/** @type {A3a.Compiler.TokenName} */
	var name;

	if (this.tokenIndex >= this.tokens.length) {
		throw "no more tokens";
	} else if (this.tokens[this.tokenIndex] instanceof A3a.Compiler.TokenKeyword) {
		// statement beginning with a keyword
		var head = this.tokens[this.tokenIndex];
		switch (head.name) {
		case "const":
			// expect "const name = constantexpr"
			if (!this.checkTokenType(1, A3a.Compiler.TokenName)
				|| !this.checkTokenKeyword(2, "=")) {
				throw "syntax error for \"const\" " + head.posString();
			}
			name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex + 1]);
			this.tokenIndex += 3;
			expr = this.parseExpression();
			expr = expr.optimize(this);
			if (!(expr instanceof A3a.Compiler.NodeNumber)) {
				throw "non-constant expression in constant definition " + this.tokens[this.tokenIndex].posString();
			}
			return [new A3a.Compiler.NodeStatementConst(head, name.name, expr)];
		case "var":
			// expect "var name" or "var name[num]" or "var name[] = expr"
			if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
				throw "unexpected token after \"var\" " + head.posString();
			}
			name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex + 1]);
			this.tokenIndex += 2;
			if (this.checkTokenType(0, A3a.Compiler.TokenKeyword)) {
				switch (this.tokens[this.tokenIndex].name) {
				case "[":
					if (this.checkTokenKeyword(1, "]")) {
						// sizeless array: expect initialization
						this.tokenIndex += 2;
						if (!this.checkTokenKeyword(0, "=")) {
							throw "missing size or initial value in array declaration"  +
								this.tokens[this.tokenIndex - 2].posString();
						}
						expr = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex],
							A3a.Compiler.opType.infix,
							this.getOperator("=", A3a.Compiler.opType.infix),
							[new A3a.Compiler.NodeVar(name)]);
						this.tokenIndex++;
						expr.children.push(this.parseExpression());
						expr.resultType = expr.children[1].resultType;
						expr.shouldProduceValue = false;
						var sizeExpr = new A3a.Compiler.NodeFun(
							new A3a.Compiler.TokenKeyword(expr.head.srcIndex,
								expr.head.srcLine,
								expr.head.srcCol,
								"size"),
								A3a.Compiler.opType.prefix,
								this.getOperator("size", A3a.Compiler.opType.prefix),
								[expr.children[1]]);
						return [new A3a.Compiler.NodeStatementVar(head, name, expr.resultType, [sizeExpr], expr)];
					} else {
						// expect size
						this.tokenIndex++;
						var sizeExpr = this.parseExpression();
						if (!this.checkTokenKeyword(0, "]")) {
							throw "array size syntax error" + this.tokens[this.tokenIndex].posString();
						}
						this.tokenIndex++;
						if (this.checkTokenKeyword(0, "=")) {
							expr = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex],
								A3a.Compiler.opType.infix,
								this.getOperator("=", A3a.Compiler.opType.infix),
								[new A3a.Compiler.NodeVar(name)]);
							this.tokenIndex++;
							expr.children.push(this.parseExpression());
							expr.resultType = expr.children[1].resultType;
							expr.shouldProduceValue = false;
							expr = expr.optimize(this);
							return [new A3a.Compiler.NodeStatementVar(head, name,
								expr.resultType, [sizeExpr], expr)];
						} else {
							return [new A3a.Compiler.NodeStatementVar(head, name,
								A3a.Compiler.resultType.undef, [sizeExpr])];
						}
					}
				case "=":
					expr = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex],
						A3a.Compiler.opType.infix,
						this.getOperator("=", A3a.Compiler.opType.infix),
						[new A3a.Compiler.NodeVar(name)]);
					this.tokenIndex++;
					expr.children.push(this.parseExpression());
					expr.resultType = expr.children[1].resultType;
					expr.shouldProduceValue = false;
					expr = expr.optimize(this);
					return [new A3a.Compiler.NodeStatementVar(head, name, expr.resultType, null, expr)];
				}
			}
			return [new A3a.Compiler.NodeStatementVar(head, name,
				A3a.Compiler.resultType.undef)];
		case "if":
		case "elseif":
			this.tokenIndex++;
			expr = this.parseExpression();
			if (!this.checkTokenKeyword(0, "then")) {
				throw "\"then\" expected after \"if\" statement " + this.tokens[this.tokenIndex].posString();
			}
			this.tokenIndex++;
			return [head.name === "if"
				? new A3a.Compiler.NodeStatementIf(head, expr)
				: new A3a.Compiler.NodeStatementElseif(head, expr)];
		case "when":
			this.tokenIndex++;
			expr = this.parseExpression();
			if (!this.checkTokenKeyword(0, "do")) {
				throw "\"do\" expected after \"when\" statement " + this.tokens[this.tokenIndex].posString();
			}
			this.tokenIndex++;
			return [new A3a.Compiler.NodeStatementWhen(head, expr)];
		case "while":
			this.tokenIndex++;
			expr = this.parseExpression();
			if (!this.checkTokenKeyword(0, "do")) {
				throw "\"do\" expected after \"while\" statement " + this.tokens[this.tokenIndex].posString();
			}
			this.tokenIndex++;
			return [new A3a.Compiler.NodeStatementWhile(head, expr)];
		case "for":
			if (!this.checkTokenType(1, A3a.Compiler.TokenName)
				|| !this.checkTokenKeyword(2, "in")) {
				throw "\"for\" syntax error " + head.posString();
			}
			name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex + 1]);
			this.tokenIndex += 3;
			expr = this.parseExpression();
			if (!this.checkTokenKeyword(0, ":")) {
				throw "range expected in \"for\" statement " + this.tokens[this.tokenIndex].posString();
			}
			this.tokenIndex++;
			expr2 = this.parseExpression();
			/** @type {?A3a.Compiler.Node} */
			var step = null;
			if (this.checkTokenKeyword(0, "step")) {
				this.tokenIndex++;
				step = this.parseExpression();
			}
			if (!this.checkTokenKeyword(0, "do")) {
				throw "\"do\" expected after \"for\" statement " + this.tokens[this.tokenIndex].posString();
			}
			this.tokenIndex++;
			return [new A3a.Compiler.NodeStatementFor(head, name, expr, expr2, step)];
		case "end":
			this.tokenIndex++;
			return [new A3a.Compiler.NodeStatementEnd(head)];
		case "call":
			if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
				throw "\"call\" syntax error " + head.posString();
			}
			name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex + 1]);
			this.tokenIndex += 2;
			if (this.checkTokenKeyword(0, "(")) {
				return [new A3a.Compiler.NodeStatementCall(head, name.name, this.parseArguments())];
			}
			return [new A3a.Compiler.NodeStatementCall(head, name.name, [])];
		case "callsub":
			if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
				throw "\"callsub\" syntax error " + head.posString();
			}
			name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex + 1]);
			this.tokenIndex += 2;
			return [new A3a.Compiler.NodeStatementCallSub(head, name.name)];
		case "else":
			this.tokenIndex++;
			return [new A3a.Compiler.NodeStatementElse(head)];
		case "emit":
			if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
				throw "\"emit\" syntax error " + head.posString();
			}
			name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex + 1]);
			this.tokenIndex += 2;
			var userEvent = this.findUserEvent(name.name);
			if (userEvent == null) {
				throw "Unknown user event " + name.name + " " + head.posString();
			}
			if (userEvent.size > 0) {
				expr = this.parseExpression();
				return [new A3a.Compiler.NodeStatementEmit(head, name.name, expr)];
			} else {
				return [new A3a.Compiler.NodeStatementEmit(head, name.name)];
			}
		case "onevent":
			if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
				throw "unexpected token after \"onevent\" " + head.posString();
			}
			name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex + 1]);
			this.tokenIndex += 2;
			return [new A3a.Compiler.NodeStatementOnevent(head, name.name)];
		case "return":
			this.tokenIndex++;
			return [new A3a.Compiler.NodeStatementReturn(head)];
		case "sub":
			if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
				throw "unexpected token after \"sub\" " + head.posString();
			}
			name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex + 1]);
			this.tokenIndex += 2;
			return [new A3a.Compiler.NodeStatementSub(head, name.name)];
		}
	}

	// other: probably a pure expression (assignment)
	expr = this.parseExpression();
	if (expr instanceof A3a.Compiler.NodeFun) {
		expr.shouldProduceValue = false;
	}
	expr = expr.optimize(this);
	return [new A3a.Compiler.NodeStatementExpression(expr)];
};

/** Hook for additional processing once the token array has been created
	@return {void}
*/
A3a.Compiler.prototype.processTokenArray = function () {
	// empty
};

/** Build statement array by parsing tokens
	@return {void}
*/
A3a.Compiler.prototype.buildStatementArray = function () {
	this.tokenIndex = 0;
	this.statements = [];
	while (this.tokenIndex < this.tokens.length) {
		this.statements = this.statements.concat(this.parseNextStatement());
	}
};

/** Hook for additional processing once the statement array has been created
	@return {void}
*/
A3a.Compiler.prototype.processStatementArray = function () {
	// empty
};

/** Dump statement array using a callback function
	@param {function(A3a.Compiler.NodeStatement):void} dumpFun
	@return {void}
*/
A3a.Compiler.prototype.dumpStatementArray = function (dumpFun) {
	for (var i = 0; i < this.statements.length; i++) {
		dumpFun(this.statements[i]);
	}
};

/** Add a variable or constant definition
	@param {A3a.Compiler.Node} statement
	@return {void}
*/
A3a.Compiler.prototype.addVariableOrConstantDef = function (statement) {
	if (statement instanceof A3a.Compiler.NodeStatementConst) {
		statement.val = statement.val.optimize(this);
		if (!(statement.val instanceof A3a.Compiler.NodeNumber)) {
			throw "constant definition " + statement.head.posString();
		}
		this.addConstant(statement.constName, statement.val.n, statement.val.resultType);
	} else if (statement instanceof A3a.Compiler.NodeStatementVar) {
		statement.size = 1;
		statement.dims = [];
		if (statement.sizeExpr) {
			statement.sizeExpr = statement.sizeExpr.map(function (expr) {
				var e = expr.optimize(this);
				if (!(e instanceof A3a.Compiler.NodeNumber)
					|| e.n <= 0) {
					throw "array variable size " + statement.head.posString();
				}
				statement.size *= e.n;
				statement.dims.push(e.n);
				return e;
			}, this);
		}
		statement.offset = this.varSize;
		if (statement.children[0]) {
			statement.resultType = statement.children[0].resultType;
		}
		this.varSize += statement.size;
		this.addVariable(statement.varName, statement.size, statement.dims,
			statement.offset, statement.resultType);
	}
};

/** Reset context before allocating variables or generating byte code
	(hook for subclasses with local declarations, called at beginning
	of program)
	@return {void}
*/
A3a.Compiler.prototype.resetContext = function () {
	// empty
};

/** Set context before allocating variables or generating byte code
	(hook for subclasses with local declarations)
	@param {*} context
	@return {void}
*/
A3a.Compiler.prototype.setContext = function (context) {
	// empty
};

/** Get current context to be able to restore it later with setContext
	(hook for subclasses with local declarations)
	@return {*}
*/
A3a.Compiler.prototype.getContext = function () {
	return null;
};

/** Define constants and allocate variables
	@return {void}
*/
A3a.Compiler.prototype.allocateVariables = function () {
	// find variable declarations to resolve their size and constant definitions to resolve them
	//this.var = [];
	this.varSize = this.asebaNode.varSize;	// after node predefined variables
	for (var i = 0; i < this.statements.length; i++) {
		this.addVariableOrConstantDef(this.statements[i]);
	}
};

A3a.Compiler.prototype.changeContext = function (statement, stack) {
	switch (statement.type) {
	case A3a.Compiler.NodeStatement.type.begin:
		stack.push(this.getContext());
		this.setContext(statement.contexts[0]);
		break;
	case A3a.Compiler.NodeStatement.type.middle:
		this.setContext(statement.contexts[0]);
		break;
	case A3a.Compiler.NodeStatement.type.end:
		this.setContext(stack.pop());
		break;
	}
};

/**	Parse statements and build tree of nodes
	@return {void}
*/
A3a.Compiler.prototype.buildTree = function () {

	var self = this;
	var stack;
	var stackContext = [];

	/** Do what's required to terminate a block
		@return {void}
	*/
	function terminateBlock() {
		if (stack.length > 1) {
			var b = stack[stack.length - 1].head;
			throw "unterminated " + b.name + " " + b.posString();
		}
		self.codeBlocks.push(stack[0]);
	}

	this.allocateVariables();

	// propagate sizes in expressions
	this.resetContext();
	stackContext = [];
	this.statements.forEach(function (statement) {
		this.changeContext(statement, stackContext);
		statement.resolveArraySize(this);
	}, this);

	// optimize all statements again
	this.resetContext();
	stackContext = [];
	for (var i = 0; i < this.statements.length; i++) {
		this.changeContext(this.statements[i], stackContext);
		this.statements[i] =
			/** @type {A3a.Compiler.NodeStatement} */(this.statements[i].optimize(this));
	}

	// replace array assignments with separate assignments for each items
	this.resetContext();
	stackContext = [];
	for (var i = 0; i < this.statements.length; i++) {
		this.changeContext(this.statements[i], stackContext);
		this.statements[i] =
			/** @type {A3a.Compiler.NodeStatement} */(this.statements[i].explodeArrayNode(this));
	}

	// build trees for initial code / event handlers / subroutines
	this.codeBlocks = [];
	stack = [new A3a.Compiler.NodeStatementOnevent(null, "init")];
	this.resetContext();
	for (var i = 0; i < this.statements.length; i++) {
		switch (this.statements[i].type) {
		case A3a.Compiler.NodeStatement.type.plain:
			this.statements[i].postProcess(this, this.statements[i]);
			stack[stack.length - 1].children.push(this.statements[i]);
			break;
		case A3a.Compiler.NodeStatement.type.blockHeader:
			// new block
			this.setContext(this.statements[i].contexts[0]);
			terminateBlock();
			stack = [this.statements[i].newBlock()];
			break;
		case A3a.Compiler.NodeStatement.type.begin:
			this.setContext(this.statements[i].contexts[0]);
			this.statements[i].processBeginStatement(this);
			stack.push(this.statements[i]);
			break;
		case A3a.Compiler.NodeStatement.type.middle:
			this.setContext(this.statements[i].contexts[0]);
			stack[stack.length - 1].processMiddleStatement(this.statements[i]);
			break;
		case A3a.Compiler.NodeStatement.type.end:
			if (stack.length < 2) {
				var b = this.statements[i].head;
				throw "unexpected end " + b.posString();
			}
			this.setContext(this.statements[i].contexts[0]);
			stack[stack.length - 1].processEndStatement(this.statements[i]);
			var st = stack.pop();
			this.setContext(this.statements[i].contexts[this.statements[i].contexts.length - 1]);
			st.postProcess(this, this.statements[i]);
			stack[stack.length - 1].children.push(st);
			break;
		default:
			throw "not implemented " + this.statements[i].type;
		}
	}
	terminateBlock();
};

/** Hook for additional processing once the tree has been created
	@return {void}
*/
A3a.Compiler.prototype.processTree = function () {
	// empty
};

/** Generate byte code for user function
	@param {A3a.Compiler.Node} node
	@return {?Array.<number>}
*/
A3a.Compiler.prototype.generateA3aBCForFunction = function (node) {
	return null;
}

/** Generate A3a bytecode
	@param {A3a.Compiler} compiler
	@param {boolean=} isTopLevel true for top-level construct (onevent, sub etc.);
	default is false
	@return {Array.<number>}
*/
A3a.Compiler.Node.prototype.generateA3aBC = function (compiler, isTopLevel) {
	/** @type {Array.<number>} */
	var bc = [];
	var bcAddr0 = compiler.bcAddr;
	for (var i = 0; i < this.children.length; i++) {
		bc = bc.concat(this.children[i].generateA3aBC(compiler));
		compiler.bcAddr = bcAddr0 + bc.length;
	}
	return bc;
};

/** Compile literal number
	@param {number} num
	@return {Array.<number>}
*/
A3a.Compiler.NodeNumber.generateA3aBC = function (num) {
	if (num >= -0x800 && num < 0x800) {
		return [(A3a.vm.bc.smallImmediate << 12) | (num & 0xfff)];
	} else {
		return [A3a.vm.bc.largeImmediate << 12, num & 0xffff];
	}
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeNumber.prototype.generateA3aBC = function (compiler, isTopLevel) {
	return this.shouldProduceValue
 		? A3a.Compiler.NodeNumber.generateA3aBC(this.n)
		: [];
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeVar.prototype.generateA3aBC = function (compiler, isTopLevel) {
	return this.dummyPlaceholder
		? []
		: compiler.hasConstant(this.name)
			? A3a.Compiler.NodeNumber.generateA3aBC(compiler.getConstant(this.name).val)
			: compiler.getVariable(this).generateA3aBCForLoad(compiler);
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeFun.prototype.generateA3aBC = function (compiler, isTopLevel) {
	/** Value of an assignment subexpression
		@enum {number}
	*/
	var assignmentResultValue = {
		void: 0,
		preAssign: 1,
		postAssign: 2
	};
	/** Compile an assignment
		@param {A3a.Compiler.Node} lhs
		@param {A3a.Compiler.Node} rhs
		@param {boolean} pushVar true to push variable value before executing
		the rhs (for ++, --, += etc. with a missing argument in the top-level
		operator), false if the rhs is a complete expression (for =)
		@param {assignmentResultValue} resultKind
		@return {Array.<number>}
	*/
	function compileAssignment(lhs, rhs, pushVar, resultKind) {
		/** @type {Array.<number>} */
		var bc = [];

		/** Compile assignment to constant address
			@param {A3a.Compiler.VariableDescr} variable
			@param {number=} offset (default: none (0))
			@return {void}
		*/
		function compileAssignmentConstAddr(variable, offset) {
			if (resultKind === assignmentResultValue.postAssign) {
				// push variable before assignment
				bc = bc.concat(variable.generateA3aBCForLoad(compiler, offset));
			}
			if (pushVar) {
				// push variable as missing argument of top-level rhs
				bc = bc.concat(variable.generateA3aBCForLoad(compiler, offset));
			}
			bc = bc
				.concat(rhs.generateA3aBC(compiler))
				.concat(compiler.generateA3aBCForTypeConversion(rhs.resultType, variable.resultType))
				.concat(variable.generateA3aBCForStore(compiler, offset));
			if (resultKind === assignmentResultValue.preAssign) {
				// push variable after assignment
				bc = bc.concat(variable.generateA3aBCForLoad(compiler, offset));
			}
		}

		if (lhs instanceof A3a.Compiler.NodeIndexing) {
			var variable = compiler.getVariable(lhs);
			if (lhs.areIndicesConstant()) {
				// constant index: direct access
				var index = lhs.constantIndicesToSingleIndex(variable);
				if (index >= variable.size) {
					throw "index out of range";
				}
				compileAssignmentConstAddr(variable, index);
			} else {
				// expression index: indirect access
				// store index into a temp variable if used multiple times
				if (resultKind === assignmentResultValue.void && !pushVar) {
					// index used only to store value: do it directly
					bc = bc
						.concat(rhs.generateA3aBC(compiler))
						.concat(compiler.generateA3aBCForTypeConversion(rhs.resultType, variable.resultType))
						.concat(lhs.generateA3aBCForIndices(compiler))
						.concat(variable.generateA3aBCForStoreIndirect(compiler));
				} else {
					// index used multiple times: store it in temp variable
					var tempVarOffset = compiler.allocTempVariable(1);
					bc = bc
						.concat(lhs.generateA3aBCForIndices(compiler))
						.concat((A3a.vm.bc.store << 12) | tempVarOffset);
					if (resultKind === assignmentResultValue.postAssign) {
						// push variable before assignment
						bc = bc
							.concat((A3a.vm.bc.load << 12) | tempVarOffset)
							.concat(variable.generateA3aBCForLoadIndirect(compiler));
					}
					if (pushVar) {
						// push variable as missing argument of top-level rhs
						bc = bc
							.concat((A3a.vm.bc.load << 12) | tempVarOffset)
							.concat(variable.generateA3aBCForLoadIndirect(compiler));
					}
					bc = bc
						.concat(rhs.generateA3aBC(compiler))
						.concat(compiler.generateA3aBCForTypeConversion(rhs.resultType, variable.resultType))
						.concat((A3a.vm.bc.load << 12) | tempVarOffset)
						.concat(variable.generateA3aBCForStoreIndirect(compiler));
					if (resultKind === assignmentResultValue.preAssign) {
						// push variable after assignment
						bc = bc
							.concat((A3a.vm.bc.load << 12) | tempVarOffset)
							.concat(variable.generateA3aBCForLoadIndirect(compiler));
					}
				}
			}
		} else if (lhs instanceof A3a.Compiler.NodeVar) {
			var variable = compiler.getVariable(lhs);
			compileAssignmentConstAddr(variable);
		} else {
			throw "bad assignment";
		}
		return bc;
	}

	var name = this.head.name;
	switch (name) {
	case "=":
		return compileAssignment(this.children[0], this.children[1], false,
			this.shouldProduceValue ? assignmentResultValue.preAssign : assignmentResultValue.void);
	case "++":
	case "--":
		if (!(this.children[0] instanceof A3a.Compiler.NodeVar)) {
			throw "invalid operand " + this.head.posString();
		}
		var opName = name[0];	// + or -
		var opDescr = compiler.getOperator(opName, A3a.Compiler.opType.infix);
		var nodeFun = new A3a.Compiler.NodeFun(
			new A3a.Compiler.TokenKeyword(this.head.srcIndex, this.head.srcLine, this.head.srcCol, opName),
			A3a.Compiler.opType.infix,
			opDescr,
			[
				this.children[0].makeDummyPlaceholder(),
				new A3a.Compiler.NodeNumber(new A3a.Compiler.TokenNumber(this.head.srcIndex, this.head.srcLine, this.head.srcCol, 1))
			]);
		if (opDescr.resultTypePropagate) {
			var variable = compiler.getVariable(/** @type {A3a.Compiler.NodeVar} */(this.children[0]));
			nodeFun.resultType = opDescr.resultTypePropagate(compiler, nodeFun,
				[variable.resultType, A3a.Compiler.resultType.number]);
		}
		return compileAssignment(this.children[0],
			nodeFun,
			true,
			this.shouldProduceValue
				? this.type === A3a.Compiler.opType.prefix
					? assignmentResultValue.preAssign
					: assignmentResultValue.postAssign
				: assignmentResultValue.void);
	default:
		if (this.type === A3a.Compiler.opType.infix &&
			this.operatorDescr.priority === A3a.Compiler.opPriority.assignment) {
			if (!(this.children[0] instanceof A3a.Compiler.NodeVar)) {
				throw "invalid operand " + this.head.posString();
			}
			var opName = name.slice(0, -1);
			var opDescr = compiler.getOperator(opName, A3a.Compiler.opType.infix);
			var nodeFun = new A3a.Compiler.NodeFun(
				new A3a.Compiler.TokenKeyword(this.head.srcIndex, this.head.srcLine, this.head.srcCol, opName),
				A3a.Compiler.opType.infix,
				opDescr,
				[this.children[0].makeDummyPlaceholder(), this.children[1]]);
			if (opDescr.resultTypePropagate) {
				var variable = compiler.getVariable(/** @type {A3a.Compiler.NodeVar} */(this.children[0]));
				nodeFun.resultType = opDescr.resultTypePropagate(compiler, nodeFun,
					[variable.resultType, this.children[1].resultType]);
			}
			return compileAssignment(this.children[0],
				nodeFun,
				true,
				this.shouldProduceValue ? assignmentResultValue.preAssign : assignmentResultValue.void);
		} else if (this.operatorDescr && this.operatorDescr.generateA3aBC) {
			return this.operatorDescr.generateA3aBC(this, compiler);
		} else {
			switch (this.type) {
			case A3a.Compiler.opType.prefix:
				return A3a.Compiler.Node.prototype.generateA3aBC.call(this, compiler)
					.concat(this.operatorDescr.bytecode);
			case A3a.Compiler.opType.infix:
				return A3a.Compiler.Node.prototype.generateA3aBC.call(this, compiler)
					.concat(this.operatorDescr.bytecode);
			case A3a.Compiler.opType.constant:
				return this.operatorDescr.bytecode;
			case A3a.Compiler.opType.fun:
				var bc = compiler.generateA3aBCForFunction(this);
				if (bc !== null) {
					return bc;
				}
				var macroFunctionDef = compiler.getMacroFunctionDef(name);
				if (macroFunctionDef != null) {
					if (macroFunctionDef.nArgs !== this.children.length) {
						throw "wrong number of arguments";
					}
					bc = [];
					// store arguments in temp variable
					var tempVarOffset = compiler.allocTempVariable(macroFunctionDef.nArgs +
						(macroFunctionDef.nTmp || 0));
					for (var j = 0; j < this.children.length; j++) {
						bc = bc.concat(this.children[j].generateA3aBC(compiler));
						bc = bc.concat((A3a.vm.bc.store << 12) | tempVarOffset + j);
					}
					bc = bc.concat(macroFunctionDef.genCode(compiler, compiler.asebaNode,
						this.children.map(function (node) { return node.resultType; }),
						tempVarOffset));
					return bc;
				}
				throw "unknown function " + name + " " + this.head.posString();
			default:
				throw "internal";
			}
		}
	}
};

/** Compile a conditional branch to bytecode, folding condition if possible
	@param {A3a.Compiler} compiler
	@param {boolean=} when true for when, false for if/elseif/while (default)
	@return {Array.<number>} bytecode
*/
A3a.Compiler.Node.prototype.generateA3aCondBranchBC = function (compiler, when) {
	if (this instanceof A3a.Compiler.NodeFun && this.children.length === 2) {
		return this.children[0].generateA3aBC(compiler)
			.concat(this.children[1].generateA3aBC(compiler))
			.concat([
				(A3a.vm.bc.conditionalBranch << 12) | (when ? 0x100 : 0) | (this.operatorDescr.bytecode[0] & 0xff),
				0
			]);
	} else {
		return this.generateA3aBC(compiler)
			.concat(A3a.vm.bc.smallImmediate << 12,
				(A3a.vm.bc.conditionalBranch << 12) | (when ? 0x100 : 0) | A3a.vm.condName.indexOf("ne"),
				0);
	}
};

/** Generate bytecode for indices, resulting in a single index on the vm stack
	@return {Array.<number>}
*/
A3a.Compiler.NodeIndexing.prototype.generateA3aBCForIndices = function (compiler) {
	var variable = compiler.getVariable(this);
	if (this.children.length > variable.dims.length) {
		throw "too many indices" + this.head.posString();
	}
	/** @type {Array.<number>} */
	var bc = [];
	var m = 1;
	for (var i = 0; i < this.children.length; i++) {
		bc = bc.concat(this.children[i].generateA3aBC(compiler));
		if (i > 0) {
			bc = bc.concat(
				(A3a.vm.bc.smallImmediate << 12) | m,
				A3a.vm.bc.binaryOpMult,
				A3a.vm.bc.binaryOpAdd
			);
		}
		m *= variable.dims[i];
	}
	return bc;
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeIndexing.prototype.generateA3aBC = function (compiler, isTopLevel) {
	if (this.dummyPlaceholder) {
		return [];
	}
	var variable = compiler.getVariable(this);
	if (this.areIndicesConstant()) {
		// constant index: direct access
		var index = this.constantIndicesToSingleIndex(variable);
		if (index >= variable.size) {
			throw "index out of range " + this.head.posString();
		}
		return variable.generateA3aBCForLoad(compiler, index);
	} else {
		// expression index: indirect access
		return this.generateA3aBCForIndices(compiler)
			.concat(variable.generateA3aBCForLoadIndirect(compiler));
	}
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeArray.prototype.generateA3aBC = function (compiler, isTopLevel) {
	throw "internal";
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatement.prototype.generateA3aBC = function (compiler, isTopLevel) {
	throw "internal";
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementOnevent.prototype.generateA3aBC = function (compiler, isTopLevel) {
	var baseContext = compiler.getContext();
	this.prepareGenerateA3aBC(compiler);
	compiler.setContext(this.contexts[0]);
	var bc = this.eventName === "init" ? compiler.startupBytecode : [];
	compiler.bcAddr += bc.length;
	bc = bc
		.concat(A3a.Compiler.Node.prototype.generateA3aBC.call(this, compiler))
		.concat(A3a.vm.bc.stop << 12);
	compiler.setContext(baseContext);
	return bc;
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementSub.prototype.generateA3aBC = function (compiler, isTopLevel) {
	var baseContext = compiler.getContext();
	this.prepareGenerateA3aBC(compiler);
	compiler.setContext(this.contexts[0]);
	var bc = A3a.Compiler.Node.prototype.generateA3aBC.call(this, compiler)
		.concat(A3a.vm.bc.ret << 12);
	compiler.setContext(baseContext);
	return bc;
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementConst.prototype.generateA3aBC = function (compiler, isTopLevel) {
	this.prepareGenerateA3aBC(compiler);
	return [];
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementVar.prototype.generateA3aBC = function (compiler, isTopLevel) {
	this.prepareGenerateA3aBC(compiler);
	if (this.children.length === 0) {
		return [];
	}
	var bc = A3a.Compiler.Node.prototype.generateA3aBC.call(this, compiler);
	return bc;
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementExpression.prototype.generateA3aBC = function (compiler, isTopLevel) {
	this.prepareGenerateA3aBC(compiler);
	return this.children[0].generateA3aBC(compiler);
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementSequence.prototype.generateA3aBC = function (compiler, isTopLevel) {
	this.prepareGenerateA3aBC(compiler);
	/** @type {Array.<number>} */
	var bc = [];
	this.children.forEach(function (st) {
		bc = bc.concat(st.generateA3aBC(compiler, isTopLevel));	// invisible wrt topLevel
	});
	return bc;
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementIf.prototype.generateA3aBC = function (compiler, isTopLevel) {
	var baseContext = compiler.getContext();
	this.prepareGenerateA3aBC(compiler);
	var bcAddr0 = compiler.bcAddr;
	/** @type {Array.<number>} */
	var bc = [];
	var pendingJumpsToEndCount = 0;
	for (var i = 0; i < this.conditions.length; i++) {
		compiler.bcAddr = bcAddr0 + bc.length;
		if (i > 0) {
			compiler.addSourceToBCMapping(this.linkedStatements[i - 1]);
		}
		bc = bc.concat(this.conditions[i].generateA3aCondBranchBC(compiler));
		compiler.bcAddr = bcAddr0 + bc.length;
		compiler.prepareJump(bc);
		compiler.setContext(this.contexts[i]);
		this.conditionalCode[i].forEach(function (st) {
			bc = bc.concat(st.generateA3aBC(compiler));
			compiler.bcAddr = bcAddr0 + bc.length;
		});
		compiler.setContext(baseContext);
		if (i + 1 < this.conditionalCode.length) {
			// skip next elseif/else statements
			bc = bc.concat(A3a.vm.bc.jump << 12);
			compiler.finalizeJump(bc);	// resolve prev cond branch past this jump
			compiler.prepareJump(bc);
			pendingJumpsToEndCount++;
		} else {
			// no more statements to skip
			compiler.finalizeJump(bc);	// just resolve prev cond branch
		}
	}
	compiler.bcAddr = bcAddr0 + bc.length;
	if (this.conditionalCode.length > this.conditions.length) {
		// else part
		compiler.addSourceToBCMapping(this.conditions.length > 0
			? this.linkedStatements[this.conditions.length - 1]	// if or elseif before else
			: this,	// else alone (all if/elseif have been optimized out): if
			compiler.bcAddr + bc.length);
		compiler.setContext(this.contexts[this.conditions.length]);
		this.conditionalCode[this.conditions.length].forEach(function (st) {
			bc = bc.concat(st.generateA3aBC(compiler));
			compiler.bcAddr = bcAddr0 + bc.length;
		});
	}
	while (pendingJumpsToEndCount-- > 0) {
		compiler.finalizeJump(bc);	// resolve jump to end
	}
	compiler.setContext(baseContext);
	return bc;
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementWhen.prototype.generateA3aBC = function (compiler, isTopLevel) {
	var baseContext = compiler.getContext();
	this.prepareGenerateA3aBC(compiler);
	var bcAddr0 = compiler.bcAddr;
	var bc = this.condition.generateA3aCondBranchBC(compiler, true);
	compiler.prepareJump(bc);
	compiler.setContext(this.contexts[0]);
	this.children.forEach(function (st) {
		compiler.bcAddr = bcAddr0 + bc.length;
		bc = bc.concat(st.generateA3aBC(compiler));
	});
	compiler.finalizeJump(bc);
	compiler.setContext(baseContext);
	return bc;
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementWhile.prototype.generateA3aBC = function (compiler, isTopLevel) {
	if (this.condition == null && this.children.length === 0) {
		return [];
	}
	var baseContext = compiler.getContext();
	this.prepareGenerateA3aBC(compiler);
	var bcAddr0 = compiler.bcAddr;
	/** @type {Array.<number>} */
	var bc = [];
	if (this.condition != null) {
		bc = this.condition.generateA3aCondBranchBC(compiler);
	}
	compiler.prepareJump(bc);
	compiler.setContext(this.contexts[0]);
	this.children.forEach(function (st) {
		compiler.bcAddr = bcAddr0 + bc.length;
		bc = bc.concat(st.generateA3aBC(compiler));
	});
	compiler.bcAddr = bcAddr0 + bc.length;
	compiler.addSourceToBCMapping(this.linkedStatements[0]);
	bc = bc.concat((A3a.vm.bc.jump << 12) | (-bc.length & 0xfff));
	compiler.finalizeJump(bc);
	compiler.setContext(baseContext);
	return bc;
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementFor.prototype.generateA3aBC = function (compiler, isTopLevel) {
	var baseContext = compiler.getContext();
	this.prepareGenerateA3aBC(compiler);
	var bcAddr0 = compiler.bcAddr;
	var bc = this.children[0].generateA3aBC(compiler);
	var variable = compiler.getVariable(this.nodeVar);
 	bc = bc.concat(variable.generateA3aBCForStore(compiler));
	var beg = bc.length;
	bc = bc.concat(variable.generateA3aBCForLoad(compiler))
		.concat(this.children[1].generateA3aBC(compiler))
		.concat((A3a.vm.bc.conditionalBranch << 12) | 15, 0);
	compiler.prepareJump(bc);
	compiler.setContext(this.contexts[0]);
	for (var i = 2; i < this.children.length; i++) {
		compiler.bcAddr = bcAddr0 + bc.length;
		bc = bc.concat(this.children[i].generateA3aBC(compiler));
	}
	compiler.bcAddr = bcAddr0 + bc.length;
	compiler.addSourceToBCMapping(this.linkedStatements[0]);
	bc = bc.concat(variable.generateA3aBCForLoad(compiler));
	if (this.step) {
		bc = bc.concat(this.step.generateA3aBC(compiler));
	} else {
		bc = bc.concat(A3a.Compiler.NodeNumber.generateA3aBC(1));
	}
	bc = bc.concat(A3a.vm.bc.binaryOpAdd,
		variable.generateA3aBCForStore(compiler),
		(A3a.vm.bc.jump << 12) | (beg - bc.length - 2 & 0xfff));
	compiler.finalizeJump(bc);
	compiler.setContext(baseContext);
	return bc;
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementCall.prototype.generateA3aBC = function (compiler, isTopLevel) {
	this.prepareGenerateA3aBC(compiler);
	var fun = compiler.asebaNode.findNativeFunction(this.name);
	if (!fun) {
		throw "native function \"" + this.name + "\" not found";
	} else if (this.children.length !== fun.args.length) {
		throw "wrong number of arguments for native function \"" + this.name + "\"";
	}
	/** @type {Array.<number>} */
	var bc = [];
	// push arguments by reference in reverse order, collecting sizes
	var argSizes = [];
	var argFreeSizeVal = [];	// size of arguments with free size (0)
	for (var i = this.children.length - 1; i >= 0; i--) {
		var argNode = this.children[i];
		if (fun.args[i] < 0) {
			// must match
			if (argSizes[-fun.args[i] - 1] == undefined) {
				argSizes[-fun.args[i] - 1] = argNode.valueSize;
			} else if (argSizes[-fun.args[i] - 1] !== argNode.valueSize) {
				throw "argument size mismatch in native function \"" + this.name + "\"";
			}
		} else if (fun.args[i] === 0) {
			// free, add size
			argFreeSizeVal.push(argNode.valueSize);
		}
		// push arg ref
		if (argNode instanceof A3a.Compiler.NodeIndexing) {
			// indexed variable: indirect reference
			bc = bc
				.concat(A3a.Compiler.NodeNumber.generateA3aBC(
					compiler.getVariable(argNode).offset))
				.concat(argNode.generateA3aBCForIndices(compiler))
				.concat(A3a.vm.bc.binaryOpAdd);
		} else if (argNode instanceof A3a.Compiler.NodeVar) {
			// variable: direct reference
			bc = bc.concat(A3a.Compiler.NodeNumber.generateA3aBC(
				compiler.getVariable(argNode).offset));
		} else {
			// value: use a temporary variable
			var tempVarOffset = compiler.allocTempVariable(argNode.valueSize);
			for (var j = 0; j < argNode.valueSize; j++) {
				bc = bc.concat((argNode instanceof A3a.Compiler.NodeArray
					? argNode.children[j]
					: argNode).generateA3aBC(compiler));
				bc = bc.concat((A3a.vm.bc.store << 12) | tempVarOffset + j);
			}
			bc = bc.concat(A3a.Compiler.NodeNumber.generateA3aBC(tempVarOffset));
		}
	}
	// push size of arguments with free size (0)
	for (var i = argFreeSizeVal.length - 1; i >= 0; i--) {
		bc = A3a.Compiler.NodeNumber.generateA3aBC(argFreeSizeVal[i]).concat(bc);
	}
	// push size of arguments with size matching (negative)
	for (var i = argSizes.length - 1; i >= 0; i--) {
		if (argSizes[i] !== undefined) {
			bc = A3a.Compiler.NodeNumber.generateA3aBC(argSizes[i]).concat(bc);
		}
	}
	bc = bc.concat((A3a.vm.bc.nativeCall << 12) | fun.id);
	return bc;
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementReturn.prototype.generateA3aBC = function (compiler, isTopLevel) {
	this.prepareGenerateA3aBC(compiler);
	return [(compiler.inSubDefinition ? A3a.vm.bc.ret : A3a.vm.bc.stop) << 12];
};

/** Code placeholder for subcall, to be resolved in link phase
	@constructor
	@extends {A3a.Compiler.CodePlaceholder}
*/
A3a.Compiler.CodePlaceholderCallSub = function (compiler, statement) {
	A3a.Compiler.CodePlaceholder.call(this, compiler, statement);
};
A3a.Compiler.CodePlaceholderCallSub.prototype = Object.create(A3a.Compiler.CodePlaceholder.prototype);
A3a.Compiler.CodePlaceholderCallSub.prototype.constructor = A3a.Compiler.CodePlaceholderCallSub;

/** @inheritDoc
*/
A3a.Compiler.CodePlaceholderCallSub.prototype.generateA3aBC = function (addr) {
	var name = this.statement.name;
	if (this.compiler.subBlocks[name] === undefined) {
		throw "unknown function \"" + name + "\" " + this.statement.head.posString();
	}
	return (A3a.vm.bc.subCall << 12) | this.compiler.subBlocks[name];
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementCallSub.prototype.generateA3aBC = function (compiler, isTopLevel) {
	this.prepareGenerateA3aBC(compiler);
	return [new A3a.Compiler.CodePlaceholderCallSub(compiler, this)];
};

/**
	@inheritDoc
*/
A3a.Compiler.NodeStatementEmit.prototype.generateA3aBC = function (compiler, isTopLevel) {
	this.prepareGenerateA3aBC(compiler);
	var userEvent = compiler.findUserEvent(this.eventName);
	if (userEvent.size === 0) {
		return [(A3a.vm.bc.emit << 12) | userEvent.id, 0, 0];
	} else {
		var argNode = this.children[0];
		var varAddress = 0;
		var bc = [];
		if (argNode instanceof A3a.Compiler.NodeVar) {
			// variable: direct reference
			varAddress = compiler.getVariable(argNode).offset;
		} else {
			// value: use a temporary variable
			varAddress = compiler.allocTempVariable(argNode.valueSize);
			for (var j = 0; j < argNode.valueSize; j++) {
				bc = bc.concat((argNode instanceof A3a.Compiler.NodeArray
					? argNode.children[j]
					: argNode).generateA3aBC(compiler));
				bc = bc.concat((A3a.vm.bc.store << 12) | varAddress + j);
			}
		}
		bc = bc.concat((A3a.vm.bc.emit << 12) | userEvent.id, varAddress, argNode.valueSize);
		return bc;
	}
};

/** Generate table of event vectors at the beginning of byte code
	@return {Array.<number>}
*/
A3a.Compiler.prototype.generateEventVectorTable = function () {
	/** @type {Array.<number>} */
	var bc = [];
	return [bc.length + 1].concat(bc);
};

/** Replace code placeholders by code
	@param {Array.<(number|A3a.Compiler.CodePlaceholder)>} bc
	@param {number=} bcAddr0
	@return {void}
*/
A3a.Compiler.resolveCodePlaceholders = function (bc, bcAddr0) {
	bcAddr0 = bcAddr0 || 0;
	for (var i = 0; i < bc.length; i++) {
		if (bc[i] instanceof A3a.Compiler.CodePlaceholder) {
			bc[i] = bc[i].generateA3aBC(bcAddr0 + i);
		}
	}
};

/** Generate A3a bytecode
	@return {Array.<number>}
*/
A3a.Compiler.prototype.generateA3aBC = function () {
	this.resetJumpResolution();
	this.resetContext();
	this.sourceToBCMapping = [];
	var codeBlockBC = this.codeBlocks.map(function (block) {
		this.bcAddr = 0;
		this.setContext(block.contexts[0]);
		this.inSubDefinition = block instanceof A3a.Compiler.NodeStatementSub;
		this.sourceToBCMapping = [];
		return {
			bc: block.generateA3aBC(this, true),
			mapping: this.sourceToBCMapping
		};
	}, this);
	if (this.branches.length > 0) {
		throw "internal";
	}

	// count events
	var nEvents = 0;
	for (var i = 0; i < this.codeBlocks.length; i++) {
		if (this.codeBlocks[i] instanceof A3a.Compiler.NodeStatementOnevent) {
			nEvents++;
		}
	}

	// concatenate code, build event table and store subroutine addresses into this.subBlocks
	this.subBlocks = {};
	/** @type {Array.<(number|A3a.Compiler.CodePlaceholder)>} */
	var bc = [];
	var bc0 = [1 + 2 * nEvents];
	this.sourceToBCMapping = [];
	for (var i = 0; i < this.codeBlocks.length; i++) {
		this.sourceToBCMapping = this.sourceToBCMapping.concat(codeBlockBC[i].mapping.map(function (m) {
			return new A3a.Compiler.SourceToBCMapping(m.srcOffset, m.line, m.col, m.addr + 1 + 2 * nEvents + bc.length);
		}));
		if (this.codeBlocks[i] instanceof A3a.Compiler.NodeStatementOnevent) {
			bc0 = bc0.concat(
				this.asebaNode.eventNameToId(this.codeBlocks[i].eventName),
				1 + 2 * nEvents + bc.length
			);
			bc = bc.concat(codeBlockBC[i].bc);
		} else if (this.codeBlocks[i] instanceof A3a.Compiler.NodeStatementSub) {
			this.subBlocks[this.codeBlocks[i].subName] = 1 + 2 * nEvents + bc.length;
			bc = bc.concat(codeBlockBC[i].bc);
		}
	}

	A3a.Compiler.resolveCodePlaceholders(bc, 1 + 2 * nEvents);

	return bc0.concat(bc);
};

/** Run all compiler steps, from source code to bytecode production
	@return {Array.<number>} bytecode
*/
A3a.Compiler.prototype.compile = function () {
	this.buildTokenArray();
	this.processTokenArray();
	this.buildStatementArray();
	this.processStatementArray();
	this.buildTree();
	this.processTree();

	var bytecode = this.generateA3aBC();

	return bytecode;
};
