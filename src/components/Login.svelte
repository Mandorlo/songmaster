<script>   
    import { onMount } from 'svelte';
    import { firebaseConfig } from '../logic/song_sources/firebase';
    import { createEventDispatcher } from 'svelte';

    let email;
    let password;
    export let user = null;

    const dispatch = createEventDispatcher();

    onMount(() => {
        firebase.initializeApp(firebaseConfig);
        firebase.auth().onAuthStateChanged((u) => {
            if (u) {
                user = u;
                dispatch('loggedin', user);
            }
        });
    })

    function login() {
        firebase.auth().signInWithEmailAndPassword(email, password)
            .catch(err => console.log("firebase auth error", err))
            .then(ok => console.log("firebase ok"))
    }
</script>

<div class="login">
    {#if user}
        <p>Connecté en tant que {(user.displayName) ? user.displayName : user.email}</p>
        <button>Se déconnecter</button>
    {:else}
        <input type="text" name="email" bind:value={email} placeholder="email">
        <input type="password" name="password" bind:value={password} placeholder="password">
        <button on:click={login}>Login</button>
    {/if}
</div>

