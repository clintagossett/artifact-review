export const OPENAPI_SPEC = `openapi: 3.0.0
info:
  title: Artifact Review Agent API
  description: |
    API for AI Agents to publish artifacts and receive feedback from human reviewers.
    Authentication is via API Key (X-API-Key header).
  version: 1.0.0
servers:
  - url: https://api.artifact.review
    description: Production Server
  - url: http://localhost:3211
    description: Local Development Server (Direct)
  - url: http://api.ar.local.com
    description: Local Development Server (DNS Mock)

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
    BearerAuth:
      type: http
      scheme: bearer

security:
  - ApiKeyAuth: []
  - BearerAuth: []

paths:
  /api/v1/artifacts:
    post:
      summary: Publish a new artifact
      description: |
        Create a new artifact.
        
        Supported formats:
        - **markdown**: Raw Markdown string.
        - **html**: Raw HTML string covering the full page.
        - **zip**: Base64 encoded ZIP archive containing a static site.
      operationId: createArtifact
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
                - fileType
                - content
              properties:
                name:
                  type: string
                  example: "Landing Page V1"
                  description: Title of the artifact.
                description:
                  type: string
                  example: "Initial draft of the marketing landing page."
                fileType:
                  type: string
                  enum: [html, markdown, zip]
                  example: "zip"
                  description: Type of content being uploaded.
                content:
                  type: string
                  description: |
                    The content of the artifact.
                    - For 'html'/'markdown': The raw text string.
                    - For 'zip': A Base64 encoded string of the ZIP file.
                  example: "UEsDBBQAAAAIA..."
                organizationId:
                  type: string
                  description: Optional ID of the organization to attribute this artifact to.
      responses:
        '201':
          description: Artifact created successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                    description: Internal ID of the artifact.
                  shareToken:
                    type: string
                    description: The public token used in the share URL.
                  latestVersionId:
                    type: string
                    description: ID of the created version.
                  shareUrl:
                    type: string
                    description: Full URL to view the artifact.
        '401':
          description: Unauthorized (Invalid or missing API Key)
        '400':
          description: Invalid Request (Missing fields or bad JSON)

  /api/v1/artifacts/{shareToken}/comments:
    get:
      summary: Get comments for an artifact
      description: Retrieve all feedback comments posted by users on the latest version of the specified artifact.
      operationId: getArtifactComments
      parameters:
        - in: path
          name: shareToken
          schema:
            type: string
          required: true
          description: The share token of the artifact (returned during creation).
      responses:
        '200':
          description: List of comments
          content:
            application/json:
              schema:
                type: object
                properties:
                  comments:
                    type: array
                    items:
                      type: object
                      properties:
                        _id:
                          type: string
                        content:
                          type: string
                        x:
                          type: number
                        y:
                          type: number
                        resolved:
                          type: boolean
                        authorName:
                          type: string
                        createdAt:
                          type: number
        '401':
          description: Unauthorized
        '403':
          description: Forbidden (You do not own this artifact)
        '404':
          description: Artifact not found
`;
