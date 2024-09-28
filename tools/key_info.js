const fs = require('fs');

function isKeyInformation(content) {
  const keyPhrases = [
    "date", "time", "location", "name", "age", "address", "email", "phone number",
    "appointment", "event", "meeting", "deadline", "birthday", "anniversary",
    "reminder", "schedule", "username", "password", "website", "company name",
    "job title", "department", "project", "task", "milestone", "delivery", "budget",
    "invoice", "payment", "contract", "agreement", "signature", "confirmation",
    "approval", "rejection", "feedback", "comment", "question", "inquiry", "request",
    "submission", "application", "form", "document", "file", "attachment", "link",
    "URL", "website", "browser", "login", "authentication", "security", "access",
    "permission", "role", "status", "update", "progress", "report", "result",
    "analysis", "data", "statistics", "metrics", "benchmark", "comparison", "trend",
    "forecast", "prediction", "plan", "strategy", "objective", "goal", "target",
    "priority", "risk", "issue", "problem", "solution", "action", "step", "procedure",
    "process", "method", "approach", "technique", "tool", "software", "application",
    "platform", "system", "network", "infrastructure", "database", "storage",
    "server", "cloud", "virtual", "backup", "recovery", "disaster", "business",
    "market", "industry", "sector", "customer", "client", "supplier", "vendor",
    "partner", "stakeholder", "team", "group", "individual", "employee", "manager",
    "supervisor", "director", "executive", "CEO", "CFO", "CTO", "board", "committee",
    "department", "division", "unit", "branch", "office", "site", "location",
    "facility", "headquarters", "region", "territory", "country", "city", "state",
    "province", "district", "zip code", "postal code", "coordinates", "latitude",
    "longitude", "map", "route", "direction", "distance", "time zone", "currency",
    "exchange rate", "budget", "cost", "expense", "revenue", "income", "profit",
    "loss", "margin", "balance", "credit", "debit", "loan", "interest", "rate",
    "tax", "deduction", "exemption", "fine", "penalty", "bonus", "commission",
    "salary", "wage", "payroll", "benefit", "insurance", "policy", "coverage",
    "claim", "premium", "settlement", "investment", "portfolio", "stock", "bond",
    "share", "equity", "dividend", "return", "yield", "growth", "inflation", "deflation",
    "recession", "recovery", "boom", "crisis", "risk", "opportunity", "challenge",
    "advantage", "disadvantage", "strength", "weakness", "threat", "safety", "security",
    "protection", "privacy", "compliance", "regulation", "law", "legal", "contract",
    "agreement", "settlement", "dispute", "litigation", "court", "trial", "judgment",
    "verdict", "sentence", "penalty", "fine", "appeal", "case", "evidence", "testimony",
    "witness", "jury", "lawyer", "attorney", "counsel", "judge", "courtroom",
    "hearing", "session", "proceeding", "decision", "order", "decree", "ruling",
    "injunction", "ban", "prohibition", "authorization", "permit", "license",
    "certification", "accreditation", "qualification", "training", "education",
    "course", "degree", "diploma", "certificate", "exam", "test", "quiz", "assignment",
    "homework", "project", "thesis", "dissertation", "research", "study", "experiment",
    "analysis", "survey", "questionnaire", "interview", "observation", "data",
    "statistics", "results", "findings", "conclusion", "recommendation", "solution"
    ];
  return keyPhrases.some(phrase => content.toLowerCase().includes(phrase));
}

async function storeKeyInformation(serverId, content) {
  try {
    const isKey = isKeyInformation(content);

    if (isKey) {
      if (!logs[serverId]) {
        logs[serverId] = [];
      }
      logs[serverId].push({ timestamp: new Date().toISOString(), keyInfo: content });

      fs.writeFileSync(logsFilePath, JSON.stringify(logs, null, 2), 'utf8');

      const stats = fs.statSync(logsFilePath);
      return stats.size > maxLogSize;
    }
    return false;
  } catch (error) {
    console.error("Error storing key information:", error);
    return false;
  }
}