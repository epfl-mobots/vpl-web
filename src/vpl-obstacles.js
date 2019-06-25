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

Definition of class A3a.vpl.Obstacles, a playground for the robot simulator
where obstacles can be loaded from an SVG file and their distance from a
point in a specified direction can be calculated.

*/

/** Playground for robot simulator
	@constructor
*/
A3a.vpl.Obstacles = function () {
	/** @type {Array.<A3a.vpl.Obstacle>} */
	this.obstacles = [];
};

/** Clear obstacles
	@return {void}
*/
A3a.vpl.Obstacles.prototype.clear = function () {
	this.obstacles = [];
};

/** Add an obstacle
	@param {A3a.vpl.Obstacle} obstacle
	@return {void}
*/
A3a.vpl.Obstacles.prototype.add = function (obstacle) {
	this.obstacles.push(obstacle);
};

/** Load obstacles from svg (append them to list)
	@param {string} svgSrc
	@return {void}
*/
A3a.vpl.Obstacles.prototype.loadFromSVG = function (svgSrc) {
	var svg = new SVG(svgSrc);
	var self = this;
	svg.draw(null, {
		cb: {
			line: function (x, y, isPolygon) {
				self.add(new A3a.vpl.ObstaclePoly(x, y, isPolygon));
			},
			circle: function (x, y, r) {
				self.add(new A3a.vpl.ObstacleCylinder(x, y, r));
			}
		}
	});
};

/** Calculate minimum distance to all obstacles
	@return {number}
*/
A3a.vpl.Obstacles.prototype.distance = function (x, y, phi) {
	var dist = Infinity;
	for (var i = 0; i < this.obstacles.length; i++) {
		dist = Math.min(dist, this.obstacles[i].distance(x, y, phi));
	}
	return dist;
};

/** Draw all obstacles
	@param {CanvasRenderingContext2D} ctx
	@return {void}
*/
A3a.vpl.Obstacles.prototype.draw = function (ctx) {
	this.obstacles.forEach(function (obstacle) {
		obstacle.draw(ctx);
	});
};

/** Base class for obstacles
	@constructor
*/
A3a.vpl.Obstacle = function () {
};

/** Calculate distance to obstacle (should be overridden)
	@return {number}
*/
A3a.vpl.Obstacle.prototype.distance = function (x, y, phi) {
	throw "internal";
};

/** Draw
	@param {CanvasRenderingContext2D} ctx
	@return {void}
*/
A3a.vpl.Obstacle.prototype.draw = function (ctx) {
	// empty
};

/** Polyline or polygon obstacle
	@constructor
	@extends {A3a.vpl.Obstacle}
	@param {Array.<number>} x
	@param {Array.<number>} y
	@param {boolean} isPolygon true for polygon, false for polyline
*/
A3a.vpl.ObstaclePoly = function (x, y, isPolygon) {
	A3a.vpl.Obstacle.call(this);
	this.x = x;
	this.y = y;
	this.isPolygon = isPolygon;
};
A3a.vpl.ObstaclePoly.prototype = Object.create(A3a.vpl.Obstacle.prototype);
A3a.vpl.ObstaclePoly.prototype.constructor = A3a.vpl.ObstaclePoly;

/**
	@inheritDoc
*/
A3a.vpl.ObstaclePoly.prototype.distance = function (x, y, phi) {
	/** Distance from position to wall
		@param {number} x sensor position along x axis
		@param {number} y sensor position along y axis
		@param {number} phi sensor direction (0=along x, counterclockwise)
		@param {number} x1 position of wall extremity 1 along x axis
		@param {number} y1 position of wall extremity 1 along y axis
		@param {number} x2 position of wall extremity 2 along x axis
		@param {number} y2 position of wall extremity 2 along y axis
		@return {number} distance
	*/
	function distanceToWall(x, y, phi, x1, y1, x2, y2) {
		/*
			Let (xx,yy) be the intersection, such that
			xx = x + p cos phi = q x1 + (1 - q) x2
			yy = y + p sin phi = q y1 + (1 - q) y2
			where p is the distance and q is the relative distance from p2
			(0<=q<=1 iff the wall is intersected, p>0 if in front)
			Hence
			[ cos phi  x2-x1 ]   [ p ]   [ x2-x ]
			[                ] . [   ] = [      ]
			[ sin phi  y2-y1 ]   [ q ]   [ y2-y ]
		*/
		var A = [Math.cos(phi), x2 - x1, Math.sin(phi), y2 - y1];
		var b = [x2 - x, y2 - y];
		var det = A[0] * A[3] - A[1] * A[2];
		var r = [
			(A[3] * b[0] - A[1] * b[1]) / det,
			(A[0] * b[1] - A[2] * b[0]) / det
		];
		return r[1] >= 0 && r[1] <= 1 && r[0] > 0
			? r[0]
			: Infinity;	// doesn't intersect wall
	}

	var dist = Infinity;
	var n = this.x.length;
	for (var i = 0; i < (this.isPolygon ? this.x.length : this.x.length - 1); i++) {
		dist = Math.min(dist, distanceToWall(x, y, phi,
			this.x[i], this.y[i], this.x[(i + 1) % n], this.y[(i + 1) % n]));
	}
	return dist;
};

/**
	@inheritDoc
*/
A3a.vpl.ObstaclePoly.prototype.draw = function (ctx) {
	ctx.save();
	ctx.beginPath();
	ctx.moveTo(this.x[0], this.y[0]);
	for (var i = 1; i < this.x.length; i++) {
		ctx.lineTo(this.x[i], this.y[i]);
	}
	if (this.isPolygon) {
		ctx.closePath();
	}
	ctx.stroke();
	ctx.restore();
};

/** Cylinder obstacle
	@constructor
	@extends {A3a.vpl.Obstacle}
	@param {number} x
	@param {number} y
	@param {number} r
*/
A3a.vpl.ObstacleCylinder = function (x, y, r) {
	A3a.vpl.Obstacle.call(this);
	this.x = x;
	this.y = y;
	this.r = r;
};
A3a.vpl.ObstacleCylinder.prototype = Object.create(A3a.vpl.Obstacle.prototype);
A3a.vpl.ObstacleCylinder.prototype.constructor = A3a.vpl.ObstacleCylinder;

/**
	@inheritDoc
*/
A3a.vpl.ObstacleCylinder.prototype.distance = function (x, y, phi) {
	// find cylinder coordinates relative to robot
	var xc1 = (this.x - x) * Math.cos(phi) + (this.y - y) * Math.sin(phi);
	var yc1 = (x - this.x) * Math.sin(phi) + (this.y - y) * Math.cos(phi);
	// find intersection between cylinder and y=0: (x - xc1)^2 + yc1^2 = r^2
	var q2 = this.r * this.r - yc1 * yc1;
	if (q2 < 0) {
		return Infinity;
	} else {
		var q = Math.sqrt(q2);
		return xc1 + q < 0
			? Infinity	// cylinder behind sensor
			: xc1 - q < 0
				? xc1 + q	// sensor inside cylinder
				: xc1 - q;	// cylinder in front of sensor
	}
};

/**
	@inheritDoc
*/
A3a.vpl.ObstacleCylinder.prototype.draw = function (ctx) {
	ctx.save();
	ctx.beginPath();
	ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
	ctx.stroke();
	ctx.restore();
};
