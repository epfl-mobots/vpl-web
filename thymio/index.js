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
Changes by Mobots, EPFL, March 2019

Build:
1. git clone https://github.com/Mobsya/thymio-js-api-demo.git
2. cd thymio-js-api-demo
3. npm i
4. replace src/index.js with this file
5. npm run browser
6. use the resulting dist/thymio.js in your web app:

// default for websocketURL: "ws://localhost:8597" (local tdm)
// default for success (function called once done): null (none)
tdmInit(websocketURL, success);
tdmRun(asebaSourceCode, success);

*/

import {createClient, Node, NodeStatus, Request, setup} from '@mobsya/thymio-api'

window.tdmSelectedNode = undefined;

window.tdmInit = function (url, success) {

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
        try {
            for (let node of nodes) {
                if ((!window.tdmSelectedNode || window.tdmSelectedNode.status != NodeStatus.ready) && node.status == NodeStatus.available) {
                    try {
                        console.log(`Locking ${node.id}`)
                        // Lock (take ownership) of the node. We cannot mutate a node (send code to it), until we have a lock on it
                        // Once locked, a node will appear busy / unavailable to other clients until we close the connection or call `unlock` explicitely
                        // We can lock as many nodes as we want
                        await node.lock();
                        window.tdmSelectedNode = node;
                        console.log("Node locked");
                        success && success();
                    } catch (e) {
                        console.log(`Unable To Log ${node.id} (${node.name})`)
                    }
                }
            }
        } catch (e) {
            console.log(e)
        }
    }
};

window.tdmRun = async function (program, success) {
    try {
        await window.tdmSelectedNode.sendAsebaProgram(program);
        await window.tdmSelectedNode.runProgram();
        success && success();
    } catch(e) {
        console.log(e);
    }
 };
