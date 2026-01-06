# Invitation & Access System Diagrams

## Entity Relationship

```mermaid
erDiagram
    users ||--o{ userInvites : "createdBy"
    users ||--o{ artifactAccess : "createdBy"
    users ||--o{ artifactAccess : "userId"
    userInvites ||--o{ artifactAccess : "userInviteId"
    artifacts ||--o{ artifactAccess : "artifactId"
    userInvites ||--o| users : "convertedToUserId"

    users {
        id _id
        string email
        string name
    }

    userInvites {
        id _id
        string email
        string name
        id createdBy
        id convertedToUserId
        boolean isDeleted
        number deletedAt
    }

    artifactAccess {
        id _id
        id artifactId
        id userId
        id userInviteId
        id createdBy
        number lastSentAt
        number sendCount
        number firstViewedAt
        number lastViewedAt
        boolean isDeleted
        number deletedAt
    }

    artifacts {
        id _id
        string title
        id creatorId
    }
```

## Invite Flow: Existing User

```mermaid
sequenceDiagram
    participant Owner
    participant System
    participant artifactAccess
    participant Email

    Owner->>System: Invite bob@...
    System->>System: Lookup user by email
    Note over System: User found (userId = X)
    System->>artifactAccess: Create record
    Note over artifactAccess: userId = X<br/>userInviteId = null<br/>sendCount = 1
    System->>Email: Send notification
    System->>Owner: "Bob added as reviewer"
```

## Invite Flow: New User

```mermaid
sequenceDiagram
    participant Owner as Owner (Alice)
    participant System
    participant userInvites
    participant artifactAccess
    participant Email

    Owner->>System: Invite luke@...
    System->>System: Lookup user by email
    Note over System: User NOT found
    System->>userInvites: Lookup by (email, createdBy=Alice)
    Note over userInvites: NOT found
    System->>userInvites: Create record
    Note over userInvites: email = luke@...<br/>createdBy = Alice
    System->>artifactAccess: Create record
    Note over artifactAccess: userId = null<br/>userInviteId = invite ID<br/>sendCount = 1
    System->>Email: Send invitation
    System->>Owner: "Invitation sent to Luke"
```

## Signup & Linking Flow

```mermaid
sequenceDiagram
    participant Luke
    participant Auth
    participant users
    participant userInvites
    participant artifactAccess

    Luke->>Auth: Sign up with luke@...
    Auth->>users: Create user
    Note over users: userId = Y

    Auth->>userInvites: Query by_email("luke@...")
    Note over userInvites: Returns ALL invites<br/>(from Alice, Bob, etc.)

    loop For each userInvite
        Auth->>userInvites: Set convertedToUserId = Y
        Auth->>artifactAccess: Query by_userInvite
        loop For each access record
            Auth->>artifactAccess: Set userId, clear userInviteId
        end
    end

    Note over artifactAccess: All pending access<br/>now linked to Luke
```

## Access Record Lifecycle

### Path 1: Invite Existing User (has account)

```mermaid
flowchart LR
    A[Owner invites bob@...] --> B[User found in system]
    B --> C[Create artifactAccess<br/>with userId]
    C --> D[Bob receives invite email]
    D --> E[Bob can view artifact]
    E --> F[Bob views artifact]
    F --> G[firstViewedAt set]
```

### Path 2: Invite New User (no account)

```mermaid
flowchart LR
    A[Owner invites luke@...] --> B[User NOT in system]
    B --> C[Create userInvite<br/>+ artifactAccess with userInviteId]
    C --> D[Luke receives invite email]
    D --> E[Luke cannot view yet]
    E --> F[Luke signs up]
    F --> G[Link: set userId<br/>clear userInviteId]
    G --> H[Luke can view artifact]
    H --> I[Luke views artifact]
    I --> J[firstViewedAt set]
```

### Resend Invite

```mermaid
flowchart LR
    A[Owner invited reviewer] --> B[Email sent]
    B --> C[No response yet]
    C --> D[Owner clicks Resend]
    D --> E[Update lastSentAt<br/>Update sendCount]
    E --> F[Email sent again]
```

### Revoke & Re-invite

```mermaid
flowchart LR
    subgraph Row1 [Initial Access & Revoke]
        A[Owner invites] --> B[Email sent]
        B --> C[Has access]
        C --> D[Owner removes]
        D --> E[isDeleted = true]
        E --> F[No email]
    end

    subgraph Row2 [Re-invite]
        G[Owner re-invites] --> H[Un-delete record]
        H --> I[Update lastSentAt<br/>Update sendCount]
        I --> J[Email sent]
        J --> K[Has access again]
    end

    F --> G
```

### State Summary

| State | Meaning | Data |
|-------|---------|------|
| **Pending** | Invited, no account yet, cannot view | `userInviteId` set, `userId` null |
| **Added** | Has account, can view & comment | `userId` set, `firstViewedAt` null |
| **Viewed** | Has actually opened the artifact | `userId` set, `firstViewedAt` set |
| **Removed** | Access removed by owner | `isDeleted` = true |

## Access Check (Critical Path)

```mermaid
flowchart LR
    A[User requests artifact] --> B[Query artifactAccess]
    B --> C{Record found?}
    C -->|No| D[Deny]
    C -->|Yes| E{isDeleted?}
    E -->|true| D
    E -->|false| F[Allow]
```

## Data Examples

### Scenario: Alice invites Luke to 2 artifacts, Bob invites Luke to 1

**userInvites:**
| _id | email | createdBy | convertedToUserId |
|-----|-------|-----------|-------------------|
| ui1 | luke@... | Alice | null |
| ui2 | luke@... | Bob | null |

**artifactAccess:**
| _id | artifactId | userId | userInviteId | createdBy |
|-----|------------|--------|--------------|-----------|
| aa1 | Artifact A | null | ui1 | Alice |
| aa2 | Artifact B | null | ui1 | Alice |
| aa3 | Artifact C | null | ui2 | Bob |

### After Luke signs up (userId = Y):

**userInvites:**
| _id | email | createdBy | convertedToUserId |
|-----|-------|-----------|-------------------|
| ui1 | luke@... | Alice | **Y** |
| ui2 | luke@... | Bob | **Y** |

**artifactAccess:**
| _id | artifactId | userId | userInviteId | createdBy |
|-----|------------|--------|--------------|-----------|
| aa1 | Artifact A | **Y** | **null** | Alice |
| aa2 | Artifact B | **Y** | **null** | Alice |
| aa3 | Artifact C | **Y** | **null** | Bob |
