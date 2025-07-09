export function getCompatibleTextEditor(){
    return foundry.applications?.ux?.TextEditor ?? TextEditor;
}

export function getCompatibleActorsObject(){
    return foundry.documents?.collections?.Actors ?? Actors;
}

export function getCompatibleItemsObject(){
    return foundry.documents?.collections?.Items ?? Items;
}

export function getCompatibleActorSheet(){
    return foundry.appv1?.sheets?.ActorSheet ?? ActorSheet
}
export function getCompatibleItemSheet(){
    return foundry.appv1?.sheets?.ItemSheet ?? ItemSheet;
}

export function getMergeObjectFunction(){
    return foundry.utils?.mergeObject ?? globalThis.mergeObject;
}