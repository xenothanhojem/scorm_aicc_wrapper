# AICC to SCORM Converter

## Description
This tool converts AICC course packages into SCORM-compliant packages that can be run on any SCORM-compatible Learning Management System (LMS). It provides a server-side component for conversion and a client-side launcher for executing converted courses within a SCORM environment.

## Key Features
- Converts AICC course packages to SCORM-compliant packages
- Provides a web-based interface for package upload and conversion
- Handles AICC to SCORM communication
- Supports SCORM 1.2 standard
- Manages session data and course progress

## Technologies Used
- Node.js
- Express.js
- HTML5
- JavaScript (ES6+)
- Bootstrap 5
- JSZip library

## Prerequisites
- Node.js (version X.X or higher)
- npm (Node Package Manager)

## Installation
1. Clone the repository:
   ```
   git clone https://github.com/yourusername/scorm_aicc_wrapper.git
   ```
2. Navigate to the project directory:
   ```
   cd aicc-to-scorm-wrapper
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Configuration
The application uses environment variables for configuration. You can set these in a `.env` file in the root directory or through your deployment platform.

Required environment variables:
- `AICC_URL`: The URL where your Express server will be running (e.g., `http://your-server-url`)

Optional environment variables:
- `DB_HOST`: Database host (default: 'localhost')
- `DB_USER`: Database user (default: 'root')
- `DB_PASSWORD`: Database password (default: '')
- `DB_NAME`: Database name (default: 'aicc_db')

Example `.env` file:

## Usage
1. Set the required environment variables.
2. Start the Express server:
   ```
   node server.js
   ```
3. Access the web interface through your browser (e.g., `http://localhost:3000`).
4. Upload your AICC course package (ZIP file) using the provided interface.
5. The server will process the AICC package and return a SCORM-compliant ZIP package.
6. Download the converted SCORM package.
7. Upload the SCORM package to your SCORM-compliant LMS.

## Making the Server Publicly Accessible
To test your SCORM packages, the Express server needs to be publicly accessible. For development and testing purposes, we recommend using ngrok:

1. Install ngrok: https://ngrok.com/download
2. Start your Express server locally.
3. In a new terminal window, run:
   ```
   ngrok http 3000
   ```
4. ngrok will provide a public URL (e.g., `https://abcdef123456.ngrok.io`).
5. Set the `AICC_URL` environment variable to this ngrok URL.

This allows your local server to be accessible over the internet, enabling you to test your SCORM packages on various LMS platforms.

## Deployment
1. Deploy the Express server to your preferred hosting platform.
2. Set the `AICC_URL` environment variable to the URL of your deployed server.
3. Ensure the server is accessible for file uploads and downloads.

## Important Notes
- The Express server must be running and accessible for the conversion process to work.
- Ensure your LMS is SCORM 1.2 compliant for compatibility with the converted packages.
- Large AICC packages may take longer to process. Be patient during the conversion.
- For security in production, always use HTTPS
- This package has not been tested for vulnerability or security.

## License
This project is licensed under the MIT License.

MIT License

Copyright (c) [year] [fullname]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## Contributing
Contributions to this project are welcome! Here are some guidelines for contributing:

1. Fork the repository and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure your code lints and follows the existing style.
4. Update the documentation if you've made significant changes.
5. Issue a pull request with a comprehensive description of changes.

Please note:
- Before starting work on a major feature, please open an issue to discuss it.
- Respect the code style and structure of the project.
- Write clear, commented, and testable code.
- Update the README.md with details of changes to the interface, if applicable.

We appreciate your contributions to making this project better!


## Support
Email: info@synrgise.com
