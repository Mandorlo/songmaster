<script>
    import { display } from '../stores';
</script>

<style>
    /* DISPLAY PREVIEW */
    .display_container {
        padding-top: 56.25%; /* to have a 16:9 display ratio. Use 75% for 4:3*/
        position: relative;
    }

    #display {
        width: 100%;
        position: absolute;
        top: 0; right: 0; bottom: 0; left: 0;
        transition: all 0.2s ease-out;

        display: flex;
        justify-content: center;
        align-items: center;
        text-align: center;

        font-size: 1em;
    }
    #display.active {
        border: 1px solid green;
        box-shadow: green 0 0 7px 2px;
        transition: all 0.1s ease-out;
    }

    #display > .controls {
        opacity: 0;
        position: absolute;
        bottom: 0.5em;
        right: 0.5em;
        cursor: pointer;
        list-style: none;
        transition: all 0.2s ease-out;
    }
    #display:hover > .controls {
        opacity: 1;
        transition: all 0.2s ease-out;
    }
</style>

<div class="display_container">
    <div id="display" class:active="{$display.status == 'play'}">
        
        <div class="content">{@html $display.html}</div>
        
        <ul class="controls">
            <li><i class="fa fa-edit"></i></li>
        </ul>

    </div>
</div>