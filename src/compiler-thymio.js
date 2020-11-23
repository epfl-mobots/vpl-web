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

Definition of the system variables and native function of the Thymio
for the Aseba and L2 compilers.

*/

/**
	@const
	@type {A3a.nodeDescr}
*/
A3a.thymioDescr = {
	"name": "thymio-II",
	"maxVarSize": 620,
	"variables": [
		// low-level from aseba_target_thymio2/skel-usb-user.c
		// validated with current Thymio firmware, as of 17 Nov 2020
		{"name": "_id", "size": 1},
		{"name": "event.source", "size": 1},
		{"name": "event.args", "size": 32},
		{"name": "_fwversion", "size": 2},
		{"name": "_productId", "size": 1},
		{"name": "buttons._raw", "size": 5},
		{"name": "button.backward", "size": 1},
		{"name": "button.left", "size": 1},
		{"name": "button.center", "size": 1},
		{"name": "button.forward", "size": 1},
		{"name": "button.right", "size": 1},
		{"name": "buttons._mean", "size": 5},
		{"name": "buttons._noise", "size": 5},
		{"name": "prox.horizontal", "size": 7},
		{"name": "prox.comm.rx._payloads", "size": 7},
		{"name": "prox.comm.rx._intensities", "size": 7},
		{"name": "prox.comm.rx", "size": 1},
		{"name": "prox.comm.tx", "size": 1},
		{"name": "prox.ground.ambiant", "size": 2},
		{"name": "prox.ground.reflected", "size": 2},
		{"name": "prox.ground.delta", "size": 2},
		{"name": "motor.left.target", "size": 1},
		{"name": "motor.right.target", "size": 1},
		{"name": "_vbat", "size": 2},
		{"name": "_imot", "size": 2},
		{"name": "motor.left.speed", "size": 1},
		{"name": "motor.right.speed", "size": 1},
		{"name": "motor.left.pwm", "size": 1},
		{"name": "motor.right.pwm", "size": 1},
		{"name": "_integrator", "size": 2},
		{"name": "acc", "size": 3},
		{"name": "leds.top", "size": 3},
		{"name": "leds.bottom.left", "size": 3},
		{"name": "leds.bottom.right", "size": 3},
		{"name": "leds.circle", "size": 8},
		{"name": "temperature", "size": 1},
		{"name": "rc5.address", "size": 1},
		{"name": "rc5.command", "size": 1},
		{"name": "mic.intensity", "size": 1},
		{"name": "mic.threshold", "size": 1},
		{"name": "mic._mean", "size": 1},
		{"name": "timer.period", "size": 2},
		{"name": "acc._tap", "size": 1},
		{"name": "sd.present", "size": 1}
	],
	"localEvents": [
		{"name": "button.backward"},
		{"name": "button.left"},
		{"name": "button.center"},
		{"name": "button.forward"},
		{"name": "button.right"},
		{"name": "buttons"},
		{"name": "prox"},
		{"name": "prox.comm"},
		{"name": "tap"},
		{"name": "acc"},
		{"name": "mic"},
		{"name": "sound.finished"},
		{"name": "temperature"},
		{"name": "rc5"},
		{"name": "motor"},
		{"name": "timer0"},
		{"name": "timer1"}
	],
	"nativeFunctions": [
		// validated with current Thymio firmware, as of 22 June 2018
		// low-level from aseba_target_thymio2/skel-usb-user.c
		{
			"name": "_system_reboot",
			"args": []
		},
		{
			"name": "_system_settings_read",
			"args": [1, 1]
		},
		{
			"name": "_system_settings_write",
			"args": [1, 1]
		},
		{
			"name": "_system_settings_flash",
			"args": []
		},
		// std functions from aseba/vm/natives.h
		{
			"name": "math.copy",
			"args": [-1, -1]
		},
		{
			"name": "math.fill",
			"args": [-1, 1]
		},
		{
			"name": "math.addscalar",
			"args": [-1, -1, 1]
		},
		{
			"name": "math.add",
			"args": [-1, -1, -1]
		},
		{
			"name": "math.sub",
			"args": [-1, -1, -1]
		},
		{
			"name": "math.mul",
			"args": [-1, -1, -1]
		},
		{
			"name": "math.div",
			"args": [-1, -1, -1]
		},
		{
			"name": "math.min",
			"args": [-1, -1, -1]
		},
		{
			"name": "math.max",
			"args": [-1, -1, -1]
		},
		{
			"name": "math.clamp",
			"args": [-1, -1, -1, -1]
		},
		{
			"name": "math.dot",
			"args": [1, -1, -1, 1]
		},
		{
			"name": "math.stat",
			"args": [-1, 1, 1, 1]
		},
		{
			"name": "math.argbounds",
			"args": [-1, 1, 1]
		},
		{
			"name": "math.sort",
			"args": [-1]
		},
		{
			"name": "math.muldiv",
			"args": [-1, -1, -1, -1]
		},
		{
			"name": "math.atan2",
			"args": [-1, -1, -1]
		},
		{
			"name": "math.sin",
			"args": [-1, -1]
		},
		{
			"name": "math.cos",
			"args": [-1, -1]
		},
		{
			"name": "math.rot2",
			"args": [2, 2, 1]
		},
		{
			"name": "math.sqrt",
			"args": [-1, -1]
		},
		{
			"name": "math.rand",
			"args": [-1]
		},
		/*
		{
			"name": "deque.size",
			"args": [-1, 1]
		},
		{
			"name": "deque.get",
			"args": [-1, -2, 1]
		},
		{
			"name": "deque.set",
			"args": [-1, -2, 1]
		},
		{
			"name": "deque.insert",
			"args": [-1, -2, 1]
		},
		{
			"name": "deque.erase",
			"args": [-1, 1, 1]
		},
		{
			"name": "deque.push_front",
			"args": [-1, -2]
		},
		{
			"name": "deque.push_back",
			"args": [-1, -2]
		},
		{
			"name": "deque.pop_front",
			"args": [-1, -2]
		},
		{
			"name": "deque.pop_back",
			"args": [-1, -2]
		},
		*/
		// thymio functions from aseba_target_thymio2/thymio_natives.h
		{
			"name": "_leds.set",
			"args": [1, 1]
		},
		{
			"name": "sound.record",
			"args": [1]
		},
		{
			"name": "sound.play",
			"args": [1]
		},
		{
			"name": "sound.replay",
			"args": [1]
		},
		{
			"name": "sound.system",
			"args": [1]
		},
		{
			"name": "leds.circle",
			"args": [1, 1, 1, 1, 1, 1, 1, 1]
		},
		{
			"name": "leds.top",
			"args": [1, 1, 1]
		},
		{
			"name": "leds.bottom.left",
			"args": [1, 1, 1]
		},
		{
			"name": "leds.bottom.right",
			"args": [1, 1, 1]
		},
		{
			"name": "sound.freq",
			"args": [1, 1]
		},
		{
			"name": "leds.buttons",
			"args": [1, 1, 1, 1]
		},
		{
			"name": "leds.prox.h",
			"args": [1, 1, 1, 1, 1, 1, 1, 1]
		},
		{
			"name": "leds.prox.v",
			"args": [1, 1]
		},
		{
			"name": "leds.rc",
			"args": [1]
		},
		{
			"name": "leds.sound",
			"args": [1]
		},
		{
			"name": "leds.temperature",
			"args": [1, 1]
		},
		{
			"name": "sound.wave",
			"args": [142]	// aseba-target-thymio2/tone.h
		},
		{
			"name": "prox.comm.enable",
			"args": [1]
		},
		{
			"name": "sd.open",
			"args": [1, 1]
		},
		{
			"name": "sd.write",
			"args": [-1, 1]
		},
		{
			"name": "sd.read",
			"args": [-1, 1]
		},
		{
			"name": "sd.seek",
			"args": [1, 1]
		},
		{
			"name": "_rf.nodeid",
			"args": [1]
		},
		{
			"name": "_poweroff",
			"args": []
		}
	]
};
