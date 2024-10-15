# Workforce: Continuous Intelligence
Workforce is a workflow orchestration and automation tool designed in the spirit Continuous Integration.

## Why Workforce?
Workforce is tailor-made for connecting to existing natural language interfaces in business.

The end goal is to be able to fully represent all business processes in a natural language interface.

AI can be injected into the process at any point to automate tasks.

The current model supports the following modes of operations:
1. Fully automated
2. Human-in-the-loop
3. Fully manual

## Architecture
Workforce utilizes the following core technologies:
1. TypeScript
2. React Flow (UI for workflow orchestration)
3. Tailwind CSS (UI for workflow orchestration)
4. Zustand (State management)
5. RxJS (Scheduler)
6. Express.js (REST API)

Workforce relies on clean abstractions to make it easy to extend and customize.

The Scheduler is purely event-driven and has a very simple API.

All messages are passed between nodes on RXjs `BehaviorSubjects`.  `BehaviorSubjects` track the latest value published to them, and will immediately publish the latest value to any new subscribers. This allows for both synchronous and asynchronous processing. 

The `ValueMessage` type is the sole communication format.

The Scheduler is currently running entirely in the UI. This is a tradeoff that was made to allow for scaling to a large number of users before having any agreements in place with API providers.  The Scheduler can be easily moved to a server-side process in the future.

Unfortunately, the choice to push the scheduler to the front end means that polling is used to produce most events from external resources. This is not ideal, but in a client-side distributed architecture, the risks of polling (getting IP banned, bandwidth issues, etc.) are much lower than it would be in a centralized server-side deployment.

The other key downside is that the flows only run while the browser is open. This is not a problem for the demo, but as soon as clear monetization opportunities are identified, the scheduler will be moved to the server-side.

