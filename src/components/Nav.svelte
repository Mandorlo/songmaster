<script>
	import {session} from '../stores.js'
	//export let title;
</script>

<style>
	nav {
		position: absolute;
		top: 0;

		display: flex;
		justify-content: space-between;
		align-items: center;
		
		width: 100vw;
		height: 2em;
		padding: 2em 1em;
		
		border-bottom: 1px solid rgba(255,62,0,0.1);
		font-weight: 300;
	}

	nav :global(ul) {
		list-style: none;
		display: flex;
		flex-direction: row;
	}

	nav :global(ul i) {
		cursor: pointer;
	}

	h1 {
		cursor: pointer;
	}

	.right {
		display: flex;
		align-items: center;

		list-style: none;
	}

	.right > * {
		cursor: pointer;
	}

	 .right :global(i.fa) {
		font-size: 1.3em;
	 }
</style>

<nav>
	<h1 class="font-title">{$session.id}</h1>

	<div class="middle">
		<slot name="middle"></slot>
	</div>

	<div class="right">
		<slot name="right"></slot>
	</div>
</nav>
