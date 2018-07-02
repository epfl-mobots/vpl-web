/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

epfl.mobots.vpl.patchL2 = function () {

	epfl.mobots.vpl.BlockTemplate.initOutputs2 =
		"// reset outputs\n" +
		"sound.system(-1);\n" +
		"leds.top(0, 0, 0);\n" +
		"leds.bottom.left(0, 0, 0);\n" +
		"leds.bottom.right(0, 0, 0);\n" +
		"leds.circle(0, 0, 0, 0, 0, 0, 0, 0);\n";

	/** @const */
	epfl.mobots.vpl.BlockTemplate.initStatesDecl2 =
		"// variables for state\n" +
		"int state[4];\n";

	/** @const */
	epfl.mobots.vpl.BlockTemplate.initStatesInit2 =
		"state = [0, 0, 0, 0];\n";

	/** @const */
	epfl.mobots.vpl.BlockTemplate.initCounterDecl2 =
		"// variable for counter\n" +
		"int counter;\n";

	/** @const */
	epfl.mobots.vpl.BlockTemplate.initCounterInit2 =
		"counter = 0;\n";

	/** @const */
	epfl.mobots.vpl.BlockTemplate.initTopColorDecl2 =
		"// RGB color of the top led\n" +
		"int topColor[3];\n";

	/** @const */
	epfl.mobots.vpl.BlockTemplate.initTopColorInit2 =
		"topColor = [0, 0, 0];\n";

	/** @const */
	epfl.mobots.vpl.BlockTemplate.dispStates2 =
		"// display the current state\n" +
		"void display_state() {\n" +
		"leds.circle(0,state[1]*32,0,state[3]*32,0,state[2]*32,0,state[0]*32);\n" +
		"}\n";

	/** @const */
	epfl.mobots.vpl.BlockTemplate.dispCounter2 =
		"// display the current counter\n" +
		"void display_counter(int c) {\n" +
		"leds.circle((c&1)<<5,(c&2)<<4,(c&4)<<3,(c&8)<<2,\n" +
		"(c&16)<<1,c&32,(c&64)>>1,(c&128)>>2);\n" +
		"}\n";

	/** @const */
	epfl.mobots.vpl.BlockTemplate.resetTimer2 =
		"// stop timer 0\n" +
		"timer.period[0] = 0;\n";

	(function () {
		/** @const */
		var libPatchLang2 = {
			"button": function (block) {
				var cond = "";
				for (var i = 0; i < 5; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " && ") +
							"button." + ["center", "forward", "backward", "right", "left"][i];
					}
				}
				if (cond === "") {
					cond = "button.center == 1 or button.forward == 1 or button.backward == 1 or button.right == 1 or button.left == 1";
				}
				return {
					sectionBegin: "onevent buttons {\n",
					sectionEnd: "}\n",
					sectionPriority: 10,
					clause: cond
				};
			},
			"horiz prox": function (block) {
				var cond = "";
				for (var i = 0; i < 7; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " && ") +
							"prox.horizontal[" + [2, 1, 3, 0, 4, 5, 6][i] + "] " +
							(block.param[i] > 0 ? ">= 2" : "<= 1") + "000";
					}
				}
				if (cond === "") {
					for (var i = 1; i < 7; i++) {
						cond += " || prox.horizontal[" + [2, 1, 3, 0, 4, 5, 6][i] + "] >= 2000";
					}
					cond = cond.slice(4);	// crop initial " && "
				}
				return {
					sectionBegin: "onevent prox {\n",
					sectionEnd: "}\n",
					sectionPriority: 1,
					clause: cond
				};
			},
			"horiz prox adv": function (block) {
				var cond = "";
				for (var i = 0; i < 7; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " && ") +
							"prox.horizontal[" + [2, 1, 3, 0, 4, 5, 6][i] + "] " +
							(block.param[i] > 0
								? ">= " + Math.round(7 + 33 * block.param[7])
								: "<= " + Math.round(7 + 33 * block.param[8])) +
							"00";
					}
				}
				if (cond === "") {
					for (var i = 1; i < 7; i++) {
						cond += " || prox.horizontal[" + [2, 1, 3, 0, 4, 5, 6][i] + "] >= 2000";
					}
					cond = cond.slice(4);	// crop initial " || "
				}
				return {
					sectionBegin: "onevent prox {\n",
					sectionEnd: "}\n",
					sectionPriority: 1,
					clause: cond
				};
			},
			"ground": function (block) {
				var cond = "";
				for (var i = 0; i < 2; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " && ") +
							"prox.ground.delta[" + i + "] " +
							(block.param[i] > 0 ? ">= 450" : "<= 400");
					}
				}
				if (cond === "") {
					for (var i = 1; i < 2; i++) {
						cond += " || prox.ground.delta[" + i + "] >= 450";
					}
					cond = cond.slice(4);	// crop initial " || "
				}
				return {
					sectionBegin: "onevent prox {\n",
					sectionEnd: "}\n",
					sectionPriority: 1,
					clause: cond
				};
			},
			"ground adv": function (block) {
				var cond = "";
				for (var i = 0; i < 2; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " && ") +
							"prox.ground.delta[" + i + "] " +
							(block.param[i] > 0
								? ">= " + 25 * Math.round(40 * block.param[2])
								: "<= " + 25 * Math.round(40 * block.param[3]));
					}
				}
				if (cond === "") {
					for (var i = 1; i < 2; i++) {
						cond += " || prox.ground.delta[" + i + "] >= 450";
					}
					cond = cond.slice(4);	// crop initial " || "
				}
				return {
					sectionBegin: "onevent prox {\n",
					sectionEnd: "}\n",
					sectionPriority: 1,
					clause: cond
				};
			},
			"tap": function (block) {
				return {
					sectionBegin: "onevent tap {\n",
					sectionEnd: "}\n",
					sectionPriority: 1000
				};
			},
			"accelerometer": function (block) {
				var dir = /** @type {number} */(block.param[0]);
				if (dir === 0) {
					// tap
					return {
						sectionBegin: "onevent tap {\n",
						sectionEnd: "}\n",
						sectionPriority: 1000
					};
				} else {
					/** @type {number} */
					var a = (dir === 2 ? -1 : 1) * /** @type {number} */(block.param[1]);
					var name = dir === 1 ? "roll" : "pitch";
					/** @type {string} */
					var cond;
					if (a <= -6) {
						cond = "angle < " + Math.round(2730.67 * a + 1365.33);
					} else if (a >= 6) {
						cond = "angle >= " + Math.round(2730.67 * a - 1365.33);
					} else {
						cond = "angle >= " + Math.round(2730.67 * a - 1365.33) +
							" && " + "angle < " + Math.round(2730.67 * a + 1365.33);
					}
					return {
						sectionBegin: "onevent acc {\n",
						sectionEnd: "}\n",
						sectionPriority: 1,
						clauseInit:
							"int angle = atan2(acc[" + (dir === 2 ? "1" : "0") + "], acc[2])\n",
						clause: cond
					};
				}
			},
			"clap": function (block) {
				return {
					initCodeExec: [
						"// setup threshold for detecting claps\n" +
						"mic.threshold = 250\n"
					],
					sectionBegin: "onevent mic {\n",
					sectionEnd: "}\n",
					sectionPriority: 1,
					clause: "mic.intensity > mic.threshold",
					clauseOptional: true
				};
			},
			"init": function (block) {
				return {
					sectionBegin: "// init block\n",
					sectionPriority: 10000
				};
			},
			"timer": function (block) {
				return {
					initCodeExec: [
						epfl.mobots.vpl.BlockTemplate.resetTimer
					],
					sectionBegin: "onevent timer0 {\n",
					sectionEnd: "}\n",
					sectionPriority: 1000
				};
			},
			"state": function (block) {
				var cond = "";
				for (var i = 0; i < 4; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " && ") +
							(block.param[i] > 0 ? "" : "!") + "state[" + i + "]";
					}
				}
				return {
					initVarDecl: [
						epfl.mobots.vpl.BlockTemplate.initStatesDecl2
					],
					initCodeExec: [
						epfl.mobots.vpl.BlockTemplate.initStatesInit2
					],
					clause: cond
				};
			},
			"counter comparison": function (block) {
					var cond = "counter " +
						(block.param[0] === 0 ? "==" : block.param[0] > 0 ? ">=" : "<=") +
						" " + block.param[1];
					return {
						initVarDecl: [
							epfl.mobots.vpl.BlockTemplate.initCounterDecl2
						],
						initCodeExec: [
							epfl.mobots.vpl.BlockTemplate.initCounterInit2
						],
						clause: cond
					};
			},
			"color state": function (block) {
				var cond = block.param
					.map(function (p, i) {
						return "topColor[" + i + "] / 11 == " + Math.floor(p * 2.99);
					})
					.join(" && ");
				return {
					initVarDecl: [
						epfl.mobots.vpl.BlockTemplate.initTopColorDecl2
					],
					initCodeExec: [
						epfl.mobots.vpl.BlockTemplate.initTopColorInit2
					],
					clause: cond
				};
			},
			"color state 8": function (block) {
				var cond = block.param
					.map(function (p, i) {
						return "topColor[" + i + "] / 11 == " + Math.floor(p * 2.99);
					})
					.join(" && ");
				return {
					initVarDecl: [
						epfl.mobots.vpl.BlockTemplate.initTopColorDecl2
					],
					initCodeExec: [
						epfl.mobots.vpl.BlockTemplate.initTopColorInit2
					],
					clause: cond
				};
			},
			"motor": function (block) {
				return {
					initCodeExec: [
						epfl.mobots.vpl.BlockTemplate.initOutputs2
					],
					statement:
						"motor.left.target = " + Math.round(500 * block.param[0]) + ";\n" +
						"motor.right.target = " + Math.round(500 * block.param[1]) + ";\n"
				};
			},
			"move": function (block) {
				/** @const */
				var sp = 100;
				/** @const */
				var spt = 15;
				return {
					initCodeExec: [
						epfl.mobots.vpl.BlockTemplate.initOutputs2
					],
					statement:
						"motor.left.target = " +
							[0, sp, -sp, sp-spt, sp+spt, -sp, sp][block.param[0]] + ";\n" +
						"motor.right.target = " +
							[0, sp, -sp, sp+spt, sp-spt, sp, -sp][block.param[0]] + ";\n"
				};
			},
			"top color": function (block) {
				return {
					initVarDecl: [
						epfl.mobots.vpl.BlockTemplate.initTopColorDecl2
					],
					initCodeExec: [
						epfl.mobots.vpl.BlockTemplate.initTopColorInit2,
						epfl.mobots.vpl.BlockTemplate.initOutputs2
					],
					statement:
						"leds.top(" +
						block.param.map(function (x) { return Math.round(32 * x); }).join(", ") +
						");\n" +
						"topColor = [" +
						block.param.map(function (x) { return Math.round(32 * x); }).join(", ") +
						"];\n"
				};
			},
			"top color 8": function (block) {
				return {
					initVarDecl: [
						epfl.mobots.vpl.BlockTemplate.initTopColorDecl2
					],
					initCodeExec: [
						epfl.mobots.vpl.BlockTemplate.initTopColorInit2,
						epfl.mobots.vpl.BlockTemplate.initOutputs2
					],
					statement:
						"leds.top(" +
						block.param.map(function (x) { return Math.round(32 * x); }).join(", ") +
						");\n" +
						"topColor = [" +
						block.param.map(function (x) { return Math.round(32 * x); }).join(", ") +
						"];\n"
				};
			},
			"bottom color": function (block) {
				return {
					initCodeExec: [
						epfl.mobots.vpl.BlockTemplate.initOutputs2
					],
					statement:
						"leds.bottom.left(" +
						block.param.map(function (x) { return Math.round(32 * x); }).join(", ") +
						");\n" +
						"leds.bottom.right(" +
						block.param.map(function (x) { return Math.round(32 * x); }).join(", ") +
						");\n"
				};
			},
			"bottom color 8": function (block) {
				return {
					initCodeExec: [
						epfl.mobots.vpl.BlockTemplate.initOutputs2
					],
					statement:
						"leds.bottom.left(" +
						block.param.map(function (x) { return Math.round(32 * x); }).join(", ") +
						");\n" +
						"leds.bottom.right(" +
						block.param.map(function (x) { return Math.round(32 * x); }).join(", ") +
						");\n"
				};
			},
			"notes": function (block) {
				/** @type {Array.<number>} */
				var notes = [];
				/** @type {Array.<number>} */
				var durations = [];
				for (var i = 0; i < 6; i++) {
					if (block.param[2 * i + 1] > 0) {
						notes.push([262, 311, 370, 440, 524, 370][/** @type {number} */(block.param[2 * i])]);
						durations.push(7 * block.param[2 * i + 1]);
					} else {
						notes.push(0);
						durations.push(28);
					}
				}
				return {
					initVarDecl: [
						"const pi = 3.14;\n",
						"// variables for notes\n" +
						"int notes[6];\n" +
						"int durations[6];\n" +
						"int note_index;\n" +
						"int wave[142];\n"
					],
					initCodeExec: [
						"// init notes\n" +
						"for (int i = 0; i < size(wave); i++) {\n" +
						"wave[i] = 128 * sin(fixed(i) / size(wave) * 2 * pi);\n" +
						"}\n" +
						"sound.wave(wave);\n" +
						"note_index = 6;\n",
						epfl.mobots.vpl.BlockTemplate.initOutputs2
					],
					initCodeDecl: [
						"// when a note is finished, play the next one\n" +
						"onevent sound.finished {\n" +
						"if (note_index < size(notes)) {\n" +
						"sound.freq(notes[note_index], durations[note_index]);\n" +
						"note_index++;\n" +
						"}\n" +
						"}\n"
					],
					statement:
						"notes = [" + notes.join(", ") + "];\n" +
						"durations = [" + durations.join(", ") + "];\n" +
						"sound.freq(notes[0], durations[0]);\n" +
						"note_index = 1;\n"
				};
			},
			"set state": function (block) {
				var code = "";
				for (var i = 0; i < 4; i++) {
					if (block.param[i]) {
						code += "state[" + i + "] = " + (block.param[i] > 0 ? "true" : "false") + ";\n";
					}
				}
				return {
					initVarDecl: [
						epfl.mobots.vpl.BlockTemplate.initStatesDecl2
					],
					init: [
						epfl.mobots.vpl.BlockTemplate.initStatesInit2
					],
					initCodeDecl: [
						epfl.mobots.vpl.BlockTemplate.dispStates2
					],
					statement: code.length > 0
						? code + "display_state();\n"
						: ""
				};
			},
			"set counter": function (block) {
				return {
					initVarDecl: [
						epfl.mobots.vpl.BlockTemplate.initCounterDecl2,
					],
					initCodeExec: [
						epfl.mobots.vpl.BlockTemplate.initCounterInit2
					],
					initCodeDecl: [
						epfl.mobots.vpl.BlockTemplate.dispCounter2
					],
					statement:
						(block.param[0] === 0 ? "counter = 0;" :
							block.param[0] > 0 ? "if (counter < 255) {\ncounter++;\n}" :
							"if (counter > 0) {\ncounter--;\n}") +
						"\n" +
						"display_counter(counter);\n"
				};
			},
			"set timer": function (block) {
				return {
					initCodeExec: [
						epfl.mobots.vpl.BlockTemplate.resetTimer2
					],
					statement: "timer.period[0] = " + Math.round(1000 * block.param[0]) + ";\n"
				};
			},
			"set timer log": function (block) {
				return {
					initCodeExec: [
						epfl.mobots.vpl.BlockTemplate.resetTimer2
					],
					statement: "timer.period[0] = " + Math.round(1000 * block.param[0]) + ";\n"
				};
			},
			"picture comment": function (block) {
				return {};
			}
		};
		for (var name in libPatchLang2) {
			if (libPatchLang2.hasOwnProperty(name)) {
				var blockTemplate = epfl.mobots.vpl.BlockTemplate.findByName(name);
				blockTemplate.genCode = libPatchLang2[name];
			}
		}
	})();

	/** Generate code for the whole program
		@param {Array.<epfl.mobots.vpl.Block>=} runBlocks if defined, override the initialization
		code
		@return {string}
	*/
	epfl.mobots.vpl.Program.prototype.generateCode = function (runBlocks) {
		var c = this.program.map(function (eh) { return eh.generateCode("&&"); });
		/** @type {Array.<string>} */
		var initVarDecl = [];
		/** @type {Array.<string>} */
		var initCodeExec = [];
		/** @type {Array.<string>} */
		var initCodeDecl = [];
		/** @dict */
		var folding = {};
			// folding[sectionBegin] = index in c fragments with same sectionBegin are folded into
		/** @type {Array.<number>} */
		var initEventIndices = [];
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
				statement = "when (" + evCode.clause + ") {\n" + statement + "}\n";
			}
			if (evCode.sectionBegin) {
	 			if (folding[evCode.sectionBegin] !== undefined) {
					// fold evCode into c[folding[evCode.sectionBegin]]
					var foldedFrag = c[folding[evCode.sectionBegin]];
					foldedFrag.statement += statement;
					evCode.statement = undefined;
				} else {
					// first fragment with that sectionBegin
					folding[evCode.sectionBegin] = i;
					evCode.statement = statement;
				}
			} else {
				// replace clauseBegin/statement/clauseEnd with statement
				evCode.statement = statement;
			}
			if (this.program[i].getEventBlockByType("init")) {
				initEventIndices.push(i);
			}
		}, this);

		// compile runBlocks
		var runBlocksCode = "";
		if (runBlocks) {
			var eh = new epfl.mobots.vpl.EventHandler();
			var initBlock = new epfl.mobots.vpl.Block(epfl.mobots.vpl.BlockTemplate.findByName("init"), null, null);
			eh.setBlock(initBlock, null, null);
			runBlocks.forEach(function (block) {
				eh.setBlock(block, null, null);
			});
			runBlocksCode = eh.generateCode().statement;
		}

		// build program from fragments:
		// init fragments (var declarations first, then code, without sub/onevent)
		var str = initVarDecl.length > 0 ? "\n" + initVarDecl.join("\n") : "";
		if (runBlocks) {
			str += "\n" + runBlocksCode;
		} else {
			var strInit = "";
			if (initCodeExec.length > 0) {
				strInit += "\n" + initCodeExec.join("\n");
			}
			// init implicit event
			for (var i = 0; i < this.program.length; i++) {
				if (initEventIndices.indexOf(i) >= 0 && c[i].statement) {
					strInit += (strInit.length > 0 ? "\n" : "") +
						(c[i].sectionBegin || "") + (c[i].statement || "") + (c[i].sectionEnd || "");
				}
			}
			if (strInit) {
				str += (str.length > 0 ? "\n" : "") + strInit.slice(1);	// skip initial linefeed
			}
		}
		// init fragments defining sub and onevent
		if (initCodeDecl.length > 0) {
			str += "\n" + initCodeDecl.join("\n");
		}
		// explicit events
		for (var i = 0; i < this.program.length; i++) {
			if (initEventIndices.indexOf(i) < 0 && c[i].statement) {
				str += "\n";
				str += (c[i].sectionBegin || "") + (c[i].statement || "") + (c[i].sectionEnd || "");
			}
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
				if (line.length > 0) {
					var preDec = line[0] === "}";
					var postInc = line.slice(-1) === "{";
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
		for (var i = 0; i < this.program.length; i++) {
			for (var j = i + 1; j < this.program.length; j++) {
				this.program[i].checkConflicts(this.program[j]);
			}
		}

		return str;
	};
};
