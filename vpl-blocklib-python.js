/*
	Copyright 2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Patch standard blocks to generate Python code
	@return {void}
*/
A3a.vpl.patchPythonBlocks = function () {

	A3a.vpl.BlockTemplate.initOutputsPython =
		"self.set(\"leds.top\", [0, 0, 0])\n";

	/** @const */
	A3a.vpl.BlockTemplate.initStatesDeclPython =
		"# variables for state\n" +
		"self.setClientState(\"state\", [])\n";

	/** @const */
	A3a.vpl.BlockTemplate.initStatesInitPython =
		"self.setClientState(\"state\", [False, False, False, False])\n";

	/** @const */
	A3a.vpl.BlockTemplate.clauseInitStatePython =
		"state0 = self.getClientState(\"state\")\n";

	/** @const */
	A3a.vpl.BlockTemplate.initState8DeclPython =
		"# variable for exclusive state\n" +
		"self.setClientState(\"state8\", 0)\n";

	/** @const */
	A3a.vpl.BlockTemplate.initState8InitPython =
		"self.setClientState(\"state8\", 0)\n";

	/** @const */
	A3a.vpl.BlockTemplate.clauseInitState8Python =
		"state80 = self.getClientState(\"state8\")\n";

	/** @const */
	A3a.vpl.BlockTemplate.initCounterDeclPython =
		"# variable for counter\n" +
		"self.setClientState(\"counter\", 0)\n";

	/** @const */
	A3a.vpl.BlockTemplate.initCounterInitPython =
		"self.setClientState(\"counter\", 0)\n";

	/** @const */
	A3a.vpl.BlockTemplate.clauseInitCounterCmpPython =
		"counter0 = self.getClientState(\"counter\")\n";

	/** @const */
	A3a.vpl.BlockTemplate.resetTimerPython =
		"# stop timer 0\n" +
		"self.setTimer(0, -1)\n";

	(function () {
		/** Convert number to string with up to 2 fractional digits
			@param {number} x
			@return {string}
		*/
		function toFixed2(x) {
			return parseFloat(x.toFixed(2)).toString();
		}

		/** @const */
		var libPatchPython = {
			"!stop": function (block) {
				return {
					statement:
						"self.set(\"motor.left\", 0)\n" +
						"self.set(\"motor.right\", 0)\n"
				};
			},
			"button": function (block) {
				var cond = "";
				for (var i = 0; i < 5; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " and ") +
							"self.get(\"button." + ["center", "forward", "backward", "right", "left"][i] + "\")";
					}
				}
				if (cond === "") {
					cond = "self.get(\"button.center\") || self.get(\"button.forward\") || self.get(\"button.backward\") || self.get(\"button.right\") || self.get(\"button.left\")";
				}
				return {
					sectionBegin: "def event_buttons(self):\n",
					sectionEnd: "<\n",
					sectionPriority: 10,
					clause: cond
				};
			},
			"horiz prox": function (block) {
				var cond = "";
				for (var i = 0; i < 7; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " and ") +
							"self.get(\"prox.horizontal\")[" + [2, 1, 3, 0, 4, 5, 6][i] + "] " +
							(block.param[i] > 0 ? ">= 0.6" : "<= 0.4");
					}
				}
				if (cond === "") {
					for (var i = 0; i < 7; i++) {
						cond += " || self.get(\"prox.horizontal\")[" + [2, 1, 3, 0, 4, 5, 6][i] + "] >= 0.5";
					}
					cond = cond.slice(5);	// crop initial " and "
				}
				return {
					sectionBegin: "def event_prox(self):\n",
					sectionEnd: "<\n",
					sectionPriority: 1,
					clause: cond
				};
			},
			"horiz prox adv": function (block) {
				var cond = "";
				for (var i = 0; i < 7; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " and ") +
							"self.get(\"prox.horizontal\")[" + [2, 1, 3, 0, 4, 5, 6][i] + "] " +
							(block.param[i] > 0
								? ">= " + toFixed2(block.param[7])
								: "<= " + toFixed2(block.param[8]));
					}
				}
				if (cond === "") {
					for (var i = 0; i < 7; i++) {
						cond += " || self.get(\"prox.horizontal\")[" + [2, 1, 3, 0, 4, 5, 6][i] + "] >= 0.5";
					}
					cond = cond.slice(4);	// crop initial " || "
				}
				return {
					sectionBegin: "def event_prox(self):\n",
					sectionEnd: "<\n",
					sectionPriority: 1,
					clause: cond
				};
			},
			"horiz prox 1": function (block) {
				var cond = "";
				for (var i = 0; i < 7; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " and ") +
							"self.get(\"prox.horizontal\")[" + [2, 1, 3, 0, 4, 5, 6][i] + "] " +
							(block.param[i] > 0 ? ">= " : "< ") +
							toFixed2(block.param[7]);
					}
				}
				if (cond === "") {
					for (var i = 0; i < 7; i++) {
						cond += " or self.get(\"prox.horizontal\")[" + [2, 1, 3, 0, 4, 5, 6][i] + "] >= 0.5";
					}
					cond = cond.slice(4);	// crop initial " or "
				}
				return {
					sectionBegin: "def event_prox(self):\n",
					sectionEnd: "<\n",
					sectionPriority: 1,
					clause: cond
				};
			},
			"ground": function (block) {
				var cond = "";
				for (var i = 0; i < 2; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " and ") +
							"self.get(\"prox.ground.delta\")[" + i + "] " +
							(block.param[i] > 0 ? ">= 0.6" : "<= 0.4");
					}
				}
				if (cond === "") {
					for (var i = 0; i < 2; i++) {
						cond += " or self.get(\"prox.ground.delta\")[" + i + "] >= 0.5";
					}
					cond = cond.slice(4);	// crop initial " or "
				}
				return {
					sectionBegin: "def event_prox(self):\n",
					sectionEnd: "<\n",
					sectionPriority: 1,
					clause: cond
				};
			},
			"ground adv": function (block) {
				var cond = "";
				for (var i = 0; i < 2; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " and ") +
							"self.get(\"prox.ground.delta\")[" + i + "] " +
							(block.param[i] > 0
								? ">= " + toFixed2(block.param[2])
								: "<= " + toFixed2(block.param[3]));
					}
				}
				if (cond === "") {
					for (var i = 0; i < 2; i++) {
						cond += " or self.get(\"prox.ground.delta\")[" + i + "] >= 0.5";
					}
					cond = cond.slice(4);	// crop initial " or "
				}
				return {
					sectionBegin: "def event_prox(self):\n",
					sectionEnd: "<\n",
					sectionPriority: 1,
					clause: cond
				};
			},
			"ground 1": function (block) {
				var cond = "";
				for (var i = 0; i < 2; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " and ") +
							"self.get(\"prox.ground.delta\")[" + i + "] " +
							(block.param[i] > 0 ? ">= " : "< ") +
							toFixed2(block.param[2]);
					}
				}
				if (cond === "") {
					for (var i = 0; i < 2; i++) {
						cond += " or self.get(\"prox.ground.delta\")[" + i + "] >= 0.5";
					}
					cond = cond.slice(4);	// crop initial " or "
				}
				return {
					sectionBegin: "def event_prox(self):\n",
					sectionEnd: "<\n",
					sectionPriority: 1,
					clause: cond
				};
			},
			"tap": function (block) {
				return {
					sectionBegin: "def event_tap(self):\n",
					sectionEnd: "<\n",
					sectionPriority: 1000
				};
			},
			"accelerometer": function (block) {
				var dir = /** @type {number} */(block.param[0]);
				if (dir === 0) {
					// tap
					return {
						sectionBegin: "def event_tap(self):\n",
						sectionEnd: "<\n",
						sectionPriority: 1000
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
							" and " + name + "Angle < " + toFixed2(Math.PI / 12 * (a + 0.5));
					}
					return {
						sectionBegin: "def event_acc(self):\n",
						sectionEnd: "<\n",
						sectionPriority: 1,
						clauseInit:
							dir === 2
								? "pitchAngle = math.atan2(acc[1], acc[2])\n"
								: "rollAngle = math.atan2(acc[0], acc[2])\n",
						clause: cond
					};
				}
			},
			"roll": function (block) {
				/** @type {number} */
				var a = /** @type {number} */(block.param[0]);
				return {
					sectionBegin: "def event_acc(self):\n",
					sectionEnd: "<\n",
					sectionPriority: 1,
					clauseInit:
						"rollAngle = math.atan2(acc[0], acc[2])\n",
					clause:
						"rollAngle >= " + toFixed2(Math.PI / 12 * (a - 0.5)) +
						" and rollAngle < " + toFixed2(Math.PI / 12 * (a + 0.5))
				};
			},
			"pitch": function (block) {
				/** @type {number} */
				var a = -/** @type {number} */(block.param[0]);
				return {
					sectionBegin: "def event_acc(self):\n",
					sectionEnd: "<\n",
					sectionPriority: 1,
					clauseInit:
						"pitchAngle = math.atan2(acc[1], acc[2])\n",
					clause:
						"pitchAngle >= " + toFixed2(Math.PI / 12 * (a - 0.5)) +
						" and pitchAngle < " + toFixed2(Math.PI / 12 * (a + 0.5))
				};
			},
			"yaw": function (block) {
				/** @type {number} */
				var a = /** @type {number} */(block.param[0]);
				return {
					sectionBegin: "def event_acc(self):\n",
					sectionEnd: "<\n",
					sectionPriority: 1,
					clauseInit:
						"yawAngle = math.atan2(acc[0], acc[1])\n",
					clause:
						"yawAngle >= " + toFixed2(Math.PI / 12 * (a - 0.5)) +
						" and yawAngle < " + toFixed2(Math.PI / 12 * (a + 0.5))
				};
			},
			"clap": function (block) {
				return {
					sectionBegin: "def event_mic(self):\n",
					sectionEnd: "<\n",
					sectionPriority: 1
				};
			},
			"init": function (block) {
				return {
					sectionBegin: "# init block\n",
					sectionPriority: 10000
				};
			},
			"timer": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.resetTimerPython
					],
					sectionBegin: "def event_timer0(self):\n",
					sectionEnd: "<\n",
					sectionPriority: 1000
				};
			},
			"state": function (block) {
				var cond = "";
				for (var i = 0; i < 4; i++) {
					if (block.param[i]) {
						cond += (cond.length === 0 ? "" : " and ") +
							(block.param[i] > 0 ? "" : "!") + "state0[" + i + "]";
					}
				}
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initStatesDeclPython
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initStatesInitPython
					],
					clauseInit: A3a.vpl.BlockTemplate.clauseInitStatePython,
					clause: cond
				};
			},
			"state 8": function (block) {
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initState8DeclPython
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initState8InitPython
					],
					clauseInit: A3a.vpl.BlockTemplate.clauseInitState8Python,
					clause: "state80 == " + block.param[0].toString(10)
				};
			},
			"counter comparison": function (block) {
					var cond = "counter0 " +
						(block.param[0] === 0 ? "==" : block.param[0] > 0 ? ">=" : "<=") +
						" " + block.param[1];
					return {
						initVarDecl: [
							A3a.vpl.BlockTemplate.initCounterDeclPython
						],
						initCodeExec: [
							A3a.vpl.BlockTemplate.initCounterInitPython
						],
						clauseInit: A3a.vpl.BlockTemplate.clauseInitCounterCmpPython,
						clause: cond
					};
			},
			"color state": function (block) {
				var cond = block.param
					.map(function (p, i) {
						return "topColor[" + i + "] / 11 == " + Math.floor(p * 2.99);
					})
					.join(" and ");
				return {
					clause: cond
				};
			},
			"color state 8": function (block) {
				var cond = block.param
					.map(function (p, i) {
						return "topColor[" + i + "] / 11 == " + Math.floor(p * 2.99);
					})
					.join(" and ");
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
					return x > 0 ? "self.get(\"motor." + side + "\") > 0.1"
						: x < 0 ? "self.get(\"motor." + side + "\") > 0.1"
						: "abs(self.get(\"motor." + side + "\")) < 0.1";
				}

				return {
					clause:
						clause1("left", block.param[0]) + " and " +
							clause1("right", block.param[1])
				};
			},
			"motor": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsPython
					],
					statement:
						"self.set(\"motor.left\", " + toFixed2(block.param[0]) + ")\n" +
						"self.set(\"motor.right\", " + toFixed2(block.param[1]) + ")\n"
				};
			},
			"move": function (block) {
				/** @const */
				var sp = 0.2;
				/** @const */
				var spt = 0.05;
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsPython
					],
					statement:
						"self.set(\"motor.left\", " +
							toFixed2([0, sp, -sp, sp-spt, sp+spt, -sp, sp][block.param[0]]) + ")\n" +
						"self.set(\"motor.right\", " +
							toFixed2([0, sp, -sp, sp+spt, sp-spt, sp, -sp][block.param[0]]) + ")\n"
				};
			},
			"top color": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsPython
					],
					statement:
						"self.set(\"leds.top\", [" +
						block.param.map(toFixed2).join(", ") +
						"])\n"
				};
			},
			"top color 8": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsPython
					],
					statement:
						"self.set(\"leds.top\", [" +
						block.param.map(function (x) { return x.toString(10); }).join(", ") +
						"])\n"
				};
			},
			"bottom color": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsPython
					],
					statement:
						"self.set(\"leds.bottom.left\", [" +
						block.param.map(toFixed2).join(", ") +
						"])\n" +
						"self.set(\"leds.bottom.right\", [" +
						block.param.map(toFixed2).join(", ") +
						"])\n"
				};
			},
			"bottom-left color": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsPython
					],
					statement:
						"self.set(\"leds.bottom.left\", [" +
						block.param.map(toFixed2).join(", ") +
						"])\n"
				};
			},
			"bottom-right color": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsPython
					],
					statement:
						"self.set(\"leds.bottom.right\", [" +
						block.param.map(toFixed2).join(", ") +
						"])\n"
				};
			},
			"bottom color 8": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsPython
					],
					statement:
						"self.set(\"leds.bottom.left\", [" +
						block.param.map(function (x) { return x.toString(10); }).join(", ") +
						"])\n" +
						"self.set(\"leds.bottom.right\", [" +
						block.param.map(function (x) { return x.toString(10); }).join(", ") +
						"])\n"
				};
			},
			"bottom-left color 8": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsPython
					],
					statement:
						"self.set(\"leds.bottom.left\", [" +
						block.param.map(function (x) { return x.toString(10); }).join(", ") +
						"])\n"
				};
			},
			"bottom-right color 8": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.initOutputsPython
					],
					statement:
						"self.set(\"leds.bottom.right\", [" +
						block.param.map(function (x) { return x.toString(10); }).join(", ") +
						"])\n"
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
						"# init notes\n" +
						"self.set(\"sound\", {})\n",
						A3a.vpl.BlockTemplate.initOutputsPython
					],
					statement:
						"self.set(\"sound\", {\"f\": [" + notes.join(", ") + "], \"d\": [" + durations.join(", ") + "]})\n"
				};
			},
			"set state": function (block) {
				var code = "";
				for (var i = 0; i < 4; i++) {
					if (block.param[i]) {
						code += "state[" + i + "] = " + (block.param[i] > 0 ? "true" : "false") + "\n";
					}
				}
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initStatesDeclPython
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initStatesInitPython
					],
					statement: code.length > 0
						? "state = self.getClientState(\"state\")\n" +
							code +
							"self.setClientState(\"state\", state)\n" +
							"self.set(\"leds.circle\", [0, 1 if state[1] else 0, 0, 1 if state[3] else 0, 0, 1 if state[2] else 0, 0, 1 if state[0] else 0])\n"
						: ""
				};
			},
			"toggle state": function (block) {
				var code = "";
				for (var i = 0; i < 4; i++) {
					if (block.param[i]) {
						code += "state[" + i + "] = !state[" + i + "]\n";
					}
				}
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initStatesDeclPython
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initStatesInitPython
					],
					statement: code.length > 0
						? "state = self.getClientState(\"state\")\n" +
							code +
							"self.setClientState(\"state\", state)\n" +
							"self.set(\"leds.circle\", [0, 1 if state[1] else 0, 0, 1 if state[3] else 0, 0, 1 if state[2] else 0, 0, 1 if state[0] else 0])\n"
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
						A3a.vpl.BlockTemplate.initState8DeclPython
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initState8InitPython
					],
					statement:
						"self.setClientState(\"state8\", " + v.toString(10) + ")\n" +
						"self.set(\"leds.circle\", [" + a.join(", ") + "])\n",
					statementWithoutInit:
						"self.set(\"leds.circle\", [" + a.join(", ") + "])\n"
				};
			},
			"change state 8": function (block) {
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initState8DeclPython
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initState8InitPython
					],
					statement: "state8 = (self.getClientState(\"state8\") + " +
							(block.param[0] > 0 ? "1" : "7") +
							") % 8\n" +
							"self.setClientState(\"state8\", state8)\n" +
							"self.set(\"leds.circle\", [1 if state8 == 0 else 0, 1 if state8 == 1 else 0, 1 if state8 == 2 else 0, 1 if state8 == 3 else 0, " +
								"1 if state8 == 4 else 0, 1 if state8 == 5 else 0, 1 if state8 == 6 else 0, 1 if state8 == 7 else 0])\n",
					statementWithoutInit:
						"self.set(\"leds.circle\", [" + (block.param[0] === 0 ? "1" : "0") +
							"," + (block.param[0] === 1 ? "1" : "0") +
							"," + (block.param[0] === 2 ? "1" : "0") +
							"," + (block.param[0] === 3 ? "1" : "0") +
							"," + (block.param[0] === 4 ? "1" : "0") +
							"," + (block.param[0] === 5 ? "1" : "0") +
							"," + (block.param[0] === 6 ? "1" : "0") +
							"," + (block.param[0] === 7 ? "1" : "0") +
							"])\n"
				};
			},
			"set counter": function (block) {
				return {
					initVarDecl: [
						A3a.vpl.BlockTemplate.initCounterDeclPython
					],
					initCodeExec: [
						A3a.vpl.BlockTemplate.initCounterInitPython
					],
					statement:
						"counter = " +
							(block.param[0] === 0 ? "0" :
								block.param[0] > 0
									? "min(self.getClientState(\"counter\") + 1, 255)"
									: "max(self.getClientState(\"counter\") - 1, 0)") +
						"\n" +
						"self.setClientState(\"counter\", counter)\n" +
						"self.set(\"leds.circle\", [1 if counter & 1 else 0, 1 if counter & 2 else 0, 1 if counter & 4 else 0, 1 if counter & 8 else 0, " +
						"1 if counter & 16 else 0, 1 if counter & 32 else 0, 1 if counter & 64 else 0, 1 if counter & 128 else 0])\n"
				};
			},
			"set timer": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.resetTimerPython
					],
					statement: "self.setTimer(0, " + block.param[0].toFixed(3) + ")\n"
				};
			},
			"set timer log": function (block) {
				return {
					initCodeExec: [
						A3a.vpl.BlockTemplate.resetTimerPython
					],
					statement: "self.setTimer(0, " + block.param[0].toFixed(3) + ")\n"
				};
			},
			"picture comment": function (block) {
				return {};
			}
		};
		for (var name in libPatchPython) {
			if (libPatchPython.hasOwnProperty(name)) {
				var blockTemplate = A3a.vpl.BlockTemplate.findByName(name);
				if (blockTemplate) {
					blockTemplate.genCode["python"] = libPatchPython[name];
				}
			}
		}
	})();
};
