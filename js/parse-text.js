function parseText(text) {
    let objects = [];

    if (isSingleWords(text)) {
        let doc = nlp(text);
        doc.nouns().toSingular();

        objects = [{
            "name": doc.text(),
            "num": 1,
            "pos": ""
        }];

        console.log(objects);
    } else {
        let doc = nlp(text);
        doc.nouns().toSingular();

        let groups = doc.match("[. (#Value|#Possessive)? #Adjective+? #Noun on? the? (left|right)?]").group(0).out('array');
        for (let i = 0; i < groups.length; i++) {
            let doc = nlp(groups[i]);
            let name = doc.match("[<num>(#Value|#Possessive)?] #Adjective+? [<name>#Noun] on? the? [<position>(left|right)?]", "name").text();
            let num = doc.match("[<num>(#Value|#Possessive)?] #Adjective+? [<name>#Noun] on? the? [<position>(left|right)?]", "num").text();
            let pos = doc.match("[<num>(#Value|#Possessive)?] #Adjective+? [<name>#Noun] on? the? [<position>(left|right)?]", "position").text();
            objects[i] = {
                "name": name,
                "num": parseNum(num),
                "pos": pos
            }
        }

        console.log(objects);
    }

    return objects;
}

function parseNum(str) {
    nlp.extend(compromiseNumbers);

    let doc = nlp(str).numbers().toCardinal().json()[0];
    if (doc) {
        let num = doc.number;
        return num;
    } else {
        return 1;
    }
}

function isSingleWords(text) {
    let result = RiTa.getPosTags(text);
    if (result.length === 1) {
        return true;
    } else {
        return false;
    }
}