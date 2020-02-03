import { readable, writable } from 'svelte/store';
import io from 'socket.io-client';

export const Agent = (function() {

    // For debug purposes
    let DEBUG = true; let log = function() {return DEBUG ? console.log(`%c agent ${(new Date()).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit', second:'2-digit'})}.${(new Date()).getMilliseconds()}`, 'color:green', ...arguments): null};

    let conn = io('http://10.66.10.81:3000'); 

    const status = writable('0_init'); // 0_init | 1_connected_to_server | 2_agent_initialized |
    let session_connect_ready = false; // only useful locally for sessionConnect because it has to wait for peer_id

    // Start info
    let peer_id = null;
    const sessions_list = writable([]);

    // ================================
    // initialization events
    // ================================

    conn.on('connect', function () { 
        status.set("1_connected_to_server");
        log("1. Connected to the signaling server");
    });

    conn.on('start_info', (new_peer_id, list_of_session_ids) => {
        peer_id = new_peer_id;
        session_connect_ready = true;
        sessions_list.set(list_of_session_ids);
        status.set("2_agent_initialized");
        log("2. got peer_id and session_list from server", new_peer_id, list_of_session_ids);
    });

    // ================================
    // deconnection events
    // ================================

    conn.on('disconnect', function () { 
        status.set("disconnected");
        log("Disonnected from the signaling server, retrying...");
    });

    // ================================
    // Other events
    // ================================

    conn.on('sessions_list', list_of_session_ids => {
        sessions_list.set(list_of_session_ids);
        log("a new session has been created", list_of_session_ids);
    })

    // ================================
    // actions
    // ================================

    async function sessionConnect(session_id, opt = {}) {
        // check if agent is already initialized, if not we wait for initialization
        if (!session_connect_ready) {
            log(`in sessionConnect : I did not get my peer_id yet so I wait for it`);
            return new Promise((resolve, reject) => {
                status.subscribe(new_status => (new_status == '2_agent_initialized') ? resolve(sessionConnect(session_id, opt)) : '')
            })
        }

        return Session(session_id, opt, conn);
    }


    return {
        // initialization variables
        getPeerId: () => peer_id,
        status, // a svelte store
        sessions_list, // a svelte store

        // actions
        sessionConnect, // connects to a session sessionconnect(session_id, opt = {})

        // low level
        serverConnection: conn, // the connection object with the signaling server
    }

})()









