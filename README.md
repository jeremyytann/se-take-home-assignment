## FeedMe Software Engineer Take Home Assignment
Below is a take home assignment before the interview of the position. You are required to
1. Understand the situation and use case. You may contact the interviewer for further clarification.
2. implement the requirement with **either frontend or backend components**.
3. Complete the requirement with **AI** if possible, but perform your own testing.
4. Provide documentation for the any part that you think is needed.
5. Bring the source code and functioning prototype to the interview session.

### Situation
McDonald is transforming their business during COVID-19. They wish to build the automated cooking bots to reduce workforce and increase their efficiency. As one of the software engineer in the project. You task is to create an order controller which handle the order control flow. 

### User Story
As below is part of the user story:
1. As McDonald's normal customer, after I submitted my order, I wish to see my order flow into "PENDING" area. After the cooking bot process my order, I want to see it flow into to "COMPLETE" area.
2. As McDonald's VIP member, after I submitted my order, I want my order being process first before all order by normal customer.  However if there's existing order from VIP member, my order should queue behind his/her order.
3. As McDonald's manager, I want to increase or decrease number of cooking bot available in my restaurant. When I increase a bot, it should immediately process any pending order. When I decrease a bot, the processing order should remain un-process.
4. As McDonald bot, it can only pickup and process 1 order at a time. A normal bot requires 10 seconds to complete process, while a fast bot requires 5 seconds.

### Requirements
1. When "New Normal Order" clicked, a new order should show up "PENDING" Area.
2. When "New VIP Order" clicked, a new order should show up in "PENDING" Area. It should place in-front of all existing "Normal" order but behind of all existing "VIP" order.
3. The order number should be unique and increasing.
4. When "+ Normal Bot" or "+ Fast Bot" clicked, a bot should be created and start processing the order inside "PENDING" area. After the bot-specific processing time, the order should move to "COMPLETE" area. Then the bot should start processing another order if there is any left in "PENDING" area.
5. If there is no more order in the "PENDING" area, the bot should become IDLE until a new order come in.
6. When "- Bot" clicked, the newest bot should be destroyed. If the bot is processing an order, it should also stop the process. The order should return to its original position in the "PENDING" area (maintaining VIP/Normal order priority).
7. No data persistance is needed for this prototype, you may perform all the process inside memory.

### Functioning Prototype
You must implement **either** frontend or backend components as described below:

#### 1. Frontend
- You are free to use **any framework and programming language** of your choice
- The UI application must be compiled, deployed and hosted on any publicly accessible web platform
- Must provide a user interface that demonstrates all the requirements listed above
- Should allow users to interact with the McDonald's order management system

#### 2. Backend
- You must use **either Go (Golang) or Node.js** for the backend implementation
- The backend must be a CLI application that can be executed in GitHub Actions
- Must implement the following scripts in the `script` directory:
  - `test.sh`: Contains unit test execution steps
  - `build.sh`: Contains compilation steps for the CLI application
  - `run.sh`: Contains execution steps that run the CLI application
- The CLI application result must be printed to `result.txt`
- The `result.txt` output must include timestamps in `HH:MM:SS` format to track order completion times
- Must follow **GitHub Flow**: Create a Pull Request with your changes to this repository
- Ensure all GitHub Action checks pass successfully
- **Note**: An interactive CLI implementation is compulsory for the next round of interview. Candidates should be prepared to demonstrate interactive command handling.

#### Submission Requirements
- Fork this repository and implement your solution with either frontend or backend
- **Frontend option**: Deploy to a publicly accessible URL using any technology stack
- **Backend option**: Must be implemented in Go or Node.js and work within the GitHub Actions environment
  - Follow GitHub Flow process with Pull Request submission
  - All tests in `test.sh` must pass
  - The `result.txt` file must contain meaningful output from your CLI application
  - All output must include timestamps in `HH:MM:SS` format to track order completion times
  - Submit a Pull Request and ensure the `backend-verify-result` workflow passes
- Provide documentation for any part that you think is needed

### Tips on completing this task
- Testing, testing and testing. Make sure the prototype is functioning and meeting all the requirements.
- Utilize coding agent to complete the assignment scope your working hour within 1 hour, do not over engineer it. However, ensure you read and understand what your code doing and apply good engineering practice.
- Complete the implementation as clean as possible, clean code is a strong plus point, do not bring in all the fancy tech stuff.

### Run Locally
This prototype is a Next.js frontend application. It keeps all order and bot state in memory, so no database or external service setup is required.

#### Prerequisites
- Node.js 20.9.0 or newer
- npm

