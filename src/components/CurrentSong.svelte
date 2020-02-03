<script>
    import { display } from '../stores';
    import CurrentSongText from './CurrentSongText.svelte';

    $: lang_list = $display.song ? Object.keys($display.song.text_parts): [];

    
</script>

<style>
    .line2 {
        display: flex;
        justify-content: space-between;
    }

    ul.languages {
        display: flex;
        list-style: none;
    }

    ul.languages li:last-child {
        border-radius: 0 12px 12px 0;
    }

    ul.languages li:nth-child(1) {
        border-radius: 12px 0 0 12px;
    }
    ul.languages li {
        cursor: pointer;
        padding: 0.2em 0.5em;
        border: 1px solid black;
    }

    ul.languages li.active {
        background: black;
        color: white;
    }
</style>

{#if $display.song}
<div class="current_song">
    <h1 class="song_title">{$display.song.title}</h1>

    <div class="line2">
        <ul class="languages">
            {#each lang_list as lang}
                <li on:click={_ => $display.lang = lang} class:active="{lang == $display.lang}">{lang.toUpperCase()}</li>
            {/each}
        </ul>

        <div class="song_info">
            <i class="fa fa-info"></i>
        </div>
    </div>

    <div class="text">
        <CurrentSongText />
    </div>
</div>


{:else}
    <p>Aucun chant sélectionné</p>
{/if}