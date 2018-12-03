/*
	Copyright 2018 ECOLE POLYTECHNIQUE FEDERALE DE LAUSANNE,
	Miniature Mobile Robots group, Switzerland
	Author: Yves Piguet
	For internal use only
*/

// A3a node id mapping for node.js

/** Mapping between nodes, internal nodeId, and external nodeId for other switch clients
	@constructor
*/
A3a.IdMapping = function () {
	/** @type {Array.<number>} */
	this.connectionIndices = [];
	/** @type {Array.<number>} */
	this.localNodeIds = [];
	/** @type {Array.<number>} */
	this.externNodeIds = [];
};

/** Add a mapping
	@param {number} connectionIndex index in array of connections in switch
	@param {number} localNodeId nodeId local to the connection
	@param {number} externNodeId nodeId for other switch clients
	@return {void}
*/
A3a.IdMapping.prototype.add = function (connectionIndex, localNodeId, externNodeId) {
	this.connectionIndices.push(connectionIndex);
	this.localNodeIds.push(localNodeId);
	this.externNodeIds.push(externNodeId);
};

/** Get connection index for specified extern nodeId
	@param {number} externNodeId nodeId for other switch clients
	@return {number}
*/
A3a.IdMapping.prototype.connectionIndex = function (externNodeId) {
	for (var i = 0; i < this.externNodeIds.length; i++) {
		if (this.externNodeIds[i] === externNodeId) {
			return this.connectionIndices[i];
		}
	}
	return -1;
};

/** Get local nodeId for specified extern nodeId
	@param {number} externNodeId nodeId for other switch clients
	@return {number}
*/
A3a.IdMapping.prototype.localNodeId = function (externNodeId) {
	for (var i = 0; i < this.externNodeIds.length; i++) {
		if (this.externNodeIds[i] === externNodeId) {
			return this.localNodeIds[i];
		}
	}
	return -1;
};

/** Get extern nodeId for specified tuple of connection index and local nodeId
	@param {number} connectionIndex index in array of connections in switch
	@param {number} localNodeId nodeId local to the connection
	@return {number}
*/
A3a.IdMapping.prototype.externNodeId = function (connectionIndex, localNodeId) {
	for (var i = 0; i < this.externNodeIds.length; i++) {
		if (this.connectionIndices[i] === connectionIndex &&
			this.localNodeIds[i] === localNodeId) {
			return this.externNodeIds[i];
		}
	}
	return -1;
};
