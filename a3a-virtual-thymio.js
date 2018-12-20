/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

/** Virtual Thymio device
	@constructor
	@extends {A3a.Device}
	@param {number=} nodeId
 */
A3a.Device.VirtualThymio = function (nodeId) {
	/** Convert integer to [0,65535], then to signed integer
		@param {number} n 16-bit unsigned word
		@return {number}
	*/
	function toSigned16(n) {
		n &= 0xffff;
		return n >= 0x8000 ? n - 0x10000 : n;
	}

	A3a.Device.call(this,
		{
			nodeId: nodeId,
			variables: [
				{name: "_id", val: [0]},
				{name: "event.source", val: [0]},
				{name: "event.args", val: [
					0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
					0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
				]},
				{name: "_fwversion", val: [0, 0]},
				{name: "_productId", val: [0]},
				{name: "buttons._raw", val: [0, 0, 0, 0, 0]},
				{name: "button.backward", val: [0]},
				{name: "button.left", val: [0]},
				{name: "button.center", val: [0]},
				{name: "button.forward", val: [0]},
				{name: "button.right", val: [0]},
				{name: "buttons._mean", val: [0, 0, 0, 0, 0]},
				{name: "buttons._noise", val: [0, 0, 0, 0, 0]},
				{name: "prox.horizontal", val: [0, 0, 0, 0, 0, 0, 0]},
				{name: "prox.comm.rx._payloads", val: [0, 0, 0, 0, 0, 0, 0]},
				{name: "prox.comm.rx._intensities", val: [0, 0, 0, 0, 0, 0, 0]},
				{name: "prox.comm.rx", val: [0]},
				{name: "prox.comm.tx", val: [0]},
				{name: "prox.ground.ambiant", val: [0, 0]},
				{name: "prox.ground.reflected", val: [0, 0]},
				{name: "prox.ground.delta", val: [0, 0]},
				{name: "motor.left.target", val: [0]},
				{name: "motor.right.target", val: [0]},
				{name: "_vbat", val: [0]},
				{name: "_imot", val: [0]},
				{name: "motor.left.speed", val: [0]},
				{name: "motor.right.speed", val: [0]},
				{name: "motor.left.pwm", val: [0]},
				{name: "motor.right.pwm", val: [0]},
				{name: "acc", val: [0, 0, 0]},
				{name: "temperature", val: [0]},
				{name: "rc5.address", val: [0]},
				{name: "rc5.command", val: [0]},
				{name: "mic.intensity", val: [0]},
				{name: "mic.threshold", val: [0]},
				{name: "mic._mean", val: [0]},
				{name: "timer.period", val: [0, 0]},
				{name: "acc._tap", val: [0]},
				{name: "sd.present", val: [0]}
			],
			localEvents: [
				// see aseba-target-thymio2 skel-usb-user.c
				{name: "button.backward", description: "Backward button state changed"},
				{name: "button.left", description: "Left button state changed"},
				{name: "button.center", description: "Center button state changed"},
				{name: "button.forward", description: "Forward button state changed"},
				{name: "button.right", description: "Right button state changed"},
				{name: "buttons", description: "Buttons values updated"},
				{name: "prox", description: "Proximity values updated"},
				{name: "prox.comm", description: "Data received on the proximity communication"},
				{name: "tap", description: "Tap detected"},
				{name: "acc", description: "Accelerometer values updated"},
				{name: "mic", description: "Microphone above threshold"},
				{name: "sound.finished", description: "Sound playback finished"},
				{name: "temperature", description: "Temperature value updated"},
				{name: "rc5", description: "RC5 message received"},
				{name: "motor", description: "Motor timer"},
				{name: "timer0", description: "Timer 0"},
				{name: "timer1", description: "Timer 1"}
			],
			nativeFunctions: [
				{
					name: "_system_reboot",
					params: [
					],
					fun: function () {}
				},
				{
					name: "_system_settings_read",
					params: [
					],
					fun: function () {}
				},
				{
					name: "_system_settings_write",
					params: [
					],
					fun: function () {}
				},
				{
					name: "_system_settings_flash",
					params: [
					],
					fun: function () {}
				},
				{
					name: "math.copy",
					params: [
					],
					fun: function (device, args) {
						for (var i = 0; i < args[0].length; i++) {
							args[0][i] = args[1][i];
						}
					}
				},
				{
					name: "math.fill",
					params: [
					],
					fun: function (device, args) {
						for (var i = 0; i < args[0].length; i++) {
							args[0][i] = args[1][0];
						}
					}
				},
				{
					name: "math.addscalar",
					params: [
						{
							name: "r",
							size: -1
						},
						{
							name: "a",
							size: -1
						},
						{
							name: "b",
							size: 1
						}
					],
					fun: function (device, args) {
						for (var i = 0; i < args[0].length; i++) {
							args[0][i] = toSigned16(args[1][i] + args[2][0]);
						}
					}
				},
				{
					name: "math.add",
					params: [
						{
							name: "r",
							size: -1
						},
						{
							name: "a",
							size: -1
						},
						{
							name: "b",
							size: -1
						}
					],
					fun: function (device, args) {
						for (var i = 0; i < args[0].length; i++) {
							args[0][i] = toSigned16(args[1][i] + args[2][i]);
						}
					}
				},
				{
					name: "math.sub",
					params: [
						{
							name: "r",
							size: -1
						},
						{
							name: "a",
							size: -1
						},
						{
							name: "b",
							size: -1
						}
					],
					fun: function (device, args) {
						for (var i = 0; i < args[0].length; i++) {
							args[0][i] = toSigned16(args[1][i] - args[2][i]);
						}
					}
				},
				{
					name: "math.mul",
					params: [
						{
							name: "r",
							size: -1
						},
						{
							name: "a",
							size: -1
						},
						{
							name: "b",
							size: -1
						}
					],
					fun: function (device, args) {
						for (var i = 0; i < args[0].length; i++) {
							args[0][i] = toSigned16(args[1][i] * args[2][i]);
						}
					}
				},
				{
					name: "math.div",
					params: [
						{
							name: "r",
							size: -1
						},
						{
							name: "a",
							size: -1
						},
						{
							name: "b",
							size: -1
						}
					],
					fun: function (device, args) {
						for (var i = 0; i < args[0].length; i++) {
							args[0][i] = toSigned16(Math.trunc(args[1][i] / args[2][i]));
						}
					}
				},
				{
					name: "math.min",
					params: [
						{
							name: "r",
							size: -1
						},
						{
							name: "a",
							size: -1
						},
						{
							name: "b",
							size: -1
						}
					],
					fun: function (device, args) {
						for (var i = 0; i < args[0].length; i++) {
							args[0][i] = Math.min(args[1][i], args[2][i]);
						}
					}
				},
				{
					name: "math.max",
					params: [
						{
							name: "r",
							size: -1
						},
						{
							name: "a",
							size: -1
						},
						{
							name: "b",
							size: -1
						}
					],
					fun: function (device, args) {
						for (var i = 0; i < args[0].length; i++) {
							args[0][i] = Math.max(args[1][i], args[2][i]);
						}
					}
				},
				{
					name: "math.clamp",
					params: [
						{
							name: "r",
							size: -1
						},
						{
							name: "x",
							size: -1
						},
						{
							name: "low",
							size: -1
						},
						{
							name: "high",
							size: -1
						}
					],
					fun: function (device, args) {
						for (var i = 0; i < args[0].length; i++) {
							args[0][i] = Math.min(Math.max(args[1][i], args[2][i]), args[3][i]);
						}
					}
				},
				{
					name: "math.dot",
					params: [
						{
							name: "r",
							size: -1
						},
						{
							name: "a",
							size: -1
						},
						{
							name: "b",
							size: -1
						},
						{
							name: "shift",
							size: 1
						}
					],
					fun: function (device, args) {
						var d = 0;
						for (var i = 0; i < args[0].length; i++) {
							d += args[1][i] * args[2][i];
						}
						args[0][0] = d / Math.pow(2, args[3][0]);
					}
				},
				{
					name: "math.stat",
					params: [
						{
							name: "x",
							size: -1
						},
						{
							name: "min",
							size: 1
						},
						{
							name: "max",
							size: 1
						},
						{
							name: "mean",
							size: 1
						}
					],
					fun: function (device, args) {
						var s = 0;
						args[1][0] = 0x7fff;
						args[2][0] = -0x8000;
						for (var i = 0; i < args[0].length; i++) {
							args[1][0] = Math.min(args[1][0], args[0][i]);
							args[2][0] = Math.max(args[2][0], args[0][i]);
							s += args[0][i];
						}
						args[3][0] = s / args[0].length;
					}
				},
				{
					name: "math.argbounds",
					params: [
						{
							name: "x",
							size: -1
						},
						{
							name: "argmin",
							size: 1
						},
						{
							name: "argmax",
							size: 1
						}
					],
					fun: function (device, args) {
						var mx = -Infinity;
						var mn = Infinity;
						for (var i = 0; i < args[0].length; i++) {
							if (args[0][i] < mn) {
								mn = args[0][i];
								args[1][0] = i;
							}
							if (args[0][i] > mx) {
								mx = args[0][i];
								args[2][0] = i;
							}
						}
					}
				},
				{
					name: "math.sort",
					params: [
						{
							name: "x",
							size: -1
						}
					],
					fun: function (device, args) {
						args[0].sort(function (a, b) { return a - b; });
					}
				},
				{
					name: "math.muldiv",
					params: [
						{
							name: "r",
							size: -1
						},
						{
							name: "a",
							size: -1
						},
						{
							name: "b",
							size: -1
						},
						{
							name: "c",
							size: -1
						}
					],
					fun: function (device, args) {
						for (var i = 0; i < args[0].length; i++) {
							args[0][i] = toSigned16(args[1][i] * args[2][i] / args[3][i]);
						}
					}
				},
				{
					name: "math.atan2",
					description: "Atan2",
					params: [
						{name: "r", size: -1},
						{name: "y", size: -1},
						{name: "x", size: -1},
					],
					fun: function (device, args) {
						args[2].forEach(function (x, i) {
							args[0][i] = Math.round(Math.atan2(args[1][i], x) * 32767 / Math.PI);
						});
					}
				},
				{
					name: "math.sin",
					description: "Sine",
					params: [
						{name: "r", size: -1},
						{name: "theta", size: -1}
					],
					fun: function (device, args) {
						args[1].forEach(function (x, i) {
							args[0][i] = Math.round(Math.sin(x * Math.PI / 32768) * 32767);
						});
					}
				},
				{
					name: "math.cos",
					description: "Cosine",
					params: [
						{name: "r", size: -1},
						{name: "theta", size: -1}
					],
					fun: function (device, args) {
						args[1].forEach(function (x, i) {
							args[0][i] = Math.round(Math.cos(x * Math.PI / 32768) * 32767);
						});
					}
				},
				{
					name: "math.rot2",
					params: [
						{name: "r", size: 2},
						{name: "v", size: 2},
						{name: "theta", size: 1}
					],
				},
				{
					name: "math.sqrt",
					description: "Square root",
					params: [
						{name: "r", size: -1},
						{name: "x", size: -1}
					],
					fun: function (device, args) {
						args[1].forEach(function (x, i) {
							args[0][i] = x > 0 ? Math.floor(Math.sqrt(x)) : 0;
						});
					}
				},
				{
					name: "math.rand",
					description: "Pseudo-random number",
					params: [
						{name: "r", size: -1},
					],
					fun: function (device, args) {
						for (var i = 0; i < args[0].length; i++) {
							args[0][i] = Math.floor(65535.9999 * Math.random()) - 32768;
						}
					}
				},
				/*
				{
					name: "deque.size",
				},
				{
					name: "deque.get",
				},
				{
					name: "deque.set",
				},
				{
					name: "deque.insert",
				},
				{
					name: "deque.erase",
				},
				{
					name: "deque.pushfront",
				},
				{
					name: "deque.pushback",
				},
				{
					name: "deque.popfront",
				},
				{
					name: "deque.popback",
				},
				*/
				{
					name: "_leds.set",
					params: [
						{ name: "led", size: 1 },
						{ name: "br", size: 1 }
					],
					fun: function () {}
				},
				{
					name: "sound.record",
					params: [
						{
							name: "n",
							size: 1
						}
					],
					fun: function () {}
				},
				{
					name: "sound.play",
					params: [
						{
							name: "n",
							size: 1
						}
					],
					fun: function () {}
				},
				{
					name: "sound.replay",
					params: [
						{
							name: "n",
							size: 1
						}
					],
					fun: function () {}
				},
				{
					name: "sound.system",
					description: "Start playing system sound",
					params: [
						{
							name: "n",
							size: 1
						}
					],
					fun: function () {}
				},
				{
					name: "leds.circle",
					description: "Set circular leds",
					params: [
						{name: "l0", size: 1},
						{name: "l1", size: 1},
						{name: "l2", size: 1},
						{name: "l3", size: 1},
						{name: "l4", size: 1},
						{name: "l5", size: 1},
						{name: "l6", size: 1},
						{name: "l7", size: 1}
					],
					fun: function (device, args) {
						device.state["leds.circle"] = args.map(function (a) { return a[0]; });
						device.onStateChanged && device.onStateChanged("leds.circle");
					}
				},
				{
					name: "leds.top",
					description: "Set top RGB led",
					params: [
						{name: "r", size: 1},
						{name: "g", size: 1},
						{name: "b", size: 1}
					],
					fun: function (device, args) {
						device.state["leds.top"] = args.map(function (a) { return a[0]; });
						device.onStateChanged && device.onStateChanged("leds.top");
					}
				},
				{
					name: "leds.bottom.left",
					description: "Set bottom-left RGB led",
					params: [
						{name: "r", size: 1},
						{name: "g", size: 1},
						{name: "b", size: 1}
					],
					fun: function (device, args) {
						device.state["leds.bottom.left"] = args.map(function (a) { return a[0]; });
						device.onStateChanged && device.onStateChanged("leds.bottom.left");
					}
				},
				{
					name: "leds.bottom.right",
					description: "Set bottom-right RGB led",
					params: [
						{name: "r", size: 1},
						{name: "g", size: 1},
						{name: "b", size: 1}
					],
					fun: function (device, args) {
						device.state["leds.bottom.right"] = args.map(function (a) { return a[0]; });
						device.onStateChanged && device.onStateChanged("leds.bottom.right");
					}
				},
			],
			variableSize: 620
		});
	this.state = {};
	/** @type {?function(string):void} */
	this.onStateChanged = null;
};
A3a.Device.VirtualThymio.prototype = Object.create(A3a.Device.prototype);
A3a.Device.VirtualThymio.prototype.constructor = A3a.Device.VirtualThymio;
