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

Compiler from L2 source code to Aseba VM bytecode, implemented as a subclass
of the Aseba compiler. L2 is an alternative language with support for
typed variables, fixed-point numbers, local variables, multi-dim arrays,
functions with arguments and return value, and a syntax similar to C. The
compiled code is fully compatible with the Thymio II VM.

*/

/** Compiler for new language
	@constructor
	@extends {A3a.Compiler}
	@param {A3a.A3aNode} asebaNode
	@param {string} src source code
*/
A3a.Compiler.L2 = function (asebaNode, src) {
	A3a.Compiler.call(this, asebaNode, src);
	this.floatLiteral = true;
	this.operators = A3a.Compiler.L2.operators;

	this.factor = A3a.Compiler.NodeFixed.defaultFactor;

	/** @type {Array.<string>} */
	this.def = [];

	/** @type {Array.<A3a.Compiler.L2.NodeStatementDef>} */
	this.functionDefinitions = [];

	/** @type {Array.<A3a.Compiler.VariableDescr>} */
	this.globalVariables = [];

	/** @type {Array.<Array.<A3a.Compiler.L2.Label>>} */
	this.labels = [[]];

	/** @type {Array.<Array.<A3a.Compiler.L2.Label>>} */
	this.globalLabels = [];

	// compiler state, to know which kind of variable to add
	this.inFunction = false;

	/** @type {?string} */
	this.label = null;	// current label

	// compiler state, to convert return value to expected type
	this.functionResultType = A3a.Compiler.resultType.undef;

	// loops, to resolve "break" and "continue"
	this.loops = [];
};
A3a.Compiler.L2.prototype = Object.create(A3a.Compiler.prototype);
A3a.Compiler.L2.prototype.constructor = A3a.Compiler.L2;

/**
	@typedef {{
		label: string,
		address: (number | undefined)
	}}
*/
A3a.Compiler.L2.Label;

/**	Array of keywords, from longest to smallest when sharing initial part
	@constant
*/
A3a.Compiler.L2.keywords = [
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
	"!",
	"*",
	"/",
	"%",
	"+",
	"<<",
	">>",
	"&&",
	"||",
	"&",
	"^",
	"|",
	">",
	"<",
	"=",
	",",
	"?",
	":",
	"{",
	"}",
	";",
	"bool",
	"break",
	"case",
	"const",
	"continue",
	// "def",
	"default",
	"do",
	"else",
	"emit",
	"false",
	"fixed",
	"for",
	"goto",
	"if",
	"int",
	"onevent",
	"return",
	"size",
	"switch",
	"true",
	// "var",
	"void",
	"when",
	"while"
];

/** Propagate result type by choosing type of first argument
	@param {A3a.Compiler} compiler
	@param {A3a.Compiler.Node} node
	@param {Array.<A3a.Compiler.resultType>} a
	@return {A3a.Compiler.resultType}
*/
A3a.Compiler.L2.resultTypePropagateFirst = function (compiler, node, a) {
	return a[0];
}

/** Propagate result type by choosing type of second argument
	@param {A3a.Compiler} compiler
	@param {A3a.Compiler.Node} node
	@param {Array.<A3a.Compiler.resultType>} a
	@return {A3a.Compiler.resultType}
*/
A3a.Compiler.L2.resultTypePropagateSecond = function (compiler, node, a) {
	return a[1];
}

/** Propagate result type by choosing fixed if any arg is fixed, undef if
	any arg is undef
	@param {A3a.Compiler} compiler
	@param {A3a.Compiler.Node} node
	@param {Array.<A3a.Compiler.resultType>} a
	@return {A3a.Compiler.resultType}
*/
A3a.Compiler.L2.resultTypePropagateFixed = function (compiler, node, a) {
	for (var i = 0; i < a.length; i++) {
		switch (a[i]) {
		case A3a.Compiler.resultType.undef:
		case A3a.Compiler.resultType.fixed:
			return a[i];
		case A3a.Compiler.resultType.void:
			throw "cannot use void result in expression";
		}
	}
	return A3a.Compiler.resultType.number;
}

/** Cast node type
	@param {A3a.Compiler.Node} node
	@param {A3a.Compiler.resultType} resultType
	@param {A3a.Compiler} compiler
	@return {A3a.Compiler.Node} node, or new node with type cast
*/
A3a.Compiler.L2.castNodeType = function (node, resultType, compiler) {
	if (!(node instanceof A3a.Compiler.NodeArray) &&
		node.resultType !== resultType &&
		node.resultType !== A3a.Compiler.resultType.undef) {
		if (node.resultType === A3a.Compiler.resultType.void) {
			throw "cannot use void result " + node.head.posString();
		}
		// type cast to permit further optimization
		var typeName = A3a.Compiler.L2.typeToKeyword(resultType);
		if (typeName) {
			node = new A3a.Compiler.NodeFun(
				new A3a.Compiler.TokenKeyword(node.head.srcIndex,
					node.head.srcLine,
					node.head.srcCol,
					typeName),
				A3a.Compiler.opType.prefix,
				compiler.getOperator(typeName, A3a.Compiler.opType.prefix),
				[node]);
			node = node.optimize(compiler);
		}
	}
	return node;
};

/** Optimize type of rhs to permit further optimization
	@param {A3a.Compiler.Node} node
	@param {A3a.Compiler} compiler
	@return {A3a.Compiler.Node}
*/
A3a.Compiler.L2.optimizeAssignmentType = function (node, compiler) {
	node.children[1] = A3a.Compiler.L2.castNodeType(node.children[1], node.resultType, compiler);
	return node;
};

/** @inheritDoc
*/
A3a.Compiler.L2.prototype.generateA3aBCForTypeConversion = function (fromType, toType) {
	if (fromType === A3a.Compiler.resultType.undef ||
		toType === A3a.Compiler.resultType.undef) {
		throw "internal";
	} else if (fromType === A3a.Compiler.resultType.void) {
		throw "bad conversion from void";
	}
	/** @type {Array.<number>} */
	var bc = [];
	switch (fromType) {
	case A3a.Compiler.resultType.number:
	case A3a.Compiler.resultType.boolean:
		switch (toType) {
		case A3a.Compiler.resultType.fixed:
			return [
				(A3a.vm.bc.smallImmediate << 12) | this.factor,
				A3a.vm.bc.binaryOpMult
			];
		}
		break;
	case A3a.Compiler.resultType.fixed:
		switch (toType) {
		case A3a.Compiler.resultType.number:
		case A3a.Compiler.resultType.boolean:
			return [
				(A3a.vm.bc.smallImmediate << 12) | this.factor,
				A3a.vm.bc.binaryOpDiv
			];
		}
	}
	return bc;
};

/** Generate bytecode for function arguments, converting them to the result type
	if needed
	@param {Array.<A3a.Compiler.Node>} args
	@param {A3a.Compiler.resultType} resultType
	@param {A3a.Compiler} compiler
	@return {Array.<number>}
*/
A3a.Compiler.L2.generateA3aBCArgs = function (args, resultType, compiler) {
	/** @type {Array.<number>} */
	var bc = [];
	args.forEach(function (arg) {
		if (arg instanceof A3a.Compiler.NodeFixed &&
			resultType === A3a.Compiler.resultType.number) {
			bc = bc.concat(A3a.Compiler.NodeNumber.generateA3aBC(Math.trunc(arg.n)));
		} else if (arg instanceof A3a.Compiler.NodeNumber &&
			arg.resultType === A3a.Compiler.resultType.number &&
			resultType === A3a.Compiler.resultType.fixed) {
			bc = bc.concat(A3a.Compiler.NodeNumber.generateA3aBC(arg.n *
				compiler.factor));
		} else {
			bc = bc
				.concat(arg.generateA3aBC(compiler))
				.concat(compiler.generateA3aBCForTypeConversion(arg.resultType, resultType));
		}
	});
	return bc;
};

/** Generate bytecode to compute a*b/c with 32-bit intermediate result
	@param {(!A3a.Compiler.Node|number)} a
	@param {(!A3a.Compiler.Node|number)} b
	@param {(!A3a.Compiler.Node|number)} c
	@return {Array.<number>}
*/
A3a.Compiler.L2.prototype.generateA3aMulDiv = function (a, b, c) {
	var tempVarOffset = this.allocTempVariable(4);
	return (a instanceof A3a.Compiler.Node
			? a.generateA3aBC(this)
			: A3a.Compiler.NodeNumber.generateA3aBC(a))
		.concat((A3a.vm.bc.store << 12) | tempVarOffset)
		.concat(b instanceof A3a.Compiler.Node
			? b.generateA3aBC(this)
			: A3a.Compiler.NodeNumber.generateA3aBC(b))
		.concat((A3a.vm.bc.store << 12) | tempVarOffset + 1)
		.concat(c instanceof A3a.Compiler.Node
			? c.generateA3aBC(this)
			: A3a.Compiler.NodeNumber.generateA3aBC(c))
		.concat([
			(A3a.vm.bc.store << 12) | tempVarOffset + 2,
			(A3a.vm.bc.smallImmediate << 12) | 1,
			(A3a.vm.bc.smallImmediate << 12) | tempVarOffset + 2,
			(A3a.vm.bc.smallImmediate << 12) | tempVarOffset + 1,
			(A3a.vm.bc.smallImmediate << 12) | tempVarOffset + 0,
			(A3a.vm.bc.smallImmediate << 12) | tempVarOffset + 3,
			(A3a.vm.bc.nativeCall << 12) | this.asebaNode.findNativeFunction("math.muldiv").id,
			(A3a.vm.bc.load << 12) | tempVarOffset + 3
		]);
};

/** Optimize function node if children are constant numbers
	@param {A3a.Compiler.NodeFun} node
	@param {A3a.Compiler} compiler
	@param {function(Array.<number>):number} funInt function applied if all arguments are int or bool
	@param {function(Array.<number>):number=} funFixed function applied if at least one argument is fixed
	(default: same as funInt)
	@return {A3a.Compiler.Node}
*/
A3a.Compiler.L2.optimizeConstFun = function (node, compiler, funInt, funFixed) {
	var fixedResult = false;
	var args = [];
	for (var i = 0; i < node.children.length; i++) {
		if (node.children[i] instanceof A3a.Compiler.NodeFixed) {
			fixedResult = true;
		} else if (!(node.children[i] instanceof A3a.Compiler.NodeNumber)) {
			return node;
		}
		args.push(/** @type {A3a.Compiler.NodeNumber} */(node.children[i]).n);
	}
	var r = (fixedResult && funFixed ? funFixed : funInt)(args);
	var resultType = node.operatorDescr.resultType;
	if (node.operatorDescr.resultTypePropagate) {
		resultType = node.operatorDescr.resultTypePropagate(
			compiler,
			node,
			node.children.map(function (c) { return c.resultType; })
		);
	}
	switch (resultType) {
	case A3a.Compiler.resultType.number:
	case A3a.Compiler.resultType.boolean:
		return new A3a.Compiler.NodeNumber(node.head, A3a.Compiler.NodeNumber.toS16(r));
	case A3a.Compiler.resultType.fixed:
		return new A3a.Compiler.NodeFixed(node.head, r);
	default:
		throw "internal";
	}
};

