# Edge Deployment Strategy

LifeBridge can be deployed closer to end-users to minimise latency—critical for emergency translation scenarios.

1. Lambda@Edge
   • The `/translate` and `/emergency-phrases` endpoints can be fronted by CloudFront with Lambda@Edge viewers.
   • Cold start < 50 ms (after first invocation) within region global PoPs.

2. AWS Wavelength (5G MEC)
   • For telco partners, the same containers can run in EKS-Anywhere clusters inside the carrier's 5G MEC zone.
   • Traffic is routed via private APN; no public internet hop.

3. Deployment Steps
   a. Enable CloudFront distribution in `infrastructure/edge-distribution.yml` (CDK snippet).
   b. Run `npx cdk deploy EdgeStack --profile prod`.
   c. Update `REACT_APP_API_BASE` to the new CloudFront domain.

4. Cost Considerations (Free Tier)
   • CloudFront: 1 TB / month data out free for first 12 months.
   • Lambda@Edge: 1 M free requests & 400k GB-s compute / month.
   • Stay within these budgets by enabling gzip + restricting video renditions.

5. Fallback
   • If edge not available, Route 53 health checks direct to origin API Gateway. 