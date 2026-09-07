import {
  civicWatchlist,
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
console.log("grouping-heuristic-check ok");