/** Operators
	@type {Array.<A3a.Compiler.OperatorDescr>}
	@const
*/
A3a.Compiler.L2.operators = [
	new A3a.Compiler.OperatorDescr("--",
		A3a.Compiler.opType.prefix,
		{
			priority: A3a.Compiler.opPriority.pre,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFirst
		}),
	new A3a.Compiler.OperatorDescr("++",
		A3a.Compiler.opType.prefix,
		{
			priority: A3a.Compiler.opPriority.pre,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFirst
		}),
	new A3a.Compiler.OperatorDescr("-",
		A3a.Compiler.opType.prefix,
		{
			priority: A3a.Compiler.opPriority.pre,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFirst,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
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
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return ~args[0];
					});
			},
			bytecode: [A3a.vm.bc.unaryOpBitNot]
		}),
	// abs implemented as a function in compiler-macros-l2.js
	new A3a.Compiler.OperatorDescr("!",
		A3a.Compiler.opType.prefix,
		{
			priority: A3a.Compiler.opPriority.pre,
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
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
	new A3a.Compiler.OperatorDescr("bool",
		A3a.Compiler.opType.prefix,
		{
			priority: A3a.Compiler.opPriority.pre,
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] != 0 ? 1 : 0;
					});
			},
			bytecode: [],
			generateA3aBC: function (node, compiler) {
				var bc = node.children[0].generateA3aBC(compiler);
				if (node.children[0].resultType !== A3a.Compiler.resultType.boolean) {
					bc = bc.concat(
						(A3a.vm.bc.smallImmediate << 12) | 0,
						A3a.vm.bc.binaryOpNotEqual
					);
				}
				return bc;
			}
		}),
	new A3a.Compiler.OperatorDescr("fixed",
		A3a.Compiler.opType.prefix,
		{
			priority: A3a.Compiler.opPriority.pre,
			resultType: A3a.Compiler.resultType.fixed,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return args[0];
					});
			},
			bytecode: [],
			generateA3aBC: function (node, compiler) {
				var bc = node.children[0].generateA3aBC(compiler);
				if (node.children[0].resultType !== A3a.Compiler.resultType.fixed) {
					bc = bc.concat(
						(A3a.vm.bc.smallImmediate << 12) | compiler.factor,
						A3a.vm.bc.binaryOpMult
					);
				}
				return bc;
			}
		}),
	new A3a.Compiler.OperatorDescr("int",
		A3a.Compiler.opType.prefix,
		{
			priority: A3a.Compiler.opPriority.pre,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return args[0];
					});
			},
			bytecode: [],
			generateA3aBC: function (node, compiler) {
				var bc = node.children[0].generateA3aBC(compiler);
				if (node.children[0].resultType === A3a.Compiler.resultType.fixed) {
					bc = bc.concat(
						(A3a.vm.bc.smallImmediate << 12) | compiler.factor,
						A3a.vm.bc.binaryOpDiv
					);
				}
				return bc;
			}
		}),
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
			priority: A3a.Compiler.opPriority.pre,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFirst
		}),
	new A3a.Compiler.OperatorDescr("++",
		A3a.Compiler.opType.postfix,
		{
			priority: A3a.Compiler.opPriority.pre,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFirst
		}),
	new A3a.Compiler.OperatorDescr("+=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.assignment,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFirst,
			optimize: A3a.Compiler.L2.optimizeAssignmentType
		}),
	new A3a.Compiler.OperatorDescr("-=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.assignment,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFirst
		}),
	new A3a.Compiler.OperatorDescr("*=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.assignment,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFirst
		}),
	new A3a.Compiler.OperatorDescr("/=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.assignment,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFirst
		}),
	new A3a.Compiler.OperatorDescr("%=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.assignment,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFirst
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
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFixed,
			bytecode: [A3a.vm.bc.binaryOpMult],
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] * args[1];
					});
			},
			generateA3aBC: function (node, compiler) {
				var fx1 = node.children[0].resultType === A3a.Compiler.resultType.fixed;
				var fx2 = node.children[1].resultType === A3a.Compiler.resultType.fixed;
				/** @type {Array.<number>} */
				var bc = [];
				if (fx1 && fx2) {
					// a * b / factor
					bc = bc.concat(compiler.generateA3aMulDiv(node.children[0],
						node.children[1],
						compiler.factor));
				} else {
					// a * b
					node.children.forEach(function (arg) {
						bc = bc.concat(arg.generateA3aBC(compiler));
					});
					bc = bc.concat(node.operatorDescr.bytecode);
				}
				return bc;
			}
		}),
	new A3a.Compiler.OperatorDescr("/",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.mult,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFixed,
			bytecode: [A3a.vm.bc.binaryOpDiv],
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						if (args[1] === 0) {
							throw "division by 0 " + node.head.posString();
						}
						return Math.trunc(args[0] / args[1]);
					},
					function (args) {
						if (args[1] === 0) {
							throw "division by 0 " + node.head.posString();
						}
						return args[0] / args[1];
					});
			},
			generateA3aBC: function (node, compiler) {
				var fx1 = node.children[0].resultType === A3a.Compiler.resultType.fixed;
				var fx2 = node.children[1].resultType === A3a.Compiler.resultType.fixed;
				/** @type {Array.<number>} */
				var bc = [];
				if (fx1) {
					if (fx2) {
						// a * factor / b
						bc = bc.concat(compiler.generateA3aMulDiv(node.children[0],
							compiler.factor,
							node.children[1]));
					} else {
						// a / b
						node.children.forEach(function (arg) {
							bc = bc.concat(arg.generateA3aBC(compiler));
						});
						bc = bc.concat(node.operatorDescr.bytecode);
					}
				} else {
					if (fx2) {
						// a * factor^2 / b
						bc = bc.concat(compiler.generateA3aMulDiv(node.children[0],
							compiler.factor * compiler.factor,
							node.children[1]));
					} else {
						// a / b
						node.children.forEach(function (arg) {
							bc = bc.concat(arg.generateA3aBC(compiler));
						});
						bc = bc.concat(node.operatorDescr.bytecode);
					}
				}
				return bc;
			}
		}),
	new A3a.Compiler.OperatorDescr("%",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.mult,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFixed,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						if (args[1] === 0) {
							throw "division by 0 " + node.head.posString();
						}
						return args[0] % args[1];
					});
			},
			bytecode: [A3a.vm.bc.binaryOpMod],
			generateA3aBC: function (node, compiler) {
				return A3a.Compiler.L2.generateA3aBCArgs(node.children, node.resultType, compiler)
					.concat(node.operatorDescr.bytecode);
			}
		}),
	new A3a.Compiler.OperatorDescr("+",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.add,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFixed,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] + args[1];
					});
			},
			bytecode: [A3a.vm.bc.binaryOpAdd],
			generateA3aBC: function (node, compiler) {
				return A3a.Compiler.L2.generateA3aBCArgs(node.children, node.resultType, compiler)
					.concat(node.operatorDescr.bytecode);
			}
		}),
	new A3a.Compiler.OperatorDescr("-",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.add,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFixed,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] - args[1];
					});
			},
			bytecode: [A3a.vm.bc.binaryOpSub],
			generateA3aBC: function (node, compiler) {
				return A3a.Compiler.L2.generateA3aBCArgs(node.children, node.resultType, compiler)
					.concat(node.operatorDescr.bytecode);
			}
		}),
	new A3a.Compiler.OperatorDescr("<<",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.shift,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] << args[1];
					});
			},
			bytecode: [A3a.vm.bc.binaryOpShiftLeft],
			generateA3aBC: function (node, compiler) {
				// cast 2nd arg to int
				return node.children[0].generateA3aBC(compiler)
					.concat(A3a.Compiler.L2.generateA3aBCArgs(node.children.slice(1),
						A3a.Compiler.resultType.number,
						compiler))
					.concat(node.operatorDescr.bytecode);
			}
		}),
	new A3a.Compiler.OperatorDescr(">>",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.shift,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] >> args[1];
					});
			},
			bytecode: [A3a.vm.bc.binaryOpShiftRight],
			generateA3aBC: function (node, compiler) {
				// cast 2nd arg to int
				return node.children[0].generateA3aBC(compiler)
					.concat(A3a.Compiler.L2.generateA3aBCArgs(node.children.slice(1),
						A3a.Compiler.resultType.number,
						compiler))
					.concat(node.operatorDescr.bytecode);
			}
		}),
	new A3a.Compiler.OperatorDescr("==",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.comp,
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] === args[1] ? 1 : 0;
					});
			},
			bytecode: [A3a.vm.bc.binaryOpEqual],
			generateA3aBC: function (node, compiler) {
				var a = node.children.map(function (node) { return node.resultType; });
				return A3a.Compiler.L2.generateA3aBCArgs(node.children,
						A3a.Compiler.L2.resultTypePropagateFixed(compiler, node, a),
						compiler)
					.concat(node.operatorDescr.bytecode);
			}
		}),
	new A3a.Compiler.OperatorDescr("!=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.comp,
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] !== args[1] ? 1 : 0;
					});
			},
			bytecode: [A3a.vm.bc.binaryOpNotEqual],
			generateA3aBC: function (node, compiler) {
				var a = node.children.map(function (node) { return node.resultType; });
				return A3a.Compiler.L2.generateA3aBCArgs(node.children,
						A3a.Compiler.L2.resultTypePropagateFixed(compiler, node, a),
						compiler)
					.concat(node.operatorDescr.bytecode);
			}
		}),
	new A3a.Compiler.OperatorDescr("<",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.comp,
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] < args[1] ? 1 : 0;
					});
			},
			bytecode: [A3a.vm.bc.binaryOpLessThan],
			generateA3aBC: function (node, compiler) {
				var a = node.children.map(function (node) { return node.resultType; });
				return A3a.Compiler.L2.generateA3aBCArgs(node.children,
						A3a.Compiler.L2.resultTypePropagateFixed(compiler, node, a),
						compiler)
					.concat(node.operatorDescr.bytecode);
			}
		}),
	new A3a.Compiler.OperatorDescr("<=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.comp,
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] <= args[1] ? 1 : 0;
					});
			},
			bytecode: [A3a.vm.bc.binaryOpLessEqThan],
			generateA3aBC: function (node, compiler) {
				var a = node.children.map(function (node) { return node.resultType; });
				return A3a.Compiler.L2.generateA3aBCArgs(node.children,
						A3a.Compiler.L2.resultTypePropagateFixed(compiler, node, a),
						compiler)
					.concat(node.operatorDescr.bytecode);
			}
		}),
	new A3a.Compiler.OperatorDescr(">",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.comp,
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] > args[1] ? 1 : 0;
					});
			},
			bytecode: [A3a.vm.bc.binaryOpGreaterThan],
			generateA3aBC: function (node, compiler) {
				var a = node.children.map(function (node) { return node.resultType; });
				return A3a.Compiler.L2.generateA3aBCArgs(node.children,
						A3a.Compiler.L2.resultTypePropagateFixed(compiler, node, a),
						compiler)
					.concat(node.operatorDescr.bytecode);
			}
		}),
	new A3a.Compiler.OperatorDescr(">=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.comp,
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] >= args[1] ? 1 : 0;
					});
			},
			bytecode: [A3a.vm.bc.binaryOpGreaterEqThan],
			generateA3aBC: function (node, compiler) {
				var a = node.children.map(function (node) { return node.resultType; });
				return A3a.Compiler.L2.generateA3aBCArgs(node.children,
						A3a.Compiler.L2.resultTypePropagateFixed(compiler, node, a),
						compiler)
					.concat(node.operatorDescr.bytecode);
			}
		}),
	new A3a.Compiler.OperatorDescr("&",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.binand,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
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
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
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
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] ^ args[1];
					});
			},
			bytecode: [A3a.vm.bc.binaryOpBitXor]
		}),
	new A3a.Compiler.OperatorDescr("&&",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.and,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFirst,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] && args[1] ? 1 : 0;
					});
			},
			bytecode: [A3a.vm.bc.binaryOpAnd],
			generateA3aBC: function (node, compiler) {
				var bc = node.children[0].generateA3aBC(compiler)
					.concat([
						(A3a.vm.bc.store << 12) | compiler.retValueOffset,
						(A3a.vm.bc.load << 12) | compiler.retValueOffset,
						(A3a.vm.bc.smallImmediate << 12) | 0,
						(A3a.vm.bc.conditionalBranch << 12) | A3a.vm.condName.indexOf("eq"),
						4,
						(A3a.vm.bc.load << 12) | compiler.retValueOffset,
						(A3a.vm.bc.jump << 12) | 0
				]);
				compiler.prepareJump(bc);
				var op2 = A3a.Compiler.L2.castNodeType(node.children[1],
						node.children[0].resultType, compiler)
					.optimize(compiler);
				bc = bc.concat(op2.generateA3aBC(compiler));
				compiler.finalizeJump(bc);
				return bc;
			}
		}),
	new A3a.Compiler.OperatorDescr("||",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.or,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFirst,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return args[0] || args[1] ? 1 : 0;
					});
			},
			bytecode: [A3a.vm.bc.binaryOpOr],
			generateA3aBC: function (node, compiler) {
				var bc = node.children[0].generateA3aBC(compiler)
					.concat([
						(A3a.vm.bc.store << 12) | compiler.retValueOffset,
						(A3a.vm.bc.load << 12) | compiler.retValueOffset,
						(A3a.vm.bc.smallImmediate << 12) | 0,
						(A3a.vm.bc.conditionalBranch << 12) | A3a.vm.condName.indexOf("ne"),
						4,
						(A3a.vm.bc.load << 12) | compiler.retValueOffset,
						(A3a.vm.bc.jump << 12) | 0
				]);
				compiler.prepareJump(bc);
				var op2 = A3a.Compiler.L2.castNodeType(node.children[1],
						node.children[0].resultType, compiler)
					.optimize(compiler);
				bc = bc.concat(op2.generateA3aBC(compiler));
				compiler.finalizeJump(bc);
				return bc;
			}
		}),
	new A3a.Compiler.OperatorDescr("?",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.conditional,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateSecond,
			optimize: function (node, compiler) {
				if (!(node.children[1] instanceof A3a.Compiler.NodeFun) ||
					node.children[1].operatorDescr == 0 ||
					node.children[1].operatorDescr.name !== ":") {
					throw "missing else part in conditional expression " + node.head.posString();
				}
				return node.children[0] instanceof A3a.Compiler.NodeNumber
					? node.children[1].children[node.children[0].n ? 0 : 1]
					: node;
			},
			generateA3aBC: function (node, compiler) {
				var bc = node.children[0].generateA3aCondBranchBC(compiler);
				compiler.prepareJump(bc);
				bc = bc.concat(node.children[1].children[0].generateA3aBC(compiler))
					.concat((A3a.vm.bc.jump << 12) | 0);
				compiler.finalizeJump(bc);
				compiler.prepareJump(bc);
				bc = bc.concat(node.children[1].children[1].generateA3aBC(compiler));
				compiler.finalizeJump(bc);
				return bc;
			}
		}),
	new A3a.Compiler.OperatorDescr(":",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.conditionalElse,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFirst,
			optimize: function (node, compiler) {
				node.children[1] = A3a.Compiler.L2.castNodeType(node.children[1],
					node.children[0].resultType, compiler);
				return node;
			},
			generateA3aBC: function (node, compiler) {
				throw "unexpected colon outside conditional expression " + node.head.posString();
			}
		}),
	new A3a.Compiler.OperatorDescr("=",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.assignment,
			resultTypePropagate: A3a.Compiler.L2.resultTypePropagateFirst,
			optimize: A3a.Compiler.L2.optimizeAssignmentType
		}),
	new A3a.Compiler.OperatorDescr(",",
		A3a.Compiler.opType.infix,
		{
			priority: A3a.Compiler.opPriority.comma,
			resultTypePropagate: function (compiler, a) {

				return a[1];
			},
			optimize: function (node, compiler) {
				node.children[0].shouldProduceValue = false;
				return node;
			}
		}),
	new A3a.Compiler.OperatorDescr("false",
		A3a.Compiler.opType.constant,
		{
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return 0;
					});
			},
			bytecode: [A3a.vm.bc.smallImmediate << 12]
		}),
	new A3a.Compiler.OperatorDescr("true",
		A3a.Compiler.opType.constant,
		{
			resultType: A3a.Compiler.resultType.boolean,
			optimize: function (node, compiler) {
				return A3a.Compiler.L2.optimizeConstFun(node, compiler,
					function (args) {
						return 1;
					});
			},
			bytecode: [(A3a.vm.bc.smallImmediate << 12) | 1]
		}),
];

