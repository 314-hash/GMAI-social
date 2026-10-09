import { test } from '@e2e-dev/web';
import { expect } from 'e2e';

test('mobile users have responsive view and can access rooms without blocking modals', async ({ app, screen }) => {
  await app.open('/');

  // 1. App header & brand should be visible
  await expect(screen.getByText('GAMEMIND AI')).toBeVisible();

  // 2. Mobile fast-switcher channel bar should be rendered directly
  await expect(screen.getByText('CHANNELS:')).toBeVisible();

  // 3. General room channel pill is visible
  await expect(screen.getByText('#general')).toBeVisible();

  // 4. Message composer is visible and not blocked by any modals
  await expect(screen.getByText('Join Community Chat #general')).toBeVisible();
});
