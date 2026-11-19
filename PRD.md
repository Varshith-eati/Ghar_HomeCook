# Ghar Tiffin Platform — Product Requirements

The meal finder should give a clear wait message when a signed-in local user starts a second concurrent search or exceeds six searches within one minute. Customers can continue browsing menus while waiting. The three-viva assessment target and evidence mapping are documented in [MARKING.md](MARKING.md).

**Release scope** — Bengaluru tiffin subscription demo, based on project revision `f8f398f`.

## Product goal

A customer deciding whether to subscribe needs to know three things before checkout: what they will eat, which days the restaurant supplies it, and what the full plan costs. Ghar lets customers answer those questions from a chef’s published menu. Chefs can manage several restaurants under one account and give each menu its own dishes, photos, prices and delivery schedule.

## Users and release boundaries

| User | Job to be done | Successful outcome |
| --- | --- | --- |
| Customer | Find meals that fit my locality, schedule and budget. | I can preview a dish for a specific day, see the plan total and choose a delivery slot. |
| Master Chefs | Publish the meals I can supply at each restaurant. | I can manage lunch and dinner menus independently, including a special dish on a single date. |
| Returning customer | Adjust my plan when I will miss a meal. | I can see which deliveries are eligible for a skip or pause and where the remaining meals fall. |

The hosted release shares published menus and photos with signed-in users who have site access. Each account has separate customer and chef profiles. Subscriptions, subscription delivery progress, favourites and ratings are demo activity saved per account in the current browser. Checkout must clearly describe the simulation before confirmation. Live payment collection and courier dispatch are outside this release. The product has two workspaces, Customer and Master Chefs. The scope excludes an Admin portal and a chef subscriber directory.

## Functional requirements and acceptance criteria

### Account and navigation

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| A1 | Offer one sign-in entry for both workspaces and ask the user how they want to use Ghar after sign-in. | Selecting Customer opens the customer profile. Selecting Master Chefs opens the chef profile. The same account can use both. |
| A2 | Give each role its own editable profile. | A customer can save locality, diet and meal preference. A chef can save kitchen name, cuisine, introduction and service areas. Updating one profile preserves the other. |
| A3 | Make the role switcher and theme control accessible throughout the workspace. | Clicking the role button or its downward chevron opens the menu. Keyboard users can select a role and dismiss with Escape. Switching from green-and-white to dark mode persists after reload. |

### Restaurant menus

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| M1 | Provide a **Restaurant menus** section with named menus grouped by restaurant. | A chef can use **Create menu** for a new restaurant or **Add menu** under an existing one. Editing one menu’s price or dishes affects only that menu. Earlier unnamed menus appear as **House menu** and can be renamed. |
| M2 | Offer **Weekly menu** and **Selected days** schedules. | Weekly mode publishes a seven-day rotation. Selected days accepts recurring weekdays, individual calendar dates or both. A dated entry overrides that weekday’s usual dish and photo. |
| M3 | Let chefs add, replace and remove a meal photo for each day. | A customer viewing a published date sees that date’s dish and uploaded photo before choosing a plan. A dish without a photo can still be published and read. |
| M4 | Let chefs set each menu’s base meal price, weekly discount, monthly discount and delivery areas. | Changing the weekly discount updates the seven-day quote independently of the monthly quote. A customer can choose only a locality served by the menu. |
| M5 | Let the owner edit or delete a published menu. | Delete confirmation names the menu and restaurant. Cancel keeps it available. Confirm removes it from browsing and prevents new subscriptions to it. Other menus remain available, and existing plans retain their agreed price and schedule. |

