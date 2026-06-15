// ==========================================
// CONFIGURATION
// ==========================================
// REPLACE THIS WITH YOUR ACTUAL API KEY
var API_KEY = 'AIzaSyBMUwIPQJOWtqrJlBhngmoDI_L8r3w7_OI'; 
var EXPENSE_SHEET_NAME = 'Raw_Data'; 
var CREDIT_SHEET_NAME = 'Credits'; 
var AI_RULES_SHEET_NAME = 'AI_Rules'; 

// ==========================================
// 🛠️ TOOL 1: THE ONE-TIME CLEANUP FIXER (EMERGENCY REPAIR)
// ==========================================
function fixMySheetData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var expenseSheet = ss.getSheetByName(EXPENSE_SHEET_NAME);
  var creditSheet = ss.getSheetByName(CREDIT_SHEET_NAME);
  
  if (!expenseSheet || !creditSheet) {
    Logger.log("Missing tabs. Please check names.");
    return;
  }

  // 1. DELETE JUNK ROWS IN RAW_DATA
  var data = expenseSheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    var merchant = String(data[i][1]).toLowerCase();
    if (merchant.includes("unknown") || merchant.includes("know your current") || merchant.includes("bank") || merchant === "") {
      expenseSheet.deleteRow(i + 1); 
    }
  }

  // 2. EMERGENCY FIX: REBUILD MONTH-YEAR COLUMN
  var refreshedData = expenseSheet.getDataRange().getValues();
  var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  expenseSheet.getRange("E2:E").setNumberFormat("@");
  
  for (var j = 1; j < refreshedData.length; j++) {
    var rawDate = refreshedData[j][0]; 
    var correctMonthYear = "";
    
    if (rawDate) {
      if (rawDate instanceof Date) {
        correctMonthYear = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), "MMM-yyyy");
      } else {
        var parts = String(rawDate).split("-");
        if (parts.length === 3) {
          var mIndex = parseInt(parts[1], 10) - 1;
          var year = parts[2];
          if (mIndex >= 0 && mIndex <= 11) {
            correctMonthYear = monthNames[mIndex] + "-" + year;
          }
        }
      }
    }
    if (correctMonthYear !== "") {
      expenseSheet.getRange(j + 1, 5).setValue("'" + correctMonthYear);
    }
  }
  
  // 3. FIX CREDIT TAB FORMATTING
  creditSheet.getRange("B2:B").setNumberFormat("₹#,##0.00");
  Logger.log("✅ Column E has been fully repaired!");
}

// ==========================================
// MAIN WEBHOOK: iPHONE SMS PROCESSOR
// ==========================================
function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var expenseSheet = ss.getSheetByName(EXPENSE_SHEET_NAME);
  var creditSheet = ss.getSheetByName(CREDIT_SHEET_NAME);
  
  if (!expenseSheet || !creditSheet) return ContentService.createTextOutput("Error: Tabs missing.");

  try {
    var params = JSON.parse(e.postData.contents);
    var smsBody = params.sms || ""; 

    if (!isValidTransaction(smsBody)) return ContentService.createTextOutput(JSON.stringify({ "status": "ignored" }));

    var amount = extractAmount(smsBody); 
    if (amount === 0) return ContentService.createTextOutput(JSON.stringify({ "status": "ignored" }));

    var isCredit = checkIfCredit(smsBody);
    var entityName = extractMerchantRegex(smsBody); 
    
    var date = new Date(); 
    var formattedDate = Utilities.formatDate(date, Session.getScriptTimeZone(), "dd-MM-yyyy");
    var monthYear = "'" + Utilities.formatDate(date, Session.getScriptTimeZone(), "MMM-yyyy");

    if (isCredit) {
      creditSheet.appendRow([formattedDate, amount, entityName]);
      creditSheet.getRange(creditSheet.getLastRow(), 1, 1, 3).setBorder(true, true, true, true, true, true);
    } else {
      var category = getCategorySmart(smsBody, entityName, ss);
      expenseSheet.appendRow([formattedDate, entityName, amount, category, monthYear]);
      expenseSheet.getRange(expenseSheet.getLastRow(), 1, 1, 5).setBorder(true, true, true, true, true, true);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success" }));

  } catch (error) {
    if(expenseSheet) expenseSheet.appendRow([new Date(), "SYSTEM ERROR", 0, error.message, "Error"]);
    return ContentService.createTextOutput(JSON.stringify({ "status": "error" }));
  }
}

