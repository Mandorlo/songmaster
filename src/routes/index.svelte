<svelte:head>
	<title>Song display</title>
</svelte:head>

<script>
	import { onMount } from 'svelte';
	import { Agent } from '../logic/webrtc/agent';
	import { season } from '../lib';

	let new_session_id = '';
	let selected_session_id = '';

	let sessions_list = [];
	Agent.sessions_list.subscribe(l => sessions_list = l);

	let socket_status = '0_init';
	Agent.status.subscribe(s => socket_status = s);

	onMount(() => {
		let bg_url = `url(https://source.unsplash.com/${window.outerWidth}x${window.outerHeight}/?nature,${season()})`;
		document.body.style.backgroundImage = bg_url;
		setInterval(_ => document.body.style.backgroundImage = bg_url, 10000)
	})
	
</script>

<style>
	:global(body) {
		background: linear-gradient(30deg, black, white);
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
	}

	.card {
		position: relative;
    	top: 0;
		display: flex;
		flex-direction: column;

		background: hsla(14, 49%, 94%, 1);
		margin: 5em 2em;
		/* width: 100%; */
		height: 100%;
		padding: 3em 2em;
		border-radius: 12px;
		box-shadow: hsla(0, 0%, 0%, 0.53) 3px 3px 11px;
	}

	.new_session {
		    display: flex;
			justify-content: center;
			flex-direction: column;
	}

	h1 {
		font-size: 2.5em !important;
		text-transform: uppercase;
		font-weight: 700;
		margin: 0 0 0.5em 0;
		text-align: center;
	}

	p {
		text-align: center;
	}

	.sessions {
		flex-grow: 1;

		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		
		padding: 0;
		margin: 1em 0;
	}

	.controls {
		position: absolute;
    	bottom: 2em;
	}

	@media (min-width: 480px) {
		.card {
			width: 300px;
		}

		h1 {
			font-size: 4em;
		}
	}
</style>

<div class="card">
	<h1 class="font-title">Bienvenue !</h1>

	<div class="new_session">
		<input type="text" id="new_session" bind:value={new_session_id} placeholder="Nom de la nouvelle session">
		{#if new_session_id != ""}
			<a href="/master/{new_session_id}">Créer une session</a>
		{:else}
			<p style="color:hsla(0, 0%, 62%, 1);"><i>Créer une session</i></p>
		{/if}
	</div>
	
	<ul class="sessions">
		{#if socket_status == '0_init'}
			<i class="fa fa-spinner fa-spin"></i>
		{:else if socket_status == 'disconnected'}
			<div class="got_disconnected">
				<p style="font-size:2em">😕</p>
				<p>On a été déconnectés</p>
			</div>
		{:else if parseInt(socket_status[0]) > 0 && sessions_list.length < 1}
			<p style="font-size:2em">😇</p>
			<p>
				Pas de sessions en cours<br>pour le moment
			</p>
		{:else if parseInt(socket_status[0]) > 0}
			{#each sessions_list as session_id}
				<li class:active="{selected_session_id == session_id}"><button on:click={_ => selected_session_id = session_id}>{session_id}</button></li>
			{/each}
		{:else}
			<p>Problem : unrecognized socket status : {socket_status}</p>
		{/if}
	</ul>

	{#if parseInt(socket_status[0]) > 0 && sessions_list.length > 0 && sessions_list.includes(selected_session_id)}
		<div class="controls">
			<a href="/session/{selected_session_id}">Rejoindre la session</a>
			<a href="/master/{selected_session_id}">Rejoindre en tant que maître</a>
		</div>
	{/if}
</div>