/*
	Copyright 2019 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
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
	this.sessionId = sessionId;
};

/** Execute a command
	@param {string} name
	@param {boolean | undefined} selected
	@param {string | undefined} state
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
	this.ws = new WebSocket(this.wsURL);

	var self = this;

	this.ws.addEventListener("message", function (event) {
		try {
			var msg = JSON.parse(event.data);
			switch (msg["type"]) {
			case "cmd":
				var cmd = msg["data"]["cmd"];
				var selected = msg["data"]["selected"];
				var state = msg["data"]["state"];
				self.execCommand(cmd, selected, state);
				self.app.vplCanvas.update();
				break;
			case "file":
				var kind = msg["data"]["kind"];
				var content = msg["data"]["content"];
				switch (kind) {
				case "vpl":
					if (/^[\s]*{/.test(content)) {
						// json
						self.app.loadProgramJSON(content);
					} else {
						// try xml
						self.app.program.importFromAESLFile(content);
						self.app.vplCanvas.onUpdate();
					}
					self.app.program.filename = msg["data"]["name"] || null;
					break;
				case "about":
					self.app.setAboutBoxContent(content);
					break;
				case "help":
					self.app.setHelpContent(content);
					break;
				case "suspend":
					self.app.setSuspendBoxContent(content);
					break;
				}
			}
		} catch (e) {
			console.info(e);
		}
	});

	this.app.addLogger(function (data) {
		self.log(data);
	});
};

/** Send a log message
	@param {Object=} data
	@return {void}
*/
A3a.vpl.Com.prototype.log = function (data) {
	if (data["type"] === "cmd" && data["data"] &&
		["vpl:run"].indexOf(data["data"]["cmd"]) >= 0) {
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
			}
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
};
