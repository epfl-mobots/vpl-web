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

Implementation of an A3a.vpl.Application method which creates an
A3a.vpl.RunGlue object for the Thymio II robot via JSON WebSocket bridge.

*/

/** Install connection with Thymio
	@return {A3a.vpl.RunGlue}
*/
A3a.vpl.Application.prototype.installThymioJSONWebSocketBridge = function () {
	var app = this;
	var jws = null;
	var uuid = vplGetHashOption("uuid") || null;
	if (uuid) {
		// remove tdm braces
		uuid = uuid.replace(/^\{(.*)\}$/, "$1");
	}

	var asebaNode = null;

	return new A3a.vpl.RunGlue({
		run: function (language, code) {
			/** @type {A3a.Compiler} */
			var compiler;
			switch (language) {
			case "aseba":
				compiler = new A3a.Compiler(asebaNode, code);
				compiler.functionLib = A3a.A3aNode.stdMacros;
				break;
			case "l2":
				compiler = new A3a.Compiler(asebaNode, code);
				compiler.functionLib = A3a.A3aNode.stdMacrosL2;
				break;
			}
			var bytecode = compiler.compile();
			jws.run(uuid, bytecode);
		},
		init: function (language) {
			try {
				var url = vplGetHashOption("w") ||
					(document.location.origin.slice(0, 5) !== "http:"
						? "ws://127.0.0.1:8002"
						: document.location.origin.replace(/^http/, "ws"));
				jws = new ThymioJSONWebSocketBridge(url);
				jws.onConnectNode = function (id, descr) {
					if (uuid == null || id === uuid) {
						asebaNode = new A3a.A3aNode(descr);
						app.robots[app.currentRobotIndex].runGlue.state = {};
						app.vplCanvas.update();
					}
				};
				jws.onDisconnectNode = function (id) {
					if (uuid == null || id === uuid) {
						app.robots[app.currentRobotIndex].runGlue.state = null;
						app.vplCanvas.update();
					}
				};
				jws.connect();
			} catch (e) {
				console.info(e);
				app.vplCanvas.update();
			}
		},
		isConnected: function () {
			return app.robots[app.currentRobotIndex].runGlue.state != null;
		},
		isEnabled: function (language) {
			return (language === "aseba" || language === "l2") &&
				app.robots[app.currentRobotIndex].runGlue.state != null;
		},
		preferredLanguage: "aseba",
		languages: ["aseba", "l2"],
		state: null
	});
};
