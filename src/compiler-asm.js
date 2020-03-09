/*
	Copyright 2020 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Assembler for Aseba VM bytecode.

*/

/**
	@constructor
	@param {A3a.A3aNode} asebaNode
	@param {string} src source code
*/
A3a.Assembler = function (asebaNode, src) {
	this.asebaNode = asebaNode;
	this.src = src;
};

/** Create definition dict based on node variables and native functions
	@return {Object}
*/
A3a.Assembler.prototype.nodeDefinitions = function () {
	var defs = {};

	// variables
	this.asebaNode.variables.forEach(function (v) {
		defs[v.name] = v.offset;
	});
	defs["_userdata"] = this.asebaNode.varSize;
	defs["_topdata"] = this.asebaNode.maxVarSize;

	// native functions
	this.asebaNode.nativeFunctions.forEach(function (nf) {
		defs["_nf." + nf.name] = nf.id;
	});

	return defs;
};

/** Assemble to bytecode
	@return {Array.<number>} bytecode
*/
A3a.Assembler.prototype.assemble = function () {
	var lines = this.src.split("\n");
	var bytecode = [];
	var defs = this.nodeDefinitions();
	for (var pass = 0; pass < 2; pass++) {
		bytecode = [];
		lines.forEach(function (line, i) {
			var re = /^\s*(;.*)?$/.exec(line);
			if (re) {
				// blank or comment (ignore)
				return;
			}

			re = /^\s*(\w+:)\s*(;.*)?$/i.exec(line);
			if (re) {
				// label without instr
				var label = re[1];
				defs[label.slice(0, -1)] = bytecode.length;
				return;
			}

			re = /^\s*(\w+:)?\s*([a-z0-9.]+)([-a-z0-9\s.,+=]*)(;.*)?$/i.exec(line);
			if (re) {
				var label = re[1];
				if (label) {
					label = label.slice(0, -1);	// remove colon
					defs[label] = bytecode.length;
				}

				var instrName = re[2];
				var instrArgs = re[3].trim();
				if (instrName) {
					var argsSplit = instrArgs.length > 0
						? instrArgs
							.split(",")
							.map(function (s) {
								return s.trim().split(/\s+/);
							})
						: [];
					argsSplit = [].concat.apply([], argsSplit);
					var instr = A3a.Assembler.instr[instrName];
					if (instr == undefined) {
						throw "Unknown instruction \"" + instrName + "\" (line " + (i + 1).toString(10) + ")";
					} else if (instr.numArgs !== -1 && (instr.numArgs || 0) != argsSplit.length) {
						throw "Wrong number of arguments (line " + (i + 1).toString(10) + ")";
					}
					if (instr.instr !== undefined) {
						bytecode = bytecode.concat(instr.instr);
					} else if (instr.toInstr) {
						var args = argsSplit.map(function (arg) {
							if (/^[a-z]+=/.test(arg)) {
								arg = arg.replace(/^[a-z]+=/, "");
							}
							if (/(0x)?\d+/.test(arg)) {
								return parseInt(arg, 0);	// decimal or hexadecimal
							}
							return arg;
						});
						bytecode = bytecode.concat(instr.toInstr(bytecode.length, args, label, pass == 1 ? defs : null, i + 1));
					}
				}
			} else {
				throw "Syntax error (line " + (i + 1).toString(10) + ")";
			}
		}, this);
	}
	return bytecode;
};

/** Convert instruction argument to numerical value
	@param {(number|string)} arg
	@param {Object} defs
	@return {number}
*/
A3a.Assembler.resolveSymbol = function (arg, defs) {
	if (typeof arg === "string") {
		if (defs == null) {
			return 0;
		}
		if (!defs.hasOwnProperty(arg)) {
			throw "Unknown symbol \"" + arg + "\"";
		}
		arg = defs[arg];
	}
	return arg;
};

