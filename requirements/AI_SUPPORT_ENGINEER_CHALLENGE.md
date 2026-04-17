# AI Production Support Engineer - Coding Assignment

In this challenge, we'd like for you to demonstrate your capability as an AI Production Support Engineer by building an **AI-Powered Incident Analysis & Triage System**.

## Instructions

- Spend up to 3 days completing the assignment, outlined in the Task section, on your own time using **Python** or **Node.js** as the platform.
- You are expressly encouraged to use agentic AI tools to complete this assignment. If you have a Google account, you can use the [Gemini CLI](https://geminicli.com/) for free with up to 1000 model requests/user/day and 60 model requests/user/minute. However, you're welcome to use any agentic AI tool you prefer.
- You will have 3 days to complete the assignment from the moment when you receive these instructions. We do _not_ expect you to spend more than a few hours on it with efficient use of agentic AI tools.
- Please find a way to capture and save the prompts you send to the AI throughout the assignment. We'd like to review these along with your code.
- When you're finished, we'll review your code live with you on a call. We will ask you to share your screen.

## Criteria

- **Project setup** - It should run out of the box with a simple `pip install -r requirements.txt && python main.py` (or `npm install && npm start`).
- **Code Architecture & Quality** - We like simple and easy to follow. How legible is your code? Are we able to follow control flow? Are you using appropriate patterns to solve problems?
- **Testing** - Your system should be well tested and part of your task is to determine what to test and how to test it.
- **Do not worry about building a data persistence layer** - For the purpose of this exercise, everything can be in-memory.
- **We do not expect you to make real LLM API calls** - You should design the system so that an LLM _could_ be plugged in, but for the purposes of this exercise, use deterministic mock/stub implementations that simulate AI behavior (pattern matching, keyword extraction, etc.). This keeps the project self-contained with no API keys required.
- **We do not expect you to come up with the most performant solution** - But we do expect you to be able to understand the performance profile of your code and to have ideas about how to improve any inefficiencies.

## Task

Your task is to build a system that ingests production incident data (logs, alerts, and historical incidents) and provides AI-assisted analysis to help a support engineer triage and resolve issues faster. The system should expose a **REST API** (or CLI interface) that a support engineer could use during an active incident.

The system should support the following capabilities:

### 1. Log Ingestion & Analysis

Build an endpoint/command that accepts a batch of structured log entries and returns an analysis summary.

Each log entry should have at minimum:
- `timestamp` - ISO 8601 timestamp
- `level` - one of `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL`
- `service` - the originating service name (e.g., `order-gateway`, `matching-engine`, `market-data-feed`)
- `message` - the log message text
- `traceId` - (optional) a correlation/trace ID

The analysis should:
- Identify error clusters (group related errors by service, message pattern, or time window)
- Detect anomalies such as sudden spikes in error rates or unusual patterns
- Produce a human-readable summary of what appears to be going wrong

### 2. Incident Triage & Prioritization

Build an endpoint/command that accepts a description of a new incident and returns a triage recommendation.

Given an incoming incident with:
- `title` - short description
- `description` - detailed description of the symptoms
- `affectedServices` - list of services exhibiting issues
- `severity` - reported severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)

The system should:
- Compare against a set of historical incidents (provided as seed data or loaded at startup) to find similar past incidents
- Suggest a **priority score** based on factors like: number of affected services, severity, time of day, and similarity to past high-impact incidents
- Recommend an **investigation starting point** (e.g., which service to look at first, what logs to check, likely failure domain)
- Return any **similar past incidents** with their root causes and resolutions

### 3. Root Cause Suggestion

Build an endpoint/command that, given:
- A set of log entries (as in #1)
- A set of active alerts (service, metric, threshold, current value)
- The incident description (as in #2)

Returns a ranked list of **probable root causes** with:
- A confidence score
- Supporting evidence (which logs/alerts point to this cause)
- Suggested next investigation steps

### Seed Data

Include a reasonable set of seed data that simulates a trading platform environment. This should include:
- **Historical incidents** (at least 10) with titles, descriptions, root causes, resolutions, and affected services
- **Sample log batches** that exhibit realistic patterns (error cascades, intermittent failures, resource exhaustion, etc.)
- **Service topology** - a simple map of services and their dependencies (e.g., `order-gateway` depends on `matching-engine` and `market-data-feed`)

The quality of your seed data is part of the evaluation -- it should feel realistic for someone who understands production trading systems.

## Appendix

### What does a production incident look like?

In a trading platform, production incidents can range from minor (a single client seeing stale prices) to critical (the matching engine is down and no trades can execute). Here's an example scenario:

**Incident: Order rejections spike on TW credit trading platform**

| Field             | Value                                                                                          |
|-------------------|------------------------------------------------------------------------------------------------|
| Title             | Spike in order rejections for corporate bonds                                                  |
| Severity          | HIGH                                                                                           |
| Affected Services | order-gateway, matching-engine, market-data-feed                                               |
| Symptoms          | 40% of orders rejected with "stale price" error since 14:30 UTC. Market data feed showing 5s+ latency. Matching engine rejecting orders against prices older than threshold. |

A support engineer investigating this would:
1. Check market-data-feed logs for upstream connectivity issues
2. Look at latency metrics for the feed handlers
3. Check if the issue is isolated to specific instruments or across all credit products
4. Review recent deployments or config changes
5. Look at historical incidents for similar "stale price" rejection patterns

Your system should help automate and accelerate steps like these.

### Service Topology Example

```
                    ┌──────────────┐
                    │   Clients    │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ order-gateway│
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
     ┌────────▼───┐  ┌────▼─────┐  ┌────▼─────────────┐
     │auth-service│  │matching- │  │ market-data-feed │
     └────────────┘  │ engine   │  └────────┬─────────┘
                     └────┬─────┘           │
                          │           ┌─────▼──────────┐
                    ┌─────▼──────┐    │ price-engine   │
                    │ trade-     │    └────────────────┘
                    │ reporting  │
                    └────────────┘
```

### Evaluation Focus

Beyond code quality, we'll be particularly interested in discussing:
- How you modeled the "similarity" between incidents
- How you designed the system to be extensible for a real LLM integration
- What trade-offs you made in your analysis algorithms
- How you would monitor and measure the effectiveness of this system in production
- Ideas for reducing MTTD (Mean Time to Detection) and MTTR (Mean Time to Resolution) using AI
