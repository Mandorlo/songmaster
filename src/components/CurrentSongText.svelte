<svelte:window on:keydown={handleKeydown}/>
<script>
    import { display } from '../stores';

    $: parsed_text = parseSong4Display($display.song, {lang: $display.lang});

    function showPart(i) {
        console.log(i, parsed_text[i])
        $display.index = i;
        $display.html = parsed_text[i].lines.join('<br>');
    }

    function unique(value, index, self) { 
        return self.indexOf(value) === index;
    }


    let mem_type = null;
    function handleKeydown(e) {
        //console.log(e)
        let numeric_chars = ['à', '&', 'é', '"', "'", '(', '-', 'è', '_', 'ç'];

        // directional keys
        if ((e.key == 'ArrowRight' || e.key == 'ArrowDown') && $display.index < parsed_text.length-1) {
            showPart($display.index+1)
        } else if ((e.key == 'ArrowLeft' || e.key == 'ArrowUp') && $display.index > 0) {
            showPart($display.index-1)

        // parts numeric
        } else if (!isNaN(parseInt(e.key)) || numeric_chars.includes(e.key)) {
            let n = parseInt(e.key) || numeric_chars.indexOf(e.key);
            if (mem_type) {
                let ind = parsed_text.findIndex(p => p.part_id == mem_type + n.toString())
                if (ind >= 0) showPart(ind);
            } else if (n >= 0 && n < parsed_text.length) {
                showPart(n);
            }

        // parts shortcuts (R, C, ...)
        } else {
            let my_type = e.key.toUpperCase();
            let screens = parsed_text.filter(p => p.type == my_type);
            let my_unique = screens.map(p => p.part_id).filter(unique);
            
            if (my_unique.length == 1) {
                let n = parsed_text.findIndex(p => p.part_id == my_unique[0]);
                if (n >= 0) showPart(n)
            } else {
                mem_type = my_type;
                setTimeout(_ => mem_type = null, 300)
            }
        }
    }

    /**
     * Parses a song in a format ready to be displayed on screen
     * 
     * @param object song : the song to be parsed
     * 
     * @return object: the song in the proper format to be displayed
     */
    function parseSong4Display(song, opt = {}) {
        if (!song) return null;

        opt = Object.assign({
            lang: $display.lang,
        }, opt)

        if (!opt.lang in song.text_parts) {
            opt.lang = Object.keys(song.text_parts)[0];
        }
        
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
            let mem_id = '';
            for (let line_group of line_groups) {
                let screen = {
                    part_id: part.part_id,
                    display_id: (mem_id == part.part_id) ? '' : part.part_id,
                    num: (/\d/.test(part.part_id)) ? /\d/.exec(part.part_id)[0] : '',
                    type: part.part_id[0],
                    lines: line_group.map(l => l.replace(/\[[^\]]+\]/g, '').replace(/\s{2,}/g, ' ')),
                }
                mem_id = part.part_id;
                screens.push(screen);
            }
        }
        display.update(d => {return {...d, parts: screens}})
        return screens; // list of objects with attributes : 'part_id', 'type', 'lines'
    }

    function dict2arr(d, id_name = null) {
        let arr = [];
        if (id_name) {
            for (let k in d) {
                if (typeof d[k] !== 'object') d[k] = {"data": d[k]}
                d[k][id_name] = k;
                arr.push(d[k])
            }
        } else {
            for (let k in d) arr.push(d[k]);
        }
        return arr;
    }
</script>

<style>
    table {
        border-collapse: collapse;
        margin: 1em 0;
        width: 100%;
        max-width: 400px;
    }

    tr {
        cursor: pointer;
        border-radius: 12px 0 0 12px;
    }

    tr.active {
        background: black;
        color: white;
    }

    td {
        padding: 0.3em 0;
    }

    td.text {
        line-height: 1em;
    }

    td.type {
        padding: 0.5em;
        border-radius: 12px 0 0 12px;
    }
</style>

<table>
{#each parsed_text as part, i}
    <tr on:click={_ => showPart(i)} class:active="{i == $display.index}">
        <td class="type type-{part.type}">{part.display_id}</td>
        <td class="text">{@html part.lines.join('<br>')}</td>
    </tr>
{/each}
</table>