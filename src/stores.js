import { readable, writable } from 'svelte/store';


export const history = (function() {
    const {subscribe, set, update} = writable({
        sent: [],
        received: [],
    });

    return {
        subscribe, set, update,
        receive: (from_peer_id, data) => {
            update(s => {
                return {
                    ...s,
                    received: [...s.received, {'date': new Date(), 'from': from_peer_id, 'data': data}]
                }
            })
        }
    }
})();

export const session = (function() { // writable exposes these fn : { subscribe, set, update }
    const {subscribe, set, update} = writable({
        'id': 'SESSION',
        'master': [], // list of objects like {type: 'master|screen|smartphone', peer_id: "mypeer", connection: [object webRTC], ...other options}
        'client': [],
    });
    return {
        subscribe,
        set,
        update,

        /**
         * Adds a new webRTC connection to client or master
         */
        addPeerConnection: (peer_id, agent) => {
            return update(s => {
                console.log("adding new webrtc connection in store for " + peer_id, s)
                let ind = s.client.findIndex(p => p.peer_id == peer_id);
                if (ind < 0) {
                    ind = s.master.findIndex(p => p.peer_id == peer_id);
                    if (ind < 0) {
                        console.warn(`There is no peer with id ${peer_id} in session ${s.id}`)
                        return s;
                    }
                    s.master[ind].connection = agent;
                } else {
                    s.client[ind].connection = agent;
                }
                return {...s}
            })
        },

        sendToClients: data => {
            update(s => {
                s.client.map(p => {
                    if (!p.connection) return console.log(`Error in session store : cannot send message to client ${p.peer_id}`);
                    console.log("sending data to client " + p.peer_id, data)
                    if (typeof data !== 'string') data = JSON.stringify(data);
                    p.connection.send(data);
                })
                return s;
            })
        }
    }
})(); 

export const display = writable({
    'status': 'stop', // | play
    'song': null, // the song object currently displayed
    'parts': [], // the text parts, parsed in the correct language
    'lang': 'FR', // current song lang
    'index': -1, // index of the current screen being displayed
    'html': '', // the html currently displayed
})