const status = process.env.KOSIF_SUITE_STATUS || 'unknown';
const sha = process.env.GITHUB_SHA || '';
const repo = process.env.GITHUB_REPOSITORY || '';
const runId = process.env.GITHUB_RUN_ID || '';
const runUrl = repo && runId ? `https://github.com/${repo}/actions/runs/${runId}` : '';
const payload = {
  status,
  sha,
  repository: repo,
  run_url: runUrl,
  source: 'github-actions',
  suite: 'KOSIF Engineering Suite',
};

async function sendPostHog() {
  const key = process.env.POSTHOG_PROJECT_API_KEY;
  const host = (process.env.POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '');
  if (!key) {
    console.log('PostHog reporting skipped: POSTHOG_PROJECT_API_KEY is not configured.');
    return { skipped: true };
  }
  const r = await fetch(`${host}/i/v0/e/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      event: 'kosif_engineering_suite_run',
      distinct_id: repo || 'kosif-ci',
      properties: payload,
    }),
  });
  if (!r.ok) throw new Error(`PostHog HTTP ${r.status}`);
  console.log('PostHog engineering event published.');
  return { skipped: false };
}

async function sendLinearFailure() {
  const apiKey = process.env.LINEAR_API_KEY;
  const teamId = process.env.LINEAR_TEAM_ID;
  if (status === 'success') {
    console.log('Linear issue creation skipped: suite passed.');
    return { skipped: true };
  }
  if (!apiKey || !teamId) {
    console.log('Linear issue creation skipped: LINEAR_API_KEY or LINEAR_TEAM_ID is not configured.');
    return { skipped: true };
  }
  const query = `mutation IssueCreate($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier url } } }`;
  const variables = {
    input: {
      teamId,
      title: `KOSIF Engineering Suite failed — ${sha.slice(0, 8) || 'unknown SHA'}`,
      description: `Automated fail-closed engineering gate reported **${status}**.\n\nRepository: ${repo}\nCommit: ${sha}\nWorkflow: ${runUrl}`,
    },
  };
  const r = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: apiKey },
    body: JSON.stringify({ query, variables }),
  });
  const body = await r.json();
  if (!r.ok || body.errors?.length || !body.data?.issueCreate?.success) {
    throw new Error(`Linear reporting failed: ${JSON.stringify(body.errors || body)}`);
  }
  console.log('Linear issue created:', body.data.issueCreate.issue?.identifier || body.data.issueCreate.issue?.id);
  return { skipped: false, issue: body.data.issueCreate.issue };
}

const outcomes = { posthog: null, linear: null };
try { outcomes.posthog = await sendPostHog(); }
catch (e) { console.error(e.message); outcomes.posthog = { error: e.message }; }
try { outcomes.linear = await sendLinearFailure(); }
catch (e) { console.error(e.message); outcomes.linear = { error: e.message }; }

console.log(JSON.stringify({ payload, outcomes }, null, 2));
