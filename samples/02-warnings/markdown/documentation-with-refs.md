# Project Documentation

This markdown file contains local file references that should trigger warnings.

## Architecture Overview

![System Architecture](./diagrams/architecture.png)

The system consists of three main components as shown in the diagram above.

## Setup Instructions

### 1. Installation

See the [installation guide](./guides/installation.md) for detailed steps.

### 2. Configuration

Reference files:
- [Database config](../config/database.yml)
- [API settings](./config/api.json)

### 3. Screenshots

#### Dashboard View
![Dashboard Screenshot](./screenshots/dashboard.png)

#### Login Page
![Login Screenshot](../../docs/images/login.png)

## Code Examples

The implementation details can be found in [implementation.md](./implementation.md).

### Sample Code

```python
# See full code in ./src/main.py
def main():
    print("Hello, World!")
```

## External Resources (These are OK)

- [React Docs](https://react.dev/)
- ![External Image](https://via.placeholder.com/200)

## Related Documents

- [API Reference](./api-reference.md) ⚠️ Local link
- [User Guide](../guides/user-guide.md) ⚠️ Local link
- [GitHub Repo](https://github.com/example/repo) ✅ External link

---

**Expected Warnings:**
1. `./diagrams/architecture.png` - local image
2. `./guides/installation.md` - local markdown link
3. `../config/database.yml` - local file
4. `./config/api.json` - local file
5. `./screenshots/dashboard.png` - local image
6. `../../docs/images/login.png` - local image
7. `./implementation.md` - local markdown link
8. `./api-reference.md` - local markdown link
9. `../guides/user-guide.md` - local markdown link

**Total:** 9 local references
**Recommendation:** Upload as ZIP with all referenced files
