import { expect } from "chai";

import { parseUncleanArray } from "../../src/util/json.js";
import _ from "lodash";
describe("JSON Utils", () => {
    it("should parse a really bad json string", () => {
        const inputJson = `"[\\n  {\\n    \\"content\\": \\"# Update Bank Account ERD\\n\\nThis pull request updates the Entity Relationship Diagram (ERD) for the bank account data model. The changes include:\\n\\n1. Added new entities:\\n   - STATUS: To represent account statuses\\n   - BRANCH: To include branch information\\n   - NOTIFICATION: For account-related notifications\\n\\n2. Enhanced existing entities:\\n   - TRANSACTION: Added transactionType and description attributes\\n   - BANK_ACCOUNT: Added statusId and branchId to link with new entities\\n\\n3. Updated relationships:\\n   - BANK_ACCOUNT has a one-to-one relationship with STATUS\\n   - BANK_ACCOUNT belongs to a BRANCH (one-to-one relationship)\\n   - BANK_ACCOUNT can generate multiple NOTIFICATIONs (one-to-many relationship)\\n\\nThese changes provide a more comprehensive view of the bank account system, including account statuses, branch information, and a notification system. The updated ERD offers a clearer picture of the data model and relationships between different entities in the banking system.\\n\\nPlease review the changes in the bank_account_erd.md file and merge if satisfactory.\\",\\n    \\"title\\": \\"Update Bank Account ERD with New Entities and Attributes\\",\\n    \\"sourceBranch\\": \\"update-bank-account-erd-1719457948048\\",\\n    \\"targetBranch\\": \\"main\\"\\n  }\\n]"`;

        const fixedJson = parseUncleanArray(inputJson);
        console.log(JSON.stringify(fixedJson, null, 2));
        console.log(fixedJson);
        expect(fixedJson).to.not.be.undefined;
    });
});
