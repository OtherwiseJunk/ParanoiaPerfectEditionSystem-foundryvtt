import { SecurityClearance } from "./actor.mjs";

export class ParanoiaTokenDocument extends TokenDocument {
    static buildPrototypeTokenData(securityClearance) {
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
}
