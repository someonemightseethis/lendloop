// One item per overdue loan. No loans means no items, so the run ends here.
return $input.first().json.loans.map((loan) => ({ json: loan }));
