/**
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

var ws = require("ws");
var util = require("util");

var server;
var settings;

var wsServer;
var activeConnections = [];

var heartbeatTimer;
var lastSentTime;


function init(_server,_settings) {
    server = _server;
    settings = _settings;
}

function start() {
    var path = settings.httpAdminRoot || "/";
    path = path + (path.slice(-1) == "/" ? "":"/") + "comms";
    wsServer = new ws.Server({server:server,path:path});
    
    wsServer.on('connection',function(ws) {
        activeConnections.push(ws);
        ws.on('close',function() {
            for (var i=0;i<activeConnections.length;i++) {
                if (activeConnections[i] === ws) {
                    activeConnections.splice(i,1);
                    break;
                }
            }
        });
        ws.on('error', function(err) {
            util.log("[red:comms] error : "+err.toString());
        });
    });
    
    wsServer.on('error', function(err) {
        util.log("[red:comms] server error : "+err.toString());
    });
     
    lastSentTime = Date.now();
    
    heartbeatTimer = setInterval(function() {
        var now = Date.now();
        if (now-lastSentTime > 15000) {
            lastSentTime = now;
            publish("hb",lastSentTime);
        }
    }, 15000);
}

function publish(topic,data) {
    var msg = JSON.stringify({topic:topic,data:data});
    activeConnections.forEach(function(conn) {
        try {
            conn.send(msg);
        } catch(err) {
            util.log("[red:comms] send error : "+err.toString());
        }
    });
}


module.exports = {
    init:init,
    start:start,
    publish:publish,
}