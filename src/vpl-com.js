/*
	Copyright 2019-2021 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet

	Licensed under the 3-Clause BSD License;
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at
	https://opensource.org/licenses/BSD-3-Clause
*/

/** @fileoverview

Communication with a server for receiving commands, sending log, and
storing/retriving files.

*/

/** Communication with server
	@constructor
	@param {A3a.vpl.Application} app
	@param {string} wsURL websocket URL
	@param {string} sessionId session id
*/
A3a.vpl.Com = function (app, wsURL, sessionId) {
	this.app = app;
	this.wsURL = wsURL;
	/** @type {WebSocket} */
	this.ws = null;
	this.hasLogger = false;
	this.sessionId = sessionId;

	var self = this;
	this.reconnectId = setInterval(function () {
		if (self.ws != null && self.ws.readyState >= 2) {
			// closing or closed websocket: try to reconnect every 5 s
			if (self.app.supervisorConnected !== false) {
				self.app.supervisorConnected = false;
				self.app.renderProgramToCanvas();
			}
			self.connect();
		}
	}, 5000);
};

/** Execute a command
	@param {string} name
	@param {boolean=} selected
	@param {string=} state
	@return {boolean} true if execute, false if non-existing or disabled
*/
A3a.vpl.Com.prototype.execCommand = function (name, selected, state) {
	var commands = this.app.commands;
	if (commands.isAvailable(name) &&
		commands.hasAction(name) &&
		commands.isEnabled(name)) {
		if (selected !== undefined) {
			return commands.executeForSelected(name, selected);
		} else if (state !== undefined) {
			return commands.executeForState(name, state);
		} else {
			commands.execute(name);
		}
		return true;
	}
	return false;
}