// ==========================================
// 🧠 HELPER: THE AUTO-LEARNER
// ==========================================
function getHistoricalCategory(ss, merchantName) {
  if (!merchantName || merchantName === "Unknown") return null;
  
  var expenseSheet = ss.getSheetByName(EXPENSE_SHEET_NAME);
  var data = expenseSheet.getDataRange().getValues();
  
  for (var i = data.length - 1; i >= 1; i--) {
    var pastMerchant = String(data[i][1]).trim();
    var pastCategory = String(data[i][3]).trim();
    
    if (pastMerchant.toLowerCase() === merchantName.toLowerCase() && pastCategory !== "Miscellaneous" && pastCategory !== "Error") {
      return pastCategory;
    }
  }
  return null;
}

// ==========================================
// HELPER: SMART CATEGORIZER (UPGRADED)
// ==========================================
function getCategorySmart(text, merchant, ss) {
  var lowerText = (text + " " + merchant).toLowerCase();
  
  // 1. AUTO-LEARNER
  var historicalCat = getHistoricalCategory(ss, merchant);
  if (historicalCat) return historicalCat; 

  // 2. HARDCODED RULES
  if (lowerText.includes("zepto") || lowerText.includes("blinkit") || lowerText.includes("instamart") || lowerText.includes("mart")) return "Groceries";
  if (lowerText.includes("swiggy") || lowerText.includes("zomato") || lowerText.includes("starbucks") || lowerText.includes("cafe")) return "Food";
  if (lowerText.includes("petrol") || lowerText.includes("fuel") || lowerText.includes("indian oil")) return "Fuel";
  if (lowerText.includes("uber") || lowerText.includes("ola") || lowerText.includes("rapido") || lowerText.includes("irctc")) return "Transport";
  if (lowerText.includes("amazon") || lowerText.includes("flipkart") || lowerText.includes("myntra")) return "Shopping";
  if (lowerText.includes("bill") || lowerText.includes("recharge") || lowerText.includes("airtel") || lowerText.includes("jio") || lowerText.includes("bescom")) return "Bills";
  if (lowerText.includes("apollo") || lowerText.includes("pharmeasy") || lowerText.includes("hospital") || lowerText.includes("medical")) return "Health";
  if (lowerText.includes("netflix") || lowerText.includes("spotify") || lowerText.includes("pvr") || lowerText.includes("bookmyshow")) return "Entertainment";

  // 3. AI GHOST RULES
  var aiRules = getAIRules(ss);

  // 4. ASK GEMINI AI
  var aiCategory = getCategoryFromAI(text, merchant, aiRules);
  if (aiCategory && aiCategory !== "Error" && aiCategory !== "Miscellaneous") return aiCategory;
  
  return "Miscellaneous"; 
}

// ==========================================
// HELPER: AI CALLER (Temperature 0.0)
// ==========================================
function getCategoryFromAI(text, merchantName, aiRules) {
  var url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  var categories = "Food, Fuel, Transport, Groceries, Bills, Health, Entertainment, Shopping, Travel, Miscellaneous";
  
  var prompt = `You are an expert financial categorizer. Text: "${text}". Merchant: "${merchantName}". Pick exactly ONE category from [${categories}]. If it is an Indian person's name with no other clues, choose Miscellaneous. ${aiRules} Return ONLY JSON format: {"category": "Name"}`;
  
  var payload = { 
    "contents": [{ "parts": [{ "text": prompt }] }],
    // Temperature 0.0 prevents creative hallucination
    "generationConfig": { "temperature": 0.0, "responseMimeType": "application/json" }
  };

  try {
    var response = UrlFetchApp.fetch(url, { "method": "post", "contentType": "application/json", "payload": JSON.stringify(payload), "muteHttpExceptions": true });
    if (response.getResponseCode() !== 200) return "Miscellaneous"; 
    var json = JSON.parse(response.getContentText());
    if (json.candidates && json.candidates[0].content) {
      return JSON.parse(json.candidates[0].content.parts[0].text).category || "Miscellaneous";
    }
  } catch (e) { return "Miscellaneous"; }
  return "Miscellaneous";
}

// ==========================================
// HELPER: TRANSACTION VALIDATOR
// ==========================================
function isValidTransaction(text) {
  if (!text) return false;
  var lowerText = text.toLowerCase();
  if (lowerText.includes("initiated") || lowerText.includes("otp") || lowerText.includes("is due") || lowerText.includes("statement") || lowerText.includes("clearance") || lowerText.includes("failed")) return false;
  var txRegex = /\b(debited|credited|spent|paid|received|deposited|deducted|sent|purchase|txn|refunded)\b/i;
  return txRegex.test(text);
}

