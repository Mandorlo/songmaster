<script>

	//export let title = "Song display";
</script>

<svelte:head>
	<!-- Fonts and icons -->
	<link href="https://fonts.googleapis.com/css?family=Bangers|Indie+Flower&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.11.2/css/all.min.css">
</svelte:head>

<style>
	main {
		/* position: relative;
		max-width: 56em;
		background-color: transparent;
		padding: 2em;
		margin: 0 auto; */
		box-sizing: border-box; 
		display: flex;
		flex-direction: column;
		/* height: 100vh;  */
	}
</style>

<main>
	<slot></slot>
</main>