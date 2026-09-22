export const rewardsFeatureChanged = 'pace:rewards-feature-changed';

export async function readRewardsFeature() {
  const response = await fetch('/api/features/rewards', { cache: 'no-store' });
  const body = await response.json();
  if (!response.ok || typeof body.enabled !== 'boolean') {
    throw Error(body.message || 'Unable to load reward availability.');
  }
  return body.enabled as boolean;
}

export async function writeRewardsFeature(enabled: boolean) {
  const response = await fetch('/api/features/rewards', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  const body = await response.json();
  if (!response.ok || typeof body.enabled !== 'boolean') {
    throw Error(body.message || 'Unable to update reward availability.');
  }
  window.dispatchEvent(
    new CustomEvent(rewardsFeatureChanged, { detail: { enabled: body.enabled } }),
  );
  return body.enabled as boolean;
}
