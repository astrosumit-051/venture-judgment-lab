# Bind each automation credential to one owner

The original Phase 3 storage contract named three operating tables but left a cross-registration race between the legacy Opportunity Monitor and the generalized Lab registration. Add the narrow `lab_automation_credentials` ownership-guard table so one token fingerprint can bind to only one owner across both record types; the plaintext credential remains outside D1, and registration history remains append-only in `lab_records`.
