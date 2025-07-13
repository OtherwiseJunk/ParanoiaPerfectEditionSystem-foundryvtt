
// Simple function, but allows us to head off any compatibility issues down the line if the foundry api changes.
export function getAllPlayerCharacters(){
    return game.actors.filter(a => a.hasPlayerOwner);
}