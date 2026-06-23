# Google Ads & SEO Playbook | McKee Security & Audio Systems

> **Domain:** [mckeesecurity.ca](https://mckeesecurity.ca)  
> **Last updated:** 2026-06-23  
> **Status:** 7 campaigns live · Campaign 8 (Audio / Video) setting up · All at **$2.50/day** · Conversion tracking live

This document captures budget plans, campaign structure, setup decisions, and integration steps for Google Ads and related SEO work after the WordPress → Vercel migration. Update this file as campaigns launch and performance data comes in.

---

## Ad credit & budget strategy

### Credit overview

| Item | Detail |
|------|--------|
| **Promo type** | Spend & Get (pay real spend first, then receive credit) |
| **Selected tier** | **Spend CA$600 → get CA$600 in Google Ads credits** ✓ |
| **Why not CA$1,800 → CA$1,200** | Requires **CA$1,800 real spend** to unlock (~6 months at $300/mo; promo windows are often **60 days**, so likely unachievable |
| **Why not CA$3,600 → CA$1,800** | Same issue at 12+ months of spend; lower match rate (50%) |
| **Recommended pace** | **~$600/month** (8 campaigns × $2.50/day) hits CA$600 spend in **~1 month**, then credit funds **~1 more month** |
| **Earlier $300/month plan** | Lower spend stretched learning; current **$2.50/day each** prioritizes hitting promo tier faster |

**Check promo fine print:** deadline to spend CA$600, when credits expire after grant, and whether credits apply to Search only.

### Why $300/month (not $600/month)

Haliburton and cottage country is a **small search market**. At $600/month Google often exhausts high-intent local queries and spends on broader, lower-quality traffic. Two months at $300 allows:

- Learning which keywords and campaigns produce calls and form fills
- Weekly Search Terms review and negative keyword refinement
- Budget shifts toward winners before credit runs out

**Before spending:** confirm whether the credit is flat $600, spend-match ($600 after you spend $600), Search-only vs all networks, and the **use-by date**.

### Platform minimum (Smart Campaigns)

Google’s **lowest daily budget per active campaign is $1.50/day** (~**$45/month** per campaign). You cannot set $1.00/day. Any campaign you turn on must be at least $1.50/day.

**Implication:** Platform minimum is **$1.50/day**, but all McKee campaigns run at **$2.50/day** (~**$75/month** each). Eight campaigns at $2.50 = **~$600/month** total.

### Monthly budget allocation (current: $2.50/day per campaign)

| Campaign | Daily | Monthly | Status / notes |
|----------|-------|---------|----------------|
| **Brand** | **$2.50** | **$75** | **Live** |
| Security & Monitoring | $2.50 | $75 | **Live** |
| Camera Surveillance | $2.50 | $75 | **Live** |
| Starlink Installation | $2.50 | $75 | **Live** |
| Starlink Rental | $2.50 | $75 | **Live** (pause Nov–Apr) |
| Networking & Wi-Fi | $2.50 | $75 | **Live** |
| VoIP Phone Service | $2.50 | $75 | **Live** |
| Home Audio & Video | $2.50 | $75 | **Setting up** (Campaign 8) |
| **Total (all 8 at $2.50/day)** | **$20.00** | **~$600** | Matches CA$600 promo spend tier in ~1 month |

**Current:** Every campaign set to **$2.50/day**. With all 8 active, expect **~$600/month** total spend.

### Seasonal adjustments

| Period | Action |
|--------|--------|
| **May–September** | Starlink Rental on at **$2.50/day**; pause a lower-priority campaign if you need to trim spend |
| **November–April** | Reduce or pause Starlink Rental |
| **Peak cottage season** | Consider extending ad schedule to 6:00 PM on weekdays |

### Expected benchmarks (rural Ontario)

| Metric | Rough range |
|--------|-------------|
| CPC (service keywords) | $3–$12 |
| CPC (brand) | Under $1 |
| CTR (service ads) | 3%+ is solid |
| **Success metric** | Qualified **phone calls + form submissions**, not clicks |

Even **2–5 qualified leads/month** from $300 can justify spend given typical install job values.

---

## Campaign structure (Search only)

**Network:** Google Search only. Disable Display Network and Search Partners initially.  
**Match types:** Paste keywords plain (comma-separated). Set **Phrase match** in Google Ads for service campaigns; **Exact match** for Brand. Avoid Broad until Search Terms are clean.  
**Ad schedule:** Mon–Fri, 8:00 AM–4:00 PM (match business hours).  
**Location:** Use “Presence: people in or regularly in” target areas, not “interest in”.

### Geographic targeting

**Tier 1 (core, highest bids)**  
Haliburton, Minden, Dorset, Wilberforce, Gooderham, Tory Hill, West Guilford, Eagle Lake, Kashagawigamog Lake area

**Tier 2 (expand after 2–3 weeks if budget remains)**  
Lindsay, Fenelon Falls, Bobcaygeon, Bancroft, Maynooth, Apsley, Kinmount, Carnarvon, Huntsville (south/east fringe), Bracebridge (select areas)

**Exclude unless intentional:** Toronto GTA (travel cost usually makes leads unprofitable)

**Starting radius:** ~60–75 km from Haliburton, refine from Search Terms report.

## Creating campaigns (Google Ads admin panel)

Actual screen order when clicking **+ New campaign**. Campaign 1 (Brand) is already live. Use this for **Campaigns 2–8**.

### Wizard screen order

| Step | Screen | What to do |
|------|--------|------------|
| **1** | **What's your campaign objective?** | Select **Leads** |
| **2** | **Use these conversion goals to improve Leads** | **Auto-populated**; appears as soon as you pick Leads. **Do not remove rows.** Verify both account-default goals below, then click **Continue** (dismiss “Get started” popup if shown) |
| **3** | **Select a campaign type** | **Search** for Campaigns 2–8 (see per-campaign table). Campaign 1 was **Performance Max** |
| **3b** | **Select the ways you'd like to reach your goal** *(Search only; appears right under Step 3)* | See table below, then **Continue** |
| **4** | **Ad destination** | “Where should people go after clicking your ads?” → campaign landing URL |
| **5** | **Campaign name** | e.g. `Security & Monitoring` |
| **6** | **Bidding** | **Conversions** · target CPA off · new customers off → **Next** |
| **7** | **Campaign settings** | Networks, Locations, Languages (see below) |
| **8** | **Audience segments** | **None selected** · **Observation** (default) → **Next** |
| **9** | **AI Max for search campaigns** *(if shown)* | **AI Max Off** (see below) |
| **10** | **Keyword and asset generation** *(if shown)* | Paste **Step 10** blurb from the campaign section you are building (2–8 below) → **Generate** or **Skip** |
| **11+** | Budget, ad groups, keywords, RSA, extensions | Budget in **Campaign setup** table · then **Step 10 → Ad group → Ad copy** in campaign section |

### Step 3b: Reach your goal checkboxes (Search only)

Right after you select **Search**, Google shows **“Select the ways you'd like to reach your goal.”** Use the same choices for **every Search campaign** (Campaigns 2–8):

| Checkbox | Select? | Why |
|----------|---------|-----|
| **Website visits** | **Yes ✓** | Sends clicks to your service landing page (`/security`, etc.). Form fills are tracked by your **Website lead form** conversion tag. |
| **Phone calls** | **Yes ✓** | Enables the call button and **Calls from ads** conversion. Use **7054572156**. |
| **Shop visits** | **No** | You are not optimizing for walk-ins to the shop. |
| **Lead form submissions** | **No** | That is Google’s **in-ad** lead form extension, not your site forms. Leave off so all leads go through the website tag or ad call. |

**If Google asks for a URL** after checking Website visits: enter this campaign’s landing page (Campaign 2 → `https://mckeesecurity.ca/security`). Same URL as Step 4.

**If Google asks for a phone number** after checking Phone calls: **7054572156**.

Then click **Continue**.

**Don’t confuse Step 3b checkboxes with Step 2 conversion goals:**

| What Google calls it | Where | What it actually means for McKee |
|----------------------|-------|----------------------------------|
| **Submit lead forms** (conversion goal) | Step 2 · auto-selected | Your **website** contact/quote forms; fires `Website lead form` tag on success ✓ **Keep enabled** |
| **Website visits** (checkbox) | Step 3b | “Send ad clicks to my website”. **required** for website form leads ✓ **Check this** |
| **Lead form submissions** (checkbox) | Step 3b | Google’s **in-ad** form (user never visits mckeesecurity.ca) ✗ **Leave unchecked** |

You **do** want website form leads. That path is: **Website visits ✓** + **Submit lead forms** conversion goal at Step 2. You **do not** want Google’s separate in-ad lead form product, which is what the **Lead form submissions** checkbox enables.

### Conversion goals (auto-selected at Step 2)

When you choose **Leads**, Google pre-selects your **account-default** goals. **Leave both enabled** for every campaign.

| Conversion goal | Source | Value | Notes |
|-----------------|--------|-------|-------|
| **Phone call leads** (account default) | Call from Ads | CA$1,400.00 | Maps to **Calls from ads** conversion |
| **Submit lead forms** (account default) | Website | CA$1,400.00 | Maps to **Website lead form** tag |

**Warning triangle on “1 action”:** Normal until Google marks actions as Recording. Tag Assistant confirmed on form submit. Safe to continue.

You do **not** manually create conversion actions here. You do **not** pick “request quote” vs “contact” on this screen. The **landing URL** (Step 4) defines where ad clicks go; the tag fires on **any** successful lead form site-wide.

### Bidding screen (“What do you want to focus on?”)

| Field | Select | Why |
|-------|--------|-----|
| **Focus** | **Conversions** | Maximise **lead count** (forms + ad calls). Correct for a new/local account. |
| **Not** | ~~Conversion value~~ | Uses $1,400 values for **ROAS** bidding; needs much more volume; revisit in 3–6 months if desired |
| **Target CPA** (optional checkbox) | **Leave unchecked / off** | No cap while learning; add a target after 2–4 weeks if actual CPA stabilises |
| **Target ROAS** (if shown) | **Leave blank** | Only applies to Conversion value; skip |
| **Only bid for new customers** | **Off** (unchecked) | Repeat cottage clients and referrals matter; don’t limit to new-only |
| **Re-engage lapsed customers** | **Off** (greyed out) | Requires a purchase goal; N/A for lead-gen (ignore) |

Resulting strategy: **Maximise conversions** (not Maximise conversion value).

### Campaign settings screen (Networks, Locations, Languages)

Defaults are wrong for local Search campaigns; change **every** Search campaign (2–8) the same way.

#### Networks

| Checkbox | Default | **Change to** |
|----------|---------|---------------|
| **Google search partners network (recommended)** | On | **Off (uncheck)** |
| **Google Display Network (recommended)** | On | **Off (uncheck)** |

Leave only **Google Search** enabled. Partners and Display spend budget outside Search and add junk traffic for install work.

#### Locations

| Field | Default | **Change to** |
|-------|---------|---------------|
| **Location radio** | **Canada** (whole country) | **Custom locations** |
| **Custom target** | - | **Haliburton, Ontario, Canada** · **65 km radius** (~40 mi) |

**How to set custom radius:**

1. Select **Custom locations**.
2. Search **Haliburton, Ontario, Canada** and add it.
3. When prompted for area, choose **Radius** → **65 km** (or **40 mi** if the UI shows miles).
4. Confirm **Target** (not Exclude).

**Tier 1 towns** (alternative to one radius): Haliburton, Minden, Dorset, Wilberforce, Gooderham, Tory Hill, West Guilford, Eagle Lake, Kashagawigamog Lake area, or add individually if you prefer towns over radius.

**Tier 2** (add after 2–3 weeks if budget allows): Lindsay, Fenelon Falls, Bobcaygeon, Bancroft, Maynooth, Apsley, Kinmount, Carnarvon, Huntsville fringe, Bracebridge fringe.

#### Location options (expand below Locations)

| Field | Default | **Change to** |
|-------|---------|---------------|
| **Target** | Presence **or interest** (recommended) | **Presence: People in or regularly in** your included locations |

Do **not** use “Presence or interest”; it shows ads to people merely searching *about* cottage country while living elsewhere.

#### Languages

| Field | Default | **Change to** |
|-------|---------|---------------|
| **Languages** | English | **English only** (ignore **French** suggestion (not your market) |

#### More settings (expand if shown on this screen)

| Setting | Value |
|---------|--------|
| **Ad schedule** | Mon–Fri, **8:00 AM–4:00 PM** (match business hours) |
| **Campaign URL options** | Leave blank |
| **Start / end dates** | Leave open-ended unless pausing seasonally (e.g. Starlink Rental) |

**Why not “Canada”:** Whole-country targeting wastes budget on Toronto, Ottawa, etc.

---

### Audience segments screen

| Field | Default | **Use for Search campaigns 2–8** |
|-------|---------|-------------------------------------|
| **Segments selected** | None | **Leave empty** (do not add segments) at launch |
| **Targeting setting** | **Observation** (recommended) | **Keep Observation** (do **not** switch to Targeting) to Targeting |

**Why skip segments:** Search campaigns target via **keywords + geo**. Observation with no segments collects data without narrowing reach. Add remarketing or in-market segments later if you have volume.

Click **Next** (no segments needed).

---

### AI Max for search campaigns screen

Google may show this **after** audience segments. Defaults are **not** right for McKee Search campaigns.

| Setting | Default | **Change to** | Why |
|---------|---------|---------------|-----|
| **Optimise your campaign with AI Max** | On | **Off** | You chose Search for **keyword control**. AI Max expands matching and overrides tight phrase/exact lists |
| **Text customisation** | On *(if AI Max on)* | **Off** | AI can rewrite ads from your site and generate junk (“security guard company”) |
| **Final URL expansion** | On *(if AI Max on)* | **Off** | Sends clicks to **other pages** on your site. Security ads must stay on `/security`, not homepage or `/apply-now` |
| **Brands** (limit / exclude lists) | 0 / 0 | **Leave as-is** | No brand lists needed at launch |

**Simplest path:** Turn the main **AI Max toggle Off**; sub-options disappear. Click **Next**.

**If you leave AI Max on:** at minimum uncheck **Final URL expansion** and **Text customisation**, and add URL exclusions for `/apply-now` if expansion stays on. Still prefer **AI Max Off** for Campaigns 2–8.

**Optional later:** Revisit AI Max after 4–6 weeks if a campaign has stable conversions and you want Google to test broader queries, not at launch.

---

### Keyword and asset generation screen (Step 10, all Search campaigns)

Google may show **“Get help creating your ad”** after AI Max. This is an **optional AI helper**, not your final ad.

**Do this for every Search campaign (2–8):**

| Field | Action |
|-------|--------|
| **Final URL** | Must match **Ad destination** in that campaign’s wizard table |
| **Describe the product or service** | Paste that campaign’s **Step 10 blurb** (in order below; one unique paragraph per campaign) |
| **Generate vs Skip** | **Generate** for keyword ideas (optional) · **Skip** to enter keywords manually; both OK |
| **After Generate** | Delete bad AI keywords · replace headlines/descriptions with that campaign’s **Ad copy** section |

**Do not** paste the Google Business Profile description for service campaigns (too broad: “Serving Ontario”, mixed services). Save GBP-style copy for **Campaign 1 (Brand)** only.

**Google Business Profile reference** (Brand / general, not for Campaigns 2–8):

> At McKee Security & Audio Systems, we provide customized solutions to protect and enhance your home or business. Serving Ontario with integrity and innovation, we specialize in professional security system installation, smart surveillance, access control, alarm monitoring, and premium audio distribution systems…

Use the **campaign-specific Step 10 blurbs below**, not this paragraph, for Search campaigns 2–8.

**Paste rules:** Full sentences only. No em dashes. Positive framing only (describe what you offer, not what you exclude). Each blurb is unique to that campaign’s service.

---

### Later screens (all Search campaigns)

| Setting | Always choose |
|---------|----------------|
| Business Profile | **Yes**: McKee Security & Audio Systems |
| Google Analytics | **Skip for now** (optional GA4 later) |
| **Bidding focus** | **Conversions** (see Bidding screen above) |
| Network | **Google Search only** (turn off Search Partners and Display |
| **Locations** | **Custom**: Haliburton, ON + ~65 km radius (or Tier 1 towns; see geo section) |
| **Location options (Presence)** | **Presence: People in or regularly in** (change from default “Presence or interest” |
| **Languages** | **English** only (skip French) |
| **Audience segments** | **None** · **Observation** (default) |
| Ad schedule | Mon–Fri, 8:00 AM–4:00 PM |
| Daily budget | **$2.50/day** per campaign (see per-campaign table) |
| Campaign URL options | **Leave blank** |
| Call asset | **7054572156** · Canada · call reporting **On** · **Use account settings (Calls from ads)** |
| Location asset | 4702 County Road 21, Haliburton, ON |
| Brand guidelines | Main `#c91818` · Accent `#000000` · Font **Playfair Display** |

**Ad strength warnings (Limited / Average):** OK to launch. Fill all **15 headlines** and **4 descriptions** per RSA when possible.

**Never select:** Sign up (`/apply-now`, job applications only).

---

## Assets: Performance Max vs Search (read this first)

### Which flow am I in?

| You see this in the wizard | Campaign type | Applies to |
|----------------------------|---------------|------------|
| **Asset group** (headlines + long headlines + images + videos + Signals) | **Performance Max** | Campaign 1 (Brand) only |
| **Ad groups → Keywords → Responsive search ad** | **Search** | Campaigns 2–8 |

**If Security (Campaign 2) shows “Asset group”:** you likely picked **Performance Max** at Step 3. Go **Back** and select **Search**; otherwise you lose keyword control and pay for Display/YouTube too.

---

### Can I copy my Brand asset group into a new campaign?

**No one-click “import asset group from Campaign 1.”** Each campaign builds its own asset group (PMax) or ad group (Search).

**What you CAN reuse without re-uploading:**

| Asset | How to reuse |
|-------|----------------|
| **Logo / images** | **+ Images → Recently used** (same uploads from Brand campaign) |
| **Business name, brand colours, font** | Account **Brand guidelines**; often pre-fill on new PMax campaigns |
| **Call asset, location** | Account-level or copy settings from Brand campaign settings |
| **Sitelinks** | Add at **Account → Assets** once; applies to all campaigns; or re-enter from sitelink table in this doc |
| **Headlines / descriptions** | Copy from this doc or Brand campaign; paste and tweak per service |

**Search campaigns (2–8):** reuse account extensions + copy/paste RSA text from each campaign section below. No separate “asset group” to duplicate.

---

### Performance Max asset group structure (Campaign 1. Brand only)

Use **one asset group** named **`Brand - McKee Security`** (not “Asset Group 1”).

#### 1. Asset group basics

| Field | Value |
|-------|--------|
| **Asset group name** | `Brand - McKee Security` |
| **Final URL** | `https://mckeesecurity.ca/` |

#### 2. Brand guidelines

| Field | Value |
|-------|--------|
| **Business name** | `McKee Security` (25 char max) |
| **Logos** | Upload `logo.png` from site; reuse **Recently used** if already uploaded |
| **Colours** | Main `#c91818` · Accent `#000000` |
| **Font** | Playfair Display |

#### 3. Text assets (minimum to unlock Search preview)

| Asset type | Min required | Limits | Brand campaign copy |
|------------|--------------|--------|---------------------|
| **Headlines** | 3 required | **15** max · **30** chars each | See Campaign 1 headlines below |
| **Long headlines** | 1 required | **5** max · **90** chars each | `McKee Security and Audio Systems. Local install and support in Haliburton since 1994.` |
| **Descriptions** | 2 required | **4** max · **90** chars each (PMax) | Use Campaign 1 descriptions #1–#4 below |

#### 4. Images & video

| Asset | Action |
|-------|--------|
| **Images** | **+ Images → Recently used**; pick logo/install photos already uploaded · add 1–2 hero shots if needed |
| **Videos** | **Skip** unless you have a short clip |

#### 5. Sitelinks (replace AI suggestions)

Delete AI junk (**Apply Now**, **Project Gallery**). Use the **6 sitelinks table** in this doc (core services, no Starlink Install).

#### 6. Call to action

| Setting | Value |
|---------|--------|
| **Call to action** | **Automated** (default OK) |

#### 7. Asset optimisation

| Setting | Recommendation |
|---------|------------------|
| **Text customisation** | On (default OK) |
| **Final URL expansion** | **Off** for Brand if offered; keep traffic on homepage |
| **Automatically created assets** | Review; remove bad auto headlines (“Security Guard Company”) |

#### 8. Signals

| Field | Value |
|-------|--------|
| **Search themes** | Paste Brand keywords (comma-separated): `mckee security, mckee security haliburton, mckee security and audio, mckeesecurity, mckee security & audio systems` |
| **Audience signal** | Optional; skip for now or **Add saved audience signal** if you create one later |
| **Audience name** | Optional; e.g. `Haliburton service area` to save for reuse |

---

### Search campaign structure (Campaigns 2–8)

No asset group. Structure each campaign like this:

#### 1. Ad group

| Field | Campaign 2 example |
|-------|-------------------|
| **Ad group name** | `Security Systems` |
| **Default bid** | Leave to campaign bidding (Maximise conversions) |

#### 2. Keywords

Paste keywords from each campaign’s **Keywords** line below (one line, comma-separated). After paste, set **Phrase match** for service campaigns or **Exact match** for Brand.

#### 3. Responsive search ad (RSA)

| Asset | Min | Max | Character limit |
|-------|-----|-----|-----------------|
| **Headlines** | 3 required | **15** max | **30** each · **no phone numbers** · add all 15 from campaign section |
| **Descriptions** | 2 required | **4** max | **90** each · add all 4 from campaign section |
| **Final URL** | - | - | Campaign landing page (e.g. `/security`) |
| **Display path** | Optional | 2 paths | e.g. `Security` / `Haliburton` |

Copy all **15 headlines** and **4 descriptions** from each campaign section. Pinning optional; skip unless testing specific messages.

#### 4. Campaign extensions (same for all Search campaigns)

Add at campaign level or use **account-level assets** (set once, applies everywhere):

| Extension | Value |
|-----------|--------|
| **Call** | 7054572156 · call reporting On · account settings |
| **Location** | 4702 County Road 21, Haliburton, ON |
| **Sitelinks** | See **Sitelinks** table in each campaign section (6 per campaign) |

#### 5. Search themes / Signals

**Not used on Search campaigns**; keywords in the ad group replace Signals.

---

### Sitelink extensions

Limits: **25** chars sitelink text · **35** chars per description line.

| Where to add | When |
|--------------|------|
| **Account → Assets** | Set once; may apply to all campaigns automatically |
| **Campaign wizard / campaign settings** | Use the **Sitelinks** table in each campaign section below |

**Rule:** Do not use a sitelink that points to the **same URL** as that campaign’s ad landing page.

Each campaign section below includes its own **6 sitelinks**. Campaign 1 (Brand) uses the core services table. Campaigns 2–8 cross-link other services plus **Contact Us**.

#### 6 core services (Campaign 1 Brand only)

| # | Sitelink text | Description line 1 | Description line 2 | Final URL |
|---|---------------|-------------------|-------------------|-----------|
| 1 | Security Systems | ULC monitoring. No long contracts. | Installed locally in Haliburton. | `https://mckeesecurity.ca/security` |
| 2 | Camera Surveillance | 4K systems with remote viewing. | Professional NVR installation. | `https://mckeesecurity.ca/camera-surveillance` |
| 3 | Networking & Wi-Fi | UniFi Wi-Fi 7 for home and cottage. | Cell boosters and wireless bridges. | `https://mckeesecurity.ca/networking-cellular-expansion` |
| 4 | Home Audio & Video | Certified Sonos dealer. | Whole-home audio and home theater. | `https://mckeesecurity.ca/audio-video` |
| 5 | VoIP Phone Service | Hosted phone service with Yealink. | Managed porting. Local support. | `https://mckeesecurity.ca/voip-phone-service` |
| 6 | Starlink Rental | Portable kit for cottage or camp. | Roam Max plan. 150ft cable included. | `https://mckeesecurity.ca/starlink-rental` |

**Not on Brand sitelinks:** Starlink Installation (has its own campaign). **Contact Us** is optional on Brand later → `/contact-us`.

#### Reusable sitelink copy (service campaigns 2–8)

| Sitelink text | Description line 1 | Description line 2 | Final URL |
|---------------|-------------------|-------------------|-----------|
| Contact Us | Get a free quote today. | Local Haliburton support. | `https://mckeesecurity.ca/contact-us` |
| Starlink Installation | Professional Gen 3 installs. | No roof penetration mounts. | `https://mckeesecurity.ca/starlink` |

---

## Campaign specs (1–8)

Each campaign below includes **full setup** (objective, type, bidding, goals, network, etc.) plus ad copy and keywords. Shared admin-panel flow summary is at the top of this section.

### Campaign launch order

| Order | Campaign | Daily | When |
|-------|----------|-------|------|
| 1 | Brand | $2.50 | **Live** |
| 2 | Security & Monitoring | $2.50 | **Live** |
| 3 | Camera Surveillance | $2.50 | **Live** |
| 4 | Starlink Installation | $2.50 | **Live** |
| 5 | Starlink Rental | $2.50 | **Live** (pause Nov–Apr) |
| 6 | Networking & Wi-Fi | $2.50 | **Live** |
| 7 | VoIP Phone Service | $2.50 | **Live** |
| 8 | Home Audio & Video | $2.50 | **Setting up now** |

---

### Campaign quick reference

| # | Campaign | Objective | Type | Ad destination | Campaign name | Auto conversion goals |
|---|----------|-----------|------|----------------|---------------|----------------------|
| 1 | Brand | Leads | **Performance Max** (live) | `https://mckeesecurity.ca/` | McKee Security & Audio Systems | Phone call leads + Submit lead forms |
| 2 | Security | Leads | **Search** | `https://mckeesecurity.ca/security` | Security & Monitoring | Phone call leads + Submit lead forms |
| 3 | Cameras | Leads | **Search** | `https://mckeesecurity.ca/camera-surveillance` | Camera Surveillance | Phone call leads + Submit lead forms |
| 4 | Starlink Install | Leads | **Search** | `https://mckeesecurity.ca/starlink` | Starlink Installation | Phone call leads + Submit lead forms |
| 5 | Starlink Rental | Leads | **Search** | `https://mckeesecurity.ca/starlink-rental` | Starlink Rental | Phone call leads + Submit lead forms |
| 6 | Networking | Leads | **Search** | `https://mckeesecurity.ca/networking-cellular-expansion` | Networking & Wi-Fi | Phone call leads + Submit lead forms |
| 7 | VoIP | Leads | **Search** | `https://mckeesecurity.ca/voip-phone-service` | VoIP Phone Service | Phone call leads + Submit lead forms |
| 8 | Audio / Video | Leads | **Search** | `https://mckeesecurity.ca/audio-video` | Home Audio & Video | Phone call leads + Submit lead forms |

---

### How to follow each campaign section (Search 2–8)

Work **top to bottom** within the campaign you are building. Section order matches the wizard:

| Section in this doc | Wizard step |
|---------------------|-------------|
| **Admin panel wizard** | Steps 1–5 (+ 3b) |
| **Campaign setup** | Steps 6–9 (bidding through AI Max; shared rules at top of doc) |
| **Step 10: Keyword and asset generation** | Paste that campaign’s unique blurb |
| **Ad group & responsive search ad** | Ad group name, final URL, display paths |
| **Ad copy & targeting** | **15 headlines** + **4 descriptions** + keywords (final source of truth) |

Steps **3b, 6–9** use the **same settings every time**; documented once under **Creating campaigns**. Only **Ad destination**, **campaign name**, **budget**, **Step 10 blurb**, and **ad copy** change per campaign.

**Campaign 1 (Brand)** uses **Performance Max**; skip Step 10; use **Asset group** instead.

---

### Campaign 1: Brand

**Status:** Live

#### Admin panel wizard (Steps 1–5)

| Step | This campaign |
|------|----------------|
| 1 Objective | **Leads** |
| 2 Conversion goals | **Auto-selected**; leave both account-default rows (see top of doc) |
| 3 Campaign type | **Performance Max** (already live) |
| 4 Ad destination | `https://mckeesecurity.ca/` |
| 5 Campaign name | McKee Security & Audio Systems |
| 6+ | **Asset group** (not Step 10); full spec below |

#### Campaign setup (Steps 6–9 + asset group)

| Setting | Value |
|---------|--------|
| **Bidding focus** | **Conversions** (not Conversion value) |
| **Bidding strategy** | Maximise conversions · **no target CPA** (optional box off) |
| **Conversion goals** | Account default (auto at Step 2; do not change) |
| **Budget** | **$2.50/day · ~$75/mo** |
| **Network** | Performance Max (Search, Display, YouTube, etc.); cannot limit to Search only |
| **Locations** | **Custom**: Haliburton, ON + ~65 km radius (or Tier 1 towns; see geo section) |
| **Location options (Presence)** | **Presence: People in or regularly in** (change from default “Presence or interest” |
| **Languages** | **English** only (skip French) |
| **Signals** (PMax, not audience segments) | Search themes: brand keywords; see **Asset group** section |
| **Ad schedule** | Mon–Fri, 8:00 AM–4:00 PM |
| **Campaign URL options** | Leave blank |
| **Call asset** | **7054572156** · Canada · call reporting **On** · **Use account settings (Calls from ads)** |
| **Location asset** | 4702 County Road 21, Haliburton, ON |
| **Brand guidelines** | Main `#c91818` · Accent `#000000` · Font **Playfair Display** |

**If Brand campaign still targets all of Canada with “Presence or interest”:** update **Settings → Locations** to match rows above.

#### Asset group (Performance Max only)

Full field-by-field spec: see **Assets: Performance Max vs Search** section above.

| Quick reference | Value |
|-----------------|--------|
| **Asset group name** | `Brand - McKee Security` |
| **Final URL** | `https://mckeesecurity.ca/` |
| **Reuse from wizard** | **Recently used** images · account brand guidelines · don’t re-upload logo |

**Asset group description** (if editing the service text field; broader than service campaigns; OK for Brand):

```
McKee Security and Audio Systems provides customized security, surveillance, networking, Starlink, and VoIP for homes and businesses in Haliburton and cottage country, Ontario since 1994. Local professional install and support. Security systems, cameras, Wi-Fi, phone service, and rural internet from one local team.
```

#### Ad copy & targeting

**Remove auto-generated headline:** “Security Guard Company” if it appears (inaccurate for an install company).

**Headlines (add all 15 · 30 characters max · no phone numbers)**

| # | Headline |
|---|----------|
| 1 | McKee Security & Audio Systems |
| 2 | Haliburton Since 1994 |
| 3 | Home & Business Services |
| 4 | Local Install & Support |
| 5 | Free Quote, Call Today |
| 6 | Security & Monitoring |
| 7 | Camera Surveillance |
| 8 | Starlink Installation |
| 9 | Networking & Wi-Fi |
| 10 | VoIP Phone Service |
| 11 | Cottage Country Services |
| 12 | Professional Installs |
| 13 | Serving Haliburton County |
| 14 | Request a Free Quote |
| 15 | McKee Security Haliburton |

**Do not put phone numbers in headlines** (Google editorial policy). Use call extension + `(705) 457-2156` instead.

**Descriptions** (add all 4 · 90 characters max)

| # | Description |
|---|-------------|
| 1 | Call McKee Security in Haliburton for security, cameras, Starlink, Wi-Fi, VoIP, and more. |
| 2 | Since 1994. Local install and support for homes and businesses in Haliburton, Ontario. |
| 3 | Professional security, surveillance, networking, and phone service from one local team. |
| 4 | Get a free quote on home and business installs across Haliburton and cottage country. |

#### Sitelinks (add all 6)

Use the **6 core services** table at the top of this doc (Campaign 1 Brand). Delete AI sitelinks like **Apply Now** or **Project Gallery** if they appear.

| # | Sitelink text | Description line 1 | Description line 2 | Final URL |
|---|---------------|-------------------|-------------------|-----------|
| 1 | Security Systems | ULC monitoring. No long contracts. | Installed locally in Haliburton. | `https://mckeesecurity.ca/security` |
| 2 | Camera Surveillance | 4K systems with remote viewing. | Professional NVR installation. | `https://mckeesecurity.ca/camera-surveillance` |
| 3 | Networking & Wi-Fi | UniFi Wi-Fi 7 for home and cottage. | Cell boosters and wireless bridges. | `https://mckeesecurity.ca/networking-cellular-expansion` |
| 4 | Home Audio & Video | Certified Sonos dealer. | Whole-home audio and home theater. | `https://mckeesecurity.ca/audio-video` |
| 5 | VoIP Phone Service | Hosted phone service with Yealink. | Managed porting. Local support. | `https://mckeesecurity.ca/voip-phone-service` |
| 6 | Starlink Rental | Portable kit for cottage or camp. | Roam Max plan. 150ft cable included. | `https://mckeesecurity.ca/starlink-rental` |

**Extensions:** Call button ✓ · Location ✓ (4702 County Road 21, Haliburton, ON)

**Keywords** (comma-separated)

```
mckee security, mckee security haliburton, mckee security and audio, mckeesecurity, mckee security & audio systems
```

---

### Campaign 2: Security & Monitoring

**Status:** Live

#### Admin panel wizard (Steps 1–5)

| Step | This campaign |
|------|----------------|
| 1 Objective | **Leads** |
| 2 Conversion goals | **Auto-selected**; leave both account-default rows (see top of doc) |
| 3 Campaign type | **Search** |
| 3b Reach your goal | **Website visits** ✓ · **Phone calls** ✓ · Shop visits ✗ · Lead form submissions ✗ |
| 4 Ad destination | `https://mckeesecurity.ca/security` |
| 5 Campaign name | Security & Monitoring |
| 6+ | Shared Steps 6–9 at top of doc · then **Step 10** and **Ad group** below |

#### Campaign setup (Steps 6–9)

| Setting | Value |
|---------|--------|
| **Bidding focus** | **Conversions** (not Conversion value) |
| **Bidding strategy** | Maximise conversions · **no target CPA** (optional box off) |
| **Conversion goals** | Account default (auto at Step 2; do not change) |
| **Budget** | **$2.50/day · ~$75/mo** |
| **Network** | **Google Search only** (turn off Search Partners and Display |
| **Locations** | **Custom**: Haliburton, ON + ~65 km radius (or Tier 1 towns; see geo section) |
| **Location options (Presence)** | **Presence: People in or regularly in** (change from default “Presence or interest” |
| **Languages** | **English** only (skip French) |
| **Audience segments** | **None** · **Observation** (default) |
| **AI Max** | **Off** (text customisation off · final URL expansion off) |
| **Ad schedule** | Mon–Fri, 8:00 AM–4:00 PM |
| **Campaign URL options** | Leave blank |
| **Call asset** | **7054572156** · Canada · call reporting **On** · **Use account settings (Calls from ads)** |
| **Location asset** | 4702 County Road 21, Haliburton, ON |
| **Brand guidelines** | Main `#c91818` · Accent `#000000` · Font **Playfair Display** |
| **Differentiators** | ULC 24/7 monitoring, no long-term contracts, Total Connect, local install |

#### Step 10: Keyword and asset generation

| Field | Value |
|-------|--------|
| **Final URL** | `https://mckeesecurity.ca/security` |
| **Generate or Skip** | Either option works. Then use **Ad copy & targeting** below as final copy |

**Describe the product or service** (paste):

```
Professional security system installation for homes, cottages, and businesses in Haliburton and cottage country, Ontario. Since 1994. ULC 24/7 alarm monitoring, intrusion and environmental detection, no long-term contracts, Total Connect remote app, cellular and landline backup. Local install and support in Haliburton and surrounding areas.
```

**After Generate:** Remove AI keywords like “security guard company”, ADT, Ring DIY. Replace the AI keyword list with the **Keywords** block below. Do not run both full lists.

**AI defaults vs guide keywords:**

| AI suggested (example) | Action |
|------------------------|--------|
| `security`, `total protection`, `motion sensors`, `window alarms`, `window sensors` | **Delete** (too broad or DIY parts shopping) |
| `audio security system`, `cell phone security system` | **Delete** (wrong intent or wrong service) |
| `home alarm systems`, `alarm system with monitoring`, `professional alarm system` | **Included** in guide list below |
| Guide list below | **Use this full set**. Delete all other AI defaults |

**Bulk paste:** One line, commas only between keywords. No quotes, brackets, periods, or line breaks. After paste, set **Phrase match** (service campaigns) or **Exact match** (Brand).

#### Ad group & responsive search ad

| Field | Value |
|-------|--------|
| **Ad group name** | `Security Systems` |
| **Final URL (RSA)** | `https://mckeesecurity.ca/security` |
| **Display path** (optional) | `Security` · `Haliburton` |
| **Headlines** | Add all **15** · **30 chars** max · no phone numbers · see below |
| **Descriptions** | Add all **4** · **90 chars** max · see below |
| **Extensions** | Call + location · see **Sitelinks** below |

**Reuse tip:** Account-level sitelinks/call extensions apply automatically if already set on Brand campaign.

#### Ad copy & targeting

**Headlines (add all 15 · 30 characters max · no phone numbers)**

```
Professional Security Systems
ULC 24/7 Monitoring
No Long-Term Contracts
Haliburton Since 1994
Home Security Installs
Cottage Security Systems
Business Alarm Systems
Total Connect App
Local Install & Support
Smart Home Automation
Cellular Backup Monitoring
Haliburton County Installs
Request a Free Quote
McKee Security Haliburton
Free Quote Today
```

**Descriptions** (RSA ad copy · add all 4 · 90 characters max)

| # | Description |
|---|-------------|
| 1 | ULC monitoring. No long-term contracts. Haliburton installs. |
| 2 | Home and business security installed locally since 1994. |
| 3 | Cottage and seasonal monitoring. Smart home automation. |
| 4 | Wireless and wired systems. Cancel anytime. Free quote. |

**Keywords** (comma-separated)

```
home security system haliburton, security system installation ontario, home alarm installation, home alarm systems, alarm system with monitoring, professional alarm system, commercial security system, business alarm system ontario, ULC monitoring ontario, home security monitoring haliburton, alarm monitoring no contract, cottage security system, cottage alarm monitoring, home automation haliburton, home security haliburton
```

**Avoid auto-generated terms** (comma-separated negatives if the wizard allows): security guard company, guard service, adt, ring diy

#### Sitelinks (add all 6)

Do not add a sitelink to `/security` (same as this campaign’s landing page). Delete AI sitelinks like **Apply Now** or **Project Gallery**.

| # | Sitelink text | Description line 1 | Description line 2 | Final URL |
|---|---------------|-------------------|-------------------|-----------|
| 1 | Camera Surveillance | 4K systems with remote viewing. | Professional NVR installation. | `https://mckeesecurity.ca/camera-surveillance` |
| 2 | Networking & Wi-Fi | UniFi Wi-Fi 7 for home and cottage. | Cell boosters and wireless bridges. | `https://mckeesecurity.ca/networking-cellular-expansion` |
| 3 | VoIP Phone Service | Hosted phone service with Yealink. | Managed porting. Local support. | `https://mckeesecurity.ca/voip-phone-service` |
| 4 | Starlink Rental | Portable kit for cottage or camp. | Roam Max plan. 150ft cable included. | `https://mckeesecurity.ca/starlink-rental` |
| 5 | Home Audio & Video | Certified Sonos dealer. | Whole-home audio and home theater. | `https://mckeesecurity.ca/audio-video` |
| 6 | Contact Us | Get a free quote today. | Local Haliburton support. | `https://mckeesecurity.ca/contact-us` |

**Extensions:** Call button ✓ · Location ✓ · Phone `7054572156`

---

### Campaign 3: Camera Surveillance

**Status:** Live

#### Admin panel wizard (Steps 1–5)

| Step | This campaign |
|------|----------------|
| 1 Objective | **Leads** |
| 2 Conversion goals | **Auto-selected**; leave both account-default rows |
| 3 Campaign type | **Search** |
| 3b Reach your goal | **Website visits** ✓ · **Phone calls** ✓ · Shop visits ✗ · Lead form submissions ✗ |
| 4 Ad destination | `https://mckeesecurity.ca/camera-surveillance` |
| 5 Campaign name | Camera Surveillance |
| 6+ | Shared Steps 6–9 at top of doc · then **Step 10** and **Ad group** below |

#### Campaign setup (Steps 6–9)

| Setting | Value |
|---------|--------|
| **Bidding focus** | **Conversions** (not Conversion value) |
| **Bidding strategy** | Maximise conversions · **no target CPA** (optional box off) |
| **Conversion goals** | Account default (auto at Step 2; do not change) |
| **Budget** | **$2.50/day · ~$75/mo** |
| **Network** | **Google Search only** (turn off Search Partners and Display |
| **Locations** | **Custom**: Haliburton, ON + ~65 km radius (or Tier 1 towns; see geo section) |
| **Location options (Presence)** | **Presence: People in or regularly in** (change from default “Presence or interest” |
| **Languages** | **English** only (skip French) |
| **Audience segments** | **None** · **Observation** (default) |
| **AI Max** | **Off** (text customisation off · final URL expansion off) |
| **Ad schedule** | Mon–Fri, 8:00 AM–4:00 PM |
| **Campaign URL options** | Leave blank |
| **Call asset** | **7054572156** · Canada · call reporting **On** · **Use account settings (Calls from ads)** |
| **Location asset** | 4702 County Road 21, Haliburton, ON |
| **Brand guidelines** | Main `#c91818` · Accent `#000000` · Font **Playfair Display** |
| **Differentiators** | 4K Uniview, AI detection, remote viewing, NDAA compliant NVR |

#### Step 10: Keyword and asset generation

| Field | Value |
|-------|--------|
| **Final URL** | `https://mckeesecurity.ca/camera-surveillance` |
| **Generate or Skip** | Either option works. Then use **Ad copy & targeting** below as final copy |

**Describe the product or service** (paste):

```
4K Uniview camera and CCTV installation for homes, cottages, and businesses in Haliburton and cottage country, Ontario. Since 1994. Professional NVR recording, AI detection, remote viewing via mobile app, NDAA compliant systems. Local install and support from McKee Security.
```

**After Generate:** Remove DIY/retail keywords (`ring`, `nest`, `arlo`, `amazon`). Keep keywords from **Ad copy & targeting** below.

#### Ad group & responsive search ad

| Field | Value |
|-------|--------|
| **Ad group name** | `Camera Surveillance` |
| **Final URL (RSA)** | `https://mckeesecurity.ca/camera-surveillance` |
| **Display path** (optional) | `Cameras` · `Haliburton` |
| **Headlines** | Add all **15** · **30 chars** max · no phone numbers · see below |
| **Descriptions** | Add all **4** · **90 chars** max · see below |
| **Extensions** | Call + location · see **Sitelinks** below |

#### Ad copy & targeting

**Headlines (add all 15 · 30 characters max · no phone numbers)**

```
4K Camera Surveillance
Security Camera Install
Remote Viewing & NVR
Haliburton Since 1994
Uniview Camera Systems
Commercial CCTV Install
Cottage Camera Systems
AI Detection Cameras
NDAA Compliant NVR
Local Install & Support
View Cameras From Phone
Professional NVR Setup
Haliburton CCTV Install
Request a Free Quote
Free Quote Today
```

**Descriptions** (RSA ad copy · add all 4 · 90 characters max)

| # | Description |
|---|-------------|
| 1 | Pro 4K cameras with remote viewing. Installed in Haliburton. |
| 2 | Uniview systems with AI detection. Local install and support. |
| 3 | Cottage and commercial CCTV. See your property from anywhere. |
| 4 | Professional NVR recording. Free quote from McKee Security. |

**Keywords** (comma-separated)

```
cctv installation ontario, security camera installation, surveillance camera installer, security cameras haliburton, cottage security cameras, remote viewing security cameras, 4k security camera system, commercial cctv installation, business security cameras ontario, cctv haliburton
```

**Campaign negatives** (comma-separated)

```
ring, nest, arlo, diy, wireless camera amazon
```

#### Sitelinks (add all 6)

Do not add a sitelink to `/camera-surveillance` (same as this campaign’s landing page). Delete AI sitelinks like **Apply Now** or **Project Gallery**.

| # | Sitelink text | Description line 1 | Description line 2 | Final URL |
|---|---------------|-------------------|-------------------|-----------|
| 1 | Security Systems | ULC monitoring. No long contracts. | Installed locally in Haliburton. | `https://mckeesecurity.ca/security` |
| 2 | Networking & Wi-Fi | UniFi Wi-Fi 7 for home and cottage. | Cell boosters and wireless bridges. | `https://mckeesecurity.ca/networking-cellular-expansion` |
| 3 | VoIP Phone Service | Hosted phone service with Yealink. | Managed porting. Local support. | `https://mckeesecurity.ca/voip-phone-service` |
| 4 | Starlink Rental | Portable kit for cottage or camp. | Roam Max plan. 150ft cable included. | `https://mckeesecurity.ca/starlink-rental` |
| 5 | Home Audio & Video | Certified Sonos dealer. | Whole-home audio and home theater. | `https://mckeesecurity.ca/audio-video` |
| 6 | Contact Us | Get a free quote today. | Local Haliburton support. | `https://mckeesecurity.ca/contact-us` |

**Extensions:** Call button ✓ · Location ✓ · Phone `7054572156`

---

### Campaign 4: Starlink Installation

**Status:** Live

#### Admin panel wizard (Steps 1–5)

| Step | This campaign |
|------|----------------|
| 1 Objective | **Leads** |
| 2 Conversion goals | **Auto-selected**; leave both account-default rows |
| 3 Campaign type | **Search** |
| 3b Reach your goal | **Website visits** ✓ · **Phone calls** ✓ · Shop visits ✗ · Lead form submissions ✗ |
| 4 Ad destination | `https://mckeesecurity.ca/starlink` |
| 5 Campaign name | Starlink Installation |
| 6+ | Shared Steps 6–9 at top of doc · then **Step 10** and **Ad group** below |

#### Campaign setup (Steps 6–9)

| Setting | Value |
|---------|--------|
| **Bidding focus** | **Conversions** (not Conversion value) |
| **Bidding strategy** | Maximise conversions · **no target CPA** (optional box off) |
| **Conversion goals** | Account default (auto at Step 2; do not change) |
| **Budget** | **$2.50/day · ~$75/mo** |
| **Network** | **Google Search only** (turn off Search Partners and Display |
| **Locations** | **Custom**: Haliburton, ON + ~65 km radius (or Tier 1 towns; see geo section) |
| **Location options (Presence)** | **Presence: People in or regularly in** (change from default “Presence or interest” |
| **Languages** | **English** only (skip French) |
| **Audience segments** | **None** · **Observation** (default) |
| **AI Max** | **Off** (text customisation off · final URL expansion off) |
| **Ad schedule** | Mon–Fri, 8:00 AM–4:00 PM |
| **Campaign URL options** | Leave blank |
| **Call asset** | **7054572156** · Canada · call reporting **On** · **Use account settings (Calls from ads)** |
| **Location asset** | 4702 County Road 21, Haliburton, ON |
| **Brand guidelines** | Main `#c91818` · Accent `#000000` · Font **Playfair Display** |
| **Differentiators** | Gen 3 install, no roof penetration, mounting hardware supplied, UniFi optional |

#### Step 10: Keyword and asset generation

| Field | Value |
|-------|--------|
| **Final URL** | `https://mckeesecurity.ca/starlink` |
| **Generate or Skip** | Either option works. Then use **Ad copy & targeting** below as final copy |

**Describe the product or service** (paste):

```
Professional Starlink Gen 3 installation for cottages, rural homes, and businesses in Haliburton and surrounding Ontario. Since 1994. No roof penetration mounts, extended cabling, mounting hardware supplied, optional UniFi network integration. Local installer with ongoing support in Haliburton.
```

**After Generate:** Remove `starlink login`, `speed test`, `diy`, kit purchase keywords. Keep keywords from **Ad copy & targeting** below.

#### Ad group & responsive search ad

| Field | Value |
|-------|--------|
| **Ad group name** | `Starlink Installation` |
| **Final URL (RSA)** | `https://mckeesecurity.ca/starlink` |
| **Display path** (optional) | `Starlink` · `Install` |
| **Headlines** | Add all **15** · **30 chars** max · no phone numbers · see below |
| **Descriptions** | Add all **4** · **90 chars** max · see below |
| **Extensions** | Call + location · see **Sitelinks** below |

#### Ad copy & targeting

**Headlines (add all 15 · 30 characters max · no phone numbers)**

```
Starlink Installation
No Roof Penetration
Cottage Country Installs
Haliburton Since 1994
Professional Starlink
Gen 3 Starlink Install
Rural Internet Install
Extended Cable Runs
Mounting Hardware Included
Pole & Fascia Mounts
Local Starlink Installer
Cottage Starlink Setup
Optional UniFi Network
Haliburton County Installs
Free Quote Today
```

**Descriptions** (RSA ad copy · add all 4 · 90 characters max)

| # | Description |
|---|-------------|
| 1 | Pro Starlink install in Haliburton. We supply mounting gear. |
| 2 | Gen 3 compatible. Extended cables. Optional UniFi integration. |
| 3 | No roof holes. Fascia, gable, and pole mounts. Free quote. |
| 4 | Rural and cottage internet installs across Haliburton County. |

**Keywords** (comma-separated)

```
starlink installation ontario, starlink installer, professional starlink install, starlink installation haliburton, starlink installer cottage country, starlink cottage installation, starlink rural internet install, satellite internet installer ontario, starlink mount no roof penetration
```

**Campaign negatives** (comma-separated)

```
starlink login, starlink account, starlink kit buy, speed test, diy
```

#### Sitelinks (add all 6)

Do not add a sitelink to `/starlink` (same as this campaign’s landing page). Delete AI sitelinks like **Apply Now** or **Project Gallery**.

| # | Sitelink text | Description line 1 | Description line 2 | Final URL |
|---|---------------|-------------------|-------------------|-----------|
| 1 | Security Systems | ULC monitoring. No long contracts. | Installed locally in Haliburton. | `https://mckeesecurity.ca/security` |
| 2 | Camera Surveillance | 4K systems with remote viewing. | Professional NVR installation. | `https://mckeesecurity.ca/camera-surveillance` |
| 3 | Networking & Wi-Fi | UniFi Wi-Fi 7 for home and cottage. | Cell boosters and wireless bridges. | `https://mckeesecurity.ca/networking-cellular-expansion` |
| 4 | VoIP Phone Service | Hosted phone service with Yealink. | Managed porting. Local support. | `https://mckeesecurity.ca/voip-phone-service` |
| 5 | Starlink Rental | Portable kit for cottage or camp. | Roam Max plan. 150ft cable included. | `https://mckeesecurity.ca/starlink-rental` |
| 6 | Contact Us | Get a free quote today. | Local Haliburton support. | `https://mckeesecurity.ca/contact-us` |

**Extensions:** Call button ✓ · Location ✓ · Phone `7054572156`

---

### Campaign 5: Starlink Rental

**Status:** Live · **Seasonal: pause Nov–Apr**

#### Admin panel wizard (Steps 1–5)

| Step | This campaign |
|------|----------------|
| 1 Objective | **Leads** |
| 2 Conversion goals | **Auto-selected**; leave both account-default rows |
| 3 Campaign type | **Search** |
| 3b Reach your goal | **Website visits** ✓ · **Phone calls** ✓ · Shop visits ✗ · Lead form submissions ✗ |
| 4 Ad destination | `https://mckeesecurity.ca/starlink-rental` |
| 5 Campaign name | Starlink Rental |
| 6+ | Shared Steps 6–9 at top of doc · then **Step 10** and **Ad group** below |

#### Campaign setup (Steps 6–9)

| Setting | Value |
|---------|--------|
| **Bidding focus** | **Conversions** (not Conversion value) |
| **Bidding strategy** | Maximise conversions · **no target CPA** (optional box off) |
| **Conversion goals** | Account default (auto at Step 2; do not change) |
| **Budget** | **$2.50/day · ~$75/mo** (pause Nov–Apr) |
| **Network** | **Google Search only** (turn off Search Partners and Display |
| **Locations** | **Custom**: Haliburton, ON + ~65 km radius (or Tier 1 towns; see geo section) |
| **Location options (Presence)** | **Presence: People in or regularly in** (change from default “Presence or interest” |
| **Languages** | **English** only (skip French) |
| **Audience segments** | **None** · **Observation** (default) |
| **AI Max** | **Off** (text customisation off · final URL expansion off) |
| **Ad schedule** | Mon–Fri, 8:00 AM–4:00 PM |
| **Campaign URL options** | Leave blank |
| **Call asset** | **7054572156** · Canada · call reporting **On** · **Use account settings (Calls from ads)** |
| **Location asset** | 4702 County Road 21, Haliburton, ON |
| **Brand guidelines** | Main `#c91818` · Accent `#000000` · Font **Playfair Display** |
| **Differentiators** | Gen2 kit, Roam Max included, 150ft cable, Haliburton pickup |

#### Step 10: Keyword and asset generation

| Field | Value |
|-------|--------|
| **Final URL** | `https://mckeesecurity.ca/starlink-rental` |
| **Generate or Skip** | Either option works. Then use **Ad copy & targeting** below as final copy |

**Describe the product or service** (paste):

```
Starlink rental kits for cottages, campsites, trailers, and events in Haliburton and cottage country, Ontario. Gen2 dish with Roam Max plan, 150ft cable included, pick up and return in Haliburton. Seasonal portable internet is available by inquiry. McKee Security has provided local support since 1994.
```

**After Generate:** Remove purchase/install keywords if mixed in. Keep rental-focused keywords from **Ad copy & targeting** below.

#### Ad group & responsive search ad

| Field | Value |
|-------|--------|
| **Ad group name** | `Starlink Rental` |
| **Final URL (RSA)** | `https://mckeesecurity.ca/starlink-rental` |
| **Display path** (optional) | `Starlink` · `Rental` |
| **Headlines** | Add all **15** · **30 chars** max · no phone numbers · see below |
| **Descriptions** | Add all **4** · **90 chars** max · see below |
| **Extensions** | Call + location · see **Sitelinks** below |

#### Ad copy & targeting

**Headlines (add all 15 · 30 characters max · no phone numbers)**

```
Starlink Rental Ontario
Portable Starlink Rental
Roam Max Plan Included
Pick Up in Haliburton
150ft Cable Included
Cottage Internet Rental
Campsite Starlink Rental
Trailer & Event Internet
Gen2 Dish Included
Seasonal Rental Kits
Haliburton Pickup & Return
Ready To Use Starlink
McKee Security Rental
Check Availability Today
Free Quote Today
```

**Descriptions** (RSA ad copy · add all 4 · 90 characters max)

| # | Description |
|---|-------------|
| 1 | Rent a ready-to-use Starlink kit. 150ft cable included. |
| 2 | Gen2 dish with Roam Max. Pick up and return in Haliburton. |
| 3 | Cottage, campsite, and trailer internet. Check availability. |
| 4 | Fully configured kit from McKee Security. Inquiry for dates. |

**Keywords** (comma-separated)

```
starlink rental ontario, rent starlink, starlink rental cottage, portable starlink rental, starlink for camping ontario, starlink rental haliburton
```

#### Sitelinks (add all 6)

Do not add a sitelink to `/starlink-rental` (same as this campaign’s landing page). Delete AI sitelinks like **Apply Now** or **Project Gallery**.

| # | Sitelink text | Description line 1 | Description line 2 | Final URL |
|---|---------------|-------------------|-------------------|-----------|
| 1 | Security Systems | ULC monitoring. No long contracts. | Installed locally in Haliburton. | `https://mckeesecurity.ca/security` |
| 2 | Camera Surveillance | 4K systems with remote viewing. | Professional NVR installation. | `https://mckeesecurity.ca/camera-surveillance` |
| 3 | Starlink Installation | Professional Gen 3 installs. | No roof penetration mounts. | `https://mckeesecurity.ca/starlink` |
| 4 | Networking & Wi-Fi | UniFi Wi-Fi 7 for home and cottage. | Cell boosters and wireless bridges. | `https://mckeesecurity.ca/networking-cellular-expansion` |
| 5 | VoIP Phone Service | Hosted phone service with Yealink. | Managed porting. Local support. | `https://mckeesecurity.ca/voip-phone-service` |
| 6 | Contact Us | Get a free quote today. | Local Haliburton support. | `https://mckeesecurity.ca/contact-us` |

**Extensions:** Call button ✓ · Location ✓ · Phone `7054572156`

---

### Campaign 6: Networking / Cellular Expansion

**Status:** Live

#### Admin panel wizard (Steps 1–5)

| Step | This campaign |
|------|----------------|
| 1 Objective | **Leads** |
| 2 Conversion goals | **Auto-selected**; leave both account-default rows |
| 3 Campaign type | **Search** |
| 3b Reach your goal | **Website visits** ✓ · **Phone calls** ✓ · Shop visits ✗ · Lead form submissions ✗ |
| 4 Ad destination | `https://mckeesecurity.ca/networking-cellular-expansion` |
| 5 Campaign name | Networking & Wi-Fi |
| 6+ | Shared Steps 6–9 at top of doc · then **Step 10** and **Ad group** below |

#### Campaign setup (Steps 6–9)

| Setting | Value |
|---------|--------|
| **Bidding focus** | **Conversions** (not Conversion value) |
| **Bidding strategy** | Maximise conversions · **no target CPA** (optional box off) |
| **Conversion goals** | Account default (auto at Step 2; do not change) |
| **Budget** | **$2.50/day · ~$75/mo** |
| **Network** | **Google Search only** (turn off Search Partners and Display |
| **Locations** | **Custom**: Haliburton, ON + ~65 km radius (or Tier 1 towns; see geo section) |
| **Location options (Presence)** | **Presence: People in or regularly in** (change from default “Presence or interest” |
| **Languages** | **English** only (skip French) |
| **Audience segments** | **None** · **Observation** (default) |
| **AI Max** | **Off** (text customisation off · final URL expansion off) |
| **Ad schedule** | Mon–Fri, 8:00 AM–4:00 PM |
| **Campaign URL options** | Leave blank |
| **Call asset** | **7054572156** · Canada · call reporting **On** · **Use account settings (Calls from ads)** |
| **Location asset** | 4702 County Road 21, Haliburton, ON |
| **Brand guidelines** | Main `#c91818` · Accent `#000000` · Font **Playfair Display** |
| **Differentiators** | UniFi Wi-Fi 7, mesh, wireless bridges, cellular expansion, structured wiring |

#### Step 10: Keyword and asset generation

| Field | Value |
|-------|--------|
| **Final URL** | `https://mckeesecurity.ca/networking-cellular-expansion` |
| **Generate or Skip** | Either option works. Then use **Ad copy & targeting** below as final copy |

**Describe the product or service** (paste):

```
UniFi Wi-Fi 7, mesh, structured wiring, wireless bridges, and cellular signal expansion for cottages and businesses in Haliburton and cottage country, Ontario. Since 1994. Fix dead zones across properties and outbuildings. Professional local install and support from McKee Security.
```

**After Generate:** Remove retail/ISP bundle keywords. Keep keywords from **Ad copy & targeting** below.

#### Ad group & responsive search ad

| Field | Value |
|-------|--------|
| **Ad group name** | `Networking and Wi-Fi` |
| **Final URL (RSA)** | `https://mckeesecurity.ca/networking-cellular-expansion` |
| **Display path** (optional) | `Networking` · `Wi-Fi` |
| **Headlines** | Add all **15** · **30 chars** max · no phone numbers · see below |
| **Descriptions** | Add all **4** · **90 chars** max · see below |
| **Extensions** | Call + location · see **Sitelinks** below |

#### Ad copy & targeting

**Headlines (add all 15 · 30 characters max · no phone numbers)**

```
UniFi Wi-Fi Installs
Cottage Country Wi-Fi
Structured Wiring
Cell Signal Boosting
Haliburton Since 1994
UniFi Wi-Fi 7 Installs
Mesh Wi-Fi For Cottages
Wireless Bridge Links
Fix Dead Wi-Fi Zones
Multi-Building Wi-Fi
Local Network Installer
Professional Wi-Fi Setup
Haliburton Wi-Fi Install
Structured Cabling
Free Quote Today
```

**Descriptions** (RSA ad copy · add all 4 · 90 characters max)

| # | Description |
|---|-------------|
| 1 | UniFi Wi-Fi 7 and mesh for cottages. Local Haliburton install. |
| 2 | Fix dead zones with bridges and cellular expansion. Free quote. |
| 3 | Structured wiring for home and business. Professional install. |
| 4 | Multi-building wireless links across your property. Local team. |

**Keywords** (comma-separated)

```
wifi installation cottage, unifi installer ontario, mesh wifi cottage country, structured wiring haliburton, cell booster installation cottage, wireless bridge installation, wifi installer haliburton, cottage internet wifi setup
```

#### Sitelinks (add all 6)

Do not add a sitelink to `/networking-cellular-expansion` (same as this campaign’s landing page). Delete AI sitelinks like **Apply Now** or **Project Gallery**.

| # | Sitelink text | Description line 1 | Description line 2 | Final URL |
|---|---------------|-------------------|-------------------|-----------|
| 1 | Security Systems | ULC monitoring. No long contracts. | Installed locally in Haliburton. | `https://mckeesecurity.ca/security` |
| 2 | Camera Surveillance | 4K systems with remote viewing. | Professional NVR installation. | `https://mckeesecurity.ca/camera-surveillance` |
| 3 | VoIP Phone Service | Hosted phone service with Yealink. | Managed porting. Local support. | `https://mckeesecurity.ca/voip-phone-service` |
| 4 | Starlink Installation | Professional Gen 3 installs. | No roof penetration mounts. | `https://mckeesecurity.ca/starlink` |
| 5 | Starlink Rental | Portable kit for cottage or camp. | Roam Max plan. 150ft cable included. | `https://mckeesecurity.ca/starlink-rental` |
| 6 | Contact Us | Get a free quote today. | Local Haliburton support. | `https://mckeesecurity.ca/contact-us` |

**Extensions:** Call button ✓ · Location ✓ · Phone `7054572156`

---

### Campaign 7: VoIP Phone Service

**Status:** Live

#### Admin panel wizard (Steps 1–5)

| Step | This campaign |
|------|----------------|
| 1 Objective | **Leads** |
| 2 Conversion goals | **Auto-selected**; leave both account-default rows |
| 3 Campaign type | **Search** |
| 3b Reach your goal | **Website visits** ✓ · **Phone calls** ✓ · Shop visits ✗ · Lead form submissions ✗ |
| 4 Ad destination | `https://mckeesecurity.ca/voip-phone-service` |
| 5 Campaign name | VoIP Phone Service |
| 6+ | Shared Steps 6–9 at top of doc · then **Step 10** and **Ad group** below |

#### Campaign setup (Steps 6–9)

| Setting | Value |
|---------|--------|
| **Bidding focus** | **Conversions** (not Conversion value) |
| **Bidding strategy** | Maximise conversions · **no target CPA** (optional box off) |
| **Conversion goals** | Account default (auto at Step 2; do not change) |
| **Budget** | **$2.50/day · ~$75/mo** |
| **Network** | **Google Search only** (turn off Search Partners and Display |
| **Locations** | **Custom**: Haliburton, ON + ~65 km radius (or Tier 1 towns; see geo section) |
| **Location options (Presence)** | **Presence: People in or regularly in** (change from default “Presence or interest” |
| **Languages** | **English** only (skip French) |
| **Audience segments** | **None** · **Observation** (default) |
| **AI Max** | **Off** (text customisation off · final URL expansion off) |
| **Ad schedule** | Mon–Fri, 8:00 AM–4:00 PM |
| **Campaign URL options** | Leave blank |
| **Call asset** | **7054572156** · Canada · call reporting **On** · **Use account settings (Calls from ads)** |
| **Location asset** | 4702 County Road 21, Haliburton, ON |
| **Brand guidelines** | Main `#c91818` · Accent `#000000` · Font **Playfair Display** |
| **Differentiators** | Hosted VoIP, Yealink phones, managed porting, local support (not a call centre) |

**Note:** Split from old “Networking + VoIP” combined campaign. One landing URL per campaign.

#### Step 10: Keyword and asset generation

| Field | Value |
|-------|--------|
| **Final URL** | `https://mckeesecurity.ca/voip-phone-service` |
| **Generate or Skip** | Either option works. Then use **Ad copy & targeting** below as final copy |

**Describe the product or service** (paste):

```
Hosted VoIP phone service for home and business in Haliburton and cottage country, Ontario. Since 1994. Yealink desk and DECT phones, managed number porting, local install and ongoing support from McKee Security.
```

**After Generate:** Remove generic telecom/reseller keywords. Keep keywords from **Ad copy & targeting** below.

#### Ad group & responsive search ad

| Field | Value |
|-------|--------|
| **Ad group name** | `VoIP Phone Service` |
| **Final URL (RSA)** | `https://mckeesecurity.ca/voip-phone-service` |
| **Display path** (optional) | `VoIP` · `Haliburton` |
| **Headlines** | Add all **15** · **30 chars** max · no phone numbers · see below |
| **Descriptions** | Add all **4** · **90 chars** max · see below |
| **Extensions** | Call + location · see **Sitelinks** below |

#### Ad copy & targeting

**Headlines (add all 15 · 30 characters max · no phone numbers)**

```
Hosted VoIP Phone Service
Yealink Business Phones
Replace Your Landline
Local VoIP Support
Haliburton Since 1994
Business Phone Systems
Managed Number Porting
Residential VoIP Phones
DECT Cordless Phones
Desk Phones Installed
Haliburton VoIP Install
Small Business VoIP
Professional Phone Setup
Ongoing Local Support
Free Quote Today
```

**Descriptions** (RSA ad copy · add all 4 · 90 characters max)

| # | Description |
|---|-------------|
| 1 | Hosted VoIP for home and business. Yealink phones installed. |
| 2 | Managed number porting. No call centre. Haliburton support. |
| 3 | Residential DECT and commercial desk phones. Free quote. |
| 4 | Replace landlines with local install and ongoing support. |

**Keywords** (comma-separated)

```
voip phone service ontario, business phone system haliburton, hosted phone service small business, replace landline voip, voip installer ontario, business voip haliburton
```

#### Sitelinks (add all 6)

Do not add a sitelink to `/voip-phone-service` (same as this campaign’s landing page). Delete AI sitelinks like **Apply Now** or **Project Gallery**.

| # | Sitelink text | Description line 1 | Description line 2 | Final URL |
|---|---------------|-------------------|-------------------|-----------|
| 1 | Security Systems | ULC monitoring. No long contracts. | Installed locally in Haliburton. | `https://mckeesecurity.ca/security` |
| 2 | Camera Surveillance | 4K systems with remote viewing. | Professional NVR installation. | `https://mckeesecurity.ca/camera-surveillance` |
| 3 | Networking & Wi-Fi | UniFi Wi-Fi 7 for home and cottage. | Cell boosters and wireless bridges. | `https://mckeesecurity.ca/networking-cellular-expansion` |
| 4 | Starlink Installation | Professional Gen 3 installs. | No roof penetration mounts. | `https://mckeesecurity.ca/starlink` |
| 5 | Starlink Rental | Portable kit for cottage or camp. | Roam Max plan. 150ft cable included. | `https://mckeesecurity.ca/starlink-rental` |
| 6 | Contact Us | Get a free quote today. | Local Haliburton support. | `https://mckeesecurity.ca/contact-us` |

**Extensions:** Call button ✓ · Location ✓ · Phone `7054572156`

---

### Campaign 8: Home Audio & Video

**Status:** Setting up now

#### Admin panel wizard (Steps 1–5)

| Step | This campaign |
|------|----------------|
| 1 Objective | **Leads** |
| 2 Conversion goals | **Auto-selected**; leave both account-default rows |
| 3 Campaign type | **Search** |
| 3b Reach your goal | **Website visits** ✓ · **Phone calls** ✓ · Shop visits ✗ · Lead form submissions ✗ |
| 4 Ad destination | `https://mckeesecurity.ca/audio-video` |
| 5 Campaign name | Home Audio & Video |
| 6+ | Shared Steps 6–9 at top of doc · then **Step 10** and **Ad group** below |

#### Campaign setup (Steps 6–9)

| Setting | Value |
|---------|--------|
| **Bidding focus** | **Conversions** (not Conversion value) |
| **Bidding strategy** | Maximise conversions · **no target CPA** (optional box off) |
| **Conversion goals** | Account default (auto at Step 2; do not change) |
| **Budget** | **$2.50/day · ~$75/mo** |
| **Network** | **Google Search only** (turn off Search Partners and Display |
| **Locations** | **Custom**: Haliburton, ON + ~65 km radius (or Tier 1 towns; see geo section) |
| **Location options (Presence)** | **Presence: People in or regularly in** (change from default “Presence or interest” |
| **Languages** | **English** only (skip French) |
| **Audience segments** | **None** · **Observation** (default) |
| **AI Max** | **Off** (text customisation off · final URL expansion off) |
| **Ad schedule** | Mon–Fri, 8:00 AM–4:00 PM |
| **Campaign URL options** | Leave blank |
| **Call asset** | **7054572156** · Canada · call reporting **On** · **Use account settings (Calls from ads)** |
| **Location asset** | 4702 County Road 21, Haliburton, ON |
| **Brand guidelines** | Main `#c91818` · Accent `#000000` · Font **Playfair Display** |
| **Differentiators** | Certified Sonos dealer, whole-home audio, TV mounting, Dolby Atmos home theater |

#### Step 10: Keyword and asset generation

| Field | Value |
|-------|--------|
| **Final URL** | `https://mckeesecurity.ca/audio-video` |
| **Generate or Skip** | Either option works. Then use **Ad copy & targeting** below as final copy |

**Describe the product or service** (paste):

```
Certified Sonos dealer for whole-home audio, TV mounting, soundbars, and home theater in Haliburton and cottage country, Ontario. Since 1994. Professional install of Sonos, Paradigm, and Anthem systems. Dolby Atmos, in-ceiling speakers, surround sound, and TV wall mounting with cable concealment. Local design, install, and support from McKee Security.
```

**After Generate:** Remove retail/DIY keywords (`buy sonos`, `amazon`, `best buy`, `diy tv mount`). Replace the AI keyword list with the **Keywords** block below.

**AI defaults vs guide keywords:**

| AI suggested (example) | Action |
|------------------------|--------|
| `sonos`, `soundbar`, `tv mount` alone | **Delete** (too broad or retail shopping) |
| `sonos arc`, `sonos beam` | **Delete** (product shopping, not install intent) |
| `tv mounting`, `home theater installation` | **Included** in guide list below |
| Guide list below | **Use this full set**. Delete all other AI defaults |

#### Ad group & responsive search ad

| Field | Value |
|-------|--------|
| **Ad group name** | `Home Audio & Video` |
| **Final URL (RSA)** | `https://mckeesecurity.ca/audio-video` |
| **Display path** (optional) | `Audio` · `Haliburton` |
| **Headlines** | Add all **15** · **30 chars** max · no phone numbers · see below |
| **Descriptions** | Add all **4** · **90 chars** max · see below |
| **Extensions** | Call + location · see **Sitelinks** below |

#### Ad copy & targeting

**Headlines (add all 15 · 30 characters max · no phone numbers)**

```
Certified Sonos Dealer
Home Audio Installation
Whole-Home Audio
TV Mounting Haliburton
Home Theater Install
Dolby Atmos Systems
Sonos Soundbar Install
Haliburton Since 1994
In-Ceiling Speakers
Surround Sound Install
Cottage Audio Systems
Professional TV Mount
Local Install & Support
Request a Free Quote
Free Quote Today
```

**Descriptions** (RSA ad copy · add all 4 · 90 characters max)

| # | Description |
|---|-------------|
| 1 | Certified Sonos dealer. TV mounting and whole-home audio in Haliburton. |
| 2 | Home theater and surround sound installed locally since 1994. |
| 3 | In-ceiling speakers, soundbars, and Dolby Atmos. Free quote. |
| 4 | Professional design and install. Ongoing local support. |

**Keywords** (comma-separated)

```
sonos installer ontario, sonos dealer haliburton, tv mounting haliburton, home theater installation ontario, whole home audio installer, surround sound installation, tv wall mount installer, home audio installation cottage country, dolby atmos installer ontario, in ceiling speaker installation
```

**Campaign negatives** (comma-separated)

```
buy sonos, sonos sale, diy tv mount, amazon, best buy, refurbished
```

#### Sitelinks (add all 6)

Do not add a sitelink to `/audio-video` (same as this campaign’s landing page). Delete AI sitelinks like **Apply Now** or **Project Gallery**.

| # | Sitelink text | Description line 1 | Description line 2 | Final URL |
|---|---------------|-------------------|-------------------|-----------|
| 1 | Security Systems | ULC monitoring. No long contracts. | Installed locally in Haliburton. | `https://mckeesecurity.ca/security` |
| 2 | Camera Surveillance | 4K systems with remote viewing. | Professional NVR installation. | `https://mckeesecurity.ca/camera-surveillance` |
| 3 | Networking & Wi-Fi | UniFi Wi-Fi 7 for home and cottage. | Cell boosters and wireless bridges. | `https://mckeesecurity.ca/networking-cellular-expansion` |
| 4 | VoIP Phone Service | Hosted phone service with Yealink. | Managed porting. Local support. | `https://mckeesecurity.ca/voip-phone-service` |
| 5 | Starlink Installation | Professional Gen 3 installs. | No roof penetration mounts. | `https://mckeesecurity.ca/starlink` |
| 6 | Contact Us | Get a free quote today. | Local Haliburton support. | `https://mckeesecurity.ca/contact-us` |

**Extensions:** Call button ✓ · Location ✓ · Phone `7054572156`

---

## Account-level negative keywords

Add early; expand weekly from Search Terms report. Comma-separated bulk paste:

```
free, diy, how to, jobs, career, salary, training, course, manual, repair, used, amazon, costco, best buy, home depot, starlink login, starlink account, starlink speed test, alarm monitoring only, adt, ring camera, nest, uninstall
```

Review weekly and add geo negatives if irrelevant traffic appears: toronto, gta, mississauga

---

## First campaign wizard: decisions made (2026-06-23)

Recording what was chosen during Google Ads onboarding so future campaigns stay consistent.

| Step | Choice | Notes |
|------|--------|-------|
| Google Analytics prompt | **Skip for now** | Site uses Vercel Analytics; GA4 optional. Add before heavy spend. |
| Business Profile | **Yes**: McKee Security & Audio Systems | Use for ad copy, location extensions |
| Advertising goal | **Get more website sales or leads** | Correct for quote-based services |
| Destination (ad click) | **Website** | See landing page table below. **not the same as conversion page** |
| Lead vs sales | **I want leads** | No e-commerce checkout |
| Customer action (Brand campaign) | **Customers request contact** → `https://mckeesecurity.ca/contact-us` | Google auto-detected this page; fits general outreach + brand searches |
| Customer action (service campaigns) | **Customers request a quote** → **same URL as landing page** | Quote/inquiry form at bottom of each service page |
| Avoid | Sign up for product/service (`/apply-now`) | That page is **job applications**, not customer leads |

### Ad landing URL vs “Add page for request quote” (important)

These are **two different fields** in Google Ads:

| Field | Purpose | Brand campaign |
|-------|---------|----------------|
| **Where the ad sends people** (website URL) | First page after click | `https://mckeesecurity.ca/` (homepage) ✓ |
| **“Add page” for quote conversion** | Page Google uses to detect quote requests | **Not** the homepage (see below) |

**Homepage is correct for Brand ads.** People searching “McKee Security” should land on your main site and browse services.

**“Add page for request a quote”** is for **conversion tracking**, not the ad destination. Google asks for the page users see when they complete a quote request.

**Our site behavior:** Forms show an inline success message on the **same URL** (no separate “thank you” page). Google’s own tip says: *“If there is no page after the quote request page, then use that.”*

**For service campaigns (2–8):** Use the **service landing page** for both ad destination and “Add page” conversion URL. Example: Security ads → `https://mckeesecurity.ca/security` for both fields.

**For Brand only:** Ad → homepage · Conversion → `/contact-us`

**Limitation:** Because the URL does not change after submit, Google’s page-based detection is approximate. Plan to add proper **form-submit conversion tracking** (Google tag event on success); see Phase 2 checklist below.

### Landing page guidance (ad clicks)

| Campaign | Ad landing URL | Conversion “Add page” URL |
|----------|----------------|-------------------------|
| **Brand** | `https://mckeesecurity.ca/` | `https://mckeesecurity.ca/contact-us` |
| **Security** | `https://mckeesecurity.ca/security` | Same as landing |
| **Cameras** | `https://mckeesecurity.ca/camera-surveillance` | Same as landing |
| **Starlink Install** | `https://mckeesecurity.ca/starlink` | Same as landing |
| **Starlink Rental** | `https://mckeesecurity.ca/starlink-rental` | Same as landing |
| **Networking** | `https://mckeesecurity.ca/networking-cellular-expansion` | Same as landing |
| **VoIP** | `https://mckeesecurity.ca/voip-phone-service` | Same as landing |

Click **View URL** on the conversion action step and confirm it points to a page with a working form.

---

## Google Search Console (completed)

| Step | Status |
|------|--------|
| Domain property for `mckeesecurity.ca` | Verified via DNS TXT on Vercel |
| TXT record | `google-site-verification=GtiKTUa4csSw1sPIc7I8bXzGCL9WxqzzNnhmrKIcZvI` |
| Sitemap submitted | `https://mckeesecurity.ca/sitemap.xml` |
| URL inspection / indexing | Done for priority pages |
| Link Search Console ↔ Google Ads | **Done** (Tools → Linked accounts) |

### Ongoing Search Console (monthly)

- **Indexing → Pages**: watch 404s; add 301 redirects in `website/next.config.ts` if old WordPress URLs still get traffic
- **Performance**: track impressions and queries
- **Core Web Vitals**: align with Vercel Speed Insights work

Site SEO assets already in place: `robots.ts`, `sitemap.ts`, 301 redirects, `metadataBase`, Open Graph image.

---

## Integration & tracking checklist

Complete **before** scaling spend beyond ~$10/day total.

### Phase 1. Google Ads account

- [x] Brand campaign **live** at $2.50/day
- [x] Campaigns 2–7 **live** at $2.50/day each
- [ ] Campaign 8 (Home Audio & Video) using specs in this doc
- [ ] Search Network only; Display off (service campaigns)
- [ ] Location targeting: presence in service area
- [ ] Ad schedule: Mon–Fri 8 AM–4 PM
- [x] Call asset: **7054572156** · call reporting on · account settings
- [ ] Location extension: 4702 Haliburton County Rd 21, Haliburton, ON
- [x] Link Google Search Console (Tools → Linked accounts)
- [ ] Confirm ad credit terms and expiry in Billing

### Phase 2. Conversion tracking (live)

- [x] **Google tag** `AW-18266278950` on site (`layout.tsx` + `google-ads-tag.tsx`)
- [x] **Website lead form**: label `Ho69CPvZncQcEKaYhYZE` · fires on all lead forms · value **$1,400 CAD** · Primary
- [x] **Calls from ads**: phone call lead · **7054572156** · 60 sec min · Primary
- [x] Removed old wizard **Contact Us** URL conversion (use tag action only)
- [x] Campaign goals: **Account default** (Submit lead forms + Phone call leads)
- [x] Tag Assistant verified form conversion on `/contact-us`
- [ ] Enhanced conversions: left off at account level; automatic field detection may still send hashed data

**Site code:** `website/src/lib/google-ads.ts` · `trackWebsiteLeadForm()` on contact + quote forms.

### Phase 3. Google Analytics 4 (optional but recommended)

- [ ] Create GA4 property for `mckeesecurity.ca`
- [ ] Link GA4 ↔ Google Ads (Tools → Linked accounts)
- [ ] Enables funnel reporting beyond Ads-only conversion counts

Can skip during campaign wizard; add within first week of running ads.

### Phase 4. Launch & optimize

- [x] Launch campaigns 1–7 at **$2.50/day** each
- [ ] Launch Campaign 8 (Home Audio & Video) at **$2.50/day**
- [ ] Wait 7 days before major structural changes (learning period)
- [ ] Week 2: Search Terms report → add negatives
- [ ] Week 3–4: Shift budget to campaigns with calls + form fills
- [ ] Pause underperforming ad groups; do not raise budget until conversions are tracked

---

## 30-day launch timeline

| Week | Actions |
|------|---------|
| **1** | Complete wizard; set tracking; launch Brand or Security at low daily budget |
| **2** | Add remaining campaigns; first Search Terms cleanup |
| **3** | Reallocate budget; link Search Console; add GA4 if not done |
| **4** | Review lead quality with team; adjust keywords and landing pages |

---

## Landing page map

| Service | URL |
|---------|-----|
| Services hub | `/custom-installations-professional-products` |
| Security | `/security` |
| Cameras | `/camera-surveillance` |
| Networking | `/networking-cellular-expansion` |
| Audio / Video | `/audio-video` |
| VoIP | `/voip-phone-service` |
| Starlink Install | `/starlink` |
| Starlink Rental | `/starlink-rental` |
| Contact / quotes | `/contact-us` |

Always send ads to the **most specific** relevant page, not the homepage (except Brand campaign).

---

## Change log

| Date | Change |
|------|--------|
| 2026-06-23 | Initial playbook: budget, 6 campaigns, keywords, negatives, geo, Search Console status, wizard decisions, tracking checklist |
| 2026-06-23 | First campaign in progress: conversion action **Customers request a quote** |
| 2026-06-23 | Brand campaign conversion: **Customers request contact** → `/contact-us` (not quote; apply-now is careers only) |
| 2026-06-23 | Promo tier: **Spend CA$600 get CA$600** (not CA$1,800 tier; spend threshold too high for budget/timeline) |
| 2026-06-23 | Full Smart Campaign specs for campaigns 2–8: headlines, 60-char descriptions, conversions, keywords |
| 2026-06-23 | Sitelink extensions: 6 core services (excludes Starlink Installation) |
| 2026-06-23 | Conversion tracking live: Website lead form tag + Calls from ads; account-default goals |
| 2026-06-23 | Bidding screen: focus **Conversions** (not Conversion value); new customers off |
| 2026-06-23 | Search wizard Steps 3b–10 documented; AI Max off; per-campaign **Step 10 blurbs** in Campaign specs (2–8) in wizard order |
| 2026-06-23 | Step 10 blurbs revised: positive framing only, no guard or “we do not” disclaimers in paste copy |
| 2026-06-23 | RSA structure: **15 headlines** + **4 descriptions** per campaign (Search 2–8 and Brand reference) |
| 2026-06-23 | All 7 campaigns live at ~$12.16/day (~$365/mo) |
| 2026-06-23 | Unified all campaigns to **$2.50/day**; added **Campaign 8: Home Audio & Video** (Search) |

---

## Related files

| File | Purpose |
|------|---------|
| `website/next.config.ts` | 301 redirects for old WordPress URLs |
| `website/src/app/sitemap.ts` | Sitemap URLs for Search Console |
| `website/src/app/robots.ts` | Crawler rules |
| `dns-migration-vercel.md` | DNS including Google site verification TXT |
| `docs/PERFORMANCE.md` | Site performance and Core Web Vitals |

---

*Update this document when credit terms are confirmed, campaigns go live, conversion tracking is installed, or budget/keyword strategy changes based on performance.*
