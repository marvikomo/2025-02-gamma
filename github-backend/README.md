# GitHub Backend Service

This service provides a backend for a GitHub App. It handles webhook events and can perform actions based on those events.

## Setup

1.  **Clone the repository (or ensure you are in the `github-backend` directory).**
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up environment variables:**
    Create a `.env` file in the `github-backend` directory or set the following environment variables:
    *   `APP_ID`: Your GitHub App ID.
    *   `PRIVATE_KEY`: Your GitHub App's private key (can be a multi-line string).
    *   `WEBHOOK_SECRET`: Your GitHub App's webhook secret.
    *   `PORT`: (Optional) The port for the server to listen on (defaults to 3000).
    *   `LOG_LEVEL`: (Optional) The log level for the application (e.g., 'info', 'debug').

    Example `.env` file:
    ```
    APP_ID=123456
    PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
    WEBHOOK_SECRET=yourwebhooksecret
    PORT=3000
    LOG_LEVEL=info
    ```
4.  **Build the TypeScript code:**
    ```bash
    npm run build
    ```

## Running the Service

*   **Development mode (with auto-rebuild on changes):**
    ```bash
    npm run dev
    ```
*   **Production mode (after building):**
    ```bash
    npm start
    ```

## Webhook URL

When configuring your GitHub App, set the webhook URL to `YOUR_SERVER_ADDRESS/webhook`. For local development, you can use a tunneling service like ngrok to expose your local server to the internet.

## Project Structure

*   `src/`: Contains the TypeScript source code.
    *   `index.ts`: Entry point of the application, sets up the Express server.
    *   `github-app.ts`: Contains the `GitHubApp` class responsible for GitHub App logic (authentication, event handling).
*   `dist/`: Contains the compiled JavaScript code (after running `npm run build`).
*   `node_modules/`: Directory where npm packages are installed.
*   `package.json`: Defines project metadata, dependencies, and scripts.
*   `tsconfig.json`: TypeScript compiler options.
*   `.gitignore`: Specifies intentionally untracked files that Git should ignore.
*   `README.md`: This file.