#### Setup
1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open the app in your browser:

```text
http://localhost:3000
```

Use the `New Normal Order`, `New VIP Order`, `+ Normal Bot`, `+ Fast Bot`, and `- Bot` controls to exercise the order flow locally.

#### Verification Commands
Run the domain unit tests:

```bash
npm test
```

Run linting and formatting checks:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

Preview the production build after `npm run build`:

```bash
npm start
```

The assignment helper scripts can also be run directly when needed:

```bash
bash scripts/test.sh
bash scripts/build.sh
bash scripts/run.sh
```

### Implementation Architecture
This solution is implemented as a frontend prototype with Next.js and React. The UI in `src/app/page.tsx` owns the in-memory application state, while the order and bot behavior live in the domain module under `src/domain`.

The domain layer is intentionally framework-independent. It exposes pure transition functions that accept the current bot/order state and return the next state:

- `enqueuePendingOrder` inserts a new pending order according to customer priority.
- `assignPendingOrdersToIdleBots` pairs idle bots with pending orders.
- `completeProcessingOrders` completes orders whose bot-specific processing window has elapsed, then immediately assigns any newly idle bots to the next pending orders.
- `removeNewestBot` destroys the newest bot and requeues its interrupted order when that bot was processing.

The page state keeps all prototype data in memory:

- `orders`: grouped by `PENDING`, `PROCESSING`, and `COMPLETE`.
- `bots`: grouped by `IDLE` and `PROCESSING`.
- `nextOrderId`: the next unique increasing order number.
- `nextBotId`: the next unique increasing bot number shared by normal and fast bots.
- `currentTime`: the UI clock used to render progress and remaining time.

No persistence is used. Refreshing the page resets the controller state.

### Order State Model
Orders move through three explicit states defined in `src/domain/order.ts`.

#### Pending
`PENDING` orders are accepted orders that have not been picked up by a bot yet. This is the visible pending queue in the UI.

Normal orders are appended to the end of the queue. VIP orders are inserted after existing VIP orders and before the first normal order, so VIP orders keep first-in-first-out order among themselves while still taking priority over normal orders.

When a new order is created, the UI first enqueues it as pending and then calls `assignPendingOrdersToIdleBots`. If an idle bot is already available, the order may immediately leave the pending queue and enter processing.

#### Processing
`PROCESSING` orders have been picked up by a bot. A processing order stores:

- the original order id and customer type;
- when it was created;
- when the bot picked it up;
- when it is scheduled to complete;
- which bot is processing it.

Processing orders are not shown as a separate order column. Instead, the active bot card shows the order it is preparing, the remaining time, and a progress bar.

Normal bots process orders in 10 seconds (`ORDER_PROCESSING_TIME_MS`). Fast bots process orders in 5 seconds (`FAST_ORDER_PROCESSING_TIME_MS`). The React page runs a 250ms interval that calls `completeProcessingOrders` with the current time. An order only completes when `completesAt <= completedAt`.

#### Complete
`COMPLETE` orders are finished orders. When a processing order reaches its completion timestamp, it is moved into the complete list with its `completedAt` timestamp and the `botId` that finished it.

After completion, the bot returns to `IDLE` in the same state transition. The completion function then immediately attempts another assignment, so a bot that finishes one order can pick up the next pending order at the same timestamp.

### Bot Lifecycle
Bots have two states defined in `src/domain/bot.ts`: `IDLE` and `PROCESSING`.

1. A normal bot is created when the user clicks `+ Normal Bot`, and a fast bot is created when the user clicks `+ Fast Bot`. Both receive an increasing shared id and start as `IDLE`.
2. After creation, assignment runs immediately. If there is a pending order, the new bot becomes `PROCESSING`; otherwise it remains `IDLE`.
3. While processing, the bot stores the order id, pickup timestamp, and completion timestamp. It can process exactly one order at a time.
4. When the order completes after the bot-specific processing time, the bot becomes `IDLE`.
5. If more pending orders exist, the same transition immediately assigns the newly idle bot to the next order.
6. When the user clicks `- Bot`, the newest bot is destroyed globally across normal and fast bots. "Newest" is selected by the latest `createdAt` timestamp, with the higher bot id used as a tie-breaker.
7. If the destroyed bot was idle, it is simply removed.
8. If the destroyed bot was processing, its order is removed from `PROCESSING` and requeued as `PENDING` using the same VIP/normal priority rules. Its previous pickup and completion timestamps are discarded, so the order gets a fresh processing window based on the next bot that picks it up.
