import {
  civicWatchlist,
  draftGroupingHints,
  groupingCandidates,
  preferredGroupingAccountName,
} from "../src/lib/portal/grouping.ts";

const mckeeAccount = "acct-mckee";
const mckee = [
  {
    id: "bunkie",
    account_id: mckeeAccount,
    first_name: "Brenden",
    last_name: "McKee",
    email: "brendenmckee255@gmail.com",
    lanvac_account_code: "O5985",
    lanvac_city: "Haliburton",
  },
  {
    id: "house",
    account_id: mckeeAccount,
    first_name: "House",
    last_name: "McKee",
    email: "brendenmckee255@gmail.com",
    lanvac_account_code: "O4964",
    lanvac_city: "Haliburton",
  },
];

const sameEmailApart = [
  { ...mckee[0], account_id: "acct-a" },
  { ...mckee[1], account_id: "acct-b" },
];

const sameName = [
  {
    id: "a",
    account_id: "acct-1",
    first_name: "Test County Shop",
    last_name: "",
    email: "a@example.com",
    lanvac_account_code: "X1",
    lanvac_city: null,
  },
  {
    id: "b",
    account_id: "acct-2",
    first_name: "Test County Shop",
    last_name: "",
    email: "b@example.com",
    lanvac_account_code: "X2",
    lanvac_city: null,
  },
];

const junk = [
  {
    id: "j1",
    account_id: "acct-j1",
    first_name: "NEW",
    last_name: "CUSTOMER",
    email: "j1@example.com",
    lanvac_account_code: "J1",
    lanvac_city: null,
  },
  {
    id: "j2",
    account_id: "acct-j2",
    first_name: "NEW",
    last_name: "CUSTOMER",
    email: "j2@example.com",
    lanvac_account_code: "J2",
    lanvac_city: null,
  },
];

const civic = [
  {
    id: "c1",
    account_id: "acct-c1",
    first_name: "Dysart Library",
    last_name: "",
    email: null,
    lanvac_account_code: "L1",
    lanvac_city: "Dysart",
  },
];

function assert(ok, message) {
  if (!ok) throw new Error(message);
}

assert(groupingCandidates(mckee, []).length === 0, "already-together McKee must not suggest");
assert(civicWatchlist(mckee).length === 0, "McKee names are not civic");
assert(
  groupingCandidates(sameEmailApart, []).some((row) => row.kind === "same_email"),
  "apart same email must suggest",
);
assert(
  groupingCandidates(sameName, []).some((row) => row.kind === "same_name"),
  "same name must suggest",
);
assert(
  groupingCandidates(junk, []).every((row) => row.kind !== "same_name"),
  "NEW CUSTOMER must not same-name group",
);
assert(civicWatchlist(civic).length === 1, "civic watchlist keeps library");
assert(
  preferredGroupingAccountName(
    [
      { account_id: "acct-mckee" },
      { account_id: "acct-new" },
    ],
    new Map([
      ["acct-mckee", 2],
      ["acct-new", 1],
    ]),
    new Map([
      ["acct-mckee", "McKee"],
      ["acct-new", "Other"],
    ]),
  ) === "McKee",
  "prefers existing multi-site account name",
);

const mckeeNamed = mckee.map((site) => ({ ...site, account_name: "McKee" }));
const mckeeCounts = new Map([[mckeeAccount, 2]]);
const nameHints = draftGroupingHints(
  { firstName: "Brenden", lastName: "McKee", email: "" },
  mckeeNamed,
  mckeeCounts,
);
assert(
  nameHints.some((hint) => hint.kind === "same_name" && hint.accountId === mckeeAccount),
  "typed McKee name must hint the existing account",
);
assert(
  draftGroupingHints(
    { firstName: "Brenden", lastName: "McKee", email: "" },
    mckeeNamed,
    mckeeCounts,
    { ignoreAccountId: mckeeAccount },
  ).every((hint) => hint.kind !== "same_name"),
  "Add site on the same account must not self-hint",
);
assert(
  draftGroupingHints(
    { firstName: "Other", lastName: "Person", email: "brendenmckee255@gmail.com" },
    mckeeNamed,
    mckeeCounts,
  ).some((hint) => hint.kind === "same_email" && hint.siteCount === 2),
  "typed same email must hint the multi-site account",
);
assert(
  draftGroupingHints(
    { firstName: "Brenden", lastName: "McKee", email: "brendenmckee255@gmail.com" },
    mckeeNamed,
    mckeeCounts,
  ).some((hint) => hint.kind === "same_name_email" && hint.accountId === mckeeAccount),
  "same name and email on one account must merge into one hint",
);
assert(
  draftGroupingHints(
    { firstName: "Dysart", lastName: "Library", email: "" },
    [],
    new Map(),
  ).some((hint) => hint.kind === "civic" && !hint.accountId),
  "civic draft name is review-only",
);
assert(
  draftGroupingHints(
    { firstName: "NEW", lastName: "CUSTOMER", email: "" },
    junk,
    new Map([
      ["acct-j1", 1],
      ["acct-j2", 1],
    ]),
  ).every((hint) => hint.kind !== "same_name"),
  "NEW CUSTOMER draft must not same-name hint",
);
assert(
  draftGroupingHints({ firstName: "", lastName: "", email: "" }, mckeeNamed, mckeeCounts).length === 0,
  "empty draft must not hint",
);

console.log("grouping-heuristic-check ok");
