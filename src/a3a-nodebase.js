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

Implementation of abstract class A3a.Node which represents Aseba nodes with
communication capability.

*/

/**	Node abstract base class used to communicate with a node
	@constructor
	@param {string} name
	@param {number} nodeId
*/
A3a.Node = function (name, nodeId) {
	this.name = name;
	this.nodeId = nodeId;
};

/**	List of nodes
	@type {Array.<A3a.Node>}
*/
A3a.Node.nodeList = [];

/**	Register a node by adding it to the list of nodes
	@param {A3a.Node} node
	@return {void}
*/
A3a.Node.registerNode = function (node) {
	A3a.Node.nodeList.push(node);
};

/**	Clear list of nodes, or only instances of the specified class
	@param {Object=} cls
	@return {void}
*/
A3a.Node.clearNodeList = function (cls) {
	if (cls) {
		for (var i = A3a.Node.nodeList.length - 1; i >= 0; i--) {
			if (A3a.Node.nodeList[i] instanceof cls) {
				A3a.Node.nodeList.splice(i, 1);
			}
		}
	} else {
		A3a.Node.nodeList = [];
	}
};

/**	Get current node list
	@return {Array.<A3a.Node>}
*/
A3a.Node.getNodeList = function () {
	return A3a.Node.nodeList;
};

/**	Get a node specified by its name
	@param {string} name
	@return {A3a.Node}
*/
A3a.Node.findNodeByName = function (name) {
	for (var i = 0; i < A3a.Node.nodeList.length; i++) {
		if (A3a.Node.nodeList[i].name === name) {
			return A3a.Node.nodeList[i];
		}
	}
	return null;
};

/**	Get a node specified by its id
	@param {number} nodeId
	@return {A3a.Node}
*/
A3a.Node.findNodeById = function (nodeId) {
	for (var i = 0; i < A3a.Node.nodeList.length; i++) {
		if (A3a.Node.nodeList[i].nodeId === nodeId) {
			return A3a.Node.nodeList[i];
		}
	}
	return null;
};

/**	Get a variable value asynchrounously
	@param {string} varName variable name
	@param {function(Array.<number>,string):void} cb callback called when the array value has been received
	@return {void}
*/
A3a.Node.prototype.getVariableAsync = function (varName, cb) {
	throw "not implemented";
};

/**	Assign a new value to a variable asynchrounously
	@param {string} varName variable name
	@param {number|Array.<number>} val value(s)
	@param {function((number|Array.<number>),string):void=} cb optional callback called when the request has been sent
	@return {void}
*/
A3a.Node.prototype.setVariableAsync = function (varName, val, cb) {
	throw "not implemented";
};

/**	Upload A3a source code
	@param {string} code raw source code
	@param {?Array.<{name:string,size:(number|undefined)}>=} globalEvents global events
	@param {function():void=} cb optional callback called when the request has been sent
	@return {void}
*/
A3a.Node.prototype.putA3aCodeAsync = function (code, globalEvents, cb) {
	throw "not implemented";
};

/**	Get all variable values asynchrounously
	@param {function(Object):void} cb callback called when the dict object has been received
	@return {void}
*/
A3a.Node.prototype.getAllVariablesAsync = function (cb) {
	throw "not implemented";
};

/**	Set breakpoint
	@param {Array.<number>} breakpoints breakpoint lines in source code ([] to clear all)
	@param {function():void=} cb optional callback called when the request has been sent
	@return {void}
*/
A3a.Node.prototype.setBreakpoints = function (breakpoints, cb) {
	throw "not implemented";
};

/**	@typedef {*} */
A3a.Node.EventListenerRef;

/**	Add a listener called for a specific event
	@param {(string|number)} eventName event name, or 0-based index if the source code has
	not been compiled by asebahttp
	@param {function(Array.<number>,(string|number)):void} cb callback
	@return {A3a.Node.EventListenerRef} listener reference which can be passed to removeEventListener
*/
A3a.Node.prototype.addEventListener = function (eventName, cb) {
	throw "not implemented";
};

/**	Add a listener called for all events
	@param {function(Array.<number>,string):void} cb callback
	@return {A3a.Node.EventListenerRef} listener reference which can be passed to removeEventListener
*/
A3a.Node.prototype.addAllEventListener = function (cb) {
	throw "not implemented";
};

/**	Remove a listener installed by addEventListener
	@param {A3a.Node.EventListenerRef} source listener reference returned by addEventListener
*/
A3a.Node.prototype.removeEventListener = function (source) {
	throw "not implemented";
};
