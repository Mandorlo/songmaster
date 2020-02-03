import { firebaseConfig } from "./firebase";


export let SongBook = function(PARAM) {
    PARAM = Object.assign({
        default_lang: 'FR',
    }, PARAM);

    // offline persistence : https://firebase.google.com/docs/firestore/manage-data/enable-offline
    firebase.initializeApp(firebaseConfig);
    let db = firebase.firestore();
    let firestore_source = "cache";

    let db_search = new PouchDB('songbook_search');
    let db_index = {};
    let db_titles = {};

    let arabic_text = /^[\u0600-\u06FF\s\-\.\,0-9]$/;

    async function init() {

        /* let auth_result = await authenticate();
        if (!auth_result) throw "AUTH_FAILED"; */
        db.enablePersistence()
            .catch(function(err) {
                firestore_source = 'default';
                if (err.code == 'failed-precondition') {
                    // Multiple tabs open, persistence can only be enabled in one tab at a a time.
                    console.error("multiple tabs, persistence can be set only for one tab at a time");
                } else if (err.code == 'unimplemented') {
                    // The current browser does not support all of the features required to enable persistence
                    console.error("Unable to set persistance for songbooks firestore")
                }
            });

        // check if we have songs in local firestore cache
        if (firestore_source == 'cache') {
            let querySnapshot = await db.collection("songs").get({source: firestore_source});
            let cache_ok = querySnapshot.metadata.fromCache;

            if (!cache_ok) {
                let songs = await getCollection("songs", "default");
                // check if we have songs in local firestore cache
                querySnapshot = await db.collection("songs").get({source: firestore_source});
                if(querySnapshot.getMetadata().isFromCache()) console.log("Cannot set cache for songbook firestore");
            }
        }

        // create songs index
        //createIndex();
        await db_search.get('index').then(doc => {
            console.log("db_index=", doc); 
            if (Object.keys(doc).length < 10) return createIndex();
            db_index = doc;
        }).catch(err => createIndex());
        await db_search.get('titles').then(doc => db_titles = doc).catch(err => createIndex());

        return {
            getSong,
            searchSong,
            parseSong4Display,
            
            db,
            db_search,
            db_index,

            getCollection, // get a firestore collection like "songs" or "songbooks"
            createIndex, // creates an index of the songs for search
            normalizeTitle,
        }
    }
    return init();

    /**
     * Parses a song in a format ready to be displayed on screen
     * 
     * @param object song : the song to be parsed
     * 
     * @return object: the song in the proper format to be displayed
     */
    function parseSong4Display(song, opt = {}) {
        opt = Object.assign({
            lang: PARAM.default_lang,
        }, opt)

        if (!opt.lang in song.text_parts) return {"error": "INEXISTING_LANG", "msg": `La langue ${opt.lang} n'existe pas`}
        
        // we sort parts
        let parts = dict2arr(song.text_parts[opt.lang], "part_id").filter(p => !['K'].includes(p.part_id[0]) );
        parts.sort((a,b) => {
            let order = ['A', 'V', 'I', 'P', 'R', 'C', 'B', 'T', 'S', 'Z', 'G', 'F', 'E'];
            return (order.indexOf(a.part_id[0]) < order.indexOf(b.part_id[0])) ? -1 : 1;
        })

        // we split long parts in screens (of 2 lines max)
        let screens = [];
        for (let part of parts) {
            let line_groups = [part.lines];
            if (part.lines.length > 3) {
                line_groups = [];
                for (let i = 0; i < part.lines.length-1; i+=2) {
                    let line_group = [part.lines[i], part.lines[i+1]];
                    if (i == part.lines.length - 3) line_group.push(part.lines[i+2]);
                    line_groups.push(line_group)
                }
            } 
            for (let line_group of line_groups) {
                let screen = {
                    part_id: part.part_id,
                    type: part.part_id[0],
                    lines: line_group.map(l => l.replace(/\[[^\]]+\]/g, '').replace(/\s{2,}/g, ' ')),
                }
                screens.push(screen);
            }
        }
        return screens; // list of objects with attributes : 'part_id', 'type', 'lines'
    }

    async function searchSong(s) {
        let id_list = [];
        let normed_s = normalizeTitle(s);
        for (let key in db_index) {
            if (normed_s.indexOf(key) > -1 || key.indexOf(normed_s) > -1) id_list = id_list.concat(db_index[key]);
        }
        let p_list = id_list.map(getSong);
        return Promise.all(p_list);
    }

    async function getCollection(coll, source = null) {
        if (!source) source = firestore_source;
        let querySnapshot = await db.collection(coll).get({source});
        let res = []
        querySnapshot.forEach(function(doc) {
            let o = doc.data()
            o.id = doc.id
            res.push(o)
        });
        
        if (res.length < 1) {
            querySnapshot = await db.collection(coll).get({source: 'default'});
            querySnapshot.forEach(function(doc) {
                let o = doc.data()
                o.id = doc.id
                res.push(o)
            });
        }

        return res
    }

    async function createIndex() {
        let songs = await getCollection("songs");
        db_index = {};
        db_titles = {};
        // create local index if not exists
        for (let song of songs) {
            let normed1 = normalizeTitle(song.title);
            if (normed1 == '') {
                console.log("Impossible d'indexer title", song);
                continue;
            }
            if (!(normed1 in db_index)) db_index[normed1] = [];
            db_index[normed1].push(song.orgKey);

            if (!song.aternate_title) continue;
            normed1 = normalizeTitle(song.alternate_title);
            if (normed1 == '') {
                console.log("Impossible d'indexer alternate title ", song);
                continue;
            }
            if (normed1 in db_index) db_index[normed1] = [];
            if (!db_index[normed1].includes(song.orgKey)) db_index[normed1].push(song.orgKey);

            db_titles[song.orgKey] = {'title': song.title, 'alternate_title': song.alternate_title}
        }

        // save it in pouchdb
        pouchWriteDoc(db_search, "index", db_index).catch(err => console.error("Cannot save songbook index to local db", err));
        pouchWriteDoc(db_search, "titles", db_titles).catch(err => console.error("Cannot save songbook titles to local db", err));

        return db_index
    }

    async function getSong(id) {
        if (!id) return {};
        try {
            let doc = await db.collection("songs").doc(id).get({source: firestore_source});
            if (!doc.exists) {
                return null;
            } else {
                return doc.data();
            }
        } catch(e) {
            console.log("getting song from server", id)
            let doc = await db.collection("songs").doc(id).get({source: "server"});
            if (!doc.exists) {
                return null;
            } else {
                return doc.data();
            }
        }
    }

    function normalizeTitle(title) {
        // arabic
        if (arabic_text.test(title)) return title;

        title = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return title.toLowerCase().replace(/[^A-z0-9]/gi, '');
    }

}

// write or update document
async function pouchWriteDoc(db, doc_name, data) {
    return db.get(doc_name)
        .then(doc => {
            db.put({
                ...data,
                _id: doc_name,
                _rev: doc._rev,
            })
        }).catch(err => {
            db.put({
                ...data,
                _id: doc_name,
            })
        })
}