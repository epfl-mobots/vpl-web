/*
	Copyright 2018-2023 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Implementation of an A3a.vpl.Application method which creates an
A3a.vpl.RunGlue object for the Thymio II robot via the Thymio Device
Manager (Thymio Suite 2.0).

*/

/** Install connection with Thymio via Thymio Device Manager
	@param {{
		w: string,
		uuid: (string | null | undefined),
		pass: (string | null | undefined)
	}=} options tdm options (default: use hash part of document url)
	@return {A3a.vpl.RunGlue}
*/
A3a.vpl.Application.prototype.installThymioTDM = function (options) {
	var app = this;
	var tdm = null;
	if (options == undefined) {
		options = {
			w: vplGetHashOption("w"),
			pass: vplGetHashOption("pass") || "",
			uuid: vplGetHashOption("uuid") || "auto"
		};
	}
	return new A3a.vpl.RunGlue({
		run: function (language, code) {
			tdm["declareCustomEvents"]([
				{"name": "trace", "fixed_size": 1},
				{"name": "user", "fixed_size": 1}
			]);
			tdm["run"](code, null,
				function (e) {
					console.info("Run error");
					console.info(e);
				});
		},
		check: function (language, code, checkFun) {
			tdm["declareCustomEvents"]([
				{"name": "trace", "fixed_size": 1},
				{"name": "user", "fixed_size": 1}
			]);
			tdm["check"](code,
				function () {
					checkFun(null);
				},
				function (e) {
					checkFun(e);
				});
			// no immediate result to report
			return null;
		},
		init: function (language) {
			// initialize the list of nodes
			try {
				tdm = new window["TDM"](options.w,
					{
						"password": options.pass || "",
						"uuid": options.uuid || "auto",
						"change": function (connected) {
							app.robots[app.currentRobotIndex].runGlue.state = connected ? {} : null;
							app.vplCanvas.update();
						},
						"events": function (name, value) {
							if (name === "trace") {
								app.notifyTraceEvent(value[0]);
							}
						}
					});
			} catch (e) {
				console.info(e);
				app.vplCanvas.update();
			}
		},
		close: function () {
			tdm["close"]();
		},
		isConnected: function () {
			return app.robots[app.currentRobotIndex].runGlue.state != null && tdm["isConnected"]();
		},
		isEnabled: function (language) {
			return language === "aseba" && app.robots[app.currentRobotIndex].runGlue.state != null && tdm["canRun"]();
		},
		getName: function () {
			return "Thymio (TDM)";
		},
		flash: function (language, code) {
			tdm["flash"](code);
		},
		canFlash: function (language) {
			return language === "aseba" && app.robots[app.currentRobotIndex].runGlue.state != null && tdm["canRun"]();
		},
		preferredLanguage: "aseba",
		languages: ["aseba"],
		supportTracing: true,
		state: null,
		params: options
	});
};
