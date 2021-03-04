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

	// local events
	defs["_ev.init"] = 0xffff;
	this.asebaNode.localEvents.forEach(function (ev, i) {
		defs["_ev." + ev.name] = 0xfffe - i;
	});

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
		var label = null;
		lines.forEach(function (line, i) {
			var re = /^\s*(;.*)?$/.exec(line);
			if (re) {
				// blank or comment (ignore)
				return;
			}

			re = /^\s*([\w_.]+:)\s*(;.*)?$/i.exec(line);
			if (re) {
				// label without instr
				label = re[1].slice(0, -1);
				defs[label] = bytecode.length;
				return;
			}

			re = /^\s*([\w_.]+:)?\s*([a-z0-9.]+)([-+a-z0-9\s._,=]*)(;.*)?$/i.exec(line);
			if (re) {
				if (re[1]) {
					label = re[1].slice(0, -1);	// remove colon
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
					if (instr.code !== undefined) {
						bytecode = bytecode.concat(instr.code);
					} else if (instr.toCode) {
						var args = argsSplit.map(function (arg) {
							if (/^[a-z]+=/.test(arg)) {
								arg = arg.replace(/^[a-z]+=/, "");
							}
							if (/^(0x[0-9a-f]+|[0-9]+)$/i.test(arg)) {
								return parseInt(arg, 0);	// decimal or hexadecimal
							}
							return arg;
						});
						bytecode = bytecode.concat(instr.toCode(bytecode.length, args, label, defs, pass, i + 1));
					}
					if (label && defs[label] !== bytecode.length) {
						label = null;
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
	@param {boolean} required
	@param {number} line
	@return {number}
*/
A3a.Assembler.resolveSymbol = function (arg, defs, required, line) {
	/** Convert definition in defs
	*/
	function resolveDef(name) {
		if (!required) {
			return 0;
		}
		if (/^(0x[0-9a-f]+|[0-9]+)$/i.test(name)) {
			return parseInt(name, 0);
		}
		if (!defs.hasOwnProperty(name)) {
			throw "Unknown symbol \"" + arg + "\" (line " + line.toString(10) + ")";
		}
		return defs[name];
	}

	if (typeof arg === "string") {
		// eval
		var val = 0;
		var minus = false;
		for (var offset = 0; offset < arg.length; ) {
			var frag = /^(\+|-|[._a-z0-9]+)/i.exec(arg.slice(offset));
			if (frag == null) {
				throw "Syntax error (line " + line.toString(10) + ")";
			}
			switch (frag[0]) {
			case "+":
			 	minus = false;
				break;
			case "-":
				minus = true;
				break;
			default:
				val += minus ? -resolveDef(frag[0]) : resolveDef(frag[0]);
				break;
			}
			offset += frag[0].length;
		}
		return val;
	}
	return arg;
};

/** @const
*/
A3a.Assembler.instr = {
	"dc": {
		numArgs: -1,
		toCode: function (pc, args, label, defs, pass, line) {
			return args.map(function (w) {
				w = A3a.Assembler.resolveSymbol(w, defs, pass === 1, line);
				return w & 0xffff;
			});
		}
	},
	"equ": {
		numArgs: 1,
		toCode: function (pc, args, label, defs, pass, line) {
			if (!label) {
				throw "No label for pseudo-instruction \"equ\" (line " + line.toString(10) + ")";
			}
			if (defs) {
				defs[label] = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
			}
			return [];
		}
	},

	"stop": {
		code: [0x0000]
	},
	"push.s": {
		numArgs: 1,
		toCode: function (pc, args, label, defs, pass, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
			if (arg >= 0x800 || -arg > 0x800) {
				throw "Small integer overflow (line " + line.toString(10) + ")";
			}
			return [0x1000 | arg & 0xfff];
		}
	},
	"push": {
		numArgs: 1,
		toCode: function (pc, args, label, defs, pass, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
			if (arg >= 0x8000 || -arg > 0x8000) {
				throw "Integer overflow (line " + line.toString(10) + ")";
			}
			return [0x2000, arg & 0xffff];
		}
	},
	"load": {
		numArgs: 1,
		toCode: function (pc, args, label, defs, pass, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
			if (arg < 0 || arg >= 0x1000) {
				throw "Data address out of range (line " + line.toString(10) + ")";
			}
			return [0x3000 | arg & 0xfff];
		}
	},
	"store": {
		numArgs: 1,
		toCode: function (pc, args, label, defs, pass, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
			if (arg < 0 || arg >= 0x1000) {
				throw "Data address out of range (line " + line.toString(10) + ")";
			}
			return [0x4000 | arg & 0xfff];
		}
	},
	"load.ind": {
		numArgs: 2,
		toCode: function (pc, args, label, defs, pass, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
			if (arg < 0 || arg >= 0x1000) {
				throw "Data address out of range (line " + line.toString(10) + ")";
			}
			var sizeArg = A3a.Assembler.resolveSymbol(args[1], defs, pass === 1, line);
			if (sizeArg < 0 || sizeArg >= 0x10000) {
				throw "Array size overflow (line " + line.toString(10) + ")";
			}
			return [0x5000 | arg & 0xfff, sizeArg & 0xffff];
		}
	},
	"store.ind": {
		numArgs: 2,
		toCode: function (pc, args, label, defs, pass, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
			if (arg < 0 || arg >= 0x1000) {
				throw "Data address out of range (line " + line.toString(10) + ")";
			}
			var sizeArg = A3a.Assembler.resolveSymbol(args[1], defs, pass === 1, line);
			if (sizeArg < 0 || sizeArg >= 0x10000) {
				throw "Array size overflow (line " + line.toString(10) + ")";
			}
			return [0x6000 | arg & 0xfff, sizeArg & 0xffff];
		}
	},
	"neg": {
		code: [0x7000]
	},
	"abs": {
		code: [0x7001]
	},
	"bitnot": {
		code: [0x7002]
	},
	"not": {
		toCode: function (pc, args, label, defs, pass, line) {
			throw "Unary not not implemented in the VM (line " + line.toString(10) + ")";
		}
	},
	"sl": {
		code: [0x8000]
	},
	"asr": {
		code: [0x8001]
	},
	"add": {
		code: [0x8002]
	},
	"sub": {
		code: [0x8003]
	},
	"mult": {
		code: [0x8004]
	},
	"div": {
		code: [0x8005]
	},
	"mod": {
		code: [0x8006]
	},
	"bitor": {
		code: [0x8007]
	},
	"bitxor": {
		code: [0x8008]
	},
	"bitand": {
		code: [0x8009]
	},
	"eq": {
		code: [0x800a]
	},
	"ne": {
		code: [0x800b]
	},
	"gt": {
		code: [0x800c]
	},
	"ge": {
		code: [0x800d]
	},
	"lt": {
		code: [0x800e]
	},
	"le": {
		code: [0x800f]
	},
	"or": {
		code: [0x8010]
	},
	"and": {
		code: [0x8011]
	},
	"jump": {
		numArgs: 1,
		toCode: function (pc, args, label, defs, pass, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
			if (arg - pc >= 0x800 || pc - arg > 0x800) {
				throw "Jump too far (line " + line.toString(10) + ")";
			}
			return [0x9000 | (arg - pc) & 0x0fff];
		}
	},
	"jump.if.not": {
		numArgs: 2,
		toCode: function (pc, args, label, defs, pass, line) {
			var testInstr = A3a.Assembler.instr[args[0]];
			if (testInstr == undefined || testInstr.code == undefined ||
				testInstr.code.length !== 1 || (testInstr.code[0] & 0xf000) !== 0x8000) {
				throw "Unknown op \"" + args[0] + "\" for jump.if.not (line " + line.toString(10) + ")";
			}
			var arg = A3a.Assembler.resolveSymbol(args[1], defs, pass === 1, line);
			if (arg - pc >= 0x8000 || pc - arg > 0x8000) {
				throw "Jump too far (line " + line.toString(10) + ")";
			}
			return [0xa000 | (testInstr.code[0] & 0x00ff), (arg - pc) & 0xffff];
		}
	},
	"do.jump.when.not": {
		numArgs: 2,
		toCode: function (pc, args, label, defs, pass, line) {
			var testInstr = A3a.Assembler.instr[args[0]];
			if (testInstr == undefined || testInstr.code == undefined ||
				testInstr.code.length !== 1 || (testInstr.code[0] & 0xf000) !== 0x8000) {
				throw "Unknown op \"" + args[0] + "\" for do.jump.when.not (line " + line.toString(10) + ")";
			}
			var arg = A3a.Assembler.resolveSymbol(args[1], defs, pass === 1, line);
			if (arg - pc >= 0x8000 || pc - arg > 0x8000) {
				throw "Jump too far (line " + line.toString(10) + ")";
			}
			return [0xa100 | (testInstr.code[0] & 0x00ff), (arg - pc) & 0xffff];
		}
	},
	"do.jump.always": {
		numArgs: 2,
		toCode: function (pc, args, label, defs, pass, line) {
			var testInstr = A3a.Assembler.instr[args[0]];
			if (testInstr == undefined || testInstr.code == undefined ||
				testInstr.code.length !== 1 || (testInstr.code[0] & 0xf000) !== 0x8000) {
				throw "Unknown op \"" + args[0] + "\" for do.jump.always (line " + line.toString(10) + ")";
			}
			var arg = A3a.Assembler.resolveSymbol(args[1], defs, pass === 1, line);
			if (arg - pc >= 0x8000 || pc - arg > 0x8000) {
				throw "Jump too far (line " + line.toString(10) + ")";
			}
			return [0xa300 | (testInstr.code[0] & 0x00ff), (arg - pc) & 0xffff];
		}
	},
	"emit": {
		numArgs: 3,
		toCode: function (pc, args, label, defs, pass, line) {
			var id = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
			if (id < 0 || id >= 0x1000) {
				throw "Event id out of range (line " + line.toString(10) + ")";
			}
			var addr = A3a.Assembler.resolveSymbol(args[1], defs, pass === 1, line);
			if (addr < 0 || addr >= 0x10000) {
				throw "Address out of range (line " + line.toString(10) + ")";
			}
			var size = A3a.Assembler.resolveSymbol(args[2], defs, pass === 1, line);
			if (size < 0 || size >= 0x10000) {
				throw "Size out of range (line " + line.toString(10) + ")";
			}
			return [0xb000 | id & 0xfff, addr & 0xffff, size & 0xffff];
		}
	},
	"callnat": {
		numArgs: 1,
		toCode: function (pc, args, label, defs, pass, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
			if (arg < 0 || arg >= 0x1000) {
				throw "Native call id out of range (line " + line.toString(10) + ")";
			}
			return [0xc000 | arg & 0xfff];
		}
	},
	"callsub": {
		numArgs: 1,
		toCode: function (pc, args, label, defs, pass, line) {
			var arg = A3a.Assembler.resolveSymbol(args[0], defs, pass === 1, line);
			if (arg < 0 || arg >= 0x1000) {
				throw "Subroutine address out of range (line " + line.toString(10) + ")";
			}
			return [0xd000 | arg & 0xfff];
		}
	},
	"ret": {
		code: [0xe000]
	}
};
