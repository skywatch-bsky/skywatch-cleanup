# Skywatch Cleanup

Refactor this codebase to use patterns developed in /Users/scarndp/dev/skywatch/skywatch-tail. The goal is to fetch reports from ozone.skywatch.blue, to autoacknowledge any accounts or posts from accounts that have been taken down, then to process to auto acknowledge any profiles or posts that have been reported under the report categories "spam" or "sexual". Whatever remains should be passed to Ollama for further processing per the policies provided. If the Ollama finds an account has violated a policy, apply the appropriate action.

Remove unnecessary code.
