// Request notification: verify the Convex signature over the raw body, drop
// replays, and turn the minimal payload into one message for one person.
const webhook = $input.first();
const raw = (await this.helpers.getBinaryDataBuffer(0, 'data')).toString('utf8');
const headers = webhook.json.headers;
const check = lendloopVerify(
  $env.CONVEX_TO_N8N_SECRET,
  headers['x-lendloop-timestamp'],
  headers['x-lendloop-signature'],
  raw,
);
if (!check.ok) return [{ json: { notify: false, statusCode: 401, response: { error: 'unauthorized' }, reason: check.reason } }];

const event = JSON.parse(raw);

// Inside the replay window the timestamp alone can't stop a replay, so remember
// accepted event ids. A repeat (Convex retrying after a lost response) is
// acknowledged without sending a second message.
const state = $getWorkflowStaticData('global');
const now = Date.now();
const seen = Object.fromEntries(
  Object.entries(state.seenEvents ?? {}).filter(([, at]) => now - at < 2 * REPLAY_WINDOW_SECONDS * 1000),
);
const duplicate = Boolean(seen[event.eventId]);
seen[event.eventId] = seen[event.eventId] ?? now;
state.seenEvents = seen;
if (duplicate) return [{ json: { notify: false, statusCode: 200, response: { result: 'duplicate' } } }];

const range = event.startDate === event.endDate ? event.startDate : `${event.startDate} to ${event.endDate}`;
const MESSAGES = {
  'request.created': [`New request for your ${event.toolName}`, `A neighbor asked to borrow your ${event.toolName} for ${range}. Approve or decline it under Incoming requests.`],
  'request.approved': [`Approved: ${event.toolName}`, `Good news: your request to borrow the ${event.toolName} for ${range} was approved.`],
  'request.declined': [`Declined: ${event.toolName}`, `Your request to borrow the ${event.toolName} for ${range} was declined. There are other tools to try on LendLoop.`],
  'request.cancelled': [`Cancelled: ${event.toolName}`, `The request to borrow your ${event.toolName} for ${range} was cancelled by the borrower.`],
  'loan.returned': [`Returned: ${event.toolName}`, `The ${event.toolName} you borrowed for ${range} was marked returned. Thanks for borrowing responsibly.`],
  'listing.removed': [`No longer available: ${event.toolName}`, `The ${event.toolName} listing was removed, so your request or booking for ${range} was closed.`],
};
const message = MESSAGES[event.event];
if (!message) return [{ json: { notify: false, statusCode: 422, response: { error: 'unknown_event' } } }];

const [subject, line] = message;
const appUrl = $env.LENDLOOP_APP_URL ?? 'http://localhost:3100';
return [
  {
    json: {
      notify: true,
      statusCode: 202,
      response: { result: 'accepted' },
      to: event.recipient.email,
      subject: `LendLoop: ${subject}`,
      text: `Hi ${event.recipient.firstName},\n\n${line}\n\n${appUrl}\n\nLendLoop`,
    },
  },
];
