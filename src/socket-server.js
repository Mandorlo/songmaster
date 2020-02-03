import io from 'socket.io';
import { generate_id } from './lib';

// sessions
let sessions = {}
// connections (sockets)
let connections = {}


export const socketServer = {
    connect: function(server) {
        io(server).on('connection', socket => {

            // we generate a unique peer id
            let peer_id = generate_id({not_in: Object.keys(connections)});
            
            // we save the connection with the peer
            connections[peer_id] = socket;
            
            // we generate and send the peer_id with the list of available sessions
            socket.emit('start_info', peer_id, Object.keys(sessions));
            console.log(`Peer ${peer_id} connected`);

            /**
             * Disconnect peer from all sessions and from global list of connections
             */
            socket.on('disconnect', () => {
                // delete peer_id from all sessions
                for (let session_id in sessions) {
                    let peer_ind = sessions[session_id].peers.findIndex(p => p.peer_id == peer_id);
                    if (peer_ind >= 0) {
                        // we delete peer_id from peers
                        sessions[session_id].peers = sessions[session_id].peers.filter(p => p.peer_id != peer_id);
                        // we send the delete peer_id to all peers in session
                        sessions[session_id].peers.map(p => connections[p.peer_id].emit('disconnect_peer', peer_id));
                        // we delete the session if we have no more peers
                        if (sessions[session_id].peers.length == 0) delete sessions[session_id];
                    }
                }
                // delete peer_id socket connection
                delete connections[peer_id];
            });

            /**
             * Request from master or client to be connected to new or existing session
             * connect_as = 'master' | 'client'
             */
            socket.on('session_connect', (session_id, opt, ack_fn) => {
                console.log(`new session connect as ${opt.type} request`, session_id);

                let new_session_b = false;
                if (!(session_id in sessions)) {
                    sessions[session_id] = {session_id, peers: [], p2p: {}};
                    new_session_b = true;
                }
                
                // register new peer
                let new_peer = {
                    ...opt,
                    peer_id,
                    connection: 'SOCKET_SERVER',
                }
                sessions[session_id].peers.push(new_peer);

                // send notif that new peer wants to connect, to all peers. 
                // It's just for information, it's the new peer who will initiate all webRTC connections
                console.log(JSON.stringify(sessions[session_id]))
                for (let peer of sessions[session_id].peers) {
                    if (peer.peer_id == peer_id) continue;
                    connections[peer.peer_id].emit('new_peer', new_peer);
                }

                // if new session, notify all peers in global scope
                for (let id in connections) {
                    connections[id].emit('sessions_list', Object.keys(sessions));
                }

                // we ensure connection can pass through this socket server as fallback
                for (let peer of sessions[session_id].peers) {
                    let target_peer_id = peer.peer_id;
                    if (target_peer_id == peer_id) continue;

                    let listener1 = function(data, ack_fn2) {
                        if (!connections[target_peer_id]) return ack_fn2({error: 'PEER_DISCONNECTED'});
                        console.log("listener1 msg from", peer_id, 'to', target_peer_id, data);
                        connections[target_peer_id].emit('p2p_message', data, peer_id, all_good => {
                            if (!all_good) return ack_fn2({error: 'PEER_ERROR'})
                            return ack_fn2(false)
                        })
                    }
                    socket.on('p2p_message', listener1)
                    if (!sessions[session_id].p2p[peer_id]) sessions[session_id].p2p[peer_id] = {};
                    sessions[session_id].p2p[peer_id][target_peer_id] = listener1;

                    let listener2 = function(data, ack_fn2) {
                        console.log("listener2 msg from ", target_peer_id, 'to', peer_id, data)
                        socket.emit('p2p_message', data, target_peer_id, all_good => {
                            if (!all_good) return ack_fn2({error: 'PEER_ERROR'})
                            return ack_fn2(false)
                        })
                    }
                    connections[target_peer_id].on('p2p_message', listener2)
                    if (!sessions[session_id].p2p[target_peer_id]) sessions[session_id].p2p[target_peer_id] = {};
                    sessions[session_id].p2p[target_peer_id][peer_id] = listener2;
                }



                // return session data with peers
                ack_fn({
                    session_id,
                    peers: sessions[session_id].peers.filter(p => p.peer_id != peer_id),
                });
            })


            /**
             * After session_connect, the peer asks here to initiate webRTC connection with each other peer
             * 
             * @param string master_id : the peer id of the master to connect with
             * @param object signaling_info : the client signaling info
             */
            socket.on('peer_connect', (target_peer_id, signaling_info, opt = {}, ack_fn) => {
                console.log("peer_connect from", peer_id, 'to', target_peer_id);
                if (!connections[target_peer_id]) return ack_fn({'error': 'UNKNOWN_PEER_ID', 'msg': `Cannot find socket connection with peer ${target_peer_id}`});

                console.log("ok sending peer_info to ", target_peer_id);
                // asks the target_peer_id to register the new guy
                connections[target_peer_id].emit('peer_info', peer_id, signaling_info, function(ack_signaling_info) {
                    // send the target_peer_id signaling info back to peer_id
                    console.log("send back sig to ", peer_id)
                    return ack_fn(ack_signaling_info);
                })
            })

            /**
             * When a webRTC connection has been established,
             * we can remove the fallback connection via the socket server
             */
            socket.on('remove_fallback_p2p', (session_id, target_peer_id) => {
                if (!sessions[session_id]) return;
                if (sessions[session_id].p2p[peer_id] && sessions[session_id].p2p[peer_id][target_peer_id]) socket.off('p2p_message', sessions[session_id].p2p[peer_id][target_peer_id])
                if (connections[target_peer_id] && sessions[session_id].p2p[target_peer_id] && sessions[session_id].p2p[target_peer_id][peer_id]) connections[target_peer_id].off('p2p_message', sessions[session_id].p2p[target_peer_id][peer_id])
                delete sessions[session_id].p2p[peer_id][target_peer_id];
                delete sessions[session_id].p2p[target_peer_id][peer_id];
            })

        })
    },
    sessions,
    connections, // the socket connections with masters and clients
}

