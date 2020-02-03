export {
    generate_id,
    pick,

    // FUN
    season,
}

function generate_id(opt = {}) {
    opt = Object.assign({
        "sep": "-",
        "not_in": [], // list of forbidden ids
        "suffix": () => Math.round(Math.random() * 1000)
    }, opt)

    let positive_adjectives = ['adorable', 'amazing', 'amusing', 'authentic', 'awesome', 'beautiful', 'beloved', 'blessed', 'brave', 'brilliant', 'calm', 'caring', 'charismatic', 'cheerful', 'charming', 'compassionate', 'creative', 'cute', 'diligent', 'diplomatic', 'dynamic', 'enchanted', 'enlightened', 'enthusiastic', 'fabulous', 'faithful', 'fearless', 'forgiving', 'friendly', 'funny', 'generous', 'genuine', 'graceful', 'gracious', 'happy', 'honest', 'incredible', 'inspired', 'intelligent', 'jovial', 'kind', 'lively', 'loyal', 'lucky', 'mindful', 'miraculous', 'nice', 'noble', 'original', 'peaceful', 'positive', 'precious', 'relaxed', 'sensitive', 'smart', 'splendid', 'strong', 'successful', 'tranquil', 'trusting', 'vivacious', 'wise', 'zestful'];
    let names = ['fractal', 'narval', 'lynx', 'unicorn', 'magnolia', 'hibiscus', 'almondtree', 'lion', 'tiger', 'eagle', 'falcon', 'mustang', 'gibbon', 'koala', 'firefox', 'meerkat', 'ibex', 'whale', 'bear', 'heron', 'quetzal', 'salamander', 'ringtail', 'ocelot', 'pangolin', 'yak', 'beaver'];

    let gen_id = function() {
        let id = pick(positive_adjectives) + opt.sep + pick(names);
        if (opt.suffix) id += opt.sep + (typeof opt.suffix == 'function' ? opt.suffix() : opt.suffix);
        return id;
    }

    let id = gen_id();
    while (opt.not_in.includes(id)) {id = gen_id()}
    return id;
}

function pick(liste, ind = 1) {
    if (Array.isArray(liste)) return pick_list(liste, ind);
    // TODO for object/dict
}

function pick_list(liste, ind = 1) {
    ind = Math.min(ind, liste.length);
    let res = [];
    while (ind > 0) {
        let n = Math.floor(Math.random() * liste.length);
        res.push(liste[n]);
        delete liste[n];
        ind--;
    }
    if (res.length == 1) return res[0];
    return res;
}


// ===============================================
//              FUN
// ===============================================

/**
 * @return string current season 'spring', 'summer', 'autumn', 'winter
 */
function season() {
    let today = new Date();
    let s_today = `${('00' + today.getMonth()+1).slice(-2) + '-' + ('00' + today.getDate()).slice(-2)}`;
    if (s_today < '03-21') return 'winter';
    else if (s_today < '06-21') return 'spring';
    else if (s_today < '09-21') return 'summer';
    else if (s_today < '12-21') return 'autumn';
    else return 'winter';
}