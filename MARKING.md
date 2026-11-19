# Ghar eight-point viva plan

This plan targets **8.0 raw concept points across three vivas** using the supplied concept values and the user's confirmation that marks are combined across vivas. Each concept appears once. The sets contain 10, 10 and 9 selections, within the sheet's ten-concept limit. The evaluator must accept the demonstrated implementation for each selected topic. If the course permits only two vivas, this particular plan needs revision.

## Viva 1 — AI and live menus — 4.3 points

| Select this exact topic | Points | Evidence and demonstration |
| --- | ---: | --- |
| Multi-step agent | 1.0 | `lib/meal-agent.mjs` runs a constrained search action, retrieves evidence, then asks the model to select a quote action. Explain how retrieval changes the input to the second model call. Show both actions below the result. |
| RAG — embeddings & vector retrieval | 0.5 | In `rankedMenus`, menu descriptions and the question become embeddings. Cosine similarity selects three eligible menus. The model chooses using their dish evidence. |
| LLM eval sets | 0.5 | Run `npm run eval:meals`. Explain the six cases in `tests/meal-cases.json`, expected kitchen and price, hit@3, and the no-service-area case. |
| WebSocket / real-time communication | 0.5 | Open Customer and Master Chefs in two tabs. Publish or delete a restaurant menu. Show the customer catalog update through `/meal-events`. Trace `scripts/preview.mjs` and `lib/kitchens.js`. |
| Server-side rendering | 0.5 | Open `/meal-finder/` while signed in. View page source and find the current restaurant names and prices. `scripts/meal-finder.mjs` creates this HTML for each request. |
| Function calling / tool use | 0.3 | Follow the model's schema-constrained `search_menus` and `quote_menu` actions through validation and execution in `lib/meal-agent.mjs`. These actions use JSON dispatch. |
| Writing unit tests | 0.3 | Run `npm test`. Explain a domain test for the two-hour skip cutoff or monthly discount, including its expected value. |
| Prompt injection awareness & defenses | 0.3 | Explain the untrusted-data instructions, allowed tools and candidate IDs. The model cannot run a payment operation. Show `tests/request-limits.test.mjs` rejecting a payment action and computing ₹592 despite a model-provided price of ₹1. |
| LLM API integration | 0.2 | Trace the actual Ollama `/api/chat` request, model setting, timeout and response handling in `ollamaClient`. Run a real meal search. |
| Structured outputs | 0.2 | Show the JSON schema passed to Ollama, enum constraints, JSON parsing and server validation of tool name and menu ID. |
| **Subtotal** | **4.3** | **10 concepts** |

## Viva 2 — Customer and chef experience — 2.0 points

| Select this exact topic | Points | Evidence and demonstration |
| --- | ---: | --- |
| React component composition | 0.2 | Follow `components/Platform.jsx` into `Explore`, `RestaurantMenus`, `DeliveryOrders` and `ProfilePage`, with their props and callbacks. |
| State management with useState | 0.2 | Change the meal order quantity and show the displayed total update in `components/DeliveryOrders.jsx`. |
| Side effects with useEffect | 0.2 | Explain how `DeliveryOrders` starts polling and its cleanup aborts requests, clears the timer and removes the focus listener. |
| Async data fetching from API | 0.2 | Open browser Network tools, load order history and inspect the authenticated `/api/orders?view=customer` response. |
| Loading & error UI states | 0.2 | Show loading and failure handling in `DeliveryOrders`. Temporarily use the browser's offline mode and attempt Refresh orders, then restore connectivity. |
| Form handling — controlled inputs | 0.2 | Change a restaurant name in `components/MenuEditor.jsx`. Explain how the input reads and updates draft state. |
| Responsive layout & styling competence | 0.2 | Resize the dashboard to a phone viewport, open compact navigation and show the vertically arranged order timeline. See `app/globals.css` and `components/delivery-orders.css`. |
| File upload handling | 0.2 | Attach a JPEG dish photo to a supply day, publish it, and open the customer menu. Trace image preparation in `MenuEditor` and persistence in `worker/kitchens.mjs`. |
| Problem modeling | 0.2 | Use `PRD.md` to explain how locality, supply dates, meal entitlement and chef ownership shape the product. Demonstrate a date-specific menu. |
| System design basics: Frontend, backend, DB and other systems integration | 0.2 | Use `HLD.md` to trace a customer order through the UI, API, stored snapshot, chef update and customer tracker. |
| **Subtotal** | **2.0** | **10 concepts** |

