# Ghar viva guide

The user has confirmed that marks are combined across multiple vivas. Use [MARKING.md](MARKING.md) for the current eight-point target across three vivas. The optional highest-value selection and service setup below remain useful as alternative demonstrations.

## Which ten concepts to select

The supplied sheet caps one viva at ten concepts. Its ten highest values total **5.0 points**. The sheet gives no rule converting this to a 6–7 mark grade. Use the selections below for the maximum raw total and check with your evaluator how the viva contributes to the final mark.

| Select on the sheet | Points | What to show | Source |
| --- | ---: | --- | --- |
| Multi-step agent | 1.0 | Ask for a dish. The first model call builds a search query. After retrieval, the second chooses a menu for a quote. Show the two tool names and the calculated price. | `lib/meal-agent.mjs`, `scripts/meal-finder.mjs` |
| RAG — embeddings & vector retrieval | 0.5 | Show how menu descriptions become vectors, how cosine similarity retrieves the top three eligible menus and how dish evidence grounds the answer. | `lib/meal-agent.mjs` |
| LLM eval sets | 0.5 | Run the six fixed cases against the real model. The runner checks retrieval, selected ID, price and tool sequence. | `tests/meal-cases.json`, `scripts/eval-meals.mjs` |
| Containerization with Docker | 0.5 | Build the app and open it from Compose. Show the app and Redis services and the persistent SQLite volume. | `Dockerfile`, `compose.yaml` |
| WebSocket / real-time communication | 0.5 | Publish a new menu in the chef tab while a customer dashboard is open. Watch it appear, then delete it and watch it disappear. | `scripts/preview.mjs`, `lib/kitchens.js` |
| Server-side rendering | 0.5 | Open the meal finder and use View Page Source. The response already includes current restaurant names and prices. Publish another menu and reload the page source. | `scripts/meal-finder.mjs` |
| Payment gateway integration | 0.5 | Generate a quote, open Stripe test Checkout and return to Ghar for a session-verified receipt. | `scripts/test-checkout.mjs`, `scripts/meal-finder.mjs` |
| Caching with Redis | 0.4 | Run the cache probe, then repeat a meal query. Unchanged menu vectors are reused. An edited dish gets a new cache key. | `scripts/embedding-cache.mjs`, `scripts/check-redis.mjs` |
| Function calling / tool use | 0.3 | Follow the schema-constrained search and quote actions. The server validates the arguments and calculates the price. | `lib/meal-agent.mjs` |
| Writing unit tests | 0.3 | Run the tests and explain the two-hour skip cutoff, supply-date exception, or discount calculation. | `tests/domain.test.mjs`, `tests/meal-finder.test.mjs` |
| **Total** | **5.0** | **10 selections** | |

If the payment, container or Redis services are unavailable during your viva, the existing integration tests, prompt defenses and structured model output are alternative demonstrations. Substituting a lower-weight topic reduces the raw total. Only your evaluator can confirm whether other assessment components add marks.

## If your course combines marks across two vivas

Ask your evaluator whether a second viva can contribute additional raw points for different concepts. If that rule applies, the existing Ghar workflow demonstrates another ten topics worth 0.2 each. Five would add 1.0 to the first viva's 5.0, and ten would add 2.0. This route to 6–7 depends on that grading rule.

| Additional topic | How to demonstrate it |
| --- | --- |
| React component composition | In `components/Platform.jsx`, trace how the dashboard passes data and actions to Explore, RestaurantMenus and ProfilePage. |
| State management with useState | Open the role switcher or change a filter. Follow the state update into the rendered screen. |
| Side effects with useEffect | In `lib/kitchens.js`, show how opening and leaving the dashboard starts and cleans up catalog listeners. |
| Async data fetching from API | Open the browser Network panel and load the customer dashboard. Inspect the response from `/api/kitchens`. |
| Form handling — controlled inputs | Edit a restaurant name in `components/MenuEditor.jsx`. Show how the input reads `draft.name` and updates it in its change handler. |
| Responsive layout & styling competence | Resize the dashboard from a laptop viewport to a phone viewport. Open the compact navigation. |
| File upload handling | Add a dish photo to a supply day. Show that reopening the menu loads the saved kitchen photo. |
| Transactions | Explain the migration in `scripts/preview-account.mjs` that commits the restaurant-menu schema change or rolls it back on error. |
| Automated API testing / integration tests | In `tests/account.test.mjs`, show the request that publishes a menu and the separate account that can read it. |
| Problem modeling | In `PRD.md`, trace a chef's supply-day rule to the customer's date choices and price. |

