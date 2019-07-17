/*

Communication with a Thymio via the Thymio Device Manager
Based on https://github.com/Mobsya/thymio-js-api-demo/blob/master/src/index.js

Copyright 2019 Mobsya
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

This is a Derivative Work.
Changes by Mobots, EPFL, March-April 2019

Build:
1. git clone https://github.com/Mobsya/thymio-js-api-demo.git
2. cd thymio-js-api-demo
3. npm i
4. replace src/index.js with this file
5. npm run browser
6. use the resulting dist/thymio.js in your web app:

// default for websocketURL: "ws://localhost:8597" (local tdm)
// options: dict of options (default: none)
// options.uuid: node uuid to connect to, or "auto" to connect automatically to the first node
// (default: don't connect)
// options.change: function(connected) called upon connection change, or node change if !options.uuid
// options.variables: function(v) called upon variable change, or "auto" to only enable this.getVariable
// default for success (function called once code sent success): null (none)
var tdm = new TDM(websocketURL, options);
var b = tdm.canRun();
tdm.run(asebaSourceCode, success);

*/

import {createClient, Node, NodeStatus, Request, setup, mobsya} from '@mobsya/thymio-api'

window.TDM = function (url, options) {
    options = options || {};

    this.nodes = [];
    this.selectedNode = null;
    this.variables = {};

    var self = this;

    // Connect to the switch
    // We will need some way to get that url, via the launcher
    let client = createClient(url || "ws://localhost:8597");

    // Start monitotring for node event
    // A node will have the state
    //      * connected    : Connected but vm description unavailable - little can be done in this state
    //      * available    : The node is available, we can start communicating with it
    //      * ready        : We have an excusive lock on the node and can start sending code to it.
    //      * busy         : The node is locked by someone else.
    //      * disconnected : The node is gone
    client.onNodesChanged = async (nodes) => {
        self.nodes = nodes.slice();
        try {
            if (options.uuid) {
                for (let node of nodes) {
                    if (self.selectedNode
                        && self.selectedNode.id.toString() === node.id.toString()
                        && node.status != NodeStatus.ready && node.status != NodeStatus.available) {
                        // self.selectedNode lost
                        self.selectedNode = null;
                        options.change && options.change(false);
                    }
                    if ((!self.selectedNode || self.selectedNode.status != NodeStatus.ready)
                        && node.status == NodeStatus.available
                        && (options.uuid && (options.uuid === "auto" || node.id.toString() === options.uuid))) {
                        try {
                            self.selectedNode = node;
                            console.log(`Locking ${node.id}`)
                            // Lock (take ownership) of the node. We cannot mutate a node (send code to it), until we have a lock on it
                            // Once locked, a node will appear busy / unavailable to other clients until we close the connection or call `unlock` explicitely
                            // We can lock as many nodes as we want
                            await node.lock();
                            console.log("Node locked");
                            options.change && options.change(true);
                        } catch (e) {
                            console.log(`Unable to lock ${node.id} (${node.name})`)
                        }
                    }
                    if (!self.selectedNode) {
                        continue;
                    }
                    if (options.variables) {
                        if (options.variables === "auto") {
                            self.selectedNode.onVariablesChanged = (vars) => {
                                // store variables from map to object self.variables
                                vars.forEach((val, key) => {
                                    self.variables[key] = val;
                                });
                            }
                        } else {
                            self.selectedNode.onVariablesChanged = (vars) => {
                                // convert variables from map to object
                                var vObj = {};
                                vars.forEach((val, key) => {
                                    self.variables[key] = val;
                                    vObj[key] = val;
                                });

                                options.variables(vObj);
                            };
                        }
                    }
                }
            } else {
                options.change();
            }
        } catch (e) {
            console.log(e)
        }
    }
};


window.TDM.prototype.isConnected = function () {
    return this.selectedNode != null;
};

window.TDM.prototype.setVariables = function (v) {
    // convert variables from object to map
    var map = new Map();
    for (var v1 in v) {
        if (v.hasOwnProperty(v1)) {
            map.set(v1, v[v1]);
        }
    }

    this.selectedNode.setVariables(map);
};

window.TDM.prototype.getVariable = function (name) {
    return this.variables[name];
};

window.TDM.prototype.canRun = function () {
    return this.selectedNode != null && this.selectedNode.status == NodeStatus.ready;
};

window.TDM.prototype.run = async function (program, success) {
    try {
        if (this.selectedNode.status == NodeStatus.ready) {
            await this.selectedNode.sendAsebaProgram(program);
            await this.selectedNode.runProgram();
            success && success();
        }
    } catch(e) {
        console.log(e);
    }
};

window.TDM.runOnNode = async function (node, program, success) {
    try {
        await node.lock();
        await node.sendAsebaProgram(program);
        await node.runProgram();
        await node.unlock();
        success && success();
    } catch(e) {
        console.log(e);
    }
};
