/*
	Copyright 2018-2022 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Extraction of code fragments for code generation from JSON.

*/

/** Get codeGen dict from json description for a block
	@param {Object} b block definition from JSON (already parsed)
	@param {Object<string,A3a.vpl.BlockTemplate.genCodeFun>=} genCode0 dict to add to (default: {})
	@return {Object<string,A3a.vpl.BlockTemplate.genCodeFun>}
*/
A3a.vpl.BlockTemplate.loadCodeGenFromJSON = function (b, genCode0) {
	/** Get string property, either directly as plain string or by concatenating strings in array
		@param {(string|Array.<string>)} s
		@return {string}
	*/
	function str(s) {
		return /** @type {string} */(s instanceof Array ? s.join("") : s);
	}

	/** Substitute inline expressions {expr} in strings of input array, where expr is a
		JavaScript expression; variable $ contains the block parameters
		@param {Array.<string>} fmtArray
		@param {Array} param
		@param {{slowdown:number,i:number}} options
		@return {Array.<string>}
	*/
	function substInlineA(fmtArray, param, options) {
		return fmtArray.map(function (fmt) {
			return /** @type {string} */(A3a.vpl.BlockTemplate.substInline(fmt, param, options));
		});
	}

	/** @type {Object<string,A3a.vpl.BlockTemplate.genCodeFun>} */
	var genCode = genCode0 || {};
	["aseba", "l2", "js", "python"].forEach(function (lang) {
		if (b[lang]) {
			genCode[lang] = function (block, program) {
				var param = block ? block.param : [];
				var options = {slowdown: program ? program.slowdownFactor : 1, i: 0};
				var c = {};
				b[lang]["initVarDecl"] && (c.initVarDecl = substInlineA(b[lang]["initVarDecl"].map(str), param, options));
				b[lang]["initCodeDecl"] && (c.initCodeDecl = substInlineA(b[lang]["initCodeDecl"].map(str), param, options));
				b[lang]["initCodeExec"] && (c.initCodeExec = substInlineA(b[lang]["initCodeExec"].map(str), param, options));
				b[lang]["sectionBegin"] && (c.sectionBegin = A3a.vpl.BlockTemplate.substInline(str(b[lang]["sectionBegin"]), param, options));
				b[lang]["sectionEnd"] && (c.sectionEnd = A3a.vpl.BlockTemplate.substInline(str(b[lang]["sectionEnd"]), param, options));
				b[lang]["sectionPreamble"] && (c.sectionPreamble = A3a.vpl.BlockTemplate.substInline(str(b[lang]["sectionPreamble"]), param, options));
				b[lang]["clauseInit"] && (c.clauseInit = A3a.vpl.BlockTemplate.substInline(str(b[lang]["clauseInit"]), param, options));
				if (b[lang]["clauseAnd"]) {
					var clause = "";
					param.forEach(function (p, i) {
						options.i = i;
						var cl = A3a.vpl.BlockTemplate.substInline(str(b[lang]["clauseAnd"]), param, options);
						if (cl) {
							clause += (clause.length > 0 ? " " + A3a.vpl.Program.codeGenerator[lang].andOperator + " " : "") + cl;
						}
					});
					c.clause = /** @type {string} */(clause || A3a.vpl.Program.codeGenerator[lang].trueConstant);
				} else if (b[lang]["clause"]) {
	 				c.clause = A3a.vpl.BlockTemplate.substInline(str(b[lang]["clause"]), param, options);
				}
				b[lang]["clauseAlwaysEval"] && (c.clauseAlwaysEval = b[lang]["clauseAlwaysEval"]);
				b[lang]["clauseAsCondition"] && (c.clauseAsCondition = A3a.vpl.BlockTemplate.substInline(str(b[lang]["clauseAsCondition"]), param, options));
				c.clauseOptional = /** @type {boolean} */(b[lang]["clauseOptional"]) || false;
				if (b[lang]["statement1"]) {
					c.statement = param.map(function (p, i) {
						options.i = i;
						return A3a.vpl.BlockTemplate.substInline(str(b[lang]["statement1"]), param, options);
					}).join("");
				} else if (b[lang]["statement"]) {
					c.statement = A3a.vpl.BlockTemplate.substInline(str(b[lang]["statement"]), param, options);
				}
				b[lang]["error"] && (c.clause = A3a.vpl.BlockTemplate.substInline(str(b["error"]["error"]), param, options));
				return c;
			};
		}
	});

	return genCode;
};