## Run the project in VS Code

1. Extract the ZIP. Open the folder containing `package.json` in VS Code.
2. Use Node.js 24 LTS or newer. In Terminal → New Terminal run the following commands.

```sh
npm install
npm run dev
```

3. Open the printed URL, normally `http://127.0.0.1:3000`. Use that exact address for sign-in. Choose the local preview login, then Customer or Master Chefs. Both roles share one local demonstration account. Each role has its own profile.
4. Use Customer → Explore kitchens → **Find my lunch**. The menu catalog works as soon as the app starts. To enable suggestions, start Ollama and install the following models once.

```sh
ollama pull llama3.2
ollama pull all-minilm
```

If Ollama is installed as a command-line service and isn't already running, start `ollama serve` in another terminal before pulling the models. For custom service addresses, copy `.env.example` to `.env`, set the relevant values, and restart Ghar. After the first successful build you can use `npm start` to restart quickly.

## Five-minute walkthrough

1. Open the project in two tabs. Set the first to Customer → Explore kitchens and the second to Master Chefs → Restaurant menus. Create a restaurant menu, choose the weekdays or dates, add a dish photo, and publish. The first tab should update automatically. Open the menu to see the dish and photo for the supply day.
2. Open **Find my lunch**. Ask for **sambar, rasam and poriyal**, choose **Koramangala** and **7** lunches. With the supplied sample catalog, Amma’s Everyday costs ₹89 a lunch. Ghar rounds ₹89 × 7 × 0.95 to **₹592**. A chef changing a discount changes the next quote.
3. View the meal finder's page source. Search for a restaurant name to show that the server included it in the response. Point to the two tool names and token count beneath a generated quote.
4. Run the tests and the live evaluation in another terminal.

```sh
npm test
npm run eval:meals
```

5. For the payment demonstration, put a Stripe sandbox secret beginning with `sk_test_` in `.env` and restart Ghar. Generate a quote and choose **Open Stripe test checkout**. Use Stripe's test card **4242 4242 4242 4242**, a future expiry and a three-digit CVC. Return to Ghar to see the confirmed amount. This is a sandbox receipt. The original subscription dashboard still uses its browser-based demo workflow. [Stripe testing](https://docs.stripe.com/testing)

## Docker and Redis demonstration

On a machine with a working Docker Linux engine, stop any local Ghar instance using port 3000. From the project folder run the following. The optional AI service stores downloaded models in a volume.

```sh
docker compose --profile ai up --build -d
docker compose exec ollama ollama pull llama3.2
docker compose exec ollama ollama pull all-minilm
docker compose ps
docker compose exec app npm run check:redis
docker compose exec app npm run eval:meals
```

Open `http://127.0.0.1:3000`. After searching, list cache keys with `docker compose exec cache redis-cli --scan --pattern "ghar:embedding:*"`. Repeat a query and check `docker compose exec cache redis-cli info stats` for an increase in keyspace hits. Stop with `docker compose --profile ai down`. Redis holds temporary embeddings. SQLite and uploaded photos live in the app volume.

## Verification for this edition

The production build completed and all five original dashboard and account routes loaded their packaged scripts. All 29 automated tests passed on 19 November 2026, including two independently signed-in sessions exchanging a real WebSocket event, publishing and deleting a menu, verifying its server-rendered HTML, and exercising checkout with a simulated Stripe gateway. The new tests also verify request throttling, per-session isolation, window reset, blocked model actions and server-calculated prices.

The live Ollama run passed **6 of 6 cases**, and the expected menu appeared in the top three for **5 of 5** positive cases. The sixth case checked an area with no eligible menus. A six-case pass measures this fixture set and does not predict a course mark.

Compose configuration validation passed. This Windows machine reported that WSL was missing and its Docker Linux engine was unavailable. The container startup and a live Redis round trip still need a running engine or Redis service. A hosted Stripe sandbox checkout still needs the student's own test key. The original hosted worker supports the existing Ghar screens. Use the local or Docker version for the new viva demonstrations.

## Demonstrate delivery tracking

Publish a restaurant menu. From the customer dashboard search for one of its dishes, select **Order a meal** and order two portions. Show the order in **My deliveries**. Switch to the publishing chef’s dashboard and advance **Start preparing → Send out for delivery → Mark delivered**. Reopen the customer view and show the timestamped history and **Order again** button. The order persists in the database after the menu changes. The customer’s chosen delivery window is a schedule, and chef updates drive progress.