/** @inheritDoc
*/
A3a.Compiler.L2.prototype.skipBlanks = function () {
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
		} else if (this.src.slice(this.i, this.i + 2) === "/*") {
			// skip block comment, until "*/"
			this.i += 2;
			this.col += 2;
			while (this.i < this.len && this.src.slice(this.i - 2, this.i) !== "*/") {
				if (this.src[this.i] === "\n") {
					this.col = 0;
					this.line++;
				} else if (this.src[this.i] !== "\r") {
					this.col++;
				}
				this.i++;
			}
		} else if (this.src.slice(this.i, this.i + 2) === "//") {
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

/** @inheritDoc
*/
A3a.Compiler.L2.prototype.buildTokenArray = function (keywords) {
	return A3a.Compiler.prototype.buildTokenArray.call(this,
 		keywords || A3a.Compiler.L2.keywords);
};

/** @inheritDoc
*/
A3a.Compiler.L2.prototype.processTokenArray = function () {
	// collect def names to recognize user functions
	this.tokens.forEach(function (token, i) {
		if (token instanceof A3a.Compiler.TokenKeyword &&
			(token.name === "def" ||
				["int", "bool", "fixed", "void"].indexOf(token.name) >= 0) &&
			this.tokens[i + 1] instanceof A3a.Compiler.TokenName &&
			this.tokens[i + 2] instanceof A3a.Compiler.TokenKeyword &&
			this.tokens[i + 2].name === "(") {
			this.def.push(this.tokens[i + 1].name);
		}
	}, this);
};

/** Convert a type token keyword to a result type
	@param {A3a.Compiler.TokenKeyword} token
	@param {A3a.Compiler.resultType=} defaultType type used if token is "var"
	@return {A3a.Compiler.resultType}
*/
A3a.Compiler.L2.tokenToType = function (token, defaultType) {
	switch (token.name) {
	case "var":
	case "def":
		return defaultType || A3a.Compiler.resultType.number;
	case "void":
		return A3a.Compiler.resultType.void;
	case "int":
		return A3a.Compiler.resultType.number;
	case "bool":
		return A3a.Compiler.resultType.boolean;
	case "fixed":
		return A3a.Compiler.resultType.fixed;
	default:
		throw "internal";
	}
}

/** Convert a result type to a keyword
	@param {A3a.Compiler.resultType} resultType
	@return {string}
*/
A3a.Compiler.L2.typeToKeyword = function (resultType) {
	switch (resultType) {
	case A3a.Compiler.resultType.number:
		return "int";
	case A3a.Compiler.resultType.fixed:
		return "fixed";
	case A3a.Compiler.resultType.boolean:
		return "bool";
	default:
		return "";
	}
}

/** Check if a token is a type keyword (not "void")
	@param {number} offset token offset (0=being parsed, 1=next etc.)
	@return {boolean}
*/
A3a.Compiler.L2.prototype.checkTokenTypeKeyword = function (offset) {
	return this.checkTokenKeyword(offset, "int") ||
		this.checkTokenKeyword(offset, "bool") ||
		this.checkTokenKeyword(offset, "fixed");
};

/** @inheritDoc
*/
A3a.Compiler.L2.prototype.parseNextStatement = function () {

	if (this.tokenIndex >= this.tokens.length) {
		throw "no more tokens";
	}

	/** @type {A3a.Compiler.Node} */
	var node;
	/** @type {A3a.Compiler.Node} */
	var expr;
	/** @type {A3a.Compiler.Node} */
	var expr2;
	/** @type {A3a.Compiler.Node} */
	var expr3;
	/** @type {Array.<A3a.Compiler.Node>} */
	var args;
	/** @type {A3a.Compiler.TokenName} */
	var name;

	var head = this.tokens[this.tokenIndex];

	/** Parse a variable declaration
		@return {Array.<A3a.Compiler.NodeStatement>}
	*/
	function parseVariableDeclaration() {
		/** @type {Array.<A3a.Compiler.NodeStatement>} */
		var statements = [];
		for (this.tokenIndex++; ; ) {
			name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex]);
			this.tokenIndex++;
			if (!this.checkTokenType(0, A3a.Compiler.TokenKeyword)) {
				throw "syntax error " + head.posString();
			}
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
					expr.children.push(this.parseExpression(A3a.Compiler.opPriority.comma));
					expr.resultType = A3a.Compiler.L2.tokenToType(/** @type {A3a.Compiler.TokenKeyword} */(head),
						expr.children[1].resultType);
					expr.children[1].resolveArraySize(this);
					expr.shouldProduceValue = false;
					var sizeExpr = new A3a.Compiler.NodeFun(
						new A3a.Compiler.TokenKeyword(this.tokens[this.tokenIndex].srcIndex,
							this.tokens[this.tokenIndex].srcLine,
							this.tokens[this.tokenIndex].srcCol,
							"size"),
						A3a.Compiler.opType.prefix,
						this.getOperator("size", A3a.Compiler.opType.prefix),
						[expr.children[1]]);
					statements.push(new A3a.Compiler.NodeStatementVar(head, name, expr.resultType, [sizeExpr], expr));
				} else {
					// expect size (possibly multiple, in array)
					var sizeExpr = this.parseArguments(true);
					if (this.checkTokenKeyword(0, "=")) {
						expr = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex],
							A3a.Compiler.opType.infix,
							this.getOperator("=", A3a.Compiler.opType.infix),
							[new A3a.Compiler.NodeVar(name)]);
						this.tokenIndex++;
						expr.children.push(this.parseExpression(A3a.Compiler.opPriority.comma));
						expr.resultType = A3a.Compiler.L2.tokenToType(/** @type {A3a.Compiler.TokenKeyword} */(head),
							expr.children[1].resultType);
						expr.shouldProduceValue = false;
						statements.push(new A3a.Compiler.NodeStatementVar(head, name, expr.resultType, sizeExpr, expr));
					} else {
						statements.push(new A3a.Compiler.NodeStatementVar(head, name,
							A3a.Compiler.L2.tokenToType(/** @type {A3a.Compiler.TokenKeyword} */(head)),
							sizeExpr));
					}
				}
				break;
			case "=":
				expr = new A3a.Compiler.NodeFun(this.tokens[this.tokenIndex],
					A3a.Compiler.opType.infix,
					this.getOperator("=", A3a.Compiler.opType.infix),
					[new A3a.Compiler.NodeVar(name)]);
				this.tokenIndex++;
				expr.children.push(this.parseExpression(A3a.Compiler.opPriority.comma));
				expr.resultType = A3a.Compiler.L2.tokenToType(/** @type {A3a.Compiler.TokenKeyword} */(head),
					expr.children[1].resultType);
				expr.shouldProduceValue = false;
				expr = expr.optimize(this);
				statements.push(new A3a.Compiler.NodeStatementVar(head, name, expr.resultType, null, expr));
				break;
			default:
				statements.push(new A3a.Compiler.NodeStatementVar(head, name,
					A3a.Compiler.L2.tokenToType(/** @type {A3a.Compiler.TokenKeyword} */(head))));
				break;
			}
			if (this.checkTokenKeyword(0, ",")) {
				this.tokenIndex++;
			} else if (this.checkTokenKeyword(0, ";")) {
				this.tokenIndex++;
				return statements;
			} else {
				throw "missing semicolon " + this.tokens[this.tokenIndex].posString();
			}
		}
	}

	/** Parse a function definition header
		@return {A3a.Compiler.NodeStatement}
	*/
	function parseFunctionDefinition() {
		var resultType = A3a.Compiler.L2.tokenToType(/** @type {A3a.Compiler.TokenKeyword} */(head));
		name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex + 1]);
		this.tokenIndex += 3;
		/** @type {Array.<A3a.Compiler.L2.NodeStatementDef.argDescription>} */
		var args = [];
		if (!this.checkTokenKeyword(0, ")")) {
			while (true) {
				var argType = A3a.Compiler.resultType.number;
				if (this.checkTokenTypeKeyword(0)) {
					argType = A3a.Compiler.L2.tokenToType(
						/** @type {A3a.Compiler.TokenKeyword} */(this.tokens[this.tokenIndex])
					);
					this.tokenIndex++;
				}
				if (!this.checkTokenType(0, A3a.Compiler.TokenName)) {
					throw "bad function definition argument " + this.tokens[this.tokenIndex].posString();
				}
				var varNameToken = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex]).name;
				/** @type {Array.<A3a.Compiler.Node>} */
				var varDimsExpr = [];
				var varIsRef = false;
				this.tokenIndex++;
				if (this.checkTokenKeyword(0, "[")) {
					varIsRef = true;
					varDimsExpr = this.parseArguments(true);
				}
				args.push({
					name: varNameToken,
					type: argType,
					dimsExpr: varDimsExpr,
					size: 1,
					dims: [],
					isRef: varIsRef
				});
				if (this.checkTokenKeyword(0, ",")) {
					this.tokenIndex++;
				} else if (this.checkTokenKeyword(0, ")")) {
					break;
				} else {
					throw "syntax error in function definition " + this.tokens[this.tokenIndex].posString();
				}
			}
		}
		this.tokenIndex++;
		if (!this.checkTokenKeyword(0, "{")) {
			throw "block expected after function header " + this.tokens[this.tokenIndex].posString();
		}
		this.tokenIndex++;
		return new A3a.Compiler.L2.NodeStatementDef(head, name.name, resultType, args);
	}

	if (this.tokens[this.tokenIndex] instanceof A3a.Compiler.TokenKeyword) {
		// statement beginning with a keyword
		switch (head.name) {
		case "const":
			// expect "const name = constantexpr;"
			if (!this.checkTokenType(1, A3a.Compiler.TokenName)
				|| !this.checkTokenKeyword(2, "=")) {
				throw "syntax error for \"const\" " + head.posString();
			}
			name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex + 1]);
			this.tokenIndex += 3;
			expr = this.parseExpression(A3a.Compiler.opPriority.comma);
			expr = expr.optimize(this);
			if (!(expr instanceof A3a.Compiler.NodeNumber)) {
				throw "non-constant expression in constant definition " + this.tokens[this.tokenIndex].posString();
			}
			if (!this.checkTokenKeyword(0, ";")) {
				throw "missing semicolon " + head.posString();
			}
			this.tokenIndex++;
			return [new A3a.Compiler.NodeStatementConst(head, name.name, expr)];
		/* var and def withdrawn
		case "var":
			// expect "var name" or "var name[num]" or "var name[] = expr"
			if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
				throw "unexpected token after \"var\" " + head.posString();
			}
			return parseVariableDeclaration.call(this);
		case "def":
			if (!this.checkTokenType(1, A3a.Compiler.TokenName) ||
				!this.checkTokenKeyword(2, "(")) {
				throw "bad function definition header " + this.tokens[this.tokenIndex].posString();
			}
			return [parseFunctionDefinition.call(this)];
		*/
		case "int":
		case "bool":
		case "fixed":
			if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
				throw "unexpected token after \"" + head.name + "\" " + head.posString();
			}
			return this.checkTokenKeyword(2, "(")
				? [parseFunctionDefinition.call(this)]
				: parseVariableDeclaration.call(this);
		case "void":
			return [parseFunctionDefinition.call(this)];
		case "if":
			this.tokenIndex++;
			args = this.parseArguments();
			if (args.length !== 1) {
				throw "bad condition in \"if\" statement " + this.tokens[this.tokenIndex].posString();
			}
			node = new A3a.Compiler.NodeStatementIf(head, args[0]);
			if (this.checkTokenKeyword(0, "{")) {
				this.tokenIndex++;
			} else {
				node.implicitEnd = true;
			}
			return [node];
		case "when":
			this.tokenIndex++;
			args = this.parseArguments();
			if (args.length !== 1) {
				throw "bad condition in \"when\" statement " + this.tokens[this.tokenIndex].posString();
			}
			if (!this.checkTokenKeyword(0, "{")) {
				throw "block expected after \"when\" statement " + this.tokens[this.tokenIndex].posString();
			}
			this.tokenIndex++;
			return [new A3a.Compiler.NodeStatementWhen(head, args[0])];
		case "switch":
			this.tokenIndex++;
			args = this.parseArguments();
			if (args.length !== 1) {
				throw "bad expression in \"switch\" statement " + this.tokens[this.tokenIndex].posString();
			}
			if (!this.checkTokenKeyword(0, "{")) {
				throw "block expected after \"switch\" statement " + this.tokens[this.tokenIndex].posString();
			}
			this.tokenIndex++;
			return [new A3a.Compiler.L2.NodeStatementSwitch(head, args[0])];
		case "case":
			this.tokenIndex++;
			expr = this.parseExpression();
			if (!this.checkTokenKeyword(0, ":")) {
				throw "missing colon after \"case\" " + this.tokens[this.tokenIndex].posString();
			}
			this.tokenIndex++;
			return [new A3a.Compiler.L2.NodeStatementCase(head, expr)];
		case "default":
			if (!this.checkTokenKeyword(1, ":")) {
				throw "missing colon after \"default\" " + this.tokens[this.tokenIndex].posString();
			}
			this.tokenIndex += 2;
			return [new A3a.Compiler.L2.NodeStatementCase(head, null)];
		case "goto":
			if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
				throw "missing label after \"goto\" " + this.tokens[this.tokenIndex].posString();
			}
			name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex + 1]);
			this.tokenIndex += 2;
			return [new A3a.Compiler.L2.NodeStatementGoto(head, name.name)];
		case "while":
			this.tokenIndex++;
			args = this.parseArguments();
			if (args.length !== 1) {
				throw "bad condition in \"while\" statement " + this.tokens[this.tokenIndex].posString();
			}
			if (this.checkTokenKeyword(0, ";")) {
				// end of do/while loop
				this.tokenIndex++;
				return [new A3a.Compiler.L2.NodeStatementEndWhile(head, args[0])];
			}
			if (!this.checkTokenKeyword(0, "{")) {
				throw "block expected after \"while\" statement " + this.tokens[this.tokenIndex].posString();
			}
			this.tokenIndex++;
			return [new A3a.Compiler.L2.NodeStatementWhile(head, args[0])];
		case "do":
			if (!this.checkTokenKeyword(1, "{")) {
				throw "block expected after \"do\" statement " + this.tokens[this.tokenIndex].posString();
			}
			this.tokenIndex += 2;
			return [new A3a.Compiler.L2.NodeStatementDoWhile(head)];
		case "for":
			if (!this.checkTokenKeyword(1, "(")) {
				throw "\"for\" syntax error " + head.posString();
			}
			this.tokenIndex += 2;
			name = null;
			var resultType = A3a.Compiler.resultType.number;
			if (this.checkTokenKeyword(0, ";")) {
				expr = null;
			} else {
				if (this.checkTokenKeyword(0, "var") || this.checkTokenTypeKeyword(0)) {
					if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
						throw "bad variable declaration in \"for\" statement " + this.tokens[this.tokenIndex].posString();
					}
					resultType = A3a.Compiler.L2.tokenToType(/** @type {A3a.Compiler.TokenKeyword} */(this.tokens[this.tokenIndex]));
					this.tokenIndex++;
					name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex]);
				}
				expr = this.parseExpression();
				if (!this.checkTokenKeyword(0, ";")) {
					throw "semicolon expected in \"for\" statement " + this.tokens[this.tokenIndex].posString();
				}
			}
			this.tokenIndex++;
			if (this.checkTokenKeyword(0, ";")) {
				expr2 = null;
			} else {
				expr2 = this.parseExpression();
				if (!this.checkTokenKeyword(0, ";")) {
					throw "semicolon expected in \"for\" statement " + this.tokens[this.tokenIndex].posString();
				}
			}
			this.tokenIndex++;
			if (this.checkTokenKeyword(0, ")")) {
				expr3 = null;
			} else {
				expr3 = this.parseExpression();
				if (!this.checkTokenKeyword(0, ")")) {
					throw "semicolon expected in \"for\" statement " + this.tokens[this.tokenIndex].posString();
				}
			}
			this.tokenIndex++;
			if (!this.checkTokenKeyword(0, "{")) {
				throw "block expected after \"for\" statement " + this.tokens[this.tokenIndex].posString();
			}
			this.tokenIndex++;
			return [new A3a.Compiler.L2.NodeStatementFor(head, name, resultType, expr, expr2, expr3)];
		case ";":
			this.tokenIndex++;
			return [new A3a.Compiler.L2.NodeStatementEmpty(head)];
		case "{":
			this.tokenIndex++;
			return [new A3a.Compiler.L2.NodeStatementBlock(head)];
		case "}":
			this.tokenIndex++;
			if (this.checkTokenKeyword(0, "else")) {
				this.tokenIndex++;
				if (this.checkTokenKeyword(0, "if")) {
					this.tokenIndex++;
					args = this.parseArguments();
					if (args.length < 1) {
						throw "empty condition in \"if\" statement " + this.tokens[this.tokenIndex].posString();
					} else if (args.length > 1) {
						node = new A3a.Compiler.NodeStatementSequence(head);
						node.children = args.slice(0, -1).map(function (expr) {
							if (expr instanceof A3a.Compiler.NodeFun) {
								expr.shouldProduceValue = false;
							}
							return expr;
						});
						args = args.slice(-1);
					}
					if (!this.checkTokenKeyword(0, "{")) {
						throw "block expected after \"if\" statement " + this.tokens[this.tokenIndex].posString();
					}
					this.tokenIndex++;
					return [new A3a.Compiler.NodeStatementElseif(head, args[0])];
				} else {
					if (!this.checkTokenKeyword(0, "{")) {
						throw "block expected after \"else\" statement " + this.tokens[this.tokenIndex].posString();
					}
					this.tokenIndex++;
					return [new A3a.Compiler.NodeStatementElse(head)];
				}
			}
			return [new A3a.Compiler.NodeStatementEnd(head)];
		case "else":
			throw "unexpected \"else\" " + this.tokens[this.tokenIndex].posString();
		case "onevent":
			if (!this.checkTokenType(1, A3a.Compiler.TokenName)) {
				throw "unexpected token after \"onevent\" " + head.posString();
			} else if (!this.checkTokenKeyword(2, "{")) {
				throw "block expected after \"onevent\" statement " + this.tokens[this.tokenIndex].posString();
			}
			name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex + 1]);
			this.tokenIndex += 3;
			return [new A3a.Compiler.L2.NodeStatementOnevent(head, name.name)];
		case "return":
			this.tokenIndex++;
			if (!this.checkTokenKeyword(0, ";")) {
				// return value
				expr = this.parseExpression();
			} else {
				expr = null;
			}
			if (!this.checkTokenKeyword(0, ";")) {
				throw "missing semicolon " + head.posString();
			}
			this.tokenIndex++;
			return [new A3a.Compiler.L2.NodeStatementReturn(head, expr)];
		case "break":
			name = null;
			if (this.checkTokenType(1, A3a.Compiler.TokenName)) {
				name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex + 1]);
				this.tokenIndex++;
			}
			if (!this.checkTokenKeyword(1, ";")) {
				throw "missing semicolon " + head.posString();
			}
			this.tokenIndex += 2;
			return [new A3a.Compiler.L2.NodeStatementBreak(head, false, name ? name.name : null)];
		case "continue":
			name = null;
			if (this.checkTokenType(1, A3a.Compiler.TokenName)) {
				name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex + 1]);
				this.tokenIndex++;
			}
			if (!this.checkTokenKeyword(1, ";")) {
				throw "missing semicolon " + head.posString();
			}
			this.tokenIndex += 2;
			return [new A3a.Compiler.L2.NodeStatementBreak(head, true, name ? name.name : null)];
		}
	}

	// other: try a user or native function call
	if (this.checkTokenType(0, A3a.Compiler.TokenName)
		&& this.checkTokenKeyword(1, "(")) {
		name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex]);
		if (this.asebaNode.findNativeFunction(name.name)) {
			this.tokenIndex++;
			return [new A3a.Compiler.NodeStatementCall(head, name.name, this.parseArguments())];
		}
	}

	// other: try a label
	if (this.checkTokenType(0, A3a.Compiler.TokenName)
		&& this.checkTokenKeyword(1, ":")) {
		name = /** @type {A3a.Compiler.TokenName} */(this.tokens[this.tokenIndex]);
		this.tokenIndex += 2;
		return [new A3a.Compiler.L2.NodeStatementLabel(head, name.name)];
	}

	// other: probably a pure expression (call or assignment)
	expr = this.parseExpression();
	expr.shouldProduceValue = false;
	if (!this.checkTokenKeyword(0, ";")) {
		throw "missing semicolon " +
			(this.tokenIndex < this.tokens.length ? this.tokens[this.tokenIndex].posString() : "eof");
	}
	this.tokenIndex++;
	expr = expr.optimize(this);
	return [new A3a.Compiler.NodeStatementExpression(expr)];
};

