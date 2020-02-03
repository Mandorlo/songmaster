<svelte:head>
	<title>Songmaster</title>

    <script src="/scripts/simplepeer.min.js" on:load={connect}></script>
    <script src="https://www.gstatic.com/firebasejs/7.7.0/firebase-app.js" defer></script>
    <script src="https://www.gstatic.com/firebasejs/7.7.0/firebase-auth.js" defer></script>
    <script src="https://www.gstatic.com/firebasejs/7.7.0/firebase-firestore.js" defer></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pouchdb/7.1.1/pouchdb.min.js"></script>
</svelte:head>

<svelte:window on:keydown={handleKeydown}/>

<script context="module">
	export async function preload({ params, query }) {
		return {session_id: params.session_id};
	}
</script>

<script>
    import toastr from 'toastr';
    import Nav from '../../components/Nav.svelte';
    import Login from '../../components/Login.svelte';
    import Modal from '../../components/Modal.svelte';
    import CurrentSong from '../../components/CurrentSong.svelte';
    import DisplayPreview from '../../components/DisplayPreview.svelte';

    import { onMount } from 'svelte';
    import { Agent } from '../../logic/webrtc/agent';
    import { master } from '../../logic/sockets/master'; 
    import { firebaseConfig } from '../../logic/song_sources/firebase';
    import { SongBook } from '../../logic/song_sources/songbook';

    import { display } from '../../stores';

    
    let show_login_form = false;

    // SongBook ===============================
    let songbook;
    let firebase_user;
    async function initSongbook(user) {
        console.log("logged in firebase")
        songbook = await SongBook();
        console.log("songbook", songbook)
    }

    // Search =================================
    let search_term = '';
    let search_results = [];
    let tempo;
    function search_song() {
        if (search_term.length < 3) return;
        if (!songbook) return console.log("songbook is not initialized yet");
        if (tempo) clearInterval(tempo);
        tempo = setTimeout(async _ => {
            search_results = await songbook.searchSong(search_term);
        }, 300)
    }
    
    // SESSION =================================
    let socket_status = '0_init';
    Agent.status.subscribe(s => socket_status = s);
    
    export let session_id;
    let session = null;
    let peer_id = '';
    let session_error = '';
    let masters = [];
    let clients = [];

    async function connect() {
        if (session_id.length < 1) return console.log("invalid session id", session_id);
        
        // connect to session and bind all stores and events
        session = await Agent.sessionConnect(session_id, {type: 'master'});
        console.log("session", session)
        session.error.subscribe(err => session_error = err.msg);
        session.last_message_received.subscribe(o => {
            console.log('new message', o)
            $display.html = o.data;
        });
        session.peers.subscribe(plist => {
            masters = plist.filter(p => p.type == 'master');
            clients = plist.filter(p => p.type == 'screen' || p.type == 'smartphone');
        })

        peer_id = Agent.getPeerId();
        let res = await session.connectPeers();
        console.log("peers connected ?", res)
    }

    // =================================================
    function handleKeydown(e) {
        if (e.ctrlKey && e.key == 'p') {
            e.preventDefault();
            play_stop();
        }
    }

    

    /**
     * Toggles between presentation on and off
     */
    function play_stop() {
        if ($display.status === 'stop') {
            $display.status = 'play';
            updateDisplay();
        } else {
            $display.status = 'stop';
        }
    }

    /**
     * Updates the display html
     * 
     */
    function updateDisplay() {
        if ($display.status !== 'play') return;
        // first send to screens
        session.send({type:'display', html:$display.html}, {type: 'screen'});
        // then send to smarpthones if song has changed
        session.send($display, {type: 'smartphone'});
    }
    display.subscribe(o => updateDisplay(o))
</script>

<style>
    .container {
        display: grid;
        grid-template-columns: 1fr 2fr 1fr;
        grid-template-rows: auto;
        grid-gap: 3em;
        
        margin: 5em 1em 0 1em;
    }

    /* NAV */
    ul {list-style: none;}

    ul.status {
        font-family: 'Courier New';
        font-size: 0.8em;
    }

    .board_controls > * {
        cursor: pointer;
    }

    /* SEARCH */
    .search_results li {
        cursor: pointer;
        white-space: nowrap;
        padding: 0 0.5em;
        border-radius: 15px;
    }

    .search_results li:hover {
        background: #dedede;
    }

    .search_results li.active {
        background: black;
        color: white;
    }

    .search_results .song_controls {
        opacity: 0;
        font-size: 0.7em;
        display: flex;
        align-items: center;
        transition: all 0.2s ease-out;
    }

    .search_results li:hover .song_controls {
        opacity: 1;
        transition: all 0.2s ease-out;
    }

    .search_results li {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
    }
    
</style>

<Nav>
    <ul slot="middle">
        <div class="board_controls">
            <button id="play" on:click={play_stop}><i class="fa fa-play"></i></button>
        </div>

        {#if masters.length > 1}
            <p>{masters.length} maîtres</p>
        {/if}

        {#if clients.length > 0}
            <p>{clients.length} client{#if clients.length > 1}s{/if}</p>
        {/if}
    </ul>

    <ul slot="right" class="status">
        <!-- Login form -->
        <li><i class="fa fa-user" on:click={_ => show_login_form = !show_login_form}></i></li>

        {#if socket_status == '0_init'}
            <li><i class="fa fa-spinner fa-spin"></i> 1/2 connecting to server...</li>
        {:else if socket_status == '1_connected_to_server'}
            <li><i class="fa fa-spinner fa-spin"></i> 2/2 connecting to session {session_id}...</li>
        {:else}
            <li><i class="fa fa-power-off"></i></li>
        {/if}
    </ul>
</Nav>

<div class="container">
    <!-- Search -->
    <div class="left">
        <input type="text" bind:value={search_term} on:input={search_song} disabled={!songbook} >
        <ul class="search_results">
            {#each search_results as song}
                <li on:click={_ => {console.log(song); $display.song = song}} class:active="{$display.song && song.orgKey == $display.song.orgKey}">
                    <p>{song.title}</p>
                    <div class="song_controls">
                        <i class="fa fa-square" on:click={_ => $display.song = song} ></i>
                    </div>
                </li>
            {/each}
        </ul>
    </div>

    <!-- Current Song -->
    <div class="middle">
        <CurrentSong />
    </div>

    <!-- Display -->
    <div class="right">
        <DisplayPreview />
        
        <div id="config">
            
        </div>
    </div>
</div>

<Modal title='Se connecter au carnet de chants CCN' modalid="firebase_ccn_login" bind:show={show_login_form}>
    <Login on:loggedin={initSongbook} />
</Modal>

