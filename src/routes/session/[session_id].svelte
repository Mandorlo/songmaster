<svelte:head>
	<title>Songmaster</title>

	<link rel="stylesheet" href="//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css">

    <script src="/scripts/simplepeer.min.js" on:load={sessionConnect}></script>
</svelte:head>

<script context="module">
	export async function preload({ params, query }) {
		return {session_id: params.session_id};
	}
</script>

<script>
	import toastr from 'toastr';
	import { onMount } from 'svelte';
	import { Agent } from '../../logic/webrtc/agent'; 

	export let session_id;
	let session;
	let content = '';
	let song_parts = [];
	let masters = [];
	let device_type = 'screen'; // screen | smarpthone

	// detect type of device (screen or smartphone)
	onMount(() => {
		if (window.outerWidth < 600) {
			device_type = 'smartphone';
			document.body.style.overflowY = "auto";
		}
	})

	// when the simplepeer script loads, we connect to the session
	async function sessionConnect() {
		if (session_id.length < 1) return console.error("invalid session id", session_id);

		// connect to session and bind all stores and events
		session = await Agent.sessionConnect(session_id, {type: device_type});
		console.log("session", session)
		session.status.subscribe(s => {
			if (parseInt(s[0]) > 0) toastr.info(`Connecté à la session ${session_id} en tant que ${device_type}`, '', {timeOut: 3000});
		})
		session.last_message_received.subscribe(o => {
            console.log('new message', o)
            updateDisplay(o.data);
		});
	}

	function updateDisplay(data) {
		if (!data) data = {html: ''};
		if (typeof data === 'string') data = JSON.parse(data);
		if (data.html === undefined) return console.warn('no attribute html in data', data);
		if (device_type == 'smartphone') updateDisplay_smartphone(data);
		else updateDisplay_screen(data);
	}

	function updateDisplay_screen(data) {
		console.log('updating display for screen', data);
		if (data.type == 'display') content = data.html;
	}

	function updateDisplay_smartphone(data) {
		if (typeof data.parts !== 'object') return console.warn('Cannot display for smartphone, no data.parts', data)
		console.log('updating display for smartphone', data);
		song_parts = [...data.parts];
	}
	
</script>

<style>
    #display {
		display: flex;
		justify-content: center;
		align-items: center;

		background: black;

		text-align: center;
		font-size: 2em;
	}

	#display.screen {
		width: 100vw;
		height: 100vh;
	}

	#display.smartphone {
		min-height: 100vh;
	}

	table {
		background: black;
		font-size: 1rem;
		font-family: Roboto;
		text-align: left;
		vertical-align: top;
	}
</style>

<div id="display" class="{device_type}">
{#if device_type === 'screen'}
	{@html content}
{:else}
	<table>
	{#each song_parts as part}
		<tr>
			<td class="type type-{part.type}">{part.display_id}</td>
			<td class="text">{@html part.lines.join('<br>')}</td>
		</tr>
	{/each}
	</table>
{/if}
</div>
