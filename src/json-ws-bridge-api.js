
/**
	Connection to JSON WebSocket bridge
	@constructor
	@param {string} wsURL websocket url (default: "ws://127.0.0.1:8002/")
*/
var ThymioJSONWebSocketBridge = function (wsURL) {
	this.wsURL = wsURL || "ws://127.0.0.1:8002/";
	this.nodes = {};
	this.onConnectNode = null;
	this.onDisconnectNode = null;
	this.onVariableReceived = null;
};

/** Connect
	@return {void}
*/
ThymioJSONWebSocketBridge.prototype.connect = function () {
	this.ws = new WebSocket(this.wsURL);
	var self = this;
	this.ws.addEventListener("open", function () {
		var msg = {
			"type": "nodes"
		};
		self.ws.send(JSON.stringify(msg));
	});
	this.ws.addEventListener("message", function (event) {
		try {
			var msg = JSON.parse(event.data);
			switch (msg["type"]) {
			case "connect":
				if (msg["id"]) {
					var id = msg["id"];
					self.nodes[id] = msg;
					self.onConnectNode && self.onConnectNode(id, msg["descr"]);
				}
				break;
			case "disconnect":
				var id = msg["id"];
				delete self.nodes[id];
				self.onDisconnectNode && self.onDisconnectNode(id);
				break;
			case "var":
				self.onVariableReceived && self.onVariableReceived(msg["id"], msg["var"]);
				break;
			}
		} catch (e) {
		}
	});
};

/** Get node
	@param {string} id
	@return {Object}
*/
ThymioJSONWebSocketBridge.prototype.getNode = function (id) {
	return this.nodes[id];
};

/** Subscribe to variable updates
	@param {string} id
	@return {void}
*/
ThymioJSONWebSocketBridge.prototype.subscribe = function (id, varList) {
	var msg = {
		"type": "subscribe",
		"id": id,
		"names": varList
	};
	this.ws.send(JSON.stringify(msg));
};

/** Run bytecode
	@param {string} id
	@param {Array.<number>} bytecode
	@return {void}
*/
ThymioJSONWebSocketBridge.prototype.run = function (id, bytecode) {
	var msg = {
		"type": "run",
		"id": id,
		"bc": bytecode
	};
	this.ws.send(JSON.stringify(msg));
};
