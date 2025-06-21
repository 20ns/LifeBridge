# Environment Variables

Copy `.env.example` to `.env` at the repo root and fill in project-specific values.

| Variable | Description | Default (dev) |
|----------|-------------|----------------|
| `AWS_REGION` | AWS region for all SDK clients | `eu-north-1` |
| `BEDROCK_MODEL_ID` | Bedrock model ARN used for translation & AI safety guardrails | Example ARN |
| `REVIEW_ALERTS_TOPIC_ARN` | SNS topic ARN for human-review alerts | Dev placeholder |
| `REVIEW_REQUESTS_TABLE` | DynamoDB table for review requests | `lifebridge-review-requests-dev` |
| `TRANSLATE_CACHE_TTL` | In-memory translation cache TTL in ms | `300000` |
| `JWT_SECRET` | Secret for signing JWT tokens (local dev only) | `change_this_dev_secret` | 