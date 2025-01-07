import { Checks } from "./types";

export const ReportCheck = new RegExp(
  "dobolen\\.eu\\.org|onlyfans\\.com|.*getallmylinks\\.com.*|(spam|spammer) bot|porn|sexual|Prostitution|Trafficking|CSAM|OnlyFans ⤵️|impersonation",
  "iu",
);

export const LabelCheck = ["suspect-inauthentic"];

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