/** Start websocket
	@return {void}
*/
A3a.vpl.Com.prototype.connect = function () {
	var self = this;

	this.ws = new WebSocket(this.wsURL);

	this.ws.addEventListener("open", function () {
		self.app.supervisorConnected = true;
		var helloMsg = {
			"sender": {
				"type": "vpl",
				"sessionid": self.sessionId,
				"role": self.app.program.teacherRole ? "teacher" : "student"
			},
			"type": "hello"
		};
		self.ws.send(JSON.stringify(helloMsg));
		window.addEventListener("unload", function () {
			var byeMsg = {
				"sender": {
					"type": "vpl",
					"sessionid": self.sessionId,
					"role": self.app.program.teacherRole ? "teacher" : "student"
				},
				"type": "bye"
			};
			self.ws.send(JSON.stringify(byeMsg));
		});
		self.app.renderProgramToCanvas();
	});

	this.ws.addEventListener("message", function (event) {

		try {
			var msg = JSON.parse(event.data);

			// accept "defaultfile" only if not app.restored
			if (msg["type"] === "defaultfile" && !self.app.restored) {
				msg["type"] = "file";
			}

			// give a copy to window["vplListenToCom"] if defined
			if (window["vplListenToCom"]) {
				window["vplListenToCom"](msg);
			}

			switch (msg["type"]) {
			case "cmd":
				// execute a command
				// examples: {"type":"cmd","data":{"cmd":"cpl:stop"}}
				// or {"type":"cmd","data":{"cmd":"vpl:slowdown","state":0.5}}
				var cmd = msg["data"]["cmd"];
				var selected = msg["data"]["selected"];
				var state = msg["data"]["state"];
				self.execCommand(cmd, selected, state);
				self.app.vplCanvas.update();
				break;
			case "file":
				// upload a file
				// examples: {"type":"file","data":{"kind":"vpl","content":"{...}"}}
				// or {"type":"file","data":{"kind":"statement","name":"st.jpg","base64":true,"content":"..."}}
				var kind = msg["data"]["kind"];
				var content = msg["data"]["content"];
				var isBase64 = msg["data"]["base64"] || false;
				var suffix = A3a.vpl.Application.getFileSuffix(msg["data"]["name"] || "");
				switch (kind) {
				case "vpl":
					if (isBase64) {
						content = btoa(content);
					}
					if (/^[\s]*{/.test(content)) {
						// json
						self.app.loadProgramJSON(content, {dontChangeProgram: suffix === "vpl3ui"});
					} else {
						// try xml
						self.app.program.importFromAESLFile(content);
						self.app.vplCanvas.onUpdate();
					}
					if (suffix !== "vpl3ui") {
						self.app.program.filename = msg["data"]["name"] || null;
					}
					self.app.vplCanvas.update();
					break;
				case "aseba":
					// run program
					if (isBase64) {
						content = btoa(content);
					}
					self.app.robots[self.app.currentRobotIndex].runGlue.run(content, "aseba");
					self.app.program.uploaded = false;
					break;
				case "about":
					self.app.setAboutBoxContent(A3a.vpl.toHTML(isBase64 ? atob(content) : content, suffix));
					break;
				case "help":
					self.app.setHelpContent(A3a.vpl.toHTML(isBase64 ? atob(content) : content, suffix));
					break;
				case "settings":
					if (isBase64) {
						content = btoa(content);
					}
					var props = JSON.parse(content);
					if (props.hasOwnProperty("volume")) {
						self.app.program.volume = props["volume"];
					}
					break;
				case "statement":
					self.app.setHelpContent(A3a.vpl.toHTML(isBase64 ? atob(content) : content, suffix), true);
					self.app.vplCanvas.update();	// update toolbar
					break;
				case "suspend":
					self.app.setSuspendBoxContent(A3a.vpl.toHTML(isBase64 ? atob(content) : content, suffix));
					break;
				}
				break;
			case "robot":
				// change robot
				// example: {"type":"robot","data":{"robot":"thymio-tdm",...}}
				var robot = msg["data"]["robot"];
				// thymio
				var asebahttp = msg["data"]["url"] || null;
				// thymio-tdm
				var wsUrl = msg["data"]["url"] || null;
				var uuid = msg["data"]["uuid"] || null;
				var pass = msg["data"]["pass"] || null;
				/** @type {A3a.vpl.RunGlue} */
				var runGlue = null;
				switch (robot) {
				case "thymio":
					if (asebahttp) {
						runGlue = self.app.installThymio({asebahttp: asebahttp});
						runGlue.init(runGlue.preferredLanguage);
					}
					break;
				case "thymio-tdm":
					if (!wsUrl && self.app.currentRobotIndex >= 0 && self.app.robots[self.app.currentRobotIndex].runGlue.params.w) {
						// undefined websocket url, keep existing one
						wsUrl = self.app.robots[self.app.currentRobotIndex].runGlue.params.w;
					}
					if (wsUrl) {
						runGlue = self.app.installThymioTDM({w: wsUrl, uuid: uuid, pass: pass});
						runGlue.init(runGlue.preferredLanguage);
					}
					break;
				case "sim":
					runGlue = self.app.installRobotSimulator({});
					runGlue.init(runGlue.preferredLanguage);
					break;
				}
				if (runGlue) {
					// stop current robot, if any
					self.execCommand("vpl:stop");
					// disconnect
					if (this.currentRobotIndex >= 0) {
						this.robots[this.currentRobotIndex].runGlue.stop();
					}
					// set specified robot as unique one
					self.app.robots = [{name: robot, runGlue: runGlue}];
					self.app.currentRobotIndex = 0;
					self.app.vplCanvas.update();	// update toolbar
				}
				break;
			default:
				self.app.vplCanvas.update();
				break;
			}
		} catch (e) {
			console.info(e);
		}
	});

	if (!this.hasLogger) {
		this.app.addLogger(function (data) {
			self.log(data);
		});
		this.hasLogger = true;
	}
};

/** Send a log message
	@param {Object=} data
	@return {void}
*/
A3a.vpl.Com.prototype.log = function (data) {
	try {
		if (data["type"] === "cmd" && data["data"] &&
			["vpl:run", "vpl:save", "vpl:upload"].indexOf(data["data"]["cmd"]) >= 0) {
			// send file before logging command
			var json = this.app.program.exportToJSON({lib: false, prog: true});
			var fileMsg = {
				"sender": {
					"type": "vpl",
					"sessionid": this.sessionId
				},
				"type": "file",
				"data": {
					"name": this.app.program.filename,
					"content": json
				},
				"reason": data["data"]["cmd"]
			};
			this.ws.send(JSON.stringify(fileMsg));
		}
		var logMsg = {
			"sender": {
				"type": "vpl",
				"sessionid": this.sessionId
			},
			"type": "log",
			"data": data || null
		};
		this.ws.send(JSON.stringify(logMsg));
	} catch (e) {
		// ignore disconnections
	}
};
