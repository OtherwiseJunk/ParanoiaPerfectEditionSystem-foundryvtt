let SecurityClearance =Object.freeze({
  r:2,
  o:3,
  y:4,
  g:5,
  b:6,
  i:7,
  v:8
});

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class ParanoiaActor extends Actor {

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.paranoia || {};
    this.updateSecurityClearanceFromName(actorData.name, systemData);

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'troubleshooter') return;
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;
    systemData.xp = (systemData.cr * systemData.cr) * 100;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    data['securityClearance'] = data.securityClearance ?? 1;
    data['sec'] = data.securityClearance ?? 1;
    
    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'troubleshooter') return;
    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `/roll @brainsd6`.
    if (data.abilities) {
      
      for (let [abilityName, ability] of Object.entries(data.abilities)) {
        let shorthand = this.getAbilityShorthand(abilityName);
        data[abilityName] = ability.value;
        if(shorthand !== ''){
          data[shorthand] = ability.value;
        }
        for(let [skillName, skill] of Object.entries(ability.skills)){
          let santiziedName = skillName.replace(' ','').toLocaleLowerCase();
          data[santiziedName] = skill.value;
        }
      }
    }
  }

  getAbilityShorthand(abilityName){
    switch(abilityName){
      case 'brains':
        return 'brn';
      case 'chutzpah':
        return 'chtz';
      case 'mechanics':
        return 'mec';
      case 'violence':
        return 'vio';
      default: 
        return '';
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== 'npc') return;

    // Process additional NPC data here.
  }

  updateSecurityClearanceFromName(name, systemData){
    if(/.*-[R,r,O,o,Y,y,G,g,B,b,I,i,V,v]-.*/.test(name)){
      systemData.securityClearance = this.extractSecurityClearance(name);
    }
  }

  extractSecurityClearance(value){
    const nameParts = value.split('-');
    const securityCharacter = nameParts[1].toLowerCase();
    return SecurityClearance[securityCharacter];
  }
}