/** @inheritDoc
*/
A3a.Compiler.L2.prototype.addVariableOrConstantDef = function (statement) {
	if (statement instanceof A3a.Compiler.L2.NodeStatementDef) {
		for (var i = 0; i < statement.args.length; i++) {
			statement.args[i].size = 1;
			statement.args[i].dims = statement.args[i].dimsExpr.map(function (d) {
				d = d.optimize(this);
				if (!(d instanceof A3a.Compiler.NodeNumber)) {
					throw "non-constant expression in argument dimension " + d.head.posString();
				} else if (d.n <= 0 || Math.round(d.n) !== d.n) {
					throw "bad value for argument dimension " + d.head.posString();
				}
				statement.args[i].size *= d.n;
				return d.n;
			}, this);
			this.addVariable(statement.args[i].name,
				statement.args[i].size,
				statement.args[i].dims,
				this.varSize,
				statement.args[i].type,
				statement.args[i].isRef);
			this.varSize += statement.args[i].isRef ? 1 : statement.args[i].size;
		}
		// contexts[1]: context in function arguments
		statement.contexts[1] = {
			declaredVariables: this.declaredVariables.slice(),
			labels: this.labels.slice()
		};
	} else if (statement instanceof A3a.Compiler.L2.NodeStatementFor) {
		if (statement.varDecl) {
			this.addVariable(statement.varDecl.name, 1, [1], this.varSize, statement.varType);
			this.varSize += 1;
			// contexts[1]: context in "for" header
			statement.contexts[1] = {
				declaredVariables: this.declaredVariables.slice(),
				labels: this.labels.slice()
			};
		}
	} else {
		A3a.Compiler.prototype.addVariableOrConstantDef.call(this, statement);
	}
};

