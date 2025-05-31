import express from 'express';
import { GitHubApp } from './github-app';

// TODO: Replace with your actual App ID, Private Key, and Webhook Secret
// These should be stored securely, e.g., as environment variables
const APP_ID = process.env.APP_ID || 'your-app-id';
const PRIVATE_KEY = process.env.PRIVATE_KEY || 'your-private-key';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret';

if (APP_ID === 'your-app-id' || PRIVATE_KEY === 'your-private-key' || WEBHOOK_SECRET === 'your-webhook-secret') {
  console.warn('Using placeholder credentials. Please set APP_ID, PRIVATE_KEY, and WEBHOOK_SECRET environment variables.');
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

const githubApp = new GitHubApp(APP_ID, PRIVATE_KEY, WEBHOOK_SECRET);

app.post('/webhook', async (req, res) => {
  try {
    await githubApp.handleWebhookEvent(req, res);
  } catch (error) {
    console.error('Error handling webhook event:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/', (req, res) => {
  res.send('GitHub App server is running!');
});

app.post('/repo', async (req, res) => {
  const { installationId, org, name, description, isPrivate } = req.body;

  if (!installationId || !org || !name) {
    return res.status(400).send({
      message: 'Missing required fields: installationId, org (organization name), name (repository name)',
    });
  }

  if (!githubApp) {
    // This should ideally not happen if the server starts correctly
    console.error('FATAL: githubApp instance is not available in /repo endpoint.');
    return res.status(500).send({ message: 'GitHubApp service is not initialized.' });
  }

  try {
    console.log(`Received request to create repository: ${name} in org ${org} for installation ${installationId}`);
    const repoData = await githubApp.createRepository(
      installationId.toString(), // Ensure installationId is a string
      org,
      name,
      description,
      isPrivate === undefined ? true : Boolean(isPrivate) // Default to true if undefined
    );
    res.status(201).send({
      message: 'Repository created successfully',
      data: {
        name: repoData.name,
        html_url: repoData.html_url,
        private: repoData.private,
        description: repoData.description,
      },
    });
  } catch (error: any) {
    console.error(`Error in /repo endpoint while creating repository '${name}':`, error.message);
    // Check if the error has GitHub API response details
    const errorMessage = error.response?.data?.message || error.message || 'Failed to create repository';
    const errorDetails = error.response?.data?.errors || undefined;
    res.status(error.status || 500).send({
      message: errorMessage,
      details: errorDetails,
    });
  }
});

app.post('/pr', async (req, res) => {
  const { installationId, org, repo, title, body, head, base } = req.body;

  if (!installationId || !org || !repo || !title || !head || !base) {
    return res.status(400).send({
      message: 'Missing required fields: installationId, org, repo, title, head (source branch), base (target branch)',
    });
  }

  if (!githubApp) {
    console.error('FATAL: githubApp instance is not available in /pr endpoint.');
    return res.status(500).send({ message: 'GitHubApp service is not initialized.' });
  }

  try {
    console.log(`Received request to create PR: "${title}" from ${head} to ${base} in ${org}/${repo} for installation ${installationId}`);
    const prData = await githubApp.createPullRequest(
      installationId.toString(),
      org,
      repo,
      title,
      body || '', // Default to empty string if body is not provided
      head,
      base
    );
    res.status(201).send({
      message: 'Pull request created successfully',
      data: {
        html_url: prData.html_url,
        number: prData.number,
        title: prData.title,
        state: prData.state,
      },
    });
  } catch (error: any) {
    console.error(`Error in /pr endpoint while creating PR "${title}":`, error.message);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to create pull request';
    const errorDetails = error.response?.data?.errors || undefined;
    res.status(error.status || 500).send({
      message: errorMessage,
      details: errorDetails,
    });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log('Registered routes:');
  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) { // routes registered directly on the app
      console.log(middleware.route.path, middleware.route.methods);
    } else if (middleware.name === 'router') { // router middleware
      middleware.handle.stack.forEach((handler: any) => {
        if (handler.route) {
          console.log(handler.route.path, handler.route.methods);
        }
      });
    }
  });
});
