var sleep = (time) => {
    return new Promise((resolve) => setTimeout(resolve, time));
};
var data, rules = "", aniListLinks, cell, noCooldown, cache = {};

aniListLinks = document.getElementById('check-anilist').checked = localStorage.getItem('aniListLinks') == 'true';
document.getElementById('check-anilist').onchange = (e) => {
    aniListLinks = e.target.checked;
    localStorage.setItem('aniListLinks', aniListLinks);
}

noCooldown = document.getElementById('check-cooldown').checked = localStorage.getItem('noCooldown') == 'true';
document.getElementById('check-cooldown').onchange = (e) => {
    noCooldown = e.target.checked;
    localStorage.setItem('noCooldown', noCooldown);
}

cell = document.getElementById('check-cell').checked = localStorage.getItem('cell') == 'true';
document.getElementById('check-cell').onchange = (e) => {
    cell = e.target.checked;
    localStorage.setItem('cell', cell);
}

rules = document.getElementById('rules').value = localStorage.getItem('rules') || "";
document.getElementById('rules').onchange = (e) => {
    rules = e.target.value;
    localStorage.setItem('rules', rules);
}

function parse(text) {
    return text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br>');
}

function writeName(id, jp, en) {
    if (!cell) {
        if (aniListLinks) {
            data += jp+'	='+(navigator.language == "fr-FR" ? "LIEN_HYPERTEXTE" : "HYPERLINK")+'("https://anilist.co/staff/'+id+'", "'+en.replace('  ', ' ')+'")'+"\n";
        } else {
            data += jp+'	'+en+"\n";
        }
    } else {
        data += en+" ("+jp+")\n";
    }
    document.getElementById('list').innerHTML = parse(data).replace(/\n/g, '<br>');
}

document.getElementById('translate').onclick = () => {
    var names = document.getElementById('input').value.split(/[　\r\n]+/g);
    data = "";
    document.getElementById('list').innerHTML = "";

    (async () => {
        for (var i = 0; i < names.length; i++) {
            var name = names[i].trim();

            if (name.length > 0) {
                // Check if name is in rules
                var name2, rule = rules.split(/[\r\n]+/g).find(rule => rule.startsWith(name + "	"));
                if (rule) {
                    name2 = rule.split("	");
                    if (!aniListLinks) {
                        data += name2[0]+'	'+name2[1]+"\n";

                        document.getElementById('list').innerHTML = parse(data);
                        continue;
                    }
                }

                // Check if name is in cache
                if (cache[name]) {
                    if (!rule) {
                        writeName(cache[name].id, name, cache[name].en);
                    } else {
                        writeName(cache[name].id, name2[0], name2[1]);
                    }
                    continue;
                }
                
                if (!noCooldown) {
                    await sleep(650);
                }
                var r = await fetch("https://graphql.anilist.co/", {
                    "headers": {
                        "accept": "application/json",
                        "content-type": "application/json"
                    },
                    "referrer": "https://anilist.co/",
                    "referrerPolicy": "strict-origin-when-cross-origin",
                    "body": "{\"query\":\"query ($search: String) {\\n  staff: Page(perPage: 8) {\\n    pageInfo {\\n      total\\n    }\\n    results: staff(search: $search) {\\n      id\\n      primaryOccupations\\n      name {\\n        full\\n      }\\n      image {\\n        medium\\n      }\\n    }\\n  }\\n}\\n\",\"variables\":{\"search\":\""+name+" \"}}",
                    "method": "POST",
                    "mode": "cors",
                    "credentials": "omit"
                });
                var result = await r.json();
                if (result.data && result.data.staff && result.data.staff.results) {
                    var results = result.data.staff.results;
                    if (results.length == 1) {
                        // Set cache
                        cache[name] = {
                            en: results[0].name.full,
                            id: results[0].id
                        };

                        if (!rule) {
                            writeName(results[0].id, name, results[0].name.full);
                        } else {
                            writeName(results[0].id, name2[0], name2[1]);
                        }
                    } else {
                        data += name+"\n";
                        document.getElementById('list').innerHTML = parse(data).replace(/\n/g, '<br>');
                    }
                } else {
                    data += name+"\n";
                    document.getElementById('list').innerHTML = parse(data).replace(/\n/g, '<br>');
                }
            } else {
                data += "\n";
            }
        }

        document.getElementById('copy').onclick();
    })();
}

document.getElementById('copy').onclick = () => {
    navigator.clipboard.writeText(data).then(() => {
        document.getElementById('copy').innerText = "Copied!";
        setTimeout(() => {
            document.getElementById('copy').innerText = "Copy";
        }, 500);
    });
}