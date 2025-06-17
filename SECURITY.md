# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The Healthcare Research MCP Server takes security seriously, especially given its use in healthcare research contexts.

### How to Report

Please **DO NOT** file a public issue for security vulnerabilities. Instead:

1. Email: security@[your-domain].com
2. Use the subject line: "SECURITY: Healthcare Research MCP"
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Resolution Timeline**: Depends on severity
  - Critical: 1-2 weeks
  - High: 2-4 weeks
  - Medium: 4-8 weeks
  - Low: Next release

## Security Considerations

### Data Privacy
- This server is designed to work with de-identified data only
- Never input PHI (Protected Health Information) directly
- Use appropriate data governance for your institution

### API Keys
- Store API keys securely in environment variables
- Never commit API keys to version control
- Rotate keys regularly
- Use separate keys for development and production

### Database Security
- Databases should be encrypted at rest
- Use appropriate file permissions
- Regular backups recommended
- Consider using external databases for production

### Network Security
- Run behind a firewall in production
- Use HTTPS for any web interfaces
- Limit access to trusted networks
- Monitor for unusual activity

## HIPAA Compliance Note

While this software includes HIPAA-compliant features (audit logging, access controls), achieving full HIPAA compliance requires:
- Proper deployment configuration
- Administrative safeguards
- Physical safeguards
- Signed BAAs with any cloud providers

**This software alone does not guarantee HIPAA compliance.**

## Dependencies

We regularly update dependencies to patch known vulnerabilities. To check for vulnerabilities in your installation:

```bash
npm audit
```

To automatically fix vulnerabilities:

```bash
npm audit fix
```

## Best Practices

1. **Least Privilege**: Grant minimum necessary permissions
2. **Audit Logs**: Enable and monitor audit logs
3. **Updates**: Keep the server and dependencies updated
4. **Encryption**: Use encryption for sensitive data
5. **Access Control**: Implement proper authentication
6. **Monitoring**: Set up alerts for suspicious activity

## Acknowledgments

We appreciate responsible disclosure of security issues. Security researchers who report valid issues will be acknowledged (with permission) in our releases.