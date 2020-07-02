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

Implementation of class A3a.NodeProxy, a subclass of A3a.Node for
communication via REST calls.

*/

/**	Node proxy object used to communicate with a node
	@constructor
	@extends {A3a.Node}
	@param {string} name
	@param {number} nodeId
	@param {string} url
	@param {string} protocolVersion
*/
A3a.NodeProxy = function (name, nodeId, url, protocolVersion) {
	A3a.Node.call(this, name, nodeId);
	this.url = url;
	this.protocolVersion = protocolVersion;
};
A3a.NodeProxy.prototype = Object.create(A3a.Node.prototype);
A3a.NodeProxy.prototype.constructor = A3a.NodeProxy;

/**	Call a REST method asynchronously
	@param {string} method HTTP method, such as "GET" or "POST"
	@param {string} url url
	@param {?function(?string):void=} cb callback (arg=text response or null for error),
	or null/undefined if none
	@param {string=} data data payload of POST or PUT
	@return {void}
*/
A3a.NodeProxy.callXHRAsync = function (method, url, cb, data) {
	var xhr = new XMLHttpRequest();
	xhr.timeout = 5000;
	if (cb) {
    	xhr.addEventListener("timeout", function (e) {
    		cb(null);
    	});
    	xhr.addEventListener("error", function (e) {
    		cb(null);
    	});
		xhr.addEventListener("load", function (e) {
    		switch (xhr.status) {
    		case 200:
    			var txt = xhr.responseText;
    			cb(txt);
    			break;
    		default:
    			cb(null);	// done without response
    			break;
    		}
		});
	}
	xhr.open(method, url, true);
	xhr.send(data);
};

/**	Initialize list of nodes asynchronously
	@param {string=} rootURL root URL of the aseba http switch prepended to absolute REST URI,
	such as "http://localhost:3000" (default: empty string, assuming the HTML document is served
	from the same server)
	@param {function():void=} cb callback once at least one node has been obtained
	@return {void}
*/
A3a.NodeProxy.init = function (rootURL, cb) {
	rootURL = rootURL || "";
	A3a.NodeProxy.callXHRAsync("GET", rootURL + "/nodes", function (json) {
		if (json !== null) {
			var a = JSON.parse(json);
			if (a.length === 0) {
				// probably not ready, try again
				A3a.NodeProxy.init(rootURL, cb);
			} else {
				A3a.Node.clearNodeList(A3a.NodeProxy);
				a.forEach(function (obj) {
					var nodeProxy = new A3a.NodeProxy(obj["name"],
						obj["aeslId"],
						rootURL + "/nodes/" + obj["name"],
						obj["protocolVersion"]);
					A3a.NodeProxy.callXHRAsync("GET", rootURL + "/nodes/" + obj["name"],
						function (json) {
							nodeProxy.description = json ? JSON.parse(/** @type {string} */(json)) : "";
						});
					A3a.Node.registerNode(nodeProxy);
				});
				cb && cb();
			}
		}
	});
};

/**	Update the node description asynchrounously
	@param {function(string):void} cb callback called when the node description has been received
	@return {void}
*/
A3a.NodeProxy.prototype.updateDescriptionAsync = function (cb) {
	var nodeProxy = this;
	A3a.NodeProxy.callXHRAsync("GET", this.url, function (json) {
		nodeProxy.description = json ? JSON.parse(/** @type {string} */(json)) : "";
		cb && cb(/** @type {string} */(nodeProxy.description));
	});
};

/**	@inheritDoc
*/
A3a.NodeProxy.prototype.getVariableAsync = function (varName, cb) {
	var url = this.url + "/" + varName;
	A3a.NodeProxy.callXHRAsync("GET", url, function (json) {
		var val = json ? /** @type {Array.<number>} */(JSON.parse(/** @type {string} */(json))) : [];
		cb && cb(val, varName);
	});
};

/**	@inheritDoc
*/
A3a.NodeProxy.prototype.setVariableAsync = function (varName, val, cb) {
	var url = this.url + "/" + varName + "/";
	if (val instanceof Array) {
		url += val.map(function (num) { return num.toString(10); }).join("/");
	} else {
		url += val.toString(10);
	}
	A3a.NodeProxy.callXHRAsync("GET", url, function (json) {
		cb && cb(val, varName);
	});
};

/**	Convert source code to the XML document expected by asebahttp
	@param {string} code raw source code
	@param {?Array.<{name:string,size:(number|undefined)}>=} globalEvents global events
	@return {string}
*/
A3a.NodeProxy.prototype.codeTextToXML = function (code, globalEvents) {
	return "<!DOCTYPE aesl-source>\n" +
		"<network>\n" +
		(globalEvents || []).map(function (e) {
			return "<event size='" + (e.size || 0).toString(10) + "' name='" + e.name + "'/>\n";
		}).join("") +
		"<keywords flag='true'/>\n" +
		"<node nodeId='" + (this.nodeId || 1).toString(10) + "' name='" + this.name + "'><![CDATA[" +	// no lf
		code +
		"]]></node>\n" +
		"</network>\n";
};

/**	@inheritDoc
*/
A3a.NodeProxy.prototype.putA3aCodeAsync = function (code, globalEvents, cb) {
	var xml = this.codeTextToXML(code, globalEvents);
	A3a.NodeProxy.callXHRAsync("PUT", this.url, cb && function () { cb(); }, xml);
};

/**	@inheritDoc
*/
A3a.NodeProxy.prototype.getAllVariablesAsync = function (cb) {
	A3a.NodeProxy.callXHRAsync("GET", this.url + "?q=vardict",
		cb && function (json) { json && cb(/** @type {Object} */(JSON.parse(/** @type {string} */(json)))); });
};

/**	@inheritDoc
*/
A3a.NodeProxy.prototype.setBreakpoints = function (breakpoints, cb) {
	A3a.NodeProxy.callXHRAsync("GET",
		this.url + "?q=bp&data=" +
			breakpoints
				.map(function (n) { return n.toString(10); })
				.join("%2C"),	// comma-separated line numbers, url-encoded
		cb && function (json) { cb(); });
};

/**	@inheritDoc
*/
A3a.NodeProxy.prototype.addEventListener = function (eventName, cb) {
	eventName = eventName.toString();
	var url = this.url + "/events";
	if (eventName) {
		url += "/" + eventName;
	}
	var source = new EventSource(url);
	source.onmessage = function (event) {
		cb(event.data.split(" ").slice(1).map(function (str) { return parseInt(str, 10); }), eventName);
	};
	return source;
};

/**	@inheritDoc
*/
A3a.NodeProxy.prototype.addAllEventListener = function (cb) {
	var url = this.url.replace(/\/nodes\/.*$/, "") + "/events";
	var source = new EventSource(url);
	source.onmessage = function (event) {
		var a = event.data.split(" ");
		cb(a.slice(1).map(function (s) { return parseInt(s, 10); }), a[0]);
	};
	return source;
};

/**	@inheritDoc
*/
A3a.NodeProxy.prototype.removeEventListener = function (source) {
	source.close();
};