/** @inheritDoc
*/
A3a.Compiler.L2.prototype.resetContext = function () {
	this.declaredVariables = this.globalVariables;
	this.labels = this.globalLabels;
};

/** @inheritDoc
*/
A3a.Compiler.L2.prototype.setContext = function (context) {
	if (context) {
		this.declaredVariables = context.declaredVariables;
		this.labels = context.labels;
	}
};

/** @inheritDoc
*/
A3a.Compiler.L2.prototype.getContext = function () {
	return {
		declaredVariables: this.declaredVariables,
		labels: this.labels.slice()
	};
};

/** Variable description (at fixed address or indexed on stack pointer for variables
	local to functions)
	@constructor
	@extends {A3a.Compiler.VariableDescr}
	@param {string} name
	@param {number} size
	@param {Array.<number>} dims
	@param {number} offset
	@param {A3a.Compiler.resultType} resultType
	@param {boolean} inFunction
	@param {boolean=} isRef
*/
A3a.Compiler.L2.VariableDescr = function (name, size, dims, offset, resultType, inFunction, isRef) {
	A3a.Compiler.VariableDescr.call(this, name, size, dims, offset, resultType);
	this.inFunction = inFunction;
	this.isRef = isRef || false;
};
A3a.Compiler.L2.VariableDescr.prototype = Object.create(A3a.Compiler.VariableDescr.prototype);
A3a.Compiler.L2.VariableDescr.prototype.constructor = A3a.Compiler.L2.VariableDescr;

/** @inheritDoc
*/
A3a.Compiler.L2.VariableDescr.prototype.generateA3aBCForLoad = function (compiler, offset) {
	return this.inFunction
		? this.isRef
			? [
				(A3a.vm.bc.load << 12) | compiler.frameOffset,
				(A3a.vm.bc.loadIndirect << 12) | this.offset,
				compiler.asebaNode.maxVarSize,
				(A3a.vm.bc.loadIndirect << 12) | (offset || 0),
				compiler.asebaNode.maxVarSize
			]
			: [
				(A3a.vm.bc.load << 12) | compiler.frameOffset,
				(A3a.vm.bc.loadIndirect << 12) | this.offset + (offset || 0),
				compiler.asebaNode.maxVarSize
			]
		: [
			(A3a.vm.bc.load << 12) | this.offset + (offset || 0)
		];
};

/** @inheritDoc
*/
A3a.Compiler.L2.VariableDescr.prototype.generateA3aBCForStore = function (compiler, offset) {
	return this.inFunction
		? this.isRef
			? [
				(A3a.vm.bc.load << 12) | compiler.frameOffset,
				(A3a.vm.bc.loadIndirect << 12) | this.offset,
				compiler.asebaNode.maxVarSize,
				(A3a.vm.bc.storeIndirect << 12) | (offset || 0),
				compiler.asebaNode.maxVarSize
			]
			: [
				(A3a.vm.bc.load << 12) | compiler.frameOffset,
				(A3a.vm.bc.storeIndirect << 12) | this.offset + (offset || 0),
				compiler.asebaNode.maxVarSize
			]
		: [
			(A3a.vm.bc.store << 12) | this.offset + (offset || 0)
		];
};

/** Generate bytecode to push variable address
	@param {A3a.Compiler} compiler
	@return {Array.<number>}
*/
A3a.Compiler.L2.VariableDescr.prototype.generateA3aBCForRef = function (compiler) {
	return this.inFunction
		? this.isRef
			? [
				(A3a.vm.bc.load << 12) | compiler.frameOffset,
				(A3a.vm.bc.loadIndirect << 12) | this.offset,
				compiler.asebaNode.maxVarSize
			]
			: [
				(A3a.vm.bc.load << 12) | compiler.frameOffset,
				(A3a.vm.bc.smallImmediate << 12) | this.offset,
				A3a.vm.bc.binaryOpAdd
			]
		: [
			(A3a.vm.bc.smallImmediate << 12) | this.offset
		];
};

/** @inheritDoc
*/
A3a.Compiler.L2.VariableDescr.prototype.generateA3aBCForLoadIndirect = function (compiler) {
	return this.inFunction
		? this.isRef
			? [
				(A3a.vm.bc.load << 12) | compiler.frameOffset,
				(A3a.vm.bc.loadIndirect << 12) | this.offset,
				compiler.asebaNode.maxVarSize,
				A3a.vm.bc.binaryOpAdd,
				(A3a.vm.bc.loadIndirect << 12) | 0,
				compiler.asebaNode.maxVarSize
			]
			: [
				(A3a.vm.bc.load << 12) | compiler.frameOffset,
				A3a.vm.bc.binaryOpAdd,
				(A3a.vm.bc.loadIndirect << 12) | this.offset,
				compiler.asebaNode.maxVarSize
			]
		: [
			(A3a.vm.bc.loadIndirect << 12) | this.offset, this.size
		];
};

/** @inheritDoc
*/
A3a.Compiler.L2.VariableDescr.prototype.generateA3aBCForStoreIndirect = function (compiler) {
	return this.inFunction
		? this.isRef
			? [
				(A3a.vm.bc.load << 12) | compiler.frameOffset,
				(A3a.vm.bc.loadIndirect << 12) | this.offset,
				compiler.asebaNode.maxVarSize,
				A3a.vm.bc.binaryOpAdd,
				(A3a.vm.bc.storeIndirect << 12) | 0,
				compiler.asebaNode.maxVarSize
			]
			: [
				(A3a.vm.bc.load << 12) | compiler.frameOffset,
				A3a.vm.bc.binaryOpAdd,
				(A3a.vm.bc.storeIndirect << 12) | this.offset,
				compiler.asebaNode.maxVarSize
			]
		: [
			(A3a.vm.bc.storeIndirect << 12) | this.offset,
			this.size
		];
};

/** @inheritDoc
	@param {boolean=} isRef
*/
A3a.Compiler.L2.prototype.addVariable = function (name, size, dims, offset, resultType, isRef) {
	this.declaredVariables.push(new A3a.Compiler.L2.VariableDescr(name, size, dims, offset,
		resultType, this.inFunction, isRef));
};

/** Function call with compiler state to set or change the frame
	@constructor
	@extends {A3a.Compiler.NodeFun}
	@param {A3a.Compiler.TokenBase} funToken
	@param {boolean} inFunction
	@param {number} varSize
*/
A3a.Compiler.L2.NodeFun = function (funToken, inFunction, varSize) {
	A3a.Compiler.NodeFun.call(this, funToken, A3a.Compiler.opType.fun, null);
};
A3a.Compiler.L2.NodeFun.prototype = Object.create(A3a.Compiler.NodeFun.prototype);
A3a.Compiler.L2.NodeFun.prototype.constructor = A3a.Compiler.L2.NodeFun;

/** @inheritDoc
*/
A3a.Compiler.L2.prototype.makeFunCallNode = function (funToken) {
	var nodeFun = new A3a.Compiler.L2.NodeFun(funToken, this.inFunction, this.varSize);
	nodeFun.operatorDescr = {
		resultTypePropagate: function (compiler, a) {
			var fun = compiler.findFunction(funToken.name);
			if (fun) {
				return fun.resultType;
			}
			var macroFunctionDef = compiler.getMacroFunctionDef(funToken.name);
			if (macroFunctionDef && macroFunctionDef.resultTypePropagate) {
				return macroFunctionDef.resultTypePropagate(compiler, macroFunctionDef, a);
			}
			return A3a.Compiler.resultType.number;
		}
	};
	return nodeFun;
};

/** @inheritDoc
*/
A3a.Compiler.L2.prototype.allocateVariables = function () {
	// find variable declarations to resolve their size and constant definitions to resolve them
	//this.var = [];
	this.varSize = this.asebaNode.varSize;	// after node predefined variables
	this.inFunction = false;
	/** @type {Array.<{
		varSize: number,
		inFunction: boolean,
		varDeclCount: number,
		statementBegin: A3a.Compiler.NodeStatement
	}>} */
	var context = [];
	for (var i = 0; i < this.statements.length; i++) {
		if ([
				A3a.Compiler.NodeStatementEnd,
				A3a.Compiler.NodeStatementElseif,
				A3a.Compiler.NodeStatementElse
			].indexOf(this.statements[i].constructor) >= 0) {
			// exit inner scope
			if (context.length === 0) {
				throw "unexpected end of block " + this.statements[i].head.posString();
			}
			var ctx = context.pop();
			this.varSize = ctx.varSize;
			this.inFunction = ctx.inFunction;
			ctx.statementBegin.contexts[0] = {
				declaredVariables: this.declaredVariables.slice(),
				labels: this.labels.slice()
			};
			this.declaredVariables.splice(ctx.varDeclCount);
			this.labels.pop();
			if (context.length === 0) {
				this.functionResultType = A3a.Compiler.resultType.undef;
			}
		}
		if ([
				A3a.Compiler.NodeStatementIf,
				A3a.Compiler.NodeStatementWhen,
				A3a.Compiler.L2.NodeStatementSwitch,
				A3a.Compiler.L2.NodeStatementWhile,
				A3a.Compiler.L2.NodeStatementBlock,
				A3a.Compiler.L2.NodeStatementFor,
				A3a.Compiler.L2.NodeStatementOnevent,
				A3a.Compiler.L2.NodeStatementDef,
				A3a.Compiler.NodeStatementElseif,
				A3a.Compiler.NodeStatementElse
			].indexOf(this.statements[i].constructor) >= 0) {
			// enter inner scope
			context.push({
				varSize: this.varSize,
				inFunction: this.inFunction,
				varDeclCount: this.declaredVariables.length,
				statementBegin: this.statements[i]
			});
			this.labels.push([]);
			if (this.statements[i] instanceof A3a.Compiler.L2.NodeStatementDef) {
				this.inFunction = true;
				this.functionResultType = this.statements[i].resultType;
				this.varSize = 0;
			}
		}
		this.addVariableOrConstantDef(this.statements[i]);
		if (this.statements[i] instanceof A3a.Compiler.L2.NodeStatementLabel) {
			this.createLabel(this.statements[i].label);
		}
	}
	this.globalVariables = this.declaredVariables.slice();
	this.globalLabels = this.labels;
};

