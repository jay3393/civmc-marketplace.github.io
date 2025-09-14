# Supabase Functions

## Secrets

`IN_GUILD_JWT_SECRET` is used to sign guild verification tokens. Store this value in a managed secret store such as the [Supabase Secrets store](https://supabase.com/docs/guides/functions/secrets) and rotate it periodically.

Set the secret via the CLI:

```bash
supabase secrets set IN_GUILD_JWT_SECRET="your-secret"
```

When rotation is required, update the secret and redeploy the function so new tokens are signed with the rotated value.

