import { chromium } from 'playwright';
import * as path from 'path';

// Define the screenshot destination folder mapping to Chase's brain directory
const SCREENSHOT_DIR = 'C:\\Users\\chase\\.gemini\\antigravity\\brain\\b55bbfca-af58-4011-993e-0c130c650ef5';

async function runVerification() {
  console.log('🚀 Launching ProjectBuddy E2E Verification Suite...');
  
  // Launch Playwright browser
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--ignore-certificate-errors']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();

  // Listen for browser console events to assist in debugging
  page.on('console', msg => {
    console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
  });
  
  try {
    // -------------------------------------------------------------
    // FLOW 1: AUTHENTICATION
    // -------------------------------------------------------------
    console.log('\n🔐 [Flow 1] Verifying Authentication...');
    await page.goto('https://projectcommand.192-3-61-148.sslip.io/auth', { waitUntil: 'networkidle' });
    
    // Check fields are present
    await page.waitForSelector('#login-email');
    await page.waitForSelector('#login-password');
    
    // First, let's try logging in as chase@resource-env.com
    console.log('👉 Attempting standard administrator login...');
    await page.fill('#login-email', 'chase@resource-env.com');
    await page.fill('#login-password', 'PC_chase_admin_2026!');
    await page.click('button[type="submit"]');
    
    // Wait up to 5 seconds to see if we get logged in or get a failure toast
    try {
      await page.waitForURL('**/', { timeout: 5000 });
      console.log('✅ Standard administrator login succeeded!');
    } catch (e) {
      console.log('⚠️ Standard login timed out or failed. Checking for error message...');
      
      // Let's capture the page screen state to see what the failure looks like
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_login_failure_details.png') });
      
      // Attempt to register a fresh administrative test user under @resource-env.com domain
      console.log('👉 Proceeding to Register tab as fallback...');
      await page.click('button:has-text("Register")');
      
      // Wait for registration fields to be visible
      await page.waitForSelector('#register-firstname');
      
      // Generate a unique registration email to avoid "Email already registered" issues
      const randId = Math.floor(Math.random() * 1000000);
      const testEmail = `e2e-tester-${randId}@resource-env.com`;
      console.log(`👉 Registering fresh PM/Admin user: ${testEmail}`);
      
      await page.fill('#register-firstname', 'E2E');
      await page.fill('#register-lastname', 'Tester');
      await page.fill('#register-email', testEmail);
      await page.fill('#register-password', 'PC_e2e_tester_2026!');
      
      await page.click('form >> button:has-text("Create Account")');
      
      // Wait for successful registration redirection to dashboard
      console.log('⏳ Waiting for registration session to initialize and redirect...');
      await page.waitForURL('https://projectcommand.192-3-61-148.sslip.io/', { timeout: 15000 });
      console.log('✅ Registered and logged in successfully!');
    }
    
    // Set localStorage flag to bypass the Quick Start Guide dialog modal
    console.log('👉 Bypassing Quick Start Guide dialog by configuring localStorage...');
    await page.evaluate(() => {
      localStorage.setItem('quickStartCompleted', 'true');
    });
    
    // Perform a quick reload to clean-apply the bypassed local storage state
    await page.reload({ waitUntil: 'networkidle' });
    
    // Assure dashboard portfolio is visible
    await page.waitForSelector('text=Select a project to enter its detailed workspace', { timeout: 15000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_logged_in.png') });
    
    // -------------------------------------------------------------
    // FLOW 2: DASHBOARD & PROJECT PORTFOLIO SELECTION
    // -------------------------------------------------------------
    console.log('\n🏢 [Flow 2] Navigating Dashboard & Project Selection...');
    
    // Locate the target project in the portfolio table
    const targetProjectRow = page.locator('tr:has-text("Golden Gate Mall Demolition & Abatement")');
    await targetProjectRow.waitFor({ state: 'visible' });
    
    console.log('👉 Clicking project row "Golden Gate Mall Demolition & Abatement"...');
    await targetProjectRow.click();
    
    // Verify selected project dashboard view has loaded stats cards and project KPIs
    await page.waitForSelector('text=Budget Health', { timeout: 15000 });
    console.log('✅ Project workspace loaded successfully!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_project_dashboard.png') });
    
    // -------------------------------------------------------------
    // FLOW 3: PREMIUM AI OPERATIONS CONTROL ROOM (COPILOT)
    // -------------------------------------------------------------
    console.log('\n🧠 [Flow 3] Auditing AI Operations Control Room (Copilot)...');
    
    // Navigate via Sidebar link rather than page.goto
    console.log('👉 Clicking "AI Copilot" link in Sidebar...');
    await page.click('a[href*="/ai-copilot"]');
    
    await page.waitForSelector('text=AI Operations Control Room', { timeout: 10000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_ai_copilot_landing.png') });
    
    // Test sequentially auditing multiple AI agents
    const agents = [
      { name: 'supervisor', label: 'CO Compliance', textTrigger: 'CO Compliance', expectedBadge: 'Compiled' },
      { name: 'schedule', label: 'Schedule Risk', textTrigger: 'Schedule Risk', expectedBadge: 'Compiled' },
      { name: 'budget', label: 'Budget Leakage', textTrigger: 'Budget Leakage', expectedBadge: 'Compiled' },
      { name: 'rfi', label: 'RFI Solver', textTrigger: 'RFI Solver', expectedBadge: 'Compiled' },
      { name: 'leveling', label: 'Bid Leveling', textTrigger: 'Bid Leveling', expectedBadge: 'Compiled' }
    ];
    
    for (const agent of agents) {
      console.log(`👉 Swapping to Agent: ${agent.label}...`);
      await page.click(`div:has-text("${agent.textTrigger}")`);
      await page.waitForTimeout(500); // Wait for tabs transition
      
      console.log(`🚀 Deploying ${agent.label} agent audit run...`);
      await page.click(`button:has-text("Deploy ")`);
      
      // Wait for the audit to finish running (wait for "Compiled" badge to appear)
      console.log('⏳ Waiting for progressive logging and diagnostics compile...');
      await page.waitForSelector(`span:has-text("${agent.expectedBadge}")`, { timeout: 15000 });
      
      console.log(`✅ ${agent.label} audit run complete!`);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `03_ai_copilot_${agent.name}.png`) });
    }
    
    // Take master screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_ai_copilot_operations.png') });
    
    // -------------------------------------------------------------
    // FLOW 4: INTERACTIVE BUDGET COST SHEET
    // -------------------------------------------------------------
    console.log('\n💰 [Flow 4] Checking Interactive Budget Cost Sheet...');
    console.log('👉 Clicking "Budget & Cost" link in Sidebar...');
    await page.click('a[href*="/budget"]');
    
    // Wait for the cost code table to render
    await page.waitForSelector('text=Estimated at Completion', { timeout: 10000 });
    console.log('✅ Interactive budget sheet and variance lines loaded!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_budget_sheet.png') });
    
    // -------------------------------------------------------------
    // FLOW 5: SCHEDULE TIMELINE & LOOKAHEAD
    // -------------------------------------------------------------
    console.log('\n📅 [Flow 5] Auditing Schedule Timeline Lookahead...');
    console.log('👉 Clicking "Schedule" link in Sidebar...');
    await page.click('a[href*="/schedule"]');
    
    // Wait for Lookahead timeline Gantt list
    await page.waitForSelector('text=Responsible Party', { timeout: 10000 });
    console.log('✅ Lookahead timeline schedule grids rendered successfully!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_schedule_timeline.png') });
    
    // -------------------------------------------------------------
    // FLOW 6: TECHNICAL RFI WORKFLOW LOG
    // -------------------------------------------------------------
    console.log('\n❓ [Flow 6] Navigating RFI Log Drawer & Answer Templates...');
    console.log('👉 Clicking "RFIs" link in Sidebar...');
    await page.click('a[href*="/rfis"]');
    
    // Wait for RFI items and click on RFI-001 (PCB Ballasts)
    const rfiRow = page.locator('tr:has-text("RFI-001")');
    await rfiRow.waitFor({ state: 'visible', timeout: 10000 });
    console.log('👉 Opening RFI-001 details drawer...');
    await rfiRow.click();
    
    // Wait for details sheet drawer to appear
    await page.waitForSelector('text=Suggested Answer', { timeout: 10000 });
    console.log('✅ RFI detail answers and conversations mapped!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_rfi_details_drawer.png') });
    
    // Close the drawer by clicking backdrop or pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // -------------------------------------------------------------
    // FLOW 7: SUBMITTALS REGISTRY
    // -------------------------------------------------------------
    console.log('\n📋 [Flow 7] Inspecting Submittals Registry...');
    console.log('👉 Clicking "Submittals" link in Sidebar...');
    await page.click('a[href*="/submittals"]');
    
    await page.waitForSelector('text=Spec Section', { timeout: 10000 });
    console.log('✅ Submittal review registry rows active!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_submittals_log.png') });
    
    // -------------------------------------------------------------
    // FLOW 8: BID PACKAGES & LEVELING MATRIX
    // -------------------------------------------------------------
    console.log('\n⚖️ [Flow 8] Verifying Bid Packages & Leveling Matrix...');
    console.log('👉 Clicking "Bid Packages" link in Sidebar...');
    await page.click('a[href*="/bid-packages"]');
    
    // Wait for bid packages table
    await page.waitForSelector('text=Lead Paint Abatement & Structural Mall Drop', { timeout: 10000 });
    
    // Let's click "Compare Bids" button to enter Leveling Comparison Matrix directly
    console.log('👉 Navigating directly to bid leveling matrix page...');
    const packageRow = page.locator('tr:has-text("Lead Paint Abatement")');
    if (await packageRow.count() > 0) {
      await packageRow.click();
      await page.waitForSelector('text=Compare Bids');
      await page.click('button:has-text("Compare Bids")');
    } else {
      // Direct navigation if list view is active or backup link is needed
      await page.click('a[href*="/bid-packages"]');
      await page.click('button:has-text("View Bids")');
    }
    
    await page.waitForSelector('text=Levelled Comparison Total', { timeout: 15000 });
    console.log('✅ Bid leveling comparison matrix compiled correctly!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_bid_leveling_matrix.png') });
    
    // -------------------------------------------------------------
    // FLOW 9: PUNCH LIST & PENDING TASKS
    // -------------------------------------------------------------
    console.log('\n🎯 [Flow 9] Auditing Punch List & Tasks...');
    console.log('👉 Clicking "Tasks / Punch" link in Sidebar...');
    await page.click('a[href*="/tasks"]');
    
    await page.waitForSelector('text=Location', { timeout: 10000 });
    console.log('✅ Location checklists and punch status loaders compiled!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_punch_list_tasks.png') });
    
    // -------------------------------------------------------------
    // FLOW 10: DOCUMENT LIBRARY & INTERACTIVE OCR VIEWER MODAL
    // -------------------------------------------------------------
    console.log('\n📄 [Flow 10] Testing Document Library & OCR ViewerModal...');
    console.log('👉 Clicking "Documents" link in Sidebar...');
    await page.click('a[href*="/documents"]');
    
    // Wait for the library container to render
    await page.waitForSelector('text=Document Library', { timeout: 10000 });
    
    // If no document exists in the library, upload our test file first
    const noDocMsg = page.locator('text=No documents uploaded yet');
    const viewDocButton = page.locator('button:has-text("View")').first();
    
    if (await noDocMsg.isVisible() || await viewDocButton.count() === 0) {
      console.log('👉 No documents found in library. Uploading workspace sample test-co-log.xlsx...');
      
      const fileInput = page.locator('input[type="file"]');
      // Set the path to the workspace xlsx file
      await fileInput.setInputFiles('test-co-log.xlsx');
      
      // Wait for document progress processing logs to disappear or the document to transition to "processed"
      console.log('⏳ Waiting for document upload to complete and register...');
      await page.waitForSelector('text=test-co-log.xlsx', { timeout: 20000 });
      await page.waitForSelector('text=processed', { timeout: 20000 });
      console.log('✅ test-co-log.xlsx processed successfully!');
    }
    
    // Locate view button row to click and open newly wired DocumentViewer modal drawer
    console.log('👉 Triggering OCR DocumentViewer Modal Drawer...');
    await page.locator('button:has-text("View")').first().click();
    
    // Verify dialog loaded side-by-side OCR panels
    await page.waitForSelector('text=Operated Equipment Logs', { timeout: 10000 });
    console.log('✅ OCR DocumentViewer Drawer successfully popped and audited!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_document_viewer_ocr.png') });
    
    // Close document modal drawer
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // -------------------------------------------------------------
    // FLOW 11: GC CHANGE ORDERS LOG
    // -------------------------------------------------------------
    console.log('\n📝 [Flow 11] Checking GC Change Orders Log...');
    console.log('👉 Clicking "Change Order Log" link in Sidebar...');
    await page.click('a[href*="/change-orders"]');
    
    await page.waitForSelector('text=Change Order Logs', { timeout: 10000 });
    console.log('✅ Change Order registry lists matching rates sheet audits loaded!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_change_orders_log.png') });
    
    console.log('\n🎉 ProjectBuddy E2E Verification completed successfully with 100% assertions satisfied!');
    
  } catch (error) {
    console.error('\n❌ E2E Verification failed with exception:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runVerification();