/** @inheritDoc
*/
A3a.Compiler.L2.prototype.processStatementArray = function () {
	// remove NodeStatementEnd before NodeStatementEndWhile
	for (var i = 1; i < this.statements.length; ) {
		if (this.statements[i] instanceof A3a.Compiler.L2.NodeStatementEndWhile &&
			this.statements[i - 1] instanceof A3a.Compiler.NodeStatementEnd) {
			this.statements.splice(i - 1, 1);
		} else {
			i++;
		}
	}

	// collect function to permit type propagation in expressions
	this.statements.forEach(function (statement) {
		if (statement instanceof A3a.Compiler.L2.NodeStatementDef) {
			this.functionDefinitions.push(statement);
			this.functionResultType = statement.resultType;
		}
	}, this);

	// attach loop labels to loops and switches
	for (var i = 0; i < this.statements.length - 1; i++) {
		if (this.statements[i] instanceof A3a.Compiler.L2.NodeStatementLabel) {
			if (this.statements[i + 1] instanceof A3a.Compiler.L2.NodeStatementWhile) {
				this.statements[i + 1].label = this.statements[i].label;
			} else if (this.statements[i + 1] instanceof A3a.Compiler.L2.NodeStatementDoWhile) {
				this.statements[i + 1].label = this.statements[i].label;
			} else if (this.statements[i + 1] instanceof A3a.Compiler.L2.NodeStatementFor) {
				this.statements[i + 1].label = this.statements[i].label;
			} else if (this.statements[i + 1] instanceof A3a.Compiler.L2.NodeStatementSwitch) {
				this.statements[i + 1].label = this.statements[i].label;
			}
		}
	}
};

/** @inheritDoc
*/
A3a.Compiler.L2.prototype.processTree = function () {
	// add onevent and def to codeBlocks
	for (var i = 0; i < this.statements.length; i++) {
		if (this.statements[i] instanceof A3a.Compiler.L2.NodeStatementOnevent ||
			this.statements[i] instanceof A3a.Compiler.L2.NodeStatementDef) {
			this.codeBlocks.push(this.statements[i]);
		}
	}
};

/** Find function definition
	@param {string} funName
	@return {A3a.Compiler.L2.NodeStatementDef}
*/
A3a.Compiler.L2.prototype.findFunction = function (funName) {
	for (var i = 0; i < this.functionDefinitions.length; i++) {
		if (this.functionDefinitions[i].funName === funName) {
			return this.functionDefinitions[i];
		}
	}
	return null;
};

/** Create label
	@param {string} label
	@return {void}
*/
A3a.Compiler.L2.prototype.createLabel = function (label) {
	var i = this.labels.length - 1;
	for (var j = 0; j < this.labels[i].length; j++) {
		if (this.labels[i][j].label === label) {
			throw "duplicate label \"" + label + "\"";
		}
	}
	this.labels[i].push({label: label});
};

/** Find label in array of array of labels
	@param {string} label
	@return {?A3a.Compiler.L2.Label}
*/
A3a.Compiler.L2.findLabel = function (labels, label) {
	for (var i = labels.length - 1; i >= 0; i--) {
		for (var j = labels[i].length - 1; j >= 0; j--) {
			if (labels[i][j].label === label) {
				return labels[i][j];
			}
		}
	}
	return null;
};

