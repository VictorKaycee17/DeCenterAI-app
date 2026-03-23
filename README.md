## Hi there 👋 Welcome to DeCenter AI

# DeCenter AI — AI Studio for Everyone

![DeCenter AI Logo](https://github.com/DeCenter-AI/.github/assets/131058062/7fceb64d-f875-4d08-b13e-aff561aab234)


# Unified AI Infrastructure for Scalable Consumer Applications

A fast, unified way for businesses to generate API keys and connect to our global network of AI models and agents.

---

## 🚀 Overview
DeCenter AI is a unified AI studio that connects users to thousands of premium AI tools through a Super Agent that intelligently matches every prompt to the most effective model — for just $0.01 per inference.**. 

The platform provides developers with easy API access to an AI network of 400+ models and agents, powered by Hedera’s Consensus Service (HCS) for transparent inference tracking and Hedera Token Service (HTS) for seamless microtransactions in HBAR. DeCenter AI bridges AI & DePIN — combining smart autonomous AI systems with decentralized infrastructure for trust, scalability, and accessibility.**.


---

## 🧩 Problems We Solve

Today’s AI landscape is fragmented and expensive.

- **Too Many Options:** Hundreds of apps that do the same thing with minor variations, creating confusion and inefficiency.  
- **Too Many Payments:** Every tool requires a separate subscription, making AI usage costly and unsustainable.  
- **Too Much Hassle:** Users switch between multiple platforms just to complete a single task, wasting time and energy.  

---

## ⚙️ How We Solve It

We are building a **Unified AI Studio** that connects users to thousands of premium AI tools, powered by a **Super Agent** that automatically selects the best-performing model for every prompt — for just **one cent per inference**.

---

## 🦾 The Product We Built

For the hackathon, we built a **B2B platform** that allows developers and organizations to:

- Generate API keys to access our AI network.  
- Connect directly to over **400+ AI models and agents**.  
- Pay just **$0.01 per inference**.  

This enables anyone to power their applications with high-quality AI — seamlessly and affordably.

---

## 💡 Innovation and Hedera Integrations

Our architecture is built on three core principles:

- **Agentic:** Intelligent orchestration of AI agent results.  
- **Agnostic:** Accessible across any connected device or platform.  
- **Abstracted:** API-native for effortless integration and deployment.  

### Hedera AI Agent Integrations:

- **LangGraph / LangChain** – Dynamic AI orchestration.  
- **ILM (Inference Lifecycle Management)** – Performance optimization.  
- **Hedera Consensus Service (HCS)** – Records inference logs and verification hashes.  
- **Hedera Token Service (HTS)** – Processes microtransactions in HBAR via testnet wallets.  

**Workflow:**  
`Prompt → AI Selection (via Super Agent) → Hedera Registry (HCS Logging) → Output Delivery`

---

## 🔲 Core Impact

DeCenter AI empowers developers and businesses to:

- Access premium AI capabilities without enterprise pricing barriers.  
- Build trustworthy AI applications with verifiable inference records.  
- Reduce AI infrastructure costs by over **90%** using decentralized micro-billing.  
- Support community-powered AI infrastructure running on Hedera, aligning with the **AI & DePIN mission** of building smarter, decentralized systems.

---


## 🏗️ DeCenter AI B2B Web App Architecture

```text
+------------------------------+
| User Interface (Prompt Input)|
+--------------+---------------+
               |
               v
+--------------+--------------+
| Super Agent (Model Selector) |
+--------------+--------------+
               |
               v
+--------------+--------------+
| Model / Agent Inference     |
+--------------+--------------+
               |
               v
+--------------+--------------+
| Hedera Registry (HCS) Log   |
+--------------+--------------+
               |
               v
+--------------+--------------+
| Hedera Token Service (HTS)  |
|  - Microtransactions        |
|  - Reward Distribution      |
+--------------+--------------+
               |
               v
+--------------+--------------+
| Result Verification (HCS)   |
+--------------+--------------+
               |
               v
+------------------------------+
| Final Output Delivery to User|
+------------------------------+

```
**System Flow**
```
Prompt 
 → Super Agent (Model Selection via LangChain/LangGraph)
 → Inference Lifecycle Management (ILM)
 → Hedera Consensus Service (HCS Logging)
 → Output Delivery
```

**Tech Stack**
- Frontend: React / Next.js  
- Backend: Node.js 
- AI Layer: LangChain, LangGraph, OpenAI, etc.  
- Blockchain Layer: Hedera HCS + HTS for transparency and payments  
- Database: Supabase

---

## 🌐 **Why Hedera for DeCenter AI**

- **Transparency:** HCS ensures every AI inference is verifiable and tamper-proof.  
- **Microtransactions:** HTS enables pay-per-inference pricing in **HBAR**.  
- **Efficiency:** Hedera’s low-cost, carbon-negative network supports affordable large-scale AI operations.  
- **Trust Layer:** Hedera provides decentralized auditability for AI decision-making and logging.

# DeCenter AI — Hedera Apex Hackathon Evaluation Responses

---

## 🟢 Baseline Quality (30%)

### 1. Was the starting point real and coherent?

Yes. DeCenter AI started with a clear and real problem: AI infrastructure is fragmented, expensive, and difficult to scale for consumer applications. The initial concept of a unified AI studio with agent-based routing was well-defined and aligned with real market needs.

---

### 2. Baseline Hedera Fit (10%)

The baseline integration with Hedera was strong and intentional.

* Hedera Consensus Service (HCS) was used for logging AI inference activity
* Hedera Token Service (HTS) enabled microtransactions for pay-per-inference
  This created a clear alignment between AI infrastructure and decentralized trust/logging.

---

### 3. Baseline Feasibility (10%)

The project was technically feasible from the start.

* Modular architecture (API + AI routing + blockchain logging)
* Use of existing frameworks (LangChain, Supabase, Node.js)
* Clear execution path for MVP delivery within hackathon timeline

---

### 4. Baseline Product Clarity (10%)

The product vision was clear:
A single API to access multiple AI models at low cost, with transparent logging and micro-billing.
The value proposition (reduce cost, simplify access, improve scalability) was easy to understand and compelling.

---

## 🔵 Delta Score (70%)

### 1. Delta in Product Scope & UX (25%)

Significant improvements were made:

* Expanded from core API infrastructure to include **Explorer (distribution layer)**
* Improved developer experience with API key generation and playground testing
* Introduced **built-in billing abstraction** for end users
* Enhanced UX for both developers (B2B) and consumers (discovery layer)

This evolved the product from a tool into a **full ecosystem (infra + distribution)**.

---

### 2. Delta in Technical Robustness (15%)

Technical depth increased meaningfully:

* Improved AI orchestration using agent-based routing (LangChain / LangGraph)
* Better handling of inference lifecycle management
* Optimized system flow between off-chain AI processing and on-chain logging
* Strengthened backend architecture with scalable API layer and Supabase integration

---

### 3. Delta in Traction / Validation (15%)

Strong post-baseline validation:

* Grew to **36+ B2B startups onboarded within 2 months**
* Achieved **5M+ monthly inferences**
* Secured **~$1M in infrastructure funding, credits, and grants**
* Completed **accelerator cohort (Foundance)**
* Built early **investor relationships and pipeline**

This demonstrates real market demand and early product-market fit signals.

---

### 4. Delta in Hedera Integration Depth (15%)

Deeper and more meaningful Hedera usage:

* Expanded use of **HCS for verifiable inference logs and auditability**
* Strengthened **HTS microtransaction flow for scalable billing**
* Improved architecture for **real-time logging + retrieval via mirror nodes**
* Positioned Hedera as a **core trust and transaction layer** in AI infrastructure

Hedera evolved from a supporting component to a **critical backbone of the system**.

---

## 🚀 Additional Progress Since Baseline

* Completed **accelerator program (Foundance)**
* Established key partnerships with:

  * Intel
  * Google Labs
  * Cloudflare
  * Perplexity
* Developed **tokenomics model** for network incentives
* Built strong **investor pipeline and fundraising momentum**
* Expanded vision to include **AI + DePIN ecosystem infrastructure**


---
## 🔑 Generating an API Key

Then follow these steps to create and use your API key: 

1. **Sign in** with google on https://decen-hedera.vercel.app/ 
2. Go to the **API** page.  
3. Click **Generate API**, then enter the requested details.  
4. Click **Generate**.  
5. Your API key will be created in seconds—**copy and use it**.

---

## 🧪 Testing Inference Capabilities

To test the inferencing power of the DeCenter AI Network:

1. Go to the **Playground** page.  
2. Type in a **prompt**.  
3. Hit **Send**.  
4. Watch the AI model/agent respond in real time.
5. Monitor inferences logged on **Hedera Testnet**.

---

## 🌐 Connect With Us

Stay up-to-date with the latest developments and news from DeCenter AI:

- [🌍 Website](https://decenterai.com)  
- [🐦 Twitter](https://twitter.com/decenteraicom)  
- [📢 Telegram Announcements](https://t.me/decenteraicom)  
- [💼 LinkedIn](https://www.linkedin.com/company/decenter-ai)  
- [✉️ Email](mailto:admin@decenterai.com)

---

## 🚀 Let’s Build the Future of AI—Together

DeCenter AI bridges AI and DePIN by combining decentralized infrastructure with intelligent AI routing. Our goal is to make AI accessible, affordable, and verifiable for the 97% of users currently priced out of advanced AI systems.
![DeCenter AI - Unifying the AI experience](https://github.com/DeCenter-AI/.github/assets/131058062/c39ed1ce-14d8-4f94-8059-6d5f3a633962)
