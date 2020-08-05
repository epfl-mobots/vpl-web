/*
	Copyright 2019-2020 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
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

		function toHTML(content, isBase64, suffix) {

			function centeredImage(mimetype) {
				var img = "<img src='data:" + mimetype + ";base64," + (isBase64 ? content : btoa(content)) + "' style='max-width:100%;max-height:100%;'>";
				return "<div style='display: table; height: 100%; width: 100%; overflow: hidden;'>" +
					"<div style='display: table-cell; vertical-align: middle; text-align: center;'>" +
					img +
					"</div>" +
					"</div>";
			}

			switch (suffix.toLowerCase()) {
			case "html":
			case "htm":
				return isBase64 ? atob(content) : content;
			case "txt":
				if (isBase64) {
					content = atob(content);
				}
				return "<pre style='width: 100%; height: 100%;'>" +
					content
						.replace(/&/g, "&amp;")
					 	.replace(/</g, "&lt;") +
					"</pre>";
				break;
			case "gif":
				return centeredImage("image/gif");
			case "jpg":
			case "jpeg":
				return centeredImage("image/jpeg");
			case "png":
				return centeredImage("image/png");
			case "svg":
				return centeredImage("image/svg+xml");
			default:
				return "";
			}
		}

		function toDataURL(mimetype, data) {
			return "data:" + mimetype + ";base64," + btoa(data);
		}

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
					self.app.program.filename = msg["data"]["name"] || null;
					self.app.vplCanvas.update();
					break;
				case "about":
					self.app.setAboutBoxContent(toHTML(content, isBase64, suffix));
					break;
				case "help":
					self.app.setHelpContent(toHTML(content, isBase64, suffix));
					break;
				case "suspend":
					self.app.setSuspendBoxContent(toHTML(content, isBase64, suffix));
					break;
				}
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
	} catch (e) {
		// ignore disconnections
	}
};