export async function Session(session_id, opt = {}, conn) {

    // For debug purposes
    let DEBUG = true; let log = function() {return DEBUG ? console.log(`%c SESSION ${(new Date()).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit', second:'2-digit'})}.${(new Date()).getMilliseconds()}`, 'color:blue', ...arguments): null};

    // current object status
    let status_s = '0_init'; // | 1_got_peers | 2_ready
    const status = writable('0_init');
    status.subscribe(s => status_s = s);
    
    // Session info
    let peers_list = [];
    const peers = writable([]);
    const last_message_received = writable(''); // {date, from:string, data:any}
    peers.subscribe(l => peers_list = l);
    const error = writable({id:'', msg:'', details:{}}); // the store that contains the last session error

    const return_obj = {
        // once connected to a session
        session_id,
        status, // svelte store
        peers_list, // value of svelte store peers
        peers, // svelte store

        last_message_received,
        error, // svelte store

        // actions
        connectPeers, // connect to all or some peers (myfilter:object|fn)
        send, // send message to all or some targets
    }

    /**
     * Raises an error
     * 
     * @param object err_data {id:string, msg:string, details:object}
     */
    function raiseError(err_data) {
        log(err_data);
        error.set(err_data);
    }

    /**
     * Sends data to targets
     * 
     * @param any data 
     * @param function|string|array myfilter : either the list of target ids or a function/string to filter only some targets
     */
    function send(data, myfilter = '*') {
        log('sending message...', data)

        let my_peers = peers_list;
        if (myfilter !== '*') {
            if (typeof myfilter === 'function') my_peers = peers_list.filter(myfilter);
            else if (myfilter !== null && typeof myfilter === 'object') my_peers = peers_list.filter(el => Object.keys(myfilter).reduce((agg, attr) => agg && myfilter[attr] == el[attr], true));
        }
        log('We will send the message to the following peers', my_peers);

        let message = (typeof data === 'string') ? data : JSON.stringify(data);
        for (let peer of my_peers) {
            if (!peer.connection) {
                log('Could not send message to ', peer.peer_id);
            } else if (peer.connection === 'SOCKET_SERVER') {
                log('sending via socket_server', data)
                conn.emit('p2p_message', data, err => {
                    if (err && err.error) return log(`Error sending message to ${peer.peer_id} via socket server : ${err.error}`);
                })
            } else {
                log('message sent via webRTC : ', message);
                peer.connection.send(message)
            }
        }
    }

    /**
     * Callback called when a new webRTC agent connects
     */
    function onAgentConnect(source_peer_id, agent) {
        log('A new agent just connected : ', source_peer_id, agent);
        peers.update(plist => {
            let ind = plist.findIndex(p => p.peer_id == source_peer_id);
            if (ind < 0) {
                let msg = `We could connect to peer ${source_peer_id} but could not save connection as he is not in our list of peers :(`;
                console.warn(msg);
                raiseError({'id': 'PEER_NOT_ALLOWED', msg, details: {source_peer_id, agent}})
                return peers;
            }
            plist[ind].connection = agent;

            // we notify the socket server that it can erase the socket connection
            // because now all messages can go through webRTC
            conn.emit('remove_fallback_p2p', session_id, source_peer_id);

            // we remove listener for p2p_message
            // TODO

            return [...plist];
        })
        return agent;
    }

    /**
     * Callback called when we receive a message
     * @param {*} data 
     */
    function onNewMessage(target_peer_id, data, channel = 'webrtc') {
        if (!data) {
            raiseError({'id': 'WEBRTC_MESSAGE_EMPTY_DATA', 'msg': 'Received empty message', 'details': {target_peer_id, data, channel}})
            return false;
        }

        if (channel == 'webrtc') {
            let message = data.toString();
            log(`data received from peer ${target_peer_id}`, message)
            last_message_received.set({
                date: new Date(),
                channel,
                from: target_peer_id,
                data: message,
            })
        } else {
            last_message_received.set({
                date: new Date(),
                channel,
                from: target_peer_id,
                data,
            })
        }
        return true;
    }

    /**
     * Connects to all or some peers of the session
     */
    async function connectPeers(myfilter = null) {
        if (status_s !== '1_got_peers') {
            log('As the session is not ready we have to wait before connecting to the peers');
            return new Promise((resolve, reject) => {
                status.subscribe(s => (s === '1_got_peers') ? resolve(connectPeers(myfilter)) : '');
            });
        }

        // we get list of target peers
        let my_peers = peers_list;
        if (typeof myfilter === 'function') my_peers = peers_list.filter(myfilter);
        else if (myfilter !== null && typeof myfilter === 'object') my_peers = peers_list.filter(el => Object.keys(myfilter).reduce((agg, attr) => agg && myfilter[attr] == el[attr], true));
        log('We will connect to the following peers', my_peers);

        // connect to all peers
        let promise_list = [];
        for (let peer of my_peers) {
            let target_peer_id = peer.peer_id;
            let p = new Promise((resolve, reject) => {
                // we initiate new webRTC connection with an initiator agent
                log('We initiate webRTC connection with peer', peer)
                let agent = new SimplePeer({initiator: true, trickle: false});
                agent.on('data', data => {
                    console.log('new message data : ', data, target_peer_id)
                    onNewMessage(target_peer_id, data)
                });
                agent.on('error', err => {
                    log(`webRTC agent error for connection with ${target_peer_id}`, err)
                });
                agent.on('connect', _ => onAgentConnect(target_peer_id, agent))
                agent.on('signal', data => {
                    conn.emit('peer_connect', target_peer_id, data, {}, function(ack_signaling_info) {
                        log("got target signaling info", target_peer_id, ack_signaling_info);
                        resolve(true);
                        agent.signal(ack_signaling_info);
                    })
                });
            })
            promise_list.push(p);
        }
        let peer_connections = await Promise.all(promise_list);

        status.set('2_ready');
        return true;
    }

    /**
     * NEW_PEER_0 : When a new peer connects to our session (no webRTC connection yet)
     */
    conn.on('new_peer', (new_peer) => {
        peers.update(p => [...p, new_peer]);
        log('A new peer wants to connect says the server, we added it to peers with connection=SOCKET_SERVER and we will wait for its webRTC connection request', new_peer);
    })

    /**
     * NEW_PEER_1 : When we get a request for webRTC from new initiator peer
     */
    conn.on('peer_info', (source_peer_id, signaling_info, ack_fn) => {
        log('A new webRTC request came from ', source_peer_id);

        // we initiate a new webRTC agent
        let agent = new SimplePeer({initiator: false, trickle: false});
        // we register source signaling info
        agent.signal(signaling_info);
        // we return our signaling info to the initiator when it's ready
        agent.on('signal', data => {
            log("return my signaling data to initiator", data)
            ack_fn(data);
        })
        agent.on('error', err => {
            log('webRTC agent connection error', err);
        })
        agent.on('connect', _ => onAgentConnect(source_peer_id, agent));
        agent.on('data', data => onNewMessage(source_peer_id, data));
    })

    /**
     * When the server notifies that a peer has been disconnected
     */
    conn.on('disconnect_peer', the_peer_id => {
        peers.update(plist => plist.filter(p => p.peer_id != the_peer_id));
        log(`Peer ${the_peer_id} has been disconnected from the session`);
    })

    /**
     * When receiving a message from the server
     */
    conn.on('p2p_message', (data, source_peer_id, ack_fn) => {
        // TODO filter only source_peer_id not connected with webRTC
        ack_fn(onNewMessage(source_peer_id, data, 'socket_server'))
    });

    
    return new Promise((resolve, reject) => {
        conn.emit('session_connect', session_id, opt, async function(ack_data) { // ack_data = {session_id, peers:array}
            // ack_data.peers contains all peers but the current one
            peers.set(ack_data.peers);
            status.set('1_got_peers');
            resolve(return_obj);
        })
    })

}








