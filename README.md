# 📊 AI-Automated Personal Finance Tracker

![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Gemini AI](https://img.shields.io/badge/Gemini%201.5%20Flash-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)
![iOS Shortcuts](https://img.shields.io/badge/iOS%20Shortcuts-000000?style=for-the-badge&logo=apple&logoColor=white)

> A zero-touch, serverless financial pipeline that automatically intercepts bank SMS notifications, categorizes expenses using LLM reasoning, and visualizes data in real-time.

---

## 🚀 The Problem It Solves
Manual budget tracking is tedious and prone to human error. Existing apps often require paid subscriptions or manual data entry for cash transactions. This project solves that by creating a **100% automated, free, and highly accurate pipeline** using native cloud and mobile integrations.

## 🧠 Core Architecture & Features

This system acts as a highly resilient webhook receiver and data processor:

- **📱 iOS Webhook Trigger:** Intercepts automated bank SMS notifications and sends POST requests to the cloud backend.
- **🤖 LLM Categorization Engine:** Integrates the **Gemini 1.5 Flash API** via REST. Uses strict temperature controls (`0.0`) and custom prompt engineering to classify merchants into specific budget buckets.
- **🔄 Auto-Learning Algorithm:** Scans the historical Google Sheets database before querying the AI. If a user previously corrected a merchant's category, the algorithm bypasses the API and applies the historical preference, creating a highly personalized dataset.
- **📡 Offline-First Vault:** Engineered a local caching system using iOS Shortcuts. If the user is offline (e.g., no cell service), transactions are vaulted locally and automatically synced to the server upon network reconnection.
- **📈 Dynamic Visualization:** Processes raw JSON payloads into a clean, automated Google Sheets dashboard featuring daily pacing metrics and month-over-month comparisons.

---

## 🛠️ Tech Stack & Integrations

| Component | Technology Used |
| :--- | :--- |
| **Backend / API** | Google Apps Script (JavaScript) |
| **Database / UI** | Google Sheets |
| **AI Model** | Google Gemini 1.5 Flash |
| **Mobile Client** | Apple iOS Automations (Shortcuts) |
| **Data Format** | JSON / RESTful POST Requests |

---

## 📸 System Workflow
*(Add a screenshot or a GIF of your dashboard here in the future!)*
1. Bank SMS is received on iPhone.
2. Background iOS Automation parses the text and sends a JSON POST request.
3. Google Apps Script validates the webhook payload.
4. Script runs historical checks -> fallback to Gemini API for categorization.
5. Data is appended to the Sheet, formatted, and charts auto-update.

---

## 🔮 Future Scope
- [ ] **Email Alerts:** Automate a mid-month trigger to email a warning if spending exceeds 80% of the defined monthly budget.
- [ ] **Data Portability:** Create an export script to convert the ledger into CSV format for standard tax software.
