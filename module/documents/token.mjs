import { SecurityClearance } from "./actor.mjs";

export class ParanoiaTokenDocument extends TokenDocument {

    prepareData() {
        super.prepareData();
        console.log(this);
        this.setSecurityClearanceColor(this.actor.system.securityClearance);
    }


    setSecurityClearanceColor(securityClearance){
        if(!this.ring.enabled){
            this.ring.enabled = true;
            this.ring.subject.scale = 0.8;
        }

        switch(securityClearance){
            case SecurityClearance.r:
                this.ring.colors.ring = CONFIG.PARANOIA.SecurityClearanceColors.Red;
                break;
            case SecurityClearance.o:
                this.ring.colors.ring = CONFIG.PARANOIA.SecurityClearanceColors.Orange;
                break;
            case SecurityClearance.y:
                this.ring.colors.ring = CONFIG.PARANOIA.SecurityClearanceColors.Yellow;
                break;
            case SecurityClearance.g:
                this.ring.colors.ring = CONFIG.PARANOIA.SecurityClearanceColors.Green;
                break;
            case SecurityClearance.b:
                this.ring.colors.ring = CONFIG.PARANOIA.SecurityClearanceColors.Blue;
                break;
            case SecurityClearance.i:
                this.ring.colors.ring = CONFIG.PARANOIA.SecurityClearanceColors.Indigo;
                break;
            case SecurityClearance.v:
                this.ring.colors.ring = CONFIG.PARANOIA.SecurityClearanceColors.Violet;
                break;
            case SecurityClearance.u:
                this.ring.colors.ring = CONFIG.PARANOIA.SecurityClearanceColors.Ultraviolet;
                break;
            default:
                this.ring.colors.ring = CONFIG.PARANOIA.SecurityClearanceColors.Infrared;
                break;
        }
    }
}