# Compliance Mapping

The following table maps LifeBridge controls to HIPAA, GDPR, and ISO 27001 requirements.

| Control Area | Implementation | HIPAA | GDPR | ISO 27001 |
|--------------|----------------|-------|------|-----------|
| Access Control | IAM least-privilege, MFA, OIDC tokens for CI | §164.312(a)(1) | Art. 32(1)(b) | A.9 |
| Audit Logging | DynamoDB `lifebridge-audit-logs-*` with KMS encryption; retention 6 years | §164.312(b) | Art. 30 | A.12.4 |
| Encryption in Transit | API Gateway TLS 1.2+, AWS SDK SigV4 | §164.312(e)(1) | Art. 32(1)(a) | A.10.1 |
| Encryption at Rest | KMS-encrypted S3, DynamoDB, Lambda env-vars | §164.312(a)(2)(iv) | Art. 32(1)(a) | A.10.1 |
| Data Minimisation | PHI redaction middleware; only necessary fields stored | — | Art. 5(1)(c) | A.18 |
| Breach Notification | CloudWatch Alarm → SNS → PagerDuty | §164.410 | Art. 33 | A.16 |
| Vendor Management | AWS BAA signed; 3rd-party libs audited weekly | §164.308(b) | Art. 28 | A.15 |
| Business Continuity | Multi-AZ DynamoDB; S3 cross-region replication; IaC in Git | §164.308(a)(7) | — | A.17 |

Detailed procedures are in `MEDICAL_DEPLOYMENT_GUIDE.md`. 