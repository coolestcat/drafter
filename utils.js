var sortSet = function(response){
	var resp = {
        "common": [], 
        "uncommon": [],
        "rare": [],
        "mythic": [],
        "basic": [],
        "special": [],
        "land": []
    }
    lands = [];
    for (var i=0; i<response.length; i++){
        rar = response[i].editions[0].rarity;
        type = response[i].types[0];
        if (type=="land"){
            //lands.push(response[i].editions[0].image_url);
            n = response[i].name;
            image_url = response[i].editions[0].image_url;
            item = {"name" : n, "image_url" : image_url};
            resp["land"].push(item);
            continue;
        }
        if (rar != "common" && rar !="uncommon" && rar != "rare" && rar != "mythic" && rar != "basic"){
            //alert(rar);
        }
        n = response[i].name;
        image_url = response[i].editions[0].image_url;
        item = {"name" : n, "image_url":image_url};
        resp[rar].push(item);
    }
    return resp;
}

var pickChosen = function(resp, nCommons, nUncommons, nRares, nLands){
    chosenCards = []
    //commons:
    for (var i=0; i<nCommons; i++){
    	r = Math.floor(Math.random()*resp["common"].length);
        chosenCards.push(resp.common[r]);
    }

    //uncommons:
    for (var i=0; i<nUncommons; i++){
        r = Math.floor(Math.random()*resp["uncommon"].length);
        chosenCards.push(resp.uncommon[r]);
    }

    //rares:
    for (var i=0; i<nRares; i++){
        r = Math.floor(Math.random()*8);
        if (r==0){ // mythic - 1 in 8 chance
            r = r = Math.floor(Math.random()*resp["mythic"].length);
            chosenCards.push(resp.mythic[r]);
        }
        else{
            r = r = Math.floor(Math.random()*resp["rare"].length);
            chosenCards.push(resp.rare[r]);
        }       
    }

    for (var i=0; i<nLands; i++){
        r = Math.floor(Math.random()*resp["land"].length);
        chosenCards.push(resp.land[r]);     
    }

    return chosenCards;
}

exports.sortSet = sortSet;
exports.pickChosen = pickChosen;