// ==========================================
// HELPER: GET AI RULES
// ==========================================
function getAIRules(ss) {
  var ruleSheet = ss.getSheetByName(AI_RULES_SHEET_NAME);
  if (!ruleSheet) return ""; 
  var data = ruleSheet.getDataRange().getValues();
  var rules = [];
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() && String(data[i][1]).trim() && String(data[i][0]).toLowerCase() !== "merchant") {
      rules.push(String(data[i][0]).trim() + " = " + String(data[i][1]).trim());
    }
  }
  if (rules.length > 0) return " RULES: " + rules.join(", ") + ".";
  return "";
}

function checkIfCredit(text) {
  var lowerText = text.toLowerCase();
  return lowerText.includes("credited") || lowerText.includes("received") || lowerText.includes("deposited") || lowerText.includes("refunded") || lowerText.includes("added to");
}

// ==========================================
// HELPER: AMOUNT & MERCHANT EXTRACTORS
// ==========================================
function extractAmount(text) {
  if (!text) return 0;
  var cleanText = text.replace(/(\d),(\d)/g, '$1$2').replace(/(?:bal|balance|avl|limit)\s*(?:is|:)?\s*(?:Rs\.?|INR|₹)\s*[\d\.]+/gi, '');
  var txMatch = cleanText.match(/(?:debited|credited|spent|paid|deducted|received|sent).*?(?:Rs\.?|INR|₹)\s*([\d]+\.?\d*)|(?:Rs\.?|INR|₹)\s*([\d]+\.?\d*).*?(?:debited|credited|spent|paid|deducted|received|sent)/i);
  if (txMatch && (txMatch[1] || txMatch[2])) return parseFloat(txMatch[1] || txMatch[2]);
  var match = cleanText.match(/(?:Rs\.?|INR|₹)\s*([\d]+\.?\d*)/i);
  if (match && match[1]) return parseFloat(match[1]);
  return 0;
}

function extractMerchantRegex(text) {
  if (!text) return "Unknown";
  var cleanText = text.replace(/\r?\n|\r/g, " "); 
  var merchant = "";
  var upiMatch = cleanText.match(/UPI[\/\-][A-Za-z0-9]+[\/\-]([A-Za-z0-9\s]+)[\/\-]/i);
  if (upiMatch && upiMatch[1]) merchant = upiMatch[1].trim();
  if (!merchant) { var vpaMatch = cleanText.match(/(?:VPA|UPI ID)\s+([A-Za-z0-9\.\_\-]+@[A-Za-z0-9]+)/i); if (vpaMatch && vpaMatch[1]) merchant = vpaMatch[1].trim(); }
  if (!merchant) { var atMatch = cleanText.match(/(?:at)\s+([A-Za-z0-9\s\.\*]+?)(?:\s+(?:on|via|Ref|Info|A\/c|Bal|to\s+know|limit)|$)/i); if (atMatch && atMatch[1]) merchant = atMatch[1].trim(); }
  if (!merchant) { var toMatch = cleanText.match(/(?:paid to|sent to|towards|to)\s+(?!know|a\/c|your|account)(.+?)(?:\s+(?:on|via|from|Ref|Info|A\/c|Bal|Avail|limit)|$)/i); if (toMatch && toMatch[1]) merchant = toMatch[1].trim(); }
  if (!merchant) { var fromMatch = cleanText.match(/(?:from|by)\s+(?!a\/c|account|hdfc|sbi|icici|axis|bank)(.+?)(?:\s+(?:on|via|to|Ref|Info|A\/c|Bal|Avail|limit)|$)/i); if (fromMatch && fromMatch[1]) merchant = fromMatch[1].trim(); }
  if (!merchant) { var infoMatch = cleanText.match(/(?:Info|Remarks)[:\-]\s*([A-Za-z0-9\s\.\-]+?)(?:\s+(?:via|on|Ref|Bal)|$)/i); if (infoMatch && infoMatch[1]) merchant = infoMatch[1].trim(); }
  if (merchant) {
    var lowerM = merchant.toLowerCase();
    if (lowerM.includes("hdfc") || lowerM.includes("bank") || lowerM.includes("know your") || lowerM.includes("available") || lowerM.includes("a/c")) return "Unknown";
    return merchant;
  }
  return "Unknown";
}