### Customer discovery and subscriptions

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| C1 | Let customers search, filter and save kitchens, then inspect available meals. | A customer can filter by delivery locality, open a published listing, identify its restaurant and menu, and select a supply day to see the dish. |
| C2 | Offer plans covering 1, 7 or 30 supply days, with lunch, dinner or both. | Checkout shows the meal count, full price in rupees, start date, delivery locality and applicable slots. A seven-day lunch plan at ₹100 per meal with a 10% weekly discount shows seven lunches for ₹630. |
| C3 | Accept only plans the published schedule can fulfil. | Checkout requires an eligible start date from tomorrow through the next 90 days. A menu with only three future dates and no recurring weekday cannot supply a seven-day plan. A menu changed or deleted during checkout requires a fresh selection or review. |
| C4 | Preserve meal entitlements when customers skip or pause. | An eligible skip moves that meal type forward by one supply date. A pause covers an inclusive future range of up to 90 days. Ghar rejects a change when the remaining supply dates cannot fulfil the plan. |
| C5 | Show delivery progress and collect feedback on delivered meals. | In the local demo, a chef can advance an eligible order from **Preparing** to **Out for delivery** to **Delivered**. A customer can view its status and rate the delivered meal. |

## Business rules

- **Supply days.** A seven-day plan from a restaurant that serves only on Mondays covers seven Mondays. Selecting both lunch and dinner gives the customer seven of each. An individual date that falls on a recurring weekday produces one supply day.
- **Pricing.** Daily plans use the base price. Weekly and monthly discounts default to 5% and 10% and can be edited independently. The total is the base price multiplied by supply days and meals per day, discounted once and rounded to the nearest rupee.
- **Timing.** Delivery times use Asia/Kolkata. For a noon delivery, a customer can skip before 10:00 a.m. The cutoff includes 10:00 a.m. A dispatched or delivered meal is ineligible.
- **Ownership and concurrent edits.** Only the owning account can change or delete its menu. If two tabs edit the same saved revision, the later save prompts the chef to reload the current version.

## Release acceptance walkthrough

1. As Master Chefs, publish **Weekday lunch** for **Garden Cafe** with recurring Mondays, a one-off Wednesday with a photo, a ₹100 meal price and a 10% weekly discount. Add **Family dinner** under the same restaurant with a different price.
2. As a customer, find Garden Cafe, select Wednesday and verify the dish and photo. Select seven lunch supply days. Confirm the ₹630 total and check that the schedule includes the one-off Wednesday and eligible Mondays.
3. Create the demo subscription. Skip one eligible lunch and verify that seven lunches are still scheduled. Try a skip at the two-hour cutoff and verify that Ghar explains why the meal is ineligible.
4. As the chef, cancel deletion of **Weekday lunch**, then confirm it on a second attempt. Verify that **Family dinner** remains discoverable. Reopen the customer’s existing plan in its original browser and verify its saved price and schedule.

## Design references

[High-level design](HLD.md) covers system boundaries and data ownership. [Low-level design](LLD.md) covers component interfaces, storage, validation and scheduling.

## Viva edition acceptance criteria

- A signed-in local customer can read the current lunch catalog from the first HTML response and search by dish, delivery area and plan length.
- The meal finder recommends eligible menus grounded in the catalog. The displayed price uses the same weekly or monthly discount rule as the subscription screen.
- When a chef publishes or deletes a menu, another open customer dashboard reloads its catalog.
- With a Stripe test secret configured, the customer can open a test checkout from a quote and view a verified paid test receipt. The demonstration does not dispatch a paid order.
- The project provides a repeatable model evaluation set, automated tests, a container recipe and an optional Redis cache. See [VIVA.md](VIVA.md) for setup and evidence.

## One-time restaurant delivery

Customers can search for dishes and order 1–10 portions from a published menu for an available supply date and service area. Checkout shows the delivery window in Indian Standard Time and calculates the full order price. A successful order opens My deliveries and appears in the publishing chef’s queue. The chef controls the order's progress from Placed through Preparing and Out for delivery to Delivered. Customers see the timestamp for each completed step and can reorder from a menu that is still published. This is a demo ordering workflow without courier dispatch.
