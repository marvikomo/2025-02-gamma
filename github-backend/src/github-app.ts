import { Octokit } from 'octokit';
import { createAppAuth } from '@octokit/auth-app';

export class GitHubApp {
  private readonly appId: string;
  private readonly privateKey: string;
  private readonly webhookSecret: string;
  private appOctokit: Octokit;

  constructor(appId: string, privateKey: string, webhookSecret: string) {
    this.appId = appId;
    this.privateKey = privateKey;
    this.webhookSecret = webhookSecret;

    this.appOctokit = new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: this.appId,
        privateKey: this.privateKey,
      },
    });
  }

  async getInstallationOctokit(installationId: string): Promise<Octokit> {
    // Type assertion needed because Octokit's auth can be complex
    const authResult = await (this.appOctokit.auth as Function)({
      type: 'installation',
      installationId: installationId,
    });
    // The result of createAppAuth for installation type is an object with a token
    // or it can be directly used in a new Octokit instance if configured correctly.
    // For clarity, we'll create a new Octokit instance with the token.
    // The actual structure of authResult might vary based on Octokit versions.
    // Assuming authResult.token exists based on typical @octokit/auth-app patterns.
    // If authResult itself is an authenticated Octokit instance or a token string, adjust accordingly.
    // Let's assume it returns an object with a token property.
    const installationToken = (authResult as { token: string }).token;
    if (!installationToken) {
        throw new Error(`Failed to retrieve installation token for installation ID ${installationId}`);
    }
    return new Octokit({ auth: installationToken });
  }

  async handleWebhookEvent(request: any, response: any): Promise<void> {
    // Import necessary types from express dynamically if they are only used here
    const { Request, Response } = await import('express');
    const expressRequest = request as InstanceType<typeof Request>;
    const expressResponse = response as InstanceType<typeof Response>;

    // Verify webhook signature (using @octokit/webhooks if preferred, or manual verification)
    // For consistency with Octokit integration, let's assume @octokit/webhooks is used.
    // Ensure @octokit/webhooks is installed if this path is taken.
    const { Webhooks } = await import('@octokit/webhooks');
    const webhooks = new Webhooks({ secret: this.webhookSecret });

    const signature = expressRequest.headers['x-hub-signature-256'] as string;
    if (!signature) {
      expressResponse.status(400).send('Missing X-Hub-Signature-256 header');
      return;
    }

    // req.body is already parsed by express.json() middleware
    const payloadBody = JSON.stringify(expressRequest.body);
    const isValid = await webhooks.verify(payloadBody, signature);
    if (!isValid) {
      expressResponse.status(401).send('Invalid signature');
      return;
    }

    const event = expressRequest.headers['x-github-event'] as string;
    const payload = expressRequest.body;

    console.log(`Received webhook event: ${event}`, payload);

    // Example: Using the installation-specific Octokit client
    if (payload.installation && payload.installation.id) {
      const installationId = payload.installation.id;
      try {
        const installationOctokit = await this.getInstallationOctokit(installationId.toString());
        // Now you can use installationOctokit to make API calls for this installation
        // For example, to list repositories for the installation:
        // const repos = await installationOctokit.request('GET /installation/repositories');
        // console.log(`Repos for installation ${installationId}:`, repos.data);

        // Example: If it's a 'pull_request' event, you might comment on the PR
        if (event === 'pull_request' && payload.pull_request && payload.repository) {
          const pr = payload.pull_request;
          const repo = payload.repository;
          // await installationOctokit.issues.createComment({
          //   owner: repo.owner.login,
          //   repo: repo.name,
          //   issue_number: pr.number,
          //   body: 'Thanks for the pull request!',
          // });
          console.log(`Potentially commented on PR #${pr.number} in ${repo.full_name}`);
        }
      } catch (error) {
        console.error(`Failed to get Octokit instance for installation ${installationId} or perform action:`, error);
        // Decide if you want to send an error response or just log
      }
    }

    expressResponse.status(200).send('Event received and processed');
  }

  public async createRepository(
    installationId: string,
    org: string, // Organization name. Required for creating repo in an org.
    repoName: string,
    description?: string,
    isPrivate: boolean = true
  ): Promise<any> {
    try {
      const octokit = await this.getInstallationOctokit(installationId);
      // Note: If the app is installed on a user account, not an organization,
      // you would use octokit.rest.repos.createForAuthenticatedUser()
      // and not pass the 'org' parameter.
      // This implementation assumes an organization context.
      const response = await octokit.rest.repos.createInOrg({
        org: org,
        name: repoName,
        description: description || '', // Ensure description is a string
        private: isPrivate,
        auto_init: true, // Creates an initial commit, making the repo cloneable.
      });
      console.log(
        `Repository '${repoName}' created successfully in org '${org}': ${response.data.html_url}`
      );
      return response.data;
    } catch (error: any) {
      console.error(
        `Error creating repository '${repoName}' in org '${org}':`,
        error.message
      );
      if (error.response && error.response.data) {
        console.error('GitHub API Response:', JSON.stringify(error.response.data, null, 2));
      }
      // Re-throw the error so the caller (e.g., the API endpoint) can handle it
      throw error;
    }
  }

  public async createPullRequest(
    installationId: string,
    org: string,
    repo: string,
    title: string,
    body: string, // Body for the PR, can be an empty string if not provided
    head: string, // The name of the branch where your changes are implemented.
    base: string // The name of the branch you want the changes pulled into.
  ): Promise<any> {
    try {
      const octokit = await this.getInstallationOctokit(installationId);
      const response = await octokit.rest.pulls.create({
        owner: org,
        repo: repo,
        title: title,
        body: body,
        head: head,
        base: base,
        // draft: false, // Optional: set to true to create a draft PR
        // maintainer_can_modify: true, // Optional: allow maintainers to modify the PR
      });
      console.log(
        `Pull request '${title}' created successfully in ${org}/${repo}: ${response.data.html_url}`
      );
      return response.data;
    } catch (error: any) {
      console.error(
        `Error creating pull request '${title}' in ${org}/${repo}:`,
        error.message
      );
      if (error.response && error.response.data) {
        console.error('GitHub API Response:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
}