/** @const
*/
A3a.Assembler.instr = {
	"dc": {
		numArgs: -1,
		toInstr: function (pc, args, label, defs, line) {
			return args.map(function (w) {
				w = A3a.Assembler.resolveSymbol(w, defs);
				return w & 0xffff;
			});
		}
	},
	"equ": {
		numArgs: 1,
		toInstr: function (pc, args, label, defs, line) {
			if (!label) {
				throw "No label for pseudo-instruction \"equ\"";
			}
			if (defs) {
				defs[label] = A3a.Assembler.resolveSymbol(args[0], defs);
			}
			return [];
		}
	},

	"stop": {
		instr: [0x0000]
	},
	"push.s": {
		numArgs: 1,
		toInstr: function (pc, args, label, defs, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs);
			if (arg >= 0x1000 || -arg > 0x1000) {
				throw "Small integer overflow (line " + line.toString(10) + ")";
			}
			return [0x1000 | arg & 0xfff];
		}
	},
	"push": {
		numArgs: 1,
		toInstr: function (pc, args, label, defs, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs);
			return [0x2000, arg & 0xffff];
		}
	},
	"load": {
		numArgs: 1,
		toInstr: function (pc, args, label, defs, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs);
			if (arg < 0 || arg >= 0x1000) {
				throw "Data address out of range (line " + line.toString(10) + ")";
			}
			return [0x3000 | arg & 0xfff];
		}
	},
	"store": {
		numArgs: 1,
		toInstr: function (pc, args, label, defs, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs);
			if (arg < 0 || arg >= 0x1000) {
				throw "Data address out of range (line " + line.toString(10) + ")";
			}
			return [0x4000 | arg & 0xfff];
		}
	},
	"load.ind": {
		numArgs: 2,
		toInstr: function (pc, args, label, defs, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs);
			if (arg < 0 || arg >= 0x1000) {
				throw "Data address out of range (line " + line.toString(10) + ")";
			}
			var sizeArg = A3a.Assembler.resolveSymbol(args[1], defs);
			return [0x5000 | arg & 0xfff, sizeArg & 0xffff];
		}
	},
	"store.ind": {
		numArgs: 2,
		toInstr: function (pc, args, label, defs, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs);
			if (arg < 0 || arg >= 0x1000) {
				throw "Data address out of range (line " + line.toString(10) + ")";
			}
			var sizeArg = A3a.Assembler.resolveSymbol(args[1], defs);
			return [0x6000 | arg & 0xfff, sizeArg & 0xffff];
		}
	},
	"neg": {
		instr: [0x7000]
	},
	"abs": {
		instr: [0x7001]
	},
	"bitnot": {
		instr: [0x7002]
	},
	"not": {
		toInstr: function (pc, args, label, defs, line) {
			throw "Unary not not implemented in the VM";
		}
	},
	"sl": {
		instr: [0x8000]
	},
	"asr": {
		instr: [0x8001]
	},
	"add": {
		instr: [0x8002]
	},
	"sub": {
		instr: [0x8003]
	},
	"mult": {
		instr: [0x8004]
	},
	"div": {
		instr: [0x8005]
	},
	"mod": {
		instr: [0x8006]
	},
	"bitor": {
		instr: [0x8007]
	},
	"bitxor": {
		instr: [0x8008]
	},
	"bitand": {
		instr: [0x8009]
	},
	"eq": {
		instr: [0x800a]
	},
	"ne": {
		instr: [0x800b]
	},
	"gt": {
		instr: [0x800c]
	},
	"ge": {
		instr: [0x800d]
	},
	"lt": {
		instr: [0x800e]
	},
	"le": {
		instr: [0x800f]
	},
	"or": {
		instr: [0x8010]
	},
	"and": {
		instr: [0x8011]
	},
	"jump": {
		numArgs: 1,
		toInstr: function (pc, args, label, defs, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs);
			return [0x9000 | (arg - pc) & 0x0fff];
		}
	},
	"jump.if.not": {
		numArgs: 2,
		toInstr: function (pc, args, label, defs, line) {
			var testInstr = A3a.Assembler.instr[args[0]];
			if (testInstr == undefined || testInstr.instr == undefined ||
				testInstr.instr.length !== 1 || (testInstr.instr[0] & 0xf000) !== 0x8000) {
				throw "Unknown op \"" + args[0] + "\" for jump.if.not (line " + line.toString(10) + ")";
			}
			var arg = A3a.Assembler.resolveSymbol(args[1], defs);
			return [0xa000 | (testInstr.instr[0] & 0x00ff), (arg - pc) & 0xffff];
		}
	},
	"do.jump.when.not": {
		numArgs: 2,
		toInstr: function (pc, args, label, defs, line) {
			var testInstr = A3a.Assembler.instr[args[0]];
			if (testInstr == undefined || testInstr.instr == undefined ||
				testInstr.instr.length !== 1 || (testInstr.instr[0] & 0xf000) !== 0x8000) {
				throw "Unknown op \"" + args[0] + "\" for do.jump.when.not (line " + line.toString(10) + ")";
			}
			var arg = A3a.Assembler.resolveSymbol(args[1], defs);
			return [0xa100 | (testInstr.instr[0] & 0x00ff), (arg - pc) & 0xffff];
		}
	},
	"dont.jump.when.not": {
		numArgs: 2,
		toInstr: function (pc, args, label, defs, line) {
			var testInstr = A3a.Assembler.instr[args[0]];
			if (testInstr == undefined || testInstr.instr == undefined ||
				testInstr.instr.length !== 1 || (testInstr.instr[0] & 0xf000) !== 0x8000) {
				throw "Unknown op \"" + args[0] + "\" for dont.jump.when.not (line " + line.toString(10) + ")";
			}
			var arg = A3a.Assembler.resolveSymbol(args[1], defs);
			return [0xa300 | (testInstr.instr[0] & 0x00ff), (arg - pc) & 0xffff];
		}
	},
	"callnat": {
		numArgs: 1,
		toInstr: function (pc, args, label, defs, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs);
			if (arg < 0 || arg >= 0x1000) {
				throw "Native id out of range (line " + line.toString(10) + ")";
			}
			return [0xc000 | arg & 0xfff];
		}
	},
	"callsub": {
		numArgs: 1,
		toInstr: function (pc, args, label, defs, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs);
			if (arg < 0 || arg >= 0x1000) {
				throw "Subroutine address out of range (line " + line.toString(10) + ")";
			}
			return [0xd000 | arg & 0xfff];
		}
	},
	"ret": {
		instr: [0xe000]
	}
};
