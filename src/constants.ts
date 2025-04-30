import { Checks } from "./types.js";

export const ReportCheck = new RegExp("CSAM|OnlyFans", "i");

export const LabelCheck = ["suspect-inauthentic", "impersonation"];

export const POST_CHECKS: Checks[] = [
  {
    label: "suspect-inauthentic",
    comment: "Labeling for suspect inauthentic behavior cited in report.",
    reportOnly: false,
    commentOnly: false,
    check: new RegExp("luxuryhousezone\\.com|3sblog\\.com", "i"),
  },
];

export const IGNORED_DIDS = [
  "did:plc:2wn25i3xa725wwpfaffqg3vk", // Monica C. Camacho
  "did:plc:ocsbmyulc2grbq3esflddyj6", // rahaeli
];

import { CheckList, List } from "./types.js";

export const LISTS: List[] = [
  {
    label: "suspect-inauthentic",
    rkey: "3lcm6ypfdj72r",
  },
];

export const CHECKLISTS: CheckList[] = [
  {
    did: "did:plc:d7nr65djxrudtdg3tslzfiyr",
    rkey: "3lcm6ypfdj72r",
  },
];
