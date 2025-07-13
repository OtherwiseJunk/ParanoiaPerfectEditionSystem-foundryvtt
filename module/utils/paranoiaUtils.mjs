export function flagLevelToDescription(flagLevel) {
    switch (flagLevel) {
      case 4:
        return "Wanted Enemy of The Computer and Alpha Complex"
      case 3:
        return "Citizen-Of-Interest"
      case 2:
        return "Restricted Citizen"
      case 1:
        return "Greylisted Citizen"
      case 0:
        return "Loyal Citizen of Alpha Complex"
    }
  }

export function healthLevelToDescription(healthLevel) {
    switch (healthLevel) {
      case 4:
        return "Fine";
      case 3:
        return "Hurt";
      case 2:
        return "Injured";
      case 1:
        return "Maimed";
      case 0:
        return "Dead";
    }
  }