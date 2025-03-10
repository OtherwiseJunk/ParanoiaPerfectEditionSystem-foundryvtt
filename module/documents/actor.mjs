export const SecurityClearance = Object.freeze({
  r: 1,
  o: 2,
  y: 3,
  g: 4,
  b: 5,
  i: 6,
  v: 7,
  u: 8
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

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) { }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) { }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    data['securityClearance'] = data.securityClearance ?? 0;
    data['sec'] = data.securityClearance ?? 0;

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
        if (shorthand !== '') {
          data[shorthand] = ability.value;
        }
        for (let [skillName, skill] of Object.entries(ability.skills)) {
          let santiziedName = skillName.replace(' ', '').toLocaleLowerCase();
          data[santiziedName] = skill.value;
        }
      }
    }
  }

  /**
   *
   * @param {*} data - The initial data object provided to the document creation request
   * @param {*} options - Additional options which modify the creation request
   * @param {*} userId - The id of the User requesting the document update
   */
  async _preCreate(data, options, userId) {
    if ((await super._preCreate(data, options, userId)) === false) return false;
    this.updateSecurityClearanceFromName(data.name, this.system);

    const prototypeToken = this.buildDynamicTokenRingData(this.system.securityClearance);
    if (this.type === "troubleshooter") Object.assign(prototypeToken, {
      sight: { enabled: true }, actorLink: true,
    });

    this.updateSource({
      "prototypeToken.ring.enabled": prototypeToken.enabled,
      "prototypeToken.ring.subject.scale": prototypeToken.scale,
      "prototypeToken.ring.colors.ring": prototypeToken.color,
      "prototypeToken.ring.effects": prototypeToken.effects,
      "prototypeToken.sight": prototypeToken.sight,
      "prototypeToken.actorLink": prototypeToken.actorLink ?? false
    });

  }

  /**
   *
   * @param {*} changed - The differential data that was changed relative to the documents prior values
   * @param {*} options - Additional options which modify the update request
   * @param {*} userId - The id of the User requesting the document update
   */
  async _onUpdate(changed, options, userId) {
    super._onUpdate(changed, options, userId);

    const isNameUpdate = !!changed?.name;
    const isMoxieUpdate = !!changed?.system?.moxie;

    if (isNameUpdate) {
      this.triggerSecurityClearanceChange(changed.name);
    }

    if (isMoxieUpdate && changed.system.moxie.value < 1) {
      this.triggerLoseItDynamicRingEffect();
      this.sendLosingItMessage();
    }
  }

  triggerSecurityClearanceChange(name) {
    this.updateSecurityClearanceFromName(name, this.system);
    const prototypeToken = this.buildDynamicTokenRingData(this.system.securityClearance);
    this.updateSource({
      "prototypeToken.ring.enabled": prototypeToken.enabled,
      "prototypeToken.ring.subject.scale": prototypeToken.scale,
      "prototypeToken.ring.colors.ring": prototypeToken.color,
      "prototypeToken.ring.effects": prototypeToken.effects,
    });
    this.getActiveTokens().forEach(token => {
      token.document.update({
        "ring.enabled": prototypeToken.enabled,
        "ring.subject.scale": prototypeToken.scale,
        "ring.colors.ring": prototypeToken.color,
        "ring.effects": prototypeToken.effects
      });
      token.renderFlags.set({ redraw: true })
    });
  }

  buildDynamicTokenRingData(securityClearance) {
    let prototype = {
      enabled: true,
      scale: 0.8,
      effects: 1
    }

    switch (securityClearance) {
      case SecurityClearance.r:
        prototype.color = CONFIG.PARANOIA.SecurityClearanceColors.Red;
        break;
      case SecurityClearance.o:
        prototype.color = CONFIG.PARANOIA.SecurityClearanceColors.Orange;
        break;
      case SecurityClearance.y:
        prototype.color = CONFIG.PARANOIA.SecurityClearanceColors.Yellow;
        break;
      case SecurityClearance.g:
        prototype.color = CONFIG.PARANOIA.SecurityClearanceColors.Green;
        break;
      case SecurityClearance.b:
        prototype.color = CONFIG.PARANOIA.SecurityClearanceColors.Blue;
        break;
      case SecurityClearance.i:
        prototype.color = CONFIG.PARANOIA.SecurityClearanceColors.Indigo;
        break;
      case SecurityClearance.v:
        prototype.color = CONFIG.PARANOIA.SecurityClearanceColors.Violet;
        break;
      case SecurityClearance.u:
        prototype.color = CONFIG.PARANOIA.SecurityClearanceColors.Ultraviolet;
        prototype.effects = 2;
        break;
      default:
        prototype.color = CONFIG.PARANOIA.SecurityClearanceColors.Infrared;
        break;
    }

    return prototype;
  }

  triggerLoseItDynamicRingEffect() {
    console.log(foundry.canvas.tokens.TokenRing);
    let dynamicTokenData = this.buildDynamicTokenRingData(this.system.securityClearance);
    this.getActiveTokens().forEach(token => {
      console.log('updating token for character losing it');
      token.ring.flashColor(dynamicTokenData.color, {
        duration: 750,
        easing: this.easeFourPeaks
      });
    });
  }

  sendLosingItMessage() {
    ChatMessage.create({
      speaker: { actor: this },
      content: "I'm LOSING IT!",
    });
  }

  easeFourPeaks(t) {
    return Math.sin(t * Math.PI * 3);
  }

  getAbilityShorthand(abilityName) {
    switch (abilityName) {
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

  updateSecurityClearanceFromName(name, systemData) {
    if (/.*-[R,r,O,o,Y,y,G,g,B,b,I,i,V,v,u,U]-.*/.test(name)) {
      systemData.securityClearance = this.extractSecurityClearance(name);
    }
    else {
      systemData.securityClearance = 0;
    }
  }

  extractSecurityClearance(value) {
    const nameParts = value.split('-');

    const securityCharacter = nameParts[1].toLowerCase();
    const clearance = SecurityClearance[securityCharacter];
    return clearance;
  }
}