// ==========================================
// MONTHLY REPORT GENERATOR
// ==========================================
function sendMonthlyReport() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var expenseSheet = ss.getSheetByName(EXPENSE_SHEET_NAME);
  var creditSheet = ss.getSheetByName(CREDIT_SHEET_NAME);
  
  var today = new Date();
  var targetMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  var prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  
  var targetMonthStr = Utilities.formatDate(targetMonthDate, Session.getScriptTimeZone(), "MMM-yyyy");
  var prevMonthStr = Utilities.formatDate(prevMonthDate, Session.getScriptTimeZone(), "MMM-yyyy");
  
  var expenseData = expenseSheet.getDataRange().getValues();
  var targetTotals = {};
  var prevTotals = {};
  var targetTotalExpense = 0;
  var prevTotalExpense = 0;
  
  for (var i = 1; i < expenseData.length; i++) {
    var rawAmount = String(expenseData[i][2]).replace(/[^\d.-]/g, '');
    var amount = parseFloat(rawAmount); 
    var category = expenseData[i][3];           
    var rawMonthYear = expenseData[i][4];          
    var rowMonthStr = (rawMonthYear instanceof Date) ? Utilities.formatDate(rawMonthYear, Session.getScriptTimeZone(), "MMM-yyyy") : String(rawMonthYear).replace(/'/g, "").trim();
    
    if (!isNaN(amount)) {
      if (rowMonthStr === targetMonthStr) {
        if (!targetTotals[category]) targetTotals[category] = 0;
        targetTotals[category] += amount;
        targetTotalExpense += amount;
      } else if (rowMonthStr === prevMonthStr) {
        if (!prevTotals[category]) prevTotals[category] = 0;
        prevTotals[category] += amount;
        prevTotalExpense += amount;
      }
    }
  }

  var creditData = creditSheet.getDataRange().getValues();
  var targetTotalCredit = 0;
  var prevTotalCredit = 0;
  
  for (var j = 1; j < creditData.length; j++) {
    var cDate = creditData[j][0]; 
    var rawCAmount = String(creditData[j][1]).replace(/[^\d.-]/g, '');
    var cAmount = parseFloat(rawCAmount); 
    
    var cMonthStr = "";
    if (cDate instanceof Date) { cMonthStr = Utilities.formatDate(cDate, Session.getScriptTimeZone(), "MMM-yyyy"); } 
    else if (cDate) { var parsedDate = new Date(cDate); if (!isNaN(parsedDate.getTime())) cMonthStr = Utilities.formatDate(parsedDate, Session.getScriptTimeZone(), "MMM-yyyy"); }
    
    if (!isNaN(cAmount)) {
      if (cMonthStr === targetMonthStr) targetTotalCredit += cAmount;
      else if (cMonthStr === prevMonthStr) prevTotalCredit += cAmount;
    }
  }

  var targetNet = targetTotalExpense - targetTotalCredit;
  var prevNet = prevTotalExpense - prevTotalCredit;
  
  var subject = "📊 Monthly Report: " + targetMonthStr;
  var body = "Snapshot of your finances for " + targetMonthStr + " (Compared to " + prevMonthStr + "):\n\n";
  
  body += "🔴 EXPENSES (" + targetMonthStr + "):\n";
  var allCategories = Object.keys(Object.assign({}, targetTotals, prevTotals));
  
  for (var k = 0; k < allCategories.length; k++) {
    var cat = allCategories[k];
    var tAmt = targetTotals[cat] || 0;
    var pAmt = prevTotals[cat] || 0;
    
    if (tAmt > 0 || pAmt > 0) {
      var diff = tAmt - pAmt;
      var diffStr = diff > 0 ? "(+₹" + diff.toFixed(2) + ")" : "(-₹" + Math.abs(diff).toFixed(2) + ")";
      if (diff === 0) diffStr = "(No Change)";
      body += "- " + cat + ": ₹" + tAmt.toFixed(2) + " " + diffStr + "\n";
    }
  }
  
  body += "--------------------------\n";
  body += "TOTAL EXPENSE: ₹" + targetTotalExpense.toFixed(2) + " (vs ₹" + prevTotalExpense.toFixed(2) + ")\n";
  body += "🟢 TOTAL CREDITS: ₹" + targetTotalCredit.toFixed(2) + " (vs ₹" + prevTotalCredit.toFixed(2) + ")\n";
  body += "==========================\n";
  body += "🏁 NET SPEND (" + targetMonthStr + "): ₹" + targetNet.toFixed(2) + "\n";
  body += "🏁 NET SPEND (" + prevMonthStr + "): ₹" + prevNet.toFixed(2) + "\n";
  
  MailApp.sendEmail(Session.getActiveUser().getEmail(), subject, body);
}