/** @inheritDoc
*/
A3a.Compiler.L2.prototype.generateA3aBC = function () {
	this.resetJumpResolution();
	this.resetContext();
	this.sourceToBCMapping = [];
	this.retValueOffset = this.allocPermanentAuxVariable(2);
	this.frameOffset = this.retValueOffset + 1;	// beginning of local var in functions
	this.startupBytecode = [
		// empty
	];
	var codeBlockBC = this.codeBlocks.map(function (block) {
		this.bcAddr = 0;
		this.setContext(block.contexts[0]);
		this.inSubDefinition = block instanceof A3a.Compiler.NodeStatementSub ||
			block instanceof A3a.Compiler.L2.NodeStatementDef;
		this.inFunction = block instanceof A3a.Compiler.L2.NodeStatementDef;
		this.sourceToBCMapping = [];
		var bc = block.generateA3aBC(this, true);
		A3a.Compiler.resolveCodePlaceholders(bc);
		return {
			bc: bc,
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

	// build table of event vectors
	/** @type {Array.<{id:number,offset:number}>} */
	var eventBlocks = [];
	var subBlocks = {};
	/** @type {Array.<number>} */
	var bc = [];
	this.sourceToBCMapping = [];
	for (var i = 0; i < this.codeBlocks.length; i++) {
		var addr0 = 1 + 2 * nEvents + bc.length;
		if (this.codeBlocks[i] instanceof A3a.Compiler.L2.NodeStatementOnevent
			|| this.codeBlocks[i] instanceof A3a.Compiler.NodeStatementOnevent) {
			eventBlocks.push({
				id: this.asebaNode.eventNameToId(this.codeBlocks[i].eventName),
				offset: bc.length
			});
			bc = bc.concat(codeBlockBC[i].bc);
		} else if (this.codeBlocks[i] instanceof A3a.Compiler.NodeStatementSub) {
			subBlocks[this.codeBlocks[i].subName] = bc.length;
			bc = bc.concat(codeBlockBC[i].bc);
		} else if (this.codeBlocks[i] instanceof A3a.Compiler.L2.NodeStatementDef) {
			subBlocks[this.codeBlocks[i].funName] = bc.length;
			bc = bc.concat(codeBlockBC[i].bc);
		}
		this.sourceToBCMapping = this.sourceToBCMapping.concat(codeBlockBC[i].mapping.map(function (m) {
			return new A3a.Compiler.SourceToBCMapping(m.srcOffset, m.line, m.col, m.addr + addr0);
		}));
	}
	var bc0 = [1 + 2 * eventBlocks.length];
	for (var i = 0; i < eventBlocks.length; i++) {
		bc0 = bc0.concat(eventBlocks[i].id,
			1 + 2 * eventBlocks.length + eventBlocks[i].offset);
	}

	// resolve sub call
	for (var i = 0; i < bc.length; i++) {
		if (typeof bc[i] === "string") {
			if (subBlocks[bc[i]] === undefined) {
				A3a.Compiler.L2.NodeStatementBreak.errorOnLabelMark(bc[i]);
				throw "unknown function \"" + bc[i] + "\"";
			}
			bc[i] = (A3a.vm.bc.subCall << 12) | (subBlocks[bc[i]] + bc0.length);
		}
	}

	return bc0.concat(bc);
};

/** @inheritDoc
*/
A3a.Compiler.L2.prototype.generateA3aBCForFunction = function (node) {
	var name = node.head.name;
	for (var i = 0; i < this.codeBlocks.length; i++) {
		if (this.codeBlocks[i] instanceof A3a.Compiler.L2.NodeStatementDef &&
			this.codeBlocks[i].funName === name) {
			if (node.children.length !== this.codeBlocks[i].args.length) {
				throw "wrong number of arguments " + node.head.posString();
			}
			var bc = node.shouldProduceValue ? [
					name,
					(A3a.vm.bc.load << 12) | this.retValueOffset
				] : [
					name
				];
			// bracket with frame offset change if needed
			if (!this.inFunction) {
				bc = [
					// frame = varSize
					(A3a.vm.bc.smallImmediate << 12) | this.varSize,
					(A3a.vm.bc.store << 12) | this.frameOffset
				].concat(bc);
			} else if (this.varSize > 0) {
				bc = [
					// frame += varSize
					(A3a.vm.bc.load << 12) | this.frameOffset,
					(A3a.vm.bc.smallImmediate << 12) | this.varSize,
					A3a.vm.bc.binaryOpAdd,
					(A3a.vm.bc.store << 12) | this.frameOffset
				].concat(bc).concat(
					// frame -= varSize
					(A3a.vm.bc.load << 12) | this.frameOffset,
					(A3a.vm.bc.smallImmediate << 12) | this.varSize,
					A3a.vm.bc.binaryOpSub,
					(A3a.vm.bc.store << 12) | this.frameOffset
				);
			}
			// prepend argument storage at the beginning of frame
			/** @type {Array.<number>} */
			var bcArg = [];
			for (var j = 0; j < node.children.length; j++) {
				if (this.codeBlocks[i].args[j].size !== node.children[j].valueSize) {
					throw "incompatible size " + node.children[j].head.posString();
				} else if (this.codeBlocks[i].args[j].isRef) {
					if (!(node.children[j] instanceof A3a.Compiler.NodeVar)) {
						throw "variable reference expected " + node.children[j].head.posString();
					} else if (this.codeBlocks[i].args[j].type !== node.children[j].resultType) {
						throw "variable reference type mismatch " + node.children[j].head.posString();
					}
				}
				if (this.codeBlocks[i].args[j].isRef) {
					var varDescr = this.getVariable(/** @type {A3a.Compiler.NodeVar} */(node.children[j]));
					bcArg = bcArg
						.concat(varDescr.generateA3aBCForRef(this))
						.concat(
							// store ref at frameOffset + j
							this.inFunction
								? [
									(A3a.vm.bc.load << 12) | this.frameOffset,
									(A3a.vm.bc.storeIndirect << 12) | (j + this.varSize),
									this.asebaNode.maxVarSize
								]
								: (A3a.vm.bc.store << 12) | (j + this.varSize)
						);
				} else {
					// typecast and optimize further
					node.children[j] = A3a.Compiler.L2.castNodeType(node.children[j],
							this.codeBlocks[i].args[j].type, this)
						.optimize(this);

					bcArg = bcArg
						.concat(node.children[j].generateA3aBC(this))
						.concat(this.generateA3aBCForTypeConversion(node.children[j].resultType,
							this.codeBlocks[i].args[j].type))
						.concat(
							// store argument at frameOffset + j
							this.inFunction
								? [
									(A3a.vm.bc.load << 12) | this.frameOffset,
									(A3a.vm.bc.storeIndirect << 12) | (j + this.varSize),
									this.asebaNode.maxVarSize
								]
								: (A3a.vm.bc.store << 12) | (j + this.varSize)
						);
				}
			}
			return bcArg.concat(bc);
		}
	}
	return null;
}

/** Check if source code is L2 or A3a
	@param {string} src source code
	@return {boolean} true for L2, false for A3a
*/
A3a.Compiler.L2.isL2 = function (src) {
	// trim and check for empty source code
	src = src.trim();
	if (src === "") {
		return false;
	}

	// check first A3a or L2 comment
	var commentIndex = ["#", "//", "/*"]
		.map(function (c) {
			var i = src.indexOf(c);
			return i < 0 ? src.length : i;
		})
		.sort(function (a, b) { return a - b; })[0];
	if (commentIndex < src.length) {
		return src[commentIndex] !== "#";
	}

	// check presence of L2-specific semicolon or opening brace
	// (no nonempty non-comment-only program can have none)
	return /[;{]/.test(src);
};

/** @const */
A3a.Compiler.NodeFixed.defaultFactor = 100;

/**
	@inheritDoc
*/
A3a.Compiler.NodeFixed.prototype.generateA3aBC = function (compiler, isTopLevel) {
	return A3a.Compiler.NodeNumber.generateA3aBC(Math.round(this.n *
		compiler.factor));
};

/** "{...}" statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
*/
A3a.Compiler.L2.NodeStatementBlock = function (head) {
	A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
	/** @type {Array.<A3a.Compiler.NodeStatement>} */
	this.linkedStatements = [];
};
A3a.Compiler.L2.NodeStatementBlock.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementBlock.prototype.constructor = A3a.Compiler.L2.NodeStatementBlock;

/** @inheritDoc
*/
A3a.Compiler.L2.NodeStatementBlock.prototype.optimize = function (compiler) {
	A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
	return this;
};

/**
	@inheritDoc
*/
A3a.Compiler.L2.NodeStatementBlock.prototype.generateA3aBC = function (compiler, isTopLevel) {
	var baseContext = compiler.getContext();
	this.prepareGenerateA3aBC(compiler);
	compiler.setContext(this.contexts[0]);
	var bc = A3a.Compiler.Node.prototype.generateA3aBC.call(this, compiler);
	compiler.setContext(baseContext);
	return bc;
};

/** ";" empty statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
*/
A3a.Compiler.L2.NodeStatementEmpty = function (head) {
	A3a.Compiler.NodeStatement.call(this, head);
};
A3a.Compiler.L2.NodeStatementEmpty.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementEmpty.prototype.constructor = A3a.Compiler.L2.NodeStatementEmpty;

/**
	@inheritDoc
*/
A3a.Compiler.L2.NodeStatementEmpty.prototype.generateA3aBC = function (compiler, isTopLevel) {
	return [];
};

/** "while" statement node, with support for "break" and "continue"
	@constructor
	@extends {A3a.Compiler.NodeStatementWhile}
	@param {A3a.Compiler.TokenBase} head
	@param {A3a.Compiler.Node} condition
*/
A3a.Compiler.L2.NodeStatementWhile = function (head, condition) {
	A3a.Compiler.NodeStatementWhile.call(this, head, condition);
	/** @type {?string} */
	this.label = null;
};
A3a.Compiler.L2.NodeStatementWhile.prototype = Object.create(A3a.Compiler.NodeStatementWhile.prototype);
A3a.Compiler.L2.NodeStatementWhile.prototype.constructor = A3a.Compiler.L2.NodeStatementWhile;

/** @inheritDoc
*/
A3a.Compiler.L2.NodeStatementWhile.prototype.generateA3aBC = function (compiler, isTopLevel) {
	if (this.condition == null && this.children.length === 0) {
		return [];
	}
	var baseContext = compiler.getContext();
	this.prepareGenerateA3aBC(compiler);
	var bc = [];
	var bcAddr0 = compiler.bcAddr;
	compiler.loops.push({});
	if (this.condition != null) {
		bc = this.condition.generateA3aCondBranchBC(compiler);
	}
	compiler.prepareJump(bc);
	compiler.setContext(this.contexts[0]);
	this.children.forEach(function (st) {
		compiler.bcAddr = bcAddr0 + bc.length;
		bc = bc.concat(st.generateA3aBC(compiler));
	});
	bc = bc.concat((A3a.vm.bc.jump << 12) | (-bc.length & 0xfff));
	compiler.finalizeJump(bc);
	A3a.Compiler.L2.NodeStatementBreak.resolveBreakJumps(bc, 0, bc.length, this.label);
	compiler.loops.pop();
	compiler.setContext(baseContext);
	return bc;
};

/** "do"/"while" statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
*/
A3a.Compiler.L2.NodeStatementDoWhile = function (head) {
	A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
	/** @type {A3a.Compiler.Node} */
	this.condition = null;
	/** @type {?string} */
	this.label = null;
	/** @type {Array.<A3a.Compiler.NodeStatement>} */
	this.linkedStatements = [];
};
A3a.Compiler.L2.NodeStatementDoWhile.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementDoWhile.prototype.constructor = A3a.Compiler.L2.NodeStatementDoWhile;

/** @inheritDoc
*/
A3a.Compiler.L2.NodeStatementDoWhile.prototype.processEndStatement = function (st) {
	if (!(st instanceof A3a.Compiler.L2.NodeStatementEndWhile)) {
		throw "unexpected closing statement for \"do\"";
	}
	this.condition = st.condition;
};

/** @inheritDoc
*/
A3a.Compiler.L2.NodeStatementDoWhile.prototype.generateA3aBC = function (compiler, isTopLevel) {
	if (this.condition == null && this.children.length === 0) {
		return [];
	}
	var baseContext = compiler.getContext();
	this.prepareGenerateA3aBC(compiler);
	var bc = [];
	var bcAddr0 = compiler.bcAddr;
	compiler.loops.push({});
	compiler.setContext(this.contexts[0]);
	this.children.forEach(function (st) {
		compiler.bcAddr = bcAddr0 + bc.length;
		bc = bc.concat(st.generateA3aBC(compiler));
	});
	if (this.condition != null) {
		var cond = new A3a.Compiler.NodeFun(
			new A3a.Compiler.TokenKeyword(this.condition.head.srcIndex,
				this.condition.head.srcLine,
				this.condition.head.srcCol,
				"not"),
			A3a.Compiler.opType.prefix,
			compiler.getOperator("!", A3a.Compiler.opType.prefix),
			[this.condition]);
		bc = bc.concat(cond.generateA3aCondBranchBC(compiler));
		compiler.prepareJump(bc);
		compiler.finalizeJump(bc, 0);
	}
	A3a.Compiler.L2.NodeStatementBreak.resolveBreakJumps(bc, 0, bc.length, this.label);
	compiler.loops.pop();
	compiler.setContext(baseContext);
	return bc;
};

/** "while" statement node for the while part of a do/while construct (follows the closing brace)
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {A3a.Compiler.Node} expr
*/
A3a.Compiler.L2.NodeStatementEndWhile = function (head, expr) {
	A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.end);
	this.condition = expr;
};
A3a.Compiler.L2.NodeStatementEndWhile.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementEndWhile.prototype.constructor = A3a.Compiler.L2.NodeStatementEndWhile;

/** "for" statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {A3a.Compiler.TokenName} varDecl name of declared variable or null
	@param {A3a.Compiler.resultType} varType type of varDecl (ignored if varDecl is null)
	@param {?A3a.Compiler.Node} expr1
	@param {?A3a.Compiler.Node} expr2
	@param {?A3a.Compiler.Node} expr3
*/
A3a.Compiler.L2.NodeStatementFor = function (head, varDecl, varType, expr1, expr2, expr3) {
	A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
	if (expr1) {
		expr1.shouldProduceValue = false;
	}
	if (expr3) {
		expr3.shouldProduceValue = false;
	}
	this.varDecl = varDecl;
	this.varType = varType;
	this.expr1 = expr1;
	this.expr2 = expr2;
	this.expr3 = expr3;
	/** @type {?string} */
	this.label = null;
	/** @type {Array.<A3a.Compiler.NodeStatement>} */
	this.linkedStatements = [];
};
A3a.Compiler.L2.NodeStatementFor.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementFor.prototype.constructor = A3a.Compiler.L2.NodeStatementFor;

/** @inheritDoc
*/
A3a.Compiler.L2.NodeStatementFor.prototype.resolveArraySize = function (compiler) {
	A3a.Compiler.Node.prototype.resolveArraySize.call(this, compiler);
	if (this.expr1) {
		this.expr1.resolveArraySize(compiler);
	}
	if (this.expr2) {
		this.expr2.resolveArraySize(compiler);
	}
	if (this.expr3) {
		this.expr3.resolveArraySize(compiler);
	}
};

/** @inheritDoc
*/
A3a.Compiler.L2.NodeStatementFor.prototype.optimize = function (compiler) {
	if (this.expr1) {
		this.expr1 = this.expr1.optimize(compiler);
	}
	if (this.expr2) {
		this.expr2 = this.expr2.optimize(compiler);
	}
	if (this.expr3) {
		this.expr3 = this.expr3.optimize(compiler);
	}
	A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
	return this;
};

/**
	@inheritDoc
*/
A3a.Compiler.L2.NodeStatementFor.prototype.postProcess = function (compiler, st) {
	this.linkedStatements.push(st);
};

/**
	@inheritDoc
*/
A3a.Compiler.L2.NodeStatementFor.prototype.generateA3aBC = function (compiler, isTopLevel) {
	var baseContext = compiler.getContext();
	this.prepareGenerateA3aBC(compiler);
	compiler.setContext(this.contexts[1]);
	var bcAddr0 = compiler.bcAddr;
	var bc = this.expr1 ? this.expr1.generateA3aBC(compiler) : [];
	compiler.loops.push({});
	var beg = bc.length;
	if (this.expr2) {
		// test: like while
		bc = bc.concat(this.expr2.generateA3aCondBranchBC(compiler));
		compiler.prepareJump(bc);
	}
	compiler.setContext(this.contexts[0]);
	for (var i = 0; i < this.children.length; i++) {
		compiler.bcAddr = bcAddr0 + bc.length;
		bc = bc.concat(this.children[i].generateA3aBC(compiler));
	}
	compiler.setContext(this.contexts[1]);
	var contTarget = bc.length;
	compiler.bcAddr = bcAddr0 + bc.length;
	compiler.addSourceToBCMapping(this.linkedStatements[0]);
	if (this.expr3) {
		bc = bc.concat(this.expr3.generateA3aBC(compiler));
	}
	bc = bc.concat((A3a.vm.bc.jump << 12) | (beg - bc.length & 0xfff));
	if (this.expr2) {
		compiler.finalizeJump(bc);
	}
	A3a.Compiler.L2.NodeStatementBreak.resolveBreakJumps(bc, contTarget, bc.length, this.label);
	compiler.loops.pop();
	compiler.setContext(baseContext);
	return bc;
};

/** "break" statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {boolean} isContinue true for "continue", false for "break"
	@param {?string} label loop label, or null if none (innermost loop)
*/
A3a.Compiler.L2.NodeStatementBreak = function (head, isContinue, label) {
	A3a.Compiler.NodeStatement.call(this, head);
	this.isContinue = isContinue;
	this.label = label;
};
A3a.Compiler.L2.NodeStatementBreak.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementBreak.prototype.constructor = A3a.Compiler.L2.NodeStatementBreak;

/** Code placeholder for break and continue, to be resolved in link phase
	@constructor
	@extends {A3a.Compiler.CodePlaceholder}
*/
A3a.Compiler.L2.CodePlaceholderBreak = function (compiler, statement) {
	A3a.Compiler.CodePlaceholder.call(this, compiler, statement);
};
A3a.Compiler.L2.CodePlaceholderBreak.prototype = Object.create(A3a.Compiler.CodePlaceholder.prototype);
A3a.Compiler.L2.CodePlaceholderBreak.prototype.constructor = A3a.Compiler.L2.CodePlaceholderBreak;

/** Resolve break and continue in bytecode
	@param {Array.<(number|A3a.Compiler.CodePlaceholder)>} bc bytecode
	@param {number} continueAddr address of continue target (beginning of loop, before update expr of "for"),
	or -1 in "switch"
	@param {number} breakAddr address of break target (end of loop or switch)
	@param {?string} label loop or switch label, or null if none
	@return {void}
*/
A3a.Compiler.L2.NodeStatementBreak.resolveBreakJumps = function (bc, continueAddr, breakAddr, label) {
	for (var i = 0; i < bc.length; i++) {
		if (bc[i] instanceof A3a.Compiler.L2.CodePlaceholderBreak) {
			var phlabel = bc[i].statement.label;
			if (phlabel == null || phlabel === label) {
				if (bc[i].statement.isContinue) {
					bc[i] = (A3a.vm.bc.jump << 12) | (continueAddr - i & 0xfff);
				} else {
					bc[i] = (A3a.vm.bc.jump << 12) | (breakAddr - i & 0xfff);
				}
			}
		}
	}
};

/** For bytecode "break" or "continue" mark, throw an error
	@param {number|A3a.Compiler.CodePlaceholder} op
	@return {void}
*/
A3a.Compiler.L2.NodeStatementBreak.errorOnLabelMark = function (op) {
	if (op instanceof A3a.Compiler.L2.CodePlaceholderBreak) {
		var label = op.statement.label;
		if (label != null) {
			throw "unknown " + (op.statement.isContinue ? "continue" : "break") +
				" label \"" + label + "\"" + op.statement.head.posString();
		} else {
			throw "unexpected \"" + (op.statement.isContinue ? "continue" : "break") +
				"\" " + op.statement.head.posString();
		}
	}
};

/** @inheritDoc
*/
A3a.Compiler.L2.NodeStatementBreak.prototype.generateA3aBC = function (compiler, isTopLevel) {
	if (compiler.loops.length === 0) {
		throw (this.isContinue ? "\"continue\"" : "\"break\"") + " outside loop " + this.head.posString();
	}
	this.prepareGenerateA3aBC(compiler);
	return [
		new A3a.Compiler.L2.CodePlaceholderBreak(compiler, this)
	];
};

/** "switch" statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
*/
A3a.Compiler.L2.NodeStatementSwitch = function (head, expr) {
	A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
	this.expr = expr;
	/** @type {?string} */
	this.label = null;
	/** @type {Array.<A3a.Compiler.NodeStatement>} */
	this.linkedStatements = [];
};
A3a.Compiler.L2.NodeStatementSwitch.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementSwitch.prototype.constructor = A3a.Compiler.L2.NodeStatementSwitch;

/** @inheritDoc
*/
A3a.Compiler.L2.NodeStatementSwitch.prototype.generateA3aBC = function (compiler, isTopLevel) {
	var bcAddr0 = compiler.bcAddr;
	var bc = this.expr.generateA3aBC(compiler)
		.concat(
			// store temporarily in return value, for chained comparisons
			(A3a.vm.bc.store << 12) | compiler.retValueOffset
		);
	var baseContext = compiler.getContext();
	compiler.setContext(this.contexts[0]);
	var hasJumpChain = !(this.children[0] instanceof A3a.Compiler.L2.NodeStatementCase);
	if (hasJumpChain) {
		// skip initial statements without case/default
		bc = bc.concat((A3a.vm.bc.jump << 12) | 0);
		compiler.prepareJump(bc);	// first "case" or "default"
	}
	compiler.loops.push({});
	var fallThrough = false;	// used to skip "case" tests
	for (var i = 0; i < this.children.length; ) {
		compiler.bcAddr = bcAddr0 + bc.length;
		if (this.children[i] instanceof A3a.Compiler.L2.NodeStatementCase) {
			// collect values of adjacent case/default
			/** @type {Array.<number>} */
			var c = [];
			var hasDefault = false;
			while (i < this.children.length &&
				this.children[i] instanceof A3a.Compiler.L2.NodeStatementCase) {
				if (this.children[i].expr != null) {
					var expr = this.children[i].expr.optimize(compiler);
					if (!(expr instanceof A3a.Compiler.NodeNumber)) {
						throw "non-constant expression in \"case\" " + this.children[i].head.posString();
					}
					c.push(expr.n);
				} else {
					hasDefault = true;
				}
				i++;
			}

			if (hasDefault) {
				if (hasJumpChain) {
					compiler.finalizeJump(bc);	// chain from "switch" or previous "case"
					hasJumpChain = false;
				}
			} else if (c.length === 1) {
				// single "case": jump to next case/default if not eq
				if (fallThrough) {
					bc = bc.concat((A3a.vm.bc.jump << 12) | 5);
				}
				if (hasJumpChain) {
					compiler.finalizeJump(bc);	// chain from "switch" or previous "case"
				}
				bc = bc
					.concat((A3a.vm.bc.load << 12) | compiler.retValueOffset)
					.concat(A3a.Compiler.NodeNumber.generateA3aBC(c[0]))
					.concat((A3a.vm.bc.conditionalBranch << 12) | A3a.vm.condName.indexOf("eq"), 0);
				compiler.prepareJump(bc);	// next "case" or "default"
				hasJumpChain = true;
			} else {
				// multiple "case": jump to following code if not ne
				if (fallThrough) {
					bc = bc.concat((A3a.vm.bc.jump << 12) | 4 * c.length + 1);
				}
				if (hasJumpChain) {
					compiler.finalizeJump(bc);	// chain from "switch" or previous "case"
				}
				c.forEach(function (c1, j) {
					bc = bc
						.concat((A3a.vm.bc.load << 12) | compiler.retValueOffset)
						.concat(A3a.Compiler.NodeNumber.generateA3aBC(c1))
						.concat(
							(A3a.vm.bc.conditionalBranch << 12) | A3a.vm.condName.indexOf("ne"),
							4 * (c.length - j) - 1
						);
				});
				bc = bc
					.concat((A3a.vm.bc.jump << 12) | 0);
				compiler.prepareJump(bc);	// next "case" or "default"
				hasJumpChain = true;
			}
			fallThrough = true;
		} else {
			bc = bc.concat(this.children[i].generateA3aBC(compiler));
			fallThrough = !(this.children[i] instanceof A3a.Compiler.L2.NodeStatementBreak) &&
				!(this.children[i] instanceof A3a.Compiler.L2.NodeStatementReturn);
			i++;
		}
	}
	A3a.Compiler.L2.NodeStatementBreak.resolveBreakJumps(bc, -1, bc.length, this.label);
	compiler.loops.pop();
	compiler.setContext(baseContext);
	return bc;
}

/** "case" or "default" statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {A3a.Compiler.Node} expr case constant expression, or null for "default"
*/
A3a.Compiler.L2.NodeStatementCase = function (head, expr) {
	A3a.Compiler.NodeStatement.call(this, head);
	this.expr = expr;
};
A3a.Compiler.L2.NodeStatementCase.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementCase.prototype.constructor = A3a.Compiler.L2.NodeStatementCase;

/** @inheritDoc
*/
A3a.Compiler.L2.NodeStatementCase.prototype.generateA3aBC = function (compiler, isTopLevel) {
	throw (this.expr ? "\"case\"" : "\"default\"") + " outside switch " + this.head.posString();
};

/** label statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {string} label
*/
A3a.Compiler.L2.NodeStatementLabel = function (head, label) {
	A3a.Compiler.NodeStatement.call(this, head);
	this.label = label;
};
A3a.Compiler.L2.NodeStatementLabel.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementLabel.prototype.constructor = A3a.Compiler.L2.NodeStatementLabel;

/** @inheritDoc
*/
A3a.Compiler.L2.NodeStatementLabel.prototype.generateA3aBC = function (compiler, isTopLevel) {
	compiler.label = this.label;
	A3a.Compiler.L2.findLabel(compiler.labels, this.label).address = compiler.bcAddr;
	return [];
};

/** goto statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {string} label
*/
A3a.Compiler.L2.NodeStatementGoto = function (head, label) {
	A3a.Compiler.NodeStatement.call(this, head);
	this.label = label;
};
A3a.Compiler.L2.NodeStatementGoto.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementGoto.prototype.constructor = A3a.Compiler.L2.NodeStatementGoto;

/** Code placeholder for goto, to be resolved in link phase
	@constructor
	@extends {A3a.Compiler.CodePlaceholder}
*/
A3a.Compiler.L2.CodePlaceholderGoto = function (compiler, statement, labels) {
	A3a.Compiler.CodePlaceholder.call(this, compiler, statement);
	this.labels = labels;
};
A3a.Compiler.L2.CodePlaceholderGoto.prototype = Object.create(A3a.Compiler.CodePlaceholder.prototype);
A3a.Compiler.L2.CodePlaceholderGoto.prototype.constructor = A3a.Compiler.L2.CodePlaceholderGoto;

/** @inheritDoc
*/
A3a.Compiler.L2.CodePlaceholderGoto.prototype.generateA3aBC = function (addr) {
	var label = A3a.Compiler.L2.findLabel(this.labels, this.statement.label);
	if (label === null) {
		throw "unknown label \"" + this.statement.label + "\" " + this.statement.head.posString();
	}
	return (A3a.vm.bc.jump << 12) | (label.address - addr & 0xfff);
};

/** @inheritDoc
*/
A3a.Compiler.L2.NodeStatementGoto.prototype.generateA3aBC = function (compiler, isTopLevel) {
	return [
		new A3a.Compiler.L2.CodePlaceholderGoto(compiler, this, compiler.labels.slice())
	];
};

/** "onevent" statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {string} eventName
*/
A3a.Compiler.L2.NodeStatementOnevent = function (head, eventName) {
	A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
	this.eventName = eventName;
	/** @type {Array.<A3a.Compiler.NodeStatement>} */
	this.linkedStatements = [];
};
A3a.Compiler.L2.NodeStatementOnevent.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementOnevent.prototype.constructor = A3a.Compiler.L2.NodeStatementOnevent;

/** @inheritDoc
*/
A3a.Compiler.L2.NodeStatementOnevent.prototype.optimize = function (compiler) {
	A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
	return this;
};

/**
	@inheritDoc
*/
A3a.Compiler.L2.NodeStatementOnevent.prototype.generateA3aBC = function (compiler, isTopLevel) {
	if (isTopLevel) {
		var baseContext = compiler.getContext();
		this.prepareGenerateA3aBC(compiler);
		compiler.setContext(this.contexts[0]);
		var bc = A3a.Compiler.Node.prototype.generateA3aBC.call(this, compiler)
			.concat(A3a.vm.bc.stop << 12);
		compiler.setContext(baseContext);
		return bc;
	} else {
		return [];
	}
};

/** "def" statement node
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {string} funName
	@param {A3a.Compiler.resultType} resultType
	@param {Array.<A3a.Compiler.L2.NodeStatementDef.argDescription>} args
*/
A3a.Compiler.L2.NodeStatementDef = function (head, funName, resultType, args) {
	A3a.Compiler.NodeStatement.call(this, head, A3a.Compiler.NodeStatement.type.begin);
	this.funName = funName;
	this.resultType = resultType;
	this.args = args;
	/** @type {Array.<A3a.Compiler.NodeStatement>} */
	this.linkedStatements = [];
};
A3a.Compiler.L2.NodeStatementDef.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementDef.prototype.constructor = A3a.Compiler.L2.NodeStatementDef;

/**
	@typedef {{
		name: string,
		type: A3a.Compiler.resultType,
		size: number,
		dims: Array.<number>,
		dimsExpr: Array.<A3a.Compiler.Node>,
		isRef: boolean
	}}
*/
A3a.Compiler.L2.NodeStatementDef.argDescription;

/** @inheritDoc
*/
A3a.Compiler.L2.NodeStatementDef.prototype.processBeginStatement = function (compiler) {
	compiler.functionResultType = this.resultType;
};

/** @inheritDoc
*/
A3a.Compiler.L2.NodeStatementDef.prototype.optimize = function (compiler) {
	A3a.Compiler.Node.optimizeNodeArray(this.children, compiler);
	return this;
};

/**
	@inheritDoc
*/
A3a.Compiler.L2.NodeStatementDef.prototype.generateA3aBC = function (compiler, isTopLevel) {
	if (isTopLevel) {
		var baseContext = compiler.getContext();
		this.prepareGenerateA3aBC(compiler);
		compiler.setContext(this.contexts[0]);
		var bc = A3a.Compiler.Node.prototype.generateA3aBC.call(this, compiler)
			.concat(A3a.vm.bc.ret << 12);
		compiler.setContext(baseContext);
		return bc;
	} else {
		return [];
	}
};

/** "return" statement node, with optional return value
	@constructor
	@extends {A3a.Compiler.NodeStatement}
	@param {A3a.Compiler.TokenBase} head
	@param {?A3a.Compiler.Node} val
*/
A3a.Compiler.L2.NodeStatementReturn = function (head, val) {
	A3a.Compiler.NodeStatement.call(this, head);
	if (val) {
		this.children.push(val);
	}
};
A3a.Compiler.L2.NodeStatementReturn.prototype = Object.create(A3a.Compiler.NodeStatement.prototype);
A3a.Compiler.L2.NodeStatementReturn.prototype.constructor = A3a.Compiler.L2.NodeStatementReturn;

/** @inheritDoc
*/
A3a.Compiler.L2.NodeStatementReturn.prototype.postProcess = function (compiler, st) {
	// check context
	if (compiler.functionResultType === A3a.Compiler.resultType.undef) {
		throw "\"return\" outside function definition " + this.head.posString();
	} else if (compiler.functionResultType === A3a.Compiler.resultType.void &&
		this.children.length > 0) {
		throw "unexpected return value in void function " + this.head.posString();
	} else if (compiler.functionResultType !== A3a.Compiler.resultType.void &&
		this.children.length === 0) {
		throw "missing return value in non-void function " + this.head.posString();
	}
	if (this.children.length > 0) {
		this.children[0] = A3a.Compiler.L2.castNodeType(this.children[0],
				compiler.functionResultType, compiler)
			.optimize(compiler);
	}
};

/** @inheritDoc
*/
A3a.Compiler.L2.NodeStatementReturn.prototype.generateA3aBC = function (compiler, isTopLevel) {
	this.prepareGenerateA3aBC(compiler);
	var bc = [];
	if (this.children.length > 0) {
		bc = this.children[0].generateA3aBC(compiler)
			.concat(compiler.generateA3aBCForTypeConversion(this.children[0].resultType, compiler.functionResultType))
			.concat((A3a.vm.bc.store << 12) | compiler.retValueOffset);
	}
	return bc.concat(A3a.vm.bc.ret << 12)
};
