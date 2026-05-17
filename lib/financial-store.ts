export type FinancialTransaction = {
  id: string;
  user: string;
  notes: string;
  status: "Income" | "Expense";
  amount: number;
  date: string;
  attachmentName?: string;
};

export type DeleteRequest = {
  id: string;
  transactionId: string;
  transactionNotes: string;
  requestedBy: string;
  requestedAt: string;
  status: "Pending" | "Approved" | "Rejected";
};
