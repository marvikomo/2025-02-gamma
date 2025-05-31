export class GitHubApp {
  private readonly appId: string;
  private readonly privateKey: string;
  private readonly webhookSecret: string;

  constructor(appId: string, privateKey: string, webhookSecret: string) {
    this.appId = appId;
    this.privateKey = privateKey;
    this.webhookSecret = webhookSecret;
  }

  async getInstallationAccessToken(installationId: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // Issued at time, 60 seconds in the past
      exp: now + 10 * 60, // Expiration time, 10 minutes in the future
      iss: this.appId,
    };

    // Dynamically import jsonwebtoken
    const jwt = await import('jsonwebtoken');
    const token = jwt.sign(payload, this.privateKey, { algorithm: 'RS256' });

    // Dynamically import axios
    const axios = (await import('axios')).default;
    const response = await axios.post(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {},
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data.token;
  }
}
