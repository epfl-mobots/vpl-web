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

Definition of JavaScript code generation for VPL3 blocks in array
A3a.vpl.BlockTemplate.lib.

*/

/** Patch standard blocks to generate JavaScript code
	@return {void}
*/
A3a.vpl.patchJSBlocks = function () {

	A3a.vpl.BlockTemplate.initOutputsJS =
		"this.set(\"leds.top\", [0, 0, 0]);\n";

	/** @const */
	A3a.vpl.BlockTemplate.initStatesDeclJS =
		"// variables for state\n" +
		"this.setClientState(\"state\", []);\n";

	/** @const */
	A3a.vpl.BlockTemplate.initStatesInitJS =
		"this.setClientState(\"state\", [false, false, false, false]);\n";

	/** @const */
	A3a.vpl.BlockTemplate.clauseInitStateJS =
		"var state0 = this.getClientState(\"state\");\n";

	/** @const */
	A3a.vpl.BlockTemplate.initState8DeclJS =
		"// variable for exclusive state\n" +
		"this.setClientState(\"state8\", 0);\n";

	/** @const */
	A3a.vpl.BlockTemplate.initState8InitJS =
		"this.setClientState(\"state8\", 0);\n";

	/** @const */
	A3a.vpl.BlockTemplate.clauseInitState8JS =
		"var state80 = this.getClientState(\"state8\");\n";

	/** @const */
	A3a.vpl.BlockTemplate.initCounterDeclJS =
		"// variable for counter\n" +
		"this.setClientState(\"counter\", 0);\n";

	/** @const */
	A3a.vpl.BlockTemplate.initCounterInitJS =
		"this.setClientState(\"counter\", 0);\n";

	/** @const */
	A3a.vpl.BlockTemplate.clauseInitCounterCmpJS =
		"var counter0 = this.getClientState(\"counter\");\n";

	/** @const */
	A3a.vpl.BlockTemplate.resetTimerJS =
		"// stop timer 0\n" +
		"this.setTimer(0, -1);\n";

	(function () {
		/** Convert number to string with up to 2 fractional digits
			@param {number} x
			@return {string}
		*/
		function toFixed2(x) {
			return parseFloat(x.toFixed(2)).toString();
		}

		/** @const */
		var libPatchJS = {
			"!stop": function (block) {
				return {
					statement:
						"this.set(\"motor.left\", 0);\n" +
						"this.set(\"motor.right\", 0);\n"
				};
			},
			"button": function (block) {
				var cond = "";
				for (var i = 0; i < 5; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " && ") +
							"this.get(\"button." + ["center", "forward", "backward", "right", "left"][i] +
							"\")";
					}
				}
				if (cond === "") {
					cond = ["center", "forward", "backward", "right", "left"].map(function (name) {
						return "this.get(\"button." + name + "\")";
					}).join(" && ");
				}
				return {
					sectionBegin: "this.addEventListener(\"buttons\", function (name, param) {\n",
					sectionEnd: "});\n",
					clause: cond
				};
			},
			"button 1": function (block) {
				var cond = "";
				cond += "this.get(\"button." + ["center", "forward", "backward", "right", "left"][block.param[0]] + "\")";
				return {
					sectionBegin: "this.addEventListener(\"buttons\", function (name, param) {\n",
					sectionEnd: "});\n",
					clause: cond
				};
			},
			"horiz prox": function (block) {
				var cond = "";
				for (var i = 0; i < 7; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " && ") +
							"this.get(\"prox.horizontal\")[" + [2, 1, 3, 0, 4, 5, 6][i] + "] " +
							(block.param[i] > 0 ? ">= 0.6" : "<= 0.4");
					}
				}
				if (cond === "") {
					for (var i = 0; i < 7; i++) {
						cond += " || this.get(\"prox.horizontal\")[" + [2, 1, 3, 0, 4, 5, 6][i] + "] >= 0.5";
					}
					cond = cond.slice(4);	// crop initial " && "
				}
				return {
					sectionBegin: "this.addEventListener(\"prox\", function (name, param) {\n",
					sectionEnd: "});\n",
					clause: cond
				};
			},
			"horiz prox adv": function (block) {
				var cond = "";
				for (var i = 0; i < 7; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " && ") +
							"this.get(\"prox.horizontal\")[" + [2, 1, 3, 0, 4, 5, 6][i] + "] " +
							(block.param[i] > 0
								? ">= " + toFixed2(block.param[7])
								: "<= " + toFixed2(block.param[8]));
					}
				}
				if (cond === "") {
					for (var i = 0; i < 7; i++) {
						cond += " || this.get(\"prox.horizontal\")[" + [2, 1, 3, 0, 4, 5, 6][i] + "] >= 0.5";
					}
					cond = cond.slice(4);	// crop initial " || "
				}
				return {
					sectionBegin: "this.addEventListener(\"prox\", function (name, param) {\n",
					sectionEnd: "});\n",
					clause: cond
				};
			},
			"horiz prox 1": function (block) {
				var cond = "";
				for (var i = 0; i < 7; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " && ") +
							"this.get(\"prox.horizontal\")[" + [2, 1, 3, 0, 4, 5, 6][i] + "] " +
							(block.param[i] > 0 ? ">= " : "< ") +
							toFixed2(block.param[7]);
					}
				}
				if (cond === "") {
					for (var i = 0; i < 7; i++) {
						cond += " || this.get(\"prox.horizontal\")[" + [2, 1, 3, 0, 4, 5, 6][i] + "] >= 0.5";
					}
					cond = cond.slice(4);	// crop initial " || "
				}
				return {
					sectionBegin: "this.addEventListener(\"prox\", function (name, param) {\n",
					sectionEnd: "});\n",
					clause: cond
				};
			},
			"ground": function (block) {
				var cond = "";
				for (var i = 0; i < 2; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " && ") +
							"this.get(\"prox.ground.delta\")[" + i + "] " +
							(block.param[i] > 0 ? ">= 0.6" : "<= 0.4");
					}
				}
				if (cond === "") {
					for (var i = 0; i < 2; i++) {
						cond += " || this.get(\"prox.ground.delta\")[" + i + "] >= 0.5";
					}
					cond = cond.slice(4);	// crop initial " || "
				}
				return {
					sectionBegin: "this.addEventListener(\"prox\", function (name, param) {\n",
					sectionEnd: "});\n",
					clause: cond
				};
			},
			"ground adv": function (block) {
				var cond = "";
				for (var i = 0; i < 2; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " && ") +
							"this.get(\"prox.ground.delta\")[" + i + "] " +
							(block.param[i] > 0
								? ">= " + toFixed2(block.param[2])
								: "<= " + toFixed2(block.param[3]));
					}
				}
				if (cond === "") {
					for (var i = 0; i < 2; i++) {
						cond += " || this.get(\"prox.ground.delta\")[" + i + "] >= 0.5";
					}
					cond = cond.slice(4);	// crop initial " || "
				}
				return {
					sectionBegin: "this.addEventListener(\"prox\", function (name, param) {\n",
					sectionEnd: "});\n",
					clause: cond
				};
			},
			"ground 1": function (block) {
				var cond = "";
				for (var i = 0; i < 2; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " && ") +
							"this.get(\"prox.ground.delta\")[" + i + "] " +
							(block.param[i] > 0 ? ">= " : "< ") +
							toFixed2(block.param[2]);
					}
				}
				if (cond === "") {
					for (var i = 0; i < 2; i++) {
						cond += " || this.get(\"prox.ground.delta\")[" + i + "] >= 0.5";
					}
					cond = cond.slice(4);	// crop initial " || "
				}
				return {
					sectionBegin: "this.addEventListener(\"prox\", function (name, param) {\n",
					sectionEnd: "});\n",
					clause: cond
				};
			},
			"tap": function (block) {
				return {
					sectionBegin: "this.addEventListener(\"tap\", function (name, param) {\n",
					sectionEnd: "});\n"
				};
			},
			"accelerometer": function (block) {
				var dir = /** @type {number} */(block.param[0]);
				if (dir === 0) {
					// tap
					return {
						sectionBegin: "this.addEventListener(\"tap\", function (name, param) {\n",
						sectionEnd: "});\n"
					};
				} else {
					/** @type {number} */
					var a = (dir === 2 ? -1 : 1) * /** @type {number} */(block.param[1]);
					var name = dir === 1 ? "roll" : "pitch";
					/** @type {string} */
					var cond;
					if (a <= -6) {
						cond = name + "Angle < " + toFixed2(Math.PI / 12 * (a + 0.5));
					} else if (a >= 6) {
						cond = name + "Angle >= " + toFixed2(Math.PI / 12 * (a - 0.5));
					} else {
						cond = name + "Angle >= " + toFixed2(Math.PI / 12 * (a - 0.5)) +
							" && " + name + "Angle < " + toFixed2(Math.PI / 12 * (a + 0.5));
					}
					return {
						sectionBegin: "this.addEventListener(\"acc\", function (name, param) {\n",
						sectionEnd: "});\n",
						clauseInit:
							dir === 2
								? "var pitchAngle = Math.atan2(acc[1], acc[2]);\n"
								: "var rollAngle = Math.atan2(acc[0], acc[2]);\n",
						clause: cond
					};
				}
			},
			"roll": function (block) {
				/** @type {number} */
				var a = /** @type {number} */(block.param[0]);
				return {
					sectionBegin: "this.addEventListener(\"acc\", function (name, param) {\n",
					sectionEnd: "});\n",
					clauseInit:
						"var rollAngle = Math.atan2(acc[0], acc[2]);\n",
					clause:
						"rollAngle >= " + toFixed2(Math.PI / 12 * (a - 0.5)) +
						" && rollAngle < " + toFixed2(Math.PI / 12 * (a + 0.5))
				};
			},
			"pitch": function (block) {
				/** @type {number} */
				var a = -/** @type {number} */(block.param[0]);
				return {
					sectionBegin: "this.addEventListener(\"acc\", function (name, param) {\n",
					sectionEnd: "});\n",
					clauseInit:
						"var pitchAngle = Math.atan2(acc[1], acc[2]);\n",
					clause:
						"pitchAngle >= " + toFixed2(Math.PI / 12 * (a - 0.5)) +
						" && pitchAngle < " + toFixed2(Math.PI / 12 * (a + 0.5))
				};
			},
			"yaw": function (block) {
				/** @type {number} */
				var a = /** @type {number} */(block.param[0]);
				return {
					sectionBegin: "this.addEventListener(\"acc\", function (name, param) {\n",
					sectionEnd: "});\n",
					clauseInit:
						"var yawAngle = Math.atan2(acc[0], acc[1]);\n",
					clause:
						"yawAngle >= " + toFixed2(Math.PI / 12 * (a - 0.5)) +
						" && yawAngle < " + toFixed2(Math.PI / 12 * (a + 0.5))
				};
			},
			"clap": function (block) {
				return {
					sectionBegin: "this.addEventListener(\"mic\", function (name, param) {\n",
					sectionEnd: "});\n"
				};
			},
			"init": function (block) {
				return {
					sectionBegin: "// init block\n"
				};
			},
			"timer": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.resetTimerJS
					],
					sectionBegin: "this.addEventListener(\"timer0\", function (name, param) {\n",
					sectionEnd: "});\n"
				};
			},
			"state": function (block) {
				var cond = "";
				for (var i = 0; i < 4; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " && ") +
							(block.param[i] > 0 ? "" : "!") + "state0[" + i + "]";
					}
				}
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initStatesDeclJS
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initStatesInitJS
					],
					clauseInit: A3a.vpl.BlockTemplate.clauseInitStateJS,
					clause: cond
				};
			},
			"state 8": function (block) {
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initState8DeclJS
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initState8InitJS
					],
					clauseInit: A3a.vpl.BlockTemplate.clauseInitState8JS,
					clause: "state80 == " + block.param[0].toString(10)
				};
			},
			"counter comparison": function (block) {
					var cond = "counter0 " +
						(block.param[0] === 0 ? "==" : block.param[0] > 0 ? ">=" : "<=") +
						" " + block.param[1];
					return {
						initVarDecl: [
							A3a.vpl.BlockTemplate.initCounterDeclJS
						],
						initCodeExec: [
							A3a.vpl.BlockTemplate.initCounterInitJS
						],
						clauseInit: A3a.vpl.BlockTemplate.clauseInitCounterCmpJS,
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
					clause: cond
				};
			},
			"color 8 state": function (block) {
				var cond = block.param
					.map(function (p, i) {
						return "topColor[" + i + "] / 11 == " + Math.floor(p * 2.99);
					})
					.join(" && ");
				return {
					clause: cond
				};
			},
			"motor state": function (block) {
				/** Clause for one of the motors
					@param {string} side
					@param {number} x
					@return {string}
				*/
				function clause1(side, x) {
					return x > 0 ? "this.get(\"motor." + side + "\") > 0.1"
						: x < 0 ? "this.get(\"motor." + side + "\") > 0.1"
						: "Math.abs(this.get(\"motor." + side + "\")) < 0.1";
				}

				return {
					clause:
						clause1("left", block.param[0]) + " && " +
							clause1("right", block.param[1])
				};
			},
			"motor": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsJS
					],
					statement:
						"this.set(\"motor.left\", " + toFixed2(block.param[0]) + ");\n" +
						"this.set(\"motor.right\", " + toFixed2(block.param[1]) + ");\n"
				};
			},
			"move": function (block) {
				/** @const */
				var sp = 0.2;
				/** @const */
				var spt = 0.05;
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsJS
					],
					statement:
						"this.set(\"motor.left\", " +
							toFixed2([0, sp, -sp, sp-spt, sp+spt, -sp, sp][block.param[0]]) + ");\n" +
						"this.set(\"motor.right\", " +
							toFixed2([0, sp, -sp, sp+spt, sp-spt, sp, -sp][block.param[0]]) + ");\n"
				};
			},
			"top color": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsJS
					],
					statement:
						"this.set(\"leds.top\", [" +
						block.param.map(toFixed2).join(", ") +
						"]);\n"
				};
			},
			"top color 8": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsJS
					],
					statement:
						"this.set(\"leds.top\", [" +
						['0,0,0','1,0,0','0,1,0','1,1,0','0,0,1','1,0,1','0,1,1','1,1,1'][block.param[0]] +
						"]);\n"
				};
			},
			"bottom color": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsJS
					],
					statement:
						"this.set(\"leds.bottom.left\", [" +
						block.param.map(toFixed2).join(", ") +
						"]);\n" +
						"this.set(\"leds.bottom.right\", [" +
						block.param.map(toFixed2).join(", ") +
						"]);\n"
				};
			},
			"bottom-left color": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsJS
					],
					statement:
						"this.set(\"leds.bottom.left\", [" +
						block.param.map(toFixed2).join(", ") +
						"]);\n"
				};
			},
			"bottom-right color": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsJS
					],
					statement:
						"this.set(\"leds.bottom.right\", [" +
						block.param.map(toFixed2).join(", ") +
						"]);\n"
				};
			},
			"bottom color 8": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsJS
					],
					statement:
						"this.set(\"leds.bottom.left\", [" +
						['0,0,0','1,0,0','0,1,0','1,1,0','0,0,1','1,0,1','0,1,1','1,1,1'][block.param[0]] +
						"]);\n" +
						"this.set(\"leds.bottom.right\", [" +
						['0,0,0','1,0,0','0,1,0','1,1,0','0,0,1','1,0,1','0,1,1','1,1,1'][block.param[0]] +
						"]);\n"
				};
			},
			"bottom-left color 8": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsJS
					],
					statement:
						"this.set(\"leds.bottom.left\", [" +
						['0,0,0','1,0,0','0,1,0','1,1,0','0,0,1','1,0,1','0,1,1','1,1,1'][block.param[0]] +
						"]);\n"
				};
			},
			"bottom-right color 8": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsJS
					],
					statement:
						"this.set(\"leds.bottom.right\", [" +
						['0,0,0','1,0,0','0,1,0','1,1,0','0,0,1','1,0,1','0,1,1','1,1,1'][block.param[0]] +
						"]);\n"
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
					initCodeExec: [
						"// init notes\n" +
						"this.set(\"sound\", {});\n",
						A3a.vpl.BlockTemplate.initOutputsJS
					],
					statement:
						"this.set(\"sound\", {\"f\": [" + notes.join(", ") + "], \"d\": [" + durations.join(", ") + "]});\n"
				};
			},
			"play": function (block) {
				return {
					initCodeExec: [
						"// init notes\n" +
						"this.set(\"sound\", {});\n"
					],
					statement:
						"this.set(\"sound\", {\"pcm\": " + block.param[0].toString(10) + "});\n"
				};
			},
			"play stop": function (block) {
				return {
					initCodeExec: [
						"// init notes\n" +
						"this.set(\"sound\", {});\n"
					],
					statement:
						"this.set(\"sound\", {});\n"
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
						A3a.vpl.BlockTemplate.initStatesDeclJS
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initStatesInitJS
					],
					statement: code.length > 0
						? "var state = this.getClientState(\"state\");\n" +
							code +
							"this.setClientState(\"state\", state);\n" +
							"this.set(\"leds.circle\", [0,state[1]?1:0,0,state[3]?1:0,0,state[2]?1:0,0,state[0]?1:0]);\n"
						: ""
				};
			},
			"toggle state": function (block) {
				var code = "";
				for (var i = 0; i < 4; i++) {
					if (block.param[i]) {
						code += "state[" + i + "] = !state[" + i + "];\n";
					}
				}
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initStatesDeclJS
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initStatesInitJS
					],
					statement: code.length > 0
						? "var state = this.getClientState(\"state\");\n" +
							code +
							"this.setClientState(\"state\", state);\n" +
							"this.set(\"leds.circle\", [0,state[1]?1:0,0,state[3]?1:0,0,state[2]?1:0,0,state[0]?1:0]);\n"
						: ""
				};
			},
			"set state 8": function (block) {
				var v = block.param[0];
				var a = [];
				for (var i = 0; i < 8; i++) {
					a.push(v === i);
				}
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initState8DeclJS
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initState8InitJS
					],
					statement:
						"this.setClientState(\"state8\", " + v.toString(10) + ");\n" +
						"this.set(\"leds.circle\", [" + a.join(", ") + "]);\n",
					statementWithoutInit:
						"this.set(\"leds.circle\", [" + a.join(", ") + "]);\n"
				};
			},
			"change state 8": function (block) {
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initState8DeclJS
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initState8InitJS
					],
					statement: "var state8 = (this.getClientState(\"state8\") + " +
							(block.param[0] > 0 ? "1" : "7") +
							") % 8;\n" +
							"this.setClientState(\"state8\", state8);\n" +
							"this.set(\"leds.circle\", [state8==0?1:0, state8==1?1:0, state8==2?1:0, state8==3?1:0, " +
								"state8==4?1:0, state8==5?1:0, state8==6?1:0, state8==7?1:0]);\n",
					statementWithoutInit:
						"this.set(\"leds.circle\", [" + (block.param[0] === 0 ? "1" : "0") +
							"," + (block.param[0] === 1 ? "1" : "0") +
							"," + (block.param[0] === 2 ? "1" : "0") +
							"," + (block.param[0] === 3 ? "1" : "0") +
							"," + (block.param[0] === 4 ? "1" : "0") +
							"," + (block.param[0] === 5 ? "1" : "0") +
							"," + (block.param[0] === 6 ? "1" : "0") +
							"," + (block.param[0] === 7 ? "1" : "0") +
							"]);\n"
				};
			},
			"set counter": function (block) {
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initCounterDeclJS
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initCounterInitJS
					],
					statement:
						"var counter = " +
							(block.param[0] === 0 ? "0" :
								block.param[0] > 0
									? "Math.min(this.getClientState(\"counter\") + 1, 255)"
									: "Math.max(this.getClientState(\"counter\") - 1, 0)") +
						";\n" +
						"this.setClientState(\"counter\", counter);\n" +
						"this.set(\"leds.circle\", [counter&1?1:0,counter&2?1:0,counter&4?1:0,counter&8?1:0,\n" +
						"counter&16?1:0,counter&32?1:0,counter&64?1:0,counter&128?1:0]);\n"
				};
			},
			"set timer": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.resetTimerJS
					],
					statement: "this.setTimer(0, " + block.param[0].toFixed(3) + ");\n"
				};
			},
			"set timer log": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.resetTimerJS
					],
					statement: "this.setTimer(0, " + block.param[0].toFixed(3) + ");\n"
				};
			},
			"picture comment": function (block) {
				return {};
			}
		};
		for (var name in libPatchJS) {
			if (libPatchJS.hasOwnProperty(name)) {
				var blockTemplate = A3a.vpl.BlockTemplate.findByName(name);
				if (blockTemplate) {
					blockTemplate.genCode["js"] = libPatchJS[name];
				}
			}
		}
	})();
};
