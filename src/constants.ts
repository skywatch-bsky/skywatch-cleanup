import { Checks } from "./types.js";
import { MOD_DID } from "./config.js";

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

// Helper function to get moderation headers
export const getModHeaders = () => ({
  encoding: "application/json",
  role: "moderator",
  "atproto-proxy": `${MOD_DID!}#atproto_labeler`,
  "atproto-accept-labelers": "did:plc:ar7c4by46qjdydhdevvrndac;redact", // Example DID, adjust if needed
});

export const PROFILE_CHECKS: Checks[] = [
  {
    label: "follow-farming",
    comment: "Follow farming hashtags found profile",
    description: true,
    displayName: true,
    reportAcct: false,
    commentAcct: false,
    toLabel: true,
    check: new RegExp(
      "blueskyfollower\.com|#ifbap|#socialistsunday|#follow4follow|#followback|#bluecrew|#donksfriends|#nodemunder[0-9]+?k|#megaboost|#donkpack|#donkparty|#bluestorm(?:boosts|friends)|#fbr(?:e)?|#fbrparty|#fbarmy|#donkconnects|#ifollowback|#FreeDonk|Follow Party|#BlueResisters|#BlueCrewBoosts?[0-9]*|#BlueStormComin1|💙Vetted RESISTERS🦋|Follow Back Pack",
      "i",
    ),
  },
  {
    label: "blue-heart-emoji",
    comment: "💙 found in profile",
    description: true,
    displayName: true,
    reportAcct: false,
    commentAcct: false,
    toLabel: true,
    check: new RegExp(
      "💙🌊|🌊💙|💙{2,}|(?<=#Resist|#Bluecrew|#bluecrew|#donksfriends|#socialistsunday|#nodemunder1k|#nodemunder5k|#nodemunder10k|#megaboost|#donkpack|#donkparty|#bluestormboosts|#fbr|#fbpe|#bluestormfriends|#fbrparty|#fbarmy|#donkconnects|#fbrparty|🚫 MAGA).*?💙|💙.*?(?=#Resist|#Bluecrew|#bluecrew|#donksfriends|#socialistsunday|#nodemunder1k|#nodemunder5k|#nodemunder10k|#megaboost|#donkpack|#donkparty|#bluestormboosts|#fbr|#fbpe|#bluestormfriends|#fbrparty|#fbarmy|#donkconnects|#fbrparty|🚫 MAGA)",
      "u",
    ),
    whitelist: new RegExp(
      "(💖|💗|🩷)💜💙|💚💙|💙🤍🕊|☂💙|🩵🩷🤍🩷🩵|💙🩷🤍🩷💙|💙💜(💖|💗|🩷|❤️)|(🤍)?💛💙|💙📚|💙⚾️|⚾️💙",
      "u",
    ),
    ignoredDIDs: [
      "did:plc:knoepjiqknech5vqiht4bqu6", // buffer.com
      "did:plc:nostcgoz3uy27lco4gqr62io", // Not using hearts for political reasons
      "did:plc:eh7qf2qmtt4kv54evponoo6n", // Used as part of a large bi-flag
      "did:plc:5sxudf4p3inc7zwecaivoiwu", // Bailey is not the type we need to label
      "did:plc:pb55xcxhvzkpbjxh4blel63z", // KCRoyals Fan
      "did:plc:ujxivyygagxhi72ximqsne2h", // Seams to be real
    ],
  },
  {
    label: "suspect-inauthentic",
    comment: "Account is suspected to be inauthentic or spammy. Please review.",
    description: true,
    displayName: true,
    reportAcct: false,
    commentAcct: false,
    toLabel: true,
    check: new RegExp(
      "💘📲 👉👌|[0-9]{1,2}((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|(j|f|m|a|s|o|n|d))[0-9]{2,4}\\.bsky\\.social|getallmylinks\\.com/(alexxmini|eviepie|camisosa|cuteyalex|alexiaarmaniii|janeyy|yourbella|urjane|onlylara|lliiyy[0-9]*?|lilyscottx|janesworld|sarahheree[0-9]*?|bellasdream|amberbunnyxx|anatoom|cutexjaney|arianaslavens1sb|faykatz|freeliz)|snipfeed\\.co/(jaxtravis)|hoo\\.be/(marcroseonly)|saweria\\.co/(coltliqekajaya)|linktr\\.ee/(marcroseof|yourfavlegs|diazchat|dianadickzzy)|instagram\\.com/(pixiexbelle|thatsmolpotatoxx|lizz.mlst)|planoly\\.store/(chloeeadams[0-9]*?)|(didunddkjd|alycemi|alessakiss83|faykatz|laurenbabygirl|babyalexis|vortexdancer|aigc-island-?[a-z0-9]+?|maggystn)\\.bsky\\.social|beacons\\.ai/(dianadicksy|dianadickzzy)|(lolizy|liizzyyyy|lizzikissi|janeangel|ALEXsWOrld|CUTeyBELLa|shinyalex).carrd.co|onlyfans\\.com/(aliceeeeeeeeeeeeee|avafiery|kawaiilavina)|bit\\.ly/([a-zA-Z]+?nora[a-zA-Z]+?|[a-zA-Z]+?naomi[a-zA-Z]+?)|t\\.me/(thaliaballard|Goon_mommi)|is\\.gd/((aleksandriaqt|alexithaqt|lexieqt|lara)[0-9]{1,4}|19 💕 your dream girl 🍓 spicy|alexx.crd.co|18 🌷 Your lil dream girl 😇 FREE OF ⤵️|Blessica Blimpton|tiny\\.cc/jessica[0-9]{3,}|tinyurl\\.com/xsarahCM8N)|ishortn\\.ink/(Princes{1,3}Lily{1,3})[0-9]{1,4}|mypages\\.life/(Arianna-try-[0-9]{1,4})|lilyslittlesecret\\.life|lilyspicypage\\.life|lizzyyy\\.short\\.gy|sasoa\\.short\\.gy|linktomy\\.site/onlyfans/georgia|38d.gs/.+|antimagaclub\\.com",
      "i",
    ),
    ignoredDIDs: [
      "did:plc:k6iz3efpj4prqkincrejjkew", // Keeps getting flagged for no discernable reason"
      "did:plc:445avk3am7zpwlrj7aop746e", // False Positive,
    ],
    starterPacks: [
      "at://did:plc:wedvauzlurzle6nld7jgqtvr/app.bsky.graph.list/3lfgzid6xnc22",
    ],
  },
  {
    label: "troll",
    comment: "Troll language found in profile",
    description: true,
    displayName: true,
    reportAcct: false,
    commentAcct: false,
    toLabel: true,
    check: new RegExp(
      "only[ -]?(two|2)[ -]?genders?|genders?[ -]?only[ -]?2|[o0]n[l1]y ?([t7][wvv][o0]|2) ?[g9][e3][n][d][e3][r][s5]?|groyper|kiwi-?farms?|blueskycuck|[o0]n[l1]y([t7][wvv][o0]|2)[g9][e3][n][d][e3][r][s5]?|raypist|grayper|graypist|soyjack\\.party|soyjack\\.st|soybooru\\.com|archive\\.soyjack\\.st|rdrama\\.net|watchpeopledie\\.tv|kiwifrms\\.st|jewhater|jewhater[0-9]+|soyjak|troonjak|kamalasu(cks|x)|p[e3]d[o0]hunter|watchpeopledie\\.tv|reportgod\\.group|Transwomen are (male|men)|Humans cannot change sex|🚫[ #]*illegals|jointhe41percent-[0-9]+|gabzzzsatan|ni[a-zA-Z0-9]+rni[a-zA-Z0-9]+r|lgb✂️tq|rightmemenews\\.com|[nh]ate ?[nh]iggers?|MAGA Colony|Bluecry",
      "i",
    ),
    whitelist: new RegExp("(anti|[🚫]|DNI)[ -:]?groyper", "i"),
    ignoredDIDs: [
      "did:plc:lmuoejh44euyubyxynofwavg", //Has "Anti-Groyper" in their profile and this was getting flagged before I refactored the whitelist regex.
    ],
  },
  {
    label: "maga-trump",
    comment: "MAGA/Trump support found in displayName.",
    description: false,
    displayName: true,
    reportAcct: false,
    commentAcct: false,
    toLabel: true,
    check: new RegExp(
      "#(MAGA|MAHA)\\b|#Trump ?2024🇺🇸?|((real|president|king|queen)? ?(barron|donald|eric|ivan(k)?a|tiffany|melenia) ?(john|j)? ?((trump)( |, )?(jr)?))|(proud|king)magat?|(trump ?(20(24|28|32|36|48)|(45|46|47|4547)|maga|god|jesus|lord|[0-9]{2,4}))|potus(45|46|47)|ultramagat?|maga [0-9]{2,4}|(trump ?(is)? ?(my|your)? ?(king|maga|train|daddy|army|nation|world))",
      "i",
    ),
    whitelist: new RegExp(
      "(#?(?<=Never|Fuck|anti|🚫|DNI))[ -:]{0,2}((#)?(Donald[ -:]?)?Trump|MAGA(t)?|DJT)|#?((Donald)?[ -:]?Trump[ -:]?Hater|magazine|stop[ -:]?project[ -:]?2025)",
      "iu",
    ),
    ignoredDIDs: [
      "did:plc:6rah3qput4aol2iu2ecaglhm", //Squirrel Turd
      "did:plc:6nqex5psu2kg2yzqhzhq6d7b", //Brown Eyed Girl
      "did:plc:56bp6c77m2hlpa2deyi3cofa", //Parody Account
      "did:plc:ivyqb4avgscxb5qemod7sc3v", //Not Easily Handled in RegExp
      "did:plc:py7rpklh3yq26kx6dnsjsptd", //Not Easily Handled in RegExp
      "did:plc:zrepwyn5mdnekohyjvdk5ow3", //Not Easily Handled in RegExp
      "did:plc:4d5vewhn67xvdnzrhbmrqiul", //Not Easily Handled in RegExp
      "did:plc:iwb2gvhsevkvoj4kyycjudjh", //Not Easily Handled in RegExp
      "did:plc:yrhmtlcffcnpbiw3tx74kwzz", // NC Town Crier cries too much about this shit
      "did:plc:izhxao5rdfmmaho532pf3c33", // Gag account
      "did:plc:omwssnbnwy3lse5decneobbr", // Parody - Obnoxious but parody
    ],
  },
  {
    label: "maga-trump",
    comment: "MAGA/Trump support found in description.",
    description: true,
    displayName: false,
    reportAcct: false,
    commentAcct: false,
    toLabel: true,
    check: new RegExp(
      "#(MAGA|MAHA)\\b|#Trump ?2024🇺🇸?|#Trump20(24|28|32|36|48)|(proud|king)magat?|(trump ?(20(24|28|32|36|48)|(45|46|47|4547)|maga|god|jesus|lord|[0-9]{2,4}))|potus(45|46|47)|ultramagat?|maga [0-9]{2,4}|(trump ?(is)? ?(my|your)? ?(king|maga|train|daddy|army|nation|world))",
      "i",
    ),
    whitelist: new RegExp(
      "(#?(?<=Never|Fuck|anti|🚫|DNI))[ -:]{0,2}((#)?(Donald[ -:]?)?Trump|MAGA(t)?|DJT)|#?((Donald)?[ -:]?Trump[ -:]?Hater|magazine|stop[ -:]?project[ -:]?2025)",
      "iu",
    ),
    ignoredDIDs: [
      "did:plc:6rah3qput4aol2iu2ecaglhm", //Squirrel Turd
      "did:plc:6nqex5psu2kg2yzqhzhq6d7b", //Brown Eyed Girl
      "did:plc:56bp6c77m2hlpa2deyi3cofa", //Parody Account
      "did:plc:ivyqb4avgscxb5qemod7sc3v", //Not Easily Handled in RegExp
      "did:plc:py7rpklh3yq26kx6dnsjsptd", //Not Easily Handled in RegExp
      "did:plc:zrepwyn5mdnekohyjvdk5ow3", //Not Easily Handled in RegExp
      "did:plc:4d5vewhn67xvdnzrhbmrqiul", //Not Easily Handled in RegExp
      "did:plc:iwb2gvhsevkvoj4kyycjudjh", //Not Easily Handled in RegExp
      "did:plc:yrhmtlcffcnpbiw3tx74kwzz", // NC Town Crier cries too much about this shit
      "did:plc:izhxao5rdfmmaho532pf3c33", // Gag account
      "did:plc:omwssnbnwy3lse5decneobbr", // Parody - Obnoxious but parody
    ],
  },
];
