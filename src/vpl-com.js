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
	@return {boolean} true if execute, false if non-existing or disabled
*/
A3a.vpl.Com.prototype.execCommand = function (name) {
	var commands = this.app.commands;
	if (commands.hasAction(name) && commands.isEnabled(name)) {
		commands.execute(name);
		return true;
	}
	return false;
}

/** Start websocket
	@return {void}
*/
A3a.vpl.Com.prototype.connect = function () {
	this.ws = new WebSocket(this.wsURL);
	this.ws.addEventListener("message", function (event) {
		try {
			var msg = JSON.parse(event.data);
console.info(msg);
			switch (msg["type"]) {
			case "cmd":
				var cmd = msg["data"]["cmd"];
				this.execCommand(cmd);
				break;
			}
		} catch (e) {
			console.info(e);
		}
	});

	var self = this;
	this.app.addLogger(function (data) {
		self.log(data);
	});
};

/** Send a log message
	@param {Object=} data
	@return {void}
*/
A3a.vpl.Com.prototype.log = function (data) {
	var msg = {
		"sender": {
			"type": "vpl",
			"sessionid": this.sessionId
		},
		"type": "log",
		"data": data || null
	};
	this.ws.send(JSON.stringify(msg));
};