## Viva 3 — Request handling — 1.7 points

| Select this exact topic | Points | Evidence and demonstration |
| --- | ---: | --- |
| Environment variables & secrets management | 0.2 | Explain `.env.example`, the `.env` ignore rule, and `OLLAMA_URL`/model settings. The optional Stripe secret is read on the server. Use example values during the demonstration. |
| RESTful endpoint design | 0.2 | Explain GET to read orders, POST to create an order, and PATCH to advance an order in `worker/orders.mjs`. |
| HTTP status codes used correctly | 0.2 | Show order creation returning 201, invalid input returning 400, stale state returning 409, and search throttling returning 429 with Retry-After. |
| Request body validation | 0.2 | Explain quantity, locality, date, address and menu revision validation in `worker/orders.mjs`. The server derives the total from the stored menu. Show the corresponding API test. |
| Rate limiting | 0.2 | `scripts/request-limits.mjs` permits six searches per minute per signed-in local session and one running search. A seventh completed search within the minute returns 429. Browsing the catalog remains available. |
| Middleware | 0.2 | Trace the local HTTP server's request through the search-limit middleware before the finder handler. Its release callback runs in finally after success or failure. This middleware applies to the local/Docker meal finder. |
| Client-side routing | 0.2 | Use sidebar navigation and the browser Back button. Explain history updates and popstate handling in `components/Platform.jsx`. |
| Input sanitization & injection awareness | 0.2 | Show HTML escaping in `scripts/meal-finder.mjs` and parameter binding in the order SQL queries. Explain how user values are passed as data. |
| JavaScript — async/await | 0.1 | In the checkout submit handler, explain waiting for the order response before opening deliveries and using catch/finally to show errors and clear the busy state. |
| **Subtotal** | **1.7** | **9 concepts** |

**Total — 4.3 + 2.0 + 1.7 = 8.0 points, 29 distinct selections.**

## Run and rehearse

Use Node.js 24 LTS or newer. Open this project folder in VS Code and run `npm install`, then `npm run dev`. Open the exact loopback address printed in the terminal. Choose the local preview account and select a role.

Start Ollama and install `llama3.2` and `all-minilm` using `ollama pull llama3.2` and `ollama pull all-minilm`. Ollama's usual URL is `http://127.0.0.1:11434`. If it runs elsewhere, copy `.env.example` to `.env`, set `OLLAMA_URL`, and restart Ghar. Use `npm run eval:meals` to rehearse the first viva and `npm test` for automated checks.

For the delivery demonstration, publish a menu, order two portions as Customer, then switch to the publishing chef and advance the order. Customer tracking refreshes every eight seconds and on window focus. One-time orders persist in the local database. Subscription plans and favourites currently use browser storage. The local preview shares one demo identity between roles. Tests also check distinct customers and chefs.

The selected sets rely on the running local app and local AI service. Docker, Redis and Stripe are additional demonstrations documented in `VIVA.md`. The model evaluation needs the two actual Ollama models. The six-case evaluation covers its named fixtures, and each viva also requires explaining the implementation to the evaluator.

Rate-limit counters are held in memory for this single server process and reset when it restarts. They control local AI workload per session. A deployed multi-instance service would need a shared counter store and deployment-specific identity handling.

## Verified on 19 November 2026

- A clean dependency installation completed in the current project folder.
- The production build passed, including checks that all five dashboard and account routes load their packaged scripts.
- All 29 automated tests passed, covering profile isolation, menu publishing, delivery orders, subscriptions, model tool restrictions and request throttling.
- Live Ollama evaluation passed all six cases. Retrieval hit@3 was 5/5 for cases with an expected menu. The sixth case checked an area without service.
- The 29 selected topic names and weights were compared against the supplied sheet. Their total is 8.0, with no repeated topic and no group exceeding ten selections.
