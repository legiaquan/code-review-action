# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please follow these steps:

### 1. **DO NOT** create a public GitHub issue

Security vulnerabilities should be reported privately to prevent potential exploitation.

### 2. **DO** report via email

Send an email to [security@your-domain.com](mailto:security@your-domain.com) with:

- A detailed description of the vulnerability
- Steps to reproduce the issue
- Potential impact assessment
- Any additional context

### 3. **DO** use GitHub Security Advisories (if you have access)

If you have access to the repository, you can create a private security advisory:

1. Go to the repository's "Security" tab
2. Click "Security advisories"
3. Click "New security advisory"
4. Fill in the details and mark as private

## Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 1 week
- **Fix Timeline**: Depends on severity (1-4 weeks)
- **Public Disclosure**: After fix is available

## Security Best Practices

### For Users

- Keep your API keys secure and never commit them to version control
- Use repository secrets for sensitive configuration
- Regularly rotate your API keys
- Monitor your API usage for unusual activity

### For Contributors

- Follow secure coding practices
- Never log or expose sensitive information
- Validate all inputs and sanitize outputs
- Keep dependencies updated
- Use security-focused linting rules

## Security Features

This action implements several security measures:

- **API Key Protection**: API keys are never logged or exposed in outputs
- **Input Validation**: All inputs are validated and sanitized
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Error Handling**: Secure error messages that don't leak sensitive information
- **Dependency Scanning**: Regular security updates for dependencies

## Responsible Disclosure

We appreciate security researchers who:

- Report vulnerabilities privately
- Allow reasonable time for fixes
- Work collaboratively on solutions
- Follow responsible disclosure practices

## Security Updates

Security updates are released as patch versions (e.g., 1.0.1) and should be applied promptly. Critical security fixes may be backported to previous major versions.

## Contact

For security-related questions or reports:

- **Email**: [security@your-domain.com](mailto:security@your-domain.com)
- **PGP Key**: [Available on request]
- **Response Time**: Within 48 hours
