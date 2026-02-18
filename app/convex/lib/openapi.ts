export const OPENAPI_SPEC = `openapi: 3.0.0
info:
  title: Artifact Review Agent API
  description: |
    API for AI Agents to publish artifacts and receive feedback (comments) from human reviewers.
    Authentication is via API Key.
  version: 1.0.0
servers:
  - url: https://api.artifact.review
    description: Production Server
  - url: http://localhost:3211
    description: Local Development Server

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
    get:
      summary: List all artifacts
      description: Get a list of all artifacts owned by the authenticated user with summary stats.
      operationId: listArtifacts
      responses:
        '200':
          description: List of artifacts with stats
          content:
            application/json:
              schema:
                type: object
                properties:
                  artifacts:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        name:
                          type: string
                        shareToken:
                          type: string
                        shareUrl:
                          type: string
                        createdAt:
                          type: number
                        latestVersion:
                          type: number
                        stats:
                          type: object
                          properties:
                            totalViews:
                              type: number
                            commentCount:
                              type: number
                            unresolvedCommentCount:
                              type: number
        '401':
          description: Unauthorized

    post:
      summary: Publish a new artifact
      description: Create a new artifact (web page or document) visible to reviewers.
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
                  enum: [html, markdown]
                  example: "html"
                content:
                  type: string
                  description: The raw string content of the artifact (HTML or Markdown).
                  example: "<h1>Hello World</h1>"
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
          description: The share token of the artifact.
        - in: query
          name: version
          schema:
            type: string
            example: "v1"
          required: false
          description: Optional version number (e.g. v1, v2). Defaults to latest.
      responses:
        '200':
          description: List of comments with rich annotation data
          content:
            application/json:
              schema:
                type: object
                properties:
                  version:
                    type: string
                    description: The version of the artifact these comments belong to (e.g. "v1").
                  comments:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          description: Unique ID of the comment.
                        content:
                          type: string
                        author:
                          type: object
                          properties:
                            name:
                              type: string
                            avatar:
                              type: string
                        resolved:
                          type: boolean
                        createdAt:
                          type: number
                        target:
                          type: object
                          description: W3C Annotation Target
                          properties:
                            source:
                              type: string
                            selector:
                              type: object
                              properties:
                                type: 
                                  type: string
                                  enum: [TextQuoteSelector, SVGSelector]
                                exact:
                                  type: string
                                prefix:
                                  type: string
                                suffix:
                                  type: string
                        replies:
                          type: array
                          items:
                            type: object
                            properties:
                              id:
                                type: string
                              content:
                                type: string
                              author:
                                type: object
                                properties:
                                  name:
                                    type: string
                              createdAt:
                                type: number
        '401':
          description: Unauthorized
        '404':
          description: Artifact not found

    post:
      summary: Create a new annotation comment
      description: |
        Post a comment on the artifact, optionally targeting specific text.
        Comments are only allowed on the latest version. Content is trimmed and
        validated (max 10,000 characters). The artifact owner is notified.
      operationId: createArtifactComment
      parameters:
        - in: path
          name: shareToken
          schema:
            type: string
          required: true
        - in: query
          name: version
          schema:
            type: string
            example: "v1"
          required: false
          description: Optional version number (e.g. v1, v2). Defaults to latest.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - content
                - target
              properties:
                content:
                  type: string
                  maxLength: 10000
                  description: Comment text. Trimmed; cannot be empty. Max 10,000 characters.
                target:
                  type: object
                  description: W3C Annotation Target
                  required:
                    - source
                    - selector
                  properties:
                    source:
                      type: string
                      example: "index.html"
                    selector:
                      type: object
                      properties:
                        type:
                          type: string
                          enum: [TextQuoteSelector]
                        exact:
                          type: string
                        prefix:
                          type: string
                        suffix:
                          type: string
      responses:
        '201':
          description: Comment created
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  status:
                    type: string
        '400':
          description: Invalid request (empty content, exceeds 10,000 chars, or not latest version)

  /api/v1/artifacts/{shareToken}/sharelink:
    get:
      summary: Get share link settings
      description: Get the public share link settings for an artifact.
      operationId: getShareLink
      parameters:
        - in: path
          name: shareToken
          schema:
            type: string
          required: true
      responses:
        '200':
          description: Share link settings
          content:
            application/json:
              schema:
                type: object
                properties:
                  shareUrl:
                    type: string
                  enabled:
                    type: boolean
                  capabilities:
                    type: object
                    properties:
                      readComments:
                        type: boolean
                      writeComments:
                        type: boolean
        '401':
          description: Unauthorized
        '403':
          description: Forbidden (not owner)
        '404':
          description: No share link exists

    post:
      summary: Create share link
      description: |
        Create a public share link for an artifact. Idempotent: if a share link
        already exists, returns the existing one. Default capabilities are view-only
        (readComments: false, writeComments: false).
      operationId: createShareLink
      parameters:
        - in: path
          name: shareToken
          schema:
            type: string
          required: true
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                capabilities:
                  type: object
                  properties:
                    readComments:
                      type: boolean
                      default: false
                    writeComments:
                      type: boolean
                      default: false
      responses:
        '201':
          description: Share link created
          content:
            application/json:
              schema:
                type: object
                properties:
                  shareUrl:
                    type: string
                  enabled:
                    type: boolean
                  capabilities:
                    type: object
                    properties:
                      readComments:
                        type: boolean
                      writeComments:
                        type: boolean
        '401':
          description: Unauthorized
        '403':
          description: Forbidden

    patch:
      summary: Update share link
      description: Update share link settings.
      operationId: updateShareLink
      parameters:
        - in: path
          name: shareToken
          schema:
            type: string
          required: true
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                enabled:
                  type: boolean
                capabilities:
                  type: object
                  properties:
                    readComments:
                      type: boolean
                    writeComments:
                      type: boolean
      responses:
        '200':
          description: Share link updated
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '404':
          description: No share link exists

    delete:
      summary: Disable share link
      description: Disable the public share link (sets enabled=false).
      operationId: deleteShareLink
      parameters:
        - in: path
          name: shareToken
          schema:
            type: string
          required: true
      responses:
        '200':
          description: Share link disabled
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '404':
          description: No share link exists

  /api/v1/artifacts/{shareToken}/access:
    get:
      summary: List access grants
      description: Get all users with access to an artifact.
      operationId: listAccess
      parameters:
        - in: path
          name: shareToken
          schema:
            type: string
          required: true
      responses:
        '200':
          description: List of access grants
          content:
            application/json:
              schema:
                type: object
                properties:
                  access:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        email:
                          type: string
                        name:
                          type: string
                        role:
                          type: string
                          enum: [can-comment]
                        status:
                          type: string
                          enum: [pending, added, viewed]
                        firstViewedAt:
                          type: number
                        lastViewedAt:
                          type: number
        '401':
          description: Unauthorized
        '403':
          description: Forbidden

    post:
      summary: Grant access
      description: |
        Invite a user to review an artifact. Email is validated and normalized
        to lowercase. If the user already has access, returns 409. If access was
        previously revoked, it is automatically restored.
      operationId: grantAccess
      parameters:
        - in: path
          name: shareToken
          schema:
            type: string
          required: true
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
              properties:
                email:
                  type: string
                  format: email
                  description: Email address of the reviewer. Validated and normalized to lowercase.
                role:
                  type: string
                  enum: [can-comment]
                  default: can-comment
      responses:
        '201':
          description: Access granted
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  status:
                    type: string
        '400':
          description: Invalid email address
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '409':
          description: User already has access to this artifact

  /api/v1/artifacts/{shareToken}/access/{accessId}:
    delete:
      summary: Revoke access
      description: Remove a user's access to an artifact.
      operationId: revokeAccess
      parameters:
        - in: path
          name: shareToken
          schema:
            type: string
          required: true
        - in: path
          name: accessId
          schema:
            type: string
          required: true
      responses:
        '200':
          description: Access revoked
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '404':
          description: Access record not found

  /api/v1/artifacts/{shareToken}/stats:
    get:
      summary: Get artifact stats
      description: Get detailed view and comment statistics for an artifact.
      operationId: getArtifactStats
      parameters:
        - in: path
          name: shareToken
          schema:
            type: string
          required: true
      responses:
        '200':
          description: Artifact statistics
          content:
            application/json:
              schema:
                type: object
                properties:
                  artifact:
                    type: object
                    properties:
                      id:
                        type: string
                      name:
                        type: string
                      shareToken:
                        type: string
                      createdAt:
                        type: number
                  stats:
                    type: object
                    properties:
                      totalViews:
                        type: number
                      uniqueViewers:
                        type: number
                      commentCount:
                        type: number
                      unresolvedCommentCount:
                        type: number
                      lastViewedAt:
                        type: number
                      lastViewedBy:
                        type: string
                  versions:
                    type: array
                    items:
                      type: object
                      properties:
                        number:
                          type: number
                        commentCount:
                          type: number
                        viewCount:
                          type: number
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '404':
          description: Artifact not found

  /api/v1/artifacts/{shareToken}/versions:
    get:
      summary: List versions
      description: List all active (non-deleted) versions of an artifact.
      operationId: listVersions
      parameters:
        - in: path
          name: shareToken
          schema:
            type: string
          required: true
      responses:
        '200':
          description: List of active versions
          content:
            application/json:
              schema:
                type: object
                properties:
                  versions:
                    type: array
                    items:
                      type: object
                      properties:
                        number:
                          type: integer
                        name:
                          type: string
                          nullable: true
                        fileType:
                          type: string
                        size:
                          type: number
                        createdAt:
                          type: number
                        isLatest:
                          type: boolean
        '401':
          description: Unauthorized
        '403':
          description: Forbidden (not owner)

    post:
      summary: Publish new version
      description: Upload a new version of an artifact.
      operationId: createVersion
      parameters:
        - in: path
          name: shareToken
          schema:
            type: string
          required: true
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - fileType
                - content
              properties:
                fileType:
                  type: string
                  enum: [html, markdown, zip]
                  example: "html"
                content:
                  type: string
                  description: Raw content (string for html/markdown, base64 for zip).
                name:
                  type: string
                  description: Optional version label.
      responses:
        '201':
          description: Version created
          content:
            application/json:
              schema:
                type: object
                properties:
                  versionId:
                    type: string
                  number:
                    type: integer
                  status:
                    type: string
        '400':
          description: Invalid request
        '401':
          description: Unauthorized
        '403':
          description: Forbidden

  /api/v1/artifacts/{shareToken}/versions/{number}:
    patch:
      summary: Rename version
      description: Update the name/label of a version.
      operationId: renameVersion
      parameters:
        - in: path
          name: shareToken
          schema:
            type: string
          required: true
        - in: path
          name: number
          schema:
            type: integer
          required: true
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - name
              properties:
                name:
                  type: string
                  nullable: true
                  description: New name for the version. Pass null to clear.
      responses:
        '200':
          description: Version renamed
        '400':
          description: Invalid request (bad version number or name too long)
        '401':
          description: Unauthorized
        '403':
          description: Forbidden

    delete:
      summary: Soft-delete version
      description: Soft-delete a version. Cannot delete the last active version.
      operationId: deleteVersion
      parameters:
        - in: path
          name: shareToken
          schema:
            type: string
          required: true
        - in: path
          name: number
          schema:
            type: integer
          required: true
      responses:
        '200':
          description: Version deleted
        '400':
          description: Cannot delete last version or version not found
        '401':
          description: Unauthorized
        '403':
          description: Forbidden

  /api/v1/artifacts/{shareToken}/versions/{number}/restore:
    post:
      summary: Restore version
      description: Restore a previously soft-deleted version.
      operationId: restoreVersion
      parameters:
        - in: path
          name: shareToken
          schema:
            type: string
          required: true
        - in: path
          name: number
          schema:
            type: integer
          required: true
      responses:
        '200':
          description: Version restored
        '400':
          description: Version not found or not deleted
        '401':
          description: Unauthorized
        '403':
          description: Forbidden

  /api/v1/comments/{commentId}/replies:
    post:
      summary: Reply to a comment
      description: |
        Add a reply to an existing comment thread. Content is trimmed and
        validated (max 5,000 characters). All thread participants are notified.
      operationId: createCommentReply
      parameters:
        - in: path
          name: commentId
          schema:
            type: string
          required: true
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - content
              properties:
                content:
                  type: string
                  maxLength: 5000
                  description: Reply text. Trimmed; cannot be empty. Max 5,000 characters.
      responses:
        '201':
          description: Reply created
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
        '400':
          description: Invalid request (empty content or exceeds 5,000 chars)
        '404':
          description: Parent comment not found or deleted

  /api/v1/comments/{commentId}:
    patch:
      summary: Update comment
      description: |
        Update comment content or status (resolved/unresolved). Content edits are
        author-only and validated (max 10,000 characters). Resolution can be set
        explicitly (true/false). No-op if content is unchanged or already in target state.
      operationId: updateComment
      parameters:
        - in: path
          name: commentId
          schema:
            type: string
          required: true
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                content:
                  type: string
                  maxLength: 10000
                  description: New text content for the comment. Trimmed; cannot be empty. Max 10,000 characters.
                resolved:
                  type: boolean
                  description: Set to true to resolve, false to unresolve.
      responses:
        '200':
          description: Updated successfully
        '400':
          description: Invalid request (empty content or exceeds 10,000 chars)
        '403':
          description: Unauthorized (Not your comment for content edits)
        '404':
          description: Comment not found or deleted

    delete:
      summary: Delete comment
      description: |
        Soft delete a comment and cascade to all its replies.
        The comment author or the artifact owner can delete.
      operationId: deleteComment
      parameters:
        - in: path
          name: commentId
          schema:
            type: string
          required: true
      responses:
        '200':
          description: Deleted successfully (comment and replies)
        '403':
          description: Unauthorized (not comment author or artifact owner)
        '404':
          description: Comment not found or already deleted

  /api/v1/replies/{replyId}:
    patch:
      summary: Update reply
      description: |
        Update reply content. Author-only edit with content validation
        (max 5,000 characters). No-op if content is unchanged.
      operationId: updateReply
      parameters:
        - in: path
          name: replyId
          schema:
            type: string
          required: true
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - content
              properties:
                content:
                  type: string
                  maxLength: 5000
                  description: New reply text. Trimmed; cannot be empty. Max 5,000 characters.
      responses:
        '200':
          description: Updated successfully
        '400':
          description: Invalid request (empty content or exceeds 5,000 chars)
        '403':
          description: Unauthorized (Not your reply)
        '404':
          description: Reply not found or deleted

    delete:
      summary: Delete reply
      description: |
        Soft delete a reply. The reply author or the artifact owner can delete.
      operationId: deleteReply
      parameters:
        - in: path
          name: replyId
          schema:
            type: string
          required: true
      responses:
        '200':
          description: Deleted successfully
        '403':
          description: Unauthorized (not reply author or artifact owner)
        '404':
          description: Reply not found or already deleted
`;
