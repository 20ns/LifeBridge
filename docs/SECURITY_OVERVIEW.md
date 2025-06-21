# Security Overview

LifeBridge follows a defense-in-depth strategy aligned with AWS Well-Architected (Security Pillar) and HIPAA best practices.

1. Identity & Access Management
   • Principle of least privilege for all IAM roles.
   • Serverless framework deploys per-stage roles; production uses scoped role ARNs.
   • CI/CD uses OIDC-based short-lived credentials.

2. Data Protection
   • S3 buckets are private, versioned, and encrypted with AWS-managed KMS keys.
   • DynamoDB tables use `aws/kms` encryption; application data is field-level encrypted when storing PHI.
   • All secrets are kept in AWS Secrets Manager and injected via Lambda environment variables.

3. Network Security
   • API Gateway uses AWS WAF with OWASP Top-10 rules.
   • VPC-enabled Lambdas restrict outbound traffic with VPC endpoints; no public subnets required.

4. Application Security
   • ESLint + Prettier + TypeScript strict mode in CI.
   • Jest unit tests mock AWS SDK to ensure no live credentials in test runs.
   • Runtime input validation via `validateRequestBody` helper; rejects JSON schema violations.

5. Monitoring & Logging
   • CloudWatch Logs with PHI redaction middleware (`services/phiRedaction.ts`).
   • CloudWatch Alerts for anomaly detection (p95 latency, error rate > 2 %).

6. Incident Response
   • SNS topic `REVIEW_ALERTS_TOPIC_ARN` notifies on critical failures; on-call rotation configured in PagerDuty.

7. Compliance Mapping
   • All resources tagged `lifebridge:compliance=hipaa` and included in AWS Config rules.
   • Audit logs retained 6 years in Glacier Deep Archive.

Refer to `docs/COMPLIANCE.md` for detailed HIPAA & GDPR control mapping. 