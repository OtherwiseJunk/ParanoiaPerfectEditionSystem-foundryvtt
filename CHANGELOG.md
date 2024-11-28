## v0.6.1

Fix issue with blank fields not being able to be editted.
Add new display for Friend Computer Dice Result.
Make text messages look a bit more like character sheet.

## v0.6.0

Add success count to roll results. This involved a refactor of the rolling logic, so if you notice any edge case failures please create a bug report on the github!

## 0.5.1

Fix issue with item sheet by simplifying sheet

## 0.5.0

Modifies the look and feel of the troubleshooter sheet.
Adds Equipment Sheet (Currently troubleshooters cannot add these items to a gear list)
Adds NPC sheets for Accomplices, Somebodies, and Nobodies

## 0.4.2

Use ProseMirror instead of text areas in most areas of the troubleshooter sheet
Display Computer Dice results even when FriendComptuer doesn't take notice of the troubleshooter.

Bump maximum version to FoundryVTT 12. Mininal testing has been performed, so please report any issues!

## 0.4.1

Fixes a bug caused by too many lines of text being present in the Naughty side of the character sheet that would prevent the dice roller on the productivity profile from working.

## 0.4.0

Derives the character's security clearance based on their name, assuming it meets the expected format.

We expect names to be in the format of `<FirstName>-<Security Clearance Letter>-<Sector>`, following the regex of `/.*-[R,r,O,o,Y,y,G,g,B,b,I,i,V,v]-.*/`.

If we are able to successfully derive security clearance, we assign the actor's securityClearance value to the appropriate value

R (Red):2
O (Orange):3
Y (Yellow):4
G (Green):5
B (Blue):6
I (Indigo):7
V (Violet):8

If we're unable to derive the security clearance, we assume the actor is infrared and assign them a value of 1.

This value is now used in initiative "rolls", replacing the formula with whatever value of security clearance we identify for the actor.

These values also can be used in macros if desired, with either `@securityClearance` or `@sec`.

## 0.3.0

Makes it easier to reference troubleshooter Stats/Skills when sending a /roll message or similar.

`@brains`(`@brn`)
`@chutzpah`(`@chtz`)
`@mechanics`(`@mec`)
`@violence`(`@vio`)
`@alphacomplex`
`@bureaucracy`
`@psychology`
`@science`
`@bluff`
`@charm`
`@intimidate`
`@stealth`
`@demolitions`
`@engineer`
`@operate`
`@program`
`@athletics`
`@guns`
`@melee`
`@throw`

## 0.2.1

Remove animation from Friend Computer eye when the computer takes notice of a troubleshooter.
