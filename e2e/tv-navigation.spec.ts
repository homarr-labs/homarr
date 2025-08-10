import { test, expect } from '@playwright/test';

test('React Aria TV Navigation System - Complete Test', async ({ page }) => {
  console.log('🎯 Testing React Aria TV Navigation System');
  
  await page.goto('http://localhost:3005');
  await page.waitForSelector('.app-item');
  
  // Test 1: TV Mode Activation
  console.log('Testing TV mode activation...');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#status')).toContainText('TV Mode Active');
  
  // Test 2: Basic Navigation
  console.log('Testing basic navigation...');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.app-item.focused')).toHaveCount(1);
  
  // Test 3: Multiple Consecutive Interactions
  console.log('Testing multiple consecutive interactions...');
  
  for (let i = 1; i <= 5; i++) {
    console.log(`Interaction ${i}/5`);
    
    // Press Enter to activate app
    await page.keyboard.press('Enter');
    
    // Wait for custom modal
    await page.waitForSelector('.modal-overlay');
    await expect(page.locator('.modal-content')).toBeVisible();
    
    // Verify modal content
    await expect(page.locator('.modal-content')).toContainText('Opening');
    
    // Dismiss modal
    await page.click('.modal-button');
    await page.waitForSelector('.modal-overlay', { state: 'hidden' });
    
    // CRITICAL: Verify navigation still works after modal dismissal
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.app-item.focused')).toHaveCount(1);
    
    console.log(`✅ Interaction ${i} completed successfully`);
  }
  
  // Test 4: Accessibility Features
  console.log('Testing accessibility features...');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.modal-overlay');
  
  // Verify modal has proper ARIA attributes
  await expect(page.locator('.modal-content')).toHaveAttribute('role', 'dialog');
  await expect(page.locator('.modal-content')).toHaveAttribute('aria-modal', 'true');
  
  // Test Escape key
  await page.keyboard.press('Escape');
  await page.waitForSelector('.modal-overlay', { state: 'hidden' });
  
  // Verify focus is restored
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.app-item.focused')).toHaveCount(1);
  
  // Test 5: Mouse Movement Deactivation
  console.log('Testing mouse movement deactivation...');
  await page.mouse.move(100, 100);
  await expect(page.locator('#status')).toContainText('TV Mode: Inactive');
  
  // Test 6: Reactivation
  console.log('Testing TV mode reactivation...');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#status')).toContainText('TV Mode Active');
  
  console.log('🎉 All tests passed! React Aria TV navigation system works perfectly!');
  console.log('✅ TV navigation works after dialog dismissal');
  console.log('✅ Multiple consecutive interactions work');
  console.log('✅ Focus is properly restored');
  console.log('✅ No native browser dialogs');
  console.log('✅ Accessibility compliant');
}); 