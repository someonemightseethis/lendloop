// Runs once per loan: the reminder text for one borrower.
const loan = $json;
const days = loan.daysOverdue === 1 ? '1 day' : `${loan.daysOverdue} days`;
const appUrl = $env.LENDLOOP_APP_URL ?? 'http://localhost:3100';
return {
  json: {
    to: loan.borrower.email,
    subject: `LendLoop reminder: please return the ${loan.toolName}`,
    text: `Hi ${loan.borrower.firstName},\n\nThe ${loan.toolName} you borrowed was due back on ${loan.endDate} (${days} ago). Please return it to its owner, who will mark it returned.\n\n${appUrl}\n\nLendLoop`,
  },
};
