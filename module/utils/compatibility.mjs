export function GetCompatibleTextEditor(){
    if (foundry.utils.isNewerVersion(game.version, "13")) {
        return foundry.applications.ux.TextEditor;
    }
    else{
        return TextEditor;
    }
}

export function GetCompatibleActorsObject(){
    if (foundry.utils.isNewerVersion(game.version, "13")) {
        return foundry.documents.collections.Actors;
    }
    else{
        return Actors;
    }
}

export function GetCompatibleItemsObject(){
    if (foundry.utils.isNewerVersion(game.version, "13")) {
        return foundry.documents.collections.Items;
    }
    else{
        return Items;
    }